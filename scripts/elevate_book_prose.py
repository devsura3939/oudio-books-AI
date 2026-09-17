#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Elevates book chapters by applying narrative paragraph reflow
and Georgian morphosyntactic and entity integrity polishing via Supabase REST API.
"""
import sys
import os
import json
import urllib.request
from pathlib import Path

# Add project root to sys.path
REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.text_integrity import reflow_narrative_paragraphs, polish_georgian_literary_syntax

SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:8000")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODk0NzE5NjksImV4cCI6MTk0NzE1MTk2OX0.S7Lc0540LcbGriJ982VSAtN81Ht-oBw9L9fbZdvLLH0")
DEFAULT_BOOK_ID = "ac8c6e53-9c62-4fc6-93cb-987cb5ddf0b8"


def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


def elevate_chapter(chap: dict) -> dict:
    cid = chap["id"]
    idx = chap.get("chapter_index", 0)
    title = chap.get("title", "")
    raw_en = chap.get("text_content") or ""
    meta = chap.get("metadata") or {}
    raw_ka = meta.get("text_ka") or ""

    print(f"\n--- Elevating Chapter {idx}: '{title}' ({cid}) ---")

    # 1. Reflow English
    elevated_en = reflow_narrative_paragraphs(raw_en) if raw_en else ""

    # 2. Reflow & Polish Georgian
    elevated_ka = ""
    if raw_ka:
        reflowed_ka = reflow_narrative_paragraphs(raw_ka)
        elevated_ka = polish_georgian_literary_syntax(reflowed_ka)

    en_p_before = len([p for p in raw_en.split("\n\n") if p.strip()])
    en_p_after = len([p for p in elevated_en.split("\n\n") if p.strip()])
    ka_p_before = len([p for p in raw_ka.split("\n\n") if p.strip()])
    ka_p_after = len([p for p in elevated_ka.split("\n\n") if p.strip()])

    print(f"  EN paragraphs: {en_p_before} -> {en_p_after} | chars: {len(raw_en)} -> {len(elevated_en)}")
    print(f"  KA paragraphs: {ka_p_before} -> {ka_p_after} | chars: {len(raw_ka)} -> {len(elevated_ka)}")

    # Check key entity improvements in Georgian
    for entity in ['მუდმივ', 'კონსტანტ', 'კაზაკ', 'რამფორდ', 'რუმფო']:
        b_cnt = raw_ka.count(entity)
        a_cnt = elevated_ka.count(entity)
        if b_cnt or a_cnt:
            print(f"    '{entity}': {b_cnt} -> {a_cnt}")

    # 3. Prepare updated metadata
    updated_meta = dict(meta)
    if elevated_ka:
        updated_meta["text_ka"] = elevated_ka
    updated_meta["literary_elevated"] = True

    # 4. Patch back to Supabase
    url = f"{SUPABASE_URL}/rest/v1/chapters?id=eq.{cid}"
    patch_body = json.dumps({
        "text_content": elevated_en,
        "metadata": updated_meta
    }, ensure_ascii=False).encode("utf-8")

    req = urllib.request.Request(url, data=patch_body, headers=get_headers(), method="PATCH")
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status in (200, 204):
            print(f"  [OK] Successfully saved Chapter {idx} to Supabase!")
            return {"status": "ok", "chapter_index": idx}
        else:
            print(f"  [WARN] Unexpected response status: {resp.status}")
            return {"status": "warn", "chapter_index": idx, "code": resp.status}


def elevate_all_book_chapters(book_id: str = DEFAULT_BOOK_ID):
    print(f"Fetching chapters for book {book_id}...")
    url = f"{SUPABASE_URL}/rest/v1/chapters?select=id,chapter_index,title,text_content,metadata&book_id=eq.{book_id}&order=chapter_index"
    req = urllib.request.Request(url, headers=get_headers())
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        chapters = json.loads(resp.read().decode("utf-8"))

    print(f"Found {len(chapters)} chapters in database.")
    results = []
    for chap in chapters:
        res = elevate_chapter(chap)
        results.append(res)

    print("\n==================================================")
    print(f" Completed elevation of {len(results)} chapters for book {book_id}!")
    print("==================================================")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BOOK_ID
    elevate_all_book_chapters(target)
