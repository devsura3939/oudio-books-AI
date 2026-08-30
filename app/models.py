from typing import List, Optional
from pydantic import BaseModel, Field

class Chapter(BaseModel):
    id: int
    title: str
    start_page: int
    end_page: int
    text: str
    word_count: int = 0
    estimated_duration_sec: float = 0.0
    status: str = "idle"  # idle, processing, completed, error
    progress: float = 0.0
    audio_filename: Optional[str] = None
    audio_url: Optional[str] = None
    audio_size_bytes: Optional[int] = None
    error: Optional[str] = None

class BookData(BaseModel):
    id: str
    filename: str
    title: str
    author: Optional[str] = "Unknown Author"
    total_pages: int = 0
    total_words: int = 0
    estimated_total_duration_sec: float = 0.0
    chapters: List[Chapter] = []
    created_at: str = ""

class TTSVoice(BaseModel):
    short_name: str
    name: str
    gender: str
    locale: str
    language: str
    friendly_name: str
    preview_audio_url: Optional[str] = None

class TTSGenerateRequest(BaseModel):
    book_id: str
    chapter_ids: Optional[List[int]] = None  # None means all
    voice: str = "en-US-ChristopherNeural"
    rate: str = "+0%"
    pitch: str = "+0Hz"
    volume: str = "+0%"

class ChapterUpdateRequest(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None

class PreviewVoiceRequest(BaseModel):
    voice: str = "en-US-ChristopherNeural"
    text: Optional[str] = "Welcome to your high quality AI audiobook studio. Reading your favorite books with natural voice."
    rate: str = "+0%"
    pitch: str = "+0Hz"
