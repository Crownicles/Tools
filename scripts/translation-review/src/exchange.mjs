import {
	createHash
} from "node:crypto";

const ACTION_SCHEMA_VERSION = "1.0";
const TASK_SCHEMA_VERSION = "1.0";

function sha256(value) {
	return createHash("sha256").update(value ?? "").digest("hex");
}

function createActionId(entry) {
	return createHash("sha256")
		.update(JSON.stringify({
			sourceStringId: entry.crowdinId,
			sourceRevision: entry.sourceRevision,
			translationId: entry.translationId,
			targetLanguageId: entry.targetLanguage.id,
			sourceHash: sha256(entry.sourceFrench),
			targetHash: sha256(entry.existingTranslation)
		}))
		.digest("hex");
}

function createStateGuard(entry) {
	return {
		sourceRevision: entry.sourceRevision,
		sourceSha256: sha256(entry.sourceFrench),
		translationId: entry.translationId,
		translationSha256: entry.existingTranslation === null
			? null
			: sha256(entry.existingTranslation)
	};
}

export function createTranslationAction(entry, metadata) {
	const actionId = createActionId(entry);
	return {
		schemaVersion: ACTION_SCHEMA_VERSION,
		actionId,
		status: "pending",
		operation: entry.existingTranslation === null
			? "create_translation"
			: "replace_translation",
		project: {
			id: metadata.projectId,
			identifier: metadata.projectIdentifier,
			branch: metadata.branch
		},
		resource: {
			key: entry.key,
			sourceStringId: entry.crowdinId,
			translationId: entry.translationId,
			targetLanguage: entry.targetLanguage,
			crowdinUrl: entry.crowdinUrl
		},
		preconditions: createStateGuard(entry),
		source: {
			languageId: "fr",
			text: entry.sourceFrench
		},
		target: {
			languageId: entry.targetLanguage.id,
			currentText: entry.existingTranslation,
			approved: entry.approved,
			createdAt: entry.targetCreatedAt,
			provider: entry.targetProvider,
			rating: entry.targetRating
		},
		review: {
			type: entry.type,
			categories: entry.categories,
			issue: entry.issue,
			confidence: entry.confidence,
			deterministicFindings: entry.deterministicFindings,
			suggestionValidationErrors: entry.validationErrors
		},
		proposal: {
			translation: entry.suggestedFix,
			readyForGuardedWriteback: entry.suggestedFix !== null && entry.validationErrors.length === 0
		},
		context: entry.context
	};
}

function buildTaskPrompt(action) {
	const candidate = action.proposal.translation === null
		? "No candidate translation was produced."
		: `Candidate translation:\n${action.proposal.translation}`;
	return `Review and finalize this Crownicles translation action.

Canonical French source:
${action.source.text}

Current ${action.resource.targetLanguage.name} translation:
${action.target.currentText ?? "[missing]"}

Detected issue:
${action.review.issue}

${candidate}

Return a final ${action.resource.targetLanguage.name} translation only when the issue is valid. Preserve every placeholder, Crownicles token, tag, URL, Markdown marker, and structural line break from the French source. Crowdin approval is metadata only and is not evidence of quality.`;
}

export function createDownstreamLlmTask(action) {
	return {
		schemaVersion: TASK_SCHEMA_VERSION,
		taskId: action.actionId,
		task: "finalize_translation_review",
		input: {
			action,
			prompt: buildTaskPrompt(action)
		},
		outputSchema: {
			type: "object",
			additionalProperties: false,
			required: [
				"taskId",
				"decision",
				"finalTranslation",
				"rationale",
				"confidence"
			],
			properties: {
				taskId: {
					type: "string",
					const: action.actionId
				},
				decision: {
					type: "string",
					enum: [
						"accept_candidate",
						"replace_candidate",
						"reject_issue"
					]
				},
				finalTranslation: {
					type: [
						"string",
						"null"
					]
				},
				rationale: {
					type: "string"
				},
				confidence: {
					type: "string",
					enum: [
						"high",
						"medium",
						"low"
					]
				}
			}
		}
	};
}

export function createExchangeRecords(report) {
	const actions = report.flagged.map(entry => createTranslationAction(entry, report.metadata));
	return {
		actions,
		llmTasks: actions.map(createDownstreamLlmTask)
	};
}
