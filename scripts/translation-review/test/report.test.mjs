import assert from "node:assert/strict";
import {
	mkdtemp,
	readFile,
	rm
} from "node:fs/promises";
import {
	join
} from "node:path";
import {
	tmpdir
} from "node:os";
import test from "node:test";
import {
	writeReports
} from "../src/report.mjs";

test("reports show French source and selected target translation", async () => {
	const directory = await mkdtemp(join(tmpdir(), "translation-report-"));
	try {
		const report = {
			metadata: {
				projectName: "Crownicles",
				projectId: 378229,
				projectIdentifier: "draftbot",
				branch: "develop",
				sourceLanguage: "fr",
				targetLanguage: {
					id: "de",
					name: "German"
				},
				model: "gemma-4-12b-it",
				availableStringCount: 1,
				reviewedCount: 1,
				flaggedCount: 1,
				approvedTranslationCount: 0,
				missingTranslationCount: 0,
				failureCount: 0,
				cacheHitCount: 0,
				elapsedSeconds: null
			},
			flagged: [
				{
					crowdinId: 1,
					key: "commands:greeting",
					sourceRevision: 3,
					sourceUpdatedAt: null,
					sourceFrench: "Bonjour {{player}}",
					targetLanguage: {
						id: "de",
						name: "German"
					},
					existingTranslation: "Hallo {{player}}",
					translationId: 2,
					approved: false,
					targetCreatedAt: "2026-01-01T00:00:00Z",
					targetProvider: null,
					targetRating: 0,
					crowdinUrl: "https://crowdin.com/editor/draftbot/all/fr-de#1",
					type: "command_response",
					confidence: "high",
					categories: ["accuracy"],
					context: {
						crowdinContext: "greeting"
					},
					issue: "Meaning issue.",
					suggestedFix: "Guten Tag {{player}}",
					deterministicFindings: [],
					validationErrors: []
				}
			]
		};
		const paths = await writeReports(directory, report);
		assert.equal(paths.jsonPath.endsWith("translation-review-report.json"), true);
		const markdown = await readFile(paths.markdownPath, "utf8");
		assert.match(markdown, /Source française canonique/u);
		assert.match(markdown, /Traduction German actuelle/u);
		assert.match(markdown, /Hallo \{\{player\}\}/u);
		const actions = (await readFile(paths.actionsPath, "utf8")).trim().split("\n").map(JSON.parse);
		assert.equal(actions.length, 1);
		assert.equal(actions[0].operation, "replace_translation");
		assert.equal(actions[0].preconditions.sourceRevision, 3);
		const tasks = (await readFile(paths.llmTasksPath, "utf8")).trim().split("\n").map(JSON.parse);
		assert.equal(tasks[0].task, "finalize_translation_review");
		assert.equal(tasks[0].taskId, actions[0].actionId);
	}
	finally {
		await rm(directory, {
			recursive: true,
			force: true
		});
	}
});
