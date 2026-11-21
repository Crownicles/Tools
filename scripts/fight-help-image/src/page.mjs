// Page of the image, drawn with the design tokens and the components of the website (public/css/site.css of Crownicles/Website):
// its banner, its title, its white cards and its figures. One column per class lineage, with the attacks in the order its
// classes unlock them, so a player reads the column of their class
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
		gold: "#C8963C",
		cardShadow: "0 4px 12px rgba(11, 11, 12, 0.06)"
	},
	dark: {
		ink: "#F2F2F3",
		muted: "#A1A1A8",
		paper: "#1C1C20",
		wash: "#101012",
		line: "#2E2E34",
		gold: "#DDAE55",
		cardShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
	}
};

export const THEME_NAMES = Object.keys(THEMES);

// Width of a column of the page in CSS pixels, the screenshot multiplies the page by its scale
const COLUMN_WIDTH = 330;
const COLUMN_GAP = 16;
const PAGE_PADDING = 40;

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
	return `<div class="figure"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
}

/**
 * Width of the page in CSS pixels for a number of columns
 * @param {number} columns
 */
export function getPageWidth(columns) {
	return columns * COLUMN_WIDTH + (columns - 1) * COLUMN_GAP + 2 * PAGE_PADDING;
}

/**
 * Card of an action: its name, the class unlocking it, its figures (the breath it costs is always known) and its description
 */
function card(action, unlockClass, {
	texts, labels, language
}) {
	const figures = [
		action.power ? figure(labels.power, formatNumber(action.power, language)) : "",
		action.accuracy ? figure(labels.accuracy, formatPercent(action.accuracy, language)) : "",
		action.critical ? figure(labels.critical, formatPercent(action.critical, language)) : "",
		figure(labels.breath, formatNumber({
			min: action.breath, max: action.breath
		}, language))
	].join("");
	const unlock = unlockClass
		? `<p class="card__unlock">${emojiImage(unlockClass.emoji)}${escapeHtml(texts.className(unlockClass.id))}</p>`
		: "";
	return `<article class="card">
			<header class="card__head">
				<span class="emblem">${emojiImage(action.emoji)}</span>
				<div>
					<h3 class="card__name">${escapeHtml(texts.actionName(action.id))}</h3>
					${unlock}
				</div>
			</header>
			<div class="figures">${figures}</div>
			<p class="card__text">${escapeHtml(texts.actionDescription(action.id))}</p>
		</article>`;
}

/**
 * Column of a lineage: its last class, the classes leading to it, then its actions. The class unlocking each action is only
 * shown when the actions of the lineage are not all unlocked by the same class
 */
function lineageColumn(lineage, actions, context) {
	const lastClass = lineage.classes.at(-1);
	// Each separator stays with the class before it, so a line never starts with one
	const path = lineage.classes.slice(0, -1)
		.map(lineageClass => `<span>${emojiImage(lineageClass.emoji)}${escapeHtml(context.texts.className(lineageClass.id))}<i>›</i></span>`)
		.join("");
	const showsUnlock = new Set(lineage.actions.map(action => action.unlockClassId)).size > 1;
	const classesById = new Map(lineage.classes.map(lineageClass => [lineageClass.id, lineageClass]));
	const cards = lineage.actions
		.map(action => card(actions.get(action.id), showsUnlock ? classesById.get(action.unlockClassId) : null, context))
		.join("\n");
	return `<section class="lineage">
		<header class="lineage__head">
			<span class="emblem emblem--large">${emojiImage(lastClass.emoji)}</span>
			<div>
				<h2 class="lineage__name">${escapeHtml(context.texts.className(lastClass.id))}</h2>
				${path ? `<p class="lineage__path">${path}</p>` : ""}
			</div>
		</header>
		${cards}
	</section>`;
}

/**
 * HTML page of the image in a language
 * @param {{ actions: Map<string, object>, lineages: object[], texts: object, labels: object, language: string, version: string, theme: string, assets: object }} params
 */
export function buildPage({
	actions, lineages, texts, labels, language, version, theme, assets
}) {
	const colors = THEMES[theme];
	const context = {
		texts, labels, language
	};
	const columns = lineages.map(lineage => lineageColumn(lineage, actions, context)).join("\n");

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
		--gold: ${colors.gold};
		--radius: 14px;
		--pill: 999px;
		--card-shadow: ${colors.cardShadow};
	}

	* {
		box-sizing: border-box;
	}

	body {
		width: ${getPageWidth(lineages.length)}px;
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

	.lineages {
		display: grid;
		grid-template-columns: repeat(${lineages.length}, ${COLUMN_WIDTH}px);
		gap: ${COLUMN_GAP}px;
		align-items: start;
		padding: 28px ${PAGE_PADDING}px 8px;
	}

	.lineage {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.emblem {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--wash);
	}

	.emblem .emoji {
		width: 22px;
		height: 22px;
	}

	.lineage__head {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 88px;
		padding: 0 4px 12px;
		border-bottom: 2px solid var(--gold);
	}

	.emblem--large {
		width: 56px;
		height: 56px;
		background: var(--paper);
		box-shadow: var(--card-shadow);
	}

	.emblem--large .emoji {
		width: 30px;
		height: 30px;
	}

	.lineage__name {
		margin: 0;
		font-size: 22px;
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.03em;
	}

	.lineage__path {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px 6px;
		margin: 6px 0 0;
		color: var(--muted);
		font-size: 12px;
		font-weight: 500;
	}

	.lineage__path span,
	.card__unlock {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.lineage__path i {
		margin-left: 2px;
		font-style: normal;
	}

	.lineage__path span:last-child i {
		display: none;
	}

	.lineage__path .emoji,
	.card__unlock .emoji {
		width: 13px;
		height: 13px;
	}

	.card {
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

	.card__name {
		margin: 0;
		font-size: 17px;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.02em;
	}

	.card__unlock {
		margin: 3px 0 0;
		color: var(--muted);
		font-size: 12px;
		font-weight: 500;
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
		padding: 16px 0 32px;
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
	<main class="lineages">
${columns}
	</main>
	<footer class="footer">crownicles.com</footer>
</body>
</html>`;
}
