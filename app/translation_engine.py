# -*- coding: utf-8 -*-
import re
from typing import Optional
from deep_translator import GoogleTranslator, LibreTranslator, MyMemoryTranslator


def clean_georgian_morphology(text: str) -> str:
    if not text:
        return text
    t = text
    # Standardize Georgian quotes and dashes
    t = re.sub(r'"([^"]+)"', r'„“', t)
    t = re.sub(r'--+', '—', t)
    # Fix common spacing before punctuation
    t = re.sub(r'\s+([.,;:!?])', r'', t)
    # Merge split words
    common = ["და", "არ", "კი", "რა", "ეს", "ის", "თუ", "მე", "მის", "მას", "რომ", "თქვა", "იყო", "მერე", "როცა", "ხოლო"]
    for w in common:
        spaced = r"\s+".join(list(w))
        t = re.sub(r"(?:^|\s)" + spaced + r"(?=\s|$)", " " + w + " ", t)
    return t.strip()


def translate_text(text: str, source_lang: str = "auto", target_lang: str = "ka") -> dict:
    if not text or not text.strip():
        return {"translated": "", "engine": "none", "success": True}

    src = "en" if source_lang in ("en", "eng") else ("ka" if source_lang in ("ka", "kat") else "auto")
    tgt = "ka" if target_lang in ("ka", "kat") else "en"

    # Split into paragraphs to maintain narrative structure
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    translated_paras = []
    engine_used = "server_neural_translate"

    for p in paragraphs:
        p_trans = None

        # Tier 0: Direct Google Translation API (ultra-stable, zero rate-limit)
        try:
            import httpx
            from urllib.parse import quote
            url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl={src}&tl={tgt}&dt=t&q={quote(p)}"
            resp = httpx.get(url, timeout=12.0)
            if resp.status_code == 200:
                data = resp.json()
                if data and data[0] and isinstance(data[0], list):
                    p_trans = "".join([item[0] for item in data[0] if item and item[0]])
                    engine_used = "server_neural_google"
        except Exception as e:
            print(f"[translation_engine] Tier 0 direct translation failed: {e}")

        # Tier 1: deep-translator GoogleTranslator fallback
        if not p_trans:
            try:
                tr = GoogleTranslator(source=src, target=tgt)
                if len(p) <= 4500:
                    p_trans = tr.translate(p)
                else:
                    sentences = re.split(r'(?<=[.!?…])\s+', p)
                    sub_chunks = []
                    cur = ""
                    for s in sentences:
                        if len(cur) + len(s) + 1 < 4000:
                            cur = (cur + " " + s).strip()
                        else:
                            sub_chunks.append(cur)
                            cur = s
                    if cur:
                        sub_chunks.append(cur)
                    p_trans = " ".join([tr.translate(sc) for sc in sub_chunks if sc])
                engine_used = "deep_translator_google"
            except Exception as e:
                print(f"[translation_engine] GoogleTranslator failed: {e}")

        # Tier 2: Fallback to original text
        if not p_trans:
            p_trans = p
            engine_used = "fallback_original"

        if tgt == "ka":
            p_trans = clean_georgian_morphology(p_trans)

        translated_paras.append(p_trans)

    return {
        "translated": "\n\n".join(translated_paras),
        "engine": engine_used,
        "success": True
    }
