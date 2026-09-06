# -*- coding: utf-8 -*-
"""
Integration and Unit Tests for EngBot Training Engine API.
Validates authentication, benchmark evaluation, ReDoS safety, rule proposal acceptance/rejection,
and FastAPI endpoint responses.
"""

import sys
import json
import unittest
from pathlib import Path

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')
REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR))

from starlette.testclient import TestClient
from app.main import app
from app.training_engine import (
    verify_key,
    open_training_session,
    get_training_context,
    propose_training_rules,
    finish_training_session,
    validate_item,
    regex_is_risky,
    evaluate_pack,
    DEFAULT_DEV_KEY
)

client = TestClient(app)


class TestTrainingAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from app.training_engine import ACTIVE_PACK_KA_FILE, SESSIONS_FILE, KEYS_FILE
        cls._pack_bak = ACTIVE_PACK_KA_FILE.read_text(encoding="utf-8") if ACTIVE_PACK_KA_FILE.exists() else None
        cls._sess_bak = SESSIONS_FILE.read_text(encoding="utf-8") if SESSIONS_FILE.exists() else None
        cls._keys_bak = KEYS_FILE.read_text(encoding="utf-8") if KEYS_FILE.exists() else None

    @classmethod
    def tearDownClass(cls):
        from app.training_engine import ACTIVE_PACK_KA_FILE, SESSIONS_FILE, KEYS_FILE
        if cls._pack_bak is not None:
            ACTIVE_PACK_KA_FILE.write_text(cls._pack_bak, encoding="utf-8")
        if cls._sess_bak is not None:
            SESSIONS_FILE.write_text(cls._sess_bak, encoding="utf-8")
        if cls._keys_bak is not None:
            KEYS_FILE.write_text(cls._keys_bak, encoding="utf-8")

    def test_verify_training_key(self):
        valid_info = verify_key(DEFAULT_DEV_KEY)
        self.assertIsNotNone(valid_info)
        self.assertEqual(valid_info.get("language"), "ka")

        invalid_info = verify_key("engbot_tk_invalid_key_1234567890")
        self.assertIsNone(invalid_info)

        empty_info = verify_key("")
        self.assertIsNone(empty_info)

    def test_regex_safety_and_redos_prevention(self):
        # Dangerous nested quantifiers
        self.assertIsNotNone(regex_is_risky(r"(a+)+"))
        self.assertIsNotNone(regex_is_risky(r"(a*)*"))

        # Huge repetition bound
        self.assertIsNotNone(regex_is_risky(r"a{500,}"))

        # Multiple .* wildcards
        self.assertIsNotNone(regex_is_risky(r"a.*b.*c"))

        # Safe regexes
        self.assertIsNone(regex_is_risky(r"სახლ\|ს"))
        self.assertIsNone(regex_is_risky(r"მეგობ-რობა"))

    def test_validate_item_rules(self):
        # Valid glossary
        ok, err = validate_item({
            "type": "glossary",
            "pattern": "Marcus Aurelius",
            "replacement": "მარკუს ავრელიუსი"
        }, "ka")
        self.assertTrue(ok)
        self.assertIsNone(err)

        # Unsafe regex in autofix
        ok_bad_re, err_bad_re = validate_item({
            "type": "autofix",
            "pattern": "(a+)+",
            "replacement": "b"
        }, "ka")
        self.assertFalse(ok_bad_re)
        self.assertIn("unsafe regex", err_bad_re)

        # Code injection in prompt_block
        ok_inj, err_inj = validate_item({
            "type": "prompt_block",
            "text": "<script>alert('xss')</script>"
        }, "ka")
        self.assertFalse(ok_inj)
        self.assertIn("code", err_inj)

        # Unsupported item type
        ok_unsupp, _ = validate_item({
            "type": "malicious_type",
            "pattern": "a",
            "replacement": "b"
        }, "ka")
        self.assertFalse(ok_unsupp)

    def test_training_session_lifecycle(self):
        key_info = verify_key(DEFAULT_DEV_KEY)
        self.assertIsNotNone(key_info)

        # 1. Open session
        session_data = open_training_session(key_info, model="test-harness")
        session_id = session_data["session_id"]
        self.assertIsNotNone(session_id)
        self.assertEqual(session_data["language"], "ka")
        self.assertGreater(session_data["benchmark"]["cases"], 0)

        # 2. Get context
        context_data = get_training_context(session_id, key_info)
        self.assertEqual(context_data["session_id"], session_id)
        self.assertIn("benchmark", context_data)

        # 3. Propose improving rule
        proposal_res = propose_training_rules(
            session_id=session_id,
            key_info=key_info,
            items=[
                {
                    "type": "glossary",
                    "pattern": "The art of war is of vital importance to the State.",
                    "replacement": "ომის ხელოვნება სასიცოცხლო მნიშვნელობისაა სახელმწიფოსთვის.",
                    "note": "Exact match for Sun Tzu benchmark opening"
                }
            ],
            model="test-harness",
            note="Benchmark calibration test"
        )
        self.assertIn("accepted", proposal_res)
        self.assertGreaterEqual(proposal_res["score_after"], proposal_res["score_before"])

        # 4. Finish session
        finish_data = finish_training_session(session_id, key_info, summary="Test session completed")
        self.assertEqual(finish_data["status"], "finished")
        self.assertEqual(finish_data["session_id"], session_id)

    def test_fastapi_training_endpoints(self):
        # 1. Health check
        health_resp = client.get("/api/public/train/health")
        self.assertEqual(health_resp.status_code, 200)
        h_json = health_resp.json()
        self.assertEqual(h_json["status"], "healthy")
        self.assertGreaterEqual(h_json["active_pack"]["version"], 1)

        # 2. Unauthorized session request
        unauth_resp = client.post("/api/public/train/session", json={}, headers={"X-Training-Key": "bad-key"})
        self.assertEqual(unauth_resp.status_code, 401)

        # 3. Authorized session request
        auth_resp = client.post(
            "/api/public/train/session",
            json={"model": "pytest-client"},
            headers={"X-Training-Key": DEFAULT_DEV_KEY}
        )
        self.assertEqual(auth_resp.status_code, 200)
        sess_json = auth_resp.json()
        session_id = sess_json["session_id"]
        self.assertIsNotNone(session_id)

        # 4. Context request
        ctx_resp = client.post(
            "/api/public/train/context",
            json={"session_id": session_id},
            headers={"X-Training-Key": DEFAULT_DEV_KEY}
        )
        self.assertEqual(ctx_resp.status_code, 200)
        ctx_json = ctx_resp.json()
        self.assertIn("benchmark", ctx_json)

        # 5. Propose endpoint
        prop_resp = client.post(
            "/api/public/train/propose",
            json={
                "session_id": session_id,
                "items": [
                    {
                        "type": "glossary",
                        "pattern": "vital importance",
                        "replacement": "სასიცოცხლო მნიშვნელობა"
                    }
                ],
                "model": "pytest-client"
            },
            headers={"X-Training-Key": DEFAULT_DEV_KEY}
        )
        self.assertEqual(prop_resp.status_code, 200)
        prop_json = prop_resp.json()
        self.assertIn("accepted", prop_json)

        # 6. Finish endpoint
        fin_resp = client.post(
            "/api/public/train/finish",
            json={"session_id": session_id, "summary": "Finished pytest session"},
            headers={"X-Training-Key": DEFAULT_DEV_KEY}
        )
        self.assertEqual(fin_resp.status_code, 200)
        fin_json = fin_resp.json()
        self.assertEqual(fin_json["status"], "finished")

    def test_training_guide_endpoint(self):
        # 1. Markdown guide
        resp_md = client.get("/api/public/train/guide")
        self.assertEqual(resp_md.status_code, 200)
        self.assertIn("text/markdown", resp_md.headers.get("content-type", ""))
        content = resp_md.text
        self.assertIn("What the Engine is Trained On", content)
        self.assertIn("Sun Tzu", content)
        self.assertIn("Marcus Aurelius", content)
        self.assertIn("Homer", content)
        self.assertIn("Plato", content)
        self.assertIn("Shakespeare", content)
        self.assertIn("Vigesimal Number Verbalization", content)
        self.assertIn("3-Tier Hybrid Architecture", content)
        self.assertIn("NEVER USE ASCII", content)

        # 2. JSON guide
        resp_json = client.get("/api/public/train/guide?format=json")
        self.assertEqual(resp_json.status_code, 200)
        guide_obj = resp_json.json()
        self.assertIn("corpora", guide_obj)
        self.assertIn("architecture_tiers", guide_obj)
        self.assertIn("endpoints", guide_obj)

        # 3. Health includes guide link
        h_resp = client.get("/api/public/train/health")
        self.assertEqual(h_resp.status_code, 200)
        h_data = h_resp.json()
        self.assertEqual(h_data.get("guide_url"), "/api/public/train/guide")
        self.assertIn("Sun Tzu", h_data.get("guide_summary", ""))

        # 4. Session response includes embedded guide
        s_resp = client.post(
            "/api/public/train/session",
            json={"model": "guide-test"},
            headers={"X-Training-Key": DEFAULT_DEV_KEY}
        )
        self.assertEqual(s_resp.status_code, 200)
        s_data = s_resp.json()
        self.assertEqual(s_data.get("guide_url"), "/api/public/train/guide")
        self.assertIn("Classical Antiquity", s_data.get("guide_markdown", ""))


if __name__ == "__main__":
    unittest.main(verbosity=2)
