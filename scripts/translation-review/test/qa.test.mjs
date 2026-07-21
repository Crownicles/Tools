import assert from "node:assert/strict";
import test from "node:test";
import {
	mergeDeterministicFindings,
	runDeterministicQa
} from "../src/qa.mjs";

test("deterministic QA catches protected syntax changes", () => {
	const findings = runDeterministicQa({
		sourceText: "**Bonjour {{player}}**\n<t:{{date}}:R>",
		targetText: "Hello {{username}} <t:{{date}}:D>",
		stringType: "command_response",
		maxLength: null
	});
	assert.deepEqual(new Set(findings.map(finding => finding.code)), new Set([
		"placeholder_mismatch",
		"tag_mismatch",
		"markdown_mismatch",
		"newline_mismatch"
	]));
});

test("deterministic QA allows placeholder reordering", () => {
	assert.deepEqual(runDeterministicQa({
		sourceText: "{{first}} puis {{second}}",
		targetText: "{{second}} then {{first}}",
		stringType: "command_response",
		maxLength: null
	}), []);
});

test("deterministic QA catches missing and likely untranslated targets", () => {
	assert.equal(runDeterministicQa({
		sourceText: "Une phrase française complète",
		targetText: null,
		stringType: "narrative",
		maxLength: null
	})[0].code, "missing_translation");
	assert.equal(runDeterministicQa({
		sourceText: "Une phrase française complète",
		targetText: "Une phrase française complète",
		stringType: "narrative",
		maxLength: null
	}).some(finding => finding.code === "unchanged_source"), true);
});

test("deterministic QA warns when the French source is newer", () => {
	const findings = runDeterministicQa({
		sourceText: "Texte français",
		targetText: "Target text",
		stringType: "narrative",
		maxLength: null,
		sourceUpdatedAt: "2026-02-01T00:00:00Z",
		targetCreatedAt: "2026-01-01T00:00:00Z"
	});
	assert.equal(findings.some(finding => finding.code === "source_newer_than_translation"), true);
});

test("mergeDeterministicFindings cannot silently lose hard QA findings", () => {
	const review = mergeDeterministicFindings({
		analysis: "No model issue.",
		flagged: false,
		categories: [],
		issue: null,
		suggestedTranslation: null,
		confidence: "high",
		validationErrors: []
	}, [
		{
			code: "placeholder_mismatch",
			category: "placeholder",
			issue: "A placeholder is missing.",
			severity: "error"
		}
	]);
	assert.equal(review.flagged, true);
	assert.deepEqual(review.categories, ["placeholder"]);
	assert.match(review.issue, /placeholder is missing/u);
});

test("warning heuristics require model confirmation", () => {
	const review = mergeDeterministicFindings({
		analysis: "The short translation is valid.",
		flagged: false,
		categories: [],
		issue: null,
		suggestedTranslation: null,
		confidence: "high",
		validationErrors: []
	}, [
		{
			code: "suspicious_length",
			category: "accuracy",
			issue: "The length ratio is unusual.",
			severity: "warning"
		}
	]);
	assert.equal(review.flagged, false);
	assert.equal(review.deterministicFindings.length, 1);
});
