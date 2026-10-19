# Stage 5: teacher review screen

Status: Stage 5 is complete. Final tests and both code-review fixes pass. Stop for user review.

## Teacher controls

Choose a subject and student TOEFL level. Default: 3.0. Both controls use 0.5 steps.
Choose a PPTX and read its editable text locally. Start a review with valid settings.
See real batch counts, slide coverage, corrections and optional enhancements.
Accept, Ignore, Undo, and Copy text. Accept does not change the PPTX.
Cancel reading or review. Completed suggestions survive review cancellation.
Retry failed batches with the same file and settings. Changed settings require a new review.
Clear the session. A new file or review asks before removing recorded choices.
Download feedback to this computer. No feedback is sent to a server.

## Languages

The screen, form, actions, messages, coverage, errors, page title and fallback pages support English and Simplified Chinese.
Only the locale is saved, under slideready.locale. The old locale key is migrated and removed.
Blocked storage does not block a language change for the current session.
The switch uses the two model explanations already returned.
Source text, suggested English, settings, progress and choices stay unchanged. No extra AI request is made.
The app file button is translated. The native file chooser follows the computer's language.

## Privacy

The original PowerPoint stays local. Editable text, IDs and settings go through the app server to DeepSeek.
The app holds text, results and choices in memory. It does not persist lesson content.
The provider's policy is separate. This is not a promise of universal zero storage.
Copy and feedback download are explicit teacher actions.
Feedback contains aggregate coverage, suggestion and decision counts, timings, token counts, model and prompt versions, and settings.
It excludes lesson text, suggestions, explanations, filename, finding IDs, source hashes and keys.
Download URLs are revoked.

## Checks

Stage 5 tests use invented PPTX text and intercepted AI responses.
No real lesson or paid model call is used. Stage 4 has the earlier live connection evidence.
Tests check cancellation, pending-request reset, replacement confirmation, language changes during reading and review, TOEFL controls, clipboard success/failure, feedback omission, invalid files, image-only files, partial/failed results, safe errors, optional suggestions, keyboard actions and blocked storage.
English and Chinese layouts are checked at 1280 and 320 CSS pixels.
These checks do not prove model accuracy on real lessons or human approval of all Chinese explanations.

## Final evidence

- Unit tests: 146 passed.
- Browser tests: 31 passed.
- Type check, lint and production build: passed.
- Production npm audit: 0 findings.
- Final code review: no Critical issue; two Important issues fixed with failing tests before the fixes.
- Fixed private invite handling during development Strict Mode.
- Fixed restart after cancellation when settings differ from the earlier review.
- Stage 4 retry count issue is fixed.
- One Minor issue remains: mixed Chinese and English original text is marked as English for a screen reader. This can use the wrong voice. The text itself is unchanged.
- Actual framework-error triggering was not tested in a browser. The fallback component was checked in both languages, and the current local Next.js error API was read.
- General real-model and Chinese-explanation quality, ZIP/XML audit repetition, school access, provider policy and release readiness were outside this Stage 5 review. Earlier Stage 2 parser tests still pass.

## Release work

Production audit: no findings at the Stage 5 check.
Development audit: 5 package alerts from one braces issue in the lint dependency chain. This alert existed before Stage 5. It is absent from production dependencies. Review it before release.
Review quality, school access, provider policy and private remote hosting are Stage 6 checks.
The current link works only on this computer. Nothing is deployed.

## Try it here

Run npm run dev. Open http://localhost:3100/.
Use npm run invite if a private invite is needed.
Choose a subject and PPTX, then select Review English. Extracted text goes to DeepSeek and can incur API cost.
A demo on this computer is available. Wayne's private remote link comes in Stage 6.
