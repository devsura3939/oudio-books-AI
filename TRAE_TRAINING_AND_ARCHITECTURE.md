# EngBot / Lumina Audio Studio — Complete Codebase Architecture & Trae Training Context

**Repository**: `devsura3939/oudio-books-AI`  
**Live Production URL (Lovable)**: [audible-architect.lovable.app](https://audible-architect.lovable.app/)  
**Live Static Demo (GitHub Pages)**: [devsura3939.github.io/oudio-books-AI/](https://devsura3939.github.io/oudio-books-AI/)  
**Document Purpose**: Deep architectural analysis of the codebase, functionality, data flow, migration path, and the complete historical context and methodology of the **Trae Solo training harness** and the new **Lovable Training Lab**.

---

## 1. Executive Summary & Evolution Journey

The project began as an automated PDF-to-Audiobook generator and has evolved through three major generational shifts:

```
┌────────────────────────────────────────────────────────┐
│  Phase 1: Python / FastAPI Local Prototype             │
│  - edge-tts + pdfplumber + local JSON session storage  │
│  - Single HTML interface serving vanilla JavaScript     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 2: Trae Solo Harness & Linguistic Engineering   │
│  - Lumina Audio Studio SPA (IndexedDB + Web Speech)    │
│  - Intensive Georgian linguistic engine development    │
│  - Trae iterative harness: v1.16 → v1.45.0             │
│  - 128 prompt blocks, 127 QA rules, 112 auto-fixes     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 3: Lovable Full-Stack Cloud Architecture        │
│  - TanStack Start v1 (React 19, Vite 8, Nitro SSR)     │
│  - Google Stitch "EngBot" Dark Cyberpunk Design System │
│  - External Supabase (Auth, Postgres RLS, Storage)     │
│  - Book Scanner with Sauvola binarization & Vision OCR │
│  - Native Neural TTS (GPT-4o-mini-tts & Gemini-2.5-tts)│
│  - Persistent StudioHost iframe bridge                 │
│  - Training Lab: autonomous LLM rule pack training     │
└───────────────────────────┘
```

---

## 2. Core Functional Components & Capabilities

### 2.1. Library & Ingestion System
1. **PDF Ingestion & Smart Chaptering** (`pdfjs-dist` / `src/lib/pdf-chapters.ts`):
   - Client-side extraction directly in the browser (handling files up to 40 MB).
   - Regex-based heading detection (`Chapter N`, `Part N`, `Book N`, Roman numerals).
   - Dynamic fallbacks: 10-page bucket partitioning when headings are absent; chapters exceeding 2,500 words are subdivided into balanced 1,800-word sections.
2. **Camera & Photo Book Scanner** (`src/routes/_authenticated/scan.tsx`, `static/scanner.js`):
   - Captures physical book pages via mobile camera or desktop file selector.
   - **Computer Vision Preprocessing Pipeline**:
     - Auto-rotation and deskew via projection-profile angle search ($\pm 6^\circ$).
     - Illumination flattening: divides image by a box blur to eliminate shadows and spine gradients.
     - Dual-pass thresholding: generates an `enhanced` grayscale variant and a `binary` (Sauvola adaptive thresholding) variant for faint ink recovery.
     - Laplacian-variance sharpness metric and exposure assessment.
   - **Tiered OCR**:
     - **Tier 0**: `/api/ocr` leveraging Google Gemini 3.7 Flash via Lovable AI Gateway with script-specific transcription prompts (transcription verbatim; prohibits transliteration look-alikes).
     - **Tier 1 (Offline fallback)**: `tesseract.js` v5.1 with `eng` and `kat` best models.
   - Automatic printed page-number detection to re-sequence out-of-order captured pages.

### 2.2. Dual-Engine Reader & Audio Player
1. **Google Stitch Native Player** (`src/routes/_authenticated/books.$bookId.play.tsx`):
   - Premium audio player interface with sentence-synced highlight tracking.
   - Consumes `/api/tts`, which routes through Lovable AI Gateway:
     - English presets: `openai/gpt-4o-mini-tts` (MP3).
     - Georgian & Multilingual presets: `google/gemini-2.5-flash-tts` (WAV).
   - Reuses a single `HTMLAudioElement` to satisfy strict mobile auto-play policies.
   - Client-side playback rate modulation ($0.5\times$ to $2.0\times$) decoupled from the TTS request cache.
2. **Vendored Studio ("Moon Reader" mode)** (`public/studio/index.html`, `static/app.js`):
   - Measured pagination system (`measurePages()`): sentence-level off-screen box matching ensures zero text clipping across mobile ($390\times 844$) and desktop displays.
   - Gap-free audio narration with a rolling prefetch window (`GATEWAY_PREFETCH_AHEAD = 4` sentences).
   - Clause-based sentence splitting for scanned books with sparse punctuation.

### 2.3. Hybrid Georgian Translation Engine
The flagship linguistic feature translates literature into natural Georgian across three distinct fallback tiers:
* **Tier A (Hybrid AI)**: Calls `/api/ai` (`google/gemini-3.7-flash` in JSON mode) or user-supplied LLM API key (OpenRouter, Groq, Mistral). Runs a multi-stage process (Draft $\rightarrow$ Critique $\rightarrow$ Refine $\rightarrow$ QA Gate $\rightarrow$ Deterministic Rule Engine).
* **Tier B (Rule Engine Offline / Zero LLM)**: Combines machine translation draft with the 8,380-line `static/georgian-linguistics.js` knowledge base (112 auto-fixes, 127 QA rules, morphology corrections). Runs entirely locally on GitHub Pages or when offline.
* **Tier C (Raw MT Repair)**: MyMemory MT fallback with rule repair.
* **Resumable Whole-Book Translation**: Saves checkpoints to `localStorage` (`lumina_tjob_<bookId>`) chunk-by-chunk. Even if the browser crashes, reloads, or navigates, translation resumes without repeating finished chapters.

---

## 3. High-Level Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Frontend Client Surface                          │
│                                                                             │
│   ┌────────────────────────────────┐    ┌───────────────────────────────┐   │
│   │ TanStack Start React 19 Shell  │    │  Vendored Studio (SPA iframe) │   │
│   │  - /dashboard  - /upload       │    │  - Moon Reader                │   │
│   │  - /library    - /books/$id    │    │  - Georgian Translation       │   │
│   │  - /scan       - /training     │    │  - Gap-Free Narrator          │   │
│   └───────────────┬────────────────┘    └───────────────┬───────────────┘   │
│                   │                                     │                   │
│                   └──────────────────┬──────────────────┘                   │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                Shared Supabase Client │ window.LuminaStore
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Supabase Cloud Database & Storage (External)                 │
│                                                                             │
│   • public.books (slug, metadata, user_id, page_count)                      │
│   • public.chapters (text_content, metadata.text_ka, word_count)             │
│   • public.audio_segments & public.jobs                                     │
│   • public.engine_versions, engine_active, engine_benchmark_cases           │
│   • Buckets: 'book-pdfs' (private), 'book-audio' (private)                  │
│   • Strict Row-Level Security (RLS) across all tables                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                   Backend API Routes (Nitro / TanStack SSR)
                                       │
     ┌──────────────────┬──────────────┴─────┬──────────────────┐
     ▼                  ▼                    ▼                  ▼
┌──────────────┐ ┌──────────────┐   ┌─────────────────┐ ┌──────────────┐
│  /api/tts    │ │  /api/ocr    │   │  /api/ai        │ │ /api/admin/  │
│  GPT-4o-mini │ │  Gemini-3.7  │   │  Gemini-3.7     │ │   training   │
│  Gemini-2.5  │ │  Vision OCR  │   │  JSON Gateway   │ │ /api/public/ │
│  Speech      │ │              │   │                 │ │ train (Keys) │
└──────────────┘ └──────────────┘   └─────────────────┘ └──────────────┘
```

---

## 4. Deep Dive: Trae Solo Training Harness Context

### 4.1. What Was the Trae Harness?
Before the Lovable migration, the project was developed and refined within **Trae Solo** (located in `C:\Users\Anania Light Laptop\AppData\Roaming\TRAE SOLO\` and `C:\Users\Anania Light Laptop\.trae\work\6a94a614dccdaf406bd9fd4f`).

Trae was used as an autonomous test-driven engineering harness to iteratively expand and verify `static/georgian-linguistics.js` across versions (v1.16 through v1.45.0).

### 4.2. The Trae Iteration Methodology ("Capture-Then-Pin")
Every linguistic rule set added in Trae adhered to a strict 4-step pipeline:

```
[1. Gap Scan / Probe]
      │ Run gap-scan-vXXXX.js & probe-vXXXX.js on real literary texts 
      ▼ (e.g. Sun Tzu, Marcus Aurelius) to find untranslated residues.
[2. Capture Baseline]
      │ Run captureXX-vXXXX.js against the previous version baseline.
      ▼ Record exact input/output behaviors before touching code.
[3. Linguistic Implementation]
      │ Implement KA Knowledge Block (KB KA-XXX), QA Validator (QA 3.XXX),
      ▼ and Regex Auto-Fix (Fix 4.XXX) inside georgian-linguistics.js.
[4. Sweep & Regression Pin]
      Run test-ka-vXXXX.js and all historical suites (v1400, v1410, etc.)
      Ensure 100% PASS with 0 regressions.
```

### 4.3. Proof from the Codebase Artifacts
* **`baseline-sweep-v1390-engine.js`**:
  Executes all `test-ka-v*.js` suites using the Trae runtime with `ELECTRON_RUN_AS_NODE: '1'`, outputting results to `regression-baseline-v1390-engine.json`.
* **`commit-msg-v1440.txt`**:
  Documents the release of v1.44.0 (Present Screeve Dictionary: KA-126 + QA 3.125 + fix 4.111), passing 467/467 tests across historical test suites.
* **`commit-msg-v1450.txt`**:
  Documents the release of v1.45.0 (Locative Postposition Dictionary: KA-127 + QA 3.126 + fix 4.112), resolving stranded English prepositions (`next to`, `in front of`, `under`) into Georgian cases (-ზე, -ში, -თან, გვერდით).
* **The Living Test Suites**:
  `test-ka-v1400.js`, `test-ka-v1410.js`, `test-ka-v1420.js`, `test-ka-v1430.js`, `test-ka-v1440.js`, `test-ka-v1450.js`, and matching `smoke-v*.js` files verify that earlier rules are never clobbered by later ones.

---

## 5. Deep Dive: Lovable Training Lab (`/training`)

Lovable took the lessons learned from the manual Trae harness and transformed them into a **fully automated, cloud-based Training Lab**.

### 5.1. Immutable Core Principle
`static/georgian-linguistics.js` (v1.45.0) is treated as an **immutable, read-only authority**. Training does **not** edit that file; instead, training generates **versioned rule packs**.

### 5.2. Permitted Rule Types (`src/lib/engine-pack.ts`)
Only 5 data-only, non-executable item types can be proposed:
1. `glossary`: Exact source phrase $\rightarrow$ preferred target rendering.
2. `autofix`: Safe regular expression $\rightarrow$ replacement text.
3. `qa_rule`: Regex matching low-quality patterns $\rightarrow$ warning message.
4. `prompt_block`: Guidance text appended to the LLM system prompt.
5. `ocr_fix`: Common OCR glyph distortion $\rightarrow$ corrected word.

### 5.3. Automated Benchmark & Safety Gate
When an external LLM or the admin runner proposes a candidate pack:
1. **Strict ReDoS & Injection Validation**:
   - Rejects nested unbounded quantifiers (`(a+)+`).
   - Forbids lookbehinds (`(?<...)`) and backreferences.
   - Forbids code injections (`<script`, `require(`, `process.env`).
2. **Deterministic Evaluation (`evaluatePack`)**:
   - Replays test cases stored in `public.engine_benchmark_cases`.
   - Computes character-level similarity and exact pass rates.
   - Evaluates whether QA rules fire on known-good sentences (false-positive penalty).
3. **Acceptance Gate (`isImprovement`)**:
   - A candidate is approved **only** if the score increases, zero passing cases regress, and zero false positives are introduced.
   - If approved, a new row is created in `public.engine_versions` and `public.engine_active` is updated.
   - **One-Click Instant Rewind**: If an issue arises, pointing `engine_active` back to a previous version restores it in milliseconds without code deployment.

### 5.4. Public Training API for External Agents
External AI agents (such as Trae, Claude, or local scripts) can train the engine using an authenticated REST protocol:
* `POST /api/public/train/session` (headers: `X-Training-Key`) $\rightarrow$ Opens training session.
* `POST /api/public/train/context` $\rightarrow$ Fetches active pack and failing benchmark cases.
* `POST /api/public/train/propose` $\rightarrow$ Submits proposed rule items. Server runs benchmark immediately.
* `POST /api/public/train/finish` $\rightarrow$ Closes session and records total score improvement.

---

## 6. GitHub Mirror & Lovable Synchronization

### 6.1. How Changes Sync to GitHub
The project includes `lovable-app/scripts/push-to-github.mjs`. Because Lovable runs in an ephemeral container, changes are mirrored to GitHub via the **GitHub Git Data API**:
1. Files in `public/studio/**` are mirrored to the root of the repo (`index.html` + `static/`) so that **GitHub Pages** serves the studio directly.
2. The TanStack Start project is mirrored into `lovable-app/**`.
3. Docs (`PROJECT.md`, `CHANGELOG.md`, `docs/`) are mirrored to the repository root.

### 6.2. GitHub Pages & Static Hosting Resilience
The entire client surface is resilient to static hosting:
* When on GitHub Pages or if API routes return `404`/`401`, the studio seamlessly degrades to:
  - Client-side `tesseract.js` for OCR.
  - Offline Tier B rule engine for Georgian translations.
  - Local `IndexedDB` storage if Supabase credentials are not present.

---

## 7. Actionable Recommendations for Development

1. **Keep Keys Out of Git**: Ensure all secrets (`LOVABLE_API_KEY`, Supabase service role keys, GitHub personal access tokens) are supplied exclusively via environment variables.
2. **Retain Dual-Storage Architecture**: Always use `src/integrations/external-supabase/client.ts` (`db`) for app features, keeping the fallback IndexedDB logic in the studio intact.
3. **Utilize the Training API for Bulk Linguistics**: Instead of manually writing 1,000-line regex files, submit candidate rules through `/api/public/train/propose` so the automated benchmark can verify correctness.
4. **Preserve Audio Prefetch Window**: Always pass `keepBuffers = true` in `stopCurrentSpeechAudio()` when advancing sentences to maintain gap-free playback.
