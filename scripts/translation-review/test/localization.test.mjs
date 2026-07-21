import assert from "node:assert/strict";
import {
	mkdtemp,
	mkdir,
	rm,
	writeFile
} from "node:fs/promises";
import {
	join
} from "node:path";
import {
	tmpdir
} from "node:os";
import test from "node:test";
import {
	buildUsageIndex,
	collectRecordsWithTranslationContext,
	extractProtectedSyntax,
	findUsages,
	inferStringType,
	selectRepresentativeSample,
	validateSuggestedTranslation
} from "../src/localization.mjs";

test("extractProtectedSyntax preserves nested Crownicles and i18next tokens", () => {
	const syntax = extractProtectedSyntax(
		"{emote:unitValues.attack} **{{value, number}}** $t(models:{{category}}.{{id}})\nhttps://example.test"
	);
	assert.deepEqual(syntax.placeholderSequence, [
		"{emote:unitValues.attack}",
		"{{value, number}}",
		"$t(models:{{category}}.{{id}})",
		"{{category}}",
		"{{id}}"
	]);
	assert.equal(syntax.newlineCount, 1);
	assert.equal(syntax.markdown["**"], 2);
});

test("validateSuggestedTranslation rejects changed placeholders and formatting", () => {
	const original = "**{{count}} objet**\n{emote:rarity.1}";
	assert.deepEqual(validateSuggestedTranslation(original, original), []);
	const errors = validateSuggestedTranslation(original, "{{total}} objets {emote:rarity.2}");
	assert.ok(errors.includes("placeholders changed"));
	assert.ok(errors.includes("newlineCount changed"));
	assert.ok(errors.includes("Markdown marker \"**\" changed"));
});

test("validateSuggestedTranslation allows language-specific placeholder reordering", () => {
	assert.deepEqual(
		validateSuggestedTranslation("{{first}} puis {{second}}", "{{second}} then {{first}}"),
		[]
	);
});

test("usage index resolves exact, ancestor, and dynamic keys", async () => {
	const root = await mkdtemp(join(tmpdir(), "proofreading-context-"));
	try {
		await mkdir(join(root, "src"));
		await writeFile(
			join(root, "src", "sample.ts"),
			[
				"i18n.t(\"error:cooldown\", { lng });",
				"StringUtils.getRandomTranslation(\"smallEvents:intro\", lng);",
				"i18n.t(`models:${model}.${id}`, { lng });"
			].join("\n"),
			"utf8"
		);
		const index = await buildUsageIndex(root);
		assert.equal(findUsages(index, "error:cooldown").length, 1);
		assert.equal(findUsages(index, "smallEvents:intro.4").length, 1);
		assert.equal(findUsages(index, "models:weapons.12").length, 1);
	}
	finally {
		await rm(root, {
			recursive: true,
			force: true
		});
	}
});

test("string types and representative sample cover namespaces and edge syntax", () => {
	assert.equal(inferStringType("error", "cooldown"), "error");
	assert.equal(inferStringType("smallEvents", "intro.0"), "narrative");
	assert.equal(inferStringType("models", "weapons.1"), "entity_name");
	assert.equal(inferStringType("models", "fight_actions.callOfTheSea.name"), "entity_name");
	assert.equal(inferStringType("error", "blockedContext.report"), "ui_fragment");
	assert.equal(inferStringType("commands", "profile.title"), "ui_label");

	const records = [
		{
			id: 1,
			namespace: "error",
			identifier: "message",
			text: "Erreur",
			isIcu: false
		},
		{
			id: 2,
			namespace: "smallEvents",
			identifier: "story_one",
			text: "**{{count}}** histoire",
			isIcu: true
		},
		{
			id: 3,
			namespace: "items",
			identifier: "label",
			text: "<b>Objet</b>",
			isIcu: false
		}
	];
	const sample = selectRepresentativeSample(records, 3);
	assert.deepEqual(new Set(sample.map(record => record.namespace)), new Set([
		"error",
		"smallEvents",
		"items"
	]));
	assert.equal(selectRepresentativeSample(records, 2, ["items:label"])[0].id, 3);
});

test("global syntax matchers remain deterministic across repeated calls", () => {
	const value = "<t:{{timestamp}}:R> **texte**";
	assert.deepEqual(extractProtectedSyntax(value), extractProtectedSyntax(value));
});

test("collectRecordsWithTranslationContext includes related plural and gender keys", () => {
	const records = [
		{
			id: 1,
			namespace: "notifications",
			identifier: "mission_one"
		},
		{
			id: 2,
			namespace: "notifications",
			identifier: "mission_other"
		},
		{
			id: 3,
			namespace: "notifications",
			identifier: "unrelated"
		}
	];
	const recordsByKey = new Map(records.map(record => [
		`${record.namespace}:${record.identifier}`,
		record
	]));
	assert.deepEqual(
		collectRecordsWithTranslationContext([records[0]], recordsByKey).map(record => record.id),
		[
			1,
			2
		]
	);
});
