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


def reflow_narrative_paragraphs(text: str) -> str:
    """Reassemble hard-wrapped lines and cross-page sentences into natural flowing paragraphs."""
    if not text or not isinstance(text, str):
        return ""

    clean = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "").strip()
    if not clean:
        return ""

    lines = clean.split("\n")
    paragraphs = []
    cur_para = ""

    heading_pat = re.compile(
        r'^(?:chapter|part|book|section|volume|თავი|ნაწილი|წიგნი)\s+(?:\d+|[ivxlcdm]+|[ა-ჰ]+)\b',
        re.IGNORECASE
    )
    abbrev_pat = re.compile(
        r'\b(?:Mr|Mrs|Ms|Dr|Prof|Gen|Col|Capt|Lt|Sr|Jr|St|Rev|Hon|No|Vol|Ch|pp?|e\.g|i\.e|vs|etc|ე\.ი|ე\.წ|ა\.შ|სხვ)\.$',
        re.IGNORECASE
    )

    for line in lines:
        s = line.strip()
        if not s:
            if cur_para:
                ends_terminal = bool(re.search(r'[.!?…჻]["\'”’»“\])}]?\s*$', cur_para)) and not abbrev_pat.search(cur_para)
                is_dangling = (
                    bool(re.search(r'[,;:—–-]\s*$', cur_para)) or
                    bool(re.search(r'\b(?:the|a|an|and|or|of|to|in|on|at|by|for|with|as|is|was|were|that|this|his|her|its|their|და|თუ|რომ|როგორც|მაგრამ|ხოლო|ან)\s*$', cur_para, re.I))
                )
                if ends_terminal and not is_dangling:
                    paragraphs.append(cur_para)
                    cur_para = ""
            continue

        if cur_para and re.search(r'[\w]-$', cur_para) and re.match(r'^[\w]', s):
            cur_para = cur_para[:-1] + s
            continue

        is_heading = bool(heading_pat.match(s))
        is_dialogue = bool(re.match(r'^[—–\-\u2014\u2013„"“]', s))

        if not cur_para:
            cur_para = s
            continue

        if is_heading or is_dialogue:
            paragraphs.append(cur_para)
            cur_para = s
            continue

        cur_ends_terminal = bool(re.search(r'[.!?…჻]["\'”’»“\])}]?\s*$', cur_para)) and not abbrev_pat.search(cur_para)
        cur_dangling = (
            bool(re.search(r'[,;:—–-]\s*$', cur_para)) or
            bool(re.search(r'\b(?:the|a|an|and|or|of|to|in|on|at|by|for|with|as|is|was|were|that|this|his|her|its|their|და|თუ|რომ|როგორც|მაგრამ|ხოლო|ან)\s*$', cur_para, re.I))
        )
        line_starts_lower = bool(re.match(r'^[a-z\u10D0-\u10FA,;:—–-]', s))

        if not cur_ends_terminal or cur_dangling or line_starts_lower:
            cur_para = cur_para + " " + s
        else:
            cur_para = cur_para + " " + s

    if cur_para:
        paragraphs.append(cur_para)

    return "\n\n".join(paragraphs)


def polish_georgian_literary_syntax(text: str) -> str:
    """Enhance Georgian literary text with strict morphosyntactic and entity preservation:
    - Proper noun and character name protection (Constant -> კონსტანტი, Kazak -> კაზაკი, Rumfoord -> რამფორდი)
    - Adjective stem truncation in oblique cases (უცნობ სივრცეში, დიდ სამყაროში, ახალ წიგნში)
    - Dialogue and typography formatting (— em-dash, clean punctuation)
    """
    if not text or not isinstance(text, str):
        return ""
    t = text

    # 1. Character Name & Literary Entity Protection
    # Malachi Constant (კონსტანტი / კონსტანტმა)
    t = re.sub(r'(?<![\u10A0-\u10FF])მალაქ(?:ჩ)?(?:ი|ის|ს|მა)?\s+მუდმივ([ა-ჰ]*)(?![ა-ჰ])', r'მალაქი კონსტანტ\1', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მისტერ(?:ი)?\s+მუდმივ([ა-ჰ]*)(?![ა-ჰ])', r'მისტერ კონსტანტ\1', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივი\s+Constant-?(?:ის)?', 'კონსტანტის', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივთან(?![ა-ჰ])', 'კონსტანტთან', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივი\s+საქმეების(?![ა-ჰ])', 'კონსტანტის საქმეების', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივად\s+გადასცა(?![ა-ჰ])', 'კონსტანტს გადასცა', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])რა\s+მუდმივ(?:ი)?\s+ჰქონდა(?![ა-ჰ])', 'რა ჰქონდა კონსტანტს', t)

    # Ergative: მუდმივმა -> კონსტანტმა
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივმა(?![ა-ჰ])', 'კონსტანტმა', t)

    # Relative clauses: მუდმივი, რომელიც / რომელმაც / რომლის
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივი,\s*რომელ', 'კონსტანტი, რომელ', t)

    # Nominative/Subject verbs: მუდმივი + action verb
    subject_verbs = (
        r'(?:ჩამოსრიალდა|მოხიბლული|გამოფხიზლდა|გაიქცა|მიჰყვებოდა|უყურებდა|იდგა|გაჩერდა|'
        r'შევიდა|იჯდა|ფიქრობდა|გრძნობდა|დარჩა|ელოდა|გააკეთა|არ\s+მოძრაობდა|არ\s+იყო|'
        r'იყო\s+მამაკაცი|რომელიც|რომელმაც|კვლავ\s+უყურებდა|ჩაძირული|გახდა)'
    )
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივი(\s+' + subject_verbs + r')(?![ა-ჰ])', r'კონსტანტი\1', t)

    # Adverbial mistranslations of Constant: მუდმივად + personal action
    t = re.sub(r'(?<![\u10A0-\u10FF])მუდმივად\s+შეეძლო(?![ა-ჰ])', 'კონსტანტს შეეძლო', t)
    t = re.sub(
        r'(?<![\u10A0-\u10FF])მუდმივად(\s+(?:გაჩერდა|გაიქცა|ჩაეშვა|ჩხრეკავდა|აკეთებდა|აპირებდა))(?![ა-ჰ])',
        r'კონსტანტი\1',
        t
    )

    # Winston Niles Rumfoord (უინსტონ ნაილს რამფორდი)
    t = re.sub(r'(?<![\u10A0-\u10FF])რ(?:უმ|უფ)ფ?[ოაუე]*(?:რ[ოაუე]*|ულ|ორ)?დ-?([ა-ჰ]*)(?![ა-ჰ])', r'რამფორდ\1', t)
    t = re.sub(r'ქალბატონ(?:ი|მა)?\s+რამფორდ(?:მა)?', 'ქალბატონმა რამფორდმა', t)
    t = re.sub(r'(?:უინსონ|ვინსონ|ჰიმნი)\s+ნი(?:ილ|ილს|ილის|ლის|ლ)?\s+რამფორდ([ა-ჰ]*)', r'უინსტონ ნაილს რამფორდ\1', t)

    # Kazak (კაზაკი)
    t = re.sub(r'(?<![\u10A0-\u10FF])კბაჰაკ([ა-ჰ]*)(?![ა-ჰ])', r'კაზაკ\1', t)

    # 2. Screeve Series II Medial Verb Ergative Case Concord (-მა / -მ)
    medial_verbs = r'(?:დაუბერა|გაანათა|იტირა|გაიარა|გაუელვა|დაიგრგვინა|იცინა|იმღერა|ილაპარაკა|იყვირა|დაიყვირა|გაიელვა|დაიქუხა|ჩაილაპარაკა|ამოიოხრა)'
    medial_subjects = r'(?:ქარ|მზე|აზრ|ჭექა-ქუხილ|ც|ბავშვ|მგზავრ|ხალხ|მეომარ|ოსტატ|მეფ|ავტორ|მწერალ|მკითხველ)'
    t = re.sub(r'(?<![\u10A0-\u10FF])(' + medial_subjects + r')ი(\s+(?:[ა-ჰ]+\s+)?' + medial_verbs + r')(?![ა-ჰ])', r'\g<1>მა\g<2>', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])(მზე|ცა|დედა|მამა)(\s+(?:[ა-ჰ]+\s+)?' + medial_verbs + r')(?![ა-ჰ])', r'\g<1>მ\g<2>', t)

    # 3. Prohibitive Negative Imperatives (არ -> ნუ with imperative verbs)
    prohibitive_fixes = [
        (r'(?<![\u10A0-\u10FF])არ\s+წახვიდე(?![ა-ჰ])', 'ნუ წახვალ'),
        (r'(?<![\u10A0-\u10FF])არ\s+შეგეშინდეს(?![ა-ჰ])', 'ნუ გეშინია'),
        (r'(?<![\u10A0-\u10FF])არ\s+შეშინდე(?![ა-ჰ])', 'ნუ გეშინია'),
        (r'(?<![\u10A0-\u10FF])არ\s+იტირო(?![ა-ჰ])', 'ნუ ტირი'),
        (r'(?<![\u10A0-\u10FF])არ\s+დაივიწყო(?![ა-ჰ])', 'ნუ დაივიწყებ'),
        (r'(?<![\u10A0-\u10FF])არ\s+დაგავიწყდეს(?![ა-ჰ])', 'ნუ დაივიწყებ'),
        (r'(?<![\u10A0-\u10FF])არ\s+იდარდო(?![ა-ჰ])', 'ნუ დარდობ'),
        (r'(?<![\u10A0-\u10FF])არ\s+იჩქარო(?![ა-ჰ])', 'ნუ ჩქარობ'),
        (r'(?<![\u10A0-\u10FF])არ\s+ინერვიულო(?![ა-ჰ])', 'ნუ ნერვიულობ'),
        (r'(?<![\u10A0-\u10FF])არ\s+დანებდე(?![ა-ჰ])', 'ნუ დანებდები'),
        (r'(?<![\u10A0-\u10FF])არ\s+შეჩერდე(?![ა-ჰ])', 'ნუ შეჩერდები'),
    ]
    for pat, repl in prohibitive_fixes:
        t = re.sub(pat, repl, t)

    # 4. Experiencer Dative Inversion (Extended)
    experiencer_verbs_ext = r'(?:სურს|სურდა|მოსწონს|მოსწონდა|ეჩვენება|ეჩვენებოდა|ეხერხება|ეზარება|სწყურია|აინტერესებს|აღელვებს|უყვარს|უყვარდა|ახსოვს|ახსოვდა|ეშინია|ეშინოდა|სტკივა|სტკიოდა|შია|სცივა|უნდა|უნდოდა|სჭირდება|სჭირდებოდა)'
    t = re.sub(r'(?<![\u10A0-\u10FF])ის(\s+(?:[ა-ჰ]+\s+)?' + experiencer_verbs_ext + r')(?![ა-ჰ])', r'მას\g<1>', t)

    # 5. Adjective Stem Truncation in Oblique Cases (კვეცა ირებრივ ბრუნვებში / თანდებულებში)
    adj_stems = (
        r'(?:[ა-ჰ]+(?:ურ|ულ|იერ|იან|ელ|ალ|ეს|ობილ|ებულ)|უცნობ|დიდ|ახალ|ძველ|საკუთარ|'
        r'მთავარ|მთელ|ერთადერთ|პირველ|ცარიელ|მშვიდ|ცივ|თბილ|ცხელ|ტკბილ|მსუბუქ|ცოცხალ|'
        r'მკვდარ|ბრძენ|კეთილ|ბოროტ|სუსტ|ძლიერ|ღარიბ|საშიშ|ერთგულ|პირად|მაღალ|დაბალ|'
        r'გრძელ|მშვენიერ|ღვთაებრივ|სულიერ|ფიზიკურ|ისტორიულ|სასიცოცხლო|მორალურ|ფილოსოფიურ|'
        r'სამხედრო|მარადიულ)'
    )
    oblique_postpositions = r'(?:ში|ზე|თან|დან|სკენ|თვის|მდე)'

    # Adjective + noun with postposition: e.g. "უცნობი სივრცეში" -> "უცნობ სივრცეში", "დიდი ქალაქში" -> "დიდ ქალაქში"
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(' + adj_stems + r')ი\s+([ა-ჰ]+' + oblique_postpositions + r')(?![ა-ჰ])',
        r'\1 \2',
        t
    )

    # Adjective + noun in dative case (-ს): e.g. "უცნობი ადამიანს" -> "უცნობ ადამიანს", "დიდი სივრცეს" -> "დიდ სივრცეს"
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(' + adj_stems + r')ი\s+([ა-ჰ]+[ა-ჰ]ს)(?![ა-ჰ])',
        r'\1 \2',
        t
    )

    # Adjective + noun in Ergative case (-მა / -მ): e.g. "ცივი ქარმა" -> "ცივმა ქარმა", "ახალი ავტორმა" -> "ახალმა ავტორმა"
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(' + adj_stems + r')ი\s+([ა-ჰ]+(?:მა|მ))(?![ა-ჰ])',
        r'\1მა \2',
        t
    )

    # 6. Typography & Dialogue
    t = re.sub(r'(?:^|\n)\s*[-–—]\s*', r'\n— ', t)
    t = re.sub(r'\s+([.,;:!?])', r'\1', t)

    return t.strip()

