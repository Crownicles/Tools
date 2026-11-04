// Synchronous copies of the pet assistances that await a database read in the game code. In the simulator every
// fighter's gear and pet are preloaded, so the same logic runs synchronously: same checks, same random draws in the
// same order. Checked against the real fight controller by syncPetsTest.js.
function makeSyncPets(world) {
	const D = world.D, L = world.L;
	const { PetAssistanceState } = require(`${L}/types/PetAssistanceResult`);
	const { FightStatBuffed } = require(`${L}/types/FightActionResult`);
	const { FightStatModifierOperation } = require(`${L}/types/FightStatModifierOperation`);
	const { RandomUtils } = require(`${L}/utils/RandomUtils`);
	const { FightConstants } = require(`${L}/constants/FightConstants`);
	const { PetConstants } = require(`${L}/constants/PetConstants`);
	const { applyGearRemovalBuffs } = require(`${D}/core/fights/actions/GearStatRemoval`);
	const { FightActionController } = require(`${D}/core/fights/actions/FightActionController`);
	const PET = FightConstants.FIGHT_ACTIONS.PET;
	// The simulator's fighters always hold their gear and their pet: the player checks of the game code always pass
	const gearOf = fighter => fighter.__ao ?? fighter.preloadedActiveObjects;
	const petTypeOf = fighter => fighter.pet?.typeId;

	function removeGear(slot, failure) {
		return (_fighter, opponent, turn) => {
			if (turn > 2) {
				return null;
			}
			const item = gearOf(opponent)?.[slot];
			const damages = item ? item.item.getAttack(item.itemLevel) : 0;
			const defense = item ? item.item.getDefense(item.itemLevel) : 0;
			const speed = item ? item.item.getSpeed(item.itemLevel) : 0;
			const gate = slot === "armor" ? defense : damages;
			if (RandomUtils.crowniclesRandom.bool(failure) || gate === 0) {
				return { assistanceStatus: PetAssistanceState.FAILURE };
			}
			const result = { assistanceStatus: PetAssistanceState.SUCCESS };
			const parts = slot === "armor"
				? [
					{ stat: FightStatBuffed.DEFENSE, total: opponent.getDefense(), gear: defense },
					{ stat: FightStatBuffed.ATTACK, total: opponent.getAttack(), gear: damages },
					{ stat: FightStatBuffed.SPEED, total: opponent.getSpeed(), gear: speed }
				]
				: [
					{ stat: FightStatBuffed.ATTACK, total: opponent.getAttack(), gear: damages },
					{ stat: FightStatBuffed.DEFENSE, total: opponent.getDefense(), gear: defense },
					{ stat: FightStatBuffed.SPEED, total: opponent.getSpeed(), gear: speed }
				];
			applyGearRemovalBuffs(result, opponent, parts);
			return result;
		};
	}

	function elephant(fighter, opponent, turn) {
		if (turn <= 2) {
			return null;
		}
		if (RandomUtils.crowniclesRandom.bool(0.85)) {
			return null;
		}
		if (petTypeOf(opponent) === PetConstants.PETS.MOUSE) {
			return { assistanceStatus: PetAssistanceState.AFRAID };
		}
		const lastAction = fighter.getLastFightActionUsed();
		if (!lastAction || lastAction.breath === 0) {
			return { assistanceStatus: PetAssistanceState.FAILURE };
		}
		const result = { assistanceStatus: PetAssistanceState.SUCCESS };
		FightActionController.applyBuff(result, {
			selfTarget: true,
			stat: FightStatBuffed.BREATH,
			operator: FightStatModifierOperation.ADDITION,
			value: lastAction.breath
		}, fighter, undefined);
		return result;
	}

	function fish(fighter, opponent) {
		if (fighter.alteration?.id !== FightConstants.FIGHT_ACTIONS.ALTERATION.BURNED) {
			return null;
		}
		if (petTypeOf(opponent) === PetConstants.PETS.SHARK) {
			return { assistanceStatus: PetAssistanceState.AFRAID };
		}
		fighter.removeAlteration();
		return { assistanceStatus: PetAssistanceState.SUCCESS };
	}

	return new Map([
		[PET.BREAK_ARMOR, removeGear("armor", 0.15)],
		[PET.STEAL_WEAPON, removeGear("weapon", 0.1)],
		[PET.ELEPHANT_REMEMBER_LAST_ACTION, elephant],
		[PET.FISH_PROTECT_AGAINST_FIRE, fish]
	]);
}

module.exports = { makeSyncPets };
