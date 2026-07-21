# Crowdin translation quality review

Read-only Crowdin extraction and local-LLM review for translations from Crownicles' canonical French source into a selected target language.

Supported Crowdin target languages:

- `en` — English
- `de` — German
- `es-ES` (or alias `es`) — Spanish
- `it` — Italian
- `pt-PT` (or alias `pt`) — Portuguese

## Safety

- Only Crowdin `GET` endpoints are implemented.
- No source string, translation, approval, or comment is uploaded or modified.
- A target language is always required.
- A full-language run requires the explicit `--all` flag.
- Hard deterministic integrity errors run before Gemma and cannot be silently dismissed by the model; heuristic warnings require model confirmation.
- Model suggestions that alter source placeholders, tags, URLs, Markdown, line breaks, or structural whitespace are rejected.
- Every model-flagged result receives a skeptical second-pass adjudication.
- Reviews are cached by source revision, target proposal, approval state, language, context, checks, model, and prompt version.

## What is reviewed

For every selected French source string, the tool reads the current target-language proposals and approvals from Crowdin. It chooses:

1. the approved proposal, when one exists;
2. otherwise, the highest-rated proposal, breaking ties by recency;
3. otherwise, a missing-translation finding.

Approval is used only to identify Crowdin's currently selected proposal. It is never treated as evidence that the translation is correct or as trusted terminology.

The model receives:

- canonical French source;
- existing target translation and approval/provider state;
- Crowdin context, ICU/label metadata, screenshots, and maximum length;
- inferred string type and associated feature;
- exact, ancestor, and dynamic code usages with nearby code/comments;
- source and target sibling plural/gender forms;
- deterministic QA findings and protected syntax.

Deterministic QA checks:

- missing target translation;
- missing, added, or changed placeholders and Crownicles tokens;
- changed HTML/Discord tags, URLs, Markdown, or line breaks;
- likely untranslated French;
- target proposals older than a changed French source;
- suspicious source/target length ratio;
- known maximum-length violations.

## Run

Requirements: Node.js 24+, a Crowdin personal token, and an OpenAI-compatible local model server.

```bash
cd scripts/translation-review
export CROWDIN_PERSONAL_TOKEN="..."
node src/cli.mjs --language en --sample 25
```

Defaults:

- Crowdin project: `378229`
- branch: `develop`
- local model endpoint: `http://127.0.0.1:1234`
- model: `gemma-4-12b-it`
- sample size: 25
- model concurrency: 1
- Crowdin read concurrency: 5
- Crownicles repository: sibling `../Crownicles` repository
- language-specific cache and reports: Tools repository `.translation-review/`

Useful options:

```bash
node src/cli.mjs --language en --sample 25
node src/cli.mjs --language en --sample 25 --crownicles-root /path/to/Crownicles
node src/cli.mjs --language de --sample 25 --key commands:profile.title
node src/cli.mjs --language es-ES --sample 25 --concurrency 2
node src/cli.mjs --language it --sample 25 --dry-run
node src/cli.mjs --language pt-PT --all
node src/cli.mjs --language en --output-dir /path/to/reports
```

`--dry-run` performs Crowdin extraction and context gathering but does not contact the local model. Failures are appended to a language-specific JSONL log and do not stop the batch.

Use `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_MODEL`, `CROWDIN_PROJECT_ID`, and `CROWNICLES_REPO_ROOT` to override defaults.

## Output

Every run writes four language-specific files:

- `translation-review-report.md` — human-readable flagged translations with direct Crowdin links.
- `translation-review-report.json` — complete structured report metadata and flagged entries.
- `translation-actions.jsonl` — one pending, machine-actionable record per flag.
- `translation-llm-tasks.jsonl` — portable tasks with prompts and explicit output schemas for another LLM.

Each action contains:

- French source and current target translation;
- Crowdin project, source string, translation, language, and editor URL;
- source revision plus SHA-256 hashes of source and target as stale-write guards;
- deterministic and model findings;
- safe candidate correction when available;
- `create_translation` or `replace_translation` operation;
- `pending` status and `readyForGuardedWriteback`.

### Human workflow

Open `translation-review-report.md`, inspect each source/current/candidate triple, follow its Crowdin link, and manually apply or reject the suggestion.

### Another LLM or automation

`translation-llm-tasks.jsonl` is model-agnostic. Each line contains:

- a stable task ID;
- the full action and prompt;
- an explicit JSON output schema with `accept_candidate`, `replace_candidate`, or `reject_issue`.

A custom script can send each line to any LLM and join the result back to `translation-actions.jsonl` by task/action ID.

### Optional second Gemma stage

The included consumer runs those portable tasks through the configured local model:

```bash
node src/finalize-actions.mjs \
  --input ../../.translation-review/reports/en/translation-llm-tasks.jsonl \
  --output ../../.translation-review/reports/en/translation-decisions.jsonl
```

It resumes completed task IDs, logs failures, validates protected syntax, and carries Crowdin resource IDs plus state guards into every decision. It still does not write to Crowdin.

### Future guarded Crowdin updater

`translation-actions.jsonl` and `translation-decisions.jsonl` are designed as input to a separate, explicitly authorized writeback tool. Such a tool must re-read Crowdin and verify `sourceRevision`, `sourceSha256`, `translationId`, and `translationSha256` before applying a decision. No writeback implementation is included here.

The review JSONL cache supports unchanged reruns without another model call. Nothing is pushed back to Crowdin.

## Test

```bash
pnpm test
```
