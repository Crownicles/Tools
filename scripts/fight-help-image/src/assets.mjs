// Visual identity taken from a checkout of the website (Crownicles/Website), so the image follows the site when it changes
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const WEBSITE_FILES = {
	fontLatin: "public/fonts/inter-latin-wght-normal.woff2",
	fontLatinExtended: "public/fonts/inter-latin-ext-wght-normal.woff2",
	banner: "public/ressources/backgrounds/banner-2400.webp",
	wordmark: "public/ressources/banner-min.webp"
};

const MIME_TYPES = {
	".woff2": "font/woff2",
	".webp": "image/webp"
};

/**
 * Website files used by the image, as data URIs the page can show without any file access
 * @param {string} websiteDir
 * @returns {Record<keyof typeof WEBSITE_FILES, string>}
 */
export function loadWebsiteAssets(websiteDir) {
	return Object.fromEntries(Object.entries(WEBSITE_FILES).map(([name, file]) => {
		const filePath = path.join(websiteDir, file);
		if (!existsSync(filePath)) {
			throw new Error(`${filePath} is missing: --website must be a checkout of Crownicles/Website`);
		}
		return [name, `data:${MIME_TYPES[path.extname(file)]};base64,${readFileSync(filePath).toString("base64")}`];
	}));
}
