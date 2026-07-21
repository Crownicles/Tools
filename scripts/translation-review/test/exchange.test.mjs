import assert from "node:assert/strict";
import test from "node:test";
import {
	createDownstreamLlmTask,
	createTranslationAction
} from "../src/exchange.mjs";

const metadata = {
	projectId: 378229,
	projectIdentifier: "draftbot",
	branch: "develop"
};

function makeEntry(overrides = {}) {
	return {
		crowdinId: 42,
		key: "commands:greeting",
		sourceRevision: 7,
		sourceFrench: "Bonjour {{player}}",
		targetLanguage: {
			id: "en",
			name: "English"
		},
		existingTranslation: "Hello {{player}}",
		translationId: 99,
		approved: true,
		targetCreatedAt: "2026-01-01T00:00:00Z",
		targetProvider: null,
		targetRating: 0,
		crowdinUrl: "https://crowdin.com/editor/draftbot/all/fr-en#42",
		type: "command_response",
		categories: ["accuracy"],
		issue: "The greeting is too informal.",
		confidence: "high",
		deterministicFindings: [],
		validationErrors: [],
		suggestedFix: "Good day {{player}}",
		context: {
			crowdinContext: "greeting"
		},
		...overrides
	};
}

test("translation action contains guarded writeback state", () => {
	const action = createTranslationAction(makeEntry(), metadata);
	assert.equal(action.operation, "replace_translation");
	assert.equal(action.status, "pending");
	assert.equal(action.preconditions.sourceRevision, 7);
	assert.match(action.preconditions.sourceSha256, /^[a-f0-9]{64}$/u);
	assert.match(action.preconditions.translationSha256, /^[a-f0-9]{64}$/u);
	assert.equal(action.proposal.readyForGuardedWriteback, true);
});

test("missing target becomes a create action", () => {
	const action = createTranslationAction(makeEntry({
		existingTranslation: null,
		translationId: null,
		suggestedFix: null
	}), metadata);
	assert.equal(action.operation, "create_translation");
	assert.equal(action.preconditions.translationSha256, null);
	assert.equal(action.proposal.readyForGuardedWriteback, false);
});

test("downstream task embeds action and explicit output schema", () => {
	const action = createTranslationAction(makeEntry(), metadata);
	const task = createDownstreamLlmTask(action);
	assert.equal(task.taskId, action.actionId);
	assert.match(task.input.prompt, /Canonical French source/u);
	assert.deepEqual(task.outputSchema.properties.decision.enum, [
		"accept_candidate",
		"replace_candidate",
		"reject_issue"
	]);
});
