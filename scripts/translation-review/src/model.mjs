import {
	REVIEW_CATEGORIES
} from "./constants.mjs";
import {
	validateSuggestedTranslation
} from "./localization.mjs";

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_000;
const RESULT_MARKER = "RESULT_JSON:";
const CATEGORY_ALIASES = new Map([
	["accuracy", REVIEW_CATEGORIES.ACCURACY],
	["agreement", REVIEW_CATEGORIES.GRAMMAR],
	["conjugation", REVIEW_CATEGORIES.GRAMMAR],
	["format", REVIEW_CATEGORIES.FORMATTING],
	["formatting", REVIEW_CATEGORIES.FORMATTING],
	["grammar", REVIEW_CATEGORIES.GRAMMAR],
	["grammaire", REVIEW_CATEGORIES.GRAMMAR],
	["orthographe", REVIEW_CATEGORIES.SPELLING],
	["placeholder", REVIEW_CATEGORIES.PLACEHOLDER],
	["punctuation", REVIEW_CATEGORIES.GRAMMAR],
	["sens", REVIEW_CATEGORIES.ACCURACY],
	["spelling", REVIEW_CATEGORIES.SPELLING],
	["syntax", REVIEW_CATEGORIES.GRAMMAR],
	["syntaxe", REVIEW_CATEGORIES.GRAMMAR],
	["terminologie", REVIEW_CATEGORIES.TERMINOLOGY],
	["terminology", REVIEW_CATEGORIES.TERMINOLOGY],
	["tone", REVIEW_CATEGORIES.TONE],
	["ton", REVIEW_CATEGORIES.TONE]
]);

function buildSystemPrompt(targetLanguage) {
	return `You are a professional ${targetLanguage.name} game-localization reviewer for Crownicles, a text adventure played through Discord.

The canonical source is French. Review whether the existing ${targetLanguage.name} translation accurately conveys it and reads naturally for ${targetLanguage.name} players. First write a concise analysis covering meaning, omissions/additions, grammar, spelling, terminology, tone, plural/gender agreement, and protected formatting. This analysis is mandatory.

Rules:
- Flag objective translation or language problems, not optional stylistic preferences.
- Never treat the target translation as a source for correcting the French.
- Preserve the source meaning, narrative perspective, formality, and game terminology.
- Crownicles uses narrative/descriptive prose and does not introduce direct dialogue in quotation marks.
- A string may be a fragment inserted into another sentence. Lowercase initials or missing terminal punctuation may therefore be intentional; use its type, sibling forms, and code usage.
- Crowdin approval is workflow metadata only. It is not evidence that a translation is correct, natural, or terminologically authoritative.
- Preserve every placeholder, {command:...}/{emote:...} token, $t(...) call, HTML/Discord tag, Markdown marker, URL, structural line break, and meaningful surrounding whitespace.
- The deterministic checks are evidence, not infallible conclusions; explain whether they represent a real issue.
- A proposed correction must be the complete corrected ${targetLanguage.name} translation, with no commentary.
- Write the issue explanation in English.

End with exactly one line beginning RESULT_JSON: followed by a compact JSON object with these exact fields:
{"flagged":boolean,"categories":("accuracy"|"grammar"|"spelling"|"tone"|"terminology"|"formatting"|"placeholder")[],"issue":string|null,"suggestedTranslation":string|null,"confidence":"high"|"medium"|"low"}

If there is no concrete issue: flagged=false, categories=[], issue=null, suggestedTranslation=null.`;
}

function buildAdjudicationSystemPrompt(targetLanguage) {
	return `You are the senior final reviewer of a French-to-${targetLanguage.name} game localization. A first reviewer flagged a problem, but it may be a false positive.

Actively challenge the first verdict:
- distinguish an objective error from a stylistic preference;
- compare the ${targetLanguage.name} translation directly with the canonical French source;
- verify alleged omissions, additions, mistranslations, grammar, terminology, and placeholder problems precisely;
- lowercase or missing punctuation may be correct for a fragment inserted into a sentence or list;
- use the inferred type, sibling forms, code usage, and deterministic checks;
- treat Crowdin approval as metadata only, never as evidence of translation quality;
- preserve all protected formatting and tokens.

First write a concise justification. End with one RESULT_JSON: line followed by:
{"flagged":boolean,"categories":("accuracy"|"grammar"|"spelling"|"tone"|"terminology"|"formatting"|"placeholder")[],"issue":string|null,"suggestedTranslation":string|null,"confidence":"high"|"medium"|"low"}

Return flagged=false when the first report is not objectively justified. Write any issue in English and any correction in ${targetLanguage.name}.`;
}

function delay(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function formatNullable(value) {
	return value === null || value === undefined || value === ""
		? "aucune"
		: String(value);
}

function formatUsages(usages) {
	if (usages.length === 0) {
		return "Aucun appel direct trouvé; la clé peut être résolue dynamiquement ou chargée comme collection.";
	}
	return usages.map(usage => `${usage.path}:${usage.line}\n${usage.snippet}`).join("\n\n");
}

export function buildProofreadingPrompt({
	sourceRecord,
	targetTranslation,
	targetLanguage,
	context,
	deterministicFindings
}) {
	return `Clé: ${context.fullKey}
Crowdin source string ID: ${sourceRecord.id}
Target language: ${targetLanguage.name} (${targetLanguage.id})
Inferred string type: ${context.type}
Associated feature: ${context.associatedArea}
Native Crowdin context: ${formatNullable(context.crowdinContext)}
Maximum length: ${formatNullable(context.maxLength)}
Crowdin ICU: ${context.isIcu ? "yes" : "no"}
Crowdin labels: ${context.labelIds.length === 0 ? "none" : context.labelIds.join(", ")}
Target translation approved (workflow metadata only, not a quality signal): ${targetTranslation?.approved ? "yes" : "no"}
Target translation provider: ${formatNullable(targetTranslation?.provider)}

Canonical French source:
<<<FR
${sourceRecord.text}
FR

Existing ${targetLanguage.name} translation:
<<<TARGET
${formatNullable(targetTranslation?.text)}
TARGET

Sibling plural/gender forms:
${context.siblingForms.length === 0 ? "none" : JSON.stringify(context.siblingForms, null, 2)}

Protected source syntax:
${JSON.stringify(context.placeholdersAndFormatting, null, 2)}

Deterministic QA findings:
${deterministicFindings.length === 0 ? "none" : JSON.stringify(deterministicFindings, null, 2)}

Code usages:
${formatUsages(context.usages)}

Crowdin screenshots:
${context.screenshots.length === 0 ? "none" : JSON.stringify(context.screenshots, null, 2)}`;
}

function extractJsonObject(value) {
	const markerIndex = value.lastIndexOf(RESULT_MARKER);
	if (markerIndex === -1) {
		throw new Error(`Model response does not contain ${RESULT_MARKER}`);
	}
	const start = value.indexOf("{", markerIndex + RESULT_MARKER.length);
	if (start === -1) {
		throw new Error("Model result marker is not followed by a JSON object");
	}

	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < value.length; index++) {
		const character = value[index];
		if (inString) {
			if (escaped) {
				escaped = false;
			}
			else if (character === "\\") {
				escaped = true;
			}
			else if (character === "\"") {
				inString = false;
			}
			continue;
		}
		if (character === "\"") {
			inString = true;
		}
		else if (character === "{") {
			depth++;
		}
		else if (character === "}") {
			depth--;
			if (depth === 0) {
				return value.slice(start, index + 1);
			}
		}
	}
	throw new Error("Model result contains an unterminated JSON object");
}

function normalizeConfidence(value) {
	if (typeof value === "number") {
		if (value >= 0.8) {
			return "high";
		}
		if (value >= 0.5) {
			return "medium";
		}
		return "low";
	}
	const normalized = String(value).toLowerCase();
	return [
		"high",
		"medium",
		"low"
	].includes(normalized)
		? normalized
		: "low";
}

function normalizeCategories(values) {
	const result = new Set();
	for (const value of Array.isArray(values) ? values : []) {
		const normalized = CATEGORY_ALIASES.get(String(value).toLowerCase());
		if (normalized) {
			result.add(normalized);
		}
	}
	return [...result];
}

export function parseModelReview(rawContent, originalText) {
	const parsed = JSON.parse(extractJsonObject(rawContent));
	if (typeof parsed.flagged !== "boolean") {
		throw new Error("Model result field flagged must be a boolean");
	}
	const flagged = parsed.flagged === true;
	const analysis = rawContent.slice(0, rawContent.lastIndexOf(RESULT_MARKER)).trim();
	if (!flagged) {
		return {
			analysis,
			flagged: false,
			categories: [],
			issue: null,
			suggestedTranslation: null,
			confidence: normalizeConfidence(parsed.confidence),
			validationErrors: []
		};
	}
	if (typeof parsed.issue !== "string" || parsed.issue.trim() === "") {
		throw new Error("Flagged model result does not contain a non-empty issue");
	}

	const suggestion = typeof parsed.suggestedTranslation === "string"
		? parsed.suggestedTranslation
		: null;
	const validationErrors = suggestion
		? validateSuggestedTranslation(originalText, suggestion)
		: [];
	const categories = normalizeCategories(parsed.categories);
	if (validationErrors.some(error => error.startsWith("placeholder") || error.startsWith("url"))) {
		categories.push(REVIEW_CATEGORIES.PLACEHOLDER);
	}
	if (validationErrors.some(error => !error.startsWith("placeholder") && !error.startsWith("url"))) {
		categories.push(REVIEW_CATEGORIES.FORMATTING);
	}

	return {
		analysis,
		flagged: true,
		categories: [...new Set(categories)],
		issue: parsed.issue.trim(),
		suggestedTranslation: validationErrors.length === 0 ? suggestion : null,
		confidence: normalizeConfidence(parsed.confidence),
		validationErrors
	};
}

export async function verifyModel(baseUrl, model, timeoutMs) {
	const response = await fetch(`${baseUrl}/v1/models`, {
		signal: AbortSignal.timeout(timeoutMs)
	});
	if (!response.ok) {
		throw new Error(`Local model server returned ${response.status} ${response.statusText}`);
	}
	const body = await response.json();
	if (!body.data?.some(candidate => candidate.id === model)) {
		throw new Error(`Local model "${model}" is not available at ${baseUrl}`);
	}
}

export async function reviewWithModel({
	baseUrl,
	model,
	timeoutMs,
	prompt,
	targetLanguage
}) {
	return requestModelCompletion({
		baseUrl,
		model,
		timeoutMs,
		systemPrompt: buildSystemPrompt(targetLanguage),
		userPrompt: prompt
	});
}

export function buildAdjudicationPrompt(prompt, initialReview) {
	return `${prompt}

PREMIER VERDICT À VÉRIFIER:
${JSON.stringify({
	analysis: initialReview.analysis,
	flagged: initialReview.flagged,
	categories: initialReview.categories,
	issue: initialReview.issue,
	suggestedTranslation: initialReview.suggestedTranslation,
	confidence: initialReview.confidence
}, null, 2)}`;
}

export async function adjudicateWithModel({
	baseUrl,
	model,
	timeoutMs,
	prompt,
	initialReview,
	targetLanguage
}) {
	return requestModelCompletion({
		baseUrl,
		model,
		timeoutMs,
		systemPrompt: buildAdjudicationSystemPrompt(targetLanguage),
		userPrompt: buildAdjudicationPrompt(prompt, initialReview)
	});
}

export function parseDownstreamDecision(rawContent, task) {
	const parsed = JSON.parse(extractJsonObject(rawContent));
	const decisions = new Set([
		"accept_candidate",
		"replace_candidate",
		"reject_issue"
	]);
	if (parsed.taskId !== task.taskId) {
		throw new Error(`Downstream result taskId "${parsed.taskId}" does not match "${task.taskId}"`);
	}
	if (!decisions.has(parsed.decision)) {
		throw new Error(`Unknown downstream decision "${parsed.decision}"`);
	}
	if (![
		"high",
		"medium",
		"low"
	].includes(parsed.confidence)) {
		throw new Error(`Unknown downstream confidence "${parsed.confidence}"`);
	}
	if (typeof parsed.rationale !== "string" || parsed.rationale.trim() === "") {
		throw new Error("Downstream result must contain a rationale");
	}

	const action = task.input.action;
	if (parsed.decision === "reject_issue") {
		if (parsed.finalTranslation !== null) {
			throw new Error("A rejected issue must have finalTranslation=null");
		}
	}
	else {
		if (typeof parsed.finalTranslation !== "string" || parsed.finalTranslation === "") {
			throw new Error("An accepted or replaced candidate must contain a final translation");
		}
		const validationErrors = validateSuggestedTranslation(action.source.text, parsed.finalTranslation);
		if (validationErrors.length > 0) {
			throw new Error(`Downstream translation changed protected syntax: ${validationErrors.join("; ")}`);
		}
		if (
			parsed.decision === "accept_candidate"
			&& parsed.finalTranslation !== action.proposal.translation
		) {
			throw new Error("accept_candidate must return the existing candidate unchanged");
		}
	}
	return {
		taskId: parsed.taskId,
		decision: parsed.decision,
		finalTranslation: parsed.finalTranslation,
		rationale: parsed.rationale.trim(),
		confidence: parsed.confidence
	};
}

export async function finalizeTaskWithModel({
	baseUrl,
	model,
	timeoutMs,
	task
}) {
	const result = await requestModelCompletion({
		baseUrl,
		model,
		timeoutMs,
		systemPrompt: `You are the final translation decision stage for Crownicles.

Follow the supplied task and output schema exactly. Independently decide whether the reported issue is valid. Preserve all protected syntax from the canonical French source. Crowdin approval is not a quality signal.

End with one RESULT_JSON: line containing only the output object described by the task schema.`,
		userPrompt: `${task.input.prompt}

Required output schema:
${JSON.stringify(task.outputSchema, null, 2)}`
	});
	return {
		decision: parseDownstreamDecision(result.content, task),
		usage: result.usage
	};
}

async function requestModelCompletion({
	baseUrl,
	model,
	timeoutMs,
	systemPrompt,
	userPrompt
}) {
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(`${baseUrl}/v1/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					model,
					temperature: 0,
					max_tokens: 1_100,
					messages: [
						{
							role: "system",
							content: systemPrompt
						},
						{
							role: "user",
							content: userPrompt
						}
					]
				}),
				signal: AbortSignal.timeout(timeoutMs)
			});
			if (!response.ok) {
				throw new Error(`Local model returned ${response.status} ${response.statusText}`);
			}
			const body = await response.json();
			const content = body.choices?.[0]?.message?.content;
			if (typeof content !== "string") {
				throw new Error("Local model response does not contain message content");
			}
			return {
				content,
				usage: body.usage ?? null
			};
		}
		catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) {
				await delay(RETRY_DELAY_MS);
			}
		}
	}
	throw lastError;
}
