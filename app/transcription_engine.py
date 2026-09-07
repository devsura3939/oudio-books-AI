# -*- coding: utf-8 -*-
import io
import os
import re
from typing import Optional, Dict, Any

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

try:
    import speech_recognition as sr
except ImportError:
    sr = None

from PIL import Image
from app.text_integrity import clean_verbatim, normalize_language, detect_language, vision_prompt
from app.image_processor import enhance_page_image, image_to_jpeg_bytes, score_image_sharpness
from app.training_engine import load_active_pack, apply_pack


def transcribe_audio_bytes(
    audio_bytes: bytes,
    mime_type: str = "audio/mp3",
    language: str = "auto",
    prompt: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transcribes audio bytes in Georgian or English into high-fidelity literary text.
    Tier 1: Google Gemini 2.5 Flash multimodal transcription (native Georgian and English acoustic comprehension).
    Tier 2: Neural SpeechRecognition (Google Web Speech API for ka-GE and en-US).
    """
    if not audio_bytes or len(audio_bytes) == 0:
        return {"text": "", "language": language, "engine": "none", "success": False, "error": "Empty audio"}

    # Normalize language code
    lang = normalize_language(language)
    effective_key = api_key or os.environ.get("GEMINI_API_KEY")

    # Tier 1: Gemini 2.5 Flash Multimodal Audio Transcription
    if genai is not None and effective_key:
        try:
            client = genai.Client(api_key=effective_key)
            instruction = (
                "You are an expert transcriber. Transcribe this audio recording verbatim in its original spoken language. "
                "Preserve exact wording, sentence boundaries, punctuation, and capitalization. "
                "If the audio is Georgian, use Georgian script. Preserve the speaker's wording and repetitions. Mark inaudible spans [[UNCLEAR]]; do not guess from context. "
                "If in English, transcribe with standard English punctuation. "
                "Do not summarize, do not translate, and do not include meta-commentary. Output ONLY the transcription."
            )
            if lang != "auto":
                instruction += f" Expected spoken language: {lang}."
            if prompt:
                instruction += f" Context hints / glossary: {prompt}"

            # Ensure mime type has valid format
            clean_mime = mime_type.split(";")[0].strip() if mime_type else "audio/mp3"
            if clean_mime not in ("audio/mp3", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/flac", "audio/m4a", "audio/aac"):
                clean_mime = "audio/mp3"

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=clean_mime),
                    instruction
                ]
            )
            if response and response.text and str(getattr(response.candidates[0], "finish_reason", "")).split(".")[-1] == "STOP":
                result_text = response.text.strip()
                result_text = clean_verbatim(result_text)
                return {
                    "text": result_text,
                    "language": detect_language(result_text),
                    "engine": "gemini-2.5-flash",
                    "success": True
                }
        except Exception as e:
            print(f"[transcription_engine] Tier 1 Gemini audio transcription failed: {e}")

    # Tier 2: Neural SpeechRecognition Fallback
    if sr is not None and lang != "auto":
        try:
            r = sr.Recognizer()
            # SpeechRecognition requires WAV or AIFF format for AudioFile
            if audio_bytes[:4] in (b'RIFF', b'fLaC', b'FORM'):
                with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
                    audio_data = r.record(source)
                target_speech_lang = "ka-GE" if lang == "ka" else "en-US"
                text = r.recognize_google(audio_data, language=target_speech_lang)
                if text:
                    text = clean_verbatim(text)
                    return {
                        "text": text,
                        "language": lang if lang != "auto" else ("ka" if re.search(r'[\u10A0-\u10FF]', text) else "en"),
                        "engine": "google-web-speech",
                        "success": True
                    }
        except Exception as e:
            print(f"[transcription_engine] Tier 2 SpeechRecognition failed: {e}")

    return {
        "text": "",
        "language": language,
        "engine": "fallback_none",
        "success": False,
        "error": "Transcription requires GEMINI_API_KEY, or WAV/AIFF/FLAC audio with an explicit English or Georgian language for speech fallback."
    }


def transcribe_audio_file(
    file_path: str,
    language: str = "auto",
    prompt: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Transcribes a local audio file on disk."""
    if not os.path.exists(file_path):
        return {"text": "", "language": language, "engine": "none", "success": False, "error": f"File not found: {file_path}"}

    ext = os.path.splitext(file_path)[1].lower()
    mime_map = {
        ".mp3": "audio/mp3",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
        ".m4a": "audio/m4a",
        ".flac": "audio/flac",
        ".aac": "audio/aac"
    }
    mime = mime_map.get(ext, "audio/mp3")

    with open(file_path, "rb") as f:
        audio_bytes = f.read()

    return transcribe_audio_bytes(audio_bytes, mime_type=mime, language=language, prompt=prompt, api_key=api_key)


def transcribe_image_bytes(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    language: str = "auto",
    hint: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    High-accuracy neural vision OCR transcription for book photographs and camera captures.
    Preprocesses photo with illumination flattening and unsharp masking,
    runs Gemini 2.5 Flash vision with Georgian linguistic restoration rules,
    and post-edits with clean morphology and active rule packs.
    """
    if not image_bytes or len(image_bytes) == 0:
        return {"text": "", "language": language, "engine": "none", "success": False, "error": "Empty image bytes"}

    lang = normalize_language(language)
    effective_key = api_key or os.environ.get("GEMINI_API_KEY")

    # 1. Preprocess & Enhance Image for Optimal OCR
    processed_bytes = image_bytes
    processed_mime = mime_type
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        sharpness = score_image_sharpness(pil_img)
        w, h = pil_img.size
        # If image is soft, small, or has camera phone characteristics, enhance it
        if sharpness < 180 or max(w, h) < 2000:
            enhanced_img = enhance_page_image(pil_img)
            processed_bytes = image_to_jpeg_bytes(enhanced_img, quality=92)
            processed_mime = "image/jpeg"
    except Exception as e:
        print(f"[transcription_engine] image preprocessing warning: {e}")

    instruction = vision_prompt(lang, hint)

    # 3. Neural Execution via Gemini 2.5 Flash Vision
    result_text = ""
    engine_name = "gemini-2.5-flash"
    if genai is not None and effective_key:
        try:
            client = genai.Client(api_key=effective_key)
            clean_mime = processed_mime.split(";")[0].strip() if processed_mime else "image/jpeg"
            if clean_mime not in ("image/jpeg", "image/jpg", "image/png", "image/webp"):
                clean_mime = "image/jpeg"

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=processed_bytes, mime_type=clean_mime),
                    instruction
                ],
                config=dict(temperature=0.0)
            )
            if response and response.text and str(getattr(response.candidates[0], "finish_reason", "")).split(".")[-1] == "STOP":
                result_text = response.text.strip()
        except Exception as e:
            print(f"[transcription_engine] Tier 1 Gemini vision failed: {e}")

    # HTTP Fallback if SDK failed or not initialized but effective_key exists
    if not result_text and effective_key:
        try:
            import httpx
            import base64
            clean_mime = processed_mime.split(";")[0].strip() if processed_mime else "image/jpeg"
            b64_img = base64.b64encode(processed_bytes).decode("utf-8")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={effective_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": instruction},
                            {"inlineData": {"mimeType": clean_mime, "data": b64_img}}
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0.0, "maxOutputTokens": 8192}
            }
            resp = httpx.post(url, json=payload, timeout=30.0)
            if resp.status_code == 200:
                data = resp.json()
                cand = data.get("candidates", [])
                if cand and cand[0].get("finishReason") == "STOP" and cand[0].get("content", {}).get("parts", []):
                    result_text = cand[0]["content"]["parts"][0].get("text", "").strip()
        except Exception as e:
            print(f"[transcription_engine] HTTP Gemini vision fallback failed: {e}")

    if not result_text:
        return {
            "text": "",
            "language": language,
            "engine": "none",
            "success": False,
            "error": "Vision OCR requires a valid GEMINI_API_KEY."
        }

    # 4. Clean formatting and apply Georgian morphology & trained active rule pack
    if result_text == "[[NO_TEXT]]":
        result_text = ""
    result_text = re.sub(r"^```(?:[a-z]*\n)?", "", result_text, flags=re.IGNORECASE)
    result_text = re.sub(r"\n?```$", "", result_text).strip()

    result_text = clean_verbatim(result_text)
    detected_lang = detect_language(result_text)
    # Trained editorial rules are suggestions, never destructive OCR post-processing.
    repair_proposal = None
    try:
        active_pack = load_active_pack(detected_lang if detected_lang != "auto" else lang)
        if active_pack.get("enabled", True):
            candidate = apply_pack(result_text, active_pack.get("items", []), kind="transcribe")
            if candidate != result_text:
                repair_proposal = {"text": candidate, "source": result_text, "status": "needs_review"}
    except Exception:
        pass

    return {
        "text": result_text,
        "language": detected_lang,
        "repair_proposal": repair_proposal,
        "needs_review": "[[UNCLEAR]]" in result_text or bool(repair_proposal),
        "engine": engine_name,
        "success": True
    }
