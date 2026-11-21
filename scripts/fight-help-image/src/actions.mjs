// Reads the fight actions of the player classes and the class lineages from a compiled Core, and measures the actions: every action is played in a grid of
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
		ClassInfoConstants: require(path.join(lib, "constants/ClassInfoConstants")).ClassInfoConstants,
		CrowniclesIcons: require(path.join(lib, "CrowniclesIcons")).CrowniclesIcons
	};
}

/**
 * Actions of every player class, by class id in increasing order
 * @param {string} coreDir
 * @returns {Map<number, string[]>}
 */
function readClassActions(coreDir) {
	const classesDir = path.join(coreDir, "resources/classes");
	return new Map(readdirSync(classesDir)
		.filter(file => file.endsWith(".json"))
		.map(file => [parseInt(file, 10), JSON.parse(readFileSync(path.join(classesDir, file), "utf8")).fightActionsIds])
		.sort(([a], [b]) => a - b));
}

/**
 * Actions of a lineage in the order its classes unlock them, each with the first class of the lineage having it
 * @param {readonly number[]} classIds Classes of the lineage, in the order a player reaches them
 * @param {Map<number, string[]>} classActions
 * @returns {{ id: string, unlockClassId: number }[]}
 */
export function getLineageActions(classIds, classActions) {
	const unlockClassIds = new Map();
	for (const classId of classIds) {
		for (const actionId of classActions.get(classId) ?? []) {
			if (!unlockClassIds.has(actionId)) {
				unlockClassIds.set(actionId, classId);
			}
		}
	}
	return [...unlockClassIds].map(([id, unlockClassId]) => ({
		id, unlockClassId
	}));
}

/**
 * Class lineages of the game (ClassInfoConstants.CLASS_LINEAGES), a class outside of any lineage being a lineage on its own
 * @param {Map<number, string[]>} classActions
 * @param {object} core
 */
function readLineages(classActions, core) {
	const lineages = new Map();
	for (const classId of classActions.keys()) {
		const classIds = core.ClassInfoConstants.getClassLineage(classId);
		if (!lineages.has(classIds.join())) {
			lineages.set(classIds.join(), {
				classes: classIds.map(id => ({
					id, emoji: core.CrowniclesIcons.classes[id]
				})),
				actions: getLineageActions(classIds, classActions)
			});
		}
	}
	return [...lineages.values()];
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
 * Fight actions of the player classes with their figures, measured with the code of a compiled Core, and the class lineages using them
 * @param {string} coreDir Core folder of a compiled Crownicles checkout
 * @returns {{
 *   actions: Map<string, { id: string, emoji: string, breath: number, power: { min: number, max: number } | null, accuracy: { min: number, max: number } | null, critical: { min: number, max: number } | null }>,
 *   lineages: { classes: { id: number, emoji: string }[], actions: { id: string, unlockClassId: number }[] }[]
 * }}
 */
export function readFightActions(coreDir) {
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
		const classActions = readClassActions(coreDir);
		const actionIds = new Set([...classActions.values()].flat());
		return {
			actions: new Map([...actionIds].map(id => {
				let measured = measure(id);
				if (id.startsWith(CHARGE_ACTION_PREFIX) && measured.preparedActionId) {
					measured = measure(measured.preparedActionId);
				}
				return [id, {
					id,
					emoji: core.CrowniclesIcons.fightActions[id],
					breath: actions.getFightActionBreathCost(id),
					power: measured.power,
					accuracy: measured.accuracy,
					critical: measured.critical
				}];
			})),
			lineages: readLineages(classActions, core)
		};
	}
	finally {
		spy.restore();
	}
}
