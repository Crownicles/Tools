// Page of the image, drawn with the design tokens and the components of the website (public/css/site.css of Crownicles/Website):
// its banner, its title, its white cards and its figures
import { emojiDataUri } from "./emoji.mjs";
import {
	formatNumber, formatPercent
} from "./format.mjs";

// Design tokens of public/css/site.css, light theme then night theme
const THEMES = {
	light: {
		ink: "#0B0B0C",
		muted: "#6E6E73",
		paper: "#FFFFFF",
		wash: "#F4F4F5",
		line: "#E6E6E8",
		cardShadow: "0 4px 12px rgba(11, 11, 12, 0.06)"
	},
	dark: {
		ink: "#F2F2F3",
		muted: "#A1A1A8",
		paper: "#1C1C20",
		wash: "#101012",
		line: "#2E2E34",
		cardShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
	}
};

export const THEME_NAMES = Object.keys(THEMES);

// Width of the page in CSS pixels (the screenshot multiplies it by its scale) and columns of cards: Discord shows a landscape
// image larger than a portrait one in an embed
export const PAGE_WIDTH = 2200;

const CARD_COLUMNS = 6;

const HTML_ESCAPES = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;"
};

function escapeHtml(text) {
	return text.replace(/[&<>"]/gu, character => HTML_ESCAPES[character]);
}

function emojiImage(emoji) {
	return `<img class="emoji" src="${emojiDataUri(emoji)}" alt="">`;
}

function figure(label, value) {
	return `<div class="figure"><span>${escapeHtml(label)}</span><b>${value}</b></div>`;
}

/**
 * Card of an action: its name, its figures (the breath it costs is always known) and its description
 */
function card(action, {
	texts, labels, language
}) {
	const figures = [
		action.power ? figure(labels.power, escapeHtml(formatNumber(action.power, language))) : "",
		action.accuracy ? figure(labels.accuracy, escapeHtml(formatPercent(action.accuracy, language))) : "",
		action.critical ? figure(labels.critical, escapeHtml(formatPercent(action.critical, language))) : "",
		figure(labels.breath, escapeHtml(formatNumber({
			min: action.breath, max: action.breath
		}, language)))
	].join("");
	return `<article class="card">
		<header class="card__head">
			<span class="card__emblem">${emojiImage(action.emoji)}</span>
			<h2 class="card__name">${escapeHtml(texts.name(action.id))}</h2>
		</header>
		<div class="figures">${figures}</div>
		<p class="card__text">${escapeHtml(texts.description(action.id))}</p>
	</article>`;
}

/**
 * HTML page of the image in a language
 * @param {{ actions: object[], texts: object, labels: object, language: string, version: string, theme: string, assets: object }} params
 */
export function buildPage({
	actions, texts, labels, language, version, theme, assets
}) {
	const colors = THEMES[theme];
	const collator = new Intl.Collator(language);
	const cards = [...actions]
		.sort((a, b) => collator.compare(texts.name(a.id), texts.name(b.id)))
		.map(action => card(action, {
			texts, labels, language
		}))
		.join("\n");

	return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<style>
	@font-face {
		font-family: "Inter Latin";
		font-weight: 100 900;
		src: url(${assets.fontLatin}) format("woff2");
	}

	@font-face {
		font-family: "Inter Latin Extended";
		font-weight: 100 900;
		src: url(${assets.fontLatinExtended}) format("woff2");
	}

	:root {
		--ink: ${colors.ink};
		--muted: ${colors.muted};
		--paper: ${colors.paper};
		--wash: ${colors.wash};
		--line: ${colors.line};
		--radius: 14px;
		--pill: 999px;
		--card-shadow: ${colors.cardShadow};
	}

	* {
		box-sizing: border-box;
	}

	body {
		width: ${PAGE_WIDTH}px;
		margin: 0;
		background: var(--wash);
		color: var(--ink);
		font: 15px/1.5 "Inter Latin", "Inter Latin Extended", sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	.emoji {
		display: inline-block;
		width: 1.15em;
		height: 1.15em;
		flex-shrink: 0;
	}

	.banner {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 240px;
		background:
			linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.2)),
			url(${assets.banner}) center 30% / cover,
			#3a2a3a;
	}

	.banner__wordmark {
		width: 400px;
		margin-bottom: 36px;
	}

	.banner__wave {
		position: absolute;
		left: 0;
		bottom: -1px;
		width: 100%;
		height: 70px;
		fill: var(--wash);
	}

	.intro {
		padding: 16px 0 4px;
		text-align: center;
	}

	.title {
		margin: 0 0 14px;
		font-size: 50px;
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: -0.04em;
	}

	.version {
		display: inline-flex;
		padding: 5px 14px;
		border-radius: var(--pill);
		background: var(--paper);
		box-shadow: var(--card-shadow);
		color: var(--muted);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.cards {
		column-count: ${CARD_COLUMNS};
		column-gap: 16px;
		padding: 24px 40px 8px;
	}

	.card {
		break-inside: avoid;
		margin: 0 0 16px;
		padding: 16px;
		border-radius: var(--radius);
		background: var(--paper);
		box-shadow: var(--card-shadow);
	}

	.card__head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.card__emblem {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--wash);
	}

	.card__emblem .emoji {
		width: 22px;
		height: 22px;
	}

	.card__name {
		margin: 0;
		font-size: 17px;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.02em;
	}

	.figures {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}

	.figure {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.figure span {
		color: var(--muted);
		font-size: 12px;
		font-weight: 500;
	}

	.figure b {
		white-space: nowrap;
		font-size: 16px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.figure:last-child {
		align-items: flex-end;
	}

	/* The breath stays on the right of the cards that have no other figure */
	.figure:only-child {
		margin-left: auto;
	}

	.card__text {
		margin: 12px 0 0;
		color: var(--muted);
		font-size: 13.5px;
		line-height: 1.45;
	}

	.footer {
		padding: 8px 0 32px;
		color: var(--muted);
		font-size: 13px;
		font-weight: 600;
		text-align: center;
	}
</style>
</head>
<body>
	<section class="banner">
		<img class="banner__wordmark" src="${assets.wordmark}" alt="Crownicles">
		<svg class="banner__wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
			<path opacity="0.45" d="M0 58 C 360 18, 760 104, 1440 46 V 120 H 0 Z"/>
			<path d="M0 74 C 420 116, 980 28, 1440 70 V 120 H 0 Z"/>
		</svg>
	</section>
	<section class="intro">
		<h1 class="title">${escapeHtml(labels.title)}</h1>
		<span class="version">Crownicles ${escapeHtml(version)}</span>
	</section>
	<main class="cards">
${cards}
	</main>
	<footer class="footer">crownicles.com</footer>
</body>
</html>`;
}
