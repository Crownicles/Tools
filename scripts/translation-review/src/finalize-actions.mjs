#!/usr/bin/env node

import {
	appendFile,
	mkdir,
	readFile
} from "node:fs/promises";
import {
	dirname,
	resolve
} from "node:path";
import {
	DEFAULTS
} from "./constants.mjs";
import {
	finalizeTaskWithModel,
	verifyModel
} from "./model.mjs";

function parsePositiveInteger(value, option) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${option} requires a positive integer`);
	}
	return parsed;
}

function parseArguments(argv) {
	const options = {
		inputPath: null,
		outputPath: null,
		failurePath: null,
		concurrency: DEFAULTS.concurrency,
		model: process.env.LOCAL_LLM_MODEL ?? DEFAULTS.model,
		baseUrl: (process.env.LOCAL_LLM_BASE_URL ?? DEFAULTS.modelBaseUrl).replace(/\/$/u, "")
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
			case "--concurrency":
				options.concurrency = parsePositiveInteger(nextValue(), argument);
				break;
			case "--failure-log":
				options.failurePath = resolve(nextValue());
				break;
			case "--input":
				options.inputPath = resolve(nextValue());
				break;
			case "--model":
				options.model = nextValue();
				break;
			case "--model-base-url":
				options.baseUrl = nextValue().replace(/\/$/u, "");
				break;
			case "--output":
				options.outputPath = resolve(nextValue());
				break;
			default:
				throw new Error(`Unknown option: ${argument}`);
		}
	}
	if (!options.inputPath || !options.outputPath) {
		throw new Error("--input and --output are required");
	}
	options.failurePath ??= `${options.outputPath}.failures.jsonl`;
	return options;
}

async function readJsonLines(path) {
	const contents = await readFile(path, "utf8");
	return contents.split("\n").filter(Boolean).map((line, index) => {
		try {
			return JSON.parse(line);
		}
		catch (error) {
			throw new Error(`Invalid JSON on ${path} line ${index + 1}: ${error.message}`);
		}
	});
}

async function loadCompletedTaskIds(path) {
	try {
		return new Set((await readJsonLines(path)).map(record => record.taskId));
	}
	catch (error) {
		if (error.code === "ENOENT") {
			return new Set();
		}
		throw error;
	}
}

async function appendJsonLine(path, value) {
	await mkdir(dirname(path), {
		recursive: true
	});
	await appendFile(path, `${JSON.stringify(value)}\n`, "utf8");
}

async function mapWithConcurrency(values, concurrency, callback) {
	let nextIndex = 0;
	async function worker() {
		while (nextIndex < values.length) {
			const index = nextIndex++;
			await callback(values[index], index);
		}
	}
	await Promise.all(Array.from({
		length: Math.min(concurrency, values.length)
	}, worker));
}

async function main() {
	const options = parseArguments(process.argv.slice(2));
	await verifyModel(options.baseUrl, options.model, DEFAULTS.requestTimeoutMs);
	const [tasks, completedTaskIds] = await Promise.all([
		readJsonLines(options.inputPath),
		loadCompletedTaskIds(options.outputPath)
	]);
	const pendingTasks = tasks.filter(task => !completedTaskIds.has(task.taskId));
	console.log(
		`Loaded ${tasks.length} downstream tasks; ${completedTaskIds.size} already completed, `
		+ `${pendingTasks.length} pending.`
	);

	let completedCount = 0;
	let writeChain = Promise.resolve();
	await mapWithConcurrency(pendingTasks, options.concurrency, async task => {
		try {
			const result = await finalizeTaskWithModel({
				baseUrl: options.baseUrl,
				model: options.model,
				timeoutMs: DEFAULTS.requestTimeoutMs,
				task
			});
			const record = {
				schemaVersion: "1.0",
				...result.decision,
				resource: task.input.action.resource,
				preconditions: task.input.action.preconditions,
				model: options.model,
				usage: result.usage,
				completedAt: new Date().toISOString()
			};
			writeChain = writeChain.then(() => appendJsonLine(options.outputPath, record));
			await writeChain;
			completedCount++;
			console.log(`[${completedCount}/${pendingTasks.length}] ${record.decision} ${record.resource.key}`);
		}
		catch (error) {
			const failure = {
				taskId: task.taskId,
				key: task.input?.action?.resource?.key ?? null,
				message: error.message,
				failedAt: new Date().toISOString()
			};
			writeChain = writeChain.then(() => appendJsonLine(options.failurePath, failure));
			await writeChain;
			completedCount++;
			console.error(`[${completedCount}/${pendingTasks.length}] FAIL ${failure.key}: ${error.message}`);
		}
	});
	await writeChain;
	console.log(`Decisions: ${options.outputPath}`);
	console.log(`Failures: ${options.failurePath}`);
}

main().catch(error => {
	console.error(error.stack ?? error.message);
	process.exitCode = 1;
});
