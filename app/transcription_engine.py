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

from app.translation_engine import clean_georgian_morphology


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
    lang = "ka" if language in ("ka", "kat", "geo", "georgian") else ("en" if language in ("en", "eng", "english") else "auto")
    effective_key = api_key or os.environ.get("GEMINI_API_KEY")

    # Tier 1: Gemini 2.5 Flash Multimodal Audio Transcription
    if genai is not None and effective_key:
        try:
            client = genai.Client(api_key=effective_key)
            instruction = (
                "You are an expert transcriber. Transcribe this audio recording verbatim in its original spoken language. "
                "Preserve exact wording, sentence boundaries, punctuation, and capitalization. "
                "If the audio is spoken in Georgian, transcribe in clean Georgian Mkhedruli script with literary quotes („...“) and standard dashes (—). "
                "If in English, transcribe with standard English punctuation. "
                "Do not summarize, do not translate, and do not include meta-commentary. Output ONLY the transcription."
            )
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
            if response and response.text:
                result_text = response.text.strip()
                if lang == "ka" or re.search(r'[\u10A0-\u10FF]', result_text):
                    result_text = clean_georgian_morphology(result_text)
                return {
                    "text": result_text,
                    "language": "ka" if re.search(r'[\u10A0-\u10FF]', result_text) else "en",
                    "engine": "gemini-2.5-flash",
                    "success": True
                }
        except Exception as e:
            print(f"[transcription_engine] Tier 1 Gemini audio transcription failed: {e}")

    # Tier 2: Neural SpeechRecognition Fallback
    if sr is not None:
        try:
            r = sr.Recognizer()
            # SpeechRecognition requires WAV or AIFF format for AudioFile
            if audio_bytes[:4] == b'RIFF':
                with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
                    audio_data = r.record(source)
                target_speech_lang = "ka-GE" if lang == "ka" else "en-US"
                text = r.recognize_google(audio_data, language=target_speech_lang)
                if text:
                    if lang == "ka":
                        text = clean_georgian_morphology(text)
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
        "error": "Transcription requires either GEMINI_API_KEY for multimodal audio or a valid WAV audio input."
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
