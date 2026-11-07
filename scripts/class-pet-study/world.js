// Loads a compiled Core build (dist) and the level 100+ roster, and builds fighters with their real gear, pet and potion.
// No side effect at require time: a worker calls loadWorld(coreDir) once.
const fs = require("fs");
const path = require("path");
// Optional roster of real level 100+ players (players100.md, pets100.json); the class + pet study does not need it
const DATA = process.env.SOLVER_DATA_DIR ?? path.join(__dirname, "..");
const readOptional = file => (fs.existsSync(path.join(DATA, file)) ? fs.readFileSync(path.join(DATA, file), "utf8") : null);

// The game keeps some per-fighter fight state in module-level WeakMaps and WeakSets (pet powers with a memory). The search clones
// fighters, so every WeakMap created by the build is registered and its entry is copied to the clone
const weakRegistry = [];
if (!globalThis.WeakMap.__registered) {
	const NativeWeakMap = globalThis.WeakMap;
	class RegisteredWeakMap extends NativeWeakMap {
		constructor(entries) {
			super(entries);
			weakRegistry.push(this);
		}
	}
	RegisteredWeakMap.__registered = true;
	globalThis.WeakMap = RegisteredWeakMap;
}
const weakSetRegistry = [];
if (!globalThis.WeakSet.__registered) {
	const NativeWeakSet = globalThis.WeakSet;
	class RegisteredWeakSet extends NativeWeakSet {
		constructor(values) {
			super(values);
			weakSetRegistry.push(this);
		}
	}
	RegisteredWeakSet.__registered = true;
	globalThis.WeakSet = RegisteredWeakSet;
}

/**
 * Copies the per-fighter state the game keeps in WeakMaps from a fighter to its clone
 */
function copyWeakState(from, to) {
	for (const map of weakRegistry) {
		if (map.has(from)) {
			map.set(to, map.get(from));
		}
	}
	for (const set of weakSetRegistry) {
		if (set.has(from)) {
			set.add(to);
		}
	}
}

function loadWorld(coreDir, options = {}) {
	const D = path.join(coreDir, "dist/Core/src");
	const L = path.join(coreDir, "dist/Lib/src");
	const req = p => require(path.join(D, p));
	const { WeaponDataController } = req("data/Weapon");
	const { ArmorDataController } = req("data/Armor");
	const { PotionDataController } = req("data/Potion");
	const { ObjectItemDataController } = req("data/ObjectItem");
	const { ClassDataController } = req("data/Class");
	const { FightActionDataController } = req("data/FightAction");
	const { ItemEnchantment, ItemEnchantmentKind } = require(path.join(L, "types/ItemEnchantment"));
	const { EnchantmentConstants } = require(path.join(L, "constants/EnchantmentConstants"));
	const { FightConstants } = require(path.join(L, "constants/FightConstants"));
	const { FightController } = req("core/fights/FightController");
	const { FightOvertimeBehavior } = req("core/fights/FightOvertimeBehavior");
	const { AiPlayerFighter } = req("core/fights/fighter/AiPlayerFighter");
	const AiBehaviorController = req("core/fights/AiBehaviorController");
	const PetAssistManager = req("core/fights/PetAssistManager");

	FightActionDataController.getFightActionFunction("simpleAttack");
	// Fun metric: count the half-turns each fighter spends under each alteration
	const { FightAlteration } = req("data/FightAlteration");
	if (!FightAlteration.prototype.__counted) {
		const happen = FightAlteration.prototype.happen;
		FightAlteration.prototype.happen = function(affected, ...rest) {
			const result = happen.call(this, affected, ...rest);
			// Only the half-turns where the alteration is still active count (not the one where it wears off)
			if (affected.alteration?.id === this.id) {
				affected.__altTurns ??= {};
				affected.__altTurns[this.id] = (affected.__altTurns[this.id] ?? 0) + 1;
			}
			return result;
		};
		FightAlteration.prototype.__counted = true;
	}
	AiBehaviorController.initializeAllClassBehaviors();
	PetAssistManager.initializeAllPetBehaviors();
	const PETS = options.noPets ? {} : JSON.parse(readOptional("pets100.json") ?? "{}");
	// Pet assistances reading the database get the pet from the roster instead (a player's pet id is its player id here)
	req("core/database/game/models/PetEntity").PetEntities.getById = id => Promise.resolve(PETS[id] ? { typeId: PETS[id] } : null);

	function enchMult(ao, kind, mults) {
		const id = kind.slot === 0 ? ao.weapon.itemEnchantmentId : ao.armor.itemEnchantmentId;
		const e = id ? ItemEnchantment.getById(id) : null;
		return e && e.kind === kind ? mults[e.level - 1] ?? 1 : 1;
	}
	// STUDY_NO_CAPS=1: items are not capped by the class base stat; STUDY_ITEM_MULT: multiplier of every item stat (1)
	const NO_CAPS = process.env.STUDY_NO_CAPS === "1";
	const ITEM_MULT = +(process.env.STUDY_ITEM_MULT ?? 1);
	function cum(base, w, a, o, p) {
		if (NO_CAPS || ITEM_MULT !== 1) {
			[w, a, o, p] = [w, a, o, p].map(v => v * ITEM_MULT);
		}
		if (NO_CAPS) {
			return base + w + a + o + p;
		}
		return base + (w < base ? w : base) + (a < base ? a : base) + (o / 2 < base ? o : base * 2) + p;
	}
	function makePlayer(cls, level, id) {
		const c = ClassDataController.instance.getById(cls);
		return {
			id, keycloakId: `sim${id}`, class: cls, level, rage: 0, petId: null,
			getGloryPoints: () => 0,
			getCumulativeAttack(ao, pot, l = level) {
				const b = c.getAttackValue(l);
				return Math.max(0, Math.round(cum(b, ao.weapon.item.getAttack(ao.weapon.itemLevel), ao.armor.item.getAttack(ao.armor.itemLevel), ao.object.item.getAttack(), pot ? ao.potion.item.getAttack() : 0)));
			},
			getCumulativeDefense(ao, pot, l = level) {
				const b = c.getDefenseValue(l);
				return Math.max(0, Math.round(cum(b, ao.weapon.item.getDefense(ao.weapon.itemLevel), ao.armor.item.getDefense(ao.armor.itemLevel), ao.object.item.getDefense(), pot ? ao.potion.item.getDefense() : 0)));
			},
			getCumulativeSpeed(ao, pot, l = level) {
				const b = c.getSpeedValue(l);
				const v = cum(b, ao.weapon.item.getSpeed(ao.weapon.itemLevel), ao.armor.item.getSpeed(ao.armor.itemLevel), ao.object.item.getSpeed(), pot ? ao.potion.item.getSpeed() : 0);
				return Math.max(0, Math.round(v * enchMult(ao, ItemEnchantmentKind.SPEED, EnchantmentConstants.SPEED_MULTIPLIER)));
			},
			getMaxCumulativeEnergy(ao, l = level) {
				return Math.round(c.getMaxCumulativeEnergyValue(l) * enchMult(ao, ItemEnchantmentKind.MAX_ENERGY, EnchantmentConstants.MAX_ENERGY_MULTIPLIER));
			},
			getBaseBreath(ao) {
				const e = ao.weapon.itemEnchantmentId ? ItemEnchantment.getById(ao.weapon.itemEnchantmentId) : null;
				return c.baseBreath + (e && e.kind === ItemEnchantmentKind.BASE_BREATH ? e.level * EnchantmentConstants.BASE_BREATH_BONUS : 0);
			},
			getMaxBreath(ao) {
				const e = ao.armor.itemEnchantmentId ? ItemEnchantment.getById(ao.armor.itemEnchantmentId) : null;
				return c.maxBreath + (e && e.kind === ItemEnchantmentKind.MAX_BREATH ? EnchantmentConstants.MAX_BREATH_BONUS : 0);
			},
			getBreathRegen: () => c.breathRegen
		};
	}

	const ctrls = [WeaponDataController, ArmorDataController, PotionDataController, ObjectItemDataController];
	const roster = {};
	for (const r of (readOptional("players100.md") ?? "").split("\n").filter(l => /^\| \d/.test(l))) {
		const parts = r.split("|").slice(1, -1).map(s => s.trim());
		const [id, level, cls] = parts.map(Number);
		const ao = {};
		const keys = ["weapon", "armor", "potion", "object"];
		for (const it of parts.slice(6).join("|").split("|")) {
			const [cat, itemId, itemLevel, ench] = it.split(":");
			ao[keys[+cat]] = { item: ctrls[+cat].instance.getById(+itemId), itemLevel: +itemLevel, itemEnchantmentId: ench || null };
		}
		(roster[cls] ??= []).push({ id, level, cls, ao });
	}

	/**
	 * Fighter of a roster player with the AI behavior of this build (a random defense personality where several exist)
	 */
	function buildFighter(p, { pve = false } = {}) {
		const player = makePlayer(p.cls, p.level, p.id);
		if (PETS[p.id]) {
			player.petId = p.id;
		}
		const f = new AiPlayerFighter(player, ClassDataController.instance.getById(p.cls), {
			allowPotionConsumption: false, preloadedActiveObjects: p.ao, preloadedPetEntity: null
		});
		f.stats.maxEnergy = player.getMaxCumulativeEnergy(p.ao);
		f.stats.energy = f.stats.maxEnergy;
		f.loadCombatStats(p.ao, pve, true);
		f.getMainActiveObjects = () => Promise.resolve(p.ao);
		if (PETS[p.id]) {
			f.pet = { typeId: PETS[p.id] };
		}
		return f;
	}

	/**
	 * Plays one fight in the real fight controller. The behaviors replace the build's AI when given
	 * @returns 1 attacker won, 2 defender won, 0 draw
	 */
	async function playFight(pa, pb, { attackerBehavior, defenderBehavior, attackerEnergyRatio = 1, prepare } = {}) {
		const a = buildFighter(pa);
		if (attackerBehavior) {
			a.classBehavior = attackerBehavior;
		}
		a.stats.energy = Math.round(a.stats.maxEnergy * attackerEnergyRatio);
		const b = buildFighter(pb);
		if (defenderBehavior) {
			b.classBehavior = defenderBehavior;
		}
		prepare?.(a, b);
		const fc = new FightController({ fighter1: a, fighter2: b }, {
			overtimeBehavior: FightOvertimeBehavior.END_FIGHT_DRAW,
			context: { frontEndOrigin: "solver", frontEndSubOrigin: "solver", keycloakId: "solver" },
			silentMode: true
		});
		let ended = false;
		fc.setEndCallback(() => {
			ended = true;
			return Promise.resolve();
		});
		await fc.startFight([]);
		if (!ended) {
			throw new Error("fight did not end");
		}
		// Fun metrics: turns lost without acting (stunned, blinded, out of breath) and the moves played by each side
		const lostIds = new Set(["none", "outOfBreath"]);
		const tally = f => {
			const counts = {};
			for (const action of f.fightActionsHistory) {
				counts[action.id] = (counts[action.id] ?? 0) + 1;
			}
			return counts;
		};
		return {
			result: fc.isADraw() ? 0 : fc.getWinnerFighter() === a ? 1 : 2,
			turns: fc.turn,
			aLost: a.fightActionsHistory.filter(x => lostIds.has(x.id)).length,
			bLost: b.fightActionsHistory.filter(x => lostIds.has(x.id)).length,
			aAlt: a.__altTurns ?? {},
			bAlt: b.__altTurns ?? {},
			aActs: tally(a),
			bActs: tally(b)
		};
	}

	/**
	 * King guard generated by the build's own code (class of its level group, equipment, weighted pet), as a roster entry.
	 * Every draw goes through Math.random, so a seeded Math.random makes it reproducible
	 */
	function makeKingGuard(level, id) {
		const { generateKingGuardEquipment } = req("core/fights/kingGuards/KingGuardEquipment");
		const { ClassConstants } = require(path.join(L, "constants/ClassConstants"));
		const { RandomUtils } = require(path.join(L, "utils/RandomUtils"));
		const { PetDataController } = req("data/Pet");
		const bounds = [ClassConstants.REQUIRED_LEVEL, ClassConstants.GROUP1LEVEL, ClassConstants.GROUP2LEVEL, ClassConstants.GROUP3LEVEL, ClassConstants.GROUP4LEVEL];
		let group = 0;
		while (group < bounds.length - 1 && level >= bounds[group + 1]) {
			group++;
		}
		const guardClass = RandomUtils.crowniclesRandom.pick(ClassDataController.instance.getByGroup(group));
		const ao = generateKingGuardEquipment(level);
		const pet = RandomUtils.weightedPick(PetDataController.instance.getAllValues().filter(p => p.rarity !== 0), p => p.force);
		PETS[id] = pet.id;
		return { id, level, cls: guardClass.id, ao };
	}

	return {
		D, L, FightConstants, FightActionDataController, ClassDataController, FightController, FightOvertimeBehavior,
		getAiClassBehavior: AiBehaviorController.getAiClassBehavior,
		// All the powers of a pet, the first one first (older builds have a single power per pet)
		getPetBehaviors: typeId => (PetAssistManager.getPetBehaviors
			? PetAssistManager.getPetBehaviors(typeId)
			: [PetAssistManager.getAiPetBehavior(typeId)].filter(Boolean)),
		getAiPetBehavior: typeId => (PetAssistManager.getPetBehaviors ? PetAssistManager.getPetBehaviors(typeId)[0] : PetAssistManager.getAiPetBehavior(typeId)),
		roster, buildFighter, playFight, makeKingGuard, PETS
	};
}

module.exports = { loadWorld, copyWeakState };
