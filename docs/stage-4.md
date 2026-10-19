# Stage 4: review engine

Status: Stage 4 complete. Code, live test and final review fixes pass. Stop for user review.

## Built

- Browser review client calls POST /api/review.
- The route checks the signed invite session and the configured Origin.
- The server uses the permanent key. It returns validated findings and safe metrics.
- The PPTX is not sent. File names, shape names, speaker notes and document metadata are not part of a review request.
- The app does not save slide text or findings. Provider policy is separate.
- The route uses one fixed DeepSeek host, non-thinking mode and strict JSON Schema.
- Output is limited to 8,192 tokens. Truncated or invalid output fails the batch.
- Both explanation languages arrive in the same response.
- Batch limits: 5 slides or 12,000 text characters. One larger slide stays intact, up to 150,000 characters.
- The engine runs at most 2 calls at once.
- Each attempt has a 60-second limit. Recoverable errors get one automatic retry.
- Retry delay is bounded to 3 seconds. A long rate limit can remain failed after that retry; a later teacher action can retry failed batches.
- Key, permission, billing and invite errors are permanent for that run. DeepSeek uses a permanent server key, so the old Qwen key-refresh step does not apply.
- Cancel aborts active requests and stops unsent work. Completed findings remain in memory.
- A manual retry sends only failed batches. It keeps earlier findings and checks that the deck and settings match.
- Findings are returned in slide order. Complete, partial, failed and cancelled states are distinct.

## Server limits

- Request body: 2 MiB. Response body from the provider: 1 MiB.
- Review calls: at most 2 active calls per session and 6 per server process.
- Review request rate: 40 per session and 120 globally per minute.
- Input IDs must be unique. At most 5,000 elements are accepted in a batch.
- No caller-selected model endpoint or API key is accepted.
- These limits apply to one server process. Shared hosting limits are a later release task.

## Metrics

The engine keeps token counts, attempt times, retry counts and cost estimates in memory.
Unknown usage stays unknown. Known token counts from failed attempts are retained.
Model time is the sum of attempt times; concurrent calls can make it longer than wall-clock review time.
Total time is unknown when extraction time is not supplied.

Cost is unknown by default. DeepSeek uses peak and off-peak tiers and a public-holiday calendar.
Set DEEPSEEK_PRICE_TIER to peak or off_peak only when the tier is confirmed for the test time.
The estimate also needs cache-hit input tokens. Unknown cache usage means unknown cost.
Prices were checked on 5 October 2026. Estimates do not prove the final bill.

This Stage 4 metric issue was fixed in Stage 5: cancellation during the automatic retry wait no longer counts an unstarted retry. See docs/stage-5.md.

Source: https://api-docs.deepseek.com/quick_start/pricing/

## Verification

- Unit tests: 130 passed after the final review fixes.
- Type check, lint, production build: pass.
- Production npm audit: 0 findings.
- Live route test: PASS, 5 October 2026.
- Live data: 6 invented slides, sent as two batches.
- The test found the planted grammar and spelling errors.
- Both English and Simplified Chinese explanations passed validation.
- The formula, teaching exercise and heading were not flagged as corrections.
- No user lesson deck was sent to DeepSeek.
- This test does not prove review quality on all school decks.

## Repeat the live test

Run npm run dev first.
Run npm run test:live-review in another terminal.
The live test is separate from unit tests. It makes paid model calls using invented text.
It uses a private local session and refuses a remote server address.
Never paste a key into chat.

## Stop point

Stage 3 rules are approved. Stage 4 is the only stage authorized in this run.
Do not add the teacher review controls, Accept/Ignore actions or feedback export until Stage 5 is approved.
At the Stage 4 stop, the page showed Stage 1/2 controls. Stage 5 now adds the teacher review screen. See docs/stage-5.md.
