// Worker of the v2 training loop (cwd = a Core directory). Modes:
// - gen0: scripted AIs on both sides, records their moves (imitation start) and the outcomes
// - selfplay: network-guided searches, past policies and scripted AIs; records the searches' move values and outcomes
// - bench: a guard playing the policy alone (production) against an attacker search that knows it exactly
// Fights are drawn like the production ones: 70 % king guard fights (players level >= 120, guard -10..+30 levels),
// 30 % ranked PvP (level >= 100); pets 75 % as in production, 25 % uniform over the assistances.
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const { loadWorld } = require("./world");
const { makeEngine, makeRng } = require("./engine");
const { makeZFeaturizer, ROLES } = require("./zfeatures");
const { ZNet } = require("./znet");
const { makeZSearch, makeZPolicy, drawValueOf } = require("./zsearch");

const world = loadWorld(process.cwd());
const engine = makeEngine(world);
const featurizer = makeZFeaturizer(world);
const { PetConstants } = require(`${world.L}/constants/PetConstants`);
const { FightConstants } = require(`${world.L}/constants/FightConstants`);
const A = featurizer.A;
const ROW = featurizer.size + A + 4;
const players = Object.values(world.roster).flat().filter(p => p.cls >= 18 && p.cls <= 24);
const byId = new Map(players.map(p => [p.id, p]));
const high = players.filter(p => p.level >= 120);
const all = players.filter(p => p.level >= 100);
// Uniform pet draw: one group per first power, plus one group per second power (rare pets with two powers)
const assistGroups = [...new Map([...PetConstants.PET_BEHAVIORS, ...(PetConstants.PET_SECONDARY_BEHAVIORS ?? [])]
	.map(m => [m.behaviorId, m.petIds])).values()];
let config = null, net = null, nets = [], Search = null, Policy = null, GuardSearch = null, rows = [];
let tempPetId = 800000;

function loadNet(file) {
	return ZNet.fromJSON(JSON.parse(fs.readFileSync(file, "utf8")));
}

/**
 * Wraps a behavior to record, at each decision with a choice, the state and the move values (search) or the chosen
 * move (scripted). With exploration, sometimes plays a move drawn from the search's values instead of the best one
 */
class Recorder {
	constructor(inner, sink, explore) {
		this.inner = inner;
		this.sink = sink;
		this.explore = explore;
		this.decisions = 0;
		this.ms = 0;
		this.maxMs = 0;
	}

	chooseAction(me, fightView) {
		const opponent = fightView.fightController.getDefendingFighter();
		const candidates = engine.candidatesOf(me);
		const x = candidates.length > 1 && this.sink ? featurizer.featurize(me, opponent, fightView.fightController.turn) : null;
		const start = performance.now();
		let action = this.inner.chooseAction(me, fightView);
		const elapsed = performance.now() - start;
		this.ms += elapsed;
		this.maxMs = Math.max(this.maxMs, elapsed);
		if (candidates.length <= 1) {
			return action;
		}
		this.decisions++;
		const values = new Float32Array(A).fill(-1);
		let searchValue = -1;
		const root = this.inner.lastRoot;
		if (root) {
			for (const { id, value } of root) {
				values[featurizer.actionIndex.get(id)] = value;
			}
			searchValue = this.inner.lastValue;
			if (this.explore && this.decisions <= 4 && Math.random() < 0.25) {
				// Exploration: a move drawn from softmax(values / 0.05) among the evaluated ones
				const w = root.map(r => Math.exp((r.value - searchValue) / 0.05));
				let roll = Math.random() * w.reduce((s, v) => s + v, 0);
				const k = w.findIndex(v => (roll -= v) <= 0);
				action = candidates.find(c => c.id === root[k < 0 ? root.length - 1 : k].id) ?? action;
			}
		}
		else {
			for (const c of candidates) {
				values[featurizer.actionIndex.get(c.id)] = 0;
			}
			values[featurizer.actionIndex.get(action.id)] = 1;
		}
		if (x) {
			this.sink.push({ x, values, searchValue, role: ROLES.indexOf(me.__role) });
		}
		return action;
	}
}

function uniformPet(pick) {
	const group = assistGroups[Math.floor(pick() * assistGroups.length)];
	return group[Math.floor(pick() * group.length)];
}

/**
 * The fighters of a seeded fight: kind, both sides with level, gear, pet and role
 */
function drawFight(seed, forcedKind) {
	const pick = makeRng(seed);
	const kind = forcedKind ?? (pick() < 0.7 ? "guard" : "pvp");
	const attackerPool = kind === "guard" ? high : all;
	let attacker = attackerPool[Math.floor(pick() * attackerPool.length)];
	if (pick() < 0.3) {
		// Someone else's gear, to avoid learning the roster by heart
		attacker = { ...attacker, ao: attackerPool[Math.floor(pick() * attackerPool.length)].ao };
	}
	const attackerPet = pick() < 0.25 ? uniformPet(pick) : world.PETS[attacker.id] ?? null;
	let defender, defenderPet;
	if (kind === "guard") {
		const offset = -10 + Math.floor(pick() * 41);
		const level = Math.max(FightConstants.REQUIRED_LEVEL, attacker.level + offset);
		Math.random = makeRng(seed ^ 0x1b873593);
		const id = -1 - (seed % 1000000);
		defender = world.makeKingGuard(level, id);
		defender.offset = offset;
		defenderPet = pick() < 0.25 ? uniformPet(pick) : world.PETS[id];
	}
	else {
		defender = all[Math.floor(pick() * all.length)];
		defenderPet = pick() < 0.25 ? uniformPet(pick) : world.PETS[defender.id] ?? null;
	}
	return { kind, attacker, defender, attackerPet, defenderPet, energyRatio: 0.8 + 0.2 * pick(), pick };
}

function setPet(fighter, typeId) {
	if (typeId === null || typeId === undefined) {
		fighter.pet = undefined;
		fighter.player.petId = null;
		return;
	}
	const id = tempPetId++;
	world.PETS[id] = typeId;
	fighter.pet = { typeId };
	fighter.player.petId = id;
}

async function play(fight, attackerBehavior, defenderBehavior) {
	const out = await world.playFight(fight.attacker, fight.defender, {
		attackerBehavior, defenderBehavior, attackerEnergyRatio: fight.energyRatio,
		prepare: (a, b) => {
			a.__role = "attacker";
			b.__role = fight.kind === "guard" ? "guard" : "pvpDefender";
			setPet(a, fight.attackerPet);
			setPet(b, fight.defenderPet);
		}
	});
	return out;
}

function flush(sinkA, sinkB, out, kind) {
	const sides = [[sinkA, out.result === 1 ? 1 : out.result === 2 ? 0 : drawValueOf("attacker")],
		[sinkB, out.result === 2 ? 1 : out.result === 1 ? 0 : drawValueOf(kind === "guard" ? "guard" : "pvpDefender")]];
	for (const [sink, outcome] of sides) {
		for (const d of sink) {
			const row = new Float32Array(ROW);
			row.set(d.x, 0);
			row.set(d.values, featurizer.size);
			row[featurizer.size + A] = d.searchValue;
			row[featurizer.size + A + 1] = outcome;
			row[featurizer.size + A + 2] = 1 / sink.length;
			row[featurizer.size + A + 3] = d.role;
			rows.push(row);
		}
	}
}

function controller(kind, seed, pick) {
	if (kind === "search") {
		return new Search();
	}
	if (kind === "past") {
		const PastPolicy = nets.length ? makeZPolicy(engine, featurizer, nets[Math.floor(pick() * nets.length)]) : Policy;
		return new PastPolicy();
	}
	return undefined;
}

async function runSeed(seed) {
	Math.random = makeRng(seed ^ 0x5bd1e995);
	if (config.mode === "gen0") {
		const fight = drawFight(seed);
		Math.random = makeRng(seed ^ 0x5bd1e995);
		const sinkA = [], sinkB = [];
		const recA = new Recorder(null, sinkA, false), recB = new Recorder(null, sinkB, false);
		const out = await play(fight,
			{ chooseAction: (me, view) => (recA.inner ??= world.getAiClassBehavior(me.player.class), recA.chooseAction(me, view)) },
			{ chooseAction: (me, view) => (recB.inner ??= world.getAiClassBehavior(me.player.class), recB.chooseAction(me, view)) });
		flush(sinkA, sinkB, out, fight.kind);
		return { seed, kind: fight.kind, result: out.result, turns: out.turns };
	}
	if (config.mode === "selfplay") {
		const fight = drawFight(seed);
		const roll = side => {
			const r = fight.pick();
			return r < 0.6 ? "search" : r < 0.8 ? "past" : "scripted";
		};
		let kinds = [roll(), roll()];
		if (!kinds.includes("search")) {
			kinds[fight.pick() < 0.5 ? 0 : 1] = "search";
		}
		Math.random = makeRng(seed ^ 0x5bd1e995);
		const sinkA = [], sinkB = [];
		const wrap = (k, sink, s) => {
			const inner = controller(k, s, fight.pick);
			return k === "search" ? new Recorder(inner, sink, true) : inner;
		};
		const out = await play(fight, wrap(kinds[0], sinkA, seed ^ 0x27d4eb2d), wrap(kinds[1], sinkB, seed ^ 0x165667b1));
		flush(sinkA, sinkB, out, fight.kind);
		return { seed, kind: fight.kind, sides: kinds, result: out.result, turns: out.turns };
	}
	if (config.mode === "bench") {
		// Production guard (policy alone) against an attacker search that has learned it; same fights for every guard
		const attacker = byId.get(config.attackers[seed % config.attackers.length]);
		const offset = config.offsets[Math.floor(seed / config.attackers.length) % config.offsets.length];
		Math.random = makeRng(seed ^ 0x1b873593);
		const id = -1 - (seed % 1000000);
		const guard = world.makeKingGuard(Math.max(FightConstants.REQUIRED_LEVEL, attacker.level + offset), id);
		const fight = { kind: "guard", attacker, defender: guard, attackerPet: world.PETS[attacker.id] ?? null, defenderPet: world.PETS[id], energyRatio: config.fullEnergy ? 1 : 0.8 + 0.2 * makeRng(seed)() };
		Math.random = makeRng(seed ^ 0x5bd1e995);
		// --guard-depth: the guard searches (network-guided) instead of playing the policy alone
		const guardBehavior = config.guardModel === "scripted" ? undefined
			: new Recorder(config.guardDepth ? new GuardSearch() : new Policy(), null, false);
		const attackerBehavior = new Search();
		const out = await play(fight, attackerBehavior, guardBehavior);
		return {
			seed, attackerId: attacker.id, offset, guardCls: guard.cls, result: out.result, turns: out.turns,
			guardMs: guardBehavior?.ms ?? 0, guardDecisions: guardBehavior?.decisions ?? 0, prediction: attackerBehavior.predictions[0]
		};
	}
	if (config.mode === "combo") {
		// Class + pet combinations, all with the same gear and level, both sides playing the network alone
		// Gear: the pair's gear set when given, else the class's gear, else the common gear
		const [a, pa, d, pd, ga, gd] = config.pair;
		const gearOf = (cls, key) => config.gearSets[key] ?? config.gearSets[`class${cls}`] ?? config.gear;
		const fight = {
			kind: "pvp",
			attacker: { id: 1000001, level: config.level, cls: a, ao: gearOf(a, ga) },
			defender: { id: 1000002, level: config.level, cls: d, ao: gearOf(d, gd) },
			attackerPet: pa || null, defenderPet: pd || null,
			energyRatio: 0.8 + 0.2 * makeRng(seed)()
		};
		Math.random = makeRng(seed ^ 0x5bd1e995);
		// --combo-ai: network alone (default), scripted AIs, or the network-guided search on both sides
		const side = () => (config.comboAi === "scripted" ? undefined : config.comboAi === "search" ? new Search() : new Policy());
		const out = await play(fight, side(), side());
		tallyActions(a, out.aActs, out.result === 1);
		tallyActions(d, out.bActs, out.result === 2);
		return out.result;
	}
	if (config.mode === "matrix") {
		// Balance oracle: roster players of two classes, the network-guided search on both sides
		const pick = makeRng(seed);
		const attackers = all.filter(p => p.cls === config.a), defenders = all.filter(p => p.cls === config.d);
		const fight = {
			kind: "pvp", attacker: attackers[Math.floor(pick() * attackers.length)], defender: defenders[Math.floor(pick() * defenders.length)],
			energyRatio: config.fullEnergy ? 1 : 0.8 + 0.2 * pick()
		};
		fight.attackerPet = world.PETS[fight.attacker.id] ?? null;
		fight.defenderPet = world.PETS[fight.defender.id] ?? null;
		Math.random = makeRng(seed ^ 0x5bd1e995);
		const out = await play(fight, new Search(), config.defenderAi === "scripted" ? undefined : new Search());
		return { seed, a: config.a, d: config.d, result: out.result, turns: out.turns };
	}
	throw new Error(`unknown mode ${config.mode}`);
}

// Moves played per class: uses, fights where the move was played at least once, and how often those fights were won
let actionTally = {};
function tallyActions(cls, acts, won) {
	const t = actionTally[cls] ??= { fights: 0, won: 0, uses: {}, fightsUsed: {}, wonUsed: {} };
	t.fights++;
	t.won += won ? 1 : 0;
	for (const [id, n] of Object.entries(acts)) {
		t.uses[id] = (t.uses[id] ?? 0) + n;
		t.fightsUsed[id] = (t.fightsUsed[id] ?? 0) + 1;
		t.wonUsed[id] = (t.wonUsed[id] ?? 0) + (won ? 1 : 0);
	}
}

process.on("message", msg => {
	handle(msg).catch(error => process.send({ type: "error", message: error?.stack ?? String(error) }));
});

async function handle(msg) {
	if (msg.type === "config") {
		config = msg.config;
		// Balance variants without recompiling: FightConstants overrides and class stats
		for (const [key, value] of config.sets ?? []) {
			const keys = key.split(".");
			const holder = keys.slice(0, -1).reduce((o, k) => o[k], world.FightConstants);
			holder[keys[keys.length - 1]] = Number(value);
		}
		// --damage-mult actionId=multiplier: the damage of an action is multiplied (like raising its base damage)
		for (const [id, mult] of config.damageMults ?? []) {
			const original = world.FightActionDataController.getFightActionFunction(id);
			const cache = world.FightActionDataController.fightActionsFunctionsCache ?? world.FightActionDataController["fightActionsFunctionsCache"];
			const boosted = (...callArgs) => {
				const result = original(...callArgs);
				if (result?.damages) {
					result.damages = Math.round(result.damages * Number(mult));
				}
				return result;
			};
			cache.set(id, boosted);
		}
		// --patch file.js: module.exports = (world, options) => { ... } replacing actions or pet powers of the build
		if (config.patchFile) {
			require(config.patchFile)(world, config.patchOptions ?? {});
		}
		for (const [key, value] of config.classStats ?? []) {
			const [cls, stat] = key.split(".");
			world.ClassDataController.instance.getById(+cls)[stat] = Number(value);
		}
		if (config.gearSpec || config.gearSetSpecs) {
			const { WeaponDataController } = require(`${world.D}/data/Weapon`);
			const { ArmorDataController } = require(`${world.D}/data/Armor`);
			const { PotionDataController } = require(`${world.D}/data/Potion`);
			const { ObjectItemDataController } = require(`${world.D}/data/ObjectItem`);
			const controllers = [WeaponDataController, ArmorDataController, PotionDataController, ObjectItemDataController];
			const keys = ["weapon", "armor", "potion", "object"];
			const parse = spec => {
				const gear = {};
				spec.forEach(([cat, id, lvl, ench]) => {
					gear[keys[cat]] = { item: controllers[cat].instance.getById(id), itemLevel: lvl, itemEnchantmentId: ench };
				});
				return gear;
			};
			config.gear = config.gearSpec ? parse(config.gearSpec) : null;
			config.gearSets = Object.fromEntries(Object.entries(config.gearSetSpecs ?? {}).map(([key, spec]) => [key, parse(spec)]));
		}
		if (config.model) {
			net = loadNet(config.model);
			if (JSON.stringify(net.vocab) !== JSON.stringify(featurizer.vocab)) {
				throw new Error("the model was trained with other actions, alterations or pet assistances than this build");
			}
			Search = makeZSearch(world, engine, featurizer, net, { ...config.search, knowPolicy: config.mode === "bench" && config.knowPolicy !== false });
			Policy = makeZPolicy(engine, featurizer, config.guardModel && config.guardModel !== "scripted" ? loadNet(config.guardModel) : net, { tieMargin: config.tieMargin ?? 0, logitBias: config.logitBias });
		}
		nets = (config.pastModels ?? []).map(loadNet);
		if (config.guardDepth) {
			const guardNet = config.guardModel && config.guardModel !== "scripted" ? loadNet(config.guardModel) : net;
			GuardSearch = makeZSearch(world, engine, featurizer, guardNet, { depth: config.guardDepth, rootSamples: 8, samples: [8, 3, 2], pruneTop: 3, opponentArgmax: 0.7 });
		}
		process.send({ type: "ready", F: featurizer.size, A, vocab: featurizer.vocab });
		return;
	}
	if (msg.a) {
		config.a = msg.a;
		config.d = msg.d;
	}
	if (msg.pairs) {
		// Combo tasks: several pairs, each played on its seeds; compact results [result per seed] per pair
		const out = [];
		for (const pair of msg.pairs) {
			config.pair = pair;
			const r = [0, 0, 0];
			for (const seed of msg.seeds) {
				r[await runSeed(seed)]++;
			}
			out.push(r);
		}
		process.send({ type: "done", id: msg.id, results: out, actions: actionTally });
		actionTally = {};
		return;
	}
	const results = [];
	for (const seed of msg.seeds) {
		results.push(await runSeed(seed));
	}
	if (rows.length && config.out) {
		const flat = new Float32Array(rows.length * ROW);
		rows.forEach((r, i) => flat.set(r, i * ROW));
		fs.appendFileSync(path.join(config.out, `data_${process.pid}.bin`), Buffer.from(flat.buffer));
		rows = [];
	}
	process.send({ type: "done", id: msg.id, results });
}
process.send({ type: "loaded" });
