// Differential test of the search's fight model against the real fight controller.
// A real fight is played with a recording random generator; at each decision of the probe fighter its state and the
// opponent's are cloned. The model then replays every own move + opponent half-turn from the clone with the exact same
// random draws, and must land on the state the real fight reached at the next decision, consuming the same draws.
// Usage (cwd = a Core directory): node <solver>/syncPetsTest.js [fightsPerPet] [behaviorIds]
const { loadWorld } = require("./world");
const { makeEngine, makeRng, cloneFighter } = require("./engine");

const world = loadWorld(process.cwd());
const engine = makeEngine(world);
const { PetConstants } = require(`${world.L}/constants/PetConstants`);
const { FightConstants } = require(`${world.L}/constants/FightConstants`);
const PET = FightConstants.FIGHT_ACTIONS.PET;
const FIGHTS = +(process.argv[2] ?? 30);
const mappings = [...PetConstants.PET_BEHAVIORS, ...(PetConstants.PET_SECONDARY_BEHAVIORS ?? [])];
const behaviors = process.argv[3] ? process.argv[3].split(",") : [...new Set(mappings.map(m => m.behaviorId))];
const petOf = id => mappings.find(m => m.behaviorId === id)?.petIds[0];

// Recording generator: the draws of the real fight, replayable from any index
let tape = [], cursor = 0, replaying = false, base = null;
const recorder = () => {
	if (replaying) {
		return cursor < tape.length ? tape[cursor++] : (cursor++, 0.5);
	}
	const x = base();
	tape.push(x);
	return x;
};

const state = f => ({
	energy: f.getEnergy(), breath: f.getBreath(), attack: f.getAttack(), defense: f.getDefense(), speed: f.getSpeed(),
	alteration: f.alteration?.id ?? null, next: f.nextFightAction?.id ?? null, history: f.fightActionsHistory.length
});
const same = (x, y) => Object.keys(x).every(k => x[k] === y[k]);

/**
 * Deterministic behavior (no random draw) recording, at each of its decisions, clones of both fighters and the tape index
 */
class Probe {
	constructor(log) {
		this.log = log;
	}

	chooseAction(me, fightView) {
		const opponent = fightView.fightController.getDefendingFighter();
		const candidates = engine.candidatesOf(me);
		const action = candidates[(fightView.fightController.turn * 7 + me.fightActionsHistory.length) % candidates.length];
		this.log.push({ turn: fightView.fightController.turn, at: tape.length, me: cloneFighter(me), opp: cloneFighter(opponent), meState: state(me), oppState: state(opponent), action });
		return action;
	}
}

(async () => {
	const pool = Object.values(world.roster).flat().filter(p => p.cls >= 18 && p.cls <= 24 && p.level >= 100);
	let checked = 0, mismatches = 0, drawMismatch = 0, skipped = 0;
	const examples = [];
	for (const behavior of behaviors) {
		const petId = petOf(behavior);
		let localChecked = 0, localBad = 0;
		for (let s = 0; s < FIGHTS; s++) {
			const pa = pool[(s * 13) % pool.length], pb = pool[(s * 29 + 5) % pool.length];
			const logA = [], logB = [];
			tape = [];
			replaying = false;
			base = makeRng(1000 + s);
			Math.random = recorder;
			// The probe's pet has the tested assistance; the opponent sometimes holds the counter pet (mouse, shark)
			const counter = behavior === PET.ELEPHANT_REMEMBER_LAST_ACTION ? PetConstants.PETS.MOUSE : behavior === PET.FISH_PROTECT_AGAINST_FIRE ? PetConstants.PETS.SHARK : null;
			await world.playFight(pa, pb, {
				attackerBehavior: new Probe(logA), defenderBehavior: new Probe(logB),
				prepare: (a, b) => {
					a.pet = { typeId: petId };
					a.player.petId = 900001;
					world.PETS[900001] = petId;
					// Usually both fighters hold the tested pet (covers its effect on the first turns), sometimes the counter pet
					const oppPet = counter && s % 3 === 0 ? counter : s % 3 === 1 ? petOf(PET.SPIT_FIRE) : petId;
					b.pet = { typeId: oppPet };
					b.player.petId = 900002;
					world.PETS[900002] = oppPet;
				}
			});
			// Model step: own move, opponent half-turn, start of the next own half-turn
			for (let i = 0; i + 1 < logA.length; i++) {
				const d = logA[i], next = logA[i + 1];
				const opponentMove = logB.find(x => x.turn === d.turn + 1);
				if (!opponentMove || next.turn !== d.turn + 2) {
					skipped++;
					continue;
				}
				const a = cloneFighter(d.me), b = cloneFighter(d.opp);
				replaying = true;
				cursor = d.at;
				let t = d.turn;
				engine.execute(a, b, d.action, t);
				t++;
				engine.startHalfTurn(b, a, t);
				if (b.nextFightAction && b.nextFightAction !== opponentMove.action) {
					// Forced follow-up: the real fight did not ask the probe, nothing to compare
				}
				// The real AI fighter draws a display delay before each of its decisions (no effect on the fight)
				if (!b.nextFightAction) {
					cursor++;
				}
				engine.execute(b, a, b.nextFightAction ?? opponentMove.action, t);
				t++;
				engine.startHalfTurn(a, b, t);
				cursor++;
				replaying = false;
				checked++;
				localChecked++;
				const okA = same(state(a), next.meState), okB = same(state(b), next.oppState), okDraws = cursor === next.at;
				if (!okA || !okB || !okDraws) {
					mismatches++;
					localBad++;
					drawMismatch += okDraws ? 0 : 1;
					if (examples.length < 6) {
						examples.push({ behavior, fight: s, turn: d.turn, action: d.action.id, opp: opponentMove.action.id, model: [state(a), state(b)], real: [next.meState, next.oppState], draws: [cursor - d.at, next.at - d.at] });
					}
				}
			}
			Math.random = base;
		}
		console.log(`${behavior}: ${localChecked} steps, ${localBad} mismatches`);
	}
	console.log(`total ${checked} steps, ${mismatches} mismatches (${drawMismatch} with a different number of draws), ${skipped} skipped`);
	for (const e of examples) {
		console.log(JSON.stringify(e));
	}
	process.exit(mismatches === 0 ? 0 : 2);
})().catch(error => {
	// The Core's global handlers would swallow the error and keep the process alive
	console.error(error);
	process.exit(1);
});
