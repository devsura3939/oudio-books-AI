# -*- coding: utf-8 -*-
"""
Deep Comprehensive Regression Test Suite for Oudio Books AI (v1.47.5).
Tests all backend modules, FastAPI endpoints, frontend DOM bindings,
event handlers, modal flows, translation tiers, transcription engine,
and Georgian linguistic rules.
"""
import os
import re
import io
import sys
import json
import math
import struct
import base64
import unittest
from pathlib import Path

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR))

from starlette.testclient import TestClient
import app.main
from app.main import app
from app.models import BookData, Chapter, TTSVoice
from app.translation_engine import (
    clean_georgian_morphology, synthesize_georgian_morphology,
    translate_offline_en_to_ka, translate_text
)
from app.transcription_engine import transcribe_audio_bytes, transcribe_audio_file
from app.image_processor import (
    score_image_sharpness, select_best_burst_frame,
    enhance_page_image, image_to_jpeg_bytes
)
from app.storage import (
    sanitize_filename, save_book_session, get_book_session,
    create_book_zip_package, book_lock
)
from app.pdf_processor import clean_page_text


class TestBackendEndpointsAndEngines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_root_and_voices(self):
        """Test GET / and GET /api/voices"""
        res_root = self.client.get("/")
        self.assertEqual(res_root.status_code, 200)

        res_voices = self.client.get("/api/voices")
        self.assertEqual(res_voices.status_code, 200)
        voices = res_voices.json()
        self.assertIsInstance(voices, list)
        self.assertGreater(len(voices), 0)
        # Ensure voice object structure
        v0 = voices[0]
        self.assertIn("short_name", v0)
        self.assertIn("locale", v0)

    def test_02_server_translate(self):
        """Test POST /api/server-translate with real phrases"""
        # EN -> KA
        res_ka = self.client.post("/api/server-translate", json={
            "text": "The little prince decided to protect his rose.",
            "source_lang": "en",
            "target_lang": "ka"
        })
        self.assertEqual(res_ka.status_code, 200)
        data = res_ka.json()
        self.assertTrue(data.get("success"))
        self.assertTrue(len(data.get("translated", "")) > 0)
        # Anti-calque & ergative check
        trans = data.get("translated", "")
        self.assertIn("გადაწყვიტა", trans)

        # KA -> EN
        res_en = self.client.post("/api/server-translate", json={
            "text": "მხოლოდ გულით შეიძლება სწორად დანახვა.",
            "source_lang": "ka",
            "target_lang": "en"
        })
        self.assertEqual(res_en.status_code, 200)
        data_en = res_en.json()
        self.assertTrue(data_en.get("success"))
        self.assertIn("heart", data_en.get("translated", "").lower())

    def test_03_transcription_endpoint(self):
        """Test POST /api/transcribe endpoint validation and payload processing"""
        # Empty audio should return 400 Bad Request
        res_empty = self.client.post("/api/transcribe", json={"audio_base64": ""})
        self.assertEqual(res_empty.status_code, 400)

        # Valid synthetic WAV audio payload
        sample_rate = 16000
        duration = 0.2
        buf = io.BytesIO()
        import wave
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            for i in range(int(sample_rate * duration)):
                val = int(32767.0 * 0.05 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
                wf.writeframes(struct.pack('<h', val))
        wav_bytes = buf.getvalue()
        b64 = base64.b64encode(wav_bytes).decode('ascii')

        res_audio = self.client.post("/api/transcribe", json={
            "audio_base64": f"data:audio/wav;base64,{b64}",
            "language": "ka"
        })
        self.assertEqual(res_audio.status_code, 200)
        data = res_audio.json()
        self.assertIn("engine", data)

    def test_04_image_processor(self):
        """Test image sharpness scoring and burst fusion logic"""
        from PIL import Image, ImageDraw
        # Create a blank image and a textured image
        blank = Image.new("RGB", (200, 200), color=(255, 255, 255))
        textured = Image.new("RGB", (200, 200), color=(255, 255, 255))
        draw = ImageDraw.Draw(textured)
        for i in range(0, 200, 10):
            draw.line([(i, 0), (i, 200)], fill=(0, 0, 0), width=2)

        blank_bytes = io.BytesIO()
        blank.save(blank_bytes, format="JPEG")
        textured_bytes = io.BytesIO()
        textured.save(textured_bytes, format="JPEG")

        score_blank = score_image_sharpness(blank_bytes.getvalue())
        score_textured = score_image_sharpness(textured_bytes.getvalue())
        self.assertGreater(score_textured, score_blank)

        # Burst selection
        frames = [blank_bytes.getvalue(), textured_bytes.getvalue()]
        best_idx, best_img, best_score = select_best_burst_frame(frames)
        self.assertEqual(best_idx, 1)

    def test_05_storage_and_session(self):
        """Test book session storage, locks, and filename sanitization"""
        clean = sanitize_filename("A/B\\C:D*E?F\"G<H>I|J")
        self.assertEqual(clean, "A_B_C_D_E_F_G_H_I_J")

        test_book = BookData(
            id="test_book_reg_01",
            filename="test.pdf",
            title="Regression Test Book",
            chapters=[
                Chapter(id=1, title="Chapter 1", start_page=1, end_page=2, text="Sample text content")
            ]
        )
        saved = save_book_session(test_book)
        self.assertTrue(saved)
        loaded = get_book_session("test_book_reg_01")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.title, "Regression Test Book")

    def test_06_morphosyntactic_synthesis(self):
        """Verify Georgian Pro linguistic synthesis and anti-calque repairs"""
        # Ergative Aorist Transitive Concord
        text1 = synthesize_georgian_morphology("უფლისწული დაინახა ვარდი")
        self.assertIn("უფლისწულმა", text1)

        # Experiencer Dative Inversion
        text2 = synthesize_georgian_morphology("ის უნდა წასვლა")
        self.assertIn("მას უნდა", text2)

        # Prohibitive Imperative
        text3 = synthesize_georgian_morphology("არ შეგეშინდეს")
        self.assertIn("ნუ გეშინია", text3)

        # Vowel Syncopation (კუმშვა)
        text4 = synthesize_georgian_morphology("წყალიდან მოდის")
        self.assertIn("წყლიდან", text4)
        text5 = synthesize_georgian_morphology("მგელიის ხმა")
        self.assertIn("მგლის", text5)

        # Reflexive coreference
        text6 = synthesize_georgian_morphology("მან მისი წიგნი გახსნა")
        self.assertIn("მან თავისი", text6)

    def test_12_book_chapter_endpoints(self):
        """Test GET /api/book/{book_id} and PUT /api/book/{book_id}/chapter/{chapter_id}"""
        # Save a session first
        book = BookData(
            id="book_api_test_01",
            filename="sample.pdf",
            title="API Sample Book",
            chapters=[
                Chapter(id=1, title="Old Title", start_page=1, end_page=1, text="Old Chapter Text")
            ]
        )
        save_book_session(book)

        # Retrieve session
        r_get = self.client.get("/api/book/book_api_test_01")
        self.assertEqual(r_get.status_code, 200)
        self.assertEqual(r_get.json()["title"], "API Sample Book")

        # Update chapter
        r_put = self.client.put("/api/book/book_api_test_01/chapter/1", json={
            "title": "New Title",
            "text": "Updated Chapter Text"
        })
        self.assertEqual(r_put.status_code, 200)
        self.assertEqual(r_put.json()["title"], "New Title")
        self.assertEqual(r_put.json()["text"], "Updated Chapter Text")

    def test_13_pdf_data_structure(self):
        """Test clean_page_text and Chapter model creation"""
        dirty = "This is a hyphen-\nated line with page footer\nPage 1 of 5\nNext line"
        cleaned = clean_page_text(dirty)
        self.assertIn("hyphenated", cleaned)
        self.assertNotIn("Page 1 of 5", cleaned)

    def test_14_supabase_bridge_health(self):
        """Test Supabase bridge health check and session fallback"""
        from app.supabase_bridge import check_supabase_health, get_admin_session
        health = check_supabase_health()
        self.assertIsInstance(health, dict)
        self.assertIn("status", health)
        self.assertIn(health["status"], ("connected", "offline", "unconfigured"))
        session = get_admin_session()
        self.assertIsInstance(session, dict)
        self.assertIn("access_token", session)
        if "user" in session:
            self.assertIn("email", session["user"])



    def test_15_audio_transcription_file(self):
        """Test transcribe_audio_file error handling for missing file"""
        res = transcribe_audio_file("non_existent_audio_path_xyz.mp3")
        self.assertFalse(res["success"])
        self.assertIn("not found", res["error"].lower())

    def test_16_concurrency_lock(self):
        """Test book_lock returns an asyncio.Lock and serializes write access"""
        import asyncio
        async def run_lock_test():
            lock = book_lock("concurrent_test_book")
            self.assertIsInstance(lock, asyncio.Lock)
            async with lock:
                return True
        self.assertTrue(asyncio.run(run_lock_test()))


class TestFrontendDOMAndEvents(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        with open(REPO_DIR / "index.html", "r", encoding="utf-8") as f:
            cls.html = f.read()
        with open(REPO_DIR / "static" / "app.js", "r", encoding="utf-8") as f:
            cls.app_js = f.read()
        with open(REPO_DIR / "static" / "scanner.js", "r", encoding="utf-8") as f:
            cls.scanner_js = f.read()
        with open(REPO_DIR / "static" / "supabase-store.js", "r", encoding="utf-8") as f:
            cls.store_js = f.read()
        with open(REPO_DIR / "static" / "georgian-linguistics.js", "r", encoding="utf-8") as f:
            cls.ling_js = f.read()

    def test_07_critical_dom_elements_exist(self):
        """Ensure all critical DOM elements targeted by app.js exist in index.html"""
        critical_ids = [
            "booksGrid", "view-library", "view-scanner", "readerView",
            "fileInput", "geminiApiKeyInput", "openRouterApiKeyInput", "groqApiKeyInput",
            "mistralApiKeyInput", "elevenLabsAiKeyInput", "customProviderKeyInput",
            "authGateScreen", "gateEmail", "gatePassword", "btnGateSignIn",
            "retranscribeModal", "aiSettingsModal", "voiceModal", "accountCabinetModal"
        ]

        for cid in critical_ids:
            self.assertIn(f'id="{cid}"', self.html, f"FAIL: Critical DOM ID '{cid}' missing in index.html")



    def test_08_open_modal_targets_exist(self):
        """Ensure every modal opened via openModal(...) exists in index.html"""
        modal_calls = set(re.findall(r"openModal\(['\"]([a-zA-Z0-9_\-]+)['\"]\)", self.app_js + self.html))
        for mid in modal_calls:
            self.assertIn(f'id="{mid}"', self.html, f"FAIL: Modal '{mid}' invoked but missing in index.html")

    def test_09_all_onclick_handlers_defined(self):
        """Ensure every onclick handler in index.html is defined in JS files"""
        onclicks = set(re.findall(r'onclick=[\'\"]([a-zA-Z0-9_]+)\(', self.html))
        all_js = self.app_js + self.scanner_js + self.store_js + self.ling_js
        for handler in onclicks:
            # Check for function definition: function name( or window.name = or const name =
            is_defined = (
                f"function {handler}" in all_js or
                f"window.{handler}" in all_js or
                f"{handler} =" in all_js
            )
            self.assertTrue(is_defined, f"FAIL: onclick handler '{handler}()' used in index.html but not defined in any JS file!")

    def test_10_no_khmer_or_broken_symbols(self):
        """Ensure zero Khmer U+17D4 and zero legacy replacement chars"""
        for sf, name in [(self.app_js, "app.js"), (self.ling_js, "georgian-linguistics.js")]:
            self.assertEqual(sf.count('\u17D4'), 0, f"FAIL: Khmer U+17D4 found in {name}")
            self.assertEqual(sf.count('\ufffd'), 0, f"FAIL: Unicode replacement char found in {name}")

    def test_11_mirror_parity(self):
        """Ensure 100% binary byte parity between root and studio mirror files"""
        pairs = [
            ("index.html", "lovable-app/public/studio/index.html"),
            ("static/app.js", "lovable-app/public/studio/static/app.js"),
            ("static/georgian-linguistics.js", "lovable-app/public/studio/static/georgian-linguistics.js"),
            ("static/scanner.js", "lovable-app/public/studio/static/scanner.js"),
            ("static/supabase-store.js", "lovable-app/public/studio/static/supabase-store.js")
        ]
        for root_f, mirror_f in pairs:
            root_bytes = open(REPO_DIR / root_f, "rb").read()
            mirror_bytes = open(REPO_DIR / mirror_f, "rb").read()
            self.assertEqual(root_bytes, mirror_bytes, f"FAIL: Byte mismatch between {root_f} and {mirror_f}")


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBackendEndpointsAndEngines)
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestFrontendDOMAndEvents))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
