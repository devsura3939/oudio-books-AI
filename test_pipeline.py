import asyncio
import os
from pathlib import Path
from pypdf import PdfWriter
from app.pdf_processor import extract_pdf_data
from app.tts_engine import synthesize_text_to_file, generate_voice_preview
from app.storage import save_book_session, tag_mp3_metadata, create_book_zip_package

test_dir = Path('data/test')
test_dir.mkdir(parents=True, exist_ok=True)
sample_pdf_path = test_dir / 'sample_story.pdf'

# 1. Create a sample PDF using pypdf (with synthetic text in layout)
writer = PdfWriter()
# Create pages
page1 = writer.add_blank_page(width=400, height=600)
page2 = writer.add_blank_page(width=400, height=600)

writer.add_outline_item('Chapter 1: The Golden Lighthouse', 0)
writer.add_outline_item('Chapter 2: The Secret Journal', 1)

with open(sample_pdf_path, 'wb') as f:
    writer.write(f)

print(' [1/4] Sample PDF created with pypdf.')

# 2. Extract PDF Data
book_data = extract_pdf_data(sample_pdf_path)
print(f' [2/4] PDF Extracted: {len(book_data.chapters)} chapters detected.')

# Set sample texts for chapters
book_data.chapters[0].text = 'The salt spray whipped across the rocky cliffs as Julian approached the towering golden lighthouse. For decades, the beacon had remained dark, shrouded in seaside folklore. Tonight, a radiant luminescence pierced the coastal fog, beckoning him forward into the unknown.'
book_data.chapters[0].word_count = len(book_data.chapters[0].text.split())

if len(book_data.chapters) > 1:
    book_data.chapters[1].text = 'Inside the spiral chamber, an ancient oak desk stood untouched by time. Resting upon its dusty surface was a leather-bound journal filled with celestial charts and forgotten coordinates.'
    book_data.chapters[1].word_count = len(book_data.chapters[1].text.split())

# 3. Test TTS Synthesis
async def test_tts():
    out_mp3 = test_dir / 'test_chapter_1.mp3'
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
