import {
	REVIEW_CATEGORIES,
	STRING_TYPES
} from "./constants.mjs";
import {
	extractProtectedSyntax
} from "./localization.mjs";

const MIN_LENGTH_FOR_RATIO_CHECK = 20;
const MIN_UNCHANGED_LENGTH = 12;
const MIN_LENGTH_RATIO = 0.35;
const MAX_LENGTH_RATIO = 2.5;

function areEqual(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function plainLength(value) {
	return value.replace(/\s+/gu, " ").trim().length;
}

function makeFinding(code, category, issue, severity = "error") {
	return {
		code,
		category,
		issue,
		severity
	};
}

export function runDeterministicQa({
	sourceText,
	targetText,
	stringType,
	maxLength,
	sourceUpdatedAt = null,
	targetCreatedAt = null
}) {
	if (targetText === null) {
		return [
			makeFinding(
				"missing_translation",
				REVIEW_CATEGORIES.ACCURACY,
				"No target translation exists in Crowdin."
			)
		];
	}

	const sourceSyntax = extractProtectedSyntax(sourceText);
	const targetSyntax = extractProtectedSyntax(targetText);
	const findings = [];
	if (!areEqual(sorted(sourceSyntax.placeholderSequence), sorted(targetSyntax.placeholderSequence))) {
		findings.push(makeFinding(
			"placeholder_mismatch",
			REVIEW_CATEGORIES.PLACEHOLDER,
			"The target translation does not contain the same placeholders and Crownicles tokens as the French source."
		));
	}
	if (!areEqual(sourceSyntax.htmlTags, targetSyntax.htmlTags)) {
		findings.push(makeFinding(
			"tag_mismatch",
			REVIEW_CATEGORIES.FORMATTING,
			"The target translation changes HTML or Discord tags."
		));
	}
	if (!areEqual(sourceSyntax.urls, targetSyntax.urls)) {
		findings.push(makeFinding(
			"url_mismatch",
			REVIEW_CATEGORIES.FORMATTING,
			"The target translation changes a URL from the French source."
		));
	}
	if (!areEqual(sourceSyntax.markdown, targetSyntax.markdown)) {
		findings.push(makeFinding(
			"markdown_mismatch",
			REVIEW_CATEGORIES.FORMATTING,
			"The target translation changes Markdown marker counts."
		));
	}
	if (sourceSyntax.newlineCount !== targetSyntax.newlineCount) {
		findings.push(makeFinding(
			"newline_mismatch",
			REVIEW_CATEGORIES.FORMATTING,
			"The target translation changes the number of structural line breaks.",
			"warning"
		));
	}
	if (
		sourceText === targetText
		&& plainLength(sourceText) >= MIN_UNCHANGED_LENGTH
		&& stringType !== STRING_TYPES.ENTITY_NAME
	) {
		findings.push(makeFinding(
			"unchanged_source",
			REVIEW_CATEGORIES.ACCURACY,
			"The target translation is identical to the French source and may be untranslated.",
			"warning"
		));
	}

	const sourceLength = plainLength(sourceText);
	const targetLength = plainLength(targetText);
	if (sourceLength >= MIN_LENGTH_FOR_RATIO_CHECK) {
		const ratio = targetLength / sourceLength;
		if (ratio < MIN_LENGTH_RATIO || ratio > MAX_LENGTH_RATIO) {
			findings.push(makeFinding(
				"suspicious_length",
				REVIEW_CATEGORIES.ACCURACY,
				`The target/source length ratio (${ratio.toFixed(2)}) is unusually extreme.`,
				"warning"
			));
		}
	}
	if (maxLength !== null && targetText.length > maxLength) {
		findings.push(makeFinding(
			"maximum_length_exceeded",
			REVIEW_CATEGORIES.FORMATTING,
			`The target translation has ${targetText.length} characters, exceeding the ${maxLength}-character limit.`
		));
	}
	if (
		sourceUpdatedAt !== null
		&& targetCreatedAt !== null
		&& Date.parse(sourceUpdatedAt) > Date.parse(targetCreatedAt)
	) {
		findings.push(makeFinding(
			"source_newer_than_translation",
			REVIEW_CATEGORIES.ACCURACY,
			"The French source was updated after this target proposal and the translation may be stale.",
			"warning"
		));
	}
	return findings;
}

export function mergeDeterministicFindings(review, findings) {
	if (findings.length === 0) {
		return {
			...review,
			deterministicFindings: []
		};
	}
	const hardFindings = findings.filter(finding => finding.severity === "error");
	const enforcedFindings = review.flagged ? findings : hardFindings;
	const categories = new Set([
		...review.categories,
		...enforcedFindings.map(finding => finding.category)
	]);
	const deterministicIssue = hardFindings.map(finding => finding.issue).join(" ");
	return {
		...review,
		flagged: review.flagged || hardFindings.length > 0,
		categories: [...categories],
		issue: review.issue ?? (deterministicIssue || null),
		deterministicFindings: findings
	};
}
