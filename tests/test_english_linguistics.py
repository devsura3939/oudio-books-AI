# -*- coding: utf-8 -*-
"""Unit and integration tests for English linguistics and server-side page parser."""
import pytest
from starlette.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.english_linguistics import (
    clean_english_ocr,
    fix_english_ligatures,
    reconstruct_spaced_headings,
    repair_english_contractions,
    score_english_text,
    refine_english_with_small_model
)
from app.main import app


def test_fix_english_ligatures():
    raw = "The ﬁnal ﬂight with ﬃ and ﬄ ligatures"
    assert fix_english_ligatures(raw) == "The final flight with ffi and ffl ligatures"


def test_reconstruct_spaced_headings():
    assert reconstruct_spaced_headings("C H A P T E R   O N E") == "CHAPTER ONE"
    assert reconstruct_spaced_headings("P A R T   T W O") == "PART TWO"
    assert reconstruct_spaced_headings("T H E   E N D") == "THE END"


def test_repair_english_contractions():
    raw = "don t you think it s time we ve gone?"
    assert repair_english_contractions(raw) == "don't you think it's time we've gone?"
    assert repair_english_contractions("let s go at 5 o clock") == "let's go at 5 o'clock"


def test_clean_english_ocr_full():
    raw = "The bum was buming in modem times vvith care. Th1s b00k is great. cl|ear and p|ace."
    cleaned = clean_english_ocr(raw)
    assert "burn was burning in modern times with care" in cleaned
    assert "This book is great" in cleaned
    assert "clear and place" in cleaned


def test_score_english_text():
    assert score_english_text("") == 0.0
    assert score_english_text("Chapter 1") >= 0.90
    assert score_english_text("The Sirens of Titan") >= 0.90
    assert score_english_text("THE END") >= 0.90
    assert score_english_text("This is an ordinary paragraph of text in Kurt Vonnegut's book.") >= 0.80


def test_refine_with_small_model_mock():
    # When Ollama is available
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Chapter 1\n\nIt was a dark and stormy night."}}]
    }
    with patch("httpx.post", return_value=mock_resp):
        res = refine_english_with_small_model("C H A P T E R  1\n\nlt vv- \n as a dark and stormy night.")
        assert "Chapter 1" in res or "CHAPTER 1" in res

    # When Ollama is offline, gracefully fall back to local rule-engine
    with patch("httpx.post", side_effect=ConnectionError):
        res = refine_english_with_small_model("C H A P T E R  1\n\nTh1s b00k was buming.")
        assert "CHAPTER 1" in res
        assert "This book" in res
        assert "burning" in res


def test_api_parse_page_endpoint():
    client = TestClient(app)

    # 1. Parse raw text with rule/small model
    resp = client.post("/api/parse-page", json={
        "raw_text": "C H A P T E R  O N E\n\nTh1s is modem prose.",
        "lang": "en",
        "page_number": 404
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "CHAPTER ONE" in data["text"]
    assert "This is modern prose" in data["text"]

    # 2. Blank or unreadable page never crashes the endpoint
    resp2 = client.post("/api/parse-page", json={
        "raw_text": "",
        "lang": "en",
        "page_number": 404
    })
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["success"] is True
    assert data2["page_number"] == 404
