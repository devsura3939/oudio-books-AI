# Changelog

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
