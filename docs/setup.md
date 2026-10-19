# Local DeepSeek setup

1. Run npm run setup:local if .env.local does not exist.
2. Open .env.local in the repo.
3. Add your key after DEEPSEEK_API_KEY= and save the file.
4. Keep the key out of chat and Git. Do not add NEXT_PUBLIC_ to its name.

The permanent key is used only by the app server.

## Start the local app

Run npm ci once. Run npm run dev, then npm run invite. Open the printed link on this computer.

Choose a subject and student TOEFL level. Select a PPTX to read its editable text locally. Review English sends that text through the app server to DeepSeek. These are paid API calls.

The app does not write lesson text, findings, request bodies or provider error bodies to logs or files. DeepSeek's data policy is separate. Local tests do not prove Guangzhou access or universal zero retention.

## Live tests through the app

Start the local app first. The tests use APP_ORIGIN from .env.local. It must be a local host. The private test helper exchanges the invite secret for an ordinary signed session. It does not bypass app checks.

Run the invented corpus in PowerShell:

```powershell
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.live.config.ts tests/live/accuracy.test.ts
```

This makes up to three runs of the 17 invented cases and can make one retry per failed batch. Each run is saved before the next. A failed run stops the corpus trial. The report separates automatic checks from pending human review. It keeps invented text and both explanations for that review.

For the five permitted real files:

```powershell
$env:SLIDEREADY_TEST_DECK_DIR='C:\Users\leoht\Downloads\TestPPT'
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.live.config.ts tests/live/real-decks.test.ts
```

Use that folder only while all five files have permission for AI review. The test sends extracted text through the app route. No original PowerPoint file is sent.

The real-deck test requires three consecutive full runs. It waits 65 seconds between runs to respect the normal request-rate window. It saves each run before checking it and stops on failure. Failed extraction, incomplete review or a changed number, symbol or negation makes the test fail. Reports exclude lesson text and filenames. Human quality review remains separate.

The live suite runs test files in sequence to respect shared app limits. Do not run it at the same time as the browser suite. The browser suite builds and starts its own production server on port 3100.

Each report has a unique filename under evidence/. Earlier failed evidence is kept. The local evidence/human-review.md pack contains invented cases for the user and the user's wife. The user approved the supplied review pack on 5 October 2026. This does not approve later unseen model outputs. See docs/stage-6.md for current results. Reports are excluded from Git under evidence/. Keep that folder out of deployment images. Do not use the earlier direct-model reports as proof that the app path passed.

Source: https://api-docs.deepseek.com/


## Hong Kong server

The server setup and rollback steps are in [deploy.md](deploy.md). The private trial guide is [pilot.md](pilot.md). Deployment is pending domain and SSH setup, the full release check and final hosted checks. Local test success is not proof of school network access.
