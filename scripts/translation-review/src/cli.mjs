#!/usr/bin/env node

import {
	createHash
} from "node:crypto";
import {
	access,
	appendFile,
	mkdir,
	readFile
} from "node:fs/promises";
import {
	dirname,
	join,
	resolve
} from "node:path";
import {
	fileURLToPath
} from "node:url";
import {
	fetchProjectLocalization,
	fetchTargetTranslations
} from "./crowdin.mjs";
import {
	ADJUDICATION_VERSION,
	DEFAULTS,
	PROMPT_VERSION,
	TARGET_LANGUAGE_ALIASES,
	TARGET_LANGUAGES
} from "./constants.mjs";
import {
	buildStringContext,
	buildUsageIndex,
	collectRecordsWithTranslationContext,
	selectRepresentativeSample
} from "./localization.mjs";
import {
	adjudicateWithModel,
	buildProofreadingPrompt,
	parseModelReview,
	reviewWithModel,
	verifyModel
} from "./model.mjs";
import {
	mergeDeterministicFindings,
	runDeterministicQa
} from "./qa.mjs";
import {
	writeReports
} from "./report.mjs";

const TOOL_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_REPOSITORY_ROOT = resolve(TOOL_DIRECTORY, "../..");
const DEFAULT_CROWNICLES_ROOT = resolve(TOOLS_REPOSITORY_ROOT, "../Crownicles");
const STATE_ROOT = join(TOOLS_REPOSITORY_ROOT, ".translation-review");
const REQUIRED_CROWNICLES_PATHS = [
	"Core",
	"Discord",
	join("Lang", "fr")
];

function parsePositiveInteger(value, option) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${option} requires a positive integer`);
	}
	return parsed;
}

function parseArguments(argv) {
	const options = {
		projectId: Number.parseInt(process.env.CROWDIN_PROJECT_ID ?? String(DEFAULTS.projectId), 10),
		branch: DEFAULTS.branch,
		sampleSize: DEFAULTS.sampleSize,
		all: false,
		concurrency: DEFAULTS.concurrency,
		model: process.env.LOCAL_LLM_MODEL ?? DEFAULTS.model,
		baseUrl: (process.env.LOCAL_LLM_BASE_URL ?? DEFAULTS.modelBaseUrl).replace(/\/$/u, ""),
		crowniclesRoot: resolve(process.env.CROWNICLES_REPO_ROOT ?? DEFAULT_CROWNICLES_ROOT),
		outputDirectory: join(STATE_ROOT, "reports"),
		cachePath: join(STATE_ROOT, "reviews.jsonl"),
		failurePath: join(STATE_ROOT, "failures.jsonl"),
		requiredKeys: [],
		targetLanguageId: null,
		dryRun: false
	};
	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index];
		const nextValue = () => {
			const value = argv[++index];
			if (!value) {
				throw new Error(`${argument} requires a value`);
			}
			return value;
		};
		switch (argument) {
			case "--all":
				options.all = true;
				break;
			case "--branch":
				options.branch = nextValue();
				break;
			case "--cache":
				options.cachePath = resolve(nextValue());
				break;
			case "--concurrency":
				options.concurrency = parsePositiveInteger(nextValue(), argument);
				break;
			case "--crownicles-root":
				options.crowniclesRoot = resolve(nextValue());
				break;
			case "--dry-run":
				options.dryRun = true;
				break;
			case "--failure-log":
				options.failurePath = resolve(nextValue());
				break;
			case "--key":
				options.requiredKeys.push(nextValue());
				break;
			case "--language":
				options.targetLanguageId = nextValue();
				break;
			case "--model":
				options.model = nextValue();
				break;
			case "--model-base-url":
				options.baseUrl = nextValue().replace(/\/$/u, "");
				break;
			case "--output-dir":
				options.outputDirectory = resolve(nextValue());
				break;
			case "--project-id":
				options.projectId = parsePositiveInteger(nextValue(), argument);
				break;
			case "--sample":
				options.sampleSize = parsePositiveInteger(nextValue(), argument);
				break;
			default:
				throw new Error(`Unknown option: ${argument}`);
		}
	}
	if (!options.targetLanguageId) {
		throw new Error(`--language is required (${Object.keys(TARGET_LANGUAGES).join(", ")})`);
	}
	options.targetLanguageId = TARGET_LANGUAGE_ALIASES[options.targetLanguageId] ?? options.targetLanguageId;
	const targetLanguageName = TARGET_LANGUAGES[options.targetLanguageId];
	if (!targetLanguageName) {
		throw new Error(`Unsupported target language "${options.targetLanguageId}"`);
	}
	options.targetLanguage = {
		id: options.targetLanguageId,
		name: targetLanguageName
	};
	if (options.outputDirectory === join(STATE_ROOT, "reports")) {
		options.outputDirectory = join(options.outputDirectory, options.targetLanguageId);
	}
	if (options.cachePath === join(STATE_ROOT, "reviews.jsonl")) {
		options.cachePath = join(STATE_ROOT, `reviews-${options.targetLanguageId}.jsonl`);
	}
	if (options.failurePath === join(STATE_ROOT, "failures.jsonl")) {
		options.failurePath = join(STATE_ROOT, `failures-${options.targetLanguageId}.jsonl`);
	}
	return options;
}

async function validateCrowniclesRoot(root) {
	await Promise.all(REQUIRED_CROWNICLES_PATHS.map(path => access(join(root, path))));
}

async function loadCache(path) {
	try {
		const contents = await readFile(path, "utf8");
		const cache = new Map();
		for (const line of contents.split("\n").filter(Boolean)) {
			const record = JSON.parse(line);
			if (record.status === "success") {
				cache.set(record.reviewHash, record);
			}
		}
		return cache;
	}
	catch (error) {
		if (error.code === "ENOENT") {
			return new Map();
		}
		throw error;
	}
}

function createReviewHash({
	record,
	targetTranslation,
	targetLanguage,
	deterministicFindings,
	context,
	model
}) {
	return createHash("sha256")
		.update(JSON.stringify({
			promptVersion: PROMPT_VERSION,
			model,
			crowdinId: record.id,
			revision: record.revision,
			sourceText: record.text,
			targetLanguage,
			targetTranslation,
			deterministicFindings,
			context
		}))
		.digest("hex");
}

async function appendJsonLine(path, value) {
	await mkdir(dirname(path), {
		recursive: true
	});
	await appendFile(path, `${JSON.stringify(value)}\n`, "utf8");
}

async function mapWithConcurrency(values, concurrency, callback) {
	const results = new Array(values.length);
	let nextIndex = 0;
	async function worker() {
		while (nextIndex < values.length) {
			const index = nextIndex++;
			results[index] = await callback(values[index], index);
		}
	}
	await Promise.all(Array.from({
		length: Math.min(concurrency, values.length)
	}, worker));
	return results;
}

function makeReportEntry({
	record,
	targetTranslation,
	targetLanguage,
	context,
	review
}) {
	const crowdinUrl = record.webUrl.replace(
		/\/fr-[^/#]+#/u,
		`/fr-${targetLanguage.id}#`
	);
	return {
		crowdinId: record.id,
		key: context.fullKey,
		sourceRevision: record.revision,
		sourceUpdatedAt: record.updatedAt,
		sourceFrench: record.text,
		targetLanguage,
		existingTranslation: targetTranslation?.text ?? null,
		translationId: targetTranslation?.id ?? null,
		approved: targetTranslation?.approved ?? false,
		targetCreatedAt: targetTranslation?.createdAt ?? null,
		targetProvider: targetTranslation?.provider ?? null,
		targetRating: targetTranslation?.rating ?? null,
		crowdinUrl,
		type: context.type,
		categories: review.categories,
		issue: review.issue,
		suggestedFix: review.suggestedTranslation,
		confidence: review.confidence,
		validationErrors: review.validationErrors,
		deterministicFindings: review.deterministicFindings,
		context: {
			crowdinContext: context.crowdinContext,
			maxLength: context.maxLength,
			associatedArea: context.associatedArea,
			usages: context.usages.map(usage => ({
				path: usage.path,
				line: usage.line,
				keyPattern: usage.keyPattern,
				snippet: usage.snippet
			})),
			screenshots: context.screenshots,
			siblingForms: context.siblingForms,
			protectedSyntax: context.placeholdersAndFormatting,
			maxLength: context.maxLength,
			isIcu: context.isIcu
		}
	};
}

function countBy(values, getKey) {
	const counts = new Map();
	for (const value of values) {
		const key = getKey(value);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function makeCoverageSummary(results) {
	const contexts = results.map(result => result.context);
	return {
		namespaces: countBy(results, result => result.record.namespace),
		types: countBy(contexts, context => context.type),
		edgeCases: {
			icu: contexts.filter(context => context.isIcu).length,
			pluralOrGenderSiblings: contexts.filter(context => context.siblingForms.length > 0).length,
			placeholders: contexts.filter(context => context.placeholdersAndFormatting.placeholderSequence.length > 0).length,
			html: contexts.filter(context => context.placeholdersAndFormatting.htmlTags.length > 0).length,
			markdown: contexts.filter(context => Object.values(context.placeholdersAndFormatting.markdown)
				.some(count => count > 0)).length,
			multiline: contexts.filter(context => context.placeholdersAndFormatting.newlineCount > 0).length
		}
	};
}

async function main() {
	const options = parseArguments(process.argv.slice(2));
	await validateCrowniclesRoot(options.crowniclesRoot);
	const token = process.env.CROWDIN_PERSONAL_TOKEN ?? process.env.CROWDIN_API_TOKEN;
	if (!token) {
		throw new Error("Set CROWDIN_PERSONAL_TOKEN; credentials are never accepted as command-line arguments");
	}
	if (!options.dryRun) {
		await verifyModel(options.baseUrl, options.model, DEFAULTS.requestTimeoutMs);
	}

	console.log(`Fetching read-only Crowdin data for project ${options.projectId}, branch ${options.branch}...`);
	const localization = await fetchProjectLocalization({
		projectId: options.projectId,
		token,
		branchName: options.branch
	});
	if (localization.project.sourceLanguageId !== "fr") {
		throw new Error(`Expected French source language, got ${localization.project.sourceLanguageId}`);
	}
	if (!localization.project.targetLanguageIds.includes(options.targetLanguageId)) {
		throw new Error(
			`Language "${options.targetLanguageId}" is not a target of Crowdin project ${options.projectId}`
		);
	}
	const selectedRecords = options.all
		? localization.strings
		: selectRepresentativeSample(localization.strings, options.sampleSize, options.requiredKeys);
	console.log(
		`Found ${localization.strings.length} strings in ${localization.files.length} JSON files; `
		+ `selected ${selectedRecords.length}${options.all ? " (full run)" : " (representative sample)"}.`
	);

	const recordsByKey = new Map(localization.strings.map(record => [
		`${record.namespace}:${record.identifier}`,
		record
	]));
	const targetFetchRecords = collectRecordsWithTranslationContext(selectedRecords, recordsByKey);
	console.log(
		`Fetching current ${options.targetLanguage.name} proposals and approvals for `
		+ `${targetFetchRecords.length} selected/context strings...`
	);
	const [targetTranslationsById, usageIndex, cache] = await Promise.all([
		fetchTargetTranslations({
			projectId: options.projectId,
			token,
			languageId: options.targetLanguageId,
			records: targetFetchRecords
		}),
		buildUsageIndex(options.crowniclesRoot),
		loadCache(options.cachePath)
	]);
	const startTime = Date.now();
	let cacheHitCount = 0;
	let completedCount = 0;
	let writeChain = Promise.resolve();

	const results = await mapWithConcurrency(
		selectedRecords,
		options.concurrency,
		async (record, index) => {
			const targetResult = targetTranslationsById.get(record.id);
			const context = buildStringContext(record, usageIndex, recordsByKey, targetTranslationsById);
			if (targetResult?.error) {
				const failure = {
					crowdinId: record.id,
					key: context.fullKey,
					targetLanguage: options.targetLanguageId,
					message: targetResult.error,
					failedAt: new Date().toISOString()
				};
				writeChain = writeChain.then(() => appendJsonLine(options.failurePath, failure));
				await writeChain;
				completedCount++;
				console.error(`[${completedCount}/${selectedRecords.length}] FAIL ${context.fullKey}: ${targetResult.error}`);
				return {
					record,
					targetTranslation: null,
					context,
					review: null,
					failed: true
				};
			}
			const targetTranslation = targetResult?.translation ?? null;
			const deterministicFindings = runDeterministicQa({
				sourceText: record.text,
				targetText: targetTranslation?.text ?? null,
				stringType: context.type,
				maxLength: context.maxLength,
				sourceUpdatedAt: record.updatedAt,
				targetCreatedAt: targetTranslation?.createdAt ?? null
			});
			const reviewHash = createReviewHash({
				record,
				targetTranslation,
				targetLanguage: options.targetLanguage,
				deterministicFindings,
				context,
				model: options.model
			});
			const cached = cache.get(reviewHash);
			const cachedReviewNeedsAdjudication = cached?.initialReview?.flagged === true
				&& cached.adjudicationVersion !== ADJUDICATION_VERSION;
			if (cached && !cachedReviewNeedsAdjudication) {
				cacheHitCount++;
				completedCount++;
				console.log(`[${completedCount}/${selectedRecords.length}] cache ${context.fullKey}`);
				return {
					record,
					targetTranslation,
					context,
					review: cached.review,
					failed: false
				};
			}
			if (options.dryRun) {
				completedCount++;
				console.log(`[${completedCount}/${selectedRecords.length}] dry-run ${context.fullKey}`);
				return {
					record,
					targetTranslation,
					context,
					review: null,
					failed: false
				};
			}

			try {
				const prompt = buildProofreadingPrompt({
					sourceRecord: record,
					targetTranslation,
					targetLanguage: options.targetLanguage,
					context,
					deterministicFindings
				});
				let initialReview;
				let initialUsage;
				if (cachedReviewNeedsAdjudication) {
					initialReview = cached.review;
					initialUsage = cached.usage?.initial ?? cached.usage;
				}
				else {
					const modelResult = await reviewWithModel({
						baseUrl: options.baseUrl,
						model: options.model,
						timeoutMs: DEFAULTS.requestTimeoutMs,
						prompt,
						targetLanguage: options.targetLanguage
					});
					initialReview = parseModelReview(modelResult.content, record.text);
					initialUsage = modelResult.usage;
				}

				let review = initialReview;
				let adjudicationUsage = null;
				if (initialReview.flagged) {
					const adjudicationResult = await adjudicateWithModel({
						baseUrl: options.baseUrl,
						model: options.model,
						timeoutMs: DEFAULTS.requestTimeoutMs,
						prompt,
						initialReview,
						targetLanguage: options.targetLanguage
					});
					review = parseModelReview(adjudicationResult.content, record.text);
					adjudicationUsage = adjudicationResult.usage;
				}
				review = mergeDeterministicFindings(review, deterministicFindings);
				const cacheRecord = {
					status: "success",
					reviewHash,
					crowdinId: record.id,
					key: context.fullKey,
					targetLanguage: options.targetLanguage,
					translationId: targetTranslation?.id ?? null,
					promptVersion: PROMPT_VERSION,
					adjudicationVersion: ADJUDICATION_VERSION,
					model: options.model,
					review,
					initialReview,
					usage: {
						initial: initialUsage,
						adjudication: adjudicationUsage
					},
					reviewedAt: new Date().toISOString()
				};
				writeChain = writeChain.then(() => appendJsonLine(options.cachePath, cacheRecord));
				await writeChain;
				completedCount++;
				console.log(
					`[${completedCount}/${selectedRecords.length}] ${review.flagged ? "FLAG" : "ok"} ${context.fullKey}`
				);
				return {
					record,
					targetTranslation,
					context,
					review,
					failed: false
				};
			}
			catch (error) {
				const failure = {
					crowdinId: record.id,
					key: context.fullKey,
					targetLanguage: options.targetLanguageId,
					message: error.message,
					failedAt: new Date().toISOString()
				};
				writeChain = writeChain.then(() => appendJsonLine(options.failurePath, failure));
				await writeChain;
				completedCount++;
				console.error(`[${completedCount}/${selectedRecords.length}] FAIL ${context.fullKey}: ${error.message}`);
				return {
					record,
					targetTranslation,
					context,
					review: null,
					failed: true
				};
			}
		}
	);
	await writeChain;

	const successful = results.filter(result => !result.failed && result.review !== null);
	const flagged = successful
		.filter(result => result.review.flagged)
		.map(result => makeReportEntry({
			...result,
			targetLanguage: options.targetLanguage
		}));
	const elapsedSeconds = options.dryRun
		? null
		: Math.round((Date.now() - startTime) / 1_000);
	const report = {
		metadata: {
			projectId: localization.project.id,
			projectName: localization.project.name,
			projectIdentifier: localization.project.identifier,
			branch: localization.branch.name,
			sourceLanguage: localization.project.sourceLanguageId,
			targetLanguage: options.targetLanguage,
			model: options.model,
			promptVersion: PROMPT_VERSION,
			adjudicationVersion: ADJUDICATION_VERSION,
			availableStringCount: localization.strings.length,
			managedFileCount: localization.files.length,
			screenshotCount: localization.screenshotCount,
			reviewedCount: successful.length,
			flaggedCount: flagged.length,
			failureCount: results.filter(result => result.failed).length,
			cacheHitCount,
			approvedTranslationCount: results.filter(result => result.targetTranslation?.approved).length,
			missingTranslationCount: results.filter(result => !result.failed && result.targetTranslation === null).length,
			elapsedSeconds,
			coverage: makeCoverageSummary(results),
			generatedAt: new Date().toISOString(),
			readOnlyCrowdin: true
		},
		flagged
	};
	const paths = await writeReports(options.outputDirectory, report);
	console.log(`JSON report: ${paths.jsonPath}`);
	console.log(`Markdown report: ${paths.markdownPath}`);
	console.log(`Action queue: ${paths.actionsPath}`);
	console.log(`Downstream LLM tasks: ${paths.llmTasksPath}`);
}

main().catch(error => {
	console.error(error.stack ?? error.message);
	process.exitCode = 1;
});
