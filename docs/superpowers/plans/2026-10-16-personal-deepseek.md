# Device DeepSeek key implementation plan

Approved flow: approved teacher email, normal upload page, optional collapsed personal-account setting. Test a supplied key before saving locally. Restore it on subsequent visits. Replace/remove explicitly. Never fall back to school billing on personal-key failure.

Architecture: localStorage on this origin, no identity association; request-scoped key headers to the fixed DeepSeek endpoint; existing authentication, quotas, and timeouts stay in force. Keys never enter the usage database, review bodies, URLs, results, or logs. No server key storage or provider selection.

- [x] Add failing server tests for personal probe/review, invalid keys, unauthorized use, no fallback, and request isolation.
- [x] Add shared key validation/headers, per-request checker selection, and safe personal-key error codes.
- [x] Add local storage hook and bilingual account panel with test-before-save, cancellation, replace/remove, and storage failure handling.
- [x] Freeze account per review; retries cannot silently switch accounts. Stop further batches after personal credential failure.
- [x] Update privacy and explain that usage totals include both payer types; existing limits apply.
- [x] Add browser tests for reload persistence, routing, removal, invalid key, failed replacement, storage failure, Chinese and phone layout.
- [x] Run unit, type, lint, production build and browser checks. Fresh independent review before final handoff. Do not publish without a release request.

Rulings: keep current usage limits for both accounts. Existing admin cost is total estimated provider use, not a school invoice; clarify this without changing the database. No new dependencies. Approved design makes further brainstorming unnecessary.

Verification: 298 unit tests passed; typecheck and ESLint passed; production build passed through Playwright. Full browser run passed 73 of 74; the older blocked-storage test was updated to explicitly remove the unknown saved-key setting, then both language tests passed. All 74 browser cases are covered by passing runs. The 11 new personal-key browser cases include cross-tab cancellation. Desktop screenshot inspected; phone overflow checked in Chinese. Independent reviewer found no actionable issue. Provider calls were mocked; no paid personal-key live test was run. No deployment or push performed.
