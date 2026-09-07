"""Source-preserving primitives shared by transcription and narration."""
import re
import unicodedata


def normalize_language(value):
    code = re.split(r"[-_]", str(value or "auto").lower())[0]
    return "ka" if code in ("ka", "kat", "geo", "georgian") else "en" if code in ("en", "eng", "english") else "auto"


def detect_language(text):
    names = [unicodedata.name(c, "") for c in text if c.isalpha()]
    ka = sum("GEORGIAN" in n for n in names)
    en = sum("LATIN" in n for n in names)
    return "ka" if ka > en else "en" if en else "auto"


def clean_verbatim(text):
    return text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "").strip()


def translation_is_valid(source, candidate, target):
    """Reject obvious incomplete/wrong-script results, not a semantic quality score."""
    if not isinstance(candidate, str) or not candidate.strip():
        return False
    if re.search(r"```|</?(?:think|tool_call)\b", candidate, re.I):
        return False
    source, candidate = source.strip(), candidate.strip()
    names = [unicodedata.name(c, "") for c in candidate if c.isalpha()]
    if not names:
        return candidate == source and not any(c.isalpha() for c in source)
    script = "GEORGIAN" if target == "ka" else "LATIN"
    if sum(script in name for name in names) / len(names) < 0.6:
        return False
    if len(source) >= 30 and not 0.35 <= len(candidate) / len(source) <= 2.8:
        return False
    return candidate != source or detect_language(source) == target


def split_bounded(text, limit):
    """Exact partitions with a hard cap, including unbroken OCR strings."""
    if not isinstance(limit, int) or limit < 1:
        raise ValueError("Chunk limit must be a positive integer")
    chunks = []
    while len(text) > limit:
        prefix = text[:limit]
        end = max(prefix.rfind("\n\n") + 2, prefix.rfind(" ") + 1)
        if end < limit / 2:
            end = limit
        chunks.append(text[:end])
        text = text[end:]
    if text:
        chunks.append(text)
    return chunks


def vision_prompt(language="auto", hint=None):
    lang = normalize_language(language)
    target = {"ka": "Georgian", "en": "English", "auto": "Detect the printed language; do not assume Georgian or English"}[lang]
    return (
        f"Transcribe the visible page verbatim. Language: {target}. "
        "Preserve wording, names, numbers, punctuation, mathematical operators, paragraph order, "
        "Georgian Mkhedruli, Mtavruli capitals, and historical letters exactly as printed. "
        "Do not translate, paraphrase, modernize spelling, or fill gaps from literary context. "
        "Mark unreadable spans as [[UNCLEAR]]; do not guess missing words. "
        "Return only plain text, or [[NO_TEXT]] if there is no text. "
        + (f"Context hints (not evidence for missing words): {hint}" if hint else "")
    )
