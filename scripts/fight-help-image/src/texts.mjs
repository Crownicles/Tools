// Reads the names and descriptions of the fight actions from the translations of a Crownicles checkout
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Same fallbacks as the bot (Discord/src/translations/i18n.ts)
const FALLBACK_LANGUAGES = ["en", "fr"];

// The image shows the texts as they are: a text still holding an interpolation, a nesting or an emote would be shown raw
const UNRESOLVED_TEXT = /\{\{|\$t\(|\{emote:/u;

/**
 * Languages of the game, one folder per language in Lang/
 * @param {string} crowniclesDir
 */
export function getLanguages(crowniclesDir) {
	const langDir = path.join(crowniclesDir, "Lang");
	return readdirSync(langDir)
		.filter(entry => statSync(path.join(langDir, entry)).isDirectory())
		.sort();
}

/**
 * Translations of the fight actions in a language, with the fallbacks of the bot
 * @param {string} crowniclesDir
 * @param {string} language
 */
export function loadFightActionTexts(crowniclesDir, language) {
	const languages = [language, ...FALLBACK_LANGUAGES.filter(fallback => fallback !== language)];
	const fightActions = languages.map(lng => JSON.parse(readFileSync(path.join(crowniclesDir, "Lang", lng, "models.json"), "utf8")).fight_actions);

	function get(actionId, field) {
		for (const translations of fightActions) {
			const text = translations[actionId]?.[field];
			if (text) {
				if (UNRESOLVED_TEXT.test(text)) {
					throw new Error(`models:fight_actions.${actionId}.${field} (${language}) needs an interpolation the image cannot resolve: ${text}`);
				}
				return text;
			}
		}
		throw new Error(`models:fight_actions.${actionId}.${field} is missing in ${languages.join(", ")}`);
	}

	return {
		name: actionId => get(actionId, "name_one"),
		description: actionId => get(actionId, "description")
	};
}
