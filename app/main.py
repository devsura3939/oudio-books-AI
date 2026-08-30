import asyncio
import json
import os
import shutil
from typing import Dict, List, Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    UPLOAD_DIR, AUDIO_DIR, STATIC_DIR, DEFAULT_VOICE, DEFAULT_RATE, DEFAULT_PITCH
)
from app.models import (
    BookData, Chapter, TTSVoice, TTSGenerateRequest,
    ChapterUpdateRequest, PreviewVoiceRequest
)
from app.pdf_processor import extract_pdf_data
from app.tts_engine import (
    get_available_voices, synthesize_text_to_file,
    generate_voice_preview, PREVIEW_DIR
)
from app.storage import (
    save_book_session, get_book_session, tag_mp3_metadata,
    create_book_zip_package, sanitize_filename,
    book_lock, recover_stale_chapters
)

app = FastAPI(
    title="PDF to High-Quality Audiobook Studio",
    description="Convert any PDF eBook to a studio-grade audiobook with natural neural voices.",
    version="1.0.0"
)

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (HTML, CSS, JS)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Progress subscribers: dict of book_id -> list of asyncio.Queue
_PROGRESS_SUBSCRIBERS: Dict[str, List[asyncio.Queue]] = {}

def broadcast_progress(book_id: str, payload: dict):
    """Broadcast progress update to all SSE listeners of book_id."""
    subs = _PROGRESS_SUBSCRIBERS.get(book_id)
    if not subs:
        return
    dead = None
    for q in subs:
        try:
            q.put_nowait(payload)
        except Exception:
            # Queue is closed or broken: drop the subscriber so the list
            # cannot grow without bound across long-lived sessions.
            if dead is None:
                dead = []
            dead.append(q)
    if dead:
        for q in dead:
            subs.remove(q)
        if not subs:
            del _PROGRESS_SUBSCRIBERS[book_id]

@app.get("/")
async def serve_index():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/api/voices", response_model=List[TTSVoice])
async def list_voices():
    """List all available Neural Voices."""
    return await get_available_voices()

@app.post("/api/voices/preview")
async def preview_voice(req: PreviewVoiceRequest):
    """Generate audio sample preview for a given voice."""
    try:
        url = await generate_voice_preview(
            voice=req.voice,
            text=req.text or "Welcome to your high quality AI audiobook studio.",
            rate=req.rate or "+0%",
            pitch=req.pitch or "+0Hz"
        )
        return {"preview_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file into chapters."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    # Save uploaded file
    file_id = sanitize_filename(Path(file.filename).stem)[:20]
    temp_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        book_data = extract_pdf_data(temp_path)
        save_book_session(book_data)
        return book_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

@app.get("/api/book/{book_id}")
async def get_book(book_id: str):
    """Get book metadata and chapter list."""
    book = get_book_session(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@app.put("/api/book/{book_id}/chapter/{chapter_id}")
async def update_chapter(book_id: str, chapter_id: int, req: ChapterUpdateRequest):
    """Edit chapter title or text before synthesis."""
    # Serialize read-modify-write with concurrent TTS workers on this book.
    async with book_lock(book_id):
        book = get_book_session(book_id)
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        for c in book.chapters:
            if c.id == chapter_id:
                if req.title is not None:
                    c.title = req.title
                if req.text is not None:
                    c.text = req.text
                    c.word_count = len(c.text.split())
                    c.estimated_duration_sec = round((c.word_count / 150.0) * 60.0, 1)
                save_book_session(book)
                return c

        raise HTTPException(status_code=404, detail="Chapter not found")

async def _process_chapter_tts(
    book_id: str,
    chapter: Chapter,
    total_chapters: int,
    voice: str,
    rate: str,
    pitch: str,
    volume: str
):
    """Worker task to synthesize a single chapter."""
    book = get_book_session(book_id)
    if not book:
        return
        
    book_dir = AUDIO_DIR / book_id
    book_dir.mkdir(parents=True, exist_ok=True)
    
    clean_title = sanitize_filename(chapter.title)[:40]
    out_filename = f"Chapter_{chapter.id:02d}_{clean_title}.mp3"
    out_path = book_dir / out_filename
    
    chapter.status = "processing"
    chapter.progress = 0.0
    chapter.error = None
    save_book_session(book)
    
    broadcast_progress(book_id, {
        "event": "chapter_start",
        "chapter_id": chapter.id,
        "status": "processing",
        "progress": 0.0,
        "message": f"Starting synthesis for {chapter.title}..."
    })
    
    def on_progress(p: float, msg: str):
        chapter.progress = p
        broadcast_progress(book_id, {
            "event": "chapter_progress",
            "chapter_id": chapter.id,
            "status": "processing",
            "progress": p,
            "message": msg
        })
        
    try:
        success = await synthesize_text_to_file(
            text=chapter.text,
            output_path=out_path,
            voice=voice,
            rate=rate,
            pitch=pitch,
            volume=volume,
            progress_callback=on_progress
        )
        
        if success and out_path.exists():
            # Tag metadata
            tag_mp3_metadata(
                mp3_path=out_path,
                title=chapter.title,
                author=book.author or "AI Audiobook",
                album=book.title,
                track_no=chapter.id,
                total_tracks=total_chapters
            )
            
            chapter.status = "completed"
            chapter.progress = 100.0
            chapter.audio_filename = out_filename
            chapter.audio_url = f"/api/audio/{book_id}/{out_filename}"
            chapter.audio_size_bytes = out_path.stat().st_size
            save_book_session(book)
            
            broadcast_progress(book_id, {
                "event": "chapter_completed",
                "chapter_id": chapter.id,
                "status": "completed",
                "progress": 100.0,
                "audio_url": chapter.audio_url,
                "audio_filename": out_filename,
                "message": f"Completed: {chapter.title}"
            })
    except Exception as e:
        chapter.status = "error"
        chapter.error = str(e)
        save_book_session(book)
        broadcast_progress(book_id, {
            "event": "chapter_error",
            "chapter_id": chapter.id,
            "status": "error",
            "error": str(e),
            "message": f"Failed: {str(e)}"
        })

async def _batch_tts_runner(req: TTSGenerateRequest):
    """Run batch conversion across selected chapters sequentially/managed."""
    try:
        # One lock for the whole batch: TTS workers on the same book must not
        # interleave with each other or with chapter edits.
        async with book_lock(req.book_id):
            book = get_book_session(req.book_id)
            if not book:
                return

            target_chapters = [
                c for c in book.chapters
                if req.chapter_ids is None or c.id in req.chapter_ids
            ]

            total = len(book.chapters)

            for chap in target_chapters:
                await _process_chapter_tts(
                    book_id=req.book_id,
                    chapter=chap,
                    total_chapters=total,
                    voice=req.voice,
                    rate=req.rate,
                    pitch=req.pitch,
                    volume=req.volume
                )
    except Exception as e:
        # A background task must never die silently: record the failure on the
        # book so the UI can surface a retry instead of a stuck batch.
        print(f"batch TTS runner failed for {req.book_id}: {e}")
        broadcast_progress(req.book_id, {
            "event": "batch_error",
            "error": str(e),
            "message": f"Batch generation failed: {str(e)}"
        })
        raise

    broadcast_progress(req.book_id, {
        "event": "batch_completed",
        "message": "All requested chapters synthesized successfully!"
    })

@app.post("/api/generate")
async def start_generation(req: TTSGenerateRequest, background_tasks: BackgroundTasks):
    """Start TTS generation for selected or all chapters."""
    book = get_book_session(req.book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    background_tasks.add_task(_batch_tts_runner, req)
    return {"message": "Audio generation queued successfully", "book_id": req.book_id}

@app.get("/api/progress/{book_id}")
async def progress_stream(book_id: str, request: Request):
    """Server-Sent Events endpoint for real-time progress stream."""
    queue = asyncio.Queue()
    if book_id not in _PROGRESS_SUBSCRIBERS:
        _PROGRESS_SUBSCRIBERS[book_id] = []
    _PROGRESS_SUBSCRIBERS[book_id].append(queue)
    
    async def event_generator():
        try:
            # Send initial ping
            yield f"data: {json.dumps({'event': 'connected', 'book_id': book_id})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield ": ping\n\n"
        finally:
            if book_id in _PROGRESS_SUBSCRIBERS:
                if queue in _PROGRESS_SUBSCRIBERS[book_id]:
                    _PROGRESS_SUBSCRIBERS[book_id].remove(queue)
                    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/audio/{book_id}/{filename}")
async def stream_audio(book_id: str, filename: str):
    """Stream generated MP3 audio file with range headers."""
    audio_path = AUDIO_DIR / book_id / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path=audio_path, media_type="audio/mpeg", filename=filename)

@app.get("/api/audio/preview/{filename}")
async def stream_preview_audio(filename: str):
    """Stream voice sample preview MP3."""
    preview_path = PREVIEW_DIR / filename
    if not preview_path.exists():
        raise HTTPException(status_code=404, detail="Preview file not found")
    return FileResponse(path=preview_path, media_type="audio/mpeg")

@app.get("/api/download/zip/{book_id}")
async def download_zip(book_id: str):
    """Download full book ZIP bundle with all chapter MP3s."""
    book = get_book_session(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    zip_path = create_book_zip_package(book)
    if not zip_path or not zip_path.exists():
        raise HTTPException(status_code=404, detail="No generated audio chapters found to zip.")
        
    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=f"{sanitize_filename(book.title)}_Audiobook.zip"
    )
