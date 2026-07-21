import assert from "node:assert/strict";
import test from "node:test";
import {
	buildAdjudicationPrompt,
	buildProofreadingPrompt,
	parseDownstreamDecision,
	parseModelReview
} from "../src/model.mjs";

test("parseModelReview extracts an analysis-first flagged verdict", () => {
	const original = "Utilisez {command:help} suivi de la commande.";
	const raw = `Analyse: le participe doit s'accorder avec commande.
RESULT_JSON: {"flagged":true,"categories":["Grammar","Agreement"],"issue":"Accord incorrect.","suggestedTranslation":"Utilisez {command:help} suivie de la commande.","confidence":1}`;
	const review = parseModelReview(raw, original);
	assert.equal(review.flagged, true);
	assert.deepEqual(review.categories, ["grammar"]);
	assert.equal(review.suggestedTranslation, "Utilisez {command:help} suivie de la commande.");
	assert.equal(review.confidence, "high");
	assert.deepEqual(review.validationErrors, []);
});

test("parseModelReview removes an unsafe suggestion", () => {
	const raw = `Analyse.
RESULT_JSON: {"flagged":true,"categories":["grammar"],"issue":"Faute.","suggestedTranslation":"Valeur {{total}}","confidence":"medium"}`;
	const review = parseModelReview(raw, "Valeur {{count}}");
	assert.equal(review.flagged, true);
	assert.equal(review.suggestedTranslation, null);
	assert.ok(review.categories.includes("placeholder"));
	assert.ok(review.validationErrors.includes("placeholders changed"));
});

test("parseModelReview normalizes a clean verdict", () => {
	const raw = `Analyse: aucun problème.
RESULT_JSON: {"flagged":false,"categories":["grammar"],"issue":"ignored","suggestedTranslation":"ignored","confidence":"high"}`;
	const review = parseModelReview(raw, "Texte correct.");
	assert.deepEqual(review, {
		analysis: "Analyse: aucun problème.",
		flagged: false,
		categories: [],
		issue: null,
		suggestedTranslation: null,
		confidence: "high",
		validationErrors: []
	});
});

test("buildProofreadingPrompt includes context and protected syntax", () => {
	const prompt = buildProofreadingPrompt({
		sourceRecord: {
			id: 42,
			text: "Bonjour {{player}}"
		},
		targetTranslation: {
			text: "Hello {{player}}",
			approved: true,
			provider: null
		},
		targetLanguage: {
			id: "en",
			name: "English"
		},
		deterministicFindings: [],
		context: {
			fullKey: "commands:greeting",
			type: "command_response",
			associatedArea: "greeting",
			crowdinContext: "greeting",
			maxLength: null,
			isIcu: false,
			labelIds: [],
			siblingForms: [],
			placeholdersAndFormatting: {
				placeholders: ["{{player}}"]
			},
			usages: [],
			screenshots: []
		}
	});
	assert.match(prompt, /commands:greeting/u);
	assert.match(prompt, /Bonjour \{\{player\}\}/u);
	assert.match(prompt, /Hello \{\{player\}\}/u);
	assert.match(prompt, /Target translation approved .*: yes/u);
	assert.match(prompt, /Aucun appel direct trouvé/u);
});

test("buildAdjudicationPrompt includes the first verdict for skeptical review", () => {
	const prompt = buildAdjudicationPrompt("Original context", {
		analysis: "Initial analysis",
		flagged: true,
		categories: ["grammar"],
		issue: "Possible issue",
		suggestedTranslation: "Suggestion",
		confidence: "medium"
	});
	assert.match(prompt, /Original context/u);
	assert.match(prompt, /PREMIER VERDICT À VÉRIFIER/u);
	assert.match(prompt, /Possible issue/u);
});

function makeDownstreamTask() {
	return {
		taskId: "task-1",
		input: {
			action: {
				source: {
					text: "Bonjour {{player}}"
				},
				proposal: {
					translation: "Hello {{player}}"
				}
			}
		}
	};
}

test("parseDownstreamDecision validates an accepted candidate", () => {
	const decision = parseDownstreamDecision(
		'Analysis.\nRESULT_JSON: {"taskId":"task-1","decision":"accept_candidate","finalTranslation":"Hello {{player}}","rationale":"Accurate.","confidence":"high"}',
		makeDownstreamTask()
	);
	assert.equal(decision.decision, "accept_candidate");
	assert.equal(decision.finalTranslation, "Hello {{player}}");
});

test("parseDownstreamDecision rejects unsafe protected syntax", () => {
	assert.throws(() => parseDownstreamDecision(
		'Analysis.\nRESULT_JSON: {"taskId":"task-1","decision":"replace_candidate","finalTranslation":"Hello {{username}}","rationale":"Better.","confidence":"high"}',
		makeDownstreamTask()
	), /changed protected syntax/u);
});

test("parseDownstreamDecision requires null translation when rejecting", () => {
	assert.throws(() => parseDownstreamDecision(
		'Analysis.\nRESULT_JSON: {"taskId":"task-1","decision":"reject_issue","finalTranslation":"Hello {{player}}","rationale":"No issue.","confidence":"high"}',
		makeDownstreamTask()
	), /finalTranslation=null/u);
});
