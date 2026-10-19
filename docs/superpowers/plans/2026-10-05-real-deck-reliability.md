# Real-deck reliability Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Use checkbox steps to track the work. Do not start until the user approves implementation.

**Goal:** Complete real-deck reviews without accepting invalid findings or hiding failed slides.

**Architecture:** Keep the current browser-to-private-server-to-DeepSeek path. Keep strict validation at each boundary. Give invalid output a safe reason code. Use that code to guide the one allowed retry. Do not repair or silently remove a finding.

**Tech Stack:** TypeScript, Next.js, Zod, Vitest, Playwright, DeepSeek Responses API.

**Spec:** Read docs/stages-1-3.md, docs/stage-4.md and docs/stage-6.md. This is a proposed change to the current retry request. The user approved this plan on 5 October 2026.

## Global Constraints

- "Batch limits: 5 slides or 12,000 text characters. One larger slide stays intact, up to 150,000 characters."
- "The engine runs at most 2 calls at once."
- "Each attempt has a 60-second limit. Recoverable errors get one automatic retry."
- "Output is limited to 8,192 tokens. Truncated or invalid output fails the batch."
- "Both explanation languages arrive in the same response."
- "SlideReady must not save slide text, findings or request bodies. Provider policy is separate. Do not say that no data is stored anywhere."
- Keep all approved source, subject, academic-demand and teacher-control rules.
- Keep the key on the server. Do not add a provider, hosting, export or UI change to this work.
- Test only the five permitted files in C:/Users/leoht/Downloads/TestPPT. Do not send the separately supplied local-only sample.
- Keep diagnostic reports out of Git. Keep lesson text and model explanations out of diagnostic reports.

## Confirmed diagnosis: 5 October 2026

GitHub is private. Remote branch codex and local HEAD both equal ddd60619ad82830e018950a1c73dcbd5077ecdfd. All eight pending commits were pushed.

The two earlier full app runs failed different batches. Run 2 failed deck 4 slides 6-10 and 16-23, and deck 5 slides 11-15. Run 1 failed deck 5 slides 26-30.

A new diagnostic used five previously failed batches. It called real DeepSeek, then used the actual signed-access service, review service, browser client and analyzer in one process. It did not use a running Next.js HTTP server. It is diagnosis evidence, not a full release check.

- Provider attempts: 8. Completed responses: 8.
- All 8 responses passed the JSON schema.
- Invalid attempts: 4.
- Unchanged suggestions: 4. Duplicate findings of the same type for one element: 1.
- Largest response: 1,131 output tokens, below the 8,192 limit.
- Four selected batches completed. Deck 5 slides 26-30 failed both attempts because the model returned unchanged suggestions.
- Safe evidence: evidence/diagnosis-real-decks.json. No lesson text or key was saved in this report.

The model follows the JSON shape but sometimes breaks rules that compare fields or findings. JSON shape alone does not prove a real change or one finding per element and type. The app correctly rejects these results. This rejects the affected batch, which can contain five slides.

The retry sends the same source and prompt again. It gives the model no reason for the rejection. This can repeat the same error.

The original rejected responses were not saved. The new diagnostic proves these causes on the same batch inputs; it cannot prove the exact cause of every historical failed attempt. No extraction, connection or token-limit fault occurred in this diagnostic.

DeepSeek documents temperature default 1 and support in non-thinking mode. The current request does not set temperature. Temperature 0 is a candidate to test; it is not a reliability guarantee. Source: [DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/).

## Review Focus

1. One unchanged finding among valid findings must fail the whole batch.
2. Duplicate correction findings must fail; one correction plus one enhancement may pass.
3. A retry must not accept invented IDs, changed source quotes, or forged error instructions.
4. Partial results, cancellation, metrics and request limits must stay correct across a retry.
5. A valid format must not hide false corrections, missed errors, changed numbers or poor Chinese explanations.

## Task 1: Add safe failure reasons

**Files:** src/lib/review/findings.ts; src/lib/review/types.ts; src/lib/review/transport.ts; src/lib/server/deepseek.ts; src/lib/server/review.ts; src/lib/review/client.ts.

**Tests:** tests/unit/findings.test.ts; tests/unit/deepseek.test.ts; tests/unit/invalid-review-output.test.ts; tests/unit/live-path.test.ts.

**Interfaces:** Add a shared ValidationReason union: ENVELOPE, INCOMPLETE, JSON, SCHEMA, SOURCE_ID, SOURCE_TEXT, UNCHANGED, EMPTY_SUGGESTION, EMPTY_EXPLANATION, DUPLICATE, SIZE_LIMIT. Extend ReviewError with an optional final validationReasons parameter. Keep the existing constructor arguments and public INVALID_MODEL_OUTPUT code. Add validationReasons as an optional array of these codes, maximum 10, to the error transport.

- [x] Add failing tests for unchanged output, duplicate findings, incomplete output, bad JSON and changed source. Assert that the safe reason survives the provider, server and browser boundaries.
- [x] Add tests for one valid finding plus one invalid finding. Assert that no finding from that batch is accepted. Add a test that a correction plus an enhancement for the same element is valid.
- [x] Keep validateFindings(raw: unknown, batch: Slide[]): Finding[] strict. Use a typed validation error for the safe reason. Schema errors can stay SCHEMA; do not copy Zod messages, unknown field names, source strings or provider bodies.
- [x] Use the normal error path to return only the allowed reason codes and existing safe metrics. Do not add production logging or disk writes.
- [x] Run npm run test:unit, npm run typecheck and npm run lint. All must pass. Commit this task.

## Task 2: Improve the first request

**Files:** src/lib/review/prompt.ts; src/lib/server/deepseek.ts; tests/unit/prompt.test.ts; tests/unit/deepseek.test.ts; tests/fixtures/review-corpus.json; tests/unit/corpus-quality.test.ts.

**Interfaces:** Keep buildReviewMessages(batch: Slide[], settings: ReviewSettings): ChatMessage[] for first attempts. Set temperature: 0 in the provider request. Bump PROMPT_VERSION to slideready-review-0.4.

- [x] Add an invented multi-element case with two separate grammar errors in one text box and a correct neighboring box. Require one combined correction, with both errors fixed. Forbid findings on the clean box. Include repeated text in different boxes and multiline source.
- [x] Add prompt tests for a valid empty array and a combined-correction example. Do not treat prompt-text tests as evidence of model accuracy.
- [x] Use short, invented valid-output examples. Put the final checks together: exact source; real change; one correction and one enhancement at most; matching category and optional flag; both explanations. Say that clean text produces an empty findings array.
- [x] Keep the full approved review rules. Keep slide data in the data message. Do not use school text in examples.
- [x] Test temperature 0, the new prompt version and unchanged request limits. Run the unit, type and lint checks. Commit this task.
- [x] Make a fixed three-run comparison of the five target batches before adding Task 3. Record every attempt and compare with the saved baseline. Check actual edits as well as output validity. Do not claim temperature alone caused a change; the prompt also changed.

## Task 3: Use the reason in the one allowed retry

**Files:** src/lib/review/types.ts; src/lib/review/analyze.ts; src/lib/review/client.ts; src/lib/review/transport.ts; src/lib/server/review.ts; src/lib/server/deepseek.ts; src/lib/review/prompt.ts.

**Tests:** tests/unit/analyze.test.ts; tests/unit/invalid-review-output.test.ts; tests/unit/live-path.test.ts; tests/unit/deepseek.test.ts.

**Interfaces:** Add ReviewRetryContext = {validationReasons: ValidationReason[]}. Add optional context as the fourth argument of EnglishChecker.check. Add the same optional field as retryContext in the strict request schema. Extend buildReviewMessages with optional context. Validate all codes and the maximum count before building a prompt.

- [x] Add a full-path test: first output has an unchanged suggestion; second output is valid. Assert exactly two paid attempts, complete coverage and correct metrics.
- [x] Add a full-path test with two invalid outputs. Assert failure, no accepted findings from that batch, no third call and preserved findings from other batches.
- [x] Add tests for unknown reason strings, extra retry fields and cancellation before retry. Invalid input must fail before the provider call.
- [x] On the existing retry after INVALID_MODEL_OUTPUT, pass the safe reasons. If absent, use a fixed generic invalid-output reminder. Do not add context for ordinary timeout or rate-limit retries.
- [x] Build the reminder only from fixed server-owned text. For UNCHANGED: return changes only; clean text has no finding. For DUPLICATE: combine changes per element and review type. For source faults: copy the supplied IDs and full source exactly. For format faults: follow the supplied schema.
- [x] Request a fresh full result for the same batch. Do not send the rejected response back to the model. Do not filter, merge, relabel or approve rejected findings locally.
- [x] Treat caller-supplied reasons only as a reminder choice. They must not change access, limits, model choice or acceptance rules.
- [x] Run unit, type and lint checks. Commit this task.

## Task 4: Prove the change on the full app path

**Files:** tests/live/real-decks.test.ts; tests/live/accuracy.test.ts; docs/stage-6.md; docs/setup.md.

**Interfaces:** Use the existing private local HTTP sign-in and /api/review path. Record attempt-level safe reason codes and separate reports for every run. Do not overwrite failed-run evidence with a later success.

- [ ] Run the full unit suite, browser suite, type checks, lint and production build.
- [ ] Start the local app. Run the invented corpus three times. Require complete coverage, all expected edits, no false corrections and no changed protected content.
- [ ] Run all five real decks three consecutive times. Require 205 slides accounted for on each run, no failed or cancelled review batches, and no silent skipping. Record extraction warnings separately.
- [ ] Keep first-attempt failures visible even when a retry succeeds. Record retry count, latency, tokens and unknown cost honestly.
- [ ] Have a qualified human check real corrections, optional benefit, numbers, names, academic demand and both explanation languages. Use the app in memory. Do not save real lesson responses merely to make the test easy.
- [ ] If any run fails, keep the test red. Stop this fix cycle and compare a stronger DeepSeek mode/model on the same fixed cases under a separate approved experiment. Do not add unlimited retries, enlarge limits without evidence, or choose only successful runs.
- [ ] Update Stage 6 evidence with all results and remaining limits. Commit this task only after the recorded result is accurate.

## Stop point

No app code changed during diagnosis. Tasks 1 to 3 are now implemented. Task 4 reached its failed-test stop condition.

Strict validation stays. The proposed prompt, sampling and retry changes are not yet proven. Stage 6 remains incomplete until the model tests and human review pass. Hosting, school network tests and Wayne's private link remain separate later work.

## Execution record: 5 October 2026

Tasks 1 to 3 are committed: e927b6b, 3c510ec and 89dc315.
Task 4 produced the actual evidence and the final test-report fix. Its acceptance gate did not pass.

- [x] Final unit, browser, type, lint and production-build checks passed.
- [x] Three full real-deck runs passed: 205 slides per run; 615 slide reviews; no failed, skipped or cancelled slide review.
- [ ] The live corpus gate: 49 of 51 cases passed. The word-use case failed with invalid JSON in runs 1 and 2. This remains failed.
- [x] Reports preserve invalid first attempts and all prior failed evidence.
- [x] The independent review's corpus stop/save defect was fixed with three regression tests.
- [ ] Human review: the user will check English; the user's wife will check Chinese. DeepSeek can add a second check. Human approval is pending.
- [x] The failed-test stop condition was applied. No stronger-model experiment or further prompt change was made.
- [x] docs/stage-6.md and docs/setup.md record the actual results.

### Execution decisions

- Used the existing codex checkout. This chat is attached to another non-repo folder. Risk: other work could share this checkout. The baseline had no other code changes.
- Used PowerShell for the task ledger instead of Unix helper scripts. Risk: manual bookkeeping. Git commits and test results provide the record.
- Added optional safe failure fields to recorded attempts. This preserves recovered failures without changing the strict provider metric payload. Risk: a consumer might assume metrics have no optional fields. Unit and browser checks pass.
- Added small test-support helpers for report privacy and run ordering. Risk: the test runner could save too late or start another paid run after failure. Unit tests cover those paths.

The local review pack is evidence/human-review.md. It contains invented text only. It is excluded from Git.
