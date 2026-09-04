# 🎧 AudioRead Studio & Lumina Audio: AI Audiobook & Georgian Translation Engine

[![Deploy to GitHub Pages](https://github.com/devsura3939/oudio-books-AI/actions/workflows/pages.yml/badge.svg)](https://github.com/devsura3939/oudio-books-AI/actions/workflows/pages.yml)
[![Integrity Test Suite](https://img.shields.io/badge/Tests-15%2F15%20PASS%20(100%25)-brightgreen)](tests/test_georgian_integrity.py)
[![Edge-TTS](https://img.shields.io/badge/TTS-Microsoft%20Edge%20Neural-blue)](#-embedded-audio--tts-engine)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Transform PDF eBooks into studio-grade audiobooks and translate literature into elegant Georgian with guaranteed linguistic integrity, Unicode fidelity, and natural neural voice narration.

---

## 🌐 Live Production Links

- **🚀 Live Web Application (GitHub Pages):**  
  👉 **[https://devsura3939.github.io/oudio-books-AI/](https://devsura3939.github.io/oudio-books-AI/)**  
  *(Ready to use directly in any modern browser — zero installation or server deployment required).*
- **📦 GitHub Repository:**  
  👉 **[https://github.com/devsura3939/oudio-books-AI](https://github.com/devsura3939/oudio-books-AI)**

---

## ✨ Key Capabilities

### 1. 📖 Smart PDF eBook Ingestion
- **Automated Chapter Extraction**: Detects Table of Contents, PDF bookmarks, and regex heading patterns (`Chapter X`, `Part I`, `პროლოგი`, etc.).
- **Artifact Stripping**: Cleans running headers, footers, soft hyphenations, page numbers, and orphan artifacts without destroying paragraph flow.
- **Interactive Chapter Editor**: Real-time word count, reading time estimates, audio length projections, and text editing prior to synthesis.

### 2. 🇬🇪 High-Fidelity Georgian Literary Translation Engine
- **Unicode & Punctuation Integrity**:
  - Complete eradication of corrupt characters (such as Khmer U+17D4).
  - Preserves literary punctuation: periods (`.`), semicolons (`;`), em-dashes, and dialogue quotation markers.
  - Unicode-aware boundary handling prevents truncation or invalid regex splitting on Georgian Mkhedruli text.
- **Prompt Prefix Caching**:
  - Clear separation of `systemInstruction` (Gemini) and `role: 'system'` (Groq, OpenRouter, Custom endpoints) enables provider context caching, reducing token usage and latency by up to 60%.
  - Uses compact, high-density linguistic rules (~12k characters) to maximize efficiency within provider token limits.
- **Book-Level Terminology & Glossary Pre-Pass**:
  - Analyzes the full chapter/book to extract character names, place names, and domain terminology.
  - Automatically compiles a glossary block injected into the translation context to guarantee character name consistency across chapters.
- **Paragraph-Preserving Chunking**:
  - Chunks text at natural paragraph breaks (`\n\n`) rather than arbitrary sentence cuts, keeping literary narrative structure intact.
- **Quality Gate Assessment (`assessTranslation`)**:
  - Validates output completeness and alphabet fidelity.
  - Detects and rejects untranslated English leakage or hallucinated noise before writing to the database.

### 3. 🎙️ Embedded Audio & TTS Engine
- **Edge-TTS Neural Voices**: 100% free, unlimited, studio-grade voices across 40+ languages and regional accents (US, UK, Georgian, etc.).
- **Phonetic Transliteration (`transliterateLatinInGeorgian`)**:
  - Automatically transliterates Latin character names and terms into phonetic Georgian Mkhedruli (e.g., *Harry Potter* → *ჰარი პოტერი*, *Sherlock Holmes* → *შერლოკ ჰოლმსი*) so Georgian TTS voices pronounce names naturally without skipping or spelling them out.
- **Historical Year Range Verbalization**:
  - Expands years and date ranges into full Georgian spoken numerals (e.g., `1939-1945` → *ათას ცხრაას ოცდაცხრამეტიდან ათას ცხრაას ორმოცდახუთ წლამდე*).
- **In-Browser Audio Player**: Full playback controls (play/pause, seek ±15s, variable speed 0.75x–2.0x, auto-advance, individual chapter MP3 download, and full ZIP bundle export).

### 4. 📷 Book Scanner & OCR Pipeline
- **Smart Image Pre-Processing**: Automatically constrains image dimensions (`MAX_EDGE = 1800px`) and compresses to 0.85 JPEG quality for optimal OCR throughput and token efficiency.
- **Phonotactic Vowel Validation**: Rejects corrupted text or garbled OCR scans where Georgian vowel ratio falls below 10%.
- **Anti-Hallucination Guardrails**: Cross-references scanned text against OCR candidates, requiring ≥ 40% content retention to prevent model hallucinations.

### 5. 🤖 Multi-Provider AI Support
- Connect directly from your browser to:
  - **Google Gemini**: `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`
  - **Groq**: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`
  - **OpenRouter**: All supported open-weights and proprietary models
  - **Custom Endpoints**: Any OpenAI-compatible API endpoint (vLLM, Ollama, LocalAI, etc.)
  - **AI Gateway / Built-in Demo**: Fallback proxy with credit checking.

---

## 🧪 Step-by-Step Live Testing Guide

You can test all features right now using the live deployment:

### 1. Open the Live Application
Navigate to **[https://devsura3939.github.io/oudio-books-AI/](https://devsura3939.github.io/oudio-books-AI/)**.

### 2. Configure Your AI Provider (Settings)
1. Click the **Settings (⚙️)** icon in the navigation bar.
2. Under **AI Provider**, select your preferred model service:
   - **Google Gemini**: Enter your [Google AI Studio API key](https://aistudio.google.com/) (free).
   - **Groq**: Enter your [Groq API key](https://console.groq.com/) for ultra-fast LLaMA inference.
   - **Custom / Local**: Enter your OpenAI-compatible endpoint URL and model name.
3. Click **Save Settings**. (Your keys are stored only in your browser's private `localStorage`).

### 3. Test Translation with Linguistic Quality Gating
1. Go to the **Translate** or **Studio** view.
2. Paste an English literary excerpt or chapter (for example):
   ```text
   Harry Potter lived at number four, Privet Drive. Between 1939 and 1945, the world changed forever.
   He never forgot his friends Ron and Hermione.
   ```
3. Click **Translate to Georgian**.
4. **Observe the Integrity Pipeline**:
   - **Glossary extraction**: Automatically detects *Harry Potter*, *Privet Drive*, *Ron*, *Hermione*.
   - **Paragraph preservation**: Retains exact line breaks and dialogue indentation.
   - **Quality gate validation**: Evaluates Georgian alphabet ratio and ensures no untranslated English text leaks into the final output.

### 4. Test TTS Audio Generation & Transliteration
1. In the studio player, select a Georgian voice (or test with Edge-TTS).
2. Click **Generate Audio** or **Play**.
3. **Verify Verbalization**:
   - English names are phonetically spoken as *ჰარი პოტერი*, *რონ*, *ჰერმიონ*.
   - The year range `1939-1945` is vocalized naturally in Georgian grammatical numerals.

### 5. Test the OCR Book Scanner
1. Go to the **Scanner** tab.
2. Upload or capture a photo of a book page.
3. The scanner optimizes image dimensions, invokes vision extraction, and verifies Georgian phonotactic validity before presenting clean, editable chapter text.

---

## 💻 Local Development & Offline Running

### Quick Launch (Windows)
Double-click `run.bat` or run:
```powershell
python main.py
```
This starts the local Python backend at `http://127.0.0.1:8000` and automatically opens the studio interface in your default browser.

### Full-Stack Development (Frontend App)
If you wish to run or develop the TanStack Start / Lovable UI locally:
```bash
cd lovable-app
npm install
npm run dev
```

---

## 🔬 Automated Regression & Integrity Tests

A dedicated test suite validates all 15 P0/P1 linguistic integrity rules, phonetic engines, and security guardrails:

```powershell
python tests/test_georgian_integrity.py
```

### What the Test Suite Verifies:
1. `[PASS]` 0 instances of Khmer `U+17D4` in linguistic rules.
2. `[PASS]` Period-stripping auto-fix 4.15 completely removed.
3. `[PASS]` `latin_period` rule removed from validator.
4. `[PASS]` 0 instances of `\b` adjacent to Georgian letters in `static/app.js`.
5. `[PASS]` 0 instances of `\b` adjacent to Georgian letters in `static/georgian-linguistics.js`.
6. `[PASS]` `assessTranslation` quality gate function exists and enforces thresholds.
7. `[PASS]` `translateSingleSentence` never returns untranslated source text on failure.
8. `[PASS]` System prompt separation and book glossary block verified in `static/app.js`.
9. `[PASS]` API route `lovable-app/src/routes/api/ai.ts` accepts and passes `systemPrompt`.
10. `[PASS]` Edge TTS route `lovable-app/src/routes/api/tts.ts` isolates Gemini voice steer into `systemInstruction`.
11. `[PASS]` Latin name transliteration and year-range verbalization verified.
12. `[PASS]` Scanner max edge (1800px), 0.85 JPEG compression, and unreadable rejection verified.
13. `[PASS]` Supabase database repair migration `005_repair_translations.sql` exists and is valid SQL.
14. `[PASS]` Legacy Python replacement control characters eradicated (`\g<1>` replaces `\x01`).
15. `[PASS]` Gold Georgian literary sample retains all structure, quotes, and punctuation without corruption.

---

## 🗄️ Database Repair Migration (Supabase)

If you have existing translated books stored in a Supabase database that were created before the integrity engine fixes, run the provided SQL migration to clean up corruptions:

1. Open your **Supabase Dashboard** → **SQL Editor**.
2. Open file [`lovable-app/supabase/external/005_repair_translations.sql`](lovable-app/supabase/external/005_repair_translations.sql).
3. Paste the contents and click **Run**.

### What this migration does:
- Removes Khmer punctuation (`U+17D4`) from all historical `books` and `chapters` records.
- Strips trailing backslashes and corrupted regex artifacts.
- Identifies and flags entries where English text leaked into Georgian translation fields (`text_ka`).
- Recomputes clean word counts and timestamps.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
