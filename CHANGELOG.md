# Changelog

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
