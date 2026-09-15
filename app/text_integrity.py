"""Source-preserving primitives shared by transcription and narration."""
import re
import unicodedata
from itertools import groupby


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


def transliteration_leak(source, candidate):
    pairs = {"the": ["თე", "თუ"], "of": ["ოფ", "ოვ"], "to": ["ტო"], "in": ["ინ"], "and": ["ანდ"],
             "was": ["ვას", "ვაზ", "ვოს"], "were": ["ვერე"], "with": ["ვით"], "her": ["ჰერ"], "by": ["ბი", "ბაი"],
             "on": ["ონ"], "from": ["ფრომ"], "this": ["თის"], "that": ["თათ"], "is": ["ის"], "it": ["იტ"]}
    src = re.findall(r"[a-z]+", source.lower())
    out = re.findall(r"[ა-ჰ]+", candidate.lower())
    counts = [min(src.count(word), sum(out.count(v) for v in variants)) for word, variants in pairs.items()]
    return sum(n > 0 for n in counts) >= 3 and sum(counts) >= 4 and sum(counts) / max(1, len(out)) >= 0.16


def translation_is_valid(source, candidate, target):
    """Reject obvious incomplete/wrong-script results, not a semantic quality score."""
    if not isinstance(candidate, str) or not candidate.strip():
        return False
    if re.search(r"```|</?(?:think|tool_call)\b", candidate, re.I):
        return False
    source, candidate = source.strip(), candidate.strip()
    if target == "ka" and detect_language(source) == "en" and transliteration_leak(source, candidate):
        return False
    def longest_run(text):
        return max((sum(1 for _ in group) for _, group in groupby(re.findall(r"[^\W\d_]+", text.lower()))), default=0)
    if longest_run(candidate) >= 4 and longest_run(candidate) > longest_run(source):
        return False
    names = [unicodedata.name(c, "") for c in candidate if c.isalpha()]
    if not names:
        return candidate == source and not any(c.isalpha() for c in source)
    script = "GEORGIAN" if target == "ka" else "LATIN"
    target_count = sum(script in name for name in names)
    target_ratio = target_count / len(names)
    if target_ratio < 0.6 and target_count > 0:
        src_words = set(re.findall(r"[^\W\d_]+", source.lower()))
        cand_words = re.findall(r"[^\W\d_]+", candidate.lower())
        preserved = 0
        for w in cand_words:
            stem = re.sub(r"(?:-(?:ის|ით|ად|დან|თან|ზე|ში|ისთვის|მდე|მა|ს)|(?:ის|ით|ად|დან|თან|ზე|ში|ისთვის|მდე|მა|ს))$", "", w)
            if (w in src_words or (stem and stem in src_words)) and not any(unicodedata.name(ch, "").startswith(script) for ch in w):
                preserved += len(w)
            elif w in src_words or (stem and stem in src_words):
                preserved += sum(1 for ch in w if "LATIN" in unicodedata.name(ch, ""))
        non_preserved = max(target_count, len(names) - preserved)
        if non_preserved > 0:
            target_ratio = target_count / non_preserved
    is_imprint = bool(re.search(r"\b(?:printed|bound|published|copyright|edition|london|street|road|lane|house|press|books|company|ltd|inc)\b", source, re.I))
    if target_ratio < 0.6 and not (is_imprint and target_count >= 10):
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
        para_idx = prefix.rfind("\n\n")
        if para_idx != -1 and para_idx + 2 >= limit // 3:
            end = para_idx + 2
        else:
            sent_matches = list(re.finditer(r'(?:[.!?…]+|[.!?…]+[”"’»„])(?=\s|\n|$)', prefix))
            if sent_matches and sent_matches[-1].end() >= limit // 4:
                end = sent_matches[-1].end()
                while end < len(prefix) and prefix[end] in ' \t\r\n':
                    end += 1
            else:
                clause_matches = list(re.finditer(r'[,;:—–-]\s+', prefix))
                if clause_matches and clause_matches[-1].end() >= limit // 4:
                    end = clause_matches[-1].end()
                else:
                    end = max(prefix.rfind("\n\n") + 2, prefix.rfind(" ") + 1)
                    if end < limit // 2:
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
