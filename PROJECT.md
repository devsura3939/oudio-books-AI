# EngBot — project handbook

Single source of truth for AI agents and humans working on this repository.
Read this file plus `CHANGELOG.md` before making changes.

## What the app does

Users sign in, import a PDF, and Lumina parses it into chapters stored in Postgres.
Chapters can be read and narrated in the browser (Web Speech API). The original PDF
is kept in private object storage. Generated MP3 segments have a table + bucket
reserved (`audio_segments`, `book-audio`) for the server-side TTS pipeline.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start v1 (React 19, Vite 7, file routes in `src/routes`) |
| Styling | Tailwind CSS v4 via `src/styles.css` + shadcn/ui in `src/components/ui` |
| Data/auth/storage | **External, self-owned Supabase project** (ref `oakikavdnnvxzlcvsovq`) |
| PDF parsing | `pdfjs-dist`, browser-side (`src/lib/pdf-chapters.ts`) |
| Narration | Browser `speechSynthesis` |

### Important: two Supabase projects exist

* **The one the app uses** — external project `oakikavdnnvxzlcvsovq`, accessed only
  through `src/integrations/external-supabase/client.ts` (exported as `db`).
* **Lovable Cloud's own project** — auto-generated files under
  `src/integrations/supabase/*` still exist because the platform manages them and
  they cannot be deleted. **Do not use them for app features.** Always import `db`
  from `@/integrations/external-supabase/client`.

Credentials: the publishable key is inline in the client (safe, public by design).
Server-side secrets are stored as environment variables and never committed:
`EXTERNAL_SUPABASE_URL`, `EXTERNAL_SUPABASE_PUBLISHABLE_KEY`,
`EXTERNAL_SUPABASE_SECRET_KEY`, `EXTERNAL_SUPABASE_JWKS_URL`.

## Database schema (`supabase/external/001_init.sql`)

Apply that file in the external project's SQL editor (idempotent, re-runnable).

| Table | Purpose | Access rule |
| --- | --- | --- |
| `profiles` | display name, avatar, plan; auto-created by `on_auth_user_created` | owner only |
| `user_roles` + `app_role` enum + `has_role()` | roles kept out of `profiles` to prevent privilege escalation | user reads own roles |
| `books` | title, author, language, `pdf_path`, `page_count`, `total_chapters`, `status` | owner-only full access |
| `chapters` | `chapter_index`, `title`, `text_content`, `word_count`, `status` | owner-only full access |
| `audio_segments` | `part_index`, `storage_path`, `voice`, duration, size | owner-only full access |
| `jobs` | `kind`, `status`, `progress`/`total`, `message`, `error` — for background pipelines | owner-only full access |

Buckets: `book-pdfs`, `book-audio` — both **private**; every object path starts with
`<auth.uid()>/`, and storage policies enforce that first path segment.

RLS is enabled everywhere and every table has explicit `GRANT`s for `authenticated`
and `service_role` (Supabase does not grant these by default).

## Routes

```
/                          public landing
/auth                      email + password sign in / sign up
/auth/callback             email-confirmation handler (PKCE + hash tokens)
/_authenticated/           client-side gate (ssr: false) → redirects to /auth
                           wraps every child in <AppShell> (Stitch sidebar / topbar / mobile nav)
  /dashboard               continue listening, library stats, shelf preview
  /upload                  drag & drop PDF import (processing + complete states)
  /library                 import PDF into Supabase, list & delete books
  /books/$bookId           chapter selection (books.$bookId.index.tsx)
  /books/$bookId/play      Now Playing: neural cloud TTS (/api/tts), voice picker, transcript
  /books/$bookId/summary   AI chapter summary (brief/detailed/bullets/takeaways, en/ka)
  /profile                 display name + account stats
  /studio                  THE FULL ORIGINAL APP (see below)
```

Shared building blocks: `src/components/app-shell.tsx` (chrome),
`src/lib/use-import-pdf.ts` (the single PDF import pipeline used by `/library` and `/upload`),
`src/lib/summarize.functions.ts` (server function → Lovable AI Gateway, Gemini 2.5 Flash;
the key never reaches the browser).


## The vendored studio (`public/studio/`)

The original Lumina app from `devsura3939/oudio-books-AI` is the real product surface and is
kept intact rather than rewritten. It is a self-contained vanilla SPA served as static files:

| File | Contains |
| --- | --- |
| `public/studio/index.html` | glass/futuristic UI, Moon Reader mode, Voice & Studio TTS panel, Gemini AI engine panel, Discover Classics |
| `public/studio/static/app.js` | paged reader + sentence highlighting + themes/fonts, edge-tts Georgian neural voices via HF mirrors, ElevenLabs option, browser-speech fallback, smart translation routing (Gemini / OpenRouter / Groq / Mistral), whole-book translation with progress & cancel, AI key status probe |
| `public/studio/static/georgian-linguistics.js` | KA knowledge base v1.45.0 — 128 prompt blocks, 127 QA rules, 112 auto-fixes, `validateGeorgianTranslation`, `correctGeorgianMorphology` |
| `public/studio/static/supabase-store.js` | `window.LuminaStore` — the studio's book store, backed by the same Supabase tables the React pages use |

Rules for agents:

* It loads Tailwind/pdf.js/JSZip from CDN and needs **no build step**. Edit the files in place.
* `/studio` is inside `_authenticated`, and the React route seeds `lumina_auth_user` in
  localStorage from the Supabase session. The studio's own login form is therefore dead code —
  never route users to it, and do not treat it as an auth mechanism.
* AI/TTS keys are user-supplied and live in localStorage; calls run browser-side. Never
  reintroduce a hardcoded provider key (the old OpenRouter default was removed as compromised).

## One shelf: how storage is unified

Both surfaces read and write `public.books` + `public.chapters` in the external project.

```
React /library ─┐
                ├─→ public.books (+ chapters)  ← single source of truth
studio /studio ─┘   via window.LuminaStore
```

* `books.slug` holds the studio's own book id (`book_1725…`, `classic_art_of_war`), unique per user.
* Studio-only fields live in jsonb: `books.metadata` = `{ coverUrl, translatedLangs, dateAdded,
  lastPlayedChapterId, progressPct, extra }`; `chapters.metadata` = `{ studio_id, text_ka,
  estimated_duration_sec, extra }`. **Georgian translations live in `chapters.metadata.text_ka`.**
* `saveBook()` replaces a book's chapter rows wholesale — the studio always passes the full array.
* Signed out, or Supabase unreachable → the studio silently falls back to the original IndexedDB
  store (`initLocalDB` / `saveBookToLocalDB` / …). Never delete that fallback.
* Schema changes go in a new numbered file in `supabase/external/` AND get applied to the live
  project; `002_studio_unify.sql` added `slug`/`metadata`.

## Publishing (both targets, every change)

| Target | How |
| --- | --- |
| Lovable app | Publish button (frontend changes need a re-publish) |
| GitHub repo `devsura3939/oudio-books-AI` | `bun scripts/push-to-github.mjs "message"` |
| GitHub Pages `devsura3939.github.io/oudio-books-AI/` | automatic — `.github/workflows/pages.yml` deploys the repo root on every push to `main` |

The push script mirrors `public/studio/**` to the repo root (Pages serves that), the app source
to `lovable-app/`, and the docs to the root. It commits on top of the existing `main` tree, so the
old FastAPI backend, tests, and data files in that repo are never deleted. Run it after every
change set — the repo and Pages must never lag behind the Lovable app.



## Book scanner (added 2026-09-04)

Photos of book pages become a normal book on the studio shelf — the studio is the only
library; it can both upload PDFs and scan pictures.

* Entry point: **Scan Book Pages** (desktop sidebar, mobile top bar, mobile drawer) →
  `window.LuminaScanner.open()` in `public/studio/static/scanner.js`.
* Pipeline: camera/gallery → page queue (reorder/rotate/delete) → canvas preprocess
  (rotate, 2000px long edge, grayscale, 2%/98% contrast stretch, 0.9 gamma) → OCR →
  post-process (de-hyphenate, merge soft line breaks, drop page numbers, normalise Georgian
  punctuation) → `createBookFromScannedPages()` in `app.js` → `saveBookToDB()`.
* **Tier 0** `src/routes/api/ocr.ts` → Lovable AI Gateway vision (`google/gemini-3.7-flash`,
  temperature 0). Transcription only — it must never translate; the Georgian rule block bans
  Latin/Cyrillic look-alikes and foreign terminators such as `।`. Key read inside the handler.
* **Tier 1** `tesseract.js` 5.1 with `eng`/`kat` from tessdata_best, lazy-loaded from CDN,
  fully client-side. Used on 404/401/402/403 (e.g. GitHub Pages) or per-page failure. Never
  remove it — it is what keeps the Pages deployment usable.
* Chapters follow page boundaries (`Page 3`, `Pages 4–6`, ~600 words). Scan metadata lives in
  `books.metadata.extra` (`source: 'scan'`, `scan_lang`, `scanned_pages`, `scan_engines`) —
  no schema change was needed. Georgian scans also fill `chapters.metadata.text_ka` so
  `bookHasGeorgian()` is true and the reader does not offer to translate an already-Georgian
  book.

## Conventions

* Chapter splitting: heading regex (`Chapter/Part/Book N`) first, 10-page buckets as
  fallback; chapters over 2,500 words are split into 1,800-word parts.
* Uploads capped at 40 MB client-side.
* All colours come from semantic tokens in `src/styles.css` — never hardcode colours.
* Server-only work goes in `createServerFn` handlers (`*.functions.ts`); secrets are
  read inside handlers, never at module scope.

## Migrated away from the old repo

The predecessor (`devsura3939/oudio-books-AI`) had a Python FastAPI backend with JSON
file persistence plus a browser-only SPA using IndexedDB (`LuminaAudioStudioDB_v12`)
and a fake `localStorage` login that accepted any email. That model is replaced:
real Supabase auth, Postgres persistence, RLS ownership, and private storage buckets.
Any hardcoded third-party API keys from that repo must be treated as compromised and
rotated; keys never belong in client code.

## Open items

* ~~Unify storage on Supabase~~ — done (002).
* Move studio AI + TTS calls into `createServerFn` handlers so keys stay server-side.
* Server-side MP3 synthesis writing into `audio_segments` / `book-audio`.
* Google sign-in.
* Supabase Auth **Site URL / Redirect URLs** must list the app origins, otherwise confirmation
  emails fall back to `http://localhost:3000`.


## Design system (source of truth)

The intended visual design is the Google Stitch project *EngBot*
(`https://stitch.withgoogle.com/projects/7169823663306117044`). All 14 exported screens are
committed at `docs/design/stitch-screens.html.txt` — read them before changing any UI.

Tokens (Material 3 export, dark only):

| token | value |
| --- | --- |
| `surface` / `background` | `#10131a` |
| `surface-container` | `#1d2026` |
| `surface-container-high` | `#272a31` |
| `primary-container` (CTA fill) | `#00f0ff` |
| `on-primary-container` (CTA text) | `#00363a` |
| `primary-fixed-dim` (links) | `#00dbe9` |
| `secondary` | `#dcb8ff` |
| `on-surface` / `on-surface-variant` | `#e1e2eb` / `#b9cacb` |

Type: Inter (display/body), Space Grotesk (12px uppercase 0.1em labels). Icons: Material
Symbols Outlined. Surfaces: `.glass-panel` frosted cards, radial cyan glow backgrounds,
`.btn-glow` cyan CTAs. In the Lovable app these live as oklch tokens plus `@utility` blocks in
`src/styles.css`; the vendored studio mirrors the same hexes in its Tailwind CDN config
(`public/studio/index.html`) and `public/studio/static/styles.css`.

Rule for future agents: restyle by editing tokens/utilities, never by rewriting the studio's
reader, TTS, translation or Georgian-engine code.

## Native player TTS (added 2026-09-03)

* `src/routes/api/tts.ts` is the only TTS path used by the native `/books/$id/play` route.
  It proxies the Lovable AI Gateway `/v1/audio/speech` endpoint and returns audio bytes:
  `openai/gpt-4o-mini-tts` (mp3) for English accent presets, `google/gemini-2.5-flash-tts`
  (wav) for Georgian and other languages. `LOVABLE_API_KEY` is read inside the handler only.
* `src/lib/tts-voices.ts` holds the preset catalogue (British / American / Georgian /
  multilingual / Custom free-text delivery instructions) shared by the route and the picker.
* The player plays audio through one reused `HTMLAudioElement` created inside the first user
  tap — required for mobile autoplay policies. Browser `speechSynthesis` is no longer used
  there because it is silent on most mobile browsers and lacks Georgian voices.
* Playback speed is applied client-side (`audio.playbackRate`) and is deliberately NOT part of
  the TTS request or the audio cache key — otherwise each speed change refetched every clip.

## Studio server tiers (added 2026-09-03)

The vendored studio keeps its full original stack (edge-TTS Georgian mirrors, ElevenLabs,
browser voices, OpenRouter/Groq/Mistral/Gemini keys, Georgian linguistics engine). Two
same-origin server tiers were added *in front* of it, both of which self-disable on
404/401/402/403 (e.g. GitHub Pages static hosting) and hand back to the original engines:

* **Translation Tier 0** — `callLuminaGatewayJSON()` → `src/routes/api/ai.ts`
  (`google/gemini-3.7-flash`, JSON mode), consulted first inside `callGeminiJSON()`. This is
  why the engine no longer reports "Machine translation (LOW QUALITY)" without a user key.
  Two gates used to defeat this and are now fixed: the AI pipeline entry points required a
  *user* key (`aiTranslationAvailable()` now also counts the gateway), and `/api/ai` capped the
  prompt at 120k while the Georgian mastery prompt is ~218k (cap is now 600k). Prompt rules
  come from `getKaRulesForPrompt()` — full knowledge base in quality mode, compact checklist in
  budget mode. Do not reintroduce a key-only gate; it silently degrades every chunk.
* **Studio speed** — `setGlobalSpeed()` is the single entry point: 0.05 steps, 0.50x–2.00x,
  applied live to the playing audio (dock `−`/`+`/tap buttons and the modal slider).
* **Narration** — `speakGatewayNeural()` → `src/routes/api/tts.ts`, chosen first in
  `speakCurrentSentence()` (after ElevenLabs). Georgian sentences still go through
  `verbalizeGeorgianTextForTTS()` + `applyGeorgianProsody()` before synthesis. Voice preset is
  shared with the native player through `localStorage.lumina_voice_preset`.

Mobile rendering: `public/studio/static/styles.css` is now actually linked from
`index.html` (it never was), and a `max-width: 900px` / reduced-motion block flattens all
`backdrop-filter` panels and stops the animated mesh — required to stop Android Chrome from
dropping composited tiles (black panels, stutter) inside the iframe.

## Georgian translation engine (hybrid, updated 2026-09-04)

`public/studio/static/georgian-linguistics.js` (v1.45.0, 695 KB — 128 prompt blocks, 127 QA
rules, 112 auto-fixes) is the **read-only authority**. Never rewrite it; extend around it.

Tiers, chosen by availability (not by text complexity):

1. **Tier A — hybrid AI.** `translateChunkAI()` runs the original multi-pass pipeline
   (`translateWithGeminiAI` full: draft → critique → refine; `translateWithGeminiAIBatch` fused
   for simple chunks), then `applyGeorgianQaGate()`, then `applyKaRuleEngine()`. Uses the user's
   configured provider key when present, otherwise the keyless gateway (`/api/ai`).
2. **Tier B — rule engine, no LLM.** `applyKaRuleEngine()` = MT draft + `refineGeorgianGrammar()`
   + `correctGeorgianMorphology()` looped against `validateGeorgianTranslation()`. This is the
   offline / GitHub Pages / no-key path and always runs on Tier A output too.
3. **Tier C — raw MT.** MyMemory last resort; still rule-repaired, and reported as `raw` in the
   status line.

`translationBudgetMode` defaults to `quality`. Complexity scoring only picks pipeline depth.

### Resumable jobs
`lumina_tjob_<bookId>` in `localStorage` holds `{status, chapterIdx, partial[], totalChapters}`.
Written after every chunk, cleared on completion or explicit cancel. `resumeTranslationJobIfAny()`
runs on studio init; finished chapters (`chapter.text_ka`) are skipped. The studio iframe lives in
`src/components/studio-host.tsx` (app-shell level, hidden not unmounted), so jobs survive
navigation; `TranslationProgressPill` shows progress anywhere in the app.

## Narration engine (voices + gap-free playback)

`ENGBOT_VOICES` in `public/studio/static/app.js` is the visible narrator catalogue and maps 1:1
onto the presets in `src/lib/tts-voices.ts` served by `/api/tts` (British, American, Georgian,
multilingual). The picker lists these first because device `speechSynthesis` voices are usually
absent on mobile inside an iframe; device voices are an extra group when available.
Selection persists as `lumina_voice_choice` plus `lumina_voice_preset_en` / `_ka`.

Playback keeps a rolling prefetch window of `GATEWAY_PREFETCH_AHEAD = 4` sentences.
`stopCurrentSpeechAudio(keepBuffers)` must be called with `true` when merely advancing to the
next sentence — otherwise the buffers are dropped and every sentence pays a network round-trip
(this was the cause of the long inter-sentence pauses). Real stops/seeks bump
`narrationGeneration`, which invalidates in-flight prefetches.

## Scanner pipeline (photos → book)

`public/studio/static/scanner.js`: `renderBase()` (rotate → deskew → sharpness/exposure metrics →
optional 2× upscale, cached per page) then `preprocess(page, variant)` for the `enhanced` and
`binary` (Sauvola) variants. `scanOnePage()` runs pass 1 on `enhanced`, and a recovery pass on
`binary` when `scoreText()` is low or the photo measures blurry/dark/glared; the higher score wins.
Tier 0 = `/api/ocr` vision (with a page hint), Tier 1 = tesseract.js 5.1 (`eng`/`kat`).
`repairText()` applies language-specific OCR repair; Georgian pages also pass through
`window.applyKaRuleEngine()` on save.

## Moon reader layout

Paged modes use `measurePages()` — an off-screen probe matching the real page box — so a page
holds exactly what fits (page 1 reserves the chapter header). `repaginateKeepingPosition()` is the
only correct way to re-flow after resize/orientation/typography changes. Reader shell sizing uses
`100dvh` + safe-area insets; swipe gestures are bound once in `initReaderGestures()`.

### Scanner page
The Library page was retired. `/scan` opens the studio's Scanner view: scan pages, then read, listen, translate, edit or export (PDF / MP3 zip) each scanned book with the same shared engines. No duplicate reader/TTS/translation code exists.
