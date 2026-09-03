# Changelog

## 2026-09-05 — v1.46.1: Camera Autofocus, Image Upscaling & Publication-Grade Book PDF

### Added & Fixed — Publication Book PDF Generator (`static/app.js`, `index.html`)
- **Eliminated Random Symbols / Mojibake**: Replaced standard ASCII 8-bit PostScript `times` font in jsPDF with `html2pdf.js` and browser-native Unicode text rendering using Google Fonts (`Noto Serif Georgian`, `Noto Sans Georgian`, `Sylfaen`, `Georgia`). All Georgian Mkhedruli characters (`ა-ჰ`), archaic letters, quotation marks (`„…“`), and em dashes (`—`) now render with 100% crisp fidelity and ZERO random symbols.
- **Book Edition Layout**:
  - Publication Title / Cover Page: Centered title in 32pt serif, author, edition metadata, language, chapter count, and export date.
  - Table of Contents (სარჩევი): Automatically generated chapter outline with section indicators.
  - Page-Break-Before on Chapters: Each chapter now starts cleanly on its own page (`page-break-before: always`).
  - Book Typography: Justified text alignment (`text-align: justify; text-justify: inter-word`), 2em paragraph indentation, running book headers, and running page numbers.
  - Dual Export: Direct instant PDF download via `html2pdf.js`, plus a high-resolution print window fallback for 300 DPI vector printing / PDF saving.

### Added & Fixed — Camera Autofocus & Preprocessing (`static/scanner.js`, `index.html`)
- **Continuous Camera Autofocus**: Added `focusMode: 'continuous'`, `exposureMode: 'continuous'`, and `whiteBalanceMode: 'continuous'` to `getUserMedia` video constraints with up to 4K resolution request.
- **Hardware Native Photo Capture (`ImageCapture` API)**: In `shoot()`, uses `ImageCapture.takePhoto()` to trigger the physical camera sensor at full hardware resolution (8MP/12MP+) with optical pre-shutter autofocus, instead of capturing downsampled video preview frames.
- **Interactive Tap-To-Focus**: Tapping on the camera preview now directs camera autofocus to the tapped coordinates (`pointsOfInterest`) and renders a smooth animated focus ring.
- **Blur Detection & Super-Resolution Upscaling**: Computes Laplacian edge variance; if an image is blurry ($< 140$), automatically upscales $2\times$ using bicubic smoothing and applies a 2-pass high-contrast unsharp mask (`super_res` variant).
- **EXIF Auto-Orientation**: Uses `imageOrientation: "from-image"` in `blobToBitmap` so uploaded phone gallery photos are automatically oriented correctly.

### Improved — Server-Side Vision OCR Deductions (`lovable-app/src/routes/api/ocr.ts`)
- **Blur & Degradation Recovery**: Instructs the vision model to use linguistic context, vocabulary, and letter stems to deduce and reconstruct faint, blurry, shadowed, or degraded words rather than dropping text.
- **Georgian Character Discrimination**: Explicitly guides the model to distinguish visually similar Georgian letter pairs (ვ/პ/კ, შ/წ/ჭ, რ/უ/ყ, ქ/ფ, თ/ძ/ხ).

## 2026-09-05 — v1.46.0: Bidirectional Translation & Robust Transcription Engine

### Added & Fixed — Transcription & OCR Repair (`static/scanner.js`)
- **Resolved Silent Character Erasure**: Replaced the incomplete 12-character OCR substitution map with a full 26-letter Latin + digits + symbol map (`i`, `l`, `1`, `|` → `ი`, `r` → `რ`, `d` → `დ`, `s` → `ს`, `u` → `უ`, `v` → `ვ`, `x` → `ხ`, `k` → `კ`, `w` → `წ`, `y` → `ყ`). Unmapped characters are no longer silently deleted.
- **Soviet-Era Cyrillic OCR Leakage Rescue**: Added look-alike recovery for Cyrillic characters emitted by Tesseract on vintage Georgian prints (`с` → `ს`, `р` → `რ`, `у` → `უ`, `х` → `ხ`, `в` → `ვ`, `т` → `თ`, `д` → `დ`, `б` → `ბ`, `г` → `გ`).
- **Smart English Compound Hyphenation**: Protected hyphenated compound words (`well-known`, `state-of-the-art`, `self-conscious`, `twenty-five`) during paragraph unwrapping in `cleanPageText` so words are not corrupted into single unhyphenated tokens (`wellknown`).
- **Print Ligature Resolution**: Added normalization for print ligatures (`ﬁ` → `fi`, `ﬂ` → `fl`, `ﬀ` → `ff`, `ﬃ` → `ffi`, `ﬄ` → `ffl`).

### Added & Fixed — Bidirectional Translation (`static/app.js`)
- **Dynamic Source Language Detection (`detectTextLang`)**: Translation endpoints and AI prompts now automatically detect whether the source text is English or Georgian, eliminating hardcoded `sl=en`.
- **Bidirectional AI Translation Prompts**:
  - `English → Georgian`: Injects Georgian Language Mastery Rules (`getKaRulesForPrompt()`).
  - `Georgian → English`: Injects English Literary Translation Rules (mapping Georgian verbal aspect/screeves, handling polypersonal agreement, enforcing natural English SVO syntax, and translating idioms).
- **Dynamic Machine Translation Endpoints**: `translateChunkLocal` and `translateSingleSentence` now dynamically parameterize `sl=${sourceLang}&tl=${targetLang}` across Google Dict-Chrome-Ex, Google GTX, and MyMemory endpoints.
- **Target Language Guard**: Ensured `refineGeorgianGrammar()` only runs when `targetLang === 'ka'`, preventing Georgian morphological rules from corrupting English translations.

### Added — Georgian Linguistic Knowledge Base v1.46.0 (`static/georgian-linguistics.js`)
- **Everyday Verb Paradigms (KA-128 / Fix 4.113)**: Added person-marked present and aorist paradigms for 10 high-frequency everyday verbs previously left untranslated: *take* (`იღებს`/`აიღო`), *give* (`აძლევს`/`მისცა`), *open* (`აღებს`/`გააღო`), *close* (`ხურავს`/`დახურა`), *work* (`მუშაობს`/`იმუშავა`), *live* (`ცხოვრობს`), *buy* (`ყიდულობს`/`იყიდა`), *sell* (`ყიდის`/`გაყიდა`), *wait* (`ელოდება`), and *understand* (`ესმის`).
- **Question Auxiliary Frames (KA-128 / Fix 4.113)**: Fixed stranded English question auxiliaries: *"do you know"* → `იცი?`/`იცნობ?`, *"will you come"* → `მოხვალ?`, *"can you help me"* → `შეგიძლია დამეხმარო?`, *"what do you want"* → `რა გინდა?`, *"how are you"* → `როგორ ხარ?`, *"why not"* → `რატომ არა?`, *"where do you live"* → `სად ცხოვრობ?`.
- **Core Adjective-Noun Collocations (Fix 4.113)**: Added native Georgian adjective agreement for common noun phrases (*big house*, *small dog*, *new car*, *old man*, *very good*, *beautiful day*, *long road*).
- **QA Rule 3.127 (`question_auxiliary_untranslated`)**: Added automated validation flagging untranslated English question auxiliaries in Georgian translations.

## 2026-09-05 — Unique accounts, hardcoded admin, and the Training Lab (trainable engine)

### Added — auth hardening (`src/routes/auth.tsx`, `supabase/external/003_training.sql`)
- Emails are normalised (trimmed + lowercased) before sign-up/sign-in and the database now
  enforces `unique (lower(email))` on `profiles`, so **one account per email address**.
- Sign-up validates the address shape and requires a password of >= 8 chars with a letter and
  a digit; Supabase's "masked" duplicate response (a user with zero identities) is detected and
  turned into "that email already has an account - sign in instead".
- Friendly messages for wrong credentials / unconfirmed email / rate limits, plus a
  **Resend confirmation link** button and a "Back to sign in" escape on the confirm screen.
- `handle_new_user()` now also grants the `admin` role to the hardcoded owner account
  `ananiadevsurashvili@gmail.com` (and the migration back-fills it for the existing user).

### Added — Training Lab (admin only, `/training`)
The engine can now be trained by LLMs **without ever touching application code**.
- `src/routes/_authenticated/training.tsx` - admin-only page (non-admins are redirected):
  live pack status/score, "Train now" runs, training-key management, benchmark editor,
  version list with one-click **rewind**, and full session/iteration history.
- `src/lib/engine-pack.ts` - the whole trainable surface: five data-only item types
  (`glossary`, `autofix`, `qa_rule`, `prompt_block`, `ocr_fix`), a strict validator
  (regex safety, length caps, no lookbehind/backrefs, no code in prompt blocks), a
  deterministic applier, QA runner, prompt-addendum builder, benchmark evaluator and the
  "is this an improvement" gate.
- `src/lib/training.server.ts` - key verification (SHA-256 hashes), admin verification,
  active-pack loading, and `applyProposal()`: validate -> replay the benchmark with and
  without the proposal -> publish a new version **only** on a strict score improvement with
  zero regressions and no QA false positives.
- `src/routes/api/public/train/$.ts` - external training API for any LLM harness holding a
  key: `POST /session`, `/context`, `/propose`, `/finish`. Keys are hashed, scoped to one
  language and task, revocable, and usage-counted.
- `src/routes/api/admin/training.ts` - admin API (bearer + `admin` role required): overview,
  key create/revoke, benchmark case add/delete, enable/disable, rewind, session detail, and
  in-app training runs driven by `openai/gpt-5.6-sol` through the existing gateway (no
  user-supplied key needed).
- `src/routes/api/engine-pack.ts` + `public/studio/static/engine-pack.js` - the studio loads
  the active pack and layers it **after** the built-in engine: `window.applyKaRuleEngine` is
  wrapped (built-in first, trained rules last), scanner OCR gets a `transcribe` pass, and the
  trained glossary/guidance is appended to the Georgian prompt. Offline or without the API the
  pack is simply absent and everything behaves exactly as before.

### Added — schema (`supabase/external/003_training.sql`, `004_benchmark_seed.sql`)
`engine_versions`, `engine_active`, `engine_benchmark_cases`, `training_keys`,
`training_sessions`, `training_iterations` - all with grants, RLS (read/write gated on
`has_role(auth.uid(),'admin')`, engine data readable by any signed-in user) and
`updated_at` triggers. 16 seeded EN/KA benchmark cases.

### Safety model
Training may only add data-driven translation/OCR rules. It cannot change code, schema,
infrastructure, prompts outside the pack, or the built-in v1.45.0 Georgian engine. Every
accepted change is a new immutable version; the active version is a pointer, so rewind is
instant and lossless.

### Verified
Migrations applied to the live project; `/api/engine-pack` returns the active pack; a full
external session (`/session` -> `/propose` -> `/finish`) accepted a real improvement
(score 79.9 -> 83.2, exact 1/10 -> 3/10, pack v1 -> v2) and correctly rejected unsafe regexes;
`/api/admin/training` returns 403 without an admin bearer; an invalid key returns 401; the
`openai/gpt-5.6-sol` gateway call returns valid JSON; typecheck clean.

## 2026-09-04 — Real narrator list, gap-free narration, recovery-grade scanning, measured Moon reader

### Fixed
- **Narrator picker was empty** (`public/studio/index.html`, `populateVoiceList` in
  `app.js`). It only listed `speechSynthesis.getVoices()`, which is empty on Android
  inside an iframe, so no British/American/Georgian narrators appeared. It now lists the
  real EngBot neural narrators served by `/api/tts` (Oliver/Amelia British, Ethan/Nova/Fable
  American, გიორგი/ეკა/ნინო Georgian, Puck/Fenrir multilingual) with device voices appended
  as an extra group when the browser exposes any. Choice persists per language
  (`lumina_voice_preset_en` / `_ka`) and has a "Preview this narrator" button.
  Changing narrator applies from the next sentence instead of restarting the chapter.
- **Long pauses between sentences.** `stopCurrentSpeechAudio()` cleared the prefetch cache
  on *every* sentence advance, so the "prefetched" clip was always thrown away and each
  sentence paid a fresh network round-trip. It now takes a `keepBuffers` flag (used by the
  gateway, HF-Georgian and ElevenLabs paths), and invalidation uses a separate
  `narrationGeneration` counter that only bumps on a real stop/seek. Prefetch is a rolling
  window of 4 sentences (both gateway and Georgian paths), and the browser-speech gap
  dropped from 180 ms to 60 ms.
- **Over-long OCR sentences** are now split at clause boundaries (`splitLongIntoClauses`,
  34-word budget) instead of arbitrary 50-word blocks, so synthesis starts sooner and the
  narration breathes naturally on scanned books with sparse punctuation.

### Changed — scanner quality (`public/studio/static/scanner.js`)
- New deterministic, dependency-free image pipeline: **deskew** (projection-profile angle
  search, ±6°), **illumination flattening** (divide by a coarse box blur — kills shadows,
  spine gradients, lamp falloff), percentile contrast stretch with gentle gamma,
  **unsharp mask** for soft focus, and **2× upscale** for small photos.
- **Two variants per page**: `enhanced` (greyscale) and `binary` (Sauvola-style adaptive
  threshold, which rescues faint/blurry ink). A second recovery pass runs whenever the first
  transcription scores low or the photo is measurably blurry/dark/glared
  (Laplacian-variance sharpness + exposure), and the higher-scoring transcription wins.
- `scoreText()` gives a language-aware confidence (right-script ratio, junk-character and
  shredded-word penalties); Tesseract confidence is folded in on the offline tier.
- Vision OCR now gets a hint describing the page (Georgian vs English, blurry, dark, glare)
  so it reconstructs damaged glyphs in the right alphabet instead of transliterating.
- `repairText()`: Georgian Latin-look-alike repair inside mixed-script words, and English
  digit-in-word repair where `1` resolves to `l` or `i` from its neighbours
  ("Th1s"→"This", "Eng1ish"→"English"). Review list shows engine, confidence % and a
  warning when a page should be re-shot.

### Changed — Moon reader (`app.js`, reader CSS in `index.html`)
- **Measured pagination** replaces the words-per-page estimate: sentences are laid out in an
  off-screen clone of the real page box (same width, padding, font, line-height) and a page
  is cut exactly where the text stops fitting, with the chapter header reserved on page 1.
  Verified no overflow at 390×844 and 1280×900 (previously 98 px of clipped text on desktop).
- Re-paginates on resize/orientation/font-size/font-family change while keeping the reader
  on the same sentence (`repaginateKeepingPosition()`), instead of jumping to page 1.
- Swipe left/right turns pages (ignored while selecting text or in scroll mode);
  reader shell uses `100dvh` + `env(safe-area-inset-bottom)` and touch-friendly scrolling,
  so the playbar and page text are no longer clipped under mobile browser chrome.

## 2026-09-04 — Hybrid Georgian engine (old + new) and translations that never lose progress

### Changed
- **Tier router rewritten** (`public/studio/static/app.js`, `translateChunkSmart`). The old
  `SMART_ROUTE_EASY_THRESHOLD = 25` shortcut sent ordinary prose straight to Google MT, which is
  why whole books came out as "Machine translation (LOW QUALITY)". Complexity now only chooses
  refinement depth; the engine tier is chosen by availability:
  - **Tier A** — the original multi-pass pipeline (draft → critique → refine → Georgian QA gate),
    then the rule engine on top. Runs with the user's own key *or* the keyless gateway.
  - **Tier B** — `applyKaRuleEngine()`: MT draft + the v1.45.0 knowledge base applied
    deterministically (112 auto-fixes + `correctGeorgianMorphology` + 127 QA rules, looped until
    the validator is clean). Works with **no LLM at all** (offline / GitHub Pages / no key).
  - **Tier C** — unrepaired MT, last resort only, and still passed through the rule engine.
- `translationBudgetMode` now defaults to **quality** (the full original pipeline). Budget mode
  stays available as an explicit choice.
- Engine status is honest about tiers: `Tier A ...% · rules ...% · raw ...%`, with
  "Georgian rule engine (offline, no LLM)" instead of a blanket "LOW QUALITY" label.
- Scanned Georgian pages (`public/studio/static/scanner.js`) run through the same
  `applyKaRuleEngine()` before being saved, so scans and translations are cleaned identically.

### Added
- **Resumable whole-book translation.** Every finished chunk is checkpointed to
  `localStorage` (`lumina_tjob_<bookId>`: chapter cursor + partial chunk texts), every finished
  chapter is saved to the shelf immediately, and already-translated chapters are never redone.
  Closing the tab, reloading or navigating away resumes exactly where it stopped
  (`resumeTranslationJobIfAny()` on studio init). Cancel is explicit and clears the job.
- Chapters are translated in order and saved one by one, so chapter 1 can be read/listened to
  while later chapters are still being translated.
- `src/components/studio-host.tsx` — the studio iframe is mounted once in the app shell and
  hidden (not unmounted) on other pages, so translation/TTS keeps running while you browse.
  Includes a global "Translating <book> — chapter n / m" pill.
- `window.applyKaRuleEngine` and `window.getTranslationJobProgress` exposed for the shell.

### Verified
- Tier A: `translateChunkSmart` → `ზღვა მანამდე არასდროს არ ენახა …` (natural Georgian, `ai: 1`).
- Tier B (no LLM): `translateChunkLocal` → `ნათურა დაბლა იწვა …` with `rules: 1`.
- Resume: 2-chapter book, translation started, page reloaded mid-run → auto-resumed, finished,
  chapter text saved (`text_ka` 807 chars), job cleared. No console/page errors.
- `bunx tsgo --noEmit` clean; `node --check` clean on both studio scripts.

## 2026-09-04 — Book Scanner: photos of pages → a real book (EN + KA)

### Added
- **Scan Book Pages** button in the studio (desktop sidebar, mobile top bar, mobile drawer).
  Photos of book pages become a book on the same shelf a PDF import lands on: same chapters,
  Moon Reader, TTS and Georgian translation engine. No separate library.
- `public/studio/static/scanner.js` — self-contained scanner module (`window.LuminaScanner`):
  camera capture with a page-frame overlay + shutter + thumbnail strip, or multi-select from
  gallery/files; page grid with reorder / rotate / delete; language picker (English /
  ქართული / Auto); per-page progress with cancel and per-page re-scan; editable text review;
  title/author before saving.
- `src/routes/api/ocr.ts` — Tier 0 recognition. One preprocessed page image →
  Lovable AI Gateway vision (`google/gemini-3.7-flash`, `temperature: 0`), **transcription
  only** (never translation). Georgian rule block forbids Latin/Cyrillic look-alikes and any
  foreign sentence terminator (`।` etc.), enforces Mkhedruli and no capitalisation. Headers,
  footers and page numbers are dropped; hyphenated line breaks are joined. `LOVABLE_API_KEY`
  is read inside the handler only.
- Tier 1 fallback: `tesseract.js` 5.1 (`eng` / `kat`, tessdata_best) loaded lazily from CDN and
  run fully in the browser. Used when `/api/ocr` is unavailable (GitHub Pages static hosting →
  404, or 401/402/403) or when a page fails there, so the Pages build stays functional.
- Canvas preprocessing before either tier: rotation, downscale to a 2000px long edge,
  grayscale, 2%/98% percentile contrast stretch and a 0.9 gamma (keeps thin Georgian strokes),
  JPEG re-encode — the largest accuracy lever for phone photos.
- `createBookFromScannedPages(pages, meta)` in `app.js`: page-aware chapters
  (`Page 3` / `Pages 4–6`, ~600 words), cover art lookup, `extra.source = 'scan'`,
  `extra.scan_lang`, `extra.scanned_pages`, `extra.scan_engines`. A Georgian scan also fills
  `text_ka`, so `bookHasGeorgian()` is true and the reader never offers to translate it.

### Verified
- `/api/ocr` returned exact transcriptions for a printed English page and a printed Georgian
  page (page number correctly dropped, Georgian punctuation clean).
- Mobile-viewport browser run: Scan → pick 2 page images → recognise (both pages, neural
  tier) → review → save → book on the shelf with chapters; no console errors.

## 2026-09-04 — Studio: no repeat translate prompts, mobile speed + TTS controls

### Fixed
- **"This book has not been translated to Georgian yet" asked every time.** Georgian
  availability was read only from the `translatedLangs` flag, which is lost for books
  restored from IndexedDB/Supabase even though their chapters carry `text_ka`. New
  `bookHasGeorgian(book)` derives it from actual chapter text and repairs the flag; used by
  the reader language toggle, the dock language toggle, the shelf KA badge and the hero badge.
- Translation is never started from a `confirm()` dialog anymore. When Georgian is genuinely
  missing the app just says so (`notifyNeedsTranslation()`); the user starts it from the
  explicit **Translate** button in the reader toolbar / book hero.
- Mobile dock had no speed or voice controls (they were in a `hidden md:flex` block). The
  mobile quick-actions row now has `−` / `1.00x` / `+` fine speed steps (0.05, 0.50x–2.00x,
  id `btnDockSpeedMobile`) plus a Voice & EngBot TTS button opening the voice modal.
- `setGlobalSpeed()` now also re-speaks the current sentence when the active engine is
  browser `speechSynthesis` (rate cannot change mid-utterance), so speed changes are audible
  on every engine, not just gateway/ElevenLabs audio.


## 2026-09-04 — Rebrand: "Lumina Audio Studio" → **EngBot**

### Changed
- App-wide user-facing brand rename to **EngBot** across the native app
  (`src/routes/*`, `src/components/app-shell.tsx`) and the vendored studio
  (`public/studio/index.html`): titles, meta/OG tags, sidebar/top-bar wordmark,
  auth screen wordmark, "Voice & EngBot TTS" modal, `Narrator: EngBot` badge,
  PDF export footer and gateway `X-Title`.
- Sidebar nav item for the classic studio is now labelled **EngBot**; the route
  path stays `/studio` and library CTA reads "Open EngBot Studio" so existing
  links/bookmarks keep working.
- Internal identifiers kept intentionally unchanged to avoid data loss:
  `window.LuminaStore`, IndexedDB name `LuminaAudioStudioDB_v12`, `/studio` route,
  and Supabase table/bucket names. Only labels changed.


## 2026-09-04 — Georgian AI translation actually engages; fine-grained studio speed

### Fixed
- **Root cause of "Machine translation (LOW QUALITY)"**: `translateWithGeminiAI`,
  `translateWithGeminiAIBatch` and the funnel in `translateChunkContextually` all returned
  early unless a *user* API key was present, so the keyless Tier 0 server gateway was never
  reached and every chunk fell to Google/MyMemory. Replaced those gates with
  `aiTranslationAvailable()`, which also counts the gateway.
- **Second root cause**: the Georgian mastery prompt is ~218k chars, but `/api/ai` capped
  `prompt` at 120k, so every AI translation request 400'd and silently degraded. Limit raised
  to 600k.
- Georgian prompts no longer instruct the model to use the Devanagari danda `।` as a sentence
  end (it produced stray `ฯ`/`।` glyphs that also broke narration); `extractTranslation` now
  normalizes any leaked foreign terminal mark to `.`.
- `getKaRulesForPrompt()`: full 218k knowledge base in quality mode, compact 18k checklist in
  budget mode (whole-book runs), instead of always shipping the full base.
- Studio playback speed is now continuous in **0.05 steps (0.50x–2.00x)** with `−`/`+` dock
  buttons and a `setGlobalSpeed()` helper; changing speed applies live to the playing audio
  instead of restarting the current sentence, and the modal slider shares the same path.
  Previously `cycleSpeed()` used a 5-value list and reset to 0.75x after any slider use.



## 2026-09-03 — Playback speed, studio audio, AI translation tier, mobile studio rendering

### Added
- `src/routes/api/ai.ts` — same-origin JSON-mode LLM endpoint (Lovable AI Gateway,
  `google/gemini-3.7-flash`). The vendored studio now uses it as **Tier 0** of the
  translation provider chain, so the Georgian engine runs at AI quality with no
  user-supplied OpenRouter/Groq/Mistral/Gemini key. Previously, with no key, the chain fell
  through to Google/MyMemory and the status read "Machine translation (LOW QUALITY)".
- Studio narration through `/api/tts` (`speakGatewayNeural`, `fetchGatewaySpeechUrl`,
  `prefetchNextGatewaySentence` in `public/studio/static/app.js`): real audio files, with
  Georgian text still passed through the original `verbalizeGeorgianTextForTTS` +
  `applyGeorgianProsody` pipeline. Lookahead prefetch and the existing speech-token
  cancellation are reused. The voice preset is shared with the native player via
  `lumina_voice_preset`.

### Fixed
- **Playback speed had no effect** in `/books/$bookId/play`: speed is no longer part of the
  TTS request (which forced a re-fetch and discarded the cache); `audio.playbackRate` is set
  on the live element and on every newly loaded clip, so the change is instant.
- **The studio stylesheet was never linked.** `public/studio/static/styles.css` (translation
  panel, live chunk log, mini dock, reader layout and all its mobile media queries) was dead
  code — the cause of the black overlays, clipped reader controls and cramped `#0AI` rows in
  the reported screenshots. It is now loaded from `public/studio/index.html`.
- **Mobile compositing thrash**: on phones (and with reduced-motion) the studio drops all
  `backdrop-filter` layers to opaque surfaces and stops the animated blurred mesh, which is
  what made panels flash black and scrolling/translation updates stutter inside the iframe.
- `/studio` iframe height now subtracts the fixed mobile tab bar (`100dvh - 65px - 64px`), so
  the studio's own fixed reader/player controls are no longer hidden underneath it.

### Notes
- All new tiers degrade safely: a 404/401/402/403 on `/api/ai` or `/api/tts` (e.g. on GitHub
  Pages static hosting) permanently disables that tier and the original key-based providers,
  HF Georgian mirrors and browser speech take over unchanged.



## 2026-09-03 — Real neural TTS in the native player (mobile audio fix)

### Added
- `src/routes/api/tts.ts` — server route that generates real audio files through the
  Lovable AI Gateway `/v1/audio/speech` endpoint (OpenAI `gpt-4o-mini-tts` for English
  accents, Google `gemini-2.5-flash-tts` for Georgian and other languages). Returns
  `audio/mpeg` or `audio/wav` bytes; `LOVABLE_API_KEY` never leaves the server.
- `src/lib/tts-voices.ts` — the voice catalogue shared by the route and the UI:
  British male/female, American male/female/storyteller/neutral, Georgian male/female/soft,
  two multilingual voices, plus a Custom entry where the listener describes the voice
  (accent, tone, pacing) in free text.

### Changed
- `/books/$bookId/play` no longer relies on the browser `speechSynthesis` engine, which
  produces no sound on most mobile browsers and had no Georgian voice. It now streams
  generated audio into a single reused `HTMLAudioElement` created inside the first tap, so
  programmatic playback stays permitted on mobile.
- Transcript is grouped into ~600-character blocks (fewer requests, natural prosody);
  tapping a block plays from there, the next block is prefetched while the current plays,
  and generated clips are cached per voice/speed.
- Speed changes, voice changes and chapter changes cancel in-flight playback cleanly; TTS
  failures surface as a toast instead of silence.
- Georgian books (`language` starting `ka`) default to a Georgian voice; the chosen voice is
  remembered in `lumina_voice_preset`.

### Verified
- `POST /api/tts` returned 200 with playable audio for both engines: British preset →
  `audio/mpeg`, 3.77 s; Georgian preset → `audio/wav`, 3.89 s (mixed Georgian/English input).
- Type-check clean.

### Notes
- The vendored studio at `/studio` keeps its own bring-your-own-key TTS providers
  (edge-TTS Georgian neural endpoints, ElevenLabs, browser voices) untouched.

## 2026-09-03 — Native Stitch screens: dashboard, upload, chapters, player, summary, profile

### Added
- `src/components/app-shell.tsx` — the Stitch app chrome (desktop sidebar + topbar, mobile
  bottom nav) rendered by `src/routes/_authenticated/route.tsx` around every signed-in route.
- `/dashboard` — continue-listening card, library stats (books / chapters / pages / est.
  listening time) and shelf preview.
- `/upload` — drag & drop PDF import with the Stitch processing and completion states.
- `/books/$bookId` — chapter-selection screen (the old combined route moved to
  `books.$bookId.index.tsx`).
- `/books/$bookId/play` — Now Playing: record visual, playback controls (rewind 10s,
  prev/next chapter, speed cycling), system-voice picker and live highlighted transcript.
- `/books/$bookId/summary` — AI chapter summaries in brief / detailed / bullets / takeaways,
  English or Georgian, via `src/lib/summarize.functions.ts` (Lovable AI Gateway,
  Gemini 2.5 Flash, key stays server-side).
- `/profile` — display-name editing plus account stats.
- `src/lib/use-import-pdf.ts` — one shared PDF import pipeline (40 MB cap; parse → `books`
  row → `chapters` rows → private PDF upload → `ready`) now used by both `/library` and
  `/upload`, replacing the duplicated logic in the library route.

### Changed
- Landing page secondary CTA now points at `/dashboard`.
- Highlighted transcript sentences scale from their left edge, so the first word is no
  longer clipped by the panel edge.

### Verified (Playwright, signed-in temporary account, later deleted)
- `/dashboard`, `/upload`, `/profile`, `/library`, `/books/$id`, `/books/$id/play` and
  `/books/$id/summary` all render with zero console errors; the AI summarizer returned a
  real summary end-to-end.

### Preserved (unchanged on purpose)
- The vendored original SPA at `public/studio/**` (`/studio`) keeps the full backend-era
  parser, TTS engines and Georgian translation engine. Native routes are additive; nothing
  in the studio engine was replaced.

## 2026-09-03 — Apply the Google Stitch "Lumina Audio" design system

- Adopted the Stitch Material token set (surface `#10131a`, `primary-container` `#00f0ff`,
  `secondary` `#dcb8ff`, `on-surface` `#e1e2eb`) as the app-wide palette in `src/styles.css`,
  dark-only, with `glass-panel`, `input-glass`, `btn-glow`, `bg-radial-gradient` and
  `label-caps` utilities lifted from the Stitch screens.
- Loaded Inter + Space Grotesk + Material Symbols in `src/routes/__root.tsx`; the shell is
  now `<html class="dark">`.
- Rebuilt the landing page, sign-in page and library in the Stitch visual language
  (radial glow background, frosted panels, cyan glow CTAs, Material Symbols icons).
  No behaviour changed: auth, PDF import, chapter writes and delete use the same code.
- Retuned the vendored studio (`public/studio/`) from indigo/purple to the Stitch
  cyan/lavender palette and exact surface values, CSS/token level only — reader, TTS,
  translation and Georgian engine untouched.
- Stored the 14 Stitch reference screens at `docs/design/stitch-screens.html.txt` so future
  agents can diff against the intended design.


All notable changes to this project. Newest first.
Agents: append an entry here for every change set, and keep `PROJECT.md` in sync.

## 2026-09-03 — Unify the studio shelf on Supabase + mirror everything to GitHub

### Database (external project, `supabase/external/002_studio_unify.sql`, applied)
* `books.slug` (studio book id, unique per user), `books.metadata jsonb`,
  `chapters.metadata jsonb`. Nothing dropped or renamed — additive only.

### Studio now shares one shelf with the React app
* Added `public/studio/static/supabase-store.js` → `window.LuminaStore`
  (`init`/`getAllBooks`/`saveBook`/`deleteBook`), mapping the studio book object onto
  `public.books` + `public.chapters`. Georgian translations (`text_ka`), per-chapter
  durations, `translatedLangs`, and reading progress ride along in `metadata`.
* `static/app.js`: `initDB`/`saveBookToDB`/`getAllBooks`/`deleteBookFromDB` now delegate to
  Supabase when a session exists and fall back to the original IndexedDB store otherwise.
  The old IndexedDB code is intact, renamed to `*LocalDB`. No reader/TTS/translation code
  was touched.
* Classics are seeded once per store scope (`lumina_seeded_cloud_v1` vs `lumina_seeded_v13`),
  so signing in no longer lands you on an empty shelf.
* The studio reuses the React app's Supabase session from same-origin localStorage —
  its own login form stays dead code.
* Verified in a headless browser against the real database: signed out → IndexedDB;
  signed in → `usingCloud: true`, classics present, save/read/delete round-trip keeps
  Georgian text and progress intact.

### GitHub mirror + Pages
* Added `scripts/push-to-github.mjs`: ships `public/studio/**` to the repo root (which is
  what `.github/workflows/pages.yml` publishes to Pages), the app source to `lovable-app/`,
  and `PROJECT.md`/`CHANGELOG.md` to the root. Commits on top of the current `main` tree,
  so existing files (FastAPI backend, tests, data) are never deleted.
* Run `bun scripts/push-to-github.mjs "message"` after every change set.



## 2026-09-03 — Restore the original Lumina studio (reader + TTS + Georgian engine)

The previous entries replaced the old app with a fresh minimal Supabase app. That lost the
working features. This change set brings the original engine back instead of re-approximating it.

### Added
* Vendored the working SPA from `devsura3939/oudio-books-AI` into `public/studio/`:
  * `public/studio/index.html` — the glass/futuristic UI (Moon Reader mode, Voice & Studio TTS,
    Gemini AI engine panel, Discover Classics, chapter Read/Listen).
  * `public/studio/static/app.js` — reader pagination, sentence highlighting, themes/fonts,
    edge-tts Georgian neural voices (HF mirrors), ElevenLabs option, browser speech fallback,
    smart translation routing across Gemini / OpenRouter / Groq / Mistral, whole-book translation
    with progress + cancel, AI key status probing.
  * `public/studio/static/georgian-linguistics.js` — the KA knowledge base v1.45.0
    (128 prompt blocks, 127 QA rules, 112 auto-fixes), QA gate and morphology corrector.
* `/studio` route (`src/routes/_authenticated/studio.tsx`) — mounts the studio behind the real
  Supabase auth gate and seeds `lumina_auth_user` from the Supabase session, so the studio's old
  fake login form is never an entry point.
* "Open Studio" button on `/library`.

### Fixed
* Georgian linguistics: removed all 21 incorrect Devanagari danda `।` terminators — 19 inside
  sentence-boundary character classes (which made regexes treat `।` as a Georgian full stop) plus
  the prompt-text and QA-message occurrences.
* Removed the hardcoded (public, therefore compromised) OpenRouter key from `app.js`. Users enter
  their own key in the AI Keys panel. **The original key must be revoked upstream.**

### Known limitations / next steps
* The studio still persists books in IndexedDB (`LuminaAudioStudioDB_v12`); the Supabase
  `books`/`chapters` tables are used by the React `/library` + `/books/$bookId` pages. Unifying
  the two stores on Supabase is the next task.
* Studio AI/TTS calls still run from the browser with user-supplied keys. Moving them into
  `createServerFn` handlers is the follow-up hardening step.
* Verified in a headless browser: studio boots with zero console errors, KA engine version 1.45.0.

## 2026-09-03 — Fix email confirmation redirect


### Added
* `/auth/callback` route (`src/routes/auth.callback.tsx`): handles both PKCE `?code=` and
  legacy hash-token confirmation links, surfaces `error_description`, and forwards a
  confirmed user to `/library`.

### Changed
* Sign-up now uses `emailRedirectTo: ${window.location.origin}/auth/callback`.

### Requires action in the Supabase dashboard
Confirmation links landed on `http://localhost:3000` because Auth falls back to the
project's **Site URL** whenever `emailRedirectTo` is not in the redirect allow list.
In Authentication → URL Configuration set Site URL to the app's URL and add
`<app-origin>/auth/callback` (preview + published + any custom domain) to Redirect URLs.

## 2026-09-03 — Supabase rebuild of Lumina Audio Studio

### Added
* External Supabase wiring: `src/integrations/external-supabase/client.ts` (exports `db`,
  bucket names) and `types.ts` (hand-maintained row types). Targets self-owned project
  `oakikavdnnvxzlcvsovq`; new-format `sb_*` keys are sent as `apikey` only, not as bearer JWTs.
* Server secrets stored (not committed): `EXTERNAL_SUPABASE_URL`,
  `EXTERNAL_SUPABASE_PUBLISHABLE_KEY`, `EXTERNAL_SUPABASE_SECRET_KEY`,
  `EXTERNAL_SUPABASE_JWKS_URL`.
* `supabase/external/001_init.sql` — full schema: `profiles`, `user_roles` (+ `app_role`
  enum and `has_role()` security-definer function), `books`, `chapters`, `audio_segments`,
  `jobs`; `updated_at` triggers; `on_auth_user_created` trigger creating profile + default
  role; private `book-pdfs` / `book-audio` buckets with per-user folder policies. RLS on
  every table with owner-scoped policies and explicit GRANTs.
* Routes: `/` landing, `/auth` (email + password), `_authenticated` client-side gate,
  `/library` (PDF import, list, delete), `/books/$bookId` (chapter reader + narration).
* `src/lib/pdf-chapters.ts` — browser PDF text extraction via `pdfjs-dist`, heading-based
  chapter detection with page-bucket fallback, long chapters split into 1,800-word parts.
* Root layout: sonner `<Toaster />`, single `onAuthStateChange` subscriber that invalidates
  the router/query cache on identity transitions only.
* `PROJECT.md` handbook for cross-harness continuity.

### Changed
* Replaced the placeholder index route; app metadata now describes Lumina Audio Studio.
* Persistence model replaced: Postgres + private storage instead of JSON files on disk
  and browser IndexedDB.
* Authorization replaced: real Supabase sessions with RLS ownership instead of the
  `localStorage`-only fake login that accepted any email and granted `pro: true`.

### Notes / pending
* `001_init.sql` was applied to the external project on 2026-09-03 and verified:
  6 public tables all with RLS enabled, both private buckets created, Data API reachable.
* Roles deliberately live in `user_roles`, never on `profiles`.
* Lovable Cloud's generated `src/integrations/supabase/*` files remain on disk but are
  unused by app features.

## Scanner page replaces Library (2026-09-03)

- The React `/library` route is removed; the app-shell nav item now points at `/scan` ("Scanner").
- `/scan` reuses the persistent studio iframe (`src/components/studio-host.tsx`), which posts `{type:'engbot-navigate',view:'scanner'|'library'}` into `public/studio/index.html`.
- New studio view `#view-scanner` + `renderScanShelf()` in `public/studio/static/app.js` lists books with `extra.source === 'scan'` and reuses existing engines: `selectBook`/`playChapterAudio` (listen), `openReader` (Moon Reader), `startWholeBookTranslation` (Georgian), `exportCurrentBookPDF` (PDF), gateway TTS + JSZip (MP3 export), `deleteBook`.
- Editing a scanned book (title, author, section titles) writes back through `saveBookToDB`.

## Cover & structure detection for scans and PDFs (2026-09-03)

- New shared detector `detectBookStructure(pages,{isKa})` in `public/studio/static/app.js` (exposed as `window.detectBookStructure`): finds the cover page, the title and author from its display lines, and real chapter/section headings (Chapter/Part/Book/Section/Volume, Prologue/Epilogue/Introduction/Preface/Contents/Appendix, თავი/ნაწილი/შესავალი/სარჩევი…, bare numerals). Long sections are parted at 1800 words; books with no headings fall back to page buckets.
- Scanner (`public/studio/static/scanner.js`): after recognition it runs the same detector, prefills title/author, labels the detected cover page in review, and passes JPEG thumbnails of the front pages so the photographed cover becomes the book cover on every shelf.
- Studio PDF import: pdf.js text items are regrouped into visual lines (headings survive), embedded PDF Title/Author are used unless junk ("(anonymous)", "untitled"), and the cover is official art → rendered cover page → generated studio cover. `extra` records `source`, `cover_page`, `detected_title`, `detected_author`, `detected_sections`.
- React importer (`src/lib/pdf-chapters.ts`, `src/lib/use-import-pdf.ts`): same line rebuilding, heading set, cover-page detection, title/author sanitising; the rendered cover is stored in `books.cover_url`.

## Page-order detection & adding pages to a scanned book (2026-09-03)
- `public/studio/static/scanner.js`: gallery/file picks are now sorted naturally by filename (IMG_2 before IMG_10) with capture time as tiebreak; after OCR, `autoOrderPages()` reads printed page numbers from the top/bottom lines of each page and re-orders the scan when most pages carry distinct numbers (unnumbered covers/plates keep their place). Review screen shows a note when re-ordering happened plus a manual "Re-order by printed page numbers" button (`LuminaScanner.reorderByPageNumbers()`).
- Scanner append mode: `LuminaScanner.open({ appendTo, title })` starts an empty queue and saves through `window.appendScannedPagesToBook()` instead of creating a new book.
- `public/studio/static/app.js`: new `appendScannedPagesToBook(bookId, pages, meta)` runs the new pages through `detectBookStructure(..., { skipCover: true })`, continues page numbering from `extra.scanned_pages`, appends sections, updates scan metadata/engines, and re-renders both shelves. Scanner shelf cards gained an "Add pages" action (`engbotScanAddPages`).
- All listening / Moon Reader / Georgian translation / PDF / MP3 paths are unchanged and reused.
