"""
Autonomous Training Engine for EngBot / Lumina Audio Studio
Enables external LLMs (Claude, GPT-4o, Gemini, local models) to train the
Georgian and English translation & transcription rule packs via REST API.

Strictly non-executable: Only 5 data-only item types can be proposed:
1. glossary: Source phrase -> preferred target rendering
2. autofix: Safe regex -> replacement text
3. qa_rule: Regex pattern -> quality warning
4. prompt_block: Guidance appended to LLM system prompts
5. ocr_fix: OCR character distortion -> corrected word
"""

import json
import re
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from app.config import BASE_DIR

TRAINING_DIR = BASE_DIR / "data" / "training"
TRAINING_DIR.mkdir(parents=True, exist_ok=True)

KEYS_FILE = TRAINING_DIR / "training_keys.json"
ACTIVE_PACK_KA_FILE = TRAINING_DIR / "active_pack_ka.json"
ACTIVE_PACK_EN_FILE = TRAINING_DIR / "active_pack_en.json"
BENCHMARK_CASES_KA_FILE = TRAINING_DIR / "benchmark_cases_ka.json"
BENCHMARK_CASES_EN_FILE = TRAINING_DIR / "benchmark_cases_en.json"
SESSIONS_FILE = TRAINING_DIR / "sessions.json"
ITERATIONS_FILE = TRAINING_DIR / "iterations.json"

PACK_LIMITS = {
    "max_items": 4000,
    "max_pattern_length": 240,
    "max_replacement_length": 400,
    "max_prompt_block_length": 4000,
    "max_prompt_blocks": 60,
    "max_items_per_proposal": 40,
    "max_text_for_rules": 200_000,
}

ALLOWED_LANGUAGES = {"ka", "en"}
ALLOWED_ITEM_TYPES = {"glossary", "autofix", "qa_rule", "prompt_block", "ocr_fix"}

DEFAULT_DEV_KEY = "engbot_tk_dev_training_key_ka_2026"


def sha256_hex(value: str) -> str:
    """Compute SHA-256 hex digest for training key verification."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


# ── Safety & ReDoS Detection ──────────────────────────────────────────────────
def regex_is_risky(source: str) -> Optional[str]:
    """Reject regex sources that risk polynomial or exponential backtracking."""
    if re.search(r"\((?:[^()]*[+*])\)\s*[+*]", source):
        return "nested unbounded quantifier"
    if re.search(r"\{\s*\d{3,}\s*,?\s*\d*\s*\}", source):
        return "quantifier bound too large"
    if source.count(".*") >= 2 or re.search(r"(\.\*){2,}", source):
        return "multiple .* wildcards"
    if re.search(r"\\[0-9]", source):
        return "backreferences are not allowed"
    if "(?<" in source:
        return "lookbehind is not allowed"
    return None


def validate_item(item: Any, language: str) -> Tuple[bool, Optional[str]]:
    """Validate a single candidate rule item proposed by an LLM."""
    if not isinstance(item, dict):
        return False, "item must be a JSON object"

    item_type = str(item.get("type", "")).strip()
    if item_type not in ALLOWED_ITEM_TYPES:
        return False, f"unsupported item type '{item_type}'"

    if language not in ALLOWED_LANGUAGES:
        return False, f"unsupported language '{language}'"

    if item_type == "prompt_block":
        text = str(item.get("text") or item.get("replacement") or "").strip()
        if len(text) < 8:
            return False, "prompt_block text is too short"
        if len(text) > PACK_LIMITS["max_prompt_block_length"]:
            return False, "prompt_block text is too long"
        if re.search(r"<script|javascript:|function\s*\(|=>|process\.env|import\s|require\(", text, re.IGNORECASE):
            return False, "prompt_block may not contain executable code"
        return True, None

    pattern = str(item.get("pattern", "")).strip()
    replacement = str(item.get("replacement", "")).strip()

    if not pattern:
        return False, "pattern is required"
    if len(pattern) > PACK_LIMITS["max_pattern_length"]:
        return False, "pattern is too long"
    if len(replacement) > PACK_LIMITS["max_replacement_length"]:
        return False, "replacement is too long"

    if item_type == "qa_rule" and len(replacement) < 3:
        return False, "qa_rule needs a descriptive warning message in 'replacement'"

    if item_type in ("glossary", "ocr_fix") and not replacement:
        return False, "replacement is required"

    if item_type in ("autofix", "qa_rule"):
        risk = regex_is_risky(pattern)
        if risk:
            return False, f"unsafe regex pattern: {risk}"
        try:
            re.compile(pattern)
        except Exception as e:
            return False, f"invalid regex syntax: {e}"

    return True, None


def normalise_item(
    raw: Dict[str, Any],
    language: str,
    session_id: Optional[str] = None,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """Construct a clean, immutable PackItem."""
    item_type = str(raw.get("type", "")).strip()
    item_id = str(raw.get("id") or uuid.uuid4())
    norm = {
        "id": item_id,
        "type": item_type,
        "language": language,
        "pattern": str(raw.get("pattern", "")).strip(),
        "replacement": str(raw.get("replacement", "")).strip(),
        "severity": "error" if raw.get("severity") == "error" else ("info" if raw.get("severity") == "info" else "warn"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id,
        "model": model,
    }
    if item_type == "prompt_block":
        norm["text"] = str(raw.get("text") or raw.get("replacement") or "").strip()
    if raw.get("note"):
        norm["note"] = str(raw.get("note"))[:400]
    return norm


# ── Pack Application & Deterministic Evaluation ───────────────────────────────
def apply_pack(text: str, items: List[Dict[str, Any]], kind: str = "translate") -> str:
    """Apply rule pack post-editing layers to text."""
    if not text or not items:
        return text
    if len(text) > PACK_LIMITS["max_text_for_rules"]:
        return text

    out = text
    # 1. Literals (glossary for translate, ocr_fix for transcribe)
    target_type = "ocr_fix" if kind == "transcribe" else "glossary"
    for item in items:
        if item.get("type") == target_type:
            pat = item.get("pattern", "")
            rep = item.get("replacement", "")
            if not pat:
                continue
            # Unicode-aware word boundaries
            esc = re.escape(pat)
            safe_re = re.compile(rf"(?<![\w\u10A0-\u10FF]){esc}(?![\w\u10A0-\u10FF])")
            out = safe_re.sub(rep, out)

    # 2. Autofixes (safe regex replacements)
    for item in items:
        if item.get("type") == "autofix":
            pat = item.get("pattern", "")
            rep = item.get("replacement", "")
            if not pat:
                continue
            try:
                out = re.sub(pat, rep, out)
            except Exception:
                pass

    return out


def run_qa_rules(text: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect quality issues in text using QA rules."""
    findings = []
    if not text or len(text) > PACK_LIMITS["max_text_for_rules"]:
        return findings

    for item in items:
        if item.get("type") == "qa_rule":
            pat = item.get("pattern", "")
            if not pat:
                continue
            try:
                m = re.search(pat, text)
                if m:
                    findings.append({
                        "item_id": item.get("id"),
                        "message": item.get("replacement"),
                        "severity": item.get("severity", "warn"),
                        "match": m.group(0)[:80]
                    })
            except Exception:
                pass

    return findings


def character_similarity(a: str, b: str) -> float:
    """Deterministic character bag & prefix similarity metric (0..1)."""
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0

    max_len = max(len(a), len(b))
    b_counts: Dict[str, int] = {}
    for ch in b:
        b_counts[ch] = b_counts.get(ch, 0) + 1

    same = 0
    for ch in a:
        if b_counts.get(ch, 0) > 0:
            same += 1
            b_counts[ch] -= 1

    bag = same / max_len

    prefix = 0
    min_len = min(len(a), len(b))
    while prefix < min_len and a[prefix] == b[prefix]:
        prefix += 1

    return min(1.0, bag * 0.7 + (prefix / max_len) * 0.3)


def evaluate_pack(items: List[Dict[str, Any]], cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Replay all benchmark test cases with candidate pack and compute score."""
    if not cases:
        return {
            "score": 0.0,
            "passed": 0,
            "total": 0,
            "failures": [],
            "qa_false_positives": 0,
        }

    weighted_score = 0.0
    total_weight = 0.0
    passed = 0
    failures = []

    for c in cases:
        source = c.get("source", "")
        expected = re.sub(r"\s+", " ", c.get("expected", "")).strip()
        kind = c.get("kind", "translate")
        weight = float(c.get("weight", 1.0))

        got = re.sub(r"\s+", " ", apply_pack(source, items, kind)).strip()
        sim = character_similarity(got, expected)

        weighted_score += sim * weight
        total_weight += weight

        if got == expected:
            passed += 1
        else:
            failures.append({
                "id": c.get("id"),
                "got": got[:300],
                "expected": expected[:300]
            })

    qa_false_positives = 0
    for c in cases:
        expected = c.get("expected", "")
        qa_false_positives += len(run_qa_rules(expected, items))

    base = (weighted_score / total_weight) * 100.0 if total_weight > 0 else 0.0
    penalty = min(20.0, qa_false_positives * 2.0)
    final_score = max(0.0, round(base - penalty, 3))

    return {
        "score": final_score,
        "passed": passed,
        "total": len(cases),
        "failures": failures[:25],
        "qa_false_positives": qa_false_positives
    }


def is_improvement(before: Dict[str, Any], after: Dict[str, Any]) -> Tuple[bool, str]:
    """Safety gate: Only promote when score improves with zero regressions."""
    if after["qa_false_positives"] > before["qa_false_positives"]:
        return False, "rejected: QA rule triggers on known-good benchmark expected text (false positive)"
    if after["passed"] < before["passed"]:
        regressions = before["passed"] - after["passed"]
        return False, f"rejected: {regressions} benchmark case(s) that previously passed now fail (regression)"
    if after["score"] < before["score"] - 0.0001:
        return False, f"rejected: benchmark score dropped ({before['score']} -> {after['score']})"
    if after["score"] <= before["score"] + 0.0001 and after["passed"] == before["passed"]:
        return False, "rejected: no measurable improvement on the benchmark"

    return True, f"accepted: score improved {before['score']} -> {after['score']}, passed {before['passed']}/{before['total']} -> {after['passed']}/{after['total']} exact"


# ── Storage & Initialization ─────────────────────────────────────────────────
def init_training_storage():
    """Seed initial training keys, baseline pack, and rich benchmark cases if missing."""
    # 1. Training Keys
    if not KEYS_FILE.exists():
        keys_data = {
            sha256_hex(DEFAULT_DEV_KEY): {
                "id": str(uuid.uuid4()),
                "key_prefix": DEFAULT_DEV_KEY[:22],
                "label": "Default Developer Training Key (Georgian Engine)",
                "language": "ka",
                "scope": "both",
                "uses": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "revoked_at": None,
                "last_used_at": None
            }
        }
        KEYS_FILE.write_text(json.dumps(keys_data, indent=2, ensure_ascii=False), encoding="utf-8")

    # 2. Active Pack (KA)
    if not ACTIVE_PACK_KA_FILE.exists():
        initial_pack_ka = {
            "version": 1,
            "language": "ka",
            "score": None,
            "enabled": True,
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        ACTIVE_PACK_KA_FILE.write_text(json.dumps(initial_pack_ka, indent=2, ensure_ascii=False), encoding="utf-8")

    # 3. Active Pack (EN)
    if not ACTIVE_PACK_EN_FILE.exists():
        initial_pack_en = {
            "version": 1,
            "language": "en",
            "score": None,
            "enabled": True,
            "items": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        ACTIVE_PACK_EN_FILE.write_text(json.dumps(initial_pack_en, indent=2, ensure_ascii=False), encoding="utf-8")

    # 4. Benchmark Cases (KA)
    if not BENCHMARK_CASES_KA_FILE.exists():
        seed_cases_ka = [
            {
                "id": "case-sun-tzu-01",
                "language": "ka",
                "kind": "translate",
                "source": "The art of war is of vital importance to the State.",
                "expected": "ომის ხელოვნება სასიცოცხლო მნიშვნელობისაა სახელმწიფოსთვის.",
                "weight": 2.0,
                "origin": "seed",
                "note": "Sun Tzu opening sentence"
            },
            {
                "id": "case-locative-01",
                "language": "ka",
                "kind": "translate",
                "source": "He was standing in front of the house.",
                "expected": "ის იდგა სახლის წინ.",
                "weight": 1.5,
                "origin": "seed",
                "note": "Locative postposition resolution"
            },
            {
                "id": "case-date-verbalizer-01",
                "language": "ka",
                "kind": "translate",
                "source": "In 1921 the state declared independence.",
                "expected": "1921 წელს სახელმწიფომ დამოუკიდებლობა გამოაცხადა.",
                "weight": 1.5,
                "origin": "seed",
                "note": "Year and ergative subject case"
            },
            {
                "id": "case-ocr-glyph-01",
                "language": "ka",
                "kind": "transcribe",
                "source": "სახლ|ს წინ იდგა",
                "expected": "სახლის წინ იდგა",
                "weight": 1.0,
                "origin": "seed",
                "note": "OCR vertical bar artifact repair"
            },
            {
                "id": "case-marcus-01",
                "language": "ka",
                "kind": "translate",
                "source": "Marcus Aurelius wrote his Meditations in silence.",
                "expected": "მარკუს ავრელიუსმა თავისი ფიქრები სიჩუმეში დაწერა.",
                "weight": 2.0,
                "origin": "seed",
                "note": "Classical proper name and ergative marker"
            },
            {
                "id": "case-ocr-broken-georgian-01",
                "language": "ka",
                "kind": "transcribe",
                "source": "მეგობ-რობა და ერთგულება",
                "expected": "მეგობრობა და ერთგულება",
                "weight": 1.0,
                "origin": "seed",
                "note": "OCR hyphenation stitch"
            },
            {
                "id": "case-idiom-01",
                "language": "ka",
                "kind": "translate",
                "source": "Actions speak louder than words.",
                "expected": "საქმე სიტყვაზე მეტყველებს.",
                "weight": 1.5,
                "origin": "seed",
                "note": "Idiomatic literary rendering"
            }
        ]
        BENCHMARK_CASES_KA_FILE.write_text(json.dumps(seed_cases_ka, indent=2, ensure_ascii=False), encoding="utf-8")

    # 5. Sessions & Iterations
    if not SESSIONS_FILE.exists():
        SESSIONS_FILE.write_text("{}", encoding="utf-8")
    if not ITERATIONS_FILE.exists():
        ITERATIONS_FILE.write_text("[]", encoding="utf-8")


init_training_storage()


# ── Training API Handlers ─────────────────────────────────────────────────────
def verify_key(raw_key: str) -> Optional[Dict[str, Any]]:
    """Verify training key and return key metadata."""
    if not raw_key or len(raw_key) < 15:
        return None
    init_training_storage()
    try:
        keys_data = json.loads(KEYS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None

    h = sha256_hex(raw_key.strip())
    key_info = keys_data.get(h)
    if not key_info or key_info.get("revoked_at"):
        return None

    key_info["uses"] = key_info.get("uses", 0) + 1
    key_info["last_used_at"] = datetime.now(timezone.utc).isoformat()
    keys_data[h] = key_info
    KEYS_FILE.write_text(json.dumps(keys_data, indent=2, ensure_ascii=False), encoding="utf-8")
    return key_info


def load_active_pack(language: str) -> Dict[str, Any]:
    """Load active rule pack for language."""
    init_training_storage()
    filepath = ACTIVE_PACK_KA_FILE if language == "ka" else ACTIVE_PACK_EN_FILE
    try:
        return json.loads(filepath.read_text(encoding="utf-8"))
    except Exception:
        return {"version": 1, "language": language, "items": [], "score": None, "enabled": True}


def save_active_pack(language: str, pack: Dict[str, Any]):
    """Save active rule pack for language."""
    filepath = ACTIVE_PACK_KA_FILE if language == "ka" else ACTIVE_PACK_EN_FILE
    filepath.write_text(json.dumps(pack, indent=2, ensure_ascii=False), encoding="utf-8")


def load_benchmark_cases(language: str) -> List[Dict[str, Any]]:
    """Load benchmark test set for language."""
    init_training_storage()
    filepath = BENCHMARK_CASES_KA_FILE if language == "ka" else BENCHMARK_CASES_EN_FILE
    try:
        return json.loads(filepath.read_text(encoding="utf-8"))
    except Exception:
        return []


def open_training_session(key_info: Dict[str, Any], model: Optional[str] = None) -> Dict[str, Any]:
    """Start an authenticated training session."""
    session_id = str(uuid.uuid4())
    language = key_info["language"]
    pack = load_active_pack(language)
    cases = load_benchmark_cases(language)
    eval_res = evaluate_pack(pack.get("items", []), cases)

    session_record = {
        "id": session_id,
        "key_id": key_info.get("id"),
        "language": language,
        "scope": key_info.get("scope", "both"),
        "driver": "external",
        "model": model,
        "status": "running",
        "iterations": 0,
        "accepted": 0,
        "start_score": eval_res["score"],
        "current_score": eval_res["score"],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
        "summary": None
    }

    try:
        sessions = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    except Exception:
        sessions = {}

    sessions[session_id] = session_record
    SESSIONS_FILE.write_text(json.dumps(sessions, indent=2, ensure_ascii=False), encoding="utf-8")

    return {
        "session_id": session_id,
        "language": language,
        "scope": key_info.get("scope", "both"),
        "pack_version": pack.get("version", 1),
        "pack_items": len(pack.get("items", [])),
        "benchmark": {
            "cases": len(cases),
            "score": eval_res["score"],
            "exact": eval_res["passed"]
        },
        "allowed_item_types": list(ALLOWED_ITEM_TYPES),
        "limits": PACK_LIMITS,
        "instructions": (
            "1. Call POST /api/public/train/context with session_id to inspect active pack and failing cases.\n"
            "2. Formulate candidate rule items (glossary, autofix, qa_rule, prompt_block, ocr_fix).\n"
            "3. Call POST /api/public/train/propose with items. The server benchmarks your candidate.\n"
            "4. If score improves and zero cases regress, the candidate is auto-promoted!\n"
            "5. Call POST /api/public/train/finish when complete."
        )
    }


def get_training_context(session_id: str, key_info: Dict[str, Any]) -> Dict[str, Any]:
    """Return active pack and failing benchmark cases for LLM diagnosis."""
    language = key_info["language"]
    pack = load_active_pack(language)
    cases = load_benchmark_cases(language)
    eval_res = evaluate_pack(pack.get("items", []), cases)

    return {
        "session_id": session_id,
        "language": language,
        "scope": key_info.get("scope", "both"),
        "pack_version": pack.get("version", 1),
        "pack": pack.get("items", [])[-400:],
        "benchmark": {
            "cases": len(cases),
            "score": eval_res["score"],
            "exact": eval_res["passed"],
            "failing": eval_res["failures"]
        },
        "samples": [
            {"id": c.get("id"), "kind": c.get("kind"), "source": c.get("source"), "expected": c.get("expected")}
            for c in cases[:40]
        ]
    }


def propose_training_rules(
    session_id: str,
    key_info: Dict[str, Any],
    items: List[Dict[str, Any]],
    model: Optional[str] = None,
    note: Optional[str] = None
) -> Dict[str, Any]:
    """
    Validate candidate rules, replay benchmark before & after,
    and auto-promote if the candidate is a strict improvement with zero regressions.
    """
    language = key_info["language"]
    pack = load_active_pack(language)
    cases = load_benchmark_cases(language)

    if not isinstance(items, list) or len(items) == 0:
        return {"accepted": False, "reason": "rejected: items array must be non-empty"}
    if len(items) > PACK_LIMITS["max_items_per_proposal"]:
        return {"accepted": False, "reason": f"rejected: max {PACK_LIMITS['max_items_per_proposal']} items allowed per proposal"}

    rejected_items = []
    accepted_items = []

    for idx, item in enumerate(items):
        ok, reason = validate_item(item, language)
        if not ok:
            rejected_items.append({"index": idx, "reason": reason})
        else:
            accepted_items.append(normalise_item(item, language, session_id=session_id, model=model))

    before = evaluate_pack(pack.get("items", []), cases)
    if not accepted_items:
        return {
            "accepted": False,
            "reason": "rejected: no valid items in proposal",
            "rejected_items": rejected_items,
            "score_before": before["score"],
            "score_after": before["score"],
            "pack_version": pack.get("version", 1)
        }

    # Dedupe against live pack
    seen = {f"{i.get('type')}::{i.get('pattern')}::{i.get('text', '')}" for i in pack.get("items", [])}
    fresh = [i for i in accepted_items if f"{i.get('type')}::{i.get('pattern')}::{i.get('text', '')}" not in seen]
    if not fresh:
        return {
            "accepted": False,
            "reason": "rejected: every proposed item already exists in the active pack",
            "rejected_items": rejected_items,
            "score_before": before["score"],
            "score_after": before["score"],
            "pack_version": pack.get("version", 1)
        }

    candidate_items = (pack.get("items", []) + fresh)[-PACK_LIMITS["max_items"]:]
    after = evaluate_pack(candidate_items, cases)

    if not cases:
        verdict_ok, verdict_reason = False, "rejected: benchmark is empty"
    else:
        verdict_ok, verdict_reason = is_improvement(before, after)

    # Record iteration
    try:
        sessions = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    except Exception:
        sessions = {}
    session = sessions.get(session_id, {})
    idx = session.get("iterations", 0) + 1
    session["iterations"] = idx
    session["last_seen_at"] = datetime.now(timezone.utc).isoformat()

    new_version = pack.get("version", 1)
    if verdict_ok:
        new_version = pack.get("version", 1) + 1
        pack["version"] = new_version
        pack["items"] = candidate_items
        pack["score"] = after["score"]
        pack["updated_at"] = datetime.now(timezone.utc).isoformat()
        save_active_pack(language, pack)

        session["accepted"] = session.get("accepted", 0) + 1
        session["current_score"] = after["score"]

    sessions[session_id] = session
    SESSIONS_FILE.write_text(json.dumps(sessions, indent=2, ensure_ascii=False), encoding="utf-8")

    return {
        "iteration": idx,
        "accepted": verdict_ok,
        "reason": verdict_reason,
        "rejected_items": rejected_items,
        "score_before": before["score"],
        "score_after": after["score"],
        "exact_before": before["passed"],
        "exact_after": after["passed"],
        "failing": after["failures"],
        "pack_version": new_version,
        "pack_items": len(candidate_items) if verdict_ok else len(pack.get("items", []))
    }


def finish_training_session(
    session_id: str,
    key_info: Dict[str, Any],
    summary: Optional[str] = None
) -> Dict[str, Any]:
    """Close training session and return aggregate results."""
    try:
        sessions = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    except Exception:
        sessions = {}

    session = sessions.get(session_id)
    if not session:
        return {"error": "session not found"}

    session["status"] = "finished"
    session["finished_at"] = datetime.now(timezone.utc).isoformat()
    session["summary"] = summary[:2000] if summary else None
    sessions[session_id] = session
    SESSIONS_FILE.write_text(json.dumps(sessions, indent=2, ensure_ascii=False), encoding="utf-8")

    language = key_info["language"]
    pack = load_active_pack(language)

    return {
        "session_id": session_id,
        "status": "finished",
        "language": language,
        "iterations": session.get("iterations", 0),
        "accepted_proposals": session.get("accepted", 0),
        "start_score": session.get("start_score"),
        "final_score": session.get("current_score"),
        "score_delta": round((session.get("current_score", 0) or 0) - (session.get("start_score", 0) or 0), 3),
        "active_pack_version": pack.get("version", 1),
        "active_pack_items": len(pack.get("items", []))
    }
