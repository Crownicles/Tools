import assert from "node:assert/strict";
import test from "node:test";
import {
	selectCurrentTranslation
} from "../src/crowdin.mjs";

const proposals = [
	{
		id: 10,
		text: "Older",
		createdAt: "2026-01-01T00:00:00Z"
	},
	{
		id: 20,
		text: "Newer",
		createdAt: "2026-02-01T00:00:00Z"
	}
];

test("selectCurrentTranslation prefers the approved proposal", () => {
	assert.deepEqual(selectCurrentTranslation(proposals, {
		id: 99,
		translationId: 10,
		createdAt: "2026-03-01T00:00:00Z"
	}), {
		...proposals[0],
		approved: true,
		approvalId: 99,
		approvedAt: "2026-03-01T00:00:00Z"
	});
});

test("selectCurrentTranslation uses the newest proposal when ratings tie", () => {
	assert.deepEqual(selectCurrentTranslation(proposals), {
		...proposals[1],
		approved: false,
		approvalId: null,
		approvedAt: null
	});
	assert.equal(selectCurrentTranslation([]), null);
});

test("selectCurrentTranslation prefers rating before recency when unapproved", () => {
	assert.equal(selectCurrentTranslation([
		{
			id: 1,
			text: "Higher rated",
			rating: 2,
			createdAt: "2026-01-01T00:00:00Z"
		},
		{
			id: 2,
			text: "Newer",
			rating: 0,
			createdAt: "2026-02-01T00:00:00Z"
		}
	]).id, 1);
});

test("selectCurrentTranslation rejects an approval for an absent proposal", () => {
	assert.throws(() => selectCurrentTranslation(proposals, {
		id: 99,
		translationId: 999,
		createdAt: "2026-03-01T00:00:00Z"
	}), /references missing translation/u);
});
