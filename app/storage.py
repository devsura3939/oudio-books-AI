import json
import zipfile
import shutil
from typing import Dict, Optional, List
from pathlib import Path
import mutagen
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TRCK, TCON

from app.config import AUDIO_DIR, UPLOAD_DIR
from app.models import BookData, Chapter

# In-memory store of book sessions (backed by json in data dir)
_BOOKS_CACHE: Dict[str, BookData] = {}

def save_book_session(book: BookData):
    """Save book session in memory and to disk."""
    _BOOKS_CACHE[book.id] = book
    book_file = UPLOAD_DIR / f"{book.id}_meta.json"
    with open(book_file, "w", encoding="utf-8") as f:
        f.write(book.model_dump_json(indent=2))

def get_book_session(book_id: str) -> Optional[BookData]:
    """Retrieve book session by ID."""
    if book_id in _BOOKS_CACHE:
        return _BOOKS_CACHE[book_id]
    
    book_file = UPLOAD_DIR / f"{book_id}_meta.json"
    if book_file.exists():
        try:
            with open(book_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                book = BookData(**data)
                _BOOKS_CACHE[book_id] = book
                return book
        except Exception as e:
            print(f"Error loading book session {book_id}: {e}")
    return None

def tag_mp3_metadata(mp3_path: Path, title: str, author: str, album: str, track_no: int, total_tracks: int):
    """Embed ID3 metadata tags into MP3."""
    try:
        audio = ID3(str(mp3_path))
    except Exception:
        audio = ID3()
    
    audio.add(TIT2(encoding=3, text=title))
    audio.add(TPE1(encoding=3, text=author))
    audio.add(TALB(encoding=3, text=album))
    audio.add(TRCK(encoding=3, text=f"{track_no}/{total_tracks}"))
    audio.add(TCON(encoding=3, text="Audiobook"))
    audio.save(str(mp3_path))

def create_book_zip_package(book: BookData) -> Optional[Path]:
    """Create a ZIP archive containing all completed chapter MP3s for a book."""
    book_dir = AUDIO_DIR / book.id
    if not book_dir.exists():
        return None
    
    zip_path = AUDIO_DIR / f"{book.id}_{sanitize_filename(book.title)}_Audiobook.zip"
    
    # Check if there are completed mp3s
    mp3_files = list(book_dir.glob("*.mp3"))
    if not mp3_files:
        return None
        
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for mp3_file in sorted(mp3_files):
            zf.write(mp3_file, arcname=mp3_file.name)
            
    return zip_path

def sanitize_filename(name: str) -> str:
    """Sanitize string for safe filenames."""
    import re
    return re.sub(r'[\/\\:\*\?\"<>\|]+', '_', name).strip()
