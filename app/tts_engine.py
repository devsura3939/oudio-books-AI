import asyncio
import re
import os
import hashlib
from typing import List, Dict, Callable, Optional, AsyncGenerator
from pathlib import Path
import edge_tts

from app.config import AUDIO_DIR, MAX_CHUNK_CHARS, DEFAULT_VOICE
from app.models import TTSVoice

PREVIEW_DIR = AUDIO_DIR / "previews"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# Curated high-priority voices in exact order of quality/popularity
PRIORITY_ORDER = [
    "en-US-ChristopherNeural",
    "en-US-AriaNeural",
    "en-US-GuyNeural",
    "en-US-JennyNeural",
    "en-US-EricNeural",
    "en-US-RogerNeural",
    "en-US-MichelleNeural",
    "en-US-SteffanNeural",
    "en-GB-SoniaNeural",
    "en-GB-RyanNeural",
    "en-GB-LibbyNeural",
    "en-AU-NatashaNeural",
    "en-AU-WilliamNeural",
    "en-CA-LiamNeural",
    "en-IN-PrabhatNeural",
    "en-IN-NeerjaNeural",
    "es-ES-AlvaroNeural",
    "es-ES-ElviraNeural",
    "es-MX-JorgeNeural",
    "fr-FR-HenriNeural",
    "fr-FR-DeniseNeural",
    "de-DE-ConradNeural",
    "de-DE-KatjaNeural",
    "it-IT-DiegoNeural",
    "it-IT-ElsaNeural",
    "pt-BR-AntonioNeural",
    "pt-BR-FranciscaNeural",
    "ru-RU-DmitryNeural",
    "ru-RU-SvetlanaNeural",
    "ja-JP-KeitaNeural",
    "ja-JP-NanamiNeural",
    "zh-CN-YunxiNeural",
    "zh-CN-XiaoxiaoNeural",
    "ar-SA-HamedNeural",
    "hi-IN-MadhurNeural"
]

FEATURED_VOICE_TAGS = {
    "en-US-ChristopherNeural": "🌟 Best Male Narrator (Authoritative & Deep)",
    "en-US-AriaNeural": "🌟 Best Female Narrator (Expressive & Engaging)",
    "en-US-GuyNeural": "🌟 Friendly & Natural (Conversational Male)",
    "en-US-JennyNeural": "🌟 Clear & Professional (Female)",
    "en-US-EricNeural": "Dynamic & Energetic (Male)",
    "en-US-RogerNeural": "Deep & Mature (Male)",
    "en-US-MichelleNeural": "Warm & Gentle (Female)",
    "en-US-SteffanNeural": "Articulate & Formal (Male)",
    "en-GB-SoniaNeural": "Classic British Accent (Female)",
    "en-GB-RyanNeural": "Classic British Accent (Male)",
    "en-GB-LibbyNeural": "Warm British Storyteller (Female)",
    "en-AU-NatashaNeural": "Australian Accent (Female)",
    "en-AU-WilliamNeural": "Australian Accent (Male)",
    "en-CA-LiamNeural": "Canadian Accent (Male)",
    "en-IN-PrabhatNeural": "Indian Accent (Male)",
    "en-IN-NeerjaNeural": "Indian Accent (Female)",
    "es-ES-AlvaroNeural": "Spanish - Spain (Male)",
    "es-ES-ElviraNeural": "Spanish - Spain (Female)",
    "es-MX-JorgeNeural": "Spanish - Mexico (Male)",
    "fr-FR-HenriNeural": "French (Male)",
    "fr-FR-DeniseNeural": "French (Female)",
    "de-DE-ConradNeural": "German (Male)",
    "de-DE-KatjaNeural": "German (Female)",
    "it-IT-DiegoNeural": "Italian (Male)",
    "it-IT-ElsaNeural": "Italian (Female)",
    "pt-BR-AntonioNeural": "Portuguese - Brazil (Male)",
    "pt-BR-FranciscaNeural": "Portuguese - Brazil (Female)",
    "ru-RU-DmitryNeural": "Russian (Male)",
    "ru-RU-SvetlanaNeural": "Russian (Female)",
    "ja-JP-KeitaNeural": "Japanese (Male)",
    "ja-JP-NanamiNeural": "Japanese (Female)",
    "zh-CN-YunxiNeural": "Chinese - Mandarin (Male)",
    "zh-CN-XiaoxiaoNeural": "Chinese - Mandarin (Female)",
    "ar-SA-HamedNeural": "Arabic (Male)",
    "hi-IN-MadhurNeural": "Hindi (Male)",
}

_VOICE_CACHE: List[TTSVoice] = []

async def get_available_voices() -> List[TTSVoice]:
    """Fetch and categorize all available Neural TTS voices with priority ranking."""
    global _VOICE_CACHE
    if _VOICE_CACHE:
        return _VOICE_CACHE
    
    try:
        raw_voices = await edge_tts.list_voices()
        voices: List[TTSVoice] = []
        
        for v in raw_voices:
            short_name = v.get("ShortName", "")
            locale = v.get("Locale", "")
            gender = v.get("Gender", "")
            friendly = v.get("FriendlyName", short_name)
            
            # Add custom tag if featured
            if short_name in FEATURED_VOICE_TAGS:
                tag = FEATURED_VOICE_TAGS[short_name]
                display_name = f"{short_name} - {tag}"
            else:
                display_name = f"{short_name} ({gender}, {locale})"
            
            voices.append(TTSVoice(
                short_name=short_name,
                name=v.get("Name", short_name),
                gender=gender,
                locale=locale,
                language=locale.split("-")[0],
                friendly_name=display_name
            ))
        
        # Sort using PRIORITY_ORDER first
        def voice_sort_key(v: TTSVoice):
            if v.short_name in PRIORITY_ORDER:
                return (0, PRIORITY_ORDER.index(v.short_name), v.short_name)
            is_english = 0 if v.locale.startswith("en-") else 1
            return (1, is_english, v.locale, v.short_name)
        
        voices.sort(key=voice_sort_key)
        _VOICE_CACHE = voices
        return voices
    except Exception as e:
        print(f"Error fetching voices: {e}")
        # Fallback to curated static list
        fallback = []
        for sname in PRIORITY_ORDER:
            tag = FEATURED_VOICE_TAGS.get(sname, sname)
            fallback.append(TTSVoice(
                short_name=sname,
                name=sname,
                gender="Female" if "Female" in tag or "Aria" in sname or "Sonia" in sname else "Male",
                locale=sname.rsplit("-", 1)[0] if "-" in sname else "en-US",
                language="en",
                friendly_name=f"{sname} - {tag}"
            ))
        return fallback

def split_text_into_chunks(text: str, max_chunk_len: int = MAX_CHUNK_CHARS) -> List[str]:
    """Split text into manageable chunks at sentence boundaries for TTS synthesis."""
    if not text or not text.strip():
        return []
    
    text = text.strip()
    if len(text) <= max_chunk_len:
        return [text]
    
    paragraphs = text.split("\n\n")
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        if len(para) > max_chunk_len:
            sentences = re.split(r'([.!?]+(?:\s+|\n+))', para)
            sentence_list = []
            for j in range(0, len(sentences) - 1, 2):
                sentence_list.append(sentences[j] + sentences[j + 1])
            if len(sentences) % 2 == 1 and sentences[-1]:
                sentence_list.append(sentences[-1])
            
            for sent in sentence_list:
                sent = sent.strip()
                if not sent:
                    continue
                if current_len + len(sent) + 1 > max_chunk_len:
                    if current_chunk:
                        chunks.append(" ".join(current_chunk))
                        current_chunk = []
                        current_len = 0
                current_chunk.append(sent)
                current_len += len(sent) + 1
        else:
            if current_len + len(para) + 2 > max_chunk_len:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_len = 0
            current_chunk.append(para)
            current_len += len(para) + 2
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

async def synthesize_text_to_file(
    text: str,
    output_path: Path,
    voice: str = DEFAULT_VOICE,
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> bool:
    """Synthesize text to an MP3 file using Edge-TTS with chunking and progress reporting."""
    chunks = split_text_into_chunks(text)
    if not chunks:
        return False
    
    total_chunks = len(chunks)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    temp_path = output_path.with_suffix(".tmp.mp3")
    
    try:
        with open(temp_path, "wb") as outfile:
            for idx, chunk in enumerate(chunks):
                if progress_callback:
                    prog = round((idx / total_chunks) * 100, 1)
                    progress_callback(prog, f"Synthesizing chunk {idx + 1}/{total_chunks}...")
                
                communicate = edge_tts.Communicate(
                    text=chunk,
                    voice=voice,
                    rate=rate,
                    pitch=pitch,
                    volume=volume
                )
                
                async for chunk_data in communicate.stream():
                    if chunk_data["type"] == "audio":
                        outfile.write(chunk_data["data"])
                
                await asyncio.sleep(0.01)
        
        if temp_path.exists():
            if output_path.exists():
                output_path.unlink()
            temp_path.rename(output_path)
            
        if progress_callback:
            progress_callback(100.0, "Audiobook chapter ready!")
            
        return True
    except Exception as e:
        print(f"Synthesis error: {e}")
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        raise e

async def generate_voice_preview(
    voice: str = DEFAULT_VOICE,
    text: str = "Welcome to your high quality AI audiobook studio. Reading your favorite books with natural voice.",
    rate: str = "+0%",
    pitch: str = "+0Hz"
) -> str:
    """Generate or retrieve a cached audio preview for a specific voice."""
    key = f"{voice}_{rate}_{pitch}_{text}"
    hash_key = hashlib.md5(key.encode("utf-8")).hexdigest()[:12]
    filename = f"preview_{voice}_{hash_key}.mp3"
    filepath = PREVIEW_DIR / filename
    
    if not filepath.exists():
        communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
        await communicate.save(str(filepath))
        
    return f"/api/audio/preview/{filename}"
