// Synchronous fight model for the search: the real action, alteration and pet functions of the loaded build,
// played on cloned fighters in the order of the real controller (breath, pet, alteration, counters, action).

/**
 * Seeded generator (sfc32), fast and good enough for game rolls
 */
function makeRng(seed) {
	let a = 0x9E3779B9 ^ seed, b = 0x243F6A88 ^ (seed * 31), c = 0xB7E15162 ^ (seed * 977), d = seed | 1;
	const next = () => {
		a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
		let t = (a + b) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = (c << 21) | (c >>> 11);
		d = (d + 1) | 0;
		t = (t + d) | 0;
		c = (c + t) | 0;
		return (t >>> 0) / 4294967296;
	};
	for (let i = 0; i < 12; i++) {
		next();
	}
	return next;
}

const { copyWeakState } = require("./world");

function cloneFighter(f) {
	const c = Object.create(Object.getPrototypeOf(f));
	Object.assign(c, f);
	c.stats = { ...f.stats };
	c.attackModifiers = [...f.attackModifiers];
	c.defenseModifiers = [...f.defenseModifiers];
	c.speedModifiers = [...f.speedModifiers];
	c.resistances = f.resistances.map(r => ({ ...r }));
	c.damageMultipliers = f.damageMultipliers.map(m => ({ ...m }));
	c.breathRegenModifiers = f.breathRegenModifiers.map(m => ({ ...m }));
	c.alterationsMultipliers = new Map(f.alterationsMultipliers);
	c.alterationResistanceMultipliers = new Map(f.alterationResistanceMultipliers);
	c.fightActionsHistory = [...f.fightActionsHistory];
	// The control-time counters belong to the real fight only, the simulated turns must not add to them
	c.__altTurns = {};
	copyWeakState(f, c);
	return c;
}

/**
 * Copy of an AI behavior object with its memory: maps, sets, arrays and nested behavior objects are copied
 */
function cloneBehavior(behavior) {
	if (!behavior) {
		return behavior;
	}
	const copy = Object.create(Object.getPrototypeOf(behavior));
	for (const [key, value] of Object.entries(behavior)) {
		if (value instanceof Map) {
			copy[key] = new Map(value);
		}
		else if (value instanceof Set) {
			copy[key] = new Set(value);
		}
		else if (Array.isArray(value)) {
			copy[key] = [...value];
		}
		else if (value && typeof value === "object" && typeof value.chooseAction === "function") {
			copy[key] = cloneBehavior(value);
		}
		else {
			copy[key] = value;
		}
	}
	return copy;
}

function makeEngine(world) {
	const { FightConstants, FightActionDataController } = world;
	const { FightAlterationDataController } = require(world.D + "/data/FightAlteration");
	const { PetAssistanceDataController } = require(world.D + "/data/PetAssistance");
	const OUT_OF_BREATH = FightConstants.FIGHT_ACTIONS.ALTERATION.OUT_OF_BREATH;
	const FAKE_FIGHT = {};
	const view = (turn, opponent) => ({ fightController: { turn, getDefendingFighter: () => opponent } });

	// Pet assistances return Promise.resolve(result) without awaiting anything: Promise.resolve is intercepted
	// during the call to read the result synchronously. The few that really await are skipped in the model.
	const SYNC_MARK = Symbol("sync");
	const realResolve = Promise.resolve;
	const syncResolve = value => ({ [SYNC_MARK]: true, value });
	const asyncPets = new Set();
	// The assistances awaiting a database read have synchronous copies (the simulator's gear and pets are preloaded)
	const syncPets = require("./syncPets").makeSyncPets(world);
	// Every power of the pet in order, stopping when a fighter dies (like the real controller)
	function petAssist(current, other, t) {
		for (const assistance of world.getPetBehaviors(current.pet.typeId)) {
			runAssistance(assistance, current, other, t);
			if (current.isDead() || other.isDead()) {
				return;
			}
		}
	}

	function runAssistance(assistance, current, other, t) {
		if (!assistance || asyncPets.has(assistance.id)) {
			return;
		}
		const syncPet = syncPets.get(assistance.id);
		if (syncPet) {
			const result = syncPet(current, other, t);
			if (result) {
				other.damage(result.damages ?? 0);
			}
			return;
		}
		const fn = PetAssistanceDataController.getPetAssistanceFunction(assistance.id);
		Promise.resolve = syncResolve;
		let out;
		try {
			out = fn(current, other, t, FAKE_FIGHT);
		}
		finally {
			Promise.resolve = realResolve;
		}
		if (out && out[SYNC_MARK]) {
			if (out.value) {
				other.damage(out.value.damages ?? 0);
			}
			return;
		}
		// A real promise: this assistance awaits something, it is left out of the model from now on
		out?.catch?.(() => null);
		asyncPets.add(assistance.id);
	}

	function execute(sender, receiver, action, turn) {
		sender.nextFightAction = null;
		let played = action;
		if (!sender.useBreath(action.breath)) {
			if (Math.random() < FightConstants.OUT_OF_BREATH_FAILURE_PROBABILITY) {
				played = FightAlterationDataController.instance.getById(OUT_OF_BREATH);
				played.happen(sender, receiver, turn, FAKE_FIGHT);
			}
			else {
				sender.setBreath(0);
				action.use(sender, receiver, turn, FAKE_FIGHT);
			}
		}
		else {
			action.use(sender, receiver, turn, FAKE_FIGHT);
		}
		sender.fightActionsHistory.push(played);
	}

	/**
	 * Start of a half-turn; returns false if the fight ended during it
	 */
	function startHalfTurn(current, other, t) {
		current.regenerateBreath(t < 3);
		if (current.pet) {
			petAssist(current, other, t);
			if (current.isDead() || other.isDead()) {
				return false;
			}
		}
		if (current.alteration) {
			current.alteration.happen(current, other, t, FAKE_FIGHT);
			if (current.isDead() || other.isDead()) {
				return false;
			}
		}
		current.reduceCounters();
		return true;
	}

	function isOver(a, b, t) {
		return a.isDead() || b.isDead() || t >= FightConstants.MAX_TURNS;
	}

	function candidatesOf(fighter) {
		const actions = [...fighter.availableFightActions.values()];
		const affordable = actions.filter(a => a.breath <= fighter.getBreath());
		return affordable.length > 0 ? affordable : actions;
	}

	return { execute, startHalfTurn, isOver, candidatesOf, view, asyncPets, FightActionDataController };
}

module.exports = { makeRng, cloneFighter, cloneBehavior, makeEngine };
