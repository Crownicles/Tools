// Reads the names and descriptions of the fight actions and the names of the classes from the translations of a Crownicles checkout
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
 * Translations of the fight actions and of the classes in a language, with the fallbacks of the bot
 * @param {string} crowniclesDir
 * @param {string} language
 */
export function loadTexts(crowniclesDir, language) {
	const languages = [language, ...FALLBACK_LANGUAGES.filter(fallback => fallback !== language)];
	const models = languages.map(lng => JSON.parse(readFileSync(path.join(crowniclesDir, "Lang", lng, "models.json"), "utf8")));

	/**
	 * Text at a path of models.json, in the first language having it
	 * @param {string[]} keys
	 */
	function get(keys) {
		for (const translations of models) {
			const text = keys.reduce((node, key) => node?.[key], translations);
			if (text) {
				if (UNRESOLVED_TEXT.test(text)) {
					throw new Error(`models:${keys.join(".")} (${language}) needs an interpolation the image cannot resolve: ${text}`);
				}
				return text;
			}
		}
		throw new Error(`models:${keys.join(".")} is missing in ${languages.join(", ")}`);
	}

	return {
		actionName: actionId => get(["fight_actions", actionId, "name_one"]),
		actionDescription: actionId => get(["fight_actions", actionId, "description"]),
		className: classId => get(["classes", String(classId)])
	};
}
