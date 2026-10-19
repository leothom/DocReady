# Named invites and owner access

Open `/admin`. Use the owner password saved privately on the owner's computer. Teachers do not use this password.

1. Select **New teacher invite**. Enter a name.
2. Keep the default 90-day expiry and 20 requests per day, or change them.
3. Save and copy the link. The complete link is shown once. Send it yourself.
4. Select a teacher name to see daily or weekly activity.

Replace link stops the old link and its sessions. Revoke stops access without removing history. Delete removes the name and its history. Global counts remain, so deletion does not restore spent allowance. Old shared invites no longer work after this release.

Counts describe a link, not a verified person. A forwarded link counts under its assigned name. Counts do not measure teaching quality. Teachers see a usage notice before review.

## Limits and data

The required `PILOT_DAILY_LIMIT` is the global daily request limit. Production uses 100. All browsers, invites, retries and connection checks share this limit. The day starts at midnight in Hong Kong. This replaces the previous in-memory counter. A reserved request stays counted after a crash or uncertain result. The request limit is not a fixed currency cap.

SQLite lives at `/data/slideready.sqlite` in the Compose `app_data` volume. Invite tokens and owner sessions are hashed. The owner password is salted and hashed. No original file, filename, lesson text, AI result, IP address or browser identity is stored in this database. Keep the volume private. Do not run `docker compose down --volumes` in production.

Recent request records last 30 days. Daily totals last 365 days. Names remain until deleted. Cleanup runs at startup and during use. Unused review IDs expire after one hour and are capped at 20 per invite. A deleted invite's database pages are cleared and its WAL is checkpointed. If external backups exist, remove those copies under the same retention policy.

Estimated cost shows known provider usage only, with unknown requests counted separately. RMB uses a stated planning rate of 7 RMB per USD. If `DEEPSEEK_PRICE_TIER` is not configured, cost is unknown. Use the DeepSeek bill for actual spending. Do not treat the displayed known subtotal as a complete bill.

## Owner password setup or reset

Stop the app before reset. Pass a new password on stdin to a one-off app container running `node scripts/admin-setup.mjs`. Do not put the password in command arguments, shell history, Git, or chat. Use the production Compose project and its existing data volume. The script saves `/data/admin-password.hash` with mode 600 and removes old owner sessions. Start the app and check HTTPS again.

For a consistent backup, stop the app and copy the private data volume to restricted storage. Restart the app immediately. Treat the copy as personal data. A restored older database can restore revoked links and older quotas; after restore, keep the app offline until access and counters are reconciled. Do not roll back to the old shared-link release with AI enabled.

## Checks before release

Run unit, type, lint and browser checks. Build the Linux image. Run `scripts/test-deployment.mjs` with that image on an isolated Compose project. It uses fake credentials, no AI key, and separate volumes. Confirm public API rejection, owner separation, named access, durable quotas, duplicate rejection, link revocation, reset and HTTPS headers.

The app records safe request outcomes and counts for operational checks. It does not add a third-party error tracker or content logging. There is no separate owner-action audit trail in this single-owner release.
