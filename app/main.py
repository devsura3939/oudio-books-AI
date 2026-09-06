import asyncio
import json
import os
import shutil
from typing import Dict, List, Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request, Response
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
from app.image_processor import (
    score_image_sharpness, select_best_burst_frame,
    enhance_page_image, image_to_jpeg_bytes
)
from app.translation_engine import translate_text
from app.transcription_engine import transcribe_audio_bytes, transcribe_audio_file, transcribe_image_bytes
from app.supabase_bridge import check_supabase_health, get_admin_session, fetch_supabase_books
from app.training_engine import (
    verify_key, open_training_session, get_training_context,
    propose_training_rules, finish_training_session, load_active_pack,
    load_benchmark_cases, evaluate_pack, DEFAULT_DEV_KEY,
    ENGINE_ARCHITECTURE_AND_TRAINING_GUIDE_MD,
    get_training_guide_json, get_training_guide_markdown,
    generate_new_training_key
)
import base64
from io import BytesIO

app = FastAPI(
    title="PDF to High-Quality Audiobook Studio",
    description="Convert any PDF eBook to a studio-grade audiobook with natural neural voices.",
    version="1.48.0"
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

@app.post("/api/server-translate")
async def server_translate(req: Request):
    """
    Lightweight, high-speed server-side translation.
    Zero external dependencies on client mobile devices.
    Supports Frontier AI (Gemini 2.5 Flash), Google Neural Translate, and deep-translator.
    """
    try:
        body = await req.json()
        text = body.get("text", "")
        source_lang = body.get("source_lang", "auto")
        target_lang = body.get("target_lang", "ka")
        api_key = body.get("api_key") or req.headers.get("x-goog-api-key")
        result = translate_text(text, source_lang=source_lang, target_lang=target_lang, api_key=api_key)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transcribe")
async def transcribe_endpoint(
    req: Request,
    file: Optional[UploadFile] = File(None)
):
    """
    High-fidelity human-like transcription for Georgian and English audio.
    Supports multipart file upload or JSON payload with base64 audio.
    """
    try:
        audio_bytes = None
        mime_type = "audio/mp3"
        language = "auto"
        prompt = None
        api_key = req.headers.get("x-goog-api-key")

        if file is not None:
            audio_bytes = await file.read()
            mime_type = file.content_type or "audio/mp3"
            language = req.query_params.get("language", "auto")
            prompt = req.query_params.get("prompt")
            if not api_key:
                api_key = req.query_params.get("api_key")
        else:
            body = await req.json()
            if "audio_base64" in body:
                b64 = body["audio_base64"]
                if "," in b64:
                    header, b64 = b64.split(",", 1)
                    if "audio/" in header:
                        mime_type = header.split(";")[0].split(":")[1]
                audio_bytes = base64.b64decode(b64)
            language = body.get("language", "auto")
            prompt = body.get("prompt")
            if not api_key:
                api_key = body.get("api_key")

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio data provided")

        result = transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            language=language,
            prompt=prompt,
            api_key=api_key
        )
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ocr")
async def ocr_endpoint(req: Request):
    """
    Direct neural OCR endpoint for printed book photos and camera frames.
    Integrates Gemini 2.5 Flash Vision with Georgian Mkhedruli morphology restoration
    and active rule pack repairs.
    """
    try:
        body = await req.json()
        image_str = body.get("image") or body.get("image_base64")
        if not image_str:
            raise HTTPException(status_code=400, detail="Missing image data")

        mime_type = "image/jpeg"
        if image_str.startswith("data:"):
            header, b64_data = image_str.split(",", 1)
            if ";" in header and ":" in header:
                mime_type = header.split(";")[0].split(":")[1]
            image_bytes = base64.b64decode(b64_data)
        else:
            image_bytes = base64.b64decode(image_str)

        lang = body.get("lang") or body.get("language") or "kat"
        hint = body.get("hint")
        api_key = (
            req.headers.get("x-gemini-key")
            or req.headers.get("x-goog-api-key")
            or body.get("api_key")
        )

        result = transcribe_image_bytes(
            image_bytes=image_bytes,
            mime_type=mime_type,
            language=lang,
            hint=hint,
            api_key=api_key
        )
        if not result.get("success", False) and not result.get("text"):
            return JSONResponse(result, status_code=400)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/server-burst-fuse")
async def server_burst_fuse(req: Request):
    """
    Receives multi-frame burst shots, scores their edge sharpness,
    picks the winning frame with zero motion blur, applies homomorphic shadow flattening,
    adaptive super-resolution upscaling, and 2-pass Laplacian unsharp masking.
    """
    try:
        body = await req.json()
        frames_b64 = body.get("frames", [])
        if not frames_b64:
            raise HTTPException(status_code=400, detail="No frames provided")

        frame_bytes_list = []
        for f in frames_b64:
            if "," in f:
                f = f.split(",", 1)[1]
            frame_bytes_list.append(base64.b64decode(f))

        winner_idx, winner_img, winner_score = select_best_burst_frame(frame_bytes_list)
        enhanced_img = enhance_page_image(winner_img)
        jpeg_bytes = image_to_jpeg_bytes(enhanced_img)
        out_b64 = "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode("ascii")

        return {
            "winner_index": winner_idx,
            "sharpness": round(winner_score, 1),
            "width": enhanced_img.width,
            "height": enhanced_img.height,
            "dataUrl": out_b64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/supabase/status")
async def supabase_status():
    """Returns health status of the external Supabase project."""
    return check_supabase_health()

@app.post("/api/supabase/admin-session")
async def supabase_admin_session():
    """Generates an authentic Supabase Auth session for the admin using the Secret Key."""
    try:
        session = get_admin_session()
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/supabase/books")
async def supabase_books():
    """Fetches user books directly from Supabase Postgres."""
    try:
        return fetch_supabase_books()
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

# ── Autonomous Training API for External LLMs ─────────────────────────────────
def _extract_training_key(req: Request, body: dict) -> str:
    return (
        req.headers.get("X-Training-Key") or
        req.headers.get("Authorization", "").replace("Bearer ", "").strip() or
        body.get("key") or
        ""
    )

@app.get("/api/public/train/guide")
@app.get("/api/train/guide")
async def training_guide(format: str = "markdown"):
    """
    Returns full architectural documentation and instructions for external LLMs
    to train the EngBot Georgian & English engine effectively.
    Supports ?format=markdown (default) or ?format=json.
    """
    if format.lower() == "json":
        return get_training_guide_json()
    return Response(
        content=ENGINE_ARCHITECTURE_AND_TRAINING_GUIDE_MD,
        media_type="text/markdown; charset=utf-8"
    )

@app.get("/api/public/train/health")
@app.get("/api/train/health")
async def training_health():
    """Health check for the autonomous Training API."""
    pack = load_active_pack("ka")
    cases = load_benchmark_cases("ka")
    eval_res = evaluate_pack(pack.get("items", []), cases)
    return {
        "status": "healthy",
        "service": "EngBot Autonomous Training Engine",
        "active_pack": {
            "version": pack.get("version", 1),
            "items_count": len(pack.get("items", [])),
            "score": eval_res["score"]
        },
        "benchmark": {
            "total_cases": len(cases),
            "exact_matches": eval_res["passed"]
        },
        "supported_item_types": ["glossary", "autofix", "qa_rule", "prompt_block", "ocr_fix"],
        "default_dev_key": DEFAULT_DEV_KEY,
        "guide_url": "/api/public/train/guide",
        "guide_summary": (
            "Access GET /api/public/train/guide for full architectural documentation, "
            "corpora information (Sun Tzu, Marcus Aurelius, Homer, Plato, Shakespeare, Georgian Pro), "
            "and instructions for external LLMs to train the engine safely and effectively."
        )
    }

@app.post("/api/public/train/session")
@app.post("/api/train/session")
async def training_session(req: Request):
    """Open an authenticated training session for an external LLM."""
    try:
        body = await req.json()
    except Exception:
        body = {}
    raw_key = _extract_training_key(req, body)
    key_info = verify_key(raw_key)
    if not key_info:
        raise HTTPException(status_code=401, detail="Invalid, missing, or revoked training key.")
    
    model = body.get("model")
    return open_training_session(key_info, model=model)

@app.post("/api/public/train/context")
@app.post("/api/train/context")
async def training_context(req: Request):
    """Inspect active rule pack and failing benchmark cases."""
    try:
        body = await req.json()
    except Exception:
        body = {}
    raw_key = _extract_training_key(req, body)
    key_info = verify_key(raw_key)
    if not key_info:
        raise HTTPException(status_code=401, detail="Invalid, missing, or revoked training key.")
    
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    return get_training_context(session_id, key_info)

@app.post("/api/public/train/propose")
@app.post("/api/train/propose")
async def training_propose(req: Request):
    """Propose candidate rule items. Server runs benchmark immediately."""
    try:
        body = await req.json()
    except Exception:
        body = {}
    raw_key = _extract_training_key(req, body)
    key_info = verify_key(raw_key)
    if not key_info:
        raise HTTPException(status_code=401, detail="Invalid, missing, or revoked training key.")
    
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    items = body.get("items", [])
    model = body.get("model")
    note = body.get("note")
    
    return propose_training_rules(session_id, key_info, items, model=model, note=note)

@app.post("/api/public/train/finish")
@app.post("/api/train/finish")
async def training_finish(req: Request):
    """Close the training session and record final aggregate metrics."""
    try:
        body = await req.json()
    except Exception:
        body = {}
    raw_key = _extract_training_key(req, body)
    key_info = verify_key(raw_key)
    if not key_info:
        raise HTTPException(status_code=401, detail="Invalid, missing, or revoked training key.")
    
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    summary = body.get("summary")
    return finish_training_session(session_id, key_info, summary=summary)


@app.post("/api/public/train/key/generate")
@app.post("/api/train/key/generate")
async def training_key_generate(req: Request):
    """Generate a new autonomous training key for LLMs and register in server storage."""
    try:
        body = await req.json()
    except Exception:
        body = {}
    label = body.get("label") or "Generated Autonomous Training Key"
    lang = body.get("language") or "ka"
    scope = body.get("scope") or "both"
    key_data = generate_new_training_key(label=label, language=lang, scope=scope)
    return {
        "status": "success",
        "key": key_data["key"],
        "key_prefix": key_data["key_prefix"],
        "label": key_data["label"],
        "language": key_data["language"],
        "created_at": key_data["created_at"],
        "instructions_url": "/api/public/train/guide"
    }

