import asyncio
import re
import os
import hashlib
from typing import List, Dict, Callable, Optional, AsyncGenerator, Union
from pathlib import Path
import edge_tts

from app.config import AUDIO_DIR, MAX_CHUNK_CHARS, DEFAULT_VOICE
from app.models import TTSVoice
from app.georgian_phonetics import verbalize_georgian_for_tts

PREVIEW_DIR = AUDIO_DIR / "previews"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# Curated high-priority voices in exact order of quality/popularity
PRIORITY_ORDER = [
    "ka-GE-GiorgiNeural",
    "ka-GE-EkaNeural",
    "en-US-ChristopherNeural",
    "en-US-AriaNeural",
    "en-US-GuyNeural",
    "en-US-JennyNeural",
    "en-US-EricNeural",
    "en-US-AvaNeural",
    "en-US-RogerNeural",
    "en-US-MichelleNeural",
    "en-US-SteffanNeural",
    "en-GB-SoniaNeural",
    "en-GB-RyanNeural",
    "en-GB-LibbyNeural",
    "en-GB-ThomasNeural",
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
    "ka-GE-GiorgiNeural": "🌟 Best Georgian Narrator (Natural & Expressive Male)",
    "ka-GE-EkaNeural": "🌟 Best Georgian Narrator (Warm & Lyrical Female)",
    "en-US-ChristopherNeural": "🌟 Best Male Narrator (Authoritative & Deep)",
    "en-US-AriaNeural": "🌟 Best Female Narrator (Expressive & Engaging)",
    "en-US-GuyNeural": "🌟 Friendly & Natural (Conversational Male)",
    "en-US-JennyNeural": "🌟 Clear & Professional (Female)",
    "en-US-EricNeural": "Dynamic & Energetic (Male)",
    "en-US-AvaNeural": "Expressive Novel Reader (Female)",
    "en-US-RogerNeural": "Deep & Mature (Male)",
    "en-US-MichelleNeural": "Warm & Gentle (Female)",
    "en-US-SteffanNeural": "Articulate & Formal (Male)",
    "en-GB-SoniaNeural": "Classic British Accent (Female)",
    "en-GB-RyanNeural": "Classic British Accent (Male)",
    "en-GB-LibbyNeural": "Warm British Storyteller (Female)",
    "en-GB-ThomasNeural": "Classical British Reader (Male)",
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
                language=sname.split("-")[0],
                friendly_name=f"{sname} - {tag}"
            ))
        return fallback

def split_text_into_chunks(text: str, max_chunk_len: int = MAX_CHUNK_CHARS) -> List[str]:
    """Split at whitespace when possible, with a hard provider size limit."""
    from app.text_integrity import split_bounded
    return split_bounded(text.strip(), max_chunk_len) if text and text.strip() else []


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
                
                is_ka = bool(re.search(r"[\u10A0-\u10FF]", chunk)) or voice.startswith("ka-")
                spoken_text = verbalize_georgian_for_tts(chunk) if is_ka else chunk
                if not spoken_text.strip():
                    continue

                communicate = edge_tts.Communicate(
                    text=spoken_text,
                    voice=voice,
                    rate=rate,
                    pitch=pitch,
                    volume=volume
                )
                
                chunk_bytes = 0
                async for chunk_data in communicate.stream():
                    if chunk_data["type"] == "audio":
                        outfile.write(chunk_data["data"])
                        chunk_bytes += len(chunk_data["data"])
                if not chunk_bytes:
                    raise RuntimeError(f"Voice returned no audio for chunk {idx + 1}; chapter was not published")
                
                await asyncio.sleep(0.01)
        
        if temp_path.exists():
            temp_path.replace(output_path)
            
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
    text: Optional[str] = None,
    rate: str = "+0%",
    pitch: str = "+0Hz"
) -> str:
    """Generate or retrieve a cached audio preview for a specific voice."""
    is_ka = voice.startswith("ka-") or (text is not None and bool(re.search(r"[\u10A0-\u10FF]", text)))
    if not text or text == "Welcome to your high quality AI audiobook studio. Reading your favorite books with natural voice.":
        if is_ka:
            text = "მოგესალმებით თქვენს მაღალი ხარისხის აუდიოწიგნების სტუდიაში. ჩვენ ვკითხულობთ თქვენს საყვარელ წიგნებს ბუნებრივი და ცოცხალი ხმით."
        else:
            text = "Welcome to your high quality AI audiobook studio. Reading your favorite books with natural voice."

    spoken_text = verbalize_georgian_for_tts(text) if is_ka else text

    key = f"{voice}_{rate}_{pitch}_{spoken_text}"
    hash_key = hashlib.md5(key.encode("utf-8")).hexdigest()[:12]
    filename = f"preview_{voice}_{hash_key}.mp3"
    filepath = PREVIEW_DIR / filename
    
    if not filepath.exists():
        communicate = edge_tts.Communicate(text=spoken_text, voice=voice, rate=rate, pitch=pitch)
        await communicate.save(str(filepath))
        
    return f"/api/audio/preview/{filename}"


TTS_CACHE_DIR = AUDIO_DIR / "tts_cache"
TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

PRESET_TO_EDGE_VOICE: Dict[str, str] = {
    # 🇬🇪 Georgian Presets
    "ka-male": "ka-GE-GiorgiNeural",
    "ka-actor": "ka-GE-GiorgiNeural",
    "ka-female": "ka-GE-EkaNeural",
    "ka-soft": "ka-GE-EkaNeural",
    "ka-ge-giorgi": "ka-GE-GiorgiNeural",
    "ka-ge-eka": "ka-GE-EkaNeural",

    # 🇬🇧 English British Presets
    "en-gb-male": "en-GB-RyanNeural",
    "en-gb-female": "en-GB-SoniaNeural",
    "en-gb-libby": "en-GB-LibbyNeural",
    "en-gb-thomas": "en-GB-ThomasNeural",

    # 🇺🇸 English American Presets
    "en-us-storyteller": "en-US-ChristopherNeural",
    "en-us-aria": "en-US-AriaNeural",
    "en-us-male": "en-US-GuyNeural",
    "en-us-female": "en-US-JennyNeural",
    "en-us-eric": "en-US-EricNeural",
    "en-us-ava": "en-US-AvaNeural",
    "en-neutral": "en-US-AriaNeural",

    # 🌍 Multilingual
    "multi-puck": "en-US-GuyNeural",
    "multi-fenrir": "en-US-ChristopherNeural",
}

def resolve_tts_voice(preset: Optional[str] = None, voice: Optional[str] = None, text: str = "", lang: Optional[str] = None) -> str:
    """Intelligently map presets or custom voice IDs to verified Edge-TTS neural voices."""
    if voice and isinstance(voice, str) and voice.strip():
        # Strip descriptive labels like 'ka-GE-GiorgiNeural - ka-GE (Male)'
        clean = voice.split(" - ")[0].split("(")[0].strip()
        if clean:
            return clean

    if preset and isinstance(preset, str) and preset.strip():
        clean_preset = preset.strip().lower()
        if clean_preset.startswith("preset:"):
            clean_preset = clean_preset[7:]
        if clean_preset in PRESET_TO_EDGE_VOICE:
            return PRESET_TO_EDGE_VOICE[clean_preset]

    # Inspect language or text characters
    is_ka = (lang and str(lang).lower().startswith("ka")) or bool(re.search(r"[\u10A0-\u10FF]", text))
    if is_ka:
        return "ka-GE-GiorgiNeural"
    return "en-GB-RyanNeural"

def format_tts_rate(rate) -> str:
    """Normalize speech rate delta into Edge-TTS percentage format (e.g. '+0%', '-10%')."""
    if rate is None:
        return "+0%"
    if isinstance(rate, (int, float)):
        # If passed as speed multiplier (e.g. 1.2x)
        if 0.2 <= rate <= 3.0:
            pct = int(round((float(rate) - 1.0) * 100))
        else:
            pct = int(round(float(rate)))
        return f"{pct:+d}%"
    s = str(rate).strip()
    if s.endswith("%"):
        return s if s.startswith(("+", "-")) else f"+{s}"
    try:
        f = float(s)
        if 0.2 <= f <= 3.0:
            pct = int(round((f - 1.0) * 100))
        else:
            pct = int(round(f))
        return f"{pct:+d}%"
    except Exception:
        return "+0%"

def format_tts_pitch(pitch) -> str:
    """Normalize pitch delta into Edge-TTS Hertz format (e.g. '+0Hz', '-2Hz')."""
    if pitch is None:
        return "+0Hz"
    if isinstance(pitch, (int, float)):
        hz = int(round(float(pitch)))
        return f"{hz:+d}Hz"
    s = str(pitch).strip()
    if s.endswith("Hz"):
        return s if s.startswith(("+", "-")) else f"+{s}"
    try:
        hz = int(round(float(s)))
        return f"{hz:+d}Hz"
    except Exception:
        return "+0Hz"

async def synthesize_single_speech(
    text: str,
    preset: Optional[str] = None,
    voice: Optional[str] = None,
    rate: Union[str, float] = "+0%",
    pitch: Union[str, float] = "+0Hz",
    lang: Optional[str] = None
) -> bytes:
    """Synthesizes a single sentence or paragraph directly to MP3 audio bytes with LRU disk caching."""
    chosen_voice = resolve_tts_voice(preset=preset, voice=voice, text=text, lang=lang)
    rate_str = format_tts_rate(rate)
    pitch_str = format_tts_pitch(pitch)

    is_ka = chosen_voice.startswith("ka-") or (lang and str(lang).lower().startswith("ka")) or bool(re.search(r"[\u10A0-\u10FF]", text))
    spoken_text = verbalize_georgian_for_tts(text) if is_ka else text

    # Compute cache key
    key = f"{chosen_voice}_{rate_str}_{pitch_str}_{spoken_text.strip()}"
    hash_key = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    cache_path = TTS_CACHE_DIR / f"{hash_key}.mp3"

    if cache_path.exists() and cache_path.stat().st_size > 0:
        return cache_path.read_bytes()

    communicate = edge_tts.Communicate(
        text=spoken_text,
        voice=chosen_voice,
        rate=rate_str,
        pitch=pitch_str
    )

    audio_data = bytearray()
    async for chunk_data in communicate.stream():
        if chunk_data["type"] == "audio":
            audio_data.extend(chunk_data["data"])

    if not audio_data:
        raise RuntimeError(f"Edge-TTS returned no audio for voice '{chosen_voice}'")

    audio_bytes = bytes(audio_data)
    try:
        cache_path.write_bytes(audio_bytes)
    except Exception as err:
        print(f"[tts_engine] Disk cache write failed: {err}")

    return audio_bytes

