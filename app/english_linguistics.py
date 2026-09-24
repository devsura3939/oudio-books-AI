# -*- coding: utf-8 -*-
"""
Publication-grade English linguistic engine and neural text reconstruction.
Provides:
- High-accuracy English OCR repair (ligatures, letter confusions, hyphenation)
- English contraction and punctuation normalization
- Spaced-out heading and chapter title reconstruction
- Integration with server-side small local models (Ollama/LM Studio: llama3.2, qwen2.5, phi3.5)
- Fallback-safe verbatim cleaning
"""
import os
import re
from typing import Dict, Any, Optional

# Frequent English words to guide OCR stem and confusion validation
COMMON_ENGLISH_WORDS = {
    "the", "be", "is", "was", "are", "were", "been", "to", "of", "and", "a", "in", "that", "have", "has", "had", "i", "it", "for", "not", "on", "with",
    "he", "as", "you", "do", "does", "did", "at", "this", "but", "his", "by", "from", "they", "we", "say", "said", "her",
    "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
    "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
    "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
    "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
    "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most", "us", "chapter", "part",
    "book", "prologue", "epilogue", "introduction", "preface", "contents", "modern", "burn", "from",
    "clear", "close", "while", "where", "thought", "through", "before", "should", "between", "under",
    "never", "always", "something", "nothing", "everything", "himself", "herself", "themselves",
    "little", "great", "world", "again", "still", "night", "water", "head", "hand", "eyes", "life",
    "end", "story", "man", "woman", "place", "found", "long", "began", "told", "asked", "knew", "text", "paragraph"
}

# Spaced-out heading tokens in print books: e.g. "C H A P T E R" -> "CHAPTER"
SPACED_HEADINGS = [
    "CHAPTER", "PART", "BOOK", "PROLOGUE", "EPILOGUE", "PREFACE",
    "FOREWORD", "INTRODUCTION", "CONTENTS", "CONCLUSION", "AFTERWORD",
    "APPENDIX", "DEDICATION", "ACKNOWLEDGEMENTS", "ACKNOWLEDGMENT", "THE END",
    "VOLUME", "SECTION",
    "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN", "TWENTY",
    "FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH"
]

# Character confusions in English OCR
ENGLISH_OCR_CONFUSIONS = [
    # rn -> m in known patterns
    (re.compile(r'\bbum\b', re.IGNORECASE), 'burn'),
    (re.compile(r'\bbuming\b', re.IGNORECASE), 'burning'),
    (re.compile(r'\bbumed\b', re.IGNORECASE), 'burned'),
    (re.compile(r'\bmodem\b', re.IGNORECASE), 'modern'),
    (re.compile(r'\bcom\b(?=\s+(?:cob|flakes|field|crop|bread))', re.IGNORECASE), 'corn'),
    (re.compile(r'\bfom\b', re.IGNORECASE), 'from'),
    (re.compile(r'\btum\b', re.IGNORECASE), 'turn'),
    (re.compile(r'\btumed\b', re.IGNORECASE), 'turned'),
    (re.compile(r'\btuming\b', re.IGNORECASE), 'turning'),
    (re.compile(r'\bmoming\b', re.IGNORECASE), 'morning'),
    # cl -> d
    (re.compile(r'\bdear\b(?=\s+(?:sky|water|view|glass|day|blue))', re.IGNORECASE), 'clear'),
    (re.compile(r'\bdosely\b', re.IGNORECASE), 'closely'),
    # vv -> w
    (re.compile(r'\bvv(\w+)', re.IGNORECASE), r'w\1'),
    (re.compile(r'(\w+)vv\b', re.IGNORECASE), r'\1w'),
    (re.compile(r'\bvvith\b', re.IGNORECASE), 'with'),
    (re.compile(r'\bvvas\b', re.IGNORECASE), 'was'),
    (re.compile(r'\bvvere\b', re.IGNORECASE), 'were'),
    (re.compile(r'\bvvell\b', re.IGNORECASE), 'well'),
    (re.compile(r'\bvvh(\w+)', re.IGNORECASE), r'wh\1'),
]


def fix_english_ligatures(text: str) -> str:
    """Expands standard typographical print ligatures and broken ligature representations."""
    if not text:
        return ""
    text = (text
        .replace("\uFB00", "ff")
        .replace("\uFB01", "fi")
        .replace("\uFB02", "fl")
        .replace("\uFB03", "ffi")
        .replace("\uFB04", "ffl")
        .replace("\uFB05", "ft")
        .replace("\uFB06", "st")
        .replace("ﬁ", "fi")
        .replace("ﬂ", "fl")
        .replace("ﬀ", "ff")
        .replace("ﬃ", "ffi")
        .replace("ﬄ", "ffl")
    )
    return text


def reconstruct_spaced_headings(text: str) -> str:
    """Rejoins spaced-out capital letters in headings (e.g., 'C H A P T E R' -> 'CHAPTER')."""
    if not text:
        return ""
    res = text
    for word in SPACED_HEADINGS:
        spaced_pat = r'(?<![A-Za-z])' + r'\s+'.join(list(word)) + r'(?![A-Za-z])'
        res = re.sub(spaced_pat, word, res, flags=re.IGNORECASE)
    res = re.sub(r'([A-Z]+)\s{2,}([A-Z]+)', r'\1 \2', res)
    return res


def repair_english_contractions(text: str) -> str:
    """Repairs English contractions separated by spaces or dropped apostrophes."""
    if not text:
        return ""
    t = text
    # Missing/spaced apostrophes: don t -> don't, it s -> it's
    contractions = [
        (r'\b([Dd]on|[Dd]oesn|[Dd]idn|[Ww]ouldn|[Cc]ouldn|[Ss]houldn|[Ww]asn|[Ww]eren|[Hh]asn|[Hh]aven|[Hh]adn|[Ww]on|[Cc]an|[Ii]sn|[Aa]ren)\s*[\'’`]?\s*t\b', r"\1't"),
        (r'\b([Ii]t|[Tt]hat|[Tt]here|[Ww]hat|[Hh]e|[Ss]he|[Hh]ow|[Ww]ho)\s*[\'’`]?\s*s\b', r"\1's"),
        (r'\b([Ii]|[Yy]ou|[Ww]e|[Tt]hey)\s*[\'’`]?\s*ve\b', r"\1've"),
        (r'\b([Ii]|[Yy]ou|[Hh]e|[Ss]he|[Ww]e|[Tt]hey)\s*[\'’`]?\s*ll\b', r"\1'll"),
        (r'\b([Ii]|[Yy]ou|[Hh]e|[Ss]he|[Ww]e|[Tt]hey)\s*[\'’`]?\s*d\b', r"\1'd"),
        (r'\b([Yy]ou|[Ww]e|[Tt]hey)\s*[\'’`]?\s*re\b', r"\1're"),
        (r'\b([Ii])\s*[\'’`]?\s*m\b', r"I'm"),
        (r'\blet\s*[\'’`]?\s*s\b', "let's"),
        (r'\bLet\s*[\'’`]?\s*s\b', "Let's"),
        (r'\bo\s*[\'’`]?\s*clock\b', "o'clock"),
        (r'\bO\s*[\'’`]?\s*clock\b', "O'clock"),
    ]
    for pat, repl in contractions:
        t = re.sub(pat, repl, t)

    # Isolated 'l' acting as pronoun 'I'
    t = re.sub(r'(^|\s)l(?=\s+(?:am|was|will|have|had|would|could|should|think|know|said|saw|felt|went|did)\b)', r'\1I', t)
    return t


def clean_english_ocr(text: str) -> str:
    """
    Applies comprehensive publication-grade OCR repair on English text:
    - Removes math symbols/scanner noise
    - Resolves 0/O and 1/l confusions inside alphabetic words
    - Normalizes punctuation, quotes, and em dashes
    - Reconnects hyphenated word wraps
    """
    if not text or not text.strip():
        return ""

    t = fix_english_ligatures(text)
    t = reconstruct_spaced_headings(t)

    # Strip repeated scanner loops (IIII, =====, -----, _____)
    t = re.sub(r'([A-Za-z0-9=+_\-|])\1{4,}', ' ', t)
    t = re.sub(r'(?:^|\s)[=+|/_#%*~<>]{1,3}(?=\s|$)', ' ', t)

    # Rejoin soft-hyphenated line breaks (word- \n word -> wordword or compound)
    compound_prefixes = {"self", "well", "cross", "state", "half", "co", "pre", "post", "non", "multi", "twenty", "thirty", "forty", "fifty"}
    def _join_hyphen(m):
        before, after = m.group(1), m.group(2)
        if before.lower() in compound_prefixes or after.lower() in {"year", "old", "known", "conscious", "made", "like"}:
            return f"{before}-{after}"
        return f"{before}{after}"

    t = re.sub(r'([A-Za-z]+)[-\u2010\u2011]\s*[\r\n]+\s*([A-Za-z]+)', _join_hyphen, t)

    # Normalize quotes and dashes
    t = t.replace('``', '"').replace("''", '"')
    t = re.sub(r'(^|\s)[-–—]{2,}(\s|$)', r'\1—\2', t)
    t = re.sub(r'(?<=\w)--(?=\w)', '—', t)

    # Digits mixed inside letters (e.g. Th1s -> This, Eng1ish -> English, b00k -> book)
    def _fix_digit_in_word(match):
        w = match.group(0)
        chars = list(w)
        vowels = set("aeiouyAEIOUY")
        for idx, ch in enumerate(chars):
            if ch == '0':
                chars[idx] = 'O' if idx == 0 and w[1:].islower() else 'o'
            elif ch == '1':
                prev_ch = chars[idx - 1] if idx > 0 else ''
                next_ch = chars[idx + 1] if idx < len(chars) - 1 else ''
                if prev_ch and prev_ch not in vowels and next_ch in vowels:
                    chars[idx] = 'l'
                else:
                    chars[idx] = 'I' if idx == 0 else 'i'
            elif ch == '5':
                chars[idx] = 'S' if idx == 0 else 's'
        return "".join(chars)

    t = re.sub(r'\b(?=[A-Za-z]*[0-9])(?=[0-9]*[A-Za-z])[A-Za-z0-9]{2,}\b', _fix_digit_in_word, t)

    # Vertical bar | between letters:
    # cl|ear -> clear (bar artifact after cl)
    t = re.sub(r'(?<![a-z])cl\|', 'cl', t, flags=re.IGNORECASE)
    t = re.sub(r'c\|(?=[aeiou])', 'cl', t, flags=re.IGNORECASE)
    t = re.sub(r'([A-Za-z])\|([A-Za-z])', r'\1l\2', t)
    t = re.sub(r'\bcll(?=ear|ose|ean|ever|oth|oud|imb)', 'cl', t, flags=re.IGNORECASE)

    # Apply contraction and punctuation repairs
    t = repair_english_contractions(t)

    for pat, repl in ENGLISH_OCR_CONFUSIONS:
        t = pat.sub(repl, t)

    # Spacing around punctuation
    t = re.sub(r'\s+([,.;:!?])', r'\1', t)
    t = re.sub(r'([,.;:!?])(?=[A-Za-z])', r'\1 ', t)
    t = re.sub(r'[ \t]{2,}', ' ', t)

    return t.strip()


def score_english_text(text: str) -> float:
    """
    Evaluates the quality of extracted English text (0.0 to 1.0).
    Accounts for short book elements like epigraphs, part headers, and dedications.
    """
    if not text or not text.strip():
        return 0.0

    t = text.strip()
    words = re.findall(r'\b[A-Za-z]+\b', t)
    if not words:
        return 0.05

    # Short clean heading check (e.g. "Chapter 1", "Part Three", "The Sirens of Titan")
    if len(words) <= 6:
        clean_heading = bool(re.match(r'^(?:chapter|part|book|section|act|the\s+end|epilogue|prologue)\b', t, re.IGNORECASE))
        has_common = any(w.lower() in COMMON_ENGLISH_WORDS for w in words)
        no_junk = not bool(re.search(r'[^\w\s.,;:!?\'"–—\-\(\)]', t))
        if (clean_heading or has_common) and no_junk:
            return 0.95

    # Proportion of Latin letters
    total_chars = len(re.findall(r'\S', t))
    latin_chars = len(re.findall(r'[A-Za-z0-9.,;:!?\'"–—\-\(\)]', t))
    ratio = latin_chars / max(1, total_chars)

    # Proportion of recognized vocabulary
    vocab_hits = sum(1 for w in words if w.lower() in COMMON_ENGLISH_WORDS)
    vocab_ratio = vocab_hits / max(1, len(words))

    # Single-letter word penalty (except 'a', 'I', 's')
    single_letters = sum(1 for w in words if len(w) == 1 and w.lower() not in {'a', 'i', 's'})
    single_ratio = single_letters / max(1, len(words))

    score = (ratio * 0.5) + (vocab_ratio * 0.4) + min(0.1, len(words) / 100)
    if single_ratio > 0.15:
        score *= max(0.1, 1.0 - (single_ratio - 0.15) * 4.0)

    return max(0.0, min(1.0, score))


def refine_english_with_small_model(text: str, task: str = "ocr_repair") -> str:
    """
    Refines English text using a small server-side local model (Ollama or LM Studio).
    Compatible with:
    - llama3.2:1b / llama3.2:3b
    - qwen2.5:1.5b / qwen2.5:3b
    - phi3.5 / mistral
    - Any server-configured local LLM URL.
    Strictly preserves verbatim book content without paraphrasing.
    Falls back gracefully to clean_english_ocr if server model is unreachable.
    """
    if not text or not text.strip():
        return text

    # First apply rule-based clean pass
    cleaned = clean_english_ocr(text)

    # Check if text is already very high quality or very short heading
    if score_english_text(cleaned) >= 0.92 and len(cleaned.split()) > 15:
        return cleaned

    system_prompts = {
        "ocr_repair": (
            "You are a publication-grade English OCR text restoration engine. "
            "Your task is to fix OCR recognition glitches, restore broken words and hyphens, "
            "and fix punctuation in the provided printed book page. "
            "CRITICAL: Output ONLY the verbatim restored text. Do NOT add notes, explanations, or quotes."
        ),
        "page_parse": (
            "You are an expert English book editor and PDF text extractor. "
            "Clean the extracted raw PDF page text: remove stray running header/footer artifacts, "
            "reconnect words split across lines, and output continuous clean prose. "
            "Output ONLY the cleaned text with exact verbatim accuracy."
        )
    }

    sys_prompt = system_prompts.get(task, system_prompts["ocr_repair"])

    # Detect available endpoints: local Ollama or LM Studio
    ollama_url = os.environ.get("ENGLISH_OLLAMA_URL") or os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")
    lm_studio_url = os.environ.get("LM_STUDIO_URL") or os.environ.get("PC_LM_STUDIO_URL")

    candidate_endpoints = []
    if ollama_url:
        candidate_endpoints.append((ollama_url, os.environ.get("ENGLISH_OLLAMA_MODEL", "llama3.2:3b")))
    if lm_studio_url:
        candidate_endpoints.append((lm_studio_url.rstrip("/") + "/v1/chat/completions", "local-model"))

    for url, model_name in candidate_endpoints:
        try:
            import httpx
            resp = httpx.post(
                url,
                json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": text}
                    ],
                    "temperature": 0.0,
                    "max_tokens": min(4096, max(256, len(text) * 2))
                },
                timeout=5.0
            )
            if resp.status_code == 200:
                data = resp.json()
                content = (data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
                if content and len(content) >= len(text) * 0.5:
                    content = re.sub(r"^```(?:[a-z]*\n)?", "", content, flags=re.IGNORECASE)
                    content = re.sub(r"\n?```$", "", content).strip()
                    return clean_english_ocr(content)
        except Exception:
            pass

    return cleaned
