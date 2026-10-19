# Stage 6: test before Wayne uses it

Status: Stage 6 is incomplete. The real-deck coverage test and latest live corpus pass. The user approved the supplied review pack and three Chinese wording changes. The old intermittent JSON failure is not confirmed fixed. Remote pilot and release checks remain open.

## Useful feedback and information pages release, 5 October 2026

User approved all proposed changes and GitHub/live publication; confirmed public operator Leo Thom and support work@leothom.com. App commit fe78984404002a1154d9103a3afec908fcdc093e is pushed and deployed. Added bilingual Terms and Contact pages, contact details on Privacy, and shared footer links that preserve the current review. Terms explain AI limitations, manual updates, permitted submissions and the private trial without claiming legal immunity. Legal review and jurisdiction/data-flow assessment remain outside this implementation.

Changed optional-settings label, full-width bordered Reason, and a separate next-file section with pale green action. Prompt 0.6 rejects quote-style-only recommendations; deterministic filtering removes findings that differ only in straight/curly quotes after schema/source validation. Meaningful punctuation remains. Unit tests passed (225), full browser tests passed (49), types/lint passed, and production dependency audit returned zero advisories. Independent reviews found no supported blocker in rules, layout or new pages. No provider-quality claim is made; no new paid model call ran.

Committed inputs only were transferred to /opt/slideready-check-fe78984. Linux image and isolated HTTPS/secret-isolation tests passed with fake secrets. Live app health and public HTTPS passed; nine actual-site browser tests passed in both languages at desktop/mobile sizes with invented decks and mocked AI responses. Existing invite, secrets and certificates were retained. Previous image 855d9c4f8ffe08dab7209fa84d38c554470c4373 and deploy/.env.before-fe78984 remain for rollback. AgentShield, Repomix and a new DeepSeek source review were not run; formal Impeccable audit setup remains absent. Existing Stage 6 network/maintenance checks remain open.

## Setup and loading polish release, 5 October 2026

User approved the design and GitHub/live publication. App commit 855d9c4f8ffe08dab7209fa84d38c554470c4373 is pushed and deployed. Updated bilingual heading and supporting copy, wider heading, adjacent setup actions, blue new-file action, centered confirmation with safe initial focus and separate restart label, and CSS loading dots with reduced-motion support. Form provider notice was removed; the Privacy page remains.

Production build, lint, types and production dependency audit passed. The existing 45 browser tests passed before the final confirmation-label change; six focused tests passed after that change. Independent code review found the shared new-file/restart label defect; it was fixed and rechecked with no remaining supported blockers. Screenshot review confirmed modal placement and button order.

Committed build inputs only were transferred to /opt/slideready-check-855d9c4. Linux image build and isolated HTTPS/container test passed with fake secrets and no AI key. Production now uses the full commit image tag. Existing secrets, private invite and certificate volumes were retained. Previous image a22fd61433fb10bb79ed0e2285a30b0df9d3333f and deploy/.env.before-855d9c4 are retained for rollback. App health and public HTTPS passed. Ten public-site browser tests passed, covering both languages, desktop/mobile layout, confirmation placement, loading reduced motion and restart. Invented decks and mocked AI replies were used; no paid AI call was made.

Release scope is UI only. Auth, storage, server configuration and model processing code are unchanged. AgentShield, Repomix and a new DeepSeek review were not run; formal Impeccable setup remains absent, so no full audit is claimed. Existing Stage 6 school-network and server-maintenance items remain open.

## Feedback pills release, 5 October 2026

User approved GitHub push and live deployment. App commit a22fd61433fb10bb79ed0e2285a30b0df9d3333f is pushed to origin/codex and runs on the Hong Kong server. Committed build files only were transferred to /opt/slideready-check-a22fd61. Linux build and isolated Docker HTTPS tests passed using fake secrets and no provider key. The host has no Node executable; the test ran in a temporary Node container. Existing production secrets, invite and certificate volumes were retained. Previous image b13a5ff504a922bcfcd9472509c146b44bfa46e1 and deploy/.env.before-a22fd61 remain for rollback.

Public HTTPS returned 200 and app health passed. Seven browser tests against the actual public site passed: English and Chinese feedback controls, 1280/320 pixel layouts, and a 15-slide narrow-screen pill test. They used invented decks and mocked AI responses, with no paid AI call. Unit tests (224), types and lint passed; production dependency audit returned zero advisories. Independent code review found no supported blocker.

Release scope is presentation only; auth, API, storage and model pipeline are unchanged. The review inspected the changed source and dependency metadata. AgentShield and Repomix were not rerun; no new DeepSeek review was made. The formal Impeccable setup is still absent, so its full audit was not run; focused accessibility and responsive checks passed. This is not a claim that all release-gate lanes or Stage 6 school-network checks are complete.

## One-slide feedback view published, 5 October 2026

The user approved and requested GitHub push and live publication. Application commit: b13a5ff504a922bcfcd9472509c146b44bfa46e1. Feedback replaces setup after review. Navigation shows one slide with suggestions or failed/cancelled coverage at a time; successfully reviewed slides with no findings are skipped. Accept and Ignore were removed because they only recorded temporary choices. Copy suggested text remains with an explicit manual-paste notice. Review details and the technical feedback download are absent from the teacher view. Reset confirms before clearing the current review.

Local checks passed: 224 unit tests, 44 browser checks, types, lint and final production build. Independent read-only review found no supported functional blocker; stale Privacy and reset text was corrected. Fresh production audit returned zero advisories and the high-signal scan of 14 committed changed files returned no secret match. No new paid source-code review or model call was made for this release. The previously recorded full-gate exclusions, cloud firewall console gap and server maintenance limits remain open.

Committed build inputs only were transferred to /opt/slideready-check-b13a5ff. The Linux image passed the private HTTPS/container test with fake secrets, no provider key and loopback ports. Live app now uses the full commit tag. Existing secrets, invites and HTTPS certificate volumes were kept. Previous image 4243bee2fe9b327c63f8a1c95ac8071a0e3a1c1b and deploy/.env.before-b13a5ff are retained for rollback. All approved commits were pushed to origin/codex.

After deployment, app health and certificate-validated public HTTPS passed. Six browser tests ran against the actual public site using invented decks and mocked AI replies: English/Chinese pagination, manual-copy-only controls, reset and 1280/320 pixel layouts passed. The existing invite returned 200 and an unauthenticated probe returned 401; no secret or cookie was printed. These checks made no paid AI call and do not claim a new model-quality trial. The remaining Stage 6 school-network and other pilot checks are unchanged.

## Simpler teacher page published, 5 October 2026

The user approved the shorter homepage and then requested publication. Live application commit: 4243bee2fe9b327c63f8a1c95ac8071a0e3a1c1b. Subject is optional (blank maps to Other); Subject and TOEFL controls start in a closed Review settings disclosure. The file area supports local drag/drop and keyboard file selection. Privacy opens in a separate tab in both languages, with a short pre-review data-transfer notice retained on the form.

Verification before publication: 224 unit tests, 40 full browser checks followed by six focused checks (42 distinct browser cases), types and lint passed. Independent review found no supported code defect; its requested test gaps for general-review settings, busy drop and decision confirmation were covered. Fresh production dependency audit returned zero advisories; the high-signal scan of 11 committed changed files found no secret match. No new paid source-code review or AI trial was made. Earlier skipped release lanes and server maintenance limits remain recorded; this is not a claim that all Stage 6 checks passed.

Committed build inputs only were copied to /opt/slideready-check-4243bee. The new Linux image built and passed the private HTTPS container test using fake secrets and no provider key. The live app was recreated with the full commit image tag; existing runtime secrets, private invite and Caddy certificate volumes were kept. Previous image 8ca557abd86f0ea70b34c4dec2a0c86e2554383c and mode-600 public configuration backup deploy/.env.before-4243bee remain for rollback.

After publication, the app is healthy; public HTTPS home and Privacy return 200 with verified TLS and expected security headers, and HTTP redirects with 308. Both homepage languages and both Privacy languages passed browser checks. An unauthenticated probe returned 401 and the existing private invite returned 200 without an AI call. No invite URL or session value was printed. School network checks and the other recorded pilot limits remain open.

## Public HTTPS deployment, 5 October 2026

The user authorized checking the cloud firewall, setting server secrets and starting public HTTPS. The tested app image 8ca557abd86f0ea70b34c4dec2a0c86e2554383c now runs from /opt/slideready with project slideready. The API key was sent through strict-host-key SSH input, with no key in command arguments or output. Two separate secrets were generated on the server; secret files use mode 600 in a mode 700 folder. The pilot is enabled with a daily soft allowance of 100. No invite was sent or printed.

External Windows HTTPS verification passed with certificate validation enabled: 200 on https://slideready.xyz, HTTP 308 redirect to HTTPS, no-store and the expected CSP/referrer/content-type headers. Direct public TCP 3100 was unreachable. Only Caddy publishes TCP 80 and 443. The app container is healthy. The public page and English/Chinese language switch passed in the in-app browser.

One authorized connection test through the public HTTPS path passed with deepseek-flash. An unauthenticated probe returned 401; a valid private invite returned 200 with Secure, HttpOnly, SameSite=Strict cookie; the signed probe returned 200. Secrets and session values were not printed. The fixed probe sentence was absent from both container logs. This does not replace a hosted review-failure privacy check or a provider-retention guarantee.

The Alibaba console opened to sign-in; no signed-in external browser was available. Its actual firewall rule list was not read. External HTTP, HTTPS and SSH connectivity verify those allowed paths; blocked port 3100 does not prove all other cloud rules. The console rules still need confirmation. The cloud-init hold and fwupd update remain as recorded above. Full hosted deck review, failed paid-call privacy, school Wi-Fi/mobile access and the formal design/accessibility lane remain open. No automatic claim that Stage 6 is complete is made.

## Final server checks, 5 October 2026

Reviewed application commit: 8ca557abd86f0ea70b34c4dec2a0c86e2554383c. These results supersede the pending container, DeepSeek and Ubuntu checks in the historical sections below. The app remains offline. No invite was sent.

The final Linux image built on the Hong Kong server from committed build inputs only. No local environment file, provider key, school file or evidence folder was transferred. The retained image is slideready:8ca557abd86f0ea70b34c4dec2a0c86e2554383c (manifest sha256:c5a1b5612e743a1a57d5055e37c9123cd905911c39ffa9a39c01345c77d6fa12). Test folder: /opt/slideready-check-8ca557a.

The private HTTPS container test passed before and after the OS restart. It checked static assets, private access, non-root app, read-only filesystems and a test marker absent from logs. It used fake secrets, no AI key and loopback ports only. Cleanup left no running app containers or public web listeners. This does not verify the public domain certificate or a paid provider failure on the hosted app.

The user approved Ubuntu updates, restart and firewall changes. Updates installed, the server restarted into kernel 6.8.0-63-generic, package audit returned no faults, and Docker is active and enabled at boot. UFW is active with incoming traffic denied by default and TCP 22, 80 and 443 allowed for IPv4 and IPv6. Fresh SSH login passed. No further ordinary upgrades remain; cloud-init and fwupd were kept back. A follow-up simulation showed cloud-init is explicitly held and fwupd needs new dependencies. The cloud-init hold was not overridden: this controls cloud boot/network setup, and its installed version is older than a security-repository version. Check Alibaba guidance before changing that hold. This is an unresolved server maintenance item, not a fully patched-server claim. Alibaba cloud firewall rules have not been checked in the console. Docker published ports need separate care because they can bypass UFW; the app service must publish no ports.

Fresh production dependency audit: zero advisories. The high-signal scan of 118 tracked files returned no secret matches. The earlier dev-only braces warning remains open. The final code checks remain 224 unit tests, 36 browser tests, types and lint passing; no application code changed in this follow-up.

The user approved one paid independent source-code review. DeepSeek reasoner reviewed committed src, deploy, Dockerfile, next.config.ts and package.json, without keys, school files or local evidence. It returned one retained low-severity claim about error.tsx using retry. This disagreed with the GPT review. Installed Next 16.3.8 documentation explicitly uses retry; its error-boundary types expose retry and reset, and its history says retry became stable in 16.3.0. The finding is rejected on that evidence. No code change is needed. Raw findings remain in ignored evidence/deepseek-release-approved.json.

Lower-confidence DeepSeek notes were also checked: .dockerignore exists and excludes secrets (it was omitted from the review payload); the daily limit is documented as optional and must be set to 100 for the pilot; malformed authenticated reviews can consume that soft allowance before validation; HSTS is not configured. The worker-CSP concern is not reproduced by the passing production browser extraction tests, but those tests do not prove support in every browser. These are recorded limits or optional improvements, not new verified release blockers. No hard spending-cap claim is made.

Verdict: the approved server preparation and independent review are complete. No supported blocking code finding remains in the reviewed scope. This is not a claim that the full release gate or Stage 6 has passed. A formal design/accessibility audit was not run because its project setup is absent. GPT was used for the available security/deep review; Claude and /ultraview did not run. Public HTTPS, hosted paid-call failure privacy, cloud firewall console checks and school network access still need verification. Provider retention and the earlier intermittent JSON failure remain separate limits.

## Access fixes, 5 October 2026

The user approved fixes for both release findings. Valid and failed invites now use separate 20-per-minute allowances with fixed map keys. Invalid or malformed requests do not spend the valid-invite allowance. A separate cap permits at most 20 active invite body reads. Each slot is released in finally; timed-out reads are cancelled.

Connection tests apply rate and concurrency admission before body reading. They allow at most six active tests globally and two per signed session. One combined deadline/disconnect signal covers body reading, the provider request and the provider response. Body timeouts return safe 408 errors; disconnects return 499; provider timeouts retain 504. All exits release admission. Existing provider-call daily allowance and output checks remain in force.

Regression tests failed before the changes and passed after them. They check invalid-attempt isolation, valid invite limits, stalled bodies, client cancellation, early rate admission, session/global concurrency, timeout cleanup and provider-failure cleanup. Final checks: 224 unit tests, 36 browser tests against a fresh production build, types and lint passed. Independent GPT code review found one missing invite concurrency guard; it was added and re-reviewed with no remaining blocking issue in these changes.

The local Docker rebuild stalled and Docker status also stopped responding. Only the build/status processes started for this task were stopped; Docker Desktop was not restarted. No successful final Linux image or HTTPS container test is claimed for these changes. Rebuild and repeat that check before deployment. The app remains offline, with no new AI calls or remote app changes. Separate permission for the DeepSeek source-code review and the other release/hosting checks remain pending.

## Release checks and Docker setup, 5 October 2026

Reviewed app commit: 8400291. At that check, the recommendation was NO-GO for deployment. The subsequent fixes are recorded below. The app has not been deployed and no invite has been sent.

### Server result

SSH host identity was checked against the user's Alibaba Workbench fingerprint. SSH key login passed. Namecheap's authoritative DNS now returns 8.210.219.205 for slideready.xyz. Docker Engine 29.8.2 and Compose 5.6.0 were installed from Docker's official Ubuntu repository. Docker is active and enabled at boot. The hello-world test passed. No app container is running. Only SSH and local DNS sockets are listening. UFW reports inactive; cloud firewall rules still need console verification. Ubuntu updates, including security updates, remain pending; no full OS upgrade was made in this step.

### Findings to fix before deployment

- P2: src/lib/server/access.ts:89 uses one 20-per-minute invite counter before token verification. Twenty invalid requests make the next valid invite return 429. A local test reproduced this. Separate admission for valid invites from bounded failed attempts without creating unbounded per-token storage.
- P2: src/lib/server/access.ts:103 reads the probe body before rate admission and before its timeout starts. An authorized incomplete request remained pending beyond the configured 10 ms timeout in a local test. Apply admission and an abortable timeout before reading the body, and release admission on every exit.

These findings affect availability. The reviewed paths showed no supported private-key disclosure, auth bypass, executable model output or server-side lesson storage. These are code-review findings, not guarantees against all attacks. Production code was not changed in this check.

### Checks run

- 215 unit tests passed; 36 browser tests passed against a fresh production build. Types and lint passed.
- Two local reproduction tests confirmed the findings. They used invented secrets, no provider key and no AI call. Tests stay under ignored evidence/.
- Local scan of all 118 tracked files found no high-signal secret pattern. This is not a scan of every historical Git blob or a proof that all possible secrets are absent.
- Repomix packed 46 committed app/config files after disabling the ignored parent-folder filter. Its secret check found no suspicious file. The packed source stays local.
- AgentShield project scan produced 537 findings. All 525 lockfile credential findings point to sha512 package-integrity values, not credentials. The other 12 are generic development CLAUDE.md prompt-defense checks, not findings in the app's production model prompt. No changes were made automatically. An earlier default scan included unrelated global plugin settings; those are not app release findings.
- The fresh dependency check recorded earlier today reported zero production advisories. Five development package entries stem from one braces advisory. The affected packages were absent from the built standalone image. The warning remains open; no unsafe forced downgrade was made.
- Static LLM checks found bounded input/output, a fixed provider endpoint, no model tools, data-only slide instructions, strict source/output checks, request limits, review concurrency limits and safe error codes. Prompt instructions cannot guarantee semantic correctness. The probe timeout finding remains open. The daily allowance is an in-memory guard, not a hard provider spending cap.
- Static security/deep review used the available GPT reviewer. No claim is made that Claude or /ultraview ran. Metrics and bounded operational logs are the current observation method; no third-party payload capture was added.

### Checks pending or not run

- DeepSeek independent source-code review was rejected by automatic approval review: prior permission covered slide text, not disclosure of private source code. No source was sent. A separate user approval request is pending. Cross-model agreement or disagreement cannot yet be reported.
- Formal Impeccable audit was not run: its project context setup is absent. Browser language/flow tests passed, but this is not a new full accessibility audit. No frontend code changed in this deployment preparation.
- Remote HTTPS, cloud firewall rules, server security updates, paid-call failure privacy, provider retention and school Wi-Fi/mobile tests remain open.

Source for Docker setup: https://docs.docker.com/engine/install/ubuntu/

## Domain and dependency checks, 5 October 2026

The user purchased slideready.xyz at Namecheap. deploy/site.env.example now uses that domain, and the setup guide has the exact A-record values. Compose configuration passed with blank example secrets. No DNS change or remote setup was made by the agent.

The user reported the A record updated. Subsequent queries to two public resolvers and both Namecheap authoritative nameservers still returned 162.255.119.160, rather than 8.210.219.205. This is a recorded check, not a permanent DNS status. Verify again before deployment.

Fresh npm audit --omit=dev reported zero advisories. The full audit reported five high-severity package entries from one development-only braces advisory, GHSA-vfj7-8cjw-p6xm, through the Next.js ESLint tooling. npm ls braces confirmed that path. A scan of the built standalone image found none of the five flagged packages. The advisory lists no patched version. No forced dependency downgrade was applied. Keep the development warning open and do not feed untrusted pattern inputs to those tools. This check does not audit container OS packages or replace the full release gate.

Source: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

## Hong Kong server preparation, 5 October 2026

The user created an Alibaba Cloud Simple Application Server in Hong Kong: public IP 8.210.219.205, Ubuntu 24.04, 2 vCPUs, 4 GiB memory and 50 GiB disk. No remote connection or deployment has been made. The user now owns slideready.xyz at Namecheap. DNS routing and SSH access are pending.

Docker, Compose and Caddy files are ready. The Linux image builds with Node 24. Linux npm ci found missing optional lockfile entries; four entries were added without changing any existing package version. The app runs as a non-root user with a read-only filesystem and memory-only temporary folders. Its build context excludes secrets, evidence and school files.

The local HTTPS container test passed. It checked static assets, private access, secure cookies, security headers, read-only filesystems and a test sentence absent from logs. It used invented secrets and no AI key. No AI call was made. Caddy obtains the local certificate asynchronously; the test now waits for HTTPS startup and does not retry product assertions. Final checks passed: 215 unit tests, 36 browser tests, types and lint. An independent review found no blocking deployment-file issue; its invite-guide clarification was applied.

See docs/deploy.md for setup and rollback, and docs/pilot.md for the private invite draft. These local checks do not pass the full release gate, remote HTTPS or school-network checks. Stage 6 remains incomplete.

## Follow-up: review and JSON check, 5 October 2026

The user reported review complete and approved three minor Chinese wording changes. Prompt slideready-review-0.5 uses clear replacement-word instructions (应改用 or 应使用), avoids repeated ease wording, and calls a correction finding 纠错建议. The local review copy has the approved wording. Raw model reports remain unchanged.

The old word-use failure was an inner model-text JSON parse failure: usage was present and the provider envelope was read. Each rejected response used 111 output tokens against an 8192-token limit. The rejected text was not saved. Its exact syntax defect cannot now be established. There is no evidence that increasing the output limit would fix it.

Checks with unchanged prompt 0.4 and deepseek-flash:

- Three direct word-use calls passed.
- One direct invented corpus run passed all 17 cases.
- Three full production HTTP app runs passed all 51 cases, with no retry.
- Baseline report: evidence/corpus-app-0f7a8b5e-5961-484f-8798-a83e62e963dc-run-3.json.

After the approved Chinese changes, three full production HTTP app runs again passed all 51 cases, with no retry. Final report: evidence/corpus-app-2558e0be-3f8d-48b4-91d4-cf727dbace58-run-3.json. Both trials also saved run 1 and run 2 before moving on. Earlier failed reports remain intact.

These tests pass the latest automatic corpus gate. They do not prove a root-cause fix for the historical intermittent failure. Recovery predates the wording change; do not credit that change for recovery. No model switch, added retry, JSON repair or relaxed validation was introduced. Access, rate, size, concurrency, timeout and output limits remain unchanged.

Fresh checks: 215 unit tests, 36 browser tests, types, lint and a production build passed. Temporary diagnosis scripts caused two lint errors; they were archived as text after diagnosis, and final lint passed. Diagnosis reports contain only invented source, stay local and are excluded from Git. No school slide text was sent in this follow-up. An independent review found no supported production defect or justified parser repair.

The supplied review pack is approved by the user. Do not invent a separate statement from the user's wife or approval for later unseen model outputs. Live reports label their newly generated outputs as pending human review.

## Reliability work: 5 October 2026

- Strict validation returns safe reason codes. The response never includes a raw provider error, source quote or rejected finding.
- Prompt slideready-review-0.4 has invented clean-text and combined-correction examples, plus a final source check.
- The provider request sets temperature 0 in non-thinking mode. This is a test setting, not a reliability guarantee.
- An invalid batch gets at most one automatic retry. The retry has a fixed reminder based on validated reason codes. It sends the same source, not the rejected response.
- Access, rate, size, concurrency, timeout and output limits stay unchanged.
- An invalid finding fails its whole batch. No finding is silently removed, relabelled or approved.
- Results from valid batches stay available. Recovered invalid attempts retain safe reason codes and usage in memory.
- Reports have unique filenames. Real-deck reports omit lesson text, explanations, suggestions and filenames. They are excluded from Git.

## Code checks

- Final unit suite: 215 tests passed.
- Browser suite: 36 tests passed against a fresh production build.
- Type checks, lint and production build passed.
- An independent code review found one test-report defect: corpus evidence was saved only after all three runs.
- The fix saves each completed corpus run before checking it. A failed run stops later paid runs. Three regression tests verify failure, later sign-in failure and success ordering.
- No production defect was found by the independent review. This is not a model-quality approval.

## Fixed comparison before the retry change

The five previously failed batches were tested three times through the private HTTP app path. One of 15 cases remained failed. Three invalid attempts reported UNCHANGED. Automatic checks found no changed numbers or negation in accepted edits. Human meaning review remains pending.

Report: evidence/target-comparison-1791174252674.json. Both the prompt and sampling setting changed. Do not credit temperature alone for any improvement.

## Real-deck coverage check: PASS

All five permitted files contain 205 slides. Three consecutive full runs used the production app, normal signed sessions and /api/review.

- Run 1: 205 reviewed, 0 failed, 0 skipped, 0 cancelled. Two automatic retries.
- Run 2: 205 reviewed, 0 failed, 0 skipped, 0 cancelled. Two automatic retries.
- Run 3: 205 reviewed, 0 failed, 0 skipped, 0 cancelled. Two automatic retries.
- All six rejected first attempts reported UNCHANGED. Each allowed retry returned a valid result.
- No changed number, symbol or negation was detected by the automatic screens.
- Review time for all five decks was about 20.4, 21.3 and 22.1 seconds per run. The test waited 65 seconds between runs to respect the normal request-rate limit.
- Total input tokens: 408,699. Output tokens: 5,686. Cost remains unknown because the price tier is unset.
- Coverage and simple protected-token screens do not prove correction meaning or Chinese quality.

Reports:
- evidence/decks-app-780cc423-d23e-4c4e-8f59-3e14056816a7-run-1.json
- evidence/decks-app-780cc423-d23e-4c4e-8f59-3e14056816a7-run-2.json
- evidence/decks-app-780cc423-d23e-4c4e-8f59-3e14056816a7-run-3.json

The earlier strict full runs failed different batches. Their reports remain intact: evidence/decks-app-first-run.json and evidence/decks-app-report.json. The older direct-model evidence/decks-report.json contains local school text, stays excluded from Git and is not proof of the app path.

## Earlier live corpus check: FAIL (retained history)

The corpus has 17 invented cases. Its new multi-element case requires both grammar changes in each repeated error box and no finding on the clean neighboring boxes.

The recorded three-run trial had 49 passes out of 51 cases. Two word-use cases failed after both attempts returned invalid JSON. The failed review also missed the required correction. Run 1 passed 16 of 17; run 2 passed 16 of 17; run 3 passed 17 of 17. The combined-context case passed all three runs.

No false or wrong correction was detected by the automatic checks on accepted results. That does not prove meaning across real lessons.

Report: evidence/corpus-app-1791174882061.json. It contains invented source and both explanations for human review. It contains no school lesson text or key.

This trial ran before the corpus stop-rule defect was fixed. The final runner now saves each run separately and stops at the first failure. Unit tests verify that change. No extra paid run was made to replace the failed evidence or obtain a green result.

The previous plan reached its stop condition. The user then authorized this follow-up to investigate the JSON failure and apply the Chinese review notes. The unchanged model passed the fixed checks. No stronger mode or model was introduced without evidence that it is needed. The earlier failed trial remains part of the record.

## Human review: supplied pack approved

The user reported the supplied review complete on 5 October 2026. The agreed roles were: the user checks English, the user's wife checks Chinese, and DeepSeek supplies an additional check. Record the user's actual approval; do not invent a separate reviewer statement.

A local review pack is evidence/human-review.md. It contains invented cases, expected intent, all distinct recorded outputs and the runs that produced them. It records failed outputs as failed. It is excluded from Git.

For real decks, review the app results in memory. Check clear errors, missed errors, optional benefits, numbers, names, academic demand, equal caution and Simplified Chinese terms. Do not write school source or findings to a review file merely to collect approval.

A reviewer's name alone is not approval. The user has now approved the supplied pack. Later unseen model outputs have not been approved merely because the previous pack passed.

## Privacy and pilot limits

The browser reads the original PPTX locally. The app sends editable text, IDs and settings through its server to DeepSeek. It does not send the original PPTX, filename, media, speaker notes or document metadata.

The app does not write lesson content or findings to files or logs. Provider policy is separate. Do not promise that no data is stored anywhere. Keep development evidence out of Git and deployment images.

Browser checks cover privacy and both app languages. They do not prove provider retention or production logging settings. Local timings do not prove Guangzhou school network speed.

The optional daily allowance is shared by probe and review. Invalid numbers deny calls. Blank or absent values disable it. It is an in-memory soft guard and resets when the process restarts.

## Work still required

- Keep the historical intermittent JSON issue open until its cause is established. Current automatic checks pass; no root-cause fix is proven.
- Check later model outputs and real-deck meaning as needed. The supplied review pack is approved.
- Hosting, rollback and pilot guides are prepared. Use them for the remote setup.
- Complete the remaining release lanes noted above. Keep the earlier development dependency warning open.
- DNS, SSH, Docker, Ubuntu updates and UFW are verified. Check the Alibaba cloud firewall in the console.
- Get publication approval, then check the final HTTPS path and Guangzhou school networks without a VPN.
- Prepare Wayne's private link and an admin invite that is easy to share. Offer a demo on the user's computer. Do not send an invite yet.
