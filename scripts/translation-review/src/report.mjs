import {
	mkdir,
	writeFile
} from "node:fs/promises";
import {
	join
} from "node:path";
import {
	createExchangeRecords
} from "./exchange.mjs";

function displayNullable(value) {
	return value ?? "—";
}

function markdownCodeBlock(value) {
	const fence = value.includes("```") ? "````" : "```";
	return `${fence}\n${value}\n${fence}`;
}

function renderFlaggedString(entry, index) {
	const validation = entry.validationErrors.length === 0
		? ""
		: `\n**Suggestion rejetée automatiquement :** ${entry.validationErrors.join("; ")}\n`;
	const deterministic = entry.deterministicFindings.length === 0
		? ""
		: `\n**Contrôles déterministes :**\n${entry.deterministicFindings
			.map(finding => `- \`${finding.code}\` (${finding.severity}) : ${finding.issue}`)
			.join("\n")}\n`;
	return `## ${index + 1}. \`${entry.key}\`

- **ID Crowdin :** ${entry.crowdinId}
- **Langue cible :** ${entry.targetLanguage.name} (\`${entry.targetLanguage.id}\`)
- **ID traduction :** ${displayNullable(entry.translationId)}
- **Approuvée dans Crowdin (métadonnée uniquement) :** ${entry.approved ? "oui" : "non"}
- **Lien Crowdin :** ${entry.crowdinUrl}
- **Type :** ${entry.type}
- **Confiance :** ${entry.confidence}
- **Catégories :** ${entry.categories.join(", ") || "non classée"}
- **Contexte Crowdin :** ${displayNullable(entry.context.crowdinContext)}

**Source française canonique**

${markdownCodeBlock(entry.sourceFrench)}

**Traduction ${entry.targetLanguage.name} actuelle**

${entry.existingTranslation === null ? "Aucune traduction." : markdownCodeBlock(entry.existingTranslation)}

**Problème**

${entry.issue}

**Correction proposée**

${entry.suggestedFix === null ? "Aucune correction sûre proposée." : markdownCodeBlock(entry.suggestedFix)}
${deterministic}${validation}`;
}

function renderMarkdown(report) {
	const runtime = report.metadata.elapsedSeconds === null
		? "non mesuré"
		: `${report.metadata.elapsedSeconds} s`;
	const entries = report.flagged.map(renderFlaggedString).join("\n\n---\n\n");
	return `# Rapport de qualité de traduction — ${report.metadata.targetLanguage.name}

- Projet Crowdin : ${report.metadata.projectName} (${report.metadata.projectId})
- Branche : ${report.metadata.branch}
- Langue source : français (\`${report.metadata.sourceLanguage}\`)
- Langue cible : ${report.metadata.targetLanguage.name} (\`${report.metadata.targetLanguage.id}\`)
- Modèle : ${report.metadata.model}
- Chaînes Crowdin disponibles : ${report.metadata.availableStringCount}
- Chaînes relues : ${report.metadata.reviewedCount}
- Chaînes signalées : ${report.metadata.flaggedCount}
- Traductions approuvées dans l'échantillon : ${report.metadata.approvedTranslationCount}
- Traductions manquantes : ${report.metadata.missingTranslationCount}
- Échecs journalisés séparément : ${report.metadata.failureCount}
- Résultats repris du cache : ${report.metadata.cacheHitCount}
- Durée : ${runtime}

Le français Crowdin est la source canonique. Les traductions cibles et leur état d'approbation sont lus depuis Crowdin. Ce rapport est uniquement consultatif et ne modifie aucune traduction.

${entries || "Aucune chaîne signalée."}
`;
}

export async function writeReports(outputDirectory, report) {
	await mkdir(outputDirectory, {
		recursive: true
	});
	const jsonPath = join(outputDirectory, "translation-review-report.json");
	const markdownPath = join(outputDirectory, "translation-review-report.md");
	const actionsPath = join(outputDirectory, "translation-actions.jsonl");
	const llmTasksPath = join(outputDirectory, "translation-llm-tasks.jsonl");
	const exchange = createExchangeRecords(report);
	await Promise.all([
		writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
		writeFile(markdownPath, renderMarkdown(report), "utf8"),
		writeFile(
			actionsPath,
			exchange.actions.map(action => JSON.stringify(action)).join("\n") + (exchange.actions.length > 0 ? "\n" : ""),
			"utf8"
		),
		writeFile(
			llmTasksPath,
			exchange.llmTasks.map(task => JSON.stringify(task)).join("\n") + (exchange.llmTasks.length > 0 ? "\n" : ""),
			"utf8"
		)
	]);
	return {
		jsonPath,
		markdownPath,
		actionsPath,
		llmTasksPath
	};
}
