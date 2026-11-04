// Search of the v2 engine: closed-loop expectimax over the decider's moves, guided by the v2 network.
// - Root: every playable move is evaluated (no pruning), with successive halving: half of the samples for all moves,
//   the other half only for the better half. Common random numbers: every move meets the same draws.
// - Deeper own decisions: only the `pruneTop` best moves according to the policy head.
// - Opponent: its known behavior when there is one (scripted AI), otherwise the network from its own point of view,
//   playing its best move with probability `opponentArgmax`, else a move drawn from its policy.
// - Leaves: value head. Terminal draws are worth `drawValue(role)` (a king guard gains nothing from a draw).
const { makeRng, cloneFighter, cloneBehavior } = require("./engine");

function drawValueOf(role) {
	return role === "guard" ? 0.1 : 0.5;
}

function makeZSearch(world, engine, featurizer, net, options = {}) {
	const opts = { depth: 2, rootSamples: 16, samples: [16, 3, 2], pruneTop: 3, opponentArgmax: 0.7, seed: 1, ...options };
	const { execute, startHalfTurn, isOver, candidatesOf, view } = engine;
	const MAX_TURNS = world.FightConstants.MAX_TURNS;
	const index = id => featurizer.actionIndex.get(id);

	function terminal(a, b) {
		if (b.isDead() && !a.isDead()) {
			return 1;
		}
		if (a.isDead()) {
			return 0;
		}
		return drawValueOf(a.__role);
	}

	function leaf(a, b, t) {
		return net.value(featurizer.featurize(a, b, t));
	}

	/**
	 * Move of a fighter according to the network: best move with probability p, else drawn from the policy
	 */
	function netMove(me, opponent, t, p) {
		const candidates = candidatesOf(me);
		if (candidates.length === 1) {
			return candidates[0];
		}
		const z = net.logits(featurizer.featurize(me, opponent, t));
		const scores = candidates.map(c => z[index(c.id)] ?? -1e9);
		const max = Math.max(...scores);
		if (Math.random() < p) {
			return candidates[scores.indexOf(max)];
		}
		const w = scores.map(s => Math.exp(s - max));
		let r = Math.random() * w.reduce((s, v) => s + v, 0);
		for (let k = 0; k < w.length; k++) {
			r -= w[k];
			if (r <= 0) {
				return candidates[k];
			}
		}
		return candidates[candidates.length - 1];
	}

	return class ZSearch {
		constructor() {
			this.zsearch = true;
			this.rng = makeRng(opts.seed);
			this.stats = { decisions: 0, iterations: 0, forced: 0 };
			this.predictions = [];
			this.lastRoot = null;
			this.lastValue = null;
		}

		chooseAction(me, fightView) {
			const opponent = fightView.fightController.getDefendingFighter();
			const turn = fightView.fightController.turn;
			const candidates = candidatesOf(me);
			this.stats.decisions++;
			this.lastRoot = null;
			if (candidates.length === 1) {
				this.stats.forced++;
				return candidates[0];
			}
			const outer = Math.random;
			try {
				const seed = Math.floor(this.rng() * 2 ** 31);
				// A known behavior (scripted AI) is replayed exactly; a searching or network opponent is modelled by the network
				const own = opponent.classBehavior?.inner ?? opponent.classBehavior;
				// `knowPolicy`: an opponent playing the policy alone is replayed exactly (a player who has learned the guard)
				const modelled = !opponent.player || !own || own.zsearch || (own.znet && !opts.knowPolicy);
				const policy = modelled ? null : own;
				const root = this.root(me, opponent, policy, turn, candidates, seed);
				this.lastRoot = root.values;
				this.lastValue = root.value;
				if (this.predictions.length === 0) {
					this.predictions.push(root.value);
				}
				return root.action;
			}
			finally {
				Math.random = outer;
			}
		}

		root(me, opponent, policy, turn, candidates, seed) {
			const half = Math.max(1, Math.floor(opts.rootSamples / 2));
			const totals = new Map(candidates.map(c => [c, { sum: 0, n: 0 }]));
			const run = (moves, from, to) => {
				for (const action of moves) {
					const acc = totals.get(action);
					for (let i = from; i < to; i++) {
						Math.random = makeRng(seed + i * 7919);
						acc.sum += this.simulate(cloneFighter(me), cloneFighter(opponent), cloneBehavior(policy), action, turn, opts.depth, seed + i * 104729 + 1);
						acc.n++;
					}
				}
			};
			run(candidates, 0, half);
			const ranked = [...candidates].sort((x, y) => totals.get(y).sum / totals.get(y).n - totals.get(x).sum / totals.get(x).n);
			run(ranked.slice(0, Math.max(2, Math.ceil(candidates.length / 2))), half, 2 * half);
			let best = null, bestValue = -1;
			const values = [];
			for (const action of candidates) {
				const { sum, n } = totals.get(action);
				const value = sum / n;
				values.push({ id: action.id, value, n });
				if (n === 2 * half && value > bestValue) {
					bestValue = value;
					best = action;
				}
			}
			return { action: best, value: bestValue, values };
		}

		/**
		 * Best move value at a deeper own decision, among the best moves of the policy
		 */
		expand(me, opponent, policy, turn, depth, seed) {
			let candidates = candidatesOf(me);
			if (candidates.length > opts.pruneTop) {
				const z = net.logits(featurizer.featurize(me, opponent, turn));
				candidates = [...candidates].sort((x, y) => (z[index(y.id)] ?? -1e9) - (z[index(x.id)] ?? -1e9)).slice(0, opts.pruneTop);
			}
			const k = opts.samples[opts.depth - depth] ?? 1;
			let bestValue = -1;
			for (const action of candidates) {
				let total = 0;
				for (let i = 0; i < k; i++) {
					Math.random = makeRng(seed + i * 7919);
					total += this.simulate(cloneFighter(me), cloneFighter(opponent), cloneBehavior(policy), action, turn, depth, seed + i * 104729 + 1);
				}
				bestValue = Math.max(bestValue, total / k);
			}
			return bestValue;
		}

		simulate(a, b, policy, action, t, depth, seed) {
			this.stats.iterations++;
			for (;;) {
				execute(a, b, action, t);
				if (isOver(a, b, t)) {
					return terminal(a, b);
				}
				t++;
				if (!startHalfTurn(b, a, t)) {
					return terminal(a, b);
				}
				const opponentAction = b.nextFightAction
					?? (policy ? policy.chooseAction(b, view(t, a)) : netMove(b, a, t, opts.opponentArgmax));
				if (opponentAction) {
					execute(b, a, opponentAction, t);
				}
				if (isOver(a, b, t)) {
					return terminal(a, b);
				}
				t++;
				if (!startHalfTurn(a, b, t) || t >= MAX_TURNS) {
					return terminal(a, b);
				}
				if (a.nextFightAction) {
					action = a.nextFightAction;
					continue;
				}
				if (depth <= 1) {
					return leaf(a, b, t);
				}
				return this.expand(a, b, policy, t, depth - 1, seed);
			}
		}
	};
}

/**
 * Behavior playing the network's policy alone (production): best move, or a draw among the near-ties whose logit is
 * within `tieMargin` of the best (unpredictable without giving up strength)
 */
function makeZPolicy(engine, featurizer, net, options = {}) {
	const index = id => featurizer.actionIndex.get(id);
	return class ZPolicy {
		constructor() {
			this.znet = true;
			this.stats = { decisions: 0, iterations: 0 };
		}

		chooseAction(me, fightView) {
			const candidates = engine.candidatesOf(me);
			this.stats.decisions++;
			if (candidates.length === 1) {
				return candidates[0];
			}
			const z = net.logits(featurizer.featurize(me, fightView.fightController.getDefendingFighter(), fightView.fightController.turn));
			const scores = candidates.map(c => z[index(c.id)] ?? -1e9);
			const max = Math.max(...scores);
			const ties = candidates.filter((_, k) => scores[k] >= max - (options.tieMargin ?? 0));
			return ties.length === 1 ? ties[0] : ties[Math.floor(Math.random() * ties.length)];
		}
	};
}

module.exports = { makeZSearch, makeZPolicy, drawValueOf };
