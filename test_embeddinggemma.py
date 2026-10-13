# -*- coding: utf-8 -*-
import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import re
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_embeddinggemma_suite():
    # 1. Health
    r = client.get("/api/embeddinggemma/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    data = r.json()
    assert data["status"] == "online"
    print("Health check OK:", data)

    # 2. Index a chapter
    nexus_text = "Yuval Noah Harari examines how artificial intelligence and information networks reshape humanity."
    r = client.post("/api/embeddinggemma/index-page", json={
        "doc_id": "book_nexus_test_ai",
        "page_number": 1,
        "title": "Nexus: Artificial Intelligence",
        "text_content": nexus_text
    })
    assert r.status_code == 200, f"Index failed: {r.text}"
    print("Index page OK")

    # 3. Search
    r = client.post("/api/embeddinggemma/search", json={
        "query": "artificial intelligence networks",
        "top_k": 3,
        "dim": 256
    })
    assert r.status_code == 200
    search_res = r.json()
    assert len(search_res["matches"]) > 0
    print("Search OK, top match:", search_res["matches"][0]["title"])

    # 4. Transcribe and Translate into Georgian (ka)
    r = client.post("/api/embeddinggemma/transcribe-and-translate", json={
        "doc_id": "book_nexus_test_ai",
        "text_content": nexus_text,
        "target_language": "ka"
    })
    assert r.status_code == 200, f"Transcribe & Translate failed: {r.text}"
    res = r.json()
    assert res["target_language"] == "ka"
    # Verify that the translation contains genuine Georgian characters
    assert re.search(r'[\u10A0-\u10FF]', res["translation"]), f"Expected Georgian text but got: {res['translation']}"
    print("Georgian Translation verified OK:", res["translation"])

    print("ALL EMBEDDINGGEMMA SUITE TESTS PASSED!")

if __name__ == "__main__":
    test_embeddinggemma_suite()
