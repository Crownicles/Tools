// Gear space of each class: what every weapon, armor, object and potion really adds to the class's stats once the game's
// caps are applied (weapon and armor capped at the class's base stat, object at twice, potion uncapped), and the options
// that are not dominated on attack, defense and speed. Run from the compiled Core: cd <checkout>/Core && node <this> [level] [maxRarity]
// Writes gearSpace.json next to this script (or STUDY_WORK_DIR).
const fs = require("fs");
const path = require("path");

const coreDir = process.cwd();
const level = +(process.argv[2] ?? 157);
const maxRarity = +(process.argv[3] ?? 7);
const D = path.join(coreDir, "dist/Core/src");
const L = path.join(coreDir, "dist/Lib/src");
const { WeaponDataController } = require(path.join(D, "data/Weapon"));
const { ArmorDataController } = require(path.join(D, "data/Armor"));
const { PotionDataController } = require(path.join(D, "data/Potion"));
const { ObjectItemDataController } = require(path.join(D, "data/ObjectItem"));
const { ClassDataController } = require(path.join(D, "data/Class"));
const { ItemConstants } = require(path.join(L, "constants/ItemConstants"));

const CLASSES = (process.env.CLASSES ?? "18,19,20,21,22,23,24").split(",").map(Number);
const MAX = ItemConstants.MAX_UPGRADE_LEVEL;
const categories = [
	{ cat: 0, name: "weapon", ctrl: WeaponDataController, upgradable: true, cap: 1 },
	{ cat: 1, name: "armor", ctrl: ArmorDataController, upgradable: true, cap: 1 },
	{ cat: 2, name: "potion", ctrl: PotionDataController, upgradable: false, cap: Infinity },
	{ cat: 3, name: "object", ctrl: ObjectItemDataController, upgradable: false, cap: 2 }
];

const capped = (value, base, cap) => {
	if (process.env.STUDY_NO_CAPS === "1") {
		return value;
	}
	if (cap === Infinity) {
		return value;
	}
	// Same comparisons as Player.getCumulativeX: the weapon/armor below the base, the object below twice the base
	return cap === 1 ? (value < base ? value : base) : (value / 2 < base ? value : base * 2);
};
const dominated = (a, b) => b.atk >= a.atk && b.def >= a.def && b.spd >= a.spd && (b.atk > a.atk || b.def > a.def || b.spd > a.spd);

const out = { level, maxRarity, maxUpgradeLevel: MAX, classes: {} };
for (const cls of CLASSES) {
	const c = ClassDataController.instance.getById(cls);
	const base = { atk: c.getAttackValue(level), def: c.getDefenseValue(level), spd: c.getSpeedValue(level) };
	const slots = {};
	for (const { cat, name, ctrl, upgradable, cap } of categories) {
		const options = [];
		for (const item of ctrl.instance.getValuesArray()) {
			if (item.rarity > maxRarity) {
				continue;
			}
			// Potions without a fight stat (healing, time...) and the "no item" entries are kept only as id 0
			const lvl = upgradable ? MAX : 0;
			const raw = { atk: item.getAttack(lvl), def: item.getDefense(lvl), spd: item.getSpeed(lvl) };
			const eff = { atk: capped(raw.atk, base.atk, cap), def: capped(raw.def, base.def, cap), spd: capped(raw.spd, base.spd, cap) };
			options.push({ id: item.id, rarity: item.rarity, raw, ...eff, total: eff.atk + eff.def + eff.spd });
		}
		const front = options.filter(o => !options.some(p => dominated(o, p)));
		// Several items with the same effective stats: keep the lowest id
		const unique = [];
		for (const o of front.sort((x, y) => x.id - y.id)) {
			if (!unique.some(u => u.atk === o.atk && u.def === o.def && u.spd === o.spd)) {
				unique.push(o);
			}
		}
		slots[name] = { cat, front: unique.sort((x, y) => y.total - x.total), all: options.length };
	}
	out.classes[cls] = { base, energy: c.getMaxCumulativeEnergyValue(level), slots };
	console.log(`${cls} base ${JSON.stringify(base)}: ${Object.entries(slots).map(([k, s]) => `${k} ${s.front.length}/${s.all}`).join(", ")}`);
}
const file = path.join(process.env.STUDY_WORK_DIR ?? __dirname, `gearSpace_${level}_r${maxRarity}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`written ${file}`);
process.exit(0);
