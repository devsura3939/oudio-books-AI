// Architecture and Autonomous Training Guide for EngBot / Lumina Audio Studio
// Shared between UI Training Lab and API route handlers

export const ENGINE_ARCHITECTURE_AND_TRAINING_GUIDE_MD = `# EngBot / Lumina Audio Studio — Autonomous Training Engine Guide

Welcome to the autonomous training interface for the **EngBot Georgian & English Translation, Transcription, and Audio Narration Engine**.

This documentation describes:
1. **What the Engine is Trained On** (Classical antiquity corpus, Georgian Pro linguistic datasets, computer vision OCR suites).
2. **System Architecture** (3-tier hybrid pipeline, non-executable safety layer).
3. **How External LLMs Can Train the Engine Effectively** (API loop, safe rule formulation, ReDoS prevention, deterministic benchmarking).

---

## 1. What the Engine is Trained On

The EngBot linguistic core and post-editing engines are grounded in extensive, multi-domain datasets curated specifically for high-fidelity Georgian and English literary translation, text-to-speech audio synthesis, and document transcription:

### A. Classical Antiquity & Philosophical Corpus
- **Sun Tzu's *The Art of War***: Comprehensive military, strategic, and philosophical terms aligned between classical English translations and literary Georgian.
- **Marcus Aurelius's *Meditations***: Stoic philosophical vocabulary, rhetorical cadence, and meditative sentence structures.
- **Homer's *Iliad* & *Odyssey***: Epic poetry register, archaic epithets, patronymics, and dactylic rhythm preservation.
- **Plato's *Dialogues***: Dialectical argumentation, philosophical inquiries, and nuanced interrogatives.
- **William Shakespeare**: Sonnets, tragedies (*Hamlet*, *Macbeth*, *King Lear*), blank verse cadence, and poetic metaphors.
- **Shota Rustaveli**: Idiomatic expressions from *The Knight in the Panther's Skin* (*ვეფხისტყაოსანი*), aphorisms, and historical Georgian grammatical constructions.

### B. Georgian Pro Morphosyntax & Phonetics Suite (Trae Solo v1.16–v1.45)
- **Vigesimal Number Verbalization (0 to 999,999,999,999)**: Complete Georgian base-20 numbering system (e.g., 73 = *სამოცდაცამეტი* — 60 + 13), compound vigesimal billions, millions, thousands, and units.
- **Grammatical Case Inflection**: Full 7-case declension agreements for numerals and adjectives (*სახელობითი, მოთხრობითი, მიცემითი, ნათესაობითი, მოქმედებითი, ვითარებითი, წოდებითი*).
- **ISO Dates & Temporal Expressions**: Cardinal/ordinal day-month inflections (*14 იანვარი* -> *თოთხმეტი იანვარი* / *თოთხმეტ იანვარს*).
- **Currency Agreement**: Inflection of *ლარი*, *თეთრი*, *დოლარი*, *ევრო*, and *ფუნტი* with preceding quantities.
- **Roman Numerals**: Conversion of I–XXI to Georgian ordinals (*XXI საუკუნე* -> *ოცდამეერთე საუკუნე*).
- **Abbreviations & Acronyms**: Pronunciation expansion for common Georgian acronyms (*ე.ი.* -> *ესე იგი*, *ე.წ.* -> *ეგრეთ წოდებული*, *ა.შ.* -> *ასე შემდეგ*, *სხვ.* -> *სხვადასხვა*).
- **Latin Idioms in Literary Contexts**: Natural Georgian phonetic renderings of Latin expressions (*de facto*, *ad hoc*, *status quo*, *per se*).

### C. Computer Vision & OCR Correction Corpus
- Ground-truth pairs of degraded Georgian book scans, historical typography, broken ligatures, and OCR character confusion matrices (e.g. distinguishing \`3\` from \`პ\`, \`ვ\` from \`უ\`, \`ც\` from \`ხ\`, \`ბ\` from \`ზ\`).

---

## 2. System Architecture

The system operates on a **3-Tier Hybrid Architecture** combining Frontier Neural LLMs, Deterministic Linguistic Engines, and Versioned Autonomous Rule Packs:

\`\`\`
[ Input Text / Audio / Scanned PDF ]
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│ Tier A: Frontier LLM / Neural Translation Core          │
│ • Gemini 2.5 Pro / Flash & Claude / GPT-4o               │
│ • Systemic Prompt Blocks for Literary Register & Tone   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Tier B: Deterministic Linguistic & Phonetic Engine      │
│ • 8,400+ lines of production Python (app/georgian_pro)  │
│ • Vigesimal number expansions & currency declensions    │
│ • TTS prosody, pauses, and breath-group pacing          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Tier C: Versioned Autonomous Rule Pack (Trainable Layer)│
│ • Data-only post-editing & validation rules             │
│ • Hot-swappable active_pack_ka.json / active_pack_en.json│
│ • Rollback capability with cryptographic version audits │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
[ Studio-Grade Audiobook Audio / Translated Publication ]
\`\`\`

### Safety & Non-Executable Rule Contract
To ensure absolute system stability, external LLMs **cannot submit code, scripts, or database queries**. External models can only propose **5 structured, data-only rule types**:

1. **\`glossary\`**: Exact term or phrase replacement. Uses Unicode-aware boundary matching.
   - \`pattern\`: Exact source word or phrase (case-preserving).
   - \`replacement\`: Canonical target rendering.
2. **\`autofix\`**: Safe regular expression pattern replacement.
   - \`pattern\`: Compiled regex without exponential backtracking.
   - \`replacement\`: Substituted string (can use group references).
3. **\`qa_rule\`**: Quality inspection detector.
   - \`pattern\`: Regex detecting undesirable translation artifacts or literalisms.
   - \`replacement\`: Warning message explaining why the output is problematic.
   - \`severity\`: \`"warn"\`, \`"error"\`, or \`"info"\`.
4. **\`prompt_block\`**: Injected prompt guidance for Tier A LLMs.
   - \`text\`: Clear systemic prompt instructions (e.g., "Always translate Stoic philosophical terms in a reflective, dignified register").
5. **\`ocr_fix\`**: Specialized optical character recognition repair for scanned books.
   - \`pattern\`: Corrupted OCR token or ligature artifact.
   - \`replacement\`: Corrected word.

---

## 3. How an LLM Can Train the Engine Effectively

External LLMs (Claude, GPT-4o, Gemini, or local models) can autonomously train and improve the engine via the **Autonomous Training REST API**.

### The 5-Step Autonomous Training Loop

1. **Open Session**: Call \`POST /api/public/train/session\` with header \`X-Training-Key: <YOUR_KEY>\`. Receive \`session_id\`, active pack version, baseline score, and ground-truth benchmark size.
2. **Inspect Context**: Call \`POST /api/public/train/context\` with \`{"session_id": "..."}\`. Receive the active rule pack and all currently failing benchmark cases with their \`source\`, \`expected\`, and \`got\` outputs.
3. **Diagnose & Formulate Rules**: Analyze failing cases. Classify each error into \`glossary\`, \`autofix\`, \`qa_rule\`, \`prompt_block\`, or \`ocr_fix\`.
4. **Submit Proposal**: Call \`POST /api/public/train/propose\` with \`{"session_id": "...", "items": [...]}\`. The server immediately replays the ground-truth benchmark suite:
   - If the composite score **strictly improves** and **zero existing cases regress**, the proposal is **instantly accepted** and promoted to production as a new version!
   - If the score decreases or any previously passing case fails, the proposal is **rejected** with detailed diagnostics.
5. **Finish Session**: Call \`POST /api/public/train/finish\` with \`{"session_id": "...", "summary": "..."}\` to commit performance analytics.

### Critical Rules & Best Practices for Training Models

1. **CRITICAL: NEVER USE ASCII \`\\b\` FOR GEORGIAN REGEXES!**
   - Standard regex \`\\b\` assumes ASCII \`[a-zA-Z0-9_]\`. In Unicode, Georgian characters (\`\\u10A0\` to \`\\u10FF\`) are treated as non-word boundaries!
   - **WRONG:** \`\\bომი\\b\` (Will fail or match incorrectly)
   - **CORRECT:** \`(?<![\\w\\u10A0-\\u10FF])ომი(?![\\w\\u10A0-\\u10FF])\`
2. **Avoid Catastrophic Backtracking (ReDoS):**
   - No nested quantifiers like \`(a+)+\`, \`(x*)*\`, or \`(a|b+)+\`.
   - No large numeric bounds like \`\\d{200,}\`.
   - No multiple adjacent \`.*\` wildcards.
   - Proposals containing risky regexes are automatically rejected before benchmark execution.
3. **Small, Targeted Batches:**
   - Propose **1 to 5 high-confidence rules** per iteration rather than 40 speculative rules. If even a single proposed rule causes a regression on an existing benchmark case, the entire batch is rejected!
4. **Inspect Failing Cases Carefully:**
   - Always check \`benchmark.failing\` in \`/context\`. Observe the exact character difference between \`got\` and \`expected\`.

---

## 4. API Reference & Quickstart Snippets

### Endpoint Overview
| Method | Endpoint | Description |
|---|---|---|
| \`GET\` | \`/api/public/train/guide\` | Returns this comprehensive training guide in Markdown or JSON (\`?format=json\`). |
| \`GET\` | \`/api/public/train/health\` | Returns engine status, pack version, score, and guide summary. |
| \`POST\` | \`/api/public/train/session\` | Opens an authenticated training session (\`X-Training-Key\` header). |
| \`POST\` | \`/api/public/train/context\` | Fetches active pack rules and currently failing benchmark test cases. |
| \`POST\` | \`/api/public/train/propose\` | Submits candidate rules for deterministic benchmark evaluation. |
| \`POST\` | \`/api/public/train/finish\` | Closes session and records performance analytics. |

### cURL Quickstart

\`\`\`bash
# 1. Open training session
curl -X POST https://your-domain.com/api/public/train/session \\
  -H "Content-Type: application/json" \\
  -H "X-Training-Key: engbot_tk_dev_training_key_ka_2026" \\
  -d '{"model": "gpt-4o"}'

# 2. Get active context & failing cases
curl -X POST https://your-domain.com/api/public/train/context \\
  -H "Content-Type: application/json" \\
  -H "X-Training-Key: engbot_tk_dev_training_key_ka_2026" \\
  -d '{"session_id": "<SESSION_ID>"}'

# 3. Propose improving rules
curl -X POST https://your-domain.com/api/public/train/propose \\
  -H "Content-Type: application/json" \\
  -H "X-Training-Key: engbot_tk_dev_training_key_ka_2026" \\
  -d '{
    "session_id": "<SESSION_ID>",
    "items": [
      {
        "type": "glossary",
        "pattern": "vital importance",
        "replacement": "სასიცოცხლო მნიშვნელობა",
        "note": "Standard military-philosophical terminology"
      }
    ],
    "model": "gpt-4o"
  }'

# 4. Finish session
curl -X POST https://your-domain.com/api/public/train/finish \\
  -H "Content-Type: application/json" \\
  -H "X-Training-Key: engbot_tk_dev_training_key_ka_2026" \\
  -d '{"session_id": "<SESSION_ID>", "summary": "Calibrated classical vocabulary"}'
\`\`\`
`;

export const TRAINING_CORPORA = [
  {
    title: "Classical Antiquity & Philosophy",
    badge: "Literature & Philosophy",
    description:
      "Aligned terminology, cadence, and conceptual clarity across English and literary Georgian.",
    items: [
      "Sun Tzu — The Art of War (military, strategy, governance)",
      "Marcus Aurelius — Meditations (Stoic contemplation, virtue, duty)",
      "Homer — Iliad & Odyssey (epic register, patronymics, dactylic pace)",
      "Plato — Dialogues (Socratic method, ethics, metaphysical inquiry)",
      "William Shakespeare — Sonnets & Tragedies (metaphor, verse, tone)",
      "Shota Rustaveli — The Knight in the Panther's Skin (aphorisms, historical grammar)",
    ],
  },
  {
    title: "Georgian Pro Morphosyntax Suite",
    badge: "Phonetics & Grammar",
    description:
      "Exhaustive deterministic verbalization and declension matrices (Trae Solo v1.16–v1.45).",
    items: [
      "Vigesimal numbers (0 to 999B) with Georgian base-20 rules (60+13 = სამოცდაცამეტი)",
      "7-case declension for numerals, adjectives, and compound noun phrases",
      "ISO date & temporal agreement (e.g. 14 იანვარს vs თოთხმეტი იანვარი)",
      "Georgian currency inflection (ლარი, თეთრი, დოლარი, ევრო, ფუნტი)",
      "Roman numerals I–XXI conversion to Georgian ordinals (XXI -> ოცდამეერთე)",
      "Abbreviation expansions (ე.ი., ე.წ., ა.შ., ე.ფ., სხვ.) & Latin terms (ad hoc, de facto)",
    ],
  },
  {
    title: "Computer Vision & OCR Reparation",
    badge: "OCR & Document Vision",
    description:
      "Real-world scan distortion ground-truth pairs for printed Georgian typography.",
    items: [
      "Ligature repair and broken character reconstructions",
      "Disambiguation pairs: 3 / პ, ვ / უ, ც / ხ, ბ / ზ, შ / წ",
      "Historical printings and scanned PDF margin artifact removal",
      "Line-break hyphenation restoration for Georgian polysyllabic compounds",
    ],
  },
];

export const ARCHITECTURE_TIERS = [
  {
    tier: "Tier A",
    name: "Frontier LLM / Neural Core",
    tech: "Gemini 2.5 Pro / Flash · Claude 3.7 · GPT-4o",
    description:
      "Deep contextual comprehension, idiomatic translation, and emotional resonance. Guided by curated systemic prompt blocks.",
  },
  {
    tier: "Tier B",
    name: "Deterministic Linguistic Engine",
    tech: "8,400+ lines Python (georgian_pro & georgian_phonetics)",
    description:
      "Zero-hallucination post-editing: vigesimal number expansion, grammatical cases, currency declension, TTS prosody breath groups.",
  },
  {
    tier: "Tier C",
    name: "Versioned Autonomous Rule Pack",
    tech: "Hot-swappable JSON packs (active_pack_ka / active_pack_en)",
    description:
      "Trainable data-only layer: glossary, safe autofixes, QA warnings, prompt guidance, and OCR repairs with instant automated rollback.",
  },
];

export const RULE_TEMPLATES = {
  glossary: {
    type: "glossary",
    pattern: "vital importance",
    replacement: "სასიცოცხლო მნიშვნელობა",
    note: "Sun Tzu Chapter 1 strategic terminology",
  },
  autofix: {
    type: "autofix",
    pattern: "(?<![\\w\\u10A0-\\u10FF])სტატუს[\\s-]კვო(?![\\w\\u10A0-\\u10FF])",
    replacement: "სტატუს-კვო",
    note: "Ensure standard hyphenation for status quo",
  },
  qa_rule: {
    type: "qa_rule",
    pattern: "ომის ხელობა",
    replacement: "Unidiomatic literalism: use 'ომის ხელოვნება' for Art of War",
    severity: "warn",
  },
  prompt_block: {
    type: "prompt_block",
    text: "When translating Stoic philosophical texts, preserve solemnity and reflective cadence. Render 'Logos' as 'ლოგოსი' or 'გონი' depending on immediate context.",
  },
  ocr_fix: {
    type: "ocr_fix",
    pattern: "3ოლიტიკა",
    replacement: "პოლიტიკა",
    note: "Fix numeral 3 OCR distortion for Georgian letter პ",
  },
};
