// Class + pet combinations: every combination fights every other one on both sides, with the same gear and level,
// both sides playing the network alone (the production king guard policy).
// node comboRun.js --core <compiled Core dir> --gear "0:89:5:pveAttack3|1:13:5:defense3|2:4:0:|3:4:0:" --level 157 --n 6 --out combo.json
//   [--model <model.json> (default: the Core's resources/kingGuardAi/model.json)] [--tie 0.5] [--workers 15]
//   [--combos '[[class, pet], ...]' instead of every class x every pet] [--combo-ai network|scripted|search]
// --gear: category:itemId:itemLevel:enchantmentId for the weapon (0), armor (1), potion (2) and object (3)
const { fork } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const opt = (name, def) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : def;
};
const coreDir = path.resolve(opt("core"));
const N = +opt("n", 2);
const workers = +opt("workers", 15);
const PAIRS_PER_TASK = +opt("pairs-per-task", 400);
const classes = (opt("classes") ?? "18,19,20,21,22,23,24").split(",").map(Number);
const pets = JSON.parse(opt("pets", "null")) ?? null;
const gearSpec = opt("gear").split("|").map(part => {
	const [cat, id, lvl, ench] = part.split(":");
	return [+cat, +id, +lvl, ench || null];
});
const config = {
	mode: "combo", comboAi: opt("combo-ai", "network"), model: path.resolve(opt("model") ?? path.join(coreDir, "resources/kingGuardAi/model.json")),
	tieMargin: +opt("tie", 0.5), level: +opt("level", 157), gearSpec,
	search: { depth: 2, rootSamples: 8, samples: [8, 3], pruneTop: 3, opponentArgmax: 0.7 }
};

(async () => {
	// Read from the build: the pets with a fight power (plus 0 = no pet), their powers, and the moves of each class
	const cwd = process.cwd();
	process.chdir(coreDir);
	const world = require("./world").loadWorld(coreDir);
	const { PetDataController } = require(`${world.D}/data/Pet`);
	const allPets = PetDataController.instance.getAllValues();
	const petPowers = Object.fromEntries(allPets.map(p => [p.id, world.getPetBehaviors(p.id).map(b => b.id)]));
	const classActions = Object.fromEntries(classes.map(c => [c, world.ClassDataController.instance.getById(c).fightActionsIds
		.map(id => ({ id, breath: world.FightActionDataController.instance.getById(id)?.breath }))]));
	process.chdir(cwd);
	const petIds = opt("combos") ? [] : pets ?? [0, ...allPets.filter(p => petPowers[p.id].length > 0).map(p => p.id).sort((x, y) => x - y)];
	// --combos [[class, pet], ...] replaces the class x pet product
	const combos = opt("combos") ? JSON.parse(opt("combos")) : classes.flatMap(c => petIds.map(p => [c, p]));
	const C = combos.length;
	console.log(`${C} combinations, ${C * C} ordered pairs, ${C * C * N} fights`);
	const tasks = [];
	let pairs = [], idx = [];
	for (let i = 0; i < C; i++) {
		for (let j = 0; j < C; j++) {
			pairs.push([...combos[i], ...combos[j]]);
			idx.push(i * C + j);
			if (pairs.length === PAIRS_PER_TASK) {
				tasks.push({ id: tasks.length, pairs, idx });
				pairs = [];
				idx = [];
			}
		}
	}
	if (pairs.length) {
		tasks.push({ id: tasks.length, pairs, idx });
	}
	// counts[pair * 3 + result]: result 0 draw, 1 attacker won, 2 defender won
	const counts = new Uint32Array(C * C * 3);
	const actions = {};
	const mergeActions = part => {
		for (const [cls, t] of Object.entries(part ?? {})) {
			const m = actions[cls] ??= { fights: 0, won: 0, uses: {}, fightsUsed: {}, wonUsed: {} };
			m.fights += t.fights;
			m.won += t.won;
			for (const key of ["uses", "fightsUsed", "wonUsed"]) {
				for (const [id, n] of Object.entries(t[key])) {
					m[key][id] = (m[key][id] ?? 0) + n;
				}
			}
		}
	};
	const started = Date.now();
	await new Promise((resolve, reject) => {
		let next = 0, done = 0;
		const children = [];
		// Tasks handed to a worker that died before answering go back to the queue
		const retry = [];
		const pending = new Map();
		const spawn = () => {
			const child = fork(path.join(__dirname, "zworker.js"), [], { cwd: coreDir, stdio: ["ignore", "ignore", "inherit", "ipc"] });
			children.push(child);
			const feed = () => {
				if (retry.length || next < tasks.length) {
					const task = retry.length ? retry.pop() : tasks[next++];
					pending.set(child.pid, task);
					// Same seeds for every pair: the fights differ only by their combinations
					const seeds = Array.from({ length: N }, (_, k) => 900001 + k * 15485863 + task.id * 7919);
					child.send({ type: "task", id: task.id, pairs: task.pairs, seeds });
				}
				else {
					child.kill();
				}
			};
			child.on("message", msg => {
				if (msg.type === "loaded") {
					child.send({ type: "config", config });
				}
				else if (msg.type === "ready") {
					feed();
				}
				else if (msg.type === "error") {
					children.forEach(c => c.kill());
					reject(new Error(`worker failed: ${msg.message}`));
				}
				else if (msg.type === "done") {
					pending.delete(child.pid);
					mergeActions(msg.actions);
					const task = tasks[msg.id];
					msg.results.forEach((r, k) => {
						const base = task.idx[k] * 3;
						counts[base] += r[0];
						counts[base + 1] += r[1];
						counts[base + 2] += r[2];
					});
					done++;
					if (done % 100 === 0) {
						const s = (Date.now() - started) / 1000;
						process.stderr.write(`${done}/${tasks.length} tasks, ${s.toFixed(0)} s, ${(done * PAIRS_PER_TASK * N / s).toFixed(0)} fights/s\n`);
					}
					if (done === tasks.length) {
						resolve();
					}
					feed();
				}
			});
			child.on("exit", (code, signal) => {
				const lost = pending.get(child.pid);
				pending.delete(child.pid);
				if (lost && done < tasks.length) {
					process.stderr.write(`worker ${child.pid} died (${code ?? signal}) during task ${lost.id}, retrying it\n`);
					retry.push(lost);
					spawn();
				}
			});
		};
		for (let w = 0; w < Math.min(workers, tasks.length); w++) {
			spawn();
		}
	});
	const seconds = (Date.now() - started) / 1000;
	console.log(`${C * C * N} fights in ${seconds.toFixed(0)} s`);
	fs.writeFileSync(path.resolve(opt("out", "combo.json")), JSON.stringify({ classes, petIds, combos, N, level: config.level, gear: gearSpec, comboAi: config.comboAi, counts: Array.from(counts), actions, petPowers, classActions, seconds }));
	// The Core loaded in this process to list the pets keeps it alive
	process.exit(0);
})().catch(error => {
	console.error(error.message);
	process.exit(1);
});
