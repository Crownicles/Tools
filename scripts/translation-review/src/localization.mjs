import {
	createHash
} from "node:crypto";
import {
	readdir,
	readFile
} from "node:fs/promises";
import {
	extname,
	join,
	relative
} from "node:path";
import {
	DEFAULTS,
	EXCLUDED_DIRECTORIES,
	PLURAL_OR_CONTEXT_SUFFIX,
	SOURCE_EXTENSIONS,
	STRING_TYPES
} from "./constants.mjs";

const TRANSLATION_CALL_PATTERN = /(?:i18n\.)?(?:t|tArray|tRecord)\(\s*(["'`])([^"'`\r\n]+)\1|(?:getRandomTranslation)\(\s*(["'`])([^"'`\r\n]+)\3/gu;
const PLACEHOLDER_PATTERNS = [
	/\{\{[^{}]+\}\}/gu,
	/\{(?:command|emote):[^{}]+\}/gu,
	/(?<!\{)\{(?!(?:command|emote):)[A-Za-z_][^{}]*\}(?!\})/gu,
	/\{\d+\}/gu,
	/%(?:\d+\$)?[sdif]/gu,
	/\$t\([^()]+\)/gu
];
const URL_PATTERN = /https?:\/\/[^\s)]+/gu;
const HTML_TAG_PATTERN = /<\/?[A-Za-z][^>]*>/gu;
const MARKDOWN_MARKERS = [
	"**",
	"__",
	"~~",
	"`"
];
const UI_KEY_PATTERN = /(?:button|choice|description|field|footer|label|name|option|placeholder|title)/iu;
const ENTITY_ROOT_PATTERN = /^(?:armors|cityNpcNames|classes|fight_actions|foods|guilds|leagues|map_locations|materials|monsters|objects|pets|plants|potions|weapons)(?:\.|$)/u;

function countOccurrences(value, search) {
	let count = 0;
	let index = 0;
	while ((index = value.indexOf(search, index)) !== -1) {
		count++;
		index += search.length;
	}
	return count;
}

function collectMatches(value, pattern) {
	pattern.lastIndex = 0;
	const matches = [...value.matchAll(pattern)].map(match => match[0]);
	pattern.lastIndex = 0;
	return matches;
}

function collectIndexedMatches(value, patterns) {
	const matches = [];
	for (const pattern of patterns) {
		pattern.lastIndex = 0;
		for (const match of value.matchAll(pattern)) {
			matches.push({
				index: match.index,
				value: match[0]
			});
		}
		pattern.lastIndex = 0;
	}
	return matches
		.sort((left, right) => left.index - right.index || right.value.length - left.value.length)
		.map(match => match.value);
}

function hasMatch(value, pattern) {
	pattern.lastIndex = 0;
	const matches = pattern.test(value);
	pattern.lastIndex = 0;
	return matches;
}

function stableSort(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

export function extractProtectedSyntax(value) {
	const placeholders = collectIndexedMatches(value, PLACEHOLDER_PATTERNS);
	return {
		placeholders: stableSort(new Set(placeholders)),
		placeholderSequence: placeholders,
		htmlTags: collectMatches(value, HTML_TAG_PATTERN),
		urls: collectMatches(value, URL_PATTERN),
		markdown: Object.fromEntries(MARKDOWN_MARKERS.map(marker => [
			marker,
			countOccurrences(value, marker)
		])),
		newlineCount: countOccurrences(value, "\n"),
		leadingWhitespace: value.match(/^\s*/u)?.[0] ?? "",
		trailingWhitespace: value.match(/\s*$/u)?.[0] ?? ""
	};
}

export function validateSuggestedTranslation(original, suggestion) {
	const originalSyntax = extractProtectedSyntax(original);
	const suggestionSyntax = extractProtectedSyntax(suggestion);
	const errors = [];
	if (JSON.stringify(stableSort(originalSyntax.placeholderSequence)) !== JSON.stringify(stableSort(suggestionSyntax.placeholderSequence))) {
		errors.push("placeholders changed");
	}
	for (const field of [
		"htmlTags",
		"urls"
	]) {
		if (JSON.stringify(originalSyntax[field]) !== JSON.stringify(suggestionSyntax[field])) {
			errors.push(`${field} changed`);
		}
	}
	for (const marker of MARKDOWN_MARKERS) {
		if (originalSyntax.markdown[marker] !== suggestionSyntax.markdown[marker]) {
			errors.push(`Markdown marker "${marker}" changed`);
		}
	}
	for (const field of [
		"newlineCount",
		"leadingWhitespace",
		"trailingWhitespace"
	]) {
		if (originalSyntax[field] !== suggestionSyntax[field]) {
			errors.push(`${field} changed`);
		}
	}
	return errors;
}

export function inferStringType(namespace, identifier) {
	switch (namespace) {
		case "advices":
			return STRING_TYPES.ADVICE;
		case "error":
			return identifier.startsWith("blockedContext.")
				? STRING_TYPES.UI_FRAGMENT
				: STRING_TYPES.ERROR;
		case "events":
		case "smallEvents":
			return STRING_TYPES.NARRATIVE;
		case "notifications":
			return STRING_TYPES.NOTIFICATION;
		case "discordBuilder":
			return STRING_TYPES.UI_LABEL;
		case "models":
			return ENTITY_ROOT_PATTERN.test(identifier)
				? STRING_TYPES.ENTITY_NAME
				: STRING_TYPES.GAME_DATA;
		case "items":
			return UI_KEY_PATTERN.test(identifier)
				? STRING_TYPES.UI_LABEL
				: STRING_TYPES.GAME_DATA;
		case "commands":
			return UI_KEY_PATTERN.test(identifier)
				? STRING_TYPES.UI_LABEL
				: STRING_TYPES.COMMAND_RESPONSE;
		case "bot":
		case "embeds":
			return STRING_TYPES.SYSTEM;
		default:
			return STRING_TYPES.GAME_DATA;
	}
}

async function walkSourceFiles(directory, repoRoot, files) {
	const entries = await readdir(directory, {
		withFileTypes: true
	});
	for (const entry of entries) {
		if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
			continue;
		}
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			await walkSourceFiles(path, repoRoot, files);
		}
		else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
			files.push({
				path,
				relativePath: relative(repoRoot, path)
			});
		}
	}
}

function makeSnippet(lines, lineNumber) {
	const start = Math.max(0, lineNumber - DEFAULTS.contextLines - 1);
	const end = Math.min(lines.length, lineNumber + DEFAULTS.contextLines);
	return lines.slice(start, end)
		.map((line, index) => `${start + index + 1}: ${line}`)
		.join("\n")
		.slice(0, DEFAULTS.maxSnippetCharacters);
}

function lineNumberAt(contents, offset) {
	return countOccurrences(contents.slice(0, offset), "\n") + 1;
}

function dynamicPatternToRegExp(pattern) {
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
	return new RegExp(`^${escaped.replace(/\\\$\\\{[^}]+\\\}/gu, "[^.]+")}$`, "u");
}

export async function buildUsageIndex(repoRoot) {
	const files = [];
	await walkSourceFiles(repoRoot, repoRoot, files);
	const exact = new Map();
	const dynamic = [];
	for (const file of files) {
		const contents = await readFile(file.path, "utf8");
		const lines = contents.split("\n");
		for (const match of contents.matchAll(TRANSLATION_CALL_PATTERN)) {
			const keyPattern = match[2] ?? match[4];
			const line = lineNumberAt(contents, match.index);
			const usage = {
				path: file.relativePath,
				line,
				keyPattern,
				snippet: makeSnippet(lines, line)
			};
			if (keyPattern.includes("${")) {
				dynamic.push({
					...usage,
					regExp: dynamicPatternToRegExp(keyPattern)
				});
			}
			else {
				if (!exact.has(keyPattern)) {
					exact.set(keyPattern, []);
				}
				exact.get(keyPattern).push(usage);
			}
		}
	}
	return {
		exact,
		dynamic
	};
}

export function findUsages(index, fullKey) {
	const matches = [];
	const seen = new Set();
	const add = usage => {
		const identity = `${usage.path}:${usage.line}`;
		if (!seen.has(identity) && matches.length < DEFAULTS.maxUsageMatches) {
			seen.add(identity);
			matches.push(usage);
		}
	};

	const segments = fullKey.split(".");
	for (let length = segments.length; length > 0; length--) {
		for (const usage of index.exact.get(segments.slice(0, length).join(".")) ?? []) {
			add(usage);
		}
	}
	for (const usage of index.dynamic) {
		if (usage.regExp.test(fullKey)) {
			add(usage);
		}
	}
	return matches;
}

function inferMaxLength(usages, crowdinMaxLength) {
	if (crowdinMaxLength > 0) {
		return crowdinMaxLength;
	}
	for (const usage of usages) {
		const match = usage.snippet.match(/(?:setMaxLength\(\s*|maxLength\s*[:=]\s*)(\d+)/u);
		if (match) {
			return Number.parseInt(match[1], 10);
		}
	}
	return null;
}

export function getSiblingForms(record, recordsByKey, targetTranslationsById = new Map()) {
	const baseIdentifier = record.identifier.replace(PLURAL_OR_CONTEXT_SUFFIX, "");
	if (baseIdentifier === record.identifier) {
		return [];
	}
	const prefix = `${record.namespace}:${baseIdentifier}_`;
	return [...recordsByKey.entries()]
		.filter(([key]) => key.startsWith(prefix) && key !== `${record.namespace}:${record.identifier}`)
		.map(([key, sibling]) => ({
			key,
			sourceText: sibling.text,
			targetText: targetTranslationsById.get(sibling.id)?.translation?.text ?? null
		}))
		.slice(0, 8);
}

export function buildStringContext(record, usageIndex, recordsByKey, targetTranslationsById = new Map()) {
	const fullKey = `${record.namespace}:${record.identifier}`;
	const usages = findUsages(usageIndex, fullKey);
	return {
		fullKey,
		type: inferStringType(record.namespace, record.identifier),
		crowdinContext: record.context || null,
		maxLength: inferMaxLength(usages, record.maxLength),
		isIcu: record.isIcu,
		labelIds: record.labelIds,
		placeholdersAndFormatting: extractProtectedSyntax(record.text),
		siblingForms: getSiblingForms(record, recordsByKey, targetTranslationsById),
		associatedArea: record.identifier.split(".")[0],
		usages,
		screenshots: record.screenshots
	};
}

export function collectRecordsWithTranslationContext(selectedRecords, recordsByKey) {
	const result = new Map(selectedRecords.map(record => [
		record.id,
		record
	]));
	for (const record of selectedRecords) {
		const baseIdentifier = record.identifier.replace(PLURAL_OR_CONTEXT_SUFFIX, "");
		if (baseIdentifier === record.identifier) {
			continue;
		}
		const prefix = `${record.namespace}:${baseIdentifier}_`;
		for (const [key, sibling] of recordsByKey) {
			if (key.startsWith(prefix)) {
				result.set(sibling.id, sibling);
			}
		}
	}
	return [...result.values()];
}

function deterministicRank(record) {
	return createHash("sha256")
		.update(`${record.namespace}:${record.identifier}`)
		.digest("hex");
}

function hasMarkdown(text) {
	return MARKDOWN_MARKERS.some(marker => text.includes(marker));
}

function addFirstMatching(selected, selectedIds, records, predicate) {
	const match = records.find(record => !selectedIds.has(record.id) && predicate(record));
	if (match) {
		selected.push(match);
		selectedIds.add(match.id);
	}
}

export function selectRepresentativeSample(records, size, requiredKeys = []) {
	const candidates = [...records]
		.filter(record => record.text.length <= 1_500)
		.sort((left, right) => deterministicRank(left).localeCompare(deterministicRank(right)));
	const selected = [];
	const selectedIds = new Set();
	const recordsByKey = new Map(candidates.map(record => [
		`${record.namespace}:${record.identifier}`,
		record
	]));
	for (const key of requiredKeys) {
		const record = recordsByKey.get(key);
		if (!record) {
			throw new Error(`Requested sample key "${key}" was not found`);
		}
		if (!selectedIds.has(record.id)) {
			selected.push(record);
			selectedIds.add(record.id);
		}
	}
	const edgePredicates = [
		record => record.isIcu,
		record => PLURAL_OR_CONTEXT_SUFFIX.test(record.identifier),
		record => hasMatch(record.text, HTML_TAG_PATTERN),
		record => hasMarkdown(record.text),
		record => PLACEHOLDER_PATTERNS.some(pattern => hasMatch(record.text, pattern)),
		record => record.text.includes("{command:"),
		record => record.text.includes("{emote:"),
		record => record.text.includes("\n")
	];
	for (const predicate of edgePredicates) {
		addFirstMatching(selected, selectedIds, candidates, predicate);
	}
	for (const namespace of [...new Set(candidates.map(record => record.namespace))].sort()) {
		addFirstMatching(selected, selectedIds, candidates, record => record.namespace === namespace);
	}
	for (const type of Object.values(STRING_TYPES)) {
		addFirstMatching(
			selected,
			selectedIds,
			candidates,
			record => inferStringType(record.namespace, record.identifier) === type
		);
	}
	for (const record of candidates) {
		if (selected.length >= size) {
			break;
		}
		if (!selectedIds.has(record.id)) {
			selected.push(record);
			selectedIds.add(record.id);
		}
	}
	return selected.slice(0, size);
}
