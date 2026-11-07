// Generates the image of the fight help (/help fight) in every language of the game, into a checkout of the website
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { readPlayerActions } from "./actions.mjs";
import { loadWebsiteAssets } from "./assets.mjs";
import { getLabels } from "./labels.mjs";
import {
	buildPage, PAGE_WIDTH, THEME_NAMES
} from "./page.mjs";
import {
	launchBrowser, screenshotPage
} from "./render.mjs";
import {
	getLanguages, loadFightActionTexts
} from "./texts.mjs";
import {
	formatNumber, formatPercent
} from "./format.mjs";

const USAGE = `Usage: node src/cli.mjs --crownicles <checkout> --website <checkout> [--version X.Y.Z] [--languages fr,en] [--theme ${THEME_NAMES.join("|")}] [--scale 1.5]`;

// Folder of the website the images are published in, one sub-folder per language
const OUTPUT_FOLDER = "public/ressources/fighthelp";

function readOptions() {
	const { values } = parseArgs({
		options: {
			crownicles: { type: "string" },
			website: { type: "string" },
			version: { type: "string" },
			languages: { type: "string" },
			theme: {
				type: "string", default: "dark"
			},
			scale: {
				type: "string", default: "1.5"
			}
		}
	});
	if (!values.crownicles || !values.website || !THEME_NAMES.includes(values.theme)) {
		throw new Error(USAGE);
	}
	const crowniclesDir = path.resolve(values.crownicles);
	return {
		crowniclesDir,
		websiteDir: path.resolve(values.website),
		version: values.version ?? JSON.parse(readFileSync(path.join(crowniclesDir, "Core/package.json"), "utf8")).version,
		languages: values.languages?.split(",") ?? getLanguages(crowniclesDir),
		theme: values.theme,
		scale: Number(values.scale)
	};
}

/**
 * Prints the measured figures, to check them before publishing the images
 */
function printActions(actions) {
	const rangeText = (range, format) => (range ? format(range, "en") : "-");
	console.table(Object.fromEntries(actions.map(action => [action.id, {
		power: rangeText(action.power, formatNumber),
		accuracy: rangeText(action.accuracy, formatPercent),
		critical: rangeText(action.critical, formatPercent),
		breath: action.breath
	}])));
}

async function main() {
	const options = readOptions();
	const labelsByLanguage = Object.fromEntries(options.languages.map(language => [language, getLabels(language)]));
	const assets = loadWebsiteAssets(options.websiteDir);
	const actions = readPlayerActions(path.join(options.crowniclesDir, "Core"));
	printActions(actions);

	const browser = await launchBrowser();
	try {
		for (const language of options.languages) {
			const html = buildPage({
				actions,
				texts: loadFightActionTexts(options.crowniclesDir, language),
				labels: labelsByLanguage[language],
				language,
				version: options.version,
				theme: options.theme,
				assets
			});
			const folder = path.join(options.websiteDir, OUTPUT_FOLDER, language);
			mkdirSync(folder, { recursive: true });
			const file = path.join(folder, `${options.version}.png`);
			await screenshotPage(browser, {
				html, file, width: PAGE_WIDTH, scale: options.scale
			});
			console.log(`${language}: ${file}`);
		}
	}
	finally {
		await browser.close();
	}
}

// The compiled Core keeps handles open (logger), the process ends once the images are written
main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error.message ?? error);
		process.exit(1);
	});
