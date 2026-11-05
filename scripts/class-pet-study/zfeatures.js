// Features v2 of a decision state, from the point of view of the fighter about to decide.
// Adds to the v1 features (state, alterations, histories, classes, stats, races): both pets' assistance and strength,
// the role of the decider (attacker, king guard, PvP defender) and a reserved style one-hot.
// Every vocabulary (actions, alterations, assistances, classes) is listed in `vocab` and stored with the model, so a
// game update that adds an id cannot silently shift the inputs.
const { makeFeaturizer } = require("./features");
const { makeValueFeaturizer } = require("./valueFeatures");

const ROLES = ["attacker", "guard", "pvpDefender"];
const STYLES = ["strategist", "aggressive", "prudent"];

function makeZFeaturizer(world) {
	const { PetConstants } = require(`${world.L}/constants/PetConstants`);
	const { PetDataController } = require(`${world.D}/data/Pet`);
	const { FightUtils } = require(`${world.D}/core/utils/FightUtils`);
	const { FightConstants } = require(`${world.L}/constants/FightConstants`);
	const { FightAlterations } = require(`${world.D}/core/fights/actions/FightAlterations`);
	// Every action that can be in a player's history (the second half of a charged attack included) and every alteration
	// of the game: an id missing from the vocabulary would read as no last action or no alteration
	const CLASSES = [18, 19, 20, 21, 22, 23, 24];
	const actionIds = [...new Set([
		...CLASSES.flatMap(c => world.ClassDataController.instance.getById(c).fightActionsIds),
		...Object.values(FightConstants.FIGHT_ACTIONS.PLAYER),
		FightConstants.FIGHT_ACTIONS.ALTERATION.OUT_OF_BREATH
	])].sort();
	const alterationIdsAll = [...new Set([...Object.values(FightConstants.FIGHT_ACTIONS.ALTERATION), ...Object.values(FightAlterations)])].sort();
	const value = makeValueFeaturizer(world, { actionIds, alterationIds: alterationIdsAll });
	const v1 = makeFeaturizer(world, { actionIds, alterationIds: alterationIdsAll });
	const assistIds = [...new Set(PetConstants.PET_BEHAVIORS.map(m => m.behaviorId))].sort();
	// Second powers of the pets that have one (none on older builds)
	const secondaryIds = [...new Set((PetConstants.PET_SECONDARY_BEHAVIORS ?? []).map(m => m.behaviorId))].sort();
	const secondaryIndex = new Map(secondaryIds.map((id, i) => [id, i]));
	const S = secondaryIds.length;
	const assistIndex = new Map(assistIds.map((id, i) => [id, i]));
	const actionIndex = new Map(v1.actionIds.map((id, i) => [id, i]));
	const V = v1.actionIds.length, P = assistIds.length;
	const size = value.size + V + 2 + 2 * (P + 1) + 4 + 2 * (S + 1) + ROLES.length + STYLES.length;
	const vocab = { actionIds: v1.actionIds, alterationIds: alterationIdsAll, assistIds, secondaryIds, classes: CLASSES, roles: ROLES, styles: STYLES };

	function petInfo(fighter) {
		const typeId = fighter.pet?.typeId;
		if (typeId === undefined || typeId === null) {
			return { assist: P, secondary: S, attack: 0, speed: 0 };
		}
		const [behavior, second] = world.getPetBehaviors(typeId);
		const data = PetDataController.instance.getById(typeId);
		return {
			assist: behavior ? assistIndex.get(behavior.id) ?? P : P,
			secondary: second ? secondaryIndex.get(second.id) ?? S : S,
			attack: data ? FightUtils.calculatePetStatFromForce(data.force, fighter.level) : 0,
			speed: data ? FightUtils.calculatePetStatFromSpeed(data.speed, fighter.level) : 0
		};
	}

	function featurize(me, opponent, turn) {
		const x = new Float32Array(size);
		x.set(value.featurize(me, opponent, turn));
		let o = value.size;
		for (const action of opponent.fightActionsHistory) {
			const i = actionIndex.get(action.id);
			if (i !== undefined) {
				x[o + i] = Math.min(1, x[o + i] + 0.2);
			}
		}
		o += V;
		x[o++] = me.getBreath() / 10;
		x[o++] = Math.min(1, me.fightActionsHistory.length / 20);
		const mine = petInfo(me), theirs = petInfo(opponent);
		x[o + mine.assist] = 1;
		o += P + 1;
		x[o + theirs.assist] = 1;
		o += P + 1;
		// Pet strength relative to what it hits (its attack against the opponent's defense, its speed against the opponent's)
		const lr = (a, b) => Math.log((Math.max(0, a) + 1) / (Math.max(0, b) + 1));
		x[o++] = mine.attack ? lr(mine.attack, opponent.getDefense()) : 0;
		x[o++] = mine.speed ? lr(mine.speed, opponent.getSpeed()) : 0;
		x[o++] = theirs.attack ? lr(theirs.attack, me.getDefense()) : 0;
		x[o++] = theirs.speed ? lr(theirs.speed, me.getSpeed()) : 0;
		x[o + mine.secondary] = 1;
		o += S + 1;
		x[o + theirs.secondary] = 1;
		o += S + 1;
		x[o + Math.max(0, ROLES.indexOf(me.__role ?? "attacker"))] = 1;
		o += ROLES.length;
		x[o + Math.max(0, STYLES.indexOf(me.__style ?? "strategist"))] = 1;
		return x;
	}

	return { featurize, size, vocab, actionIndex, A: V };
}

module.exports = { makeZFeaturizer, ROLES, STYLES };
