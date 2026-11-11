// Emojis drawn with Twemoji, as Discord and the website draw them
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const TWEMOJI_DIR = path.dirname(require.resolve("@twemoji/svg/package.json"));

const ZERO_WIDTH_JOINER = "\u200D";
const VARIATION_SELECTOR = /\uFE0F/gu;

/**
 * Name of the Twemoji file of an emoji: its code points in hexadecimal, without the variation selector unless the emoji
 * is a sequence joined by zero width joiners (same rule as Twemoji)
 * @param {string} emoji
 */
export function toTwemojiFileName(emoji) {
	const text = emoji.includes(ZERO_WIDTH_JOINER) ? emoji : emoji.replace(VARIATION_SELECTOR, "");
	return [...text].map(character => character.codePointAt(0).toString(16)).join("-");
}

/**
 * Twemoji drawing of an emoji, as a data URI the page can show without any file access
 * @param {string} emoji
 */
export function emojiDataUri(emoji) {
	const file = path.join(TWEMOJI_DIR, `${toTwemojiFileName(emoji)}.svg`);
	return `data:image/svg+xml;base64,${readFileSync(file).toString("base64")}`;
}
