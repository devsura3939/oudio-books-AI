# EngBot / Lumina Audio Studio — External LLM Training Guide

This guide explains how to connect external Large Language Models (ChatGPT, Claude, Gemini, DeepSeek, local Ollama) or autonomous training harnesses to the **EngBot Training API** to train and continuously improve the Georgian and English translation and transcription engines.

---

## 1. Core Architecture & Safety Principles

1. **Immutable Built-In Baseline**:
   - The built-in core linguistics (`georgian-linguistics.js` and `app/translation_engine.py`) is never directly edited by LLMs.
   - Training generates versioned **Rule Packs** layered on top of the built-in engine at runtime.
2. **Strict Data-Only Rules (Zero Executable Code)**:
   External LLMs can only propose 5 structured, data-only rule types:
   - `glossary`: Literal source phrase $\rightarrow$ preferred Georgian translation.
   - `autofix`: Safe regular expression $\rightarrow$ replacement text.
   - `qa_rule`: Regular expression matching quality errors $\rightarrow$ warning message.
   - `prompt_block`: Guidance appended to system prompts.
   - `ocr_fix`: Common OCR glyph distortion $\rightarrow$ corrected word.
3. **Deterministic Safety & Benchmark Gate**:
   - ReDoS validator automatically rejects polynomial/exponential backtracking patterns (nested unbounded quantifiers, lookbehinds, large repetitions).
   - Server immediately replays candidate packs against test benchmark cases.
   - **Auto-Promotion Rule**: A candidate is approved **only** if the benchmark score increases, zero previously passing cases regress, and zero false positives are introduced.

---

## 2. Quick Start: Testing the Training API Locally

### Start the Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Run the Automated Training Harness
```bash
python scripts/train_with_llm.py --url http://localhost:8000 --key engbot_tk_dev_training_key_ka_2026
```

---

## 3. REST API Reference

All endpoints accept authentication via:
- Header: `X-Training-Key: <key>`
- Header: `Authorization: Bearer <key>`
- JSON body field: `"key": "<key>"`

Default Local Development Key: `engbot_tk_dev_training_key_ka_2026`

### 1. Check Training API Health
```http
GET /api/public/train/health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "EngBot Autonomous Training Engine",
  "active_pack": {
    "version": 1,
    "items_count": 0,
    "score": 45.2
  },
  "benchmark": {
    "total_cases": 7,
    "exact_matches": 1
  },
  "supported_item_types": ["glossary", "autofix", "qa_rule", "prompt_block", "ocr_fix"],
  "default_dev_key": "engbot_tk_dev_training_key_ka_2026"
}
```

---

### 2. Open a Training Session
```http
POST /api/public/train/session
Headers:
  Content-Type: application/json
  X-Training-Key: engbot_tk_dev_training_key_ka_2026

Body:
{
  "model": "gpt-4o"
}
```

**Response**:
```json
{
  "session_id": "7b792e36-1217-4809-b664-9f2cb424ecf5",
  "language": "ka",
  "scope": "both",
  "pack_version": 1,
  "pack_items": 0,
  "benchmark": {
    "cases": 7,
    "score": 45.2,
    "exact": 1
  },
  "allowed_item_types": ["glossary", "autofix", "qa_rule", "prompt_block", "ocr_fix"],
  "limits": {
    "max_items": 4000,
    "max_pattern_length": 240,
    "max_replacement_length": 400,
    "max_prompt_block_length": 4000,
    "max_prompt_blocks": 60,
    "max_items_per_proposal": 40,
    "max_text_for_rules": 200000
  }
}
```

---

### 3. Fetch Active Pack & Benchmark Failures
```http
POST /api/public/train/context
Headers:
  Content-Type: application/json
  X-Training-Key: engbot_tk_dev_training_key_ka_2026

Body:
{
  "session_id": "7b792e36-1217-4809-b664-9f2cb424ecf5"
}
```

**Response**:
```json
{
  "session_id": "7b792e36-1217-4809-b664-9f2cb424ecf5",
  "language": "ka",
  "pack_version": 1,
  "pack": [],
  "benchmark": {
    "cases": 7,
    "score": 45.2,
    "exact": 1,
    "failing": [
      {
        "id": "case-sun-tzu-01",
        "got": "ომის ხელოვნება სასიცოცხლო მნიშვნელობა აქვს სახელმწიფოსთვის.",
        "expected": "ომის ხელოვნება სასიცოცხლო მნიშვნელობისაა სახელმწიფოსთვის."
      }
    ]
  },
  "samples": [...]
}
```

---

### 4. Propose Candidate Rules
```http
POST /api/public/train/propose
Headers:
  Content-Type: application/json
  X-Training-Key: engbot_tk_dev_training_key_ka_2026

Body:
{
  "session_id": "7b792e36-1217-4809-b664-9f2cb424ecf5",
  "model": "gpt-4o",
  "note": "Resolving Sun Tzu genitive copula",
  "items": [
    {
      "type": "autofix",
      "pattern": "სასიცოცხლო მნიშვნელობა აქვს სახელმწიფოსთვის",
      "replacement": "სასიცოცხლო მნიშვნელობისაა სახელმწიფოსთვის",
      "note": "Genitive predicate alignment"
    }
  ]
}
```

**Response (When Accepted)**:
```json
{
  "iteration": 1,
  "accepted": true,
  "reason": "accepted: score improved 45.2 -> 58.4, passed 1/7 -> 2/7 exact",
  "rejected_items": [],
  "score_before": 45.2,
  "score_after": 58.4,
  "exact_before": 1,
  "exact_after": 2,
  "failing": [...],
  "pack_version": 2,
  "pack_items": 1
}
```

---

### 5. Finish Training Session
```http
POST /api/public/train/finish
Headers:
  Content-Type: application/json
  X-Training-Key: engbot_tk_dev_training_key_ka_2026

Body:
{
  "session_id": "7b792e36-1217-4809-b664-9f2cb424ecf5",
  "summary": "Resolved genitive copula agreement in literary texts."
}
```

**Response**:
```json
{
  "session_id": "7b792e36-1217-4809-b664-9f2cb424ecf5",
  "status": "finished",
  "iterations": 1,
  "accepted_proposals": 1,
  "start_score": 45.2,
  "final_score": 58.4,
  "score_delta": 13.2,
  "active_pack_version": 2,
  "active_pack_items": 1
}
```

---

## 4. Rule Types Specification

| Type | Target Problem | Pattern Example | Replacement / Output |
| :--- | :--- | :--- | :--- |
| `glossary` | Specific proper nouns, titles, terminology | `"Marcus Aurelius"` | `"მარკუს ავრელიუსი"` |
| `autofix` | Regular expression morphology or phrase error | `"(?<![\\u10A0-\\u10FF])სახლ\\|ს(?![\\u10A0-\\u10FF])"` | `"სახლის"` |
| `qa_rule` | Flag low-quality or untranslated residue | `"(?<![\\u10A0-\\u10FF])of the(?![\\u10A0-\\u10FF])"` | `"Untranslated English preposition residue"` |
| `prompt_block` | Guiding the LLM on nuances and conventions | N/A | Guidance string (min 8 chars, max 4000) |
| `ocr_fix` | Scanned book OCR character misreads | `"მეგობ-რობა"` | `"მეგობრობა"` |

---

## 5. Integrating External LLMs (Python SDK / LangChain / Cursor / Trae)

```python
import requests

API_BASE = "http://localhost:8000/api/public/train"
KEY = "engbot_tk_dev_training_key_ka_2026"
HEADERS = {"X-Training-Key": KEY, "Content-Type": "application/json"}

# 1. Start session
session = requests.post(f"{API_BASE}/session", json={"model": "claude-3-5-sonnet"}, headers=HEADERS).json()
session_id = session["session_id"]

# 2. Get context and failures
ctx = requests.post(f"{API_BASE}/context", json={"session_id": session_id}, headers=HEADERS).json()
failing_cases = ctx["benchmark"]["failing"]

# 3. Ask your LLM: "Given these failing cases, generate up to 5 glossary or autofix items in JSON"
# ... call your model here ...

# 4. Propose items
proposal = requests.post(f"{API_BASE}/propose", json={
    "session_id": session_id,
    "items": proposed_items,
    "model": "claude-3-5-sonnet"
}, headers=HEADERS).json()

print("Score:", proposal["score_before"], "->", proposal["score_after"], "Accepted:", proposal["accepted"])

# 5. Finish
requests.post(f"{API_BASE}/finish", json={"session_id": session_id}, headers=HEADERS)
```
