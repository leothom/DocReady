# SlideReady: named teacher invites and usage

Date: 14 October 2026
Status: proposed design for user review

## Purpose and agreed scope

Leo wants a private admin page on SlideReady. Each teacher receives a separate named invite link by default. Teachers open a link without a login. Leo can see which invite codes are used over time, control access and protect the paid AI account.

Usage identifies a code, not a verified person. A forwarded link counts under its original name. No claim will be made that the named teacher personally made each request. No email is sent automatically.

## Proposed defaults (builder decisions, open to user correction)

- Admin route: /admin. One owner account, protected by a strong password.
- New teacher invites: active for 90 days, with a configurable daily limit of 20 provider requests per invite. A review can use several requests and retries. The form explains this unit.
- Global daily limit: retain the current 100 provider requests, made durable. It applies to reviews and connection tests together.
- Daily counters follow Asia/Hong_Kong calendar dates. The change from UTC is stated in release notes.
- Keep daily usage for 365 days. Keep invite names and access records until Leo deletes them. Revoke and delete are distinct actions.
- Keep recent request records for 30 days for reconciliation. Aggregate daily totals remain for 365 days.
- Admin sessions expire after 8 hours; teacher sessions after 7 days or the invite expiry, whichever is earlier.
- Keep the existing site's English and Simplified Chinese support on the new screens.

## Admin experience

After login, show active invites, requests today and estimated AI cost. List each invite name, status, expiry, first use, last use, reviews started, slides successfully reviewed and request usage. Include invites with zero use.

Create invite asks for a teacher name, with expiry and daily limit under optional settings. Show the complete link once and offer Copy link. Store only a cryptographic hash of the random invite token. The raw link is not recoverable later; Replace link creates a new token and invalidates the old link and its sessions. Do not put teacher names in links.

Each invite has a details page with daily and weekly activity for 7, 30, 90 or 365 days. Counts and cost have clear units. Include failed requests and unknown cost separately. Copying a link never sends a message.

Controls: create, rename, change expiry/limit, revoke, replace link, and delete invite plus its identifiable activity history. Confirm destructive actions. Renaming keeps the same invite ID and history. Revocation takes effect on the next request. Requests already sent to DeepSeek may finish and incur cost.

Deletion blocks new requests immediately and removes the invite name and identifiable history. Consumed global allowance remains as totals without an invite link, so deletion cannot reset the spending guard. An active request may finish, but its completion must not recreate the deleted invite or identifiable usage records. Its reserved global allowance remains consumed; unresolved cost stays unknown.

Do not include a CSV export, staff email directory, teacher password system or public registration in this release.

## Teacher experience

The invite remains in a URL fragment (#invite=...). Remove it from the address bar before exchanging it for a secure session cookie. Never log it. Exchange creates a session bound to one durable invite ID and generation. Every paid endpoint checks that invite's current active state, expiry and generation on the server.

Public visitors can read the site, but see 'Private invite required' before starting an AI review. Server checks remain the authority even if the visitor changes browser code or calls the API directly. Expired, revoked or invalid links give a clear message to contact Leo. The public page must not expose the invite list or admin usage.

Teacher notice: 'Usage totals are recorded for this invite. Slide text and suggestions are not saved by SlideReady.' Provide this in both languages and update Privacy with retention periods and the operator contact. Keep DeepSeek's separate policy clear. Do not imply zero data retention everywhere.

## Usage definitions

- First/last use: first and latest admitted review start, not a page visit or invite activation. Record invite activation separately if useful for operations; do not label it a review.
- Review started: one server-issued review ID, created when the first valid batch is admitted. Client reuses it for all batches and retries in the same review.
- Review completed: all declared batches have terminal server-recorded outcomes. Partial reviews are reported separately; a closed browser is not a completed review.
- Slides reviewed: unique successful slide numbers per review ID. Retries do not count a slide twice. Repeating the same file as a new review counts as a new review; the server does not store or identify files.
- Requests: each actual provider attempt, including retries and connection tests. Show attempted, failed and in-flight/unknown outcomes separately.
- Tokens: provider-reported input, cached input and output tokens. Missing usage is unknown, never zero.
- Cost: estimate from a versioned provider price table and a displayed RMB planning exchange rate. Show unknown-cost request counts. This is not an invoice or a spending guarantee. Verify current provider rates before release.

Only store an internal invite ID, review ID, request ID, slide numbers/counts, timestamps, status/error codes, token totals and cost-estimate metadata. Never store file names, slide text, suggestions, request bodies, user agents or IP addresses in the usage database. Counts show activity, not staff performance or teaching quality.

## Storage and request handling

Use SQLite on a dedicated Docker data volume for this single-server deployment. Preserve the read-only container root and non-root app user. Choose a maintained SQLite driver compatible with the deployed Node runtime during implementation; no provider network dependency is required for counters.

Tables cover invites, server-side admin sessions, reviews, request ledger, daily per-invite aggregates and global daily accounting. Use schema migrations, transactions, uniqueness constraints and bounded retention cleanup. The database contains personal names and must have restricted file permissions. Database failure blocks paid calls rather than bypassing limits. No multi-replica deployment without shared storage and tested locking.

Validate access, origin, size and request schema before consuming paid allowance. Then atomically reserve both invite and global allowance immediately before dispatch. Record a request as dispatching before the outbound call. A crash can leave an uncertain attempt; keep that reservation consumed rather than risk double spending. Malformed requests consume neither paid allowance nor a provider call. Apply separate bounded abuse throttles before expensive work.

Use a stable client request ID per batch attempt plus a server-side uniqueness constraint. Duplicate requests must not make another paid call. A retry that intentionally starts another provider attempt gets a new attempt ID and consumes allowance. Do not persist results for replay: if the response is lost after success, report 'result unavailable' and require an explicit new attempt. Preserve this rule across restarts.

Quotas are per invite and global, not per cookie. Opening more sessions cannot increase them. Persist the counters across restarts. Missing or invalid production quota configuration fails closed. A configurable limit bounds provider input size and output tokens; daily request limits are not a hard RMB cap. Explain that limitation in the admin page.

## Admin and access security

Owner password is set through a server-side setup command, never committed or printed. Store a salted strong password hash. Use a separate admin session cookie, with HttpOnly, Secure, SameSite=Strict and a restricted path where feasible. Admin session tokens are random and hashed in SQLite. Rotate on login and revoke on logout. No admin secret in URLs, browser storage or bundles. Provide SSH-only password reset that revokes admin sessions.

Rate-limit login failures and session creation with bounded storage and short body deadlines. Do not trust a client-supplied forwarding header for client identity; configure the trusted proxy boundary explicitly. Avoid a single failure counter that lets one visitor permanently lock out the owner. Enforce same-origin requests and CSRF protection for admin writes. Do not enable CORS access to admin APIs.

Preserve CSP, no-referrer and no-store headers. Add HSTS at the HTTPS proxy after testing HTTPS. Keep private invite tokens and session cookies out of app/proxy logs, analytics, errors and screenshots. Retain a server-side emergency switch to stop paid calls.

## Migration and release

Existing live commit: d0f69510bc6cc5c069fcabf3c9b970a917dfb0b6. Server access verified as root using the existing key; no key change was needed. Current limit is 100 requests, stored in process memory.

Create and verify the owner password and database before enabling the new routes. Test a new invite with invented text. At cutover, reject the legacy shared invite and legacy sessions. Notify Leo that existing teachers need new links; never silently keep an unmetered legacy path. Leo distributes the new links. Do not distribute them automatically.

Before migration, take a private configuration backup. After migration, back up the database before schema upgrades and document restore. Retention deletion must include any new database backups; do not place the database in Git, public artifacts or logs. Do not create an indefinite backup schedule in this release.

Rollback must not restore access through the old shared invite. If the new system fails, disable paid access until restored. Do not deploy the old in-memory access system with AI enabled as an automatic fallback.

## Required checks

1. No invite, forged session, expired invite, revoked invite and cross-origin calls cannot reach a mocked provider.
2. Teacher sessions cannot read or change admin data. Admin login, logout, expiry and password reset work.
3. Link replacement invalidates the old link and sessions. New sessions cannot bypass invite quotas.
4. Concurrent requests cannot overrun invite/global allowances. Restart preserves counts and revocation.
5. Invalid request bodies consume no provider allowance. Missing configuration or database failure denies paid use.
6. Retry and duplicate-request tests verify exact provider call counts and slide deduplication. Lost-response/crash outcomes show unknown cost honestly.
7. Usage screens show never-used invites and correct Hong Kong daily/weekly totals.
8. Inspect the database and logs after synthetic success/failure tests: no lesson text, file name, raw token or secret is retained.
9. Desktop/mobile, keyboard access, bilingual UI, public invite notice, admin screen privacy and existing teacher workflow pass browser checks.
10. Run the repository release gate before publication, including dependency and security review. Verify live unauthenticated rejection, HSTS and one controlled invited review without exposing secrets.

## Limits

A forwarded link still works until expiry, revocation or allowance exhaustion. Per-person identity would need a separate identity check. No automatic staff performance score is produced. This design is for a small school trial on one server, not a public multi-tenant service.
