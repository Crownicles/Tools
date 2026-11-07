import assert from "node:assert/strict";
import { test } from "node:test";
import { toTwemojiFileName } from "../src/emoji.mjs";
import {
	formatNumber, formatPercent
} from "../src/format.mjs";
import { LABELS } from "../src/labels.mjs";
import { toRange } from "../src/actions.mjs";

test("Twemoji file names drop the variation selector of a single emoji", () => {
	assert.equal(toTwemojiFileName("⚔️"), "2694");
	assert.equal(toTwemojiFileName("🛡️"), "1f6e1");
	assert.equal(toTwemojiFileName("🧘"), "1f9d8");
});

test("Twemoji file names keep the variation selector of a sequence joined by zero width joiners", () => {
	assert.equal(toTwemojiFileName("🏳️‍🌈"), "1f3f3-fe0f-200d-1f308");
});

test("a range whose ends are written the same way is written as a single value", () => {
	assert.equal(formatPercent({
		min: 90, max: 90
	}, "fr"), "90\u00a0%");
	assert.equal(formatPercent({
		min: 98, max: 98.3
	}, "en"), "98%");
	assert.equal(formatNumber({
		min: 110, max: 110
	}, "en"), "110");
});

test("a range is written the way each language writes it", () => {
	assert.equal(formatPercent({
		min: 80, max: 100
	}, "fr"), "80–100\u00a0%");
	assert.equal(formatPercent({
		min: 80, max: 100
	}, "en"), "80% – 100%");
});

test("ranges are null without any value", () => {
	assert.equal(toRange([]), null);
	assert.deepEqual(toRange([5, 90, 30]), {
		min: 5, max: 90
	});
});

test("every language has every label", () => {
	const keys = Object.keys(LABELS.fr).sort();
	for (const [language, labels] of Object.entries(LABELS)) {
		assert.deepEqual(Object.keys(labels).sort(), keys, language);
		for (const label of Object.values(labels)) {
			assert.ok(label.trim().length > 0, language);
		}
	}
});
