// State encoding shared by the learned policies: the same vocabulary and layout in every process of a build.
function makeFeaturizer(world) {
	const { FightConstants, ClassDataController } = world;
	const CLASSES = [18, 19, 20, 21, 22, 23, 24];
	const actionIds = [...new Set(CLASSES.flatMap(c => ClassDataController.instance.getById(c).fightActionsIds)
		.concat([FightConstants.FIGHT_ACTIONS.PLAYER.NONE, FightConstants.FIGHT_ACTIONS.ALTERATION.OUT_OF_BREATH]))].sort();
	const alterationIds = [...new Set(Object.values(FightConstants.FIGHT_ACTIONS.ALTERATION))].sort();
	const actionIndex = new Map(actionIds.map((id, i) => [id, i]));
	const alterationIndex = new Map(alterationIds.map((id, i) => [id, i]));
	const classIndex = new Map(CLASSES.map((c, i) => [c, i]));
	const V = actionIds.length, A = alterationIds.length;
	const BASE = 11;
	const size = BASE + 2 * A + 3 * V + CLASSES.length + 1;
	const godMoves = new Set(FightConstants.GOD_MOVES);
	const ratio = (x, y) => Math.log(Math.max(1, x) / Math.max(1, y));

	function featurize(me, opponent, turn) {
		const x = new Float64Array(size);
		x[0] = 1;
		const myE = me.getEnergy() / me.getMaxEnergy(), opE = opponent.getEnergy() / opponent.getMaxEnergy();
		x[1] = myE;
		x[2] = opE;
		x[3] = myE - opE;
		x[4] = me.getBreath() / me.getMaxBreath();
		x[5] = me.getBreath() / 16;
		x[6] = opponent.getBreath() / opponent.getMaxBreath();
		x[7] = turn / FightConstants.MAX_TURNS;
		x[8] = ratio(me.getSpeed(), opponent.getSpeed());
		x[9] = ratio(me.getAttack(), opponent.getDefense());
		x[10] = ratio(opponent.getAttack(), me.getDefense());
		let o = BASE;
		const myAlt = me.alteration ? alterationIndex.get(me.alteration.id) : undefined;
		if (myAlt !== undefined) {
			x[o + myAlt] = 1;
		}
		o += A;
		const opAlt = opponent.alteration ? alterationIndex.get(opponent.alteration.id) : undefined;
		if (opAlt !== undefined) {
			x[o + opAlt] = 1;
		}
		o += A;
		const myLast = me.fightActionsHistory.length ? actionIndex.get(me.fightActionsHistory[me.fightActionsHistory.length - 1].id) : undefined;
		if (myLast !== undefined) {
			x[o + myLast] = 1;
		}
		o += V;
		const opLast = opponent.fightActionsHistory.length ? actionIndex.get(opponent.fightActionsHistory[opponent.fightActionsHistory.length - 1].id) : undefined;
		if (opLast !== undefined) {
			x[o + opLast] = 1;
		}
		o += V;
		let gods = 0;
		for (const action of me.fightActionsHistory) {
			const i = actionIndex.get(action.id);
			if (i !== undefined) {
				x[o + i] = Math.min(1, x[o + i] + 0.2);
			}
			gods += godMoves.has(action.id) ? 1 : 0;
		}
		for (const action of opponent.fightActionsHistory) {
			gods += godMoves.has(action.id) ? 1 : 0;
		}
		o += V;
		const oc = classIndex.get(opponent.player.class);
		if (oc !== undefined) {
			x[o + oc] = 1;
		}
		o += CLASSES.length;
		x[o] = gods / 2;
		return x;
	}

	return { featurize, size, actionIds };
}

module.exports = { makeFeaturizer };
