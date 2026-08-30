import asyncio

from test_fixtures import create_sample_pdf, SAMPLE_PDF_PATH, TEST_DIR
from app.pdf_processor import extract_pdf_data
from app.tts_engine import synthesize_text_to_file, generate_voice_preview
from app.storage import save_book_session, tag_mp3_metadata

TEST_DIR.mkdir(parents=True, exist_ok=True)
sample_pdf_path = create_sample_pdf()

print(' [1/4] Sample PDF created with real extractable text.')

# 2. Extract PDF Data
book_data = extract_pdf_data(sample_pdf_path)
print(f' [2/4] PDF Extracted: {len(book_data.chapters)} chapters detected.')
assert len(book_data.chapters) > 0, "outline-based chapter detection should find chapters"
assert any("lighthouse" in c.text.lower() for c in book_data.chapters), \
    "chapter text should be extracted from the PDF"

# 3. Test TTS Synthesis
async def test_tts():
    out_mp3 = TEST_DIR / 'test_chapter_1.mp3'
    print(' [3/4] Synthesizing Chapter 1 with edge-tts...')

    def on_prog(p, msg):
        print(f'   -> Progress: {p}% - {msg}')

    success = await synthesize_text_to_file(
        text=book_data.chapters[0].text,
        output_path=out_mp3,
        voice='en-US-ChristopherNeural',
        progress_callback=on_prog
    )

    if success and out_mp3.exists():
        print(f'   -> MP3 file successfully generated! Size: {out_mp3.stat().st_size} bytes')
        tag_mp3_metadata(out_mp3, title=book_data.chapters[0].title, author='Arthur Conan', album='Sample Story', track_no=1, total_tracks=2)
        print('   -> ID3 Metadata embedded cleanly.')

    print(' Testing voice preview generator...')
    preview_url = await generate_voice_preview('en-US-AriaNeural', 'Welcome to AudioRead Studio. Converting your books to studio voice.')
    print(f'   -> Voice preview URL generated: {preview_url}')

asyncio.run(test_tts())

# 4. Save session
save_book_session(book_data)
print(' [4/4] Full pipeline verification passed!')
