import { DEFAULTS } from "./constants.mjs";

const CROWDIN_API_BASE_URL = "https://api.crowdin.com/api/v2";
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

function delay(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function fetchCrowdinJson(path, token) {
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(`${CROWDIN_API_BASE_URL}${path}`, {
				headers: {
					Authorization: `Bearer ${token}`
				},
				signal: AbortSignal.timeout(DEFAULTS.requestTimeoutMs)
			});
			if (!response.ok) {
				throw new Error(`Crowdin API ${response.status} ${response.statusText} for ${path}`);
			}
			return await response.json();
		}
		catch (error) {
			lastError = error;
			if (attempt < MAX_ATTEMPTS) {
				await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
			}
		}
	}
	throw lastError;
}

async function fetchPaginated(path, token) {
	const records = [];
	let offset = 0;
	while (true) {
		const separator = path.includes("?") ? "&" : "?";
		const response = await fetchCrowdinJson(
			`${path}${separator}limit=${DEFAULTS.apiPageSize}&offset=${offset}`,
			token
		);
		const page = response.data.map(entry => entry.data);
		records.push(...page);
		if (page.length < DEFAULTS.apiPageSize) {
			return records;
		}
		offset += page.length;
	}
}

async function mapWithConcurrency(values, concurrency, callback) {
	const results = new Array(values.length);
	let nextIndex = 0;
	async function worker() {
		while (nextIndex < values.length) {
			const index = nextIndex++;
			results[index] = await callback(values[index]);
		}
	}
	await Promise.all(Array.from({
		length: Math.min(concurrency, values.length)
	}, worker));
	return results;
}

function mapScreenshotsByString(screenshots) {
	const result = new Map();
	for (const screenshot of screenshots) {
		for (const tag of screenshot.tags ?? []) {
			if (!result.has(tag.stringId)) {
				result.set(tag.stringId, []);
			}
			result.get(tag.stringId).push({
				id: screenshot.id,
				name: screenshot.name,
				url: screenshot.url
			});
		}
	}
	return result;
}

export async function fetchProjectLocalization({
	projectId,
	token,
	branchName
}) {
	const projectResponse = await fetchCrowdinJson(`/projects/${projectId}`, token);
	const branches = await fetchPaginated(`/projects/${projectId}/branches`, token);
	const branch = branches.find(candidate => candidate.name === branchName);
	if (!branch) {
		throw new Error(`Crowdin branch "${branchName}" was not found`);
	}

	const [files, strings, screenshots] = await Promise.all([
		fetchPaginated(`/projects/${projectId}/files`, token),
		fetchPaginated(`/projects/${projectId}/strings?branchId=${branch.id}`, token),
		fetchPaginated(`/projects/${projectId}/screenshots`, token)
	]);
	const filesById = new Map(files.map(file => [file.id, file]));
	const screenshotsByString = mapScreenshotsByString(screenshots);

	return {
		project: projectResponse.data,
		branch,
		files,
		screenshotCount: screenshots.length,
		strings: strings.map(string => {
			const file = filesById.get(string.fileId);
			if (!file) {
				throw new Error(`Crowdin string ${string.id} references unknown file ${string.fileId}`);
			}
			return {
				...string,
				file,
				namespace: file.name.replace(/\.json$/u, ""),
				screenshots: screenshotsByString.get(string.id) ?? []
			};
		})
	};
}

export function selectCurrentTranslation(proposals, approval) {
	if (proposals.length === 0) {
		return null;
	}
	const approved = approval
		? proposals.find(proposal => proposal.id === approval.translationId)
		: null;
	if (approval && !approved) {
		throw new Error(`Approval ${approval.id} references missing translation ${approval.translationId}`);
	}
	const selected = approved ?? [...proposals]
		.sort((left, right) => {
			const ratingDifference = (right.rating ?? 0) - (left.rating ?? 0);
			return ratingDifference || Date.parse(right.createdAt) - Date.parse(left.createdAt);
		})[0];
	return {
		...selected,
		approved: approved !== null,
		approvalId: approved ? approval.id : null,
		approvedAt: approved ? approval.createdAt : null
	};
}

export async function fetchTargetTranslations({
	projectId,
	token,
	languageId,
	records
}) {
	const approvals = await fetchPaginated(
		`/projects/${projectId}/approvals?languageId=${encodeURIComponent(languageId)}`,
		token
	);
	const approvalsByStringId = new Map(approvals.map(approval => [
		approval.stringId,
		approval
	]));
	const results = await mapWithConcurrency(
		records,
		DEFAULTS.crowdinConcurrency,
		async record => {
			try {
				const proposals = await fetchPaginated(
					`/projects/${projectId}/translations?stringId=${record.id}&languageId=${encodeURIComponent(languageId)}`,
					token
				);
				return [
					record.id,
					{
						translation: selectCurrentTranslation(proposals, approvalsByStringId.get(record.id)),
						error: null
					}
				];
			}
			catch (error) {
				return [
					record.id,
					{
						translation: null,
						error: error.message
					}
				];
			}
		}
	);
	return new Map(results);
}
