# Engine reliability — v1.48.2

## Follow-up fixes (2026-09-08)

Training key generation now requires a registered key returned by the server. It uses Lovable's authenticated admin endpoint, with a missing-route fallback to the Python endpoint. Static hosting, authentication failures, timeouts, and malformed responses cannot generate a local replacement or report success. Previous saved keys remain accessible but unverified; newly issued keys are scoped to the original account. Clipboard failures are reported honestly, and prompts copied from Pages retain an explicit training-server placeholder. English and Georgian are selectable.

Chapter duration estimates use each chapter's word count independently, eliminating cumulative overcounting and `NaN` displays. The Python translation endpoint runs in the thread pool and rejects unchanged source, wrong-script text, truncated Gemini responses, and failed post-edits. Long inputs are bounded per provider call while retaining paragraph boundaries. If a middle chunk fails, accepted chunks are returned separately with `success: false` and no completed translation; offline word-substitution drafts remain suggestions for review.

A real-provider outage exposed the original-source success bug. The legacy route test now uses stable provider fixtures while exercising the real endpoint and post-editing code; dedicated regressions simulate outages, truncation, partial failure and long input. The JavaScript suite contains 24 tests. Separate backend hosting remains required: Pages cannot run the training or Python APIs.

Translation jobs now retain accepted chunks until every chapter and the separate translated edition have been saved. A failed middle chunk leaves the job resumable; it cannot turn a partial chapter into a completed book. Georgian source books produce English editions, and English source books produce Georgian editions.

## Changes

- Full checkpoints live in IndexedDB. A small localStorage index discovers interrupted jobs. Checkpoints are scoped to the original account and invalidated when source text, translation settings, glossary, or active pack version changes. Web Locks prevent duplicate translation of the same book in two tabs where supported.
- Pause aborts provider requests. Late responses cannot commit, and an account switch stops the job. Source chapters remain separate from translations; previous translations are retained when replaced.
- The selected translation depth controls the LLM draft/review/refinement pipeline. Required review failures and incomplete provider output are rejected. Current Gemini selections are preserved; retired 1.5/2.0 selections migrate to 2.5 Flash.
- Script validation covers both target languages and Georgian Mtavruli. Text chunking has a hard bound even for a single long unbroken sentence.
- OCR and audio transcription preserve source wording. Missing text is marked for review instead of guessed. Mathematical operators, historical Georgian letters, and printed capitalization are preserved. These rules apply to browser, Python, and Lovable OCR paths.
- Text repair processes the full chapter in bounded chunks and creates editable proposals. The review dialog shows source and proposal side by side; accepting retains source history and marks existing translations stale.
- Cloud chapter saves use upsert before removing obsolete trailing chapters. Existing chapter IDs and linked audio records survive ordinary saves. Local and cloud save failures propagate to the translation job. This is **not** a transaction spanning the book and all chapter requests; transactional server writes and multi-device conflict resolution remain future work.
- Books merge by stable ID and revision timestamp instead of title and chapter count. Language metadata is saved consistently.
- Python and TypeScript training promotion compare every benchmark case, so improvements elsewhere cannot hide regression of a previously good case. Cloud rule-pack prompts and intentionally empty packs now load correctly.
- Georgian ElevenLabs requests use v3. Edge speech dependency updated to 7.2.8; Georgian preview generation passed after the prior 6.x dependency returned HTTP 403. TTS chunks always obey the configured size bound.
- Python transcription runs in the thread pool, and its root page serves the current studio. Closed dialogs no longer expose their controls to keyboard/screen-reader navigation. `scripts/sync-studio.mjs` synchronizes the embedded Lovable studio; CI checks prevent drift.

## Verification (2026-09-07)

Upstream integration preserves the full studio, account settings, voice presets, provider fallbacks, and training guide. It retains the newer database connection reference and compatible Supabase API-key handling. The studio iframe now occupies a stable React position when switching pages, preserving active jobs; hidden frames are inert to keyboard interaction. Legacy book language metadata takes precedence over the old default-English database column.

- `node --experimental-strip-types --test tests/engine-reliability.test.cjs tests/training-gate.test.mjs`: 17 tests passed.
- `.venv/Scripts/python -m pytest tests/test_engine_reliability.py tests/test_deep_regression.py tests/test_training_api.py tests/test_georgian_phonetics.py -q`: 53 tests passed, including Georgian Edge voice preview generation. Provider and framework deprecation warnings remain.
- `python tests/test_georgian_integrity.py`: passed. Historical source-presence assertions were updated where they required the destructive behavior removed in this release. Behavioral fixtures provide the stronger regression checks.
- Existing auth/recovery, book/PDF, and Moon Reader suites passed. Some legacy tests simulate behavior rather than executing the production functions; they do not replace the new regression suite.
- Lovable production build and `npx tsc --noEmit`: passed. Build reports existing plugin/deprecation warnings.
- Browser: real IndexedDB checkpoint retained Georgian text and missing-chunk markers after reload; correction acceptance and rejection worked; current studio loaded with hidden dialogs excluded from its accessibility tree.
- Live Supabase: read-only connection and existing chapter metadata structure verified. No production books, schema, or storage objects were changed during this verification.

## Deployment and practical limits

The root `index.html` and `static/` are the canonical Pages studio. After editing them, run `node scripts/sync-studio.mjs`; use `--check` in CI. Merging to `main` triggers the existing Pages deployment workflow. Python backend changes require updating its deployed environment separately with `pip install -r requirements.txt`. No schema migration is required for this release: proposal and translation metadata use the existing chapter metadata fields.

Old localStorage jobs did not retain their partial chunks. Those missing outputs cannot be recovered; retrying creates a full new checkpoint and retains existing source text. Clearing browser storage still removes local checkpoints. Jobs resume in the browser; this release does not turn them into a durable background server worker.

These checks establish recovery and source-integrity behavior. They do not establish translation accuracy for an entire book, Georgian speech recognition WER, or narration pronunciation quality. Paid LLM output was mocked in regression tests. A held-out Georgian/English corpus, native-speaker evaluation, long-audio segmentation, transactional saves, and a broader visual redesign remain separate improvements.

Provider references: [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations), [ElevenLabs models and Georgian support](https://elevenlabs.io/docs/overview/models), [Edge TTS releases](https://github.com/rany2/edge-tts/releases).
