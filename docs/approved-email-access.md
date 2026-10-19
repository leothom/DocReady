# Approved school email access

The public start page accepts an exact approved school email address. It grants a teacher session immediately, with no password or inbox step. This does not verify who owns the address. Usage belongs to the address/profile entered, not a verified teacher.

## Owner controls

Open `/admin` and use **Approve school email** to add an address. The server normalizes surrounding spaces and letter case. Only exact addresses at `sendelta.com` are accepted. A matching domain alone does not give access.

Each email has one profile, initially valid for 90 days with 20 provider requests per Hong Kong day. Re-entering or re-importing the address reuses its profile, expiry, history and limits. The shared global limit remains in force. An email-entry request does not call the AI provider.

Use **Revoke access** to block the profile and all its sessions/links. Use **Restore access** to remove the block explicitly. Restoration does not change expiry or reset usage; edit expiry separately if needed. Deleting the profile also removes its email approval and identifying history. Public entry cannot recreate a deleted approval. An owner can explicitly approve the address again later. Consumed global allowance remains.

Manual invites keep their existing profiles and history. The app does not merge a manually named invite with a similar email. Revoke a redundant manual invite if you need one access route for that teacher.

## Private setup

The initial department list is a restricted local file outside this repository. Import it through the authenticated owner API: `POST /api/admin/emails` with `{email}`. Never place the real list in source, tests, Git archives, Docker images, browser files, logs or model-review requests. An import should report only counts. Existing approvals are not revived or renewed by this endpoint.

Unlisted visitors see **For access, email Leo@sendelta.com.** The app sends no email. Do not test production by entering a colleague's address. Use a temporary owner-controlled test profile, then delete it.

## Storage and rollback

SQLite schema2 adds an email-to-invite association. Existing invites, sessions and daily counters are preserved. The private data volume contains personal email addresses. Existing retention and deletion rules also apply to these profiles. Update any private backup policy accordingly.

Stop the app and make a restricted database backup before upgrading. Do not start an older schema1 release against schema2, or restore an old backup with AI enabled. Keep paid access off until restore, revocation and quota records are checked. No third-party mail provider is needed.
