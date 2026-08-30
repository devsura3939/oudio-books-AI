import re
import uuid
from typing import List, Dict, Tuple, Optional, Any
from pathlib import Path
from pypdf import PdfReader

from app.models import Chapter, BookData

CHAPTER_PATTERNS = [
    re.compile(r'^\s*(chapter\s+(?:[0-9]+|[ivxlcdm]+))\s*[:.\-–—]?\s*(.*)$', re.IGNORECASE),
    re.compile(r'^\s*(part\s+(?:[0-9]+|[ivxlcdm]+))\s*[:.\-–—]?\s*(.*)$', re.IGNORECASE),
    re.compile(r'^\s*(book\s+(?:[0-9]+|[ivxlcdm]+))\s*[:.\-–—]?\s*(.*)$', re.IGNORECASE),
    re.compile(r'^\s*(act\s+(?:[0-9]+|[ivxlcdm]+))\s*[:.\-–—]?\s*(.*)$', re.IGNORECASE),
    re.compile(r'^\s*(prologue|epilogue|introduction|preface|foreword|conclusion|afterword)\b\s*[:.\-–—]?\s*(.*)$', re.IGNORECASE),
]

PAGE_NUMBER_PATTERN = re.compile(r'^\s*(?:page\s+)?(?:\d+|[ivxlcdm]+)(?:\s+of\s+\d+)?\s*$', re.IGNORECASE)
HYPHENATED_LINE_BREAK = re.compile(r'(\b\w+)-\n(\w+\b)')

def clean_page_text(text: str) -> str:
    """Clean common PDF extraction artifacts from a single page's text."""
    if not text:
        return ""
    
    text = HYPHENATED_LINE_BREAK.sub(r'\1\2', text)
    lines = text.splitlines()
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
        
        if PAGE_NUMBER_PATTERN.match(stripped):
            continue
            
        cleaned_line = re.sub(r'[ \t]+', ' ', stripped)
        cleaned_lines.append(cleaned_line)
    
    result = "\n".join(cleaned_lines)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()

def _extract_outline_items(reader: PdfReader, outline: Any) -> List[Tuple[str, int]]:
    """Flatten and resolve pypdf outline / bookmarks hierarchy into (title, page_number)."""
    items = []
    if not outline:
        return items
        
    for item in outline:
        if isinstance(item, list):
            items.extend(_extract_outline_items(reader, item))
        else:
            try:
                title = str(getattr(item, 'title', '')).strip()
                if title:
                    pno = reader.get_destination_page_number(item)
                    if pno is not None:
                        items.append((title, pno + 1))
            except Exception:
                pass
    return items

def extract_pdf_data(pdf_path: Path) -> BookData:
    """Extract chapters, metadata, and clean text from PDF using pypdf."""
    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    
    meta = reader.metadata or {}
    title = meta.get("/Title") or meta.get("title") or pdf_path.stem.replace("_", " ").replace("-", " ").title()
    author = meta.get("/Author") or meta.get("author") or "Unknown Author"
    
    page_texts: List[str] = []
    for page in reader.pages:
        try:
            raw_text = page.extract_text() or ""
            page_texts.append(clean_page_text(raw_text))
        except Exception:
            page_texts.append("")
            
    chapters: List[Chapter] = []
    
    # 1. Try Document Bookmarks / Outline
    try:
        raw_outline = reader.outline
        flat_outline = _extract_outline_items(reader, raw_outline)
        
        valid_outline = []
        for o_title, o_page in flat_outline:
            if 1 <= o_page <= total_pages and o_title:
                valid_outline.append((o_title, o_page))
                
        valid_outline.sort(key=lambda x: x[1])
        
        if valid_outline:
            for i, (chap_title, start_page) in enumerate(valid_outline):
                end_page = valid_outline[i + 1][1] - 1 if i + 1 < len(valid_outline) else total_pages
                if end_page < start_page:
                    end_page = start_page
                
                chap_texts = []
                for pno in range(start_page - 1, min(end_page, total_pages)):
                    if pno < len(page_texts) and page_texts[pno]:
                        chap_texts.append(page_texts[pno])
                
                full_chap_text = "\n\n".join(chap_texts).strip()
                words = len(full_chap_text.split())
                est_duration = (words / 150.0) * 60.0
                
                chapters.append(Chapter(
                    id=i + 1,
                    title=chap_title,
                    start_page=start_page,
                    end_page=end_page,
                    text=full_chap_text,
                    word_count=words,
                    estimated_duration_sec=round(est_duration, 1),
                    status="idle"
                ))
    except Exception as e:
        print(f"Error parsing PDF outline: {e}")
    
    # 2. If no valid chapters from outline, use regex pattern matching across page text
    if not chapters or all(c.word_count == 0 for c in chapters):
        chapters = []
        found_headings = []
        
        for pno, p_text in enumerate(page_texts):
            lines = p_text.splitlines()
            for line in lines[:8]:
                s = line.strip()
                for pat in CHAPTER_PATTERNS:
                    m = pat.match(s)
                    if m:
                        found_headings.append((s, pno + 1))
                        break
                if found_headings and found_headings[-1][1] == pno + 1:
                    break
        
        if found_headings:
            for i, (chap_title, start_page) in enumerate(found_headings):
                end_page = found_headings[i + 1][1] - 1 if i + 1 < len(found_headings) else total_pages
                if end_page < start_page:
                    end_page = start_page
                
                chap_texts = []
                for pno in range(start_page - 1, min(end_page, total_pages)):
                    if pno < len(page_texts) and page_texts[pno]:
                        chap_texts.append(page_texts[pno])
                
                full_chap_text = "\n\n".join(chap_texts).strip()
                words = len(full_chap_text.split())
                est_duration = (words / 150.0) * 60.0
                
                chapters.append(Chapter(
                    id=i + 1,
                    title=chap_title,
                    start_page=start_page,
                    end_page=end_page,
                    text=full_chap_text,
                    word_count=words,
                    estimated_duration_sec=round(est_duration, 1),
                    status="idle"
                ))
    
    # 3. Fallback or subdivide large single chapters (max 2,000 words per chapter)
    if not chapters:
        chunk_size = 5 if total_pages > 10 else 2
        chap_id = 1
        for start_p in range(1, total_pages + 1, chunk_size):
            end_p = min(start_p + chunk_size - 1, total_pages)
            chap_texts = []
            for pno in range(start_p - 1, end_p):
                if pno < len(page_texts) and page_texts[pno]:
                    chap_texts.append(page_texts[pno])
            
            full_chap_text = "\n\n".join(chap_texts).strip()
            words = len(full_chap_text.split())
            est_duration = (words / 150.0) * 60.0
            
            title_label = f"Section {chap_id} (Pages {start_p}-{end_p})" if start_p != end_p else f"Section {chap_id} (Page {start_p})"
            chapters.append(Chapter(
                id=chap_id,
                title=title_label,
                start_page=start_p,
                end_page=end_p,
                text=full_chap_text,
                word_count=words,
                estimated_duration_sec=round(est_duration, 1),
                status="idle"
            ))
            chap_id += 1
    else:
        # Subdivide oversized chapters (>2,500 words) into clean digestible parts
        refined: List[Chapter] = []
        new_id = 1
        for c in chapters:
            words = c.text.split()
            if len(words) > 2500:
                chunk_len = 1800
                part_no = 1
                for w_idx in range(0, len(words), chunk_len):
                    w_chunk = words[w_idx:w_idx + chunk_len]
                    chunk_text = " ".join(w_chunk)
                    dur = (len(w_chunk) / 150.0) * 60.0
                    refined.append(Chapter(
                        id=new_id,
                        title=f"{c.title} - Part {part_no}",
                        start_page=c.start_page,
                        end_page=c.end_page,
                        text=chunk_text,
                        word_count=len(w_chunk),
                        estimated_duration_sec=round(dur, 1),
                        status="idle"
                    ))
                    new_id += 1
                    part_no += 1
            else:
                c.id = new_id
                refined.append(c)
                new_id += 1
        chapters = refined
            
    total_words = sum(c.word_count for c in chapters)
    est_total_duration = sum(c.estimated_duration_sec for c in chapters)
    book_id = str(uuid.uuid4())[:8]
    
    return BookData(
        id=book_id,
        filename=pdf_path.name,
        title=str(title),
        author=str(author),
        total_pages=total_pages,
        total_words=total_words,
        estimated_total_duration_sec=round(est_total_duration, 1),
        chapters=chapters
    )
