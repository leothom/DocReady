# Named invites implementation plan

> For agentic workers: use superpowers:subagent-driven-development or executing-plans, with tests and independent review.

Goal: deliver the approved private admin page, named teacher invites and durable usage accounting.

Architecture: preserve Next.js and the review pipeline. Add node:sqlite on a persistent Docker volume, named invite authorization and a separate admin password/session. No lesson content is stored.

Spec: docs/superpowers/specs/2026-10-14-named-invites-design.md

## Constraints
- 90-day invites, default 20 provider calls/invite/day, global 100/day, Hong Kong dates.
- 7-day teacher sessions bounded by invite expiry; 8-hour admin sessions.
- Daily usage 365 days, request ledger 30 days. No raw links, lesson text or filenames stored.
- Replace/revoke invalidates sessions. Legacy shared invite disabled at cutover.
- Ruling: branch codex-named-invites because existing branch codex blocks codex/ names.

## Review focus
- Deletion during dispatch must not recreate personal records or refund global allowance.
- Concurrent retries must not double-dispatch or exceed durable quotas.
- Admin auth never accepts teacher session cookies.
- Unknown provider usage is never zero; dates are Hong Kong dates.
- Missing database/configuration fails closed.

## Tasks
1. Store: src/lib/server/store.ts and tests/unit/store.test.ts. SQLite migrations, invite token hashing, CRUD, admin sessions, durable transactional reserve/finish, review IDs, daily stats/retention. Tests for restart, revoke, concurrency, delete-in-flight, quota and unknown metrics.
2. Admin: src/lib/server/admin.ts, src/app/api/admin/[...path]/route.ts, src/app/admin/page.tsx, src/components/admin-panel.tsx and admin CSS. Password login, CSRF/origin checks, throttles, list/create/edit/revoke/rotate/delete and bilingual daily/weekly stats. Unit and browser tests.
3. Integrate: access.ts/runtime.ts/review.ts/client.ts/use-review.ts/transport.ts and session/review-start routes. Named invite cookies, session status before review, server review IDs, per-attempt IDs, durable dispatch accounting, private access notice. Test public denial, duplicate attempts and retry handling.
4. Operations: deploy volume, admin password setup/reset script, privacy copy, HSTS and docs. Test Linux image with temporary fake secrets and persistent data volume; verify no raw content in DB/logs.
5. Release: unit/type/lint/build/browser suite, dependency audit, secret scan and independent security reviews. Fix blocking findings; commit and push. Back up production config, stage new image, set owner credentials privately, disable old invites at cutover and verify HTTPS/admin/public denial. Keep fallback paid access disabled if rollback needed.

Each task uses a failing targeted test before implementation, reruns it, and is reviewed before release. Root coordinates interfaces and performs final end-to-end checks. No additional design approval is needed: user approved implementation and release.
