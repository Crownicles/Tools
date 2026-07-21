export const DEFAULTS = Object.freeze({
	projectId: 378229,
	branch: "develop",
	sampleSize: 25,
	concurrency: 1,
	model: "gemma-4-12b-it",
	modelBaseUrl: "http://127.0.0.1:1234",
	requestTimeoutMs: 300_000,
	apiPageSize: 500,
	crowdinConcurrency: 5,
	maxUsageMatches: 3,
	contextLines: 4,
	maxSnippetCharacters: 2_400
});

export const REVIEW_CATEGORIES = Object.freeze({
	ACCURACY: "accuracy",
	GRAMMAR: "grammar",
	SPELLING: "spelling",
	TONE: "tone",
	TERMINOLOGY: "terminology",
	FORMATTING: "formatting",
	PLACEHOLDER: "placeholder"
});

export const STRING_TYPES = Object.freeze({
	ADVICE: "advice",
	COMMAND_RESPONSE: "command_response",
	ENTITY_NAME: "entity_name",
	ERROR: "error",
	GAME_DATA: "game_data",
	NARRATIVE: "narrative",
	NOTIFICATION: "notification",
	SYSTEM: "system",
	UI_FRAGMENT: "ui_fragment",
	UI_LABEL: "ui_label"
});

export const TARGET_LANGUAGES = Object.freeze({
	de: "German",
	en: "English",
	"es-ES": "Spanish (Spain)",
	it: "Italian",
	"pt-PT": "Portuguese (Portugal)"
});

export const TARGET_LANGUAGE_ALIASES = Object.freeze({
	es: "es-ES",
	pt: "pt-PT"
});

export const PROMPT_VERSION = "2026-07-22-target-translation-v1";
export const ADJUDICATION_VERSION = "2026-07-22-target-skeptical-v1";

export const SOURCE_EXTENSIONS = new Set([
	".cjs",
	".js",
	".json",
	".mjs",
	".ts",
	".tsx"
]);

export const EXCLUDED_DIRECTORIES = new Set([
	".git",
	".proofreading",
	".translation-review",
	"coverage",
	"dist",
	"Lang",
	"node_modules"
]);

export const PLURAL_OR_CONTEXT_SUFFIX = /_(?:zero|one|two|few|many|other|male|female)$/u;
