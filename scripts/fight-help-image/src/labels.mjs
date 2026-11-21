// Words of the image the game translations do not have on their own. They follow the terms the game already uses in each
// language: the breath of commands:fight.actions.fightActionEffects and the critical hits of commands:fight.actions.attacksResults
export const LABELS = {
	fr: {
		title: "Actions de combat",
		power: "Puissance",
		accuracy: "Précision",
		critical: "Critique",
		breath: "Souffle"
	},
	en: {
		title: "Fight actions",
		power: "Power",
		accuracy: "Accuracy",
		critical: "Critical",
		breath: "Breath"
	},
	de: {
		title: "Kampfaktionen",
		power: "Stärke",
		accuracy: "Genauigkeit",
		critical: "Kritisch",
		breath: "Atem"
	},
	es: {
		title: "Acciones de combate",
		power: "Potencia",
		accuracy: "Precisión",
		critical: "Crítico",
		breath: "Aliento"
	},
	it: {
		title: "Azioni di combattimento",
		power: "Potenza",
		accuracy: "Precisione",
		critical: "Critico",
		breath: "Respiro"
	},
	pt: {
		title: "Ações de combate",
		power: "Potência",
		accuracy: "Precisão",
		critical: "Crítico",
		breath: "Respiração"
	}
};

/**
 * Words of the image in a language of the game
 * @param {string} language
 */
export function getLabels(language) {
	const labels = LABELS[language];
	if (!labels) {
		throw new Error(`No label for the language "${language}": add its words to src/labels.mjs`);
	}
	return labels;
}
