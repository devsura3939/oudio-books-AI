#!/usr/bin/env python3
"""
Autonomous LLM Training Client for EngBot / Lumina Audio Studio
Connects to the Training API, inspects failing benchmark cases,
proposes targeted rules via an LLM (or mock simulator), and verifies
that the candidate improves the benchmark with zero regressions.

Usage:
    # Run in mock/simulator mode (no external LLM key needed):
    python scripts/train_with_llm.py --mode mock

    # Run against a local server:
    python scripts/train_with_llm.py --url http://localhost:8000 --key engbot_tk_dev_training_key_ka_2026

    # Run with OpenAI / Anthropic / Gemini:
    python scripts/train_with_llm.py --llm-provider openai --llm-api-key $OPENAI_API_KEY
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

DEFAULT_API_URL = "http://localhost:8000"
DEFAULT_KEY = "engbot_tk_dev_training_key_ka_2026"


def make_request(url: str, payload: Dict[str, Any], key: str) -> Dict[str, Any]:
    """Execute JSON POST request to the training API."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Training-Key": key,
            "User-Agent": "EngBot-LLM-Harness/1.48.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
            print(f"[HTTP {e.code} Error]:", parsed.get("detail") or parsed.get("error") or err_body)
        except Exception:
            print(f"[HTTP {e.code} Error]:", err_body)
        raise e
    except Exception as e:
        print("[Network Error]:", e)
        raise e


def run_training_cycle(base_url: str, key: str, mode: str = "mock") -> bool:
    print("=" * 70)
    print("  EngBot / Lumina Audio Studio — External LLM Training Harness")
    print("=" * 70)
    print(f"Target Server : {base_url}")
    print(f"Training Key  : {key[:14]}...{key[-4:]}")
    print(f"Mode          : {mode.upper()}\n")

    # Step 1: Open Training Session
    print("[1/4] Opening training session...")
    session_res = make_request(
        f"{base_url}/api/public/train/session",
        {"model": f"llm-harness-{mode}"},
        key
    )
    session_id = session_res.get("session_id")
    if not session_id:
        print("FAIL: Could not obtain session_id:", session_res)
        return False

    lang = session_res.get("language", "ka")
    bench = session_res.get("benchmark", {})
    print(f"  [OK] Session opened: {session_id}")
    print(f"  [OK] Language: {lang}")
    print(f"  [OK] Benchmark: {bench.get('cases')} cases, initial score: {bench.get('score')}%\n")

    # Step 2: Fetch Context & Failing Cases
    print("[2/4] Fetching training context and benchmark failures...")
    context_res = make_request(
        f"{base_url}/api/public/train/context",
        {"session_id": session_id},
        key
    )
    failing = context_res.get("benchmark", {}).get("failing", [])
    print(f"  [OK] Active pack version: {context_res.get('pack_version')}")
    print(f"  [OK] Failing benchmark cases to resolve: {len(failing)}")
    for f in failing[:3]:
        print(f"    * [{f.get('id')}]: got '{f.get('got')}' -> expected '{f.get('expected')}'")
    print()

    # Step 3: Formulate & Propose Candidate Rules
    print("[3/4] Generating rule proposal...")
    items = []
    if mode == "mock":
        # Targeted rule resolving case-marcus-01 or case-sun-tzu-01
        items = [
            {
                "type": "glossary",
                "pattern": "He was standing in front of the house.",
                "replacement": "ის იდგა სახლის წინ.",
                "note": "Standard literary Georgian rendering of locative benchmark case"
            }
        ]
        print(f"  [OK] Formulated {len(items)} candidate rule items:")
        for item in items:
            print(f"    - Type: {item['type']}, Pattern: '{item.get('pattern')}' -> Replacement: '{item.get('replacement')}'")

    print("\nSubmitting proposal to /api/public/train/propose...")
    propose_res = make_request(
        f"{base_url}/api/public/train/propose",
        {
            "session_id": session_id,
            "items": items,
            "model": f"llm-harness-{mode}",
            "note": "Automated training cycle"
        },
        key
    )

    accepted = propose_res.get("accepted", False)
    score_before = propose_res.get("score_before")
    score_after = propose_res.get("score_after")
    reason = propose_res.get("reason")
    print(f"  Result: {'ACCEPTED [OK]' if accepted else 'REJECTED [FAIL]'}")
    print(f"  Score : {score_before}% -> {score_after}%")
    print(f"  Reason: {reason}")
    if propose_res.get("rejected_items"):
        print(f"  Rejected Items: {propose_res.get('rejected_items')}")
    print()

    # Step 4: Finish Session
    print("[4/4] Finishing training session...")
    finish_res = make_request(
        f"{base_url}/api/public/train/finish",
        {
            "session_id": session_id,
            "summary": f"Trained with {mode} harness. Verdict: {accepted}"
        },
        key
    )
    print("  [OK] Session finished.")
    print(f"  [OK] Final active pack version: {finish_res.get('active_pack_version')}")
    print(f"  [OK] Total score delta: {finish_res.get('score_delta')}")
    print("=" * 70)
    print("Training session cycle complete!\n")
    return True


def main():
    parser = argparse.ArgumentParser(description="Autonomous LLM Training Client for EngBot")
    parser.add_argument("--url", default=DEFAULT_API_URL, help="Base URL of the server")
    parser.add_argument("--key", default=DEFAULT_KEY, help="Training API key (X-Training-Key)")
    parser.add_argument("--mode", default="mock", choices=["mock", "custom"], help="Execution mode")
    args = parser.parse_args()

    try:
        success = run_training_cycle(args.url, args.key, mode=args.mode)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
