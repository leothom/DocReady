# Approved Email Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give listed department email addresses immediate access while preserving profiles, limits and owner controls.
**Architecture:** Add a private SQLite email-to-invite association. Public email entry issues the existing signed session for an approved active profile. Existing invite, paid-route and owner authentication controls remain authoritative.
**Tech Stack:** Next.js App Router, TypeScript, React, node:sqlite, Zod, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-10-15-approved-email-access-design.md (approved 15 October 2026).

## Global Constraints

- Exact normalized approved addresses at sendelta.com only. No inbox verification, password or extra teacher step.
- Private staff list never enters Git, browser files, logs, images or external model reviews.
- Seven-day sessions; new profiles 90 days and 20 provider requests/day; global 100 per Hong Kong day.
- Re-entry cannot reset counters, renew expiry or restore revoked/deleted approval.
- Keep English and Simplified Chinese, current green UI, owner isolation, and private invite compatibility.

## Review Focus

- Concurrent sign-ins and case variants share one profile.
- Owner revoke, restore, delete and re-import cannot silently reopen access.
- Invalid attempts cannot consume paid quota or grow unbounded database/rate records.
- Delayed sign-in responses and blocked in-flight requests cannot expose stale access.
- Staff address data stays private at setup, runtime, browser, Git and model-review boundaries.

### Task 1: Durable approved profiles

**Files:** src/lib/server/store.ts, src/lib/server/email.ts, tests/unit/email-store.test.ts.
**Interfaces:** normalizeSchoolEmail(value):string|null; Invite gains optional email; InviteStore.approveEmail(email):Invite (idempotent, no revive), emailInvite(email):Invite|null (active only), restoreInvite(id):void. listInvites includes email for owner only. Import uses approveEmail and owner API, not direct SQLite writes.
- [ ] Add failing tests for exact matching, mixed case, duplicate approval, restart, migration from schema1, quotas after re-entry, revoke/restore/expiry, cascade deletion and re-import while revoked.
- [ ] Implement schema2 email_invites table with unique email/inviteId and foreign-key cascade. Preserve previous schema1 data. Reject future schema versions.
- [ ] Run focused and full unit tests; inspect no raw token or sample lesson content stored.
- [ ] Commit durable profile changes with tests.

### Task 2: Public access and owner API

**Files:** src/lib/server/access.ts, src/lib/server/admin.ts, src/app/api/access/route.ts, tests/unit/email-access.test.ts.
**Interfaces:** accessService.email(request):Promise<Response> consumes {email}, returns {ok:true} plus existing secure cookie; 400 INVALID_REQUEST;403 EMAIL_NOT_APPROVED;429 TOO_MANY_REQUESTS;503 NOT_CONFIGURED. Admin POST /api/admin/emails consumes {email} and returns {invite}; POST /api/admin/invites/:id/restore explicitly restores, preserving expiry/usage.
- [ ] Write/run failing HTTP tests for sessions, unapproved/domain/format rejection, origin/content type, teacher/admin separation, paid-call isolation, stalled body, repeated invalid clients and revoked access.
- [ ] Share session creation with existing invite route. Body max2048B, deadline5s, max10 active. Fixed/bounded per-client hashes (trusted Caddy header), global success limit120/min, separate failures so invalid floods cannot spend valid allowance. No address in rate-map keys/logs.
- [ ] Authenticate and validate owner writes before approval/restore. Preserve expiry and quotas; rollback on storage failure.
- [ ] Run unit/type/lint checks and commit.

### Task 3: Teacher and owner UI

**Files:** src/components/teacher-review.tsx, src/components/email-access-form.tsx, src/components/admin-panel.tsx, src/app/admin/admin.css, src/app/globals.css, src/components/privacy-policy.tsx, tests/e2e/email-access.spec.ts, tests/e2e/invite.spec.ts, tests/e2e/admin.spec.ts.
- [ ] Add browser tests first: anonymous email form, approved direct upload, rejected contact route, retry/network failure, keyboard/phone/bilingual flow, valid sessions/invites skip entry, and owner add/restore.
- [ ] Add one email field and Start reviewing button, inline states, usage notice, mailto:Leo@sendelta.com. Keep upload area hidden until ready; feedback flow unchanged. No address in URL/localStorage.
- [ ] Add owner approved email form, email labels, restore action and existing expiry/daily-limit controls. Document address-based usage, not verified identity.
- [ ] Update bilingual Privacy. Run browser suite and inspect phone/desktop screenshots. Commit UI.

### Task 4: Integration, private list and release

**Files:** docs/approved-email-access.md, scripts/test-deployment.mjs, local private setup utilities outside repository.
- [ ] Import private file through authenticated owner API; never put it in archive or model payload. Validate21 unique inputs before sending. Use fake examples in committed tests.
- [ ] Full unit/type/lint/build/browser checks, isolated Linux migration/restart/access tests and independent security review. Fix supported findings before release.
- [ ] Run release gate; record unavailable tools honestly. Commit, back up private database before schema upgrade, push/merge and deploy tested image preserving existing data/secrets.
- [ ] Live public denial plus temporary approved test profile; delete that test profile. Import21 staff addresses and confirm count without signing in as colleagues or making model calls under their names.

## Execution decisions

- User approval to proceed covers implementation of the approved design; no second plan approval is requested.
- Work in the clean existing checkout on a feature branch. Do not create a new worktree or copy secrets.
- The public route grants a session directly; no teacher link or inbox step is needed.
- Native Git branch `codex` already exists, so use `codex-approved-email-access` rather than conflicting `codex/...`.
