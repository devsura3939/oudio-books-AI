"""Shared test fixture: build a sample PDF with real extractable text.

Both test_api.py and test_pipeline.py use this so a fresh clone can run
either test without ordering dependencies, and chapter detection exercises
actual extracted text instead of blank pages.
"""
from pathlib import Path

from pypdf import PdfWriter
from pypdf.generic import (
    DecodedStreamObject, DictionaryObject, NameObject,
)

TEST_DIR = Path(__file__).resolve().parent / "data" / "test"
SAMPLE_PDF_PATH = TEST_DIR / "sample_story.pdf"

PAGE_TEXTS = [
    (
        "Chapter 1: The Golden Lighthouse",
        "The salt spray whipped across the rocky cliffs as Julian approached "
        "the towering golden lighthouse. For decades, the beacon had remained "
        "dark, shrouded in seaside folklore. Tonight, a radiant luminescence "
        "pierced the coastal fog, beckoning him forward into the unknown.",
    ),
    (
        "Chapter 2: The Secret Journal",
        "Inside the spiral chamber, an ancient oak desk stood untouched by "
        "time. Resting upon its dusty surface was a leather-bound journal "
        "filled with celestial charts and forgotten coordinates.",
    ),
]


def _make_text_page(writer: PdfWriter, text: str):
    """Add a page whose content stream paints real (extractable) text."""
    page = writer.add_blank_page(width=400, height=600)

    escaped = text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    stream = DecodedStreamObject()
    stream.set_data(f"BT /F1 12 Tf 40 540 Td ({escaped}) Tj ET".encode("latin-1"))
    stream_ref = writer._add_object(stream)

    font = DictionaryObject()
    font[NameObject("/Type")] = NameObject("/Font")
    font[NameObject("/Subtype")] = NameObject("/Type1")
    font[NameObject("/BaseFont")] = NameObject("/Helvetica")
    font_ref = writer._add_object(font)

    resources = DictionaryObject()
    resources[NameObject("/Font")] = DictionaryObject({NameObject("/F1"): font_ref})
    page[NameObject("/Resources")] = resources
    page[NameObject("/Contents")] = stream_ref
    return page


def create_sample_pdf(path: Path = SAMPLE_PDF_PATH) -> Path:
    """Write the sample PDF (outline + real text) and return its path."""
    path.parent.mkdir(parents=True, exist_ok=True)
    writer = PdfWriter()
    for title, body in PAGE_TEXTS:
        page = _make_text_page(writer, body)
        writer.add_outline_item(title, page.indirect_reference)
    with open(path, "wb") as f:
        writer.write(f)
    return path


if __name__ == "__main__":
    p = create_sample_pdf()
    print(f"sample PDF written to {p}")
