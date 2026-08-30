import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
AUDIO_DIR = DATA_DIR / "audio"
STATIC_DIR = BASE_DIR / "static"

for folder in [DATA_DIR, UPLOAD_DIR, AUDIO_DIR, STATIC_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

DEFAULT_VOICE = "en-US-ChristopherNeural"
DEFAULT_RATE = "+0%"
DEFAULT_PITCH = "+0Hz"
DEFAULT_VOLUME = "+0%"

MAX_CHUNK_CHARS = 2500  # Max characters per TTS chunk for optimal synthesis
HOST = "0.0.0.0"
PORT = 8000
