// Features of a decision state for the value network, from the point of view of the fighter about to decide.
const { makeFeaturizer } = require("./features");

function makeValueFeaturizer(world, vocab = null) {
	const base = makeFeaturizer(world, vocab);
	const CLASSES = [18, 19, 20, 21, 22, 23, 24];
	const classIndex = new Map(CLASSES.map((c, i) => [c, i]));
	// 15 scalar features, then the one-hot of the deciding fighter's class
	const size = base.size + 15 + CLASSES.length;
	const lr = (x, y) => Math.log((Math.max(0, x) + 1) / (Math.max(0, y) + 1));

	function featurize(me, opponent, turn) {
		const x = new Float32Array(size);
		x.set(base.featurize(me, opponent, turn));
		let o = base.size;
		// Current stat buffs and debuffs compared with the fighter's own base stats
		x[o++] = lr(me.getAttack(), me.stats.attack);
		x[o++] = lr(me.getDefense(), me.stats.defense);
		x[o++] = lr(me.getSpeed(), me.stats.speed);
		x[o++] = lr(opponent.getAttack(), opponent.stats.attack);
		x[o++] = lr(opponent.getDefense(), opponent.stats.defense);
		x[o++] = lr(opponent.getSpeed(), opponent.stats.speed);
		x[o++] = Math.log(me.getDamageMultiplier());
		x[o++] = Math.log(opponent.getDamageMultiplier());
		// Race: remaining energy against the opponent's hitting power
		x[o++] = lr(me.getEnergy(), opponent.getAttack());
		x[o++] = lr(opponent.getEnergy(), me.getAttack());
		x[o++] = me.nextFightAction ? 1 : 0;
		x[o++] = opponent.nextFightAction ? 1 : 0;
		x[o++] = me.getRegenBreath() / 5;
		x[o++] = me.getMaxBreath() / 25;
		x[o++] = opponent.getBreath() / 25;
		const mc = classIndex.get(me.player.class);
		if (mc !== undefined) {
			x[o + mc] = 1;
		}
		return x;
	}
	return { featurize, size };
}

module.exports = { makeValueFeaturizer };
