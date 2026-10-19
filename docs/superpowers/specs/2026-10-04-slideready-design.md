# SlideReady: first working version

> Current decision, 5 October 2026: The user approved DeepSeek instead of Qwen. Keep the key on the server. Keep the original PPTX in the browser. Future extracted-text reviews use browser -> server -> DeepSeek, with no application persistence or body logging. Provider policy is separate. This decision replaces the older provider, temporary-key and server-content restrictions below. Mainland hosting is a later requirement and is not deployed. Stage 1 and local Stage 2 passed. Stage 3 rules are approved. Stage 4 review engine is implemented. The user approved Stage 5. Stop after Stage 5 for review. Stage 6 is not authorized. See docs/stages-1-3.md for current evidence and rules. The app stores only its language choice under slideready.locale.

Status: Stages 1 to 5 are implemented. Stage 5 checks pass. Stage 6 is pending. Nothing is deployed.

## Purpose

Help teachers check English and improve access to lesson content. Keep the subject meaning and academic terms. Wayne's request for correct English in teaching materials is the starting point.

The teacher selects a subject, sets the student TOEFL level, selects a PPTX file, and reviews findings by slide. Use one main screen. Use the name SlideReady and the line: Make every slide ready to teach.

## Agreed scope

- Use Next.js, TypeScript, and Tailwind CSS.
- Support English and Simplified Chinese throughout the app from the first release.
- Use a Hong Kong server. School permission for this location is assumed, as requested by the user.
- Use Qwen through Alibaba Cloud Model Studio in Beijing. Start with qwen3.7-plus-2026-05-26, subject to the live connection and quality tests.
- Read the PPTX in the browser. Send extracted text and slide context directly to Qwen if the live test passes.
- The server supplies the app, checks the invite, and issues temporary API keys. It must not receive slide text or review results in this design.
- Keep the permanent API key on the server. Never include it in browser code.
- Give Wayne a private link that he can share with other admins. Anyone with that link can use the app. No user accounts.
- Offer a demo on the user's computer. Do not send an invite until the user asks.
- Use slideready.co if the user obtains the domain. Domain purchase is outside this plan.

## Privacy boundary

Browser-to-model access is a test requirement, not a confirmed capability for the selected endpoint. Alibaba documents temporary browser keys, but endpoint access, browser cross-origin checks, key expiry, and structured output need a live test.

Read files and hold findings in browser memory. Do not write lesson content to localStorage, sessionStorage, IndexedDB, a service worker cache, a database, or app logs. The only localStorage value is the language choice, under `slideready.locale`; it contains `en` or `zh-Hans` only. Export a feedback file only when the teacher selects Download feedback. Clear app references on reset and revoke download URLs. Do not claim secure erasure of browser or operating system memory.

The original PPTX must not be uploaded. Notes, images, and document metadata must not be sent to Qwen. Send only editable slide text and the context needed for review.

Alibaba's mainland privacy notice states that it stores data from model calls. No claim of universal zero storage is permitted. Temporary keys do not change the provider's data policy. Hosting access logs and access cookies are also separate from lesson content.

Proposed copy, only after verification: Your PowerPoint file stays on your computer. Extracted slide text goes to the AI service for review. SlideReady does not save your slide text or results. The AI service's data storage policy applies.

If direct calls fail, stop that part of the build and report why. Do not silently send content through our server. A relay that does not save content would be a separate design decision.

## Review rules

- Subject options: Business, Economics, English, Mathematics, Science, Humanities, Other. Require a choice.
- TOEFL values: 1.0 to 6.0 in steps of 0.5. Default: 3.0. Keep the number field and slider in sync.
- Use ETS level descriptors as broad context. Do not treat a score as a word list, sentence limit, or comprehension guarantee. Do not show CEFR in the main screen.
- Corrections cover spelling, grammar, punctuation, and word usage. Prefer silence when an expression is acceptable.
- Enhancements cover clarity, simpler explanations, student access, vocabulary support, and instruction clarity. All enhancements are optional.
- Keep academic terms, formulas, proper names, units, negation, and task demands.
- Recognize headings, bullet fragments, dialect variants, quoted examples, and deliberate grammar exercises.
- A complete review with no findings is a successful result. A failed or incomplete review must not show a clean result for missed content.
- Accept keeps a suggestion in the current session. It does not edit the PPTX. Support Ignore, Undo, and Copy text.

## Extraction and service limits

Initial limits are engineering choices for the pilot. They must be tested on real files.

- File: at most 25 MiB. Slides: at most 150. Extracted text: at most 150,000 characters.
- ZIP entries: at most 5,000. XML part: at most 5 MiB. Total expanded XML: at most 50 MiB. Count bytes during expansion; do not trust ZIP headers.
- Support ordinary text boxes, nested grouped shapes, and table cells. Use presentation relationships to find display order. Do not sort slide filenames.
- Retain paragraph breaks, shape IDs, shape names, table row and column, and useful surrounding slide text.
- Report skipped images, SmartArt, charts, equations, speaker notes, embedded objects, and text inherited from masters or layouts. Do not claim their content was checked.
- Report each unreadable slide. Show found, reviewed, failed, and skipped slide counts separately.
- Review up to 5 slides or 12,000 characters per batch, whichever comes first. Never divide a text element. A larger single slide is a single batch up to the deck text limit.
- Use at most 2 concurrent model requests. Set a 60-second timeout per attempt and at most 1 retry for a recoverable failure. Allow Cancel.
- Use non-thinking mode if supported by the pinned model. Verify the request settings. Use strict JSON Schema, no tools, no web search, and no file API.

## Result contract

Each slide has a display number and extraction status. Each element has a stable elementId, native shapeId, optional table coordinates, and exact original text.

Each finding contains slideNumber, shapeId, elementId, reviewType, category, originalText, suggestedText, explanation, confidence, and optional. `explanation` is an object with two required non-empty strings: `en` and `zh-Hans`. The app adds its own stable finding ID. The model produces both explanations in the same review call. They must explain the same finding and use the same level of caution.

Use separate correction and enhancement categories. optional must be false for a correction and true for an enhancement. confidence is an internal model estimate from 0 to 1, not a measured probability. Do not display it as certainty.

Validate output in the browser. Each finding must point to a supplied element. originalText must match that element exactly. Reject extra fields, invalid categories, duplicate findings, unchanged suggestions, and mixed optional flags. Malformed batch output gets one retry; a second failure marks that batch incomplete.

## Interface and pilot

### App languages

- Provide a visible language switch labelled English / 简体中文. Keep the SlideReady name in both languages. Translate its tagline.
- Translate every app-owned text item: subject labels, field labels, actions, category labels, progress, warnings, errors, empty states, counts, privacy text, help, accessible names, page title, and not-found/error pages. Render server and parser error codes through the same message catalog.
- Use two checked-in, typed message catalogs. Do not call a translation API for fixed app text. Do not add a translation service, CMS, or language routing package for two languages on one screen.
- First use the saved language choice. Otherwise, use the first supported browser language: English maps to `en`; `zh`, `zh-CN`, `zh-SG`, and `zh-Hans` variants map to `zh-Hans`. Fall back to English. A teacher can change the choice at any time. If preference storage fails, the switch must still work for the current session.
- Switching language must keep the selected file, subject, TOEFL value, progress, findings, and Accept/Ignore decisions. It must not repeat a review or make an AI request. All batches return both explanation languages, so switching during a review is safe.
- Preserve original slide text exactly. Suggested English text stays in English. This feature translates the app and its explanations; it does not translate the PowerPoint. Mixed-language source content must not be translated or silently removed.
- Keep subject IDs, category IDs, and JSON keys stable in English. Translate their visible labels only. Feedback export keeps stable machine keys, records the selected locale, and uses translated labels in any user-facing report. It still excludes lesson text.
- Set the page language correctly. Use system fonts that can display Simplified Chinese. Test Chinese line wrapping and readable buttons on narrow screens. Use complete messages with placeholders for counts, not English word fragments joined together.
- Require the same functions and privacy notice in both languages. Review Chinese translations and AI explanations for meaning, academic terms, and tone before the pilot. Check both languages in automated tests and real model tests.

### Main flow

Use a light page, one restrained accent, readable system fonts, and little motion. Do not add a marketing landing page, dashboard, model controls, or extra setup screens.

Show real stages: Reading slides, Reviewing English, Preparing recommendations. A file that stays local must not show Uploading presentation. Show actual completed batch counts if useful. Do not show a made-up percentage.

Show corrections and optional enhancements by slide. Provide a short coverage notice. Never display provider errors or raw stack traces to teachers.

Collect timings, token usage, coverage, and Accept/Ignore counts in browser memory. A downloaded feedback file contains these values plus prompt and model versions. It excludes lesson text and filename by default. Treat decisions as usefulness signals. Do not claim to measure unique or repeat users without a separate method.

Test at least five teacher-supplied decks, including two messy decks and one deck with 40 to 80 slides. Measure speed from Guangzhou. Target a full 80-slide review within 2 minutes; this is a pilot target, not a promise. Record results if the target is missed.

## Out of scope

No accounts, CMS, database, analytics service, queue, OCR, PDF, Word, translation of slide content, lesson generation, visual scoring, automatic PPTX edits, or numerical quality score. Translation of the app into Simplified Chinese is in scope.

## Sources checked on 4 October 2026

- ETS scale and mappings: https://www.eu.ets.org/toefl/institutions/ibt/score-scale-update.html
- Qwen model and prices: https://help.aliyun.com/zh/model-studio/qwen3-7-plus
- Structured output: https://help.aliyun.com/zh/model-studio/qwen-structured-output
- Temporary browser keys: https://help.aliyun.com/zh/model-studio/application-obtain-temporary-authentication-token
- Mainland privacy notice: https://help.aliyun.com/zh/model-studio/privacy-notice
- Domain and hosting limits: https://help.aliyun.com/zh/dws/user-guide/transfer-a-domain-name-to-alibaba-cloud/
- Presentation structure: https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.presentation
