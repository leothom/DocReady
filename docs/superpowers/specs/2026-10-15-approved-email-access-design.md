# SlideReady: immediate access for approved school emails

Date: 15 October 2026
Status: design for approval. No product code changed.

## Purpose and user decisions

Teachers can get access on the public website without asking a colleague. Immediate access is the priority. The user supplied 21 approved department email addresses at sendelta.com. There is no email verification, password, separate registration page, staff code or additional private registration link.

This checks the address entered, not the person's identity. Anyone who knows an approved address can use it. Usage identifies an address/profile, not a verified person. Keep this limit clear in owner documentation. Do not describe this as verified school membership.

## Teacher experience

On the existing start page, a visitor without a valid session sees one labelled field, **School email**, and one button, **Start reviewing**. Use the established simple green design. English and Simplified Chinese are supported.

Trim spaces and compare emails without case sensitivity. Accept only an exact approved address at sendelta.com. Domain matching alone does not grant access. Do not transform dots, plus-addresses, other domains or partial matches into approved identities.

An approved active address receives a secure teacher session and the same page immediately shows the PowerPoint upload controls. No AI call is made to get access. A valid session skips the email form on later visits. Sessions retain the existing seven-day maximum, bounded by profile expiry.

An address outside the approved list sees **For access, email Leo@sendelta.com.** Make the address a mail link. A malformed address gets an inline validation message. A blocked or expired profile gets the same contact route. Do not promise that mail has been sent.

Teacher notice, shown next to the email form: **Your email and usage totals are recorded. Slide text and suggestions are not saved by SlideReady.** Translate the notice. Update Privacy to explain the approved email list and purpose.

Builder choice: this route grants the session directly. It does not expose an invite token in the address bar or require teachers to copy a private link. The email form is available again when the session expires. Existing private invite links continue to work.

## Profiles, usage and owner controls

Keep one durable profile per normalized approved email, using a unique database constraint and a transaction. Concurrent sign-ups and later browsers reuse that profile, its request allowance, its expiry and its history. New sessions never reset counters.

Owner admin can add an approved email, view its usage, and stop or restore its access. Use existing profile controls for expiry and daily limits. New profiles use the current defaults: 90 days and 20 provider requests per day. The existing global limit remains 100 per Hong Kong day. Expired profiles are not automatically renewed by typing the email again.

Revocation and removal from the approved list block email entry and existing sessions on their next request, including private links belonging to that email profile. A teacher cannot restore a revoked profile through public entry. Only the owner can restore it. Keep a blocked record unless the owner explicitly deletes personal data.

Deleting an email profile removes its email approval, identifying history and active access together. Re-entering that address does not recreate access. Re-adding it later is an explicit owner action. Preserve consumed anonymous global allowance on deletion.

Email profiles are labelled by their email in the private admin page. Existing manually named invites keep their current history; do not guess an identity or merge records based on similar names. The owner can revoke redundant manual invites. No automatic email or staff message is sent.

## Storage and abuse controls

Store approved addresses and their profile associations only in the private server database. Do not commit the supplied staff list to Git or embed it in browser JavaScript, public responses, logs, deployment images or review requests to external models. The design and tests use invented examples. Import the 21 addresses through a private setup file or authenticated admin tool. Import is idempotent and never revives revoked access or resets quotas.

Keep existing origin checks, request limits, secure cookies, per-profile and global request accounting, duplicate handling and session-generation checks. Add a bounded body deadline, size/schema checks, concurrency cap and bounded abuse throttles to the public email entry route. Do not create new database rows for arbitrary unapproved addresses. Avoid a single invalid-attempt counter that blocks all valid department users.

An attacker can test whether a known address is approved because success grants immediate access. This is part of the chosen no-verification trade-off. Do not expose the complete approved list or other users' usage. AI spending stays limited by existing request and token limits. Email addresses are never sent to DeepSeek with slide text.

The owner retains emails until removal/deletion. Existing 30-day request and 365-day aggregate retention rules apply. SQLite migrations preserve all existing invites, sessions and usage. Missing configuration or database failure blocks access. No email provider is required.

## Required checks and release

- All 21 normalized addresses import once; mixed case and outside whitespace match correctly. Test samples in Git are invented.
- Unapproved addresses, lookalike domains, subdomains, malformed bodies and foreign origins do not get a session or paid access.
- Concurrent entry makes one profile. Multiple sessions, repeat entry and restart preserve quotas and history.
- Revocation, expiry, approval removal and deletion cannot be undone by email entry. Access changes also block delayed requests and existing sessions.
- Owner endpoints remain private. No complete email list, raw token, school slide text or owner secret appears in public output, logs or review payloads.
- Both languages, keyboard operation, small screens, valid invite links, and the existing review flow pass browser checks.
- Run the normal release gate and an isolated container check before publication. Test live access with an owner-controlled temporary approved address. Do not enter a colleague's address for a live test or send unsolicited email.

Implementation and publication follow approval of this design. The user has not yet approved this written description.
