// Reads the fight actions of the player classes from a compiled Core and measures them: every action is played in a grid of
// fight situations, and the damage and hit probabilities it asks the fight action controller for are recorded.
// Nothing is copied from the Core sources, so the figures follow the game as soon as the Core is recompiled.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// The situations in which every action is played: the probabilities of some actions depend on the turn, on the level of
// the sender, on the speeds of the fighters, on the energy left or on the previous uses of the action
const SITUATIONS = {
	SENDER_LEVELS: [1, 25, 50, 75, 100, 125, 150],
	SPEEDS: [10, 100, 600],
	SENDER_ENERGY_RATIOS: [1, 0.2],
	PREVIOUS_USES: [0, 1, 2, 3, 4, 5],
	RECEIVER_LAST_ACTIONS: [null, "resting", "simpleAttack"]
};

// Stats of the fighters the actions are played between, besides the speeds and the energy of the situations
const FIGHTER_STATS = {
	maxEnergy: 1000,
	attack: 100,
	defense: 100,
	breath: 30,
	maxBreath: 30,
	breathRegen: 4
};

/*
 * A charge action (chargeUltimateAttack...) prepares the attack played on the next turn, whose figures are the ones shown.
 * Other actions can force the next action too (the intense attack forces a rest), without standing for it
 */
const CHARGE_ACTION_PREFIX = "charge";

/**
 * Loads the parts of a compiled Core the measure needs
 * @param {string} coreDir Core folder of a Crownicles checkout
 */
function loadCore(coreDir) {
	const dist = path.join(coreDir, "dist/Core/src");
	const lib = path.join(coreDir, "dist/Lib/src");
	if (!existsSync(path.join(dist, "data/FightAction.js"))) {
		throw new Error(`The Core is not compiled: cd ${coreDir} && pnpm tsc`);
	}

	// The data controllers read the resources relatively to the Core folder
	process.chdir(coreDir);
	const require = createRequire(path.join(coreDir, "package.json"));
	return {
		FightActionDataController: require(path.join(dist, "data/FightAction")).FightActionDataController,
		FightActionController: require(path.join(dist, "core/fights/actions/FightActionController")).FightActionController,
		Fighter: require(path.join(dist, "core/fights/fighter/Fighter")).Fighter,
		FightConstants: require(path.join(lib, "constants/FightConstants")).FightConstants,
		CrowniclesIcons: require(path.join(lib, "CrowniclesIcons")).CrowniclesIcons
	};
}

/**
 * Ids of the actions of every player class, in the order the classes are numbered
 * @param {string} coreDir
 */
function getPlayerActionIds(coreDir) {
	const classesDir = path.join(coreDir, "resources/classes");
	const classFiles = readdirSync(classesDir)
		.filter(file => file.endsWith(".json"))
		.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
	const actionIds = new Set();
	for (const file of classFiles) {
		for (const actionId of JSON.parse(readFileSync(path.join(classesDir, file), "utf8")).fightActionsIds) {
			actionIds.add(actionId);
		}
	}
	return [...actionIds];
}

/**
 * Builds the concrete fighter class the actions are played with, it runs the real stat, breath and energy logic of the Core
 * @param {Function} Fighter
 */
function makeFighterClass(Fighter) {
	return class MeasureFighter extends Fighter {
		constructor({
			level, speed, energyRatio
		}) {
			super(level, []);
			this.stats = {
				...FIGHTER_STATS,
				speed,
				energy: Math.round(FIGHTER_STATS.maxEnergy * energyRatio)
			};
		}

		chooseAction() {
			return Promise.resolve();
		}

		startFight() {
			return Promise.resolve();
		}

		endFight() {
			return Promise.resolve();
		}

		unblock() {
			// Nothing waits on a measured fighter
		}
	};
}

/**
 * Every situation an action is played in
 * @param {number} maxTurns
 */
function* situations(maxTurns) {
	for (let turn = 1; turn <= maxTurns; turn++) {
		for (const senderLevel of SITUATIONS.SENDER_LEVELS) {
			for (const senderSpeed of SITUATIONS.SPEEDS) {
				for (const receiverSpeed of SITUATIONS.SPEEDS) {
					for (const energyRatio of SITUATIONS.SENDER_ENERGY_RATIOS) {
						for (const previousUses of SITUATIONS.PREVIOUS_USES) {
							for (const receiverLastAction of SITUATIONS.RECEIVER_LAST_ACTIONS) {
								yield {
									turn, senderLevel, senderSpeed, receiverSpeed, energyRatio, previousUses, receiverLastAction
								};
							}
						}
					}
				}
			}
		}
	}
}

/**
 * Smallest and largest of a list of numbers, null when it is empty
 * @param {number[]} values
 */
export function toRange(values) {
	if (values.length === 0) {
		return null;
	}
	return {
		min: Math.min(...values),
		max: Math.max(...values)
	};
}

/**
 * Records the damage and the hit probabilities the fight actions ask the fight action controller for
 * @param {Function} controller FightActionController of the Core
 */
function spyOnController(controller) {
	const getAttackDamage = controller.getAttackDamage;
	const applySecondaryEffects = controller.applySecondaryEffects;
	const spy = {
		calls: null,
		record() {
			spy.calls = {
				attackInfos: [], probabilities: []
			};
		},
		stop() {
			const calls = spy.calls;
			spy.calls = null;
			return calls;
		},
		restore() {
			controller.getAttackDamage = getAttackDamage;
			controller.applySecondaryEffects = applySecondaryEffects;
		}
	};
	controller.getAttackDamage = function(statsInfo, attacker, attackInfo, ...rest) {
		spy.calls?.attackInfos.push(attackInfo);
		return getAttackDamage.call(this, statsInfo, attacker, attackInfo, ...rest);
	};
	controller.applySecondaryEffects = function(damage, critical, failure) {
		spy.calls?.probabilities.push({
			critical, failure
		});
		return applySecondaryEffects.call(this, damage, critical, failure);
	};
	return spy;
}

/**
 * Fight actions of the player classes with their figures, measured with the code of a compiled Core
 * @param {string} coreDir Core folder of a compiled Crownicles checkout
 * @returns {{ id: string, emoji: string, breath: number, power: { min: number, max: number } | null, accuracy: { min: number, max: number } | null, critical: { min: number, max: number } | null }[]}
 */
export function readPlayerActions(coreDir) {
	const core = loadCore(coreDir);
	const MeasureFighter = makeFighterClass(core.Fighter);
	const actions = core.FightActionDataController;
	const spy = spyOnController(core.FightActionController);

	/**
	 * Plays an action in a situation. The first calls are the ones of the action itself (a second damage computation is a
	 * recoil), and an action replaying another one (the counter attack) has no figures of its own
	 */
	function play(actionId, situation) {
		const action = actions.instance.getById(actionId);
		const sender = new MeasureFighter({
			level: situation.senderLevel, speed: situation.senderSpeed, energyRatio: situation.energyRatio
		});
		const receiver = new MeasureFighter({
			level: situation.senderLevel, speed: situation.receiverSpeed, energyRatio: 1
		});
		sender.fightActionsHistory = Array.from({ length: situation.previousUses }, () => action);
		if (situation.receiverLastAction) {
			receiver.fightActionsHistory = [actions.instance.getById(situation.receiverLastAction)];
		}
		spy.record();
		const result = actions.getFightActionFunction(actionId)(sender, receiver, action, situation.turn, null);
		const calls = spy.stop();
		return {
			attackInfo: result?.usedAction ? null : calls.attackInfos[0] ?? null,
			probabilities: result?.usedAction ? null : calls.probabilities[0] ?? null,
			preparedActionId: sender.nextFightAction?.id ?? null
		};
	}

	/**
	 * Plays an action in every situation and sums up what it asked for
	 */
	function measure(actionId) {
		const powers = [];
		const accuracies = [];
		const criticals = [];
		let preparedActionId = null;
		for (const situation of situations(core.FightConstants.MAX_TURNS)) {
			const played = play(actionId, situation);
			if (played.attackInfo) {
				powers.push(played.attackInfo.averageDamage);
			}
			if (played.probabilities) {
				accuracies.push(100 - played.probabilities.failure);
				criticals.push(played.probabilities.critical);
			}
			preparedActionId ??= played.preparedActionId;
		}
		return {
			power: toRange(powers),
			accuracy: toRange(accuracies),
			critical: toRange(criticals),
			preparedActionId
		};
	}

	try {
		return getPlayerActionIds(coreDir).map(id => {
			let measured = measure(id);
			if (id.startsWith(CHARGE_ACTION_PREFIX) && measured.preparedActionId) {
				measured = measure(measured.preparedActionId);
			}
			return {
				id,
				emoji: core.CrowniclesIcons.fightActions[id],
				breath: actions.getFightActionBreathCost(id),
				power: measured.power,
				accuracy: measured.accuracy,
				critical: measured.critical
			};
		});
	}
	finally {
		spy.restore();
	}
}
