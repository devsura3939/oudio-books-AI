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

    # 6. Series III Evidential Inversion (თურმეობითი I/II - Subject takes Dative -ს)
    series_iii_verbs = (
        r'(?:დაუწერია|დაეწერა|აუშენებია|აეშენებინა|უბრძანებია|ებრძანა|შეუმჩნევია|შეემჩნია|'
        r'გაუგია|გაეგო|უსწავლია|ესწავლა|უნახავს|ენახა|აღუწერია|აღეწერა|გაუკეთებია|გაეკეთებინა|'
        r'უპოვია|ეპოვა|შეუქმნია|შეექმნა|მოუსმენია|მოესმინა|გაუგზავნია|გაეგზავნა|შეუტყვია|'
        r'დაუვიწყებია|დაევიწყებინა|უთქვამს|ეთქვა|დაუბარებია|გაუჩენია)'
    )
    series_iii_consonant_subjects = r'(?:ავტორ|ოსტატ|მეცნიერ|მხედარ|მკითხველ|მოწაფ|მგზავრ|მწერალ|ხალხ|ადამიან|კაც|ქალ|მეომარ|ბრძენ)'
    # Consonant subject in Ergative (-მა) before Series III verb -> convert to Dative (-ს)
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(' + series_iii_consonant_subjects + r')მა(\s+(?:[ა-ჰ]+\s+)?' + series_iii_verbs + r')(?![ა-ჰ])',
        r'\g<1>ს\g<2>',
        t
    )
    # Vowel subject in Ergative (-მ) before Series III verb -> convert to Dative (-ს)
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(მეფე|დედა|მამა)მ(\s+(?:[ა-ჰ]+\s+)?' + series_iii_verbs + r')(?![ა-ჰ])',
        r'\g<1>ს\g<2>',
        t
    )
    # Pronoun inversion in Series III: მან/ის -> მას
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(?:მან|ის)(\s+(?:[ა-ჰ]+\s+)?' + series_iii_verbs + r')(?![ა-ჰ])',
        r'მას\g<1>',
        t
    )

    # 7. Participial Clause Restructuring (მიმღეობური კონსტრუქციები)
    participial_replacements = [
        (r'(?<![\u10A0-\u10FF])წიგნი,\s*რომელიც\s+დაიწერა(?![ა-ჰ])', 'დაწერილი წიგნი'),
        (r'(?<![\u10A0-\u10FF])ხელნაწერი,\s*რომელიც\s+დაიწერა(?![ა-ჰ])', 'დაწერილი ხელნაწერი'),
        (r'(?<![\u10A0-\u10FF])ტაძარი,\s*რომელიც\s+აშენდა(?![ა-ჰ])', 'აშენებული ტაძარი'),
        (r'(?<![\u10A0-\u10FF])თაობა,\s*რომელიც\s+მოდის(?![ა-ჰ])', 'მომავალი თაობა'),
        (r'(?<![\u10A0-\u10FF])სიტყვა,\s*რომელიც\s+უნდა\s+ითქვას(?![ა-ჰ])', 'სათქმელი სიტყვა'),
        (r'(?<![\u10A0-\u10FF])საქმე,\s*რომელიც\s+უნდა\s+გაკეთდეს(?![ა-ჰ])', 'საკეთებელი საქმე'),
    ]
    for pat, repl in participial_replacements:
        t = re.sub(pat, repl, t)

    # 8. Deictic Directional Preverb Distinctions (აქ მო- vs იქ წა-/მი-)
    t = re.sub(r'(?<![\u10A0-\u10FF])აქ\s+წავიდა(?![ა-ჰ])', 'აქ მოვიდა', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])აქ\s+წაიღო(?![ა-ჰ])', 'აქ მოიტანა', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])იქ\s+მოვიდა(?![ა-ჰ])', 'იქ წავიდა', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])იქ\s+მოიტანა(?![ა-ჰ])', 'იქ წაიღო', t)

    # 9. Direct Speech Quotatives & Enclitic Normalization (-ო, მეთქი, თქო)
    t = re.sub(r'(?<=[\u10D0-\u10FA])\s+-\s*ო\b', '-ო', t)
    t = re.sub(r'(?<=[\u10D0-\u10FA])\s+მეთქი\b', '-მეთქი', t)
    t = re.sub(r'(?<=[\u10D0-\u10FA])\s+თქო\b', '-თქო', t)

    # 10. Sulkhan-Saba & Classical Literature Idioms
    phraseologisms = [
        (r'(?<![\u10A0-\u10FF])მისცა\s+ადგილი(?![ა-ჰ])', 'ადგილი დაუთმო'),
        (r'(?<![\u10A0-\u10FF])მიიღო\s+მონაწილეობა(?![ა-ჰ])', 'მონაწილეობა მიიღო'),
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+გადაწყვეტილება(?![ა-ჰ])', 'გადაწყვეტილება მიიღო'),
        (r'(?<![\u10A0-\u10FF])ჰქონდა\s+ადგილი(?![ა-ჰ])', 'მოხდა'),
    ]
    for pat, repl in phraseologisms:
        t = re.sub(pat, repl, t)

    # 11. Numeral-Noun Singular Agreement (რიცხვითი სახელისა და არსებითის შეთანხმება)
    numeral_noun_pairs = [
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+წიგნები(?![ა-ჰ])', r'\1 წიგნი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+დღეები(?![ა-ჰ])', r'\1 დღე'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+წლები(?![ა-ჰ])', r'\1 წელი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+კითხვები(?![ა-ჰ])', r'\1 კითხვა'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+ადამიანები(?![ა-ჰ])', r'\1 ადამიანი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+სიტყვები(?![ა-ჰ])', r'\1 სიტყვა'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+მეგობრები(?![ა-ჰ])', r'\1 მეგობარი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+კაცები(?![ა-ჰ])', r'\1 კაცი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+ქალები(?![ა-ჰ])', r'\1 ქალი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+ხალხები(?![ა-ჰ])', r'\1 ხალხი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+ქვეყნები(?![ა-ჰ])', r'\1 ქვეყანა'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ოცი|ორმოცი|სამოცი|ოთხმოცი|ასი|ათასი|მრავალი|ბევრი|რამდენიმე|უამრავი|ცოტა)\s+ქალაქები(?![ა-ჰ])', r'\1 ქალაქი'),
    ]
    for pat, repl in numeral_noun_pairs:
        t = re.sub(pat, repl, t)

    # Inanimate quantified subject singular verb concord: სამი დღე გავიდნენ -> სამი დღე გავიდა
    t = re.sub(r'(?<![\u10A0-\u10FF])(სამი|ათი|მრავალი|რამდენიმე)\s+დღე\s+გავიდნენ(?![ა-ჰ])', r'\1 დღე გავიდა', t)

    # 12. Caritive / Privative Synthetic Adverbs (უ-...-ოდ / დაუ-...-ებელ-ად)
    caritive_adverbs = [
        (r'(?<![\u10A0-\u10FF])გარეშე\s+ეჭვის(?![ა-ჰ])', 'უეჭველად'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+შიშის(?![ა-ჰ])', 'უშიშრად'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+იმედის(?![ა-ჰ])', 'უიმედოდ'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+ხმის(?![ა-ჰ])', 'უხმოდ'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+მიზეზის(?![ა-ჰ])', 'უმიზეზოდ'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+აზრის(?![ა-ჰ])', 'უაზროდ'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+შეცდომის(?![ა-ჰ])', 'უშეცდომოდ'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+დაღლის(?![ა-ჰ])', 'დაუღალავად'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+დასასრულის(?![ა-ჰ])', 'დაუსრულებლად'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+ყოყმანის(?![ა-ჰ])', 'დაუყოვნებლივ'),
        (r'(?<![\u10A0-\u10FF])გარეშე\s+დაფიქრების(?![ა-ჰ])', 'დაუფიქრებლად'),
    ]
    for pat, repl in caritive_adverbs:
        t = re.sub(pat, repl, t)

    # 13. Collocational Light-Verb De-Calquing (გაკეთება / ქონა აკრძალვები)
    collocational_verbs = [
        (r'(?<![\u10A0-\u10FF])შეცდომის\s+გაკეთება(?![ა-ჰ])', 'შეცდომის დაშვება'),
        (r'(?<![\u10A0-\u10FF])შეცდომა\s+გააკეთა(?![ა-ჰ])', 'შეცდომა დაუშვა'),
        (r'(?<![\u10A0-\u10FF])გავლენის\s+გაკეთება(?![ა-ჰ])', 'გავლენის მოხდენა'),
        (r'(?<![\u10A0-\u10FF])გავლენა\s+გააკეთა(?![ა-ჰ])', 'გავლენა მოახდინა'),
        (r'(?<![\u10A0-\u10FF])შთაბეჭდილების\s+გაკეთება(?![ა-ჰ])', 'შთაბეჭდილების მოხდენა'),
        (r'(?<![\u10A0-\u10FF])შთაბეჭდილება\s+გააკეთა(?![ა-ჰ])', 'შთაბეჭდილება მოახდინა'),
        (r'(?<![\u10A0-\u10FF])ყურადღების\s+გაკეთება(?![ა-ჰ])', 'ყურადღების მიქცევა'),
        (r'(?<![\u10A0-\u10FF])ყურადღება\s+გააკეთა(?![ა-ჰ])', 'ყურადღება მიაქცია'),
        (r'(?<![\u10A0-\u10FF])წარმოდგენის\s+გაკეთება(?![ა-ჰ])', 'წარმოდგენის შექმნა'),
        (r'(?<![\u10A0-\u10FF])საჩივრის\s+გაკეთება(?![ა-ჰ])', 'საჩივრის შეტანა'),
        (r'(?<![\u10A0-\u10FF])საჩივარი\s+გააკეთა(?![ა-ჰ])', 'საჩივარი შეიტანა'),
        (r'(?<![\u10A0-\u10FF])სარგებლის\s+გაკეთება(?![ა-ჰ])', 'სარგებლის მიღება'),
        (r'(?<![\u10A0-\u10FF])წინსვლის\s+გაკეთება(?![ა-ჰ])', 'წინსვლის მიღწევა'),
    ]
    for pat, repl in collocational_verbs:
        t = re.sub(pat, repl, t)

    # 14. Verbal Version Markers (ქცევა: სათავისო ი- vs სასხვისო უ-)
    version_fixes = [
        (r'(?<![\u10A0-\u10FF])დაწერა\s+წერილ(?:ი)?\s+თავისთვის(?![ა-ჰ])', 'დაიწერა წერილი'),
        (r'(?<![\u10A0-\u10FF])ააშენა\s+სახლ(?:ი)?\s+თავისთვის(?![ა-ჰ])', 'აიშენა სახლი'),
        (r'(?<![\u10A0-\u10FF])მოამზადა\s+სადილ(?:ი)?\s+თავისთვის(?![ა-ჰ])', 'მოიმზადა სადილი'),
        (r'(?<![\u10A0-\u10FF])დაწერა\s+წერილ(?:ი)?\s+შვილისთვის(?![ა-ჰ])', 'შვილს წერილი დაუწერა'),
        (r'(?<![\u10A0-\u10FF])ააშენა\s+სახლ(?:ი)?\s+მეგობრისთვის(?![ა-ჰ])', 'მეგობარს სახლი აუშენა'),
        (r'(?<![\u10A0-\u10FF])მოამზადა\s+საჭმელ(?:ი)?\s+დედისთვის(?![ა-ჰ])', 'დედას საჭმელი მოუმზადა'),
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+თავისთვის(?![ა-ჰ])', 'გაიკეთა'),
    ]
    for pat, repl in version_fixes:
        t = re.sub(pat, repl, t)

    # 15. Agentive Passive Ablative De-Calquing (-ის მიერ -> -გან)
    agentive_passive_fixes = [
        (r'(?<![\u10A0-\u10FF])ღვთის\s+მიერ\s+ბოძებული(?![ა-ჰ])', 'ღვთისგან ბოძებული'),
        (r'(?<![\u10A0-\u10FF])ბუნების\s+მიერ\s+შექმნილი(?![ა-ჰ])', 'ბუნებისგან შექმნილი'),
        (r'(?<![\u10A0-\u10FF])მტრის\s+მიერ\s+განადგურებული(?![ა-ჰ])', 'მტრისგან განადგურებული'),
        (r'(?<![\u10A0-\u10FF])ხალხის\s+მიერ\s+არჩეული(?![ა-ჰ])', 'ხალხისგან არჩეული'),
    ]
    for pat, repl in agentive_passive_fixes:
        t = re.sub(pat, repl, t)

    # 16. Reflexive Anaphora & Possessive Co-Reference (საკუთარი თავი / თავისი vs მისი)
    reflexive_fixes = [
        (r'(?<![\u10A0-\u10FF])დაინახა\s+მისი\s+თავი(?![ა-ჰ])', 'საკუთარი თავი დაინახა'),
        (r'(?<![\u10A0-\u10FF])ჰკითხა\s+მის\s+თავს(?![ა-ჰ])', 'თავის თავს ჰკითხა'),
        (r'(?<![\u10A0-\u10FF])დარწმუნებული\s+იყო\s+მის\s+თავში(?![ა-ჰ])', 'თავის თავში იყო დარწმუნებული'),
        (r'(?<![\u10A0-\u10FF])უთხრა\s+მის\s+თავს(?![ა-ჰ])', 'თავის თავს უთხრა'),
        (r'(?<![\u10A0-\u10FF])მან\s+დაინახა\s+ის(?![ა-ჰ])', 'მან საკუთარი თავი დაინახა'),
        (r'(?<![\u10A0-\u10FF])მან\s+აიღო\s+მისი\s+წიგნი(?![ა-ჰ])', 'მან თავისი წიგნი აიღო'),
        (r'(?<![\u10A0-\u10FF])მან\s+დახუჭა\s+მისი\s+თვალები(?![ა-ჰ])', 'მან თავისი თვალები დახუჭა'),
        (r'(?<![\u10A0-\u10FF])მან\s+გახსნა\s+მისი\s+გული(?![ა-ჰ])', 'მან თავისი გული გახსნა'),
        (r'(?<![\u10A0-\u10FF])მან\s+დატოვა\s+მისი\s+სახლი(?![ა-ჰ])', 'მან თავისი სახლი დატოვა'),
        (r'(?<![\u10A0-\u10FF])მან\s+იპოვა\s+მისი\s+გზა(?![ა-ჰ])', 'მან თავისი გზა იპოვა'),
    ]
    for pat, repl in reflexive_fixes:
        t = re.sub(pat, repl, t)

    # 17. Postpositional Word Order and Instantaneous Temporal Clitics (შესახებ, -თანავე, -მდე)
    postpositional_fixes = [
        (r'(?<![\u10A0-\u10FF])შესახებ\s+ამის(?![ა-ჰ])', 'ამის შესახებ'),
        (r'(?<![\u10A0-\u10FF])შესახებ\s+წიგნის(?![ა-ჰ])', 'წიგნის შესახებ'),
        (r'(?<![\u10A0-\u10FF])შესახებ\s+ცხოვრების(?![ა-ჰ])', 'ცხოვრების შესახებ'),
        (r'(?<![\u10A0-\u10FF])შესახებ\s+ადამიანის(?![ა-ჰ])', 'ადამიანის შესახებ'),
        (r'(?<![\u10A0-\u10FF])შესახებ\s+სამყაროს(?![ა-ჰ])', 'სამყაროს შესახებ'),
        (r'(?<![\u10A0-\u10FF])შიგნით\s+ოთახში(?![ა-ჰ])', 'ოთახში'),
        (r'(?<![\u10A0-\u10FF])როგორც\s+კი\s+დაინახა(?![ა-ჰ])', 'დანახვისთანავე'),
        (r'(?<![\u10A0-\u10FF])როგორც\s+კი\s+მოვიდა(?![ა-ჰ])', 'მოსვლისთანავე'),
        (r'(?<![\u10A0-\u10FF])როგორც\s+კი\s+გაიგო(?![ა-ჰ])', 'გაგებისთანავე'),
        (r'(?<![\u10A0-\u10FF])როგორც\s+კი\s+გაიღვიძა(?![ა-ჰ])', 'გაღვიძებისთანავე'),
        (r'(?<![\u10A0-\u10FF])როგორც\s+კი\s+შეიტყო(?![ა-ჰ])', 'შეტყობისთანავე'),
        (r'(?<![\u10A0-\u10FF])სანამ\s+დილა\s+მოვიდოდა(?![ა-ჰ])', 'დილამდე'),
        (r'(?<![\u10A0-\u10FF])სანამ\s+ბოლო\s+მოვიდოდა(?![ა-ჰ])', 'ბოლომდე'),
        (r'(?<![\u10A0-\u10FF])სანამ\s+სიკვდილი\s+მოვიდოდა(?![ა-ჰ])', 'სიკვდილამდე'),
        (r'(?<![\u10A0-\u10FF])სანამ\s+დაღამდება(?![ა-ჰ])', 'დაღამებამდე'),
    ]
    for pat, repl in postpositional_fixes:
        t = re.sub(pat, repl, t)

    # 18. Prohibitive and Inability Negative Concord (ნურავინ, ნურაფერი, ნურასოდეს + ნუ; ვერ)
    negative_concord_fixes = [
        (r'(?<![\u10A0-\u10FF])არავინ\s+არ\s+შეძლო(?![ა-ჰ])', 'ვერავინ შეძლო'),
        (r'(?<![\u10A0-\u10FF])არავინ\s+შეძლო(?![ა-ჰ])', 'ვერავინ შეძლო'),
        (r'(?<![\u10A0-\u10FF])არაფერი\s+არ\s+შევძელი(?![ა-ჰ])', 'ვერაფერი შევძელი'),
        (r'(?<![\u10A0-\u10FF])არაფერი\s+შევძელი(?![ა-ჰ])', 'ვერაფერი შევძელი'),
        (r'(?<![\u10A0-\u10FF])არსად\s+არ\s+შეეძლო\s+წასვლა(?![ა-ჰ])', 'ვერსად წავიდოდა'),
        (r'(?<![\u10A0-\u10FF])არაფერი\s+(?:არ|ნუ)\s+(?:გააკეთო|გააკეთებ)(?![ა-ჰ])', 'ნურაფერს ნუ გააკეთებ'),
        (r'(?<![\u10A0-\u10FF])არაფერს\s+(?:არ|ნუ)\s+(?:შეეხო|შეეხები)(?![ა-ჰ])', 'ნურაფერს ნუ შეეხები'),
        (r'(?<![\u10A0-\u10FF])არავის\s+(?:არ|ნუ)\s+(?:უთხრა|ეტყვი)(?![ა-ჰ])', 'ნურავის ნუ ეტყვი'),
        (r'(?<![\u10A0-\u10FF])არასოდეს\s+(?:არ|ნუ)\s+(?:დაივიწყო|დაივიწყებ)(?![ა-ჰ])', 'ნურასოდეს ნუ დაივიწყებ'),
        (r'(?<![\u10A0-\u10FF])არასდროს\s+(?:არ|ნუ)\s+(?:დაბრუნდე|დაბრუნდები)(?![ა-ჰ])', 'ნურასდროს ნუ დაბრუნდები'),
        (r'(?<![\u10A0-\u10FF])არსად\s+(?:არ|ნუ)\s+(?:წახვიდე|წახვალ)(?![ა-ჰ])', 'ნურსად ნუ წახვალ'),
    ]
    for pat, repl in negative_concord_fixes:
        t = re.sub(pat, repl, t)

    # 19. Purposive Supine Compacting (იმისთვის, რომ -> სა-...-ოდ / -ად)
    purposive_supine_fixes = [
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+გაიგოს(?![ა-ჰ])', 'გასაგებად'),
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+ნახოს(?![ა-ჰ])', 'სანახავად'),
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+ისწავლოს(?![ა-ჰ])', 'სასწავლად'),
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+თქვას(?![ა-ჰ])', 'სათქმელად'),
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+გადარჩეს(?![ა-ჰ])', 'გადასარჩენად'),
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+იპოვოს(?![ა-ჰ])', 'საპოვნელად'),
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+იცხოვროს(?![ა-ჰ])', 'საცხოვრებლად'),
        (r'(?<![\u10A0-\u10FF])იმისთვის,\s*რომ\s+დაინახოს(?![ა-ჰ])', 'დასანახად'),
    ]
    for pat, repl in purposive_supine_fixes:
        t = re.sub(pat, repl, t)

    # 20. Mirative Discourse Particles and Evidential Concord (თურმე)
    mirative_fixes = [
        (r'(?<![\u10A0-\u10FF])როგორც\s+ჩანს,\s*მას\s+დავიწყებია(?![ა-ჰ])', 'თურმე დავიწყებია'),
        (r'(?<![\u10A0-\u10FF])როგორც\s+ჩანს,\s*დავიწყებია(?![ა-ჰ])', 'თურმე დავიწყებია'),
        (r'(?<![\u10A0-\u10FF])აღმოჩნდა,\s*რომ\s+მოვიდა(?![ა-ჰ])', 'თურმე მოსულა'),
        (r'(?<![\u10A0-\u10FF])აღმოჩნდა,\s*რომ\s+წავიდა(?![ა-ჰ])', 'თურმე წასულა'),
        (r'(?<![\u10A0-\u10FF])აღმოჩნდა,\s*რომ\s+სიმართლეა(?![ა-ჰ])', 'თურმე სიმართლე ყოფილა'),
    ]
    for pat, repl in mirative_fixes:
        t = re.sub(pat, repl, t)

    # 21. Typography & Dialogue
    t = re.sub(r'(?:^|\n)\s*[-–—]\s*', r'\n— ', t)
    t = re.sub(r'\s+([.,;:!?])', r'\1', t)

    return t.strip()

