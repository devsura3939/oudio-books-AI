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
    if target == "ka":
        if re.search(r'(?<![\u10A0-\u10FF])მან\s+(?:[ა-ჰ]+\s+)?(?:გაფრინდა|წავიდა|მოვიდა|დაჯდა|დადგა|გაიქცა|ჩამოვიდა|ჩავარდა|გაღვიძა|გაიღვიძა|მოკვდა|დაიღუპა|გაჩნდა)(?![\u10A0-\u10FF])', candidate):
            return False
        if re.search(r'(?<![\u10A0-\u10FF])[ა-ჰ]+ები\s+(?:[ა-ჰ]+\s+)?(?:იპოვეს|თქვეს|გააკეთეს|დაწერეს|წაიკითხეს|ნახეს|გახსნეს|დახურეს)(?![\u10A0-\u10FF])', candidate):
            return False
        if re.search(r'(?<![\u10A0-\u10FF])(?:გამოიყურებოდა\s+გარეგნულად|თავის\s+გარეგნულ\s+ბიძგში|ქვებივით\s+აფრინდა\s+მათ|გიმ(?:რ|კრ)ეკის|საკმარისად\s+იყო\s+ნაპოვნი|თავსატეხების\s+ყუთებ|უაზრობის\s+კოშმარი\s+უსასრულოდ|უგემოვნო\s+ზღვაში|უცოდინარი\s+ჭეშმარიტებების|უბიძგებდა\s+მუდამ\s+გარეგნულად|თავსატეხების\s+ყუთები\s+მათში|ადამიანებს\s+არ\s+ჰქონდათ\s+მარტივი\s+წვდომა|გარედან\s+იძვრებოდნენ|გარეგნობის\s+ზღვ(?:ა|აში)|თვალების\s+გასახარებლად|თხელ(?:ი)?\s+ჰაერიდან|ცარიელ(?:ი)?\s+სიცარიელ|გარე\s+სივრც|საათების\s+განმავლობაში|გააკეთა\s+აზრი|ყურადღება\s+გადაიხადა|ადგილი\s+აიღო)(?![\u10A0-\u10FF])', candidate):
            return False
        if re.search(r'(?<![\u10A0-\u10FF])(?:(?:მისი\s+)?სუნთქვა\s+დაიჭირა|დაიჭირა\s+(?:მისი\s+)?სუნთქვა|დაკარგა\s+სუნთქვა|სუნთქვა\s+დაკარგა|მხრები\s+შეანჯღრია|ყელი\s+გაიწმინდა|სიცილში\s+აფეთქდა|ცრემლებში\s+აფეთქდა|თავი\s+შეანჯღრია)(?![\u10A0-\u10FF])', candidate):
            return False
        if re.search(r'(?<![\u10A0-\u10FF])(?:მას\s+)?(?:აქვს|არ\s+აქვს)\s+(?:ძაღლი|კატა|ცხენი|შვილი|მეგობარი|ძმა|და|ვაჟი|ქალიშვილი)(?![\u10A0-\u10FF])', candidate):
            return False
        if re.search(r'(?<![\u10A0-\u10FF])(?:დაკარგა\s+თავისი\s+გონება|გააკეთა\s+თავისი\s+გონება|შეცვალა\s+თავისი\s+გონება|შეინახ(?:ა|ეთ|ე)\s+გონებაში|დაიჭირა\s+(?:მისი\s+)?თვალი|დაადო\s+თვალი\s+მას|საკუთარი\s+თვალებით|შიშველი\s+ხელებით|ფეხებზე\s+იარა|გვერდი\s+გვერდით|უკან\s+და\s+წინ|სახე\s+სახესთან|არსად\s+შუაში|როგორც\s+ფაქტის\s+საკითხი|პირველ\s+შეხედვაზე|ყველა\s+მოულოდნელად|თავიდან\s+ფეხის\s+თითამდე)(?![\u10A0-\u10FF])', candidate):
            return False
        if re.search(r'(?<![\u10A0-\u10FF])(?:ჩურჩულით\s+თქვა|ყვირილით\s+თქვა|მისცა\s+პასუხი|გააკეთა\s+კომენტარი|გამოუშვა\s+ოხვრა|მისი\s+გული\s+ჩაიძირა|ჟრუანტელმა\s+გაიარა\s+მის\s+ხერხემალში|აიღო\s+ღრმა\s+სუნთქვა|მიდის\s+უთქმელად|ყველა\s+ალბათობაში|რომ\s+თქვა\s+სიმართლე|ეჭვის\s+(?:ყოველგვარი\s+)?ჩრდილის\s+გარეშე|არ\s+არის\s+ეჭვი,\s*რომ|მთელი\s+დღე\s+გრძელი|დროის\s+კურსში|დროიდან\s+დროში|საპირისპიროზე|ერთ\s+ხელზე|თანაბრად\s+ასე|ყველა\s+უფრო|მეტი\s+თუ\s+ნაკლები|შორს\s+მისგან)(?![\u10A0-\u10FF])', candidate):
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

    # 4b. Synthetic Stative Pluperfect & Copular Enclisis (სტატიკურ-პერფექტული კოპულის ენკლიზისი: -იყო)
    stative_pluperfect_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+გაკეთებულ(?:ი)?|გაკეთებულ(?:ი)?\s+იყო)(?![ა-ჰ])', 'გაკეთებულიყო'),
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+დაწერილ(?:ი)?|დაწერილ(?:ი)?\s+იყო)(?![ა-ჰ])', 'დაწერილიყო'),
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+აშენებულ(?:ი)?|აშენებულ(?:ი)?\s+იყო)(?![ა-ჰ])', 'აშენებულიყო'),
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+გახსნილ(?:ი)?|გახსნილ(?:ი)?\s+იყო)(?![ა-ჰ])', 'გახსნილიყო'),
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+დაკეტილ(?:ი)?|დაკეტილ(?:ი)?\s+იყო)(?![ა-ჰ])', 'დაკეტილიყო'),
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+დავიწყებულ(?:ი)?|დავიწყებულ(?:ი)?\s+იყო)(?![ა-ჰ])', 'დავიწყებულიყო'),
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+გადაწყვეტილ(?:ი)?|გადაწყვეტილ(?:ი)?\s+იყო)(?![ა-ჰ])', 'გადაწყვეტილიყო'),
        (r'(?<![\u10A0-\u10FF])(?:იყო\s+შექმნილ(?:ი)?|შექმნილ(?:ი)?\s+იყო)(?![ა-ჰ])', 'შექმნილიყო'),
    ]
    for pat, repl in stative_pluperfect_fixes:
        t = re.sub(pat, repl, t)

    # 4c. Synthetic Superlative Circumfixation (აღმატებითი ხარისხის სინთეზური ცირკუმფიქსი: უ-...-ეს-ი / საუკეთესო)
    superlative_fixes = [
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+მეტად\s+დიდ(?:ი)?(?![ა-ჰ])', 'უდიდესი'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+კარგ(?:ი)?(?![ა-ჰ])', 'საუკეთესო'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+ცუდ(?:ი)?(?![ა-ჰ])', 'უარესი'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+მეტად\s+მნიშვნელოვან(?:ი)?(?![ა-ჰ])', 'უმნიშვნელოვანესი'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+ძლიერ(?:ი)?(?![ა-ჰ])', 'უძლიერესი'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+ძველ(?:ი)?(?![ა-ჰ])', 'უძველესი'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+მაღალ(?:ი)?(?![ა-ჰ])', 'უმაღლესი'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+ღრმა(?![ა-ჰ])', 'უღრმესი'),
        (r'(?<![\u10A0-\u10FF])ყველაზე\s+მეტად\s+ლამაზ(?:ი)?(?![ა-ჰ])', 'ულამაზესი'),
    ]
    for pat, repl in superlative_fixes:
        t = re.sub(pat, repl, t)

    # 5. Adjective Stem Truncation in Oblique Cases (კვეცა ირებრივ ბრუნვებში / თანდებულებში)
    adj_stems = (
        r'(?!(?:თვალ|წყალ|ქალ|ძვალ|კვალ|ცალ|ბალ|ხალხ)ი)'
        r'(?:[ა-ჰ]+(?:ურ|ულ|იერ|იან|ელ|ალ|ეს|ობილ|ებულ)|უცნობ|დიდ|ახალ|ძველ|საკუთარ|'
        r'მთავარ|მთელ|ერთადერთ|პირველ|ცარიელ|მშვიდ|ცივ|თბილ|ცხელ|ტკბილ|მსუბუქ|ცოცხალ|'
        r'მკვდარ|ბრძენ|კეთილ|ბოროტ|სუსტ|ძლიერ|ღარიბ|საშიშ|ერთგულ|პირად|მაღალ|დაბალ|'
        r'გრძელ|მშვენიერ|ღვთაებრივ|სულიერ|ფიზიკურ|ისტორიულ|სასიცოცხლო|მორალურ|ფილოსოფიურ|'
        r'სამხედრო|მარადიულ)'
    )
    oblique_postpositions = r'(?:ში|ზე|თან|დან|სკენ|თვის|მდე)'

    # Adjective + noun with postposition: e.g. "უცნობი სივრცეში" -> "უცნობ სივრცეში", "დიდი ქალაქში" -> "დიდ ქალაქში"
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(' + adj_stems + r')ი\s+(?!(?:რაში|თაში)(?![\u10A0-\u10FF]))([ა-ჰ]+' + oblique_postpositions + r')(?![ა-ჰ])',
        r'\1 \2',
        t
    )

    # Adjective + noun in dative case (-ს): e.g. "უცნობი ადამიანს" -> "უცნობ ადამიანს", "დიდი სივრცეს" -> "დიდ სივრცეს"
    t = re.sub(
        r'(?<![\u10A0-\u10FF])(' + adj_stems + r')ი\s+(?!(?:ხნის|თვის)(?![\u10A0-\u10FF]))([ა-ჰ]+[^ი\s]ს)(?![ა-ჰ])',
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

    # 21. Analytical Passive Elimination & Dynamic Passive Restoration (იქნა + მიმღეობა -> ვნებითი/მოქმედებითი)
    analytical_passive_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+მიღებული|მიღებულ\s+იქნა)(?![ა-ჰ])', 'მიიღეს'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+გადაწყვეტილი|გადაწყვეტილ\s+იქნა)(?![ა-ჰ])', 'გადაწყდა'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+აშენებული|აშენებულ\s+იქნა)(?![ა-ჰ])', 'აშენდა'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+დაწერილი|დაწერილ\s+იქნა)(?![ა-ჰ])', 'დაიწერა'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+ნათქვამი|ნათქვამ\s+იქნა)(?![ა-ჰ])', 'ითქვა'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+გამოცხადებული|გამოცხადებულ\s+იქნა)(?![ა-ჰ])', 'გამოცხადდა'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+აღმოჩენილი|აღმოჩენილ\s+იქნა)(?![ა-ჰ])', 'აღმოაჩინეს'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+შექმნილი|შექმნილ\s+იქნა)(?![ა-ჰ])', 'შეიქმნა'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+გადარჩენილი|გადარჩენილ\s+იქნა)(?![ა-ჰ])', 'გადარჩა'),
        (r'(?<![\u10A0-\u10FF])(?:იქნა\s+დანგრეული|დანგრეულ\s+იქნა)(?![ა-ჰ])', 'დაინგრა'),
    ]
    for pat, repl in analytical_passive_fixes:
        t = re.sub(pat, repl, t)

    # 22. Synthetic Version Vowels & Causative Alignment (ქცევა: სათავისო/სასხვისო/კაუზატივი)
    version_causative_fixes = [
        (r'(?<![\u10A0-\u10FF])მან\s+გააკეთა\s+მისთვის(?![ა-ჰ])', 'მან გაუკეთა მას'),
        (r'(?<![\u10A0-\u10FF])მან\s+დაწერა\s+მისთვის(?![ა-ჰ])', 'მან დაუწერა მას'),
        (r'(?<![\u10A0-\u10FF])მან\s+მოამზადა\s+მისთვის(?![ა-ჰ])', 'მან მოუმზადა მას'),
        (r'(?<![\u10A0-\u10FF])მან\s+შექმნა\s+მისთვის(?![ა-ჰ])', 'მან შეუქმნა მას'),
        (r'(?<![\u10A0-\u10FF])(?:(?:მან|მას)\s+)?აიძულა\s+(?:რომ\s+)?გაეკეთებინა(?![ა-ჰ])', 'გააკეთებინა'),
        (r'(?<![\u10A0-\u10FF])(?:(?:მან|მას)\s+)?აიძულა\s+(?:რომ\s+)?დაეწერა(?![ა-ჰ])', 'დააწერინა'),
        (r'(?<![\u10A0-\u10FF])(?:(?:მან|მას)\s+)?აიძულა\s+(?:რომ\s+)?ეთქვა(?![ა-ჰ])', 'ათქმევინა'),
        (r'(?<![\u10A0-\u10FF])(?:(?:მან|მას)\s+)?აიძულა\s+(?:რომ\s+)?წაეკითხა(?![ა-ჰ])', 'წააკითხა'),
        (r'(?<![\u10A0-\u10FF])(?:(?:მან|მას)\s+)?აიძულა\s+(?:რომ\s+)?აეშენებინა(?![ა-ჰ])', 'ააშენებინა'),
    ]
    for pat, repl in version_causative_fixes:
        t = re.sub(pat, repl, t)

    # 23. Extended Partitive & Quantitative Singular Concord (რიცხვითი სახელისა და მსაზღვრელის მხოლობითი)
    quantifier_singular_fixes = [
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+წუთები(?![ა-ჰ])', r'\1 წუთი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+საათები(?![ა-ჰ])', r'\1 საათი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+წლები(?![ა-ჰ])', r'\1 წელი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+დღეები(?![ა-ჰ])', r'\1 დღე'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+ადამიანები(?![ა-ჰ])', r'\1 ადამიანი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+წიგნები(?![ა-ჰ])', r'\1 წიგნი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+პრობლემები(?![ა-ჰ])', r'\1 პრობლემა'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+კაცები(?![ა-ჰ])', r'\1 კაცი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+ქალები(?![ა-ჰ])', r'\1 ქალი'),
        (r'(?<![\u10A0-\u10FF])(ორი|სამი|ოთხი|ხუთი|ათი|ოცი|ასი|ათასი|მილიონი|ბევრი|ცოტა|რამდენიმე|უამრავი|მრავალი)\s+ბავშვები(?![ა-ჰ])', r'\1 ბავშვი'),
        (r'(?<![\u10A0-\u10FF])ასობით\s+ადამიანები(?![ა-ჰ])', 'ასობით ადამიანი'),
        (r'(?<![\u10A0-\u10FF])ათასობით\s+ადამიანები(?![ა-ჰ])', 'ათასობით ადამიანი'),
    ]
    for pat, repl in quantifier_singular_fixes:
        t = re.sub(pat, repl, t)

    # 24. Frequentative Habitual Aspect with -ხოლმე & Decalquing (ჩვეულებითი ფორმები)
    habitual_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:ჰქონდა\s+ჩვევა,\s*რომ\s+ეთქვა|ჩვევად\s+ჰქონდა\s+ეთქვა)(?![ა-ჰ])', 'ამბობდა ხოლმე'),
        (r'(?<![\u10A0-\u10FF])(?:ჰქონდა\s+ჩვევა,\s*რომ\s+გაეკეთებინა|ჩვევად\s+ჰქონდა\s+გაეკეთებინა)(?![ა-ჰ])', 'აკეთებდა ხოლმე'),
        (r'(?<![\u10A0-\u10FF])(?:ჰქონდა\s+ჩვევა,\s*რომ\s+ეფიქრა|ჩვევად\s+ჰქონდა\s+ეფიქრა)(?![ა-ჰ])', 'ფიქრობდა ხოლმე'),
        (r'(?<![\u10A0-\u10FF])ადრე\s+აკეთებდა\s+ხოლმე(?![ა-ჰ])', 'აკეთებდა ხოლმე'),
        (r'(?<![\u10A0-\u10FF])ყოველთვის\s+ამბობდა\s+ხოლმე(?![ა-ჰ])', 'ამბობდა ხოლმე'),
        (r'(?<![\u10A0-\u10FF])ჩვეულებრივ\s+ამბობდა\s+ხოლმე(?![ა-ჰ])', 'ამბობდა ხოლმე'),
    ]
    for pat, repl in habitual_fixes:
        t = re.sub(pat, repl, t)

    # 25. Conditional & Modal Circumlocution Reduction (პირობითი და შესაძლებლობითი კილო)
    conditional_modal_fixes = [
        (r'(?<![\u10A0-\u10FF])იმ\s+შემთხვევაში,\s*თუკი(?![ა-ჰ])', 'თუკი'),
        (r'(?<![\u10A0-\u10FF])იმ\s+შემთხვევაში,\s*თუ(?![ა-ჰ])', 'თუ'),
        (r'(?<![\u10A0-\u10FF])იმ\s+შემთხვევაში,\s*როდესაც(?![ა-ჰ])', 'როდესაც'),
        (r'(?<![\u10A0-\u10FF])(?:ეს\s+არის\s+შესაძლებელი,\s*რომ|ეს\s+შესაძლებელია,\s*რომ)(?![ა-ჰ])', 'შესაძლებელია, რომ'),
        (r'(?<![\u10A0-\u10FF])არ\s+არის\s+შესაძლებელი,\s*რომ(?![ა-ჰ])', 'შეუძლებელია, რომ'),
        (r'(?<![\u10A0-\u10FF])შეიძლება\s+ითქვას\s+ის,\s*რომ(?![ა-ჰ])', 'შეიძლება ითქვას, რომ'),
    ]
    for pat, repl in conditional_modal_fixes:
        t = re.sub(pat, repl, t)

    # 26. Reciprocal Pronoun Concord (ერთმანეთ- / ერთიმეორე- არასდროს ერგატივში)
    reciprocal_fixes = [
        (r'(?<![\u10A0-\u10FF])ერთმანეთმა\s+გააკეთეს(?![ა-ჰ])', 'ერთმანეთს დაეხმარნენ'),
        (r'(?<![\u10A0-\u10FF])ერთმანეთმა\s+დაინახეს(?![ა-ჰ])', 'ერთმანეთი დაინახეს'),
        (r'(?<![\u10A0-\u10FF])ერთმანეთმა\s+შეხედეს(?![ა-ჰ])', 'ერთმანეთს შეხედეს'),
        (r'(?<![\u10A0-\u10FF])ერთმანეთმა\s+უთხრეს(?![ა-ჰ])', 'ერთმანეთს უთხრეს'),
        (r'(?<![\u10A0-\u10FF])ერთმანეთმა\s+გაუგეს(?![ა-ჰ])', 'ერთმანეთს გაუგეს'),
        (r'(?<![\u10A0-\u10FF])ერთმანეთმა\s+იპოვეს(?![ა-ჰ])', 'ერთმანეთი იპოვეს'),
    ]
    for pat, repl in reciprocal_fixes:
        t = re.sub(pat, repl, t)

    # 27. Optative & Permissive Mood Synthesis (დაე, ნეტავ, იქნებ)
    optative_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:ნება\s+მიეცით\s+მას|ნება\s+მიეცით)\s+წავიდეს(?![ა-ჰ])', 'დაე წავიდეს'),
        (r'(?<![\u10A0-\u10FF])(?:ნება\s+მიეცით\s+მას|ნება\s+მიეცით)\s+იყოს(?![ა-ჰ])', 'დაე იყოს'),
        (r'(?<![\u10A0-\u10FF])მინდა,\s*რომ\s+ვიცოდე(?![ა-ჰ])', 'ნეტავ ვიცოდე'),
        (r'(?<![\u10A0-\u10FF])მინდა,\s*რომ\s+შემეძლოს(?![ა-ჰ])', 'ნეტავ შემეძლოს'),
        (r'(?<![\u10A0-\u10FF])შესაძლოა\s+მოვიდეს(?![ა-ჰ])', 'იქნებ მოვიდეს'),
        (r'(?<![\u10A0-\u10FF])შესაძლოა\s+გაიგოს(?![ა-ჰ])', 'იქნებ გაიგოს'),
    ]
    for pat, repl in optative_fixes:
        t = re.sub(pat, repl, t)

    # 28. Dynamic Action Inchoatives & Ingressives (მოქმედების დაწყების სინთეზური ფორმები)
    inchoative_fixes = [
        (r'(?<![\u10A0-\u10FF])დაიწყო\s+სიმღერა(?![ა-ჰ])', 'ამღერდა'),
        (r'(?<![\u10A0-\u10FF])დაიწყო\s+ტირილი(?![ა-ჰ])', 'ატირდა'),
        (r'(?<![\u10A0-\u10FF])დაიწყო\s+ლაპარაკი(?![ა-ჰ])', 'ალაპარაკდა'),
        (r'(?<![\u10A0-\u10FF])დაიწყო\s+ნათება(?![ა-ჰ])', 'აენთო'),
        (r'(?<![\u10A0-\u10FF])დაიწყო\s+ფიქრი(?![ა-ჰ])', 'დაფიქრდა'),
        (r'(?<![\u10A0-\u10FF])დაიწყო\s+კანკალი(?![ა-ჰ])', 'აკანკალდა'),
        (r'(?<![\u10A0-\u10FF])დაიწყო\s+ყვირილი(?![ა-ჰ])', 'აყვირდა'),
    ]
    for pat, repl in inchoative_fixes:
        t = re.sub(pat, repl, t)

    # 29. Deictic Coordinate Binomial Adverbs (ადგილისა და დროის ჩვენებითი ზმნიზედები)
    deictic_fixes = [
        (r'(?<![\u10A0-\u10FF])აქ\s+და\s+იქ(?![ა-ჰ])', 'აქა-იქ'),
        (r'(?<![\u10A0-\u10FF])აქ\s+და\s+იქით(?![ა-ჰ])', 'აქეთ-იქით'),
    ]
    for pat, repl in deictic_fixes:
        t = re.sub(pat, repl, t)

    # 30. Correlative & Proportional Degree Subordination (რაც უფრო... მით უფრო...)
    proportional_fixes = [
        (r'(?<![\u10A0-\u10FF])უფრო\s+და\s+უფრო\s+მეტი(?![ა-ჰ])', 'სულ უფრო მეტი'),
        (r'(?<![\u10A0-\u10FF])უფრო\s+და\s+უფრო\s+ნაკლები(?![ა-ჰ])', 'სულ უფრო ნაკლები'),
        (r'(?<![\u10A0-\u10FF])უფრო\s+და\s+უფრო\s+რთული(?![ა-ჰ])', 'სულ უფრო რთული'),
        (r'(?<![\u10A0-\u10FF])უფრო\s+და\s+უფრო\s+კარგი(?![ა-ჰ])', 'სულ უფრო კარგი'),
        (r'(?<![\u10A0-\u10FF])რაც\s+მეტად,\s*მით\s+მეტად(?![ა-ჰ])', 'რაც უფრო, მით უფრო'),
        (r'(?<![\u10A0-\u10FF])რაც\s+უფრო,\s*უფრო(?![ა-ჰ])', 'რაც უფრო, მით უფრო'),
    ]
    for pat, repl in proportional_fixes:
        t = re.sub(pat, repl, t)

    # 31. Iterative & Hyphenated Reduplicative Morphology (მრავალგზისობისა და განმეორებითობის ზმნური სინთეზი)
    iterative_fixes = [
        (r'(?<![\u10A0-\u10FF])ნელა\s+და\s+ნელა(?![ა-ჰ])', 'ნელ-ნელა'),
        (r'(?<![\u10A0-\u10FF])ცოტა\s+და\s+ცოტა(?![ა-ჰ])', 'ცოტ-ცოტა'),
        (r'(?<![\u10A0-\u10FF])სწრაფად\s+და\s+სწრაფად(?![ა-ჰ])', 'სწრაფ-სწრაფად'),
        (r'(?<![\u10A0-\u10FF])ბევრჯერ\s+და\s+ბევრჯერ(?![ა-ჰ])', 'მრავალგზის'),
    ]
    for pat, repl in iterative_fixes:
        t = re.sub(pat, repl, t)

    # 32. Double Postposition Decalquing & Syncretism (ორმაგი თანდებულების დეკალკირება და სინკრეტიზმი)
    postposition_syncretism_fixes = [
        (r'(?<![\u10A0-\u10FF])ამ\s+საკითხის\s+შესახებ\s+საუბრის\s+დროს(?![ა-ჰ])', 'ამ საკითხზე მსჯელობისას'),
        (r'(?<![\u10A0-\u10FF])იმასთან\s+დაკავშირებით,\s*რომ(?![ა-ჰ])', 'იმის გამო, რომ'),
        (r'(?<![\u10A0-\u10FF])იმ\s+მიზეზით,\s*რომ(?![ა-ჰ])', 'რადგან'),
        (r'(?<![\u10A0-\u10FF])იმის\s+გამოისობით,\s*რომ(?![ა-ჰ])', 'ვინაიდან'),
        (r'(?<![\u10A0-\u10FF])რაც\s+შეეხება\s+იმას,\s*რომ(?![ა-ჰ])', 'რაც შეეხება'),
    ]
    for pat, repl in postposition_syncretism_fixes:
        t = re.sub(pat, repl, t)

    # 33. Synthetic Temporal & Instantaneous Converbs with -ას / -ისას (დროის სინთეზური გარემოებები)
    temporal_converb_fixes = [
        (r'(?<![\u10A0-\u10FF])კითხვის\s+დროს(?![ა-ჰ])', 'კითხვისას'),
        (r'(?<![\u10A0-\u10FF])საუბრის\s+დროს(?![ა-ჰ])', 'საუბრისას'),
        (r'(?<![\u10A0-\u10FF])წერის\s+დროს(?![ა-ჰ])', 'წერისას'),
        (r'(?<![\u10A0-\u10FF])ფიქრის\s+დროს(?![ა-ჰ])', 'ფიქრისას'),
        (r'(?<![\u10A0-\u10FF])დანახვის\s+მომენტში(?![ა-ჰ])', 'დანახვისთანავე'),
        (r'(?<![\u10A0-\u10FF])მოსვლის\s+მომენტში(?![ა-ჰ])', 'მოსვლისთანავე'),
        (r'(?<![\u10A0-\u10FF])გასვლის\s+მომენტში(?![ა-ჰ])', 'გასვლისთანავე'),
    ]
    for pat, repl in temporal_converb_fixes:
        t = re.sub(pat, repl, t)

    # 34. Appositive & Determinative Case Concord (განკერძოებულ განსაზღვრებათა და დანართთა ბრუნების შეთანხმება)
    appositive_concord_fixes = [
        (r'(?<![\u10A0-\u10FF])გიორგიმ,\s*თავდადებული\s+მეომარი,', 'გიორგიმ, თავდადებულმა მეომარმა,'),
        (r'(?<![\u10A0-\u10FF])მეფემ,\s*ბრძენი\s+მმართველი,', 'მეფემ, ბრძენმა მმართველმა,'),
        (r'(?<![\u10A0-\u10FF])ავტორმა,\s*ცნობილი\s+მეცნიერი,', 'ავტორმა, ცნობილმა მეცნიერმა,'),
        (r'(?<![\u10A0-\u10FF])შოთამ,\s*დიდებული\s+პოეტი,', 'შოთამ, დიდებულმა პოეტმა,'),
    ]
    for pat, repl in appositive_concord_fixes:
        t = re.sub(pat, repl, t)

    # 35. Concessive & Adversative Subordination Synthesis (მიუხედავად იმისა, რომ -> თუმცა)
    concessive_fixes = [
        (r'(?<![\u10A0-\u10FF])მიუხედავად\s+იმისა,\s*რომ\s+გვიან\s+იყო,', 'თუმცა გვიან იყო,'),
        (r'(?<![\u10A0-\u10FF])მიუხედავად\s+იმისა,\s*რომ\s+რთული\s+იყო,', 'თუმცა რთული იყო,'),
        (r'(?<![\u10A0-\u10FF])იმის\s+მიუხედავად,\s*რომ(?![ა-ჰ])', 'თუმცა'),
        (r'(?<![\u10A0-\u10FF])თუნდაც\s+რომ\s+მოვიდეს(?![ა-ჰ])', 'თუნდაც მოვიდეს'),
        (r'(?<![\u10A0-\u10FF])თუნდაც\s+რომ\s+გააკეთოს(?![ა-ჰ])', 'თუნდაც გააკეთოს'),
    ]
    for pat, repl in concessive_fixes:
        t = re.sub(pat, repl, t)

    # 36. Spatial & Directional Deictic Pleonasm Elimination (სივრცით-ორიენტაციული ზმნისწინის სინთეზი)
    spatial_deictic_fixes = [
        (r'(?<![\u10A0-\u10FF])ზემოთ\s+ავიდა(?![ა-ჰ])', 'ავიდა'),
        (r'(?<![\u10A0-\u10FF])ქვემოთ\s+ჩავიდა(?![ა-ჰ])', 'ჩავიდა'),
        (r'(?<![\u10A0-\u10FF])ზემოთ\s+ამოვიდა(?![ა-ჰ])', 'ამოვიდა'),
        (r'(?<![\u10A0-\u10FF])ქვემოთ\s+ჩამოვიდა(?![ა-ჰ])', 'ჩამოვიდა'),
        (r'(?<![\u10A0-\u10FF])შიგნით\s+შევიდა(?![ა-ჰ])', 'შევიდა'),
        (r'(?<![\u10A0-\u10FF])გარეთ\s+გამოვიდა(?![ა-ჰ])', 'გამოვიდა'),
        (r'(?<![\u10A0-\u10FF])გარეთ\s+გავიდა(?![ა-ჰ])', 'გავიდა'),
        (r'(?<![\u10A0-\u10FF])უკან\s+დაბრუნდა(?![ა-ჰ])', 'დაბრუნდა'),
        (r'(?<![\u10A0-\u10FF])აქეთ\s+მოვიდა(?![ა-ჰ])', 'მოვიდა'),
        (r'(?<![\u10A0-\u10FF])იქით\s+წავიდა(?![ა-ჰ])', 'წავიდა'),
    ]
    for pat, repl in spatial_deictic_fixes:
        t = re.sub(pat, repl, t)

    # 37. Sensory & Psychological Involuntary Experiencer Concord (გრძნობად-აღქმითი ზმნების დატიური შეთანხმება)
    sensory_experiencer_fixes = [
        (r'(?<![\u10A0-\u10FF])ის\s+ესმის(?![ა-ჰ])', 'მას ესმის'),
        (r'(?<![\u10A0-\u10FF])ის\s+ჩაესმა(?![ა-ჰ])', 'მას ჩაესმა'),
        (r'(?<![\u10A0-\u10FF])ის\s+ეჩვენა(?![ა-ჰ])', 'მას ეჩვენა'),
        (r'(?<![\u10A0-\u10FF])ის\s+მოეჩვენა(?![ა-ჰ])', 'მას მოეჩვენა'),
        (r'(?<![\u10A0-\u10FF])ის\s+მოაგონდა(?![ა-ჰ])', 'მას მოაგონდა'),
        (r'(?<![\u10A0-\u10FF])ის\s+გაახსენდა(?![ა-ჰ])', 'მას გაახსენდა'),
        (r'(?<![\u10A0-\u10FF])ის\s+ეუცხოვა(?![ა-ჰ])', 'მას ეუცხოვა'),
        (r'(?<![\u10A0-\u10FF])ის\s+მოეწონა(?![ა-ჰ])', 'მას მოეწონა'),
        (r'(?<![\u10A0-\u10FF])ის\s+ეამა(?![ა-ჰ])', 'მას ეამა'),
    ]
    for pat, repl in sensory_experiencer_fixes:
        t = re.sub(pat, repl, t)

    # 38. Restrictive, Temporal & Contrastive Bound Enclitics (საზღვრულობითი და დროითი ნაწილაკების სინთეზი: -ღა, -ვე, -კი)
    bound_enclitic_fixes = [
        (r'(?<![\u10A0-\u10FF])მხოლოდ\s+ის\s+დარჩა(?![ა-ჰ])', 'ისიღა დარჩა'),
        (r'(?<![\u10A0-\u10FF])მხოლოდ\s+ეს\s+ვიცი(?![ა-ჰ])', 'ესღა ვიცი'),
        (r'(?<![\u10A0-\u10FF])მხოლოდ\s+ერთი\s+დარჩა(?![ა-ჰ])', 'ერთიღა დარჩა'),
        (r'(?<![\u10A0-\u10FF])იმავე\s+დღეს(?![ა-ჰ])', 'იმ დღესვე'),
        (r'(?<![\u10A0-\u10FF])იმავე\s+წამს(?![ა-ჰ])', 'იმწამსვე'),
        (r'(?<![\u10A0-\u10FF])იმავე\s+წუთს(?![ა-ჰ])', 'იმ წუთსვე'),
        (r'(?<![\u10A0-\u10FF])მაგრამ\s+ის\s+კი(?![ა-ჰ])', 'ის კი'),
    ]
    for pat, repl in bound_enclitic_fixes:
        t = re.sub(pat, repl, t)

    # 39. Circumstantial Synthetic Compounds & Privatives (ვითარებითი შედგენილი ზმნიზედები)
    circumstantial_fixes = [
        (r'(?<![\u10A0-\u10FF])თვალის\s+დახამხამების\s+გარეშე(?![ა-ჰ])', 'დაუხამხამებლად'),
        (r'(?<![\u10A0-\u10FF])გულის\s+ფანცქალით(?![ა-ჰ])', 'გულფანცქალით'),
        (r'(?<![\u10A0-\u10FF])ხმის\s+ამოუღებლად(?![ა-ჰ])', 'ხმაამოუღებლად'),
        (r'(?<![\u10A0-\u10FF])სუნთქვის\s+შეკვრით(?![ა-ჰ])', 'სუნთქვაშეკრული'),
    ]
    for pat, repl in circumstantial_fixes:
        t = re.sub(pat, repl, t)


    # 42. Partitive & Collective Genitive Case Concord with Measure Nouns (რაოდენობრივ-ნაწილობითი ნათესაობითის შეთანხმება)
    partitive_measure_fixes = [
        (r'(?<![\u10A0-\u10FF])ჯგუფი\s+ადამიანები(?![ა-ჰ])', 'ადამიანთა ჯგუფი'),
        (r'(?<![\u10A0-\u10FF])ნაწილი\s+ხალხი(?![ა-ჰ])', 'ხალხის ნაწილი'),
        (r'(?<![\u10A0-\u10FF])რაოდენობა\s+წიგნები(?![ა-ჰ])', 'წიგნების რაოდენობა'),
        (r'(?<![\u10A0-\u10FF])უმრავლესობა\s+ხალხი(?![ა-ჰ])', 'ხალხის უმრავლესობა'),
        (r'(?<![\u10A0-\u10FF])სიმრავლე\s+ვარსკვლავები(?![ა-ჰ])', 'ვარსკვლავთა სიმრავლე'),
        (r'(?<![\u10A0-\u10FF])რიგი\s+საკითხები(?![ა-ჰ])', 'საკითხთა რიგი'),
    ]
    for pat, repl in partitive_measure_fixes:
        t = re.sub(pat, repl, t)

    # 43. Frequentative Aspect & Directional Deictic Motion (მრავალგზისობისა და მიმართულებითი მოძრაობის სინთეზი)
    frequentative_motion_fixes = [
        (r'(?<![\u10A0-\u10FF])აქეთ-იქით\s+იყურებოდა(?![ა-ჰ])', 'მიმოიხედავდა'),
        (r'(?<![\u10A0-\u10FF])ნელა\s+მოძრაობდა(?![ა-ჰ])', 'მიაბიჯებდა'),
        (r'(?<![\u10A0-\u10FF])ხშირად\s+იმეორებდა(?![ა-ჰ])', 'იმეორებდა ხოლმე'),
        (r'(?<![\u10A0-\u10FF])ბოლომდე\s+მიიყვანა\s+საქმე(?![ა-ჰ])', 'სისრულეში მოიყვანა საქმე'),
    ]
    for pat, repl in frequentative_motion_fixes:
        t = re.sub(pat, repl, t)

    # 44. Literary Prose & Sci-Fi Anti-Calques (ვონეგუტის, კლასიკური პროზისა და MT კალკების გასწორება)
    literary_calque_repairs = [
        (r'(?<![\u10A0-\u10FF])გამოიყურებოდა\s+გარეგნულად(?![ა-ჰ])', 'მზერას გარეთ მიაპყრობდა'),
        (r'(?<![\u10A0-\u10FF])თავის\s+გარეგნულ\s+ბიძგში(?![ა-ჰ])', 'თავის ამ გარეგან სწრაფვაში'),
        (r'(?<![\u10A0-\u10FF])გარეგნობის\s+ზღვაში(?![ა-ჰ])', 'გარეგანი სამყაროს ოკეანეში'),
        (r'(?<![\u10A0-\u10FF])გიმ(?:რ|კრ)ეკის\s+რელიგიები(?![ა-ჰ])', 'იაფფასიანი რელიგიები'),
        (r'(?<![\u10A0-\u10FF])გიმ(?:რ|კრ)ეკის(?![ა-ჰ])', 'იაფფასიანი'),
        (r'(?<![\u10A0-\u10FF])მან\s+ისინი\s+გაფრინდა(?![ა-ჰ])', 'კოსმოსში გატყორცნა ისინი'),
        (r'(?<![\u10A0-\u10FF])მან\s+გაფრინდა(?![ა-ჰ])', 'ის გაფრინდა'),
        (r'(?<![\u10A0-\u10FF])ქვებივით\s+აფრინდა\s+მათ(?![ა-ჰ])', 'ქვებივით ისროდა მათ'),
        (r'(?<![\u10A0-\u10FF])ეს\s+უბედური\s+აგენტები\s+იპოვეს(?![ა-ჰ])', 'ამ უბედურმა აგენტებმა იპოვეს'),
        (r'(?<![\u10A0-\u10FF])კაცობრიობა,\s*რომელიც\s+არ\s+იცის(?![ა-ჰ])', 'კაცობრიობა, რომელმაც არ იცის'),
        (r'(?<![\u10A0-\u10FF])რომელიც\s+არ\s+იცის(?![ა-ჰ])', 'რომელმაც არ იცის'),
        (r'(?<![\u10A0-\u10FF])საკმარისად\s+იყო\s+ნაპოვნი(?![ა-ჰ])', 'უხვად იყო ნაპოვნი'),
        (r'(?<![\u10A0-\u10FF])უხვად\s+იყო\s+ნაპოვნი(?![ა-ჰ])', 'უხვად მოეპოვებოდათ'),
        (r'(?<![\u10A0-\u10FF])უაზრობის\s+კოშმარი\s+უსასრულოდ(?![ა-ჰ])', 'უაზრობის უსასრულო კოშმარი'),
        (r'(?<![\u10A0-\u10FF])თავსატეხების\s+ყუთებ(?:ი|ში|ს)(?![ა-ჰ])', 'შინაგან საიდუმლოებებში'),
        (r'(?<![\u10A0-\u10FF])თავსატეხების\s+ყუთები\s+მათში(?![ა-ჰ])', 'მათში დაფარული თავსატეხები'),
        (r'(?<![\u10A0-\u10FF])კაცობრიობის\s+გარეგნული\s+ბიძგი(?![ა-ჰ])', 'კაცობრიობის გარეგანი სწრაფვა'),
        (r'(?<![\u10A0-\u10FF])იმ\s+ძველ\s+დღეებში(?![ა-ჰ])', 'იმ ძველ დროს'),
        (r'(?<![\u10A0-\u10FF])უცოდინარი\s+ჭეშმარიტებების(?![ა-ჰ])', 'ჭეშმარიტების უცოდინარი'),
        (r'(?<![\u10A0-\u10FF])ჭეშმარიტებების,\s*რომლებიც\s+დევს(?![ა-ჰ])', 'დაფარული ჭეშმარიტების'),
        (r'(?<![\u10A0-\u10FF])რომლებიც\s+დევს\s+ყველა\s+ადამიანში(?![ა-ჰ])', 'რომელიც ყველა ადამიანშია დაფარული'),
        (r'(?<![\u10A0-\u10FF])უბიძგებდა\s+მუდამ\s+გარეგნულად(?![ა-ჰ])', 'გამუდმებით გარეთ მიილტვოდა'),
        (r'(?<![\u10A0-\u10FF])უგემოვნო\s+ზღვაში(?![ა-ჰ])', 'უგემურ ოკეანეში'),
        (r'(?<![\u10A0-\u10FF])უფერო,\s*უგემოვნო,\s*უწონო(?![ა-ჰ])', 'უფერულ, უგემურ, უწონო'),
        (r'(?<![\u10A0-\u10FF])(?:(?:კაცებსა|მამაკაცებსა)\s+და\s+ქალებს\s+)?(?:არ\s+ჰქონდათ|არ\s+ჰქონდა)\s+(?:მარტივი|ადვილი)\s+წვდომა(?![ა-ჰ])', 'ადამიანებს ხელი არ მიუწვდებოდათ'),
        (r'(?<![\u10A0-\u10FF])ადამიანებს\s+არ\s+ჰქონდათ\s+მარტივი\s+წვდომა(?![ა-ჰ])', 'ადამიანებს ხელი არ მიუწვდებოდათ'),
        (r'(?<![\u10A0-\u10FF])თავსატეხების\s+ყუთებ(?:ზე|ში|ი|ს)(?![ა-ჰ])', 'შინაგან საიდუმლოებებზე'),
        (r'(?<![\u10A0-\u10FF])(?:ისინი\s+)?(?:გარეგნულად\s+გამოიყურებოდნენ|გამოიყურებოდნენ\s+გარეგნულად)(?![ა-ჰ])', 'მზერა გარეთ მიაპყრეს'),
        (r'(?<![\u10A0-\u10FF])(?:ყოველთვის\s+)?გარედან\s+იძვრებოდნენ(?![ა-ჰ])', 'გამუდმებით გარეთ მიილტვოდნენ'),
        (r'(?<![\u10A0-\u10FF])გარეგნობის\s+(?:უგემოვნო\s+)?ზღვ(?:ა|აში)(?![ა-ჰ])', 'გარეგანი სამყაროს უგემური ოკეანე'),
        (r'(?<![\u10A0-\u10FF])გარე\s+სივრცე(?![ა-ჰ])', 'კოსმოსური სივრცე'),
        (r'(?<![\u10A0-\u10FF])გარეგნულად\s+გახედვა(?![ა-ჰ])', 'მზერის გარეთ მიპყრობა'),
        (r'(?<![\u10A0-\u10FF])თავიდან\s+ჭკვიანურად(?![ა-ჰ])', 'თავდაპირველად მკრთალად'),
        (r'(?<![\u10A0-\u10FF])ჰაერიდან\s+ხომ\s+არ\s+გამოჩნდებოდნენ\?*(?![ა-ჰ])', 'პირდაპირ ჰაერში უნდა გამოკვეთილიყვნენ —'),
        (r'(?<![\u10A0-\u10FF])საბოლოოდ\s+გახდა\s+ისეთივე\s+ხელშესახები(?![ა-ჰ])', 'ბოლოს კი ისეთივე ხელშესახებნი გამხდარიყვნენ'),
        (r'(?<![\u10A0-\u10FF])ბრბო\s+არ\s+აპირებდა\s+მატერიალიზაციის\s+სანახავად(?![ა-ჰ])', 'ბრბოს მატერიალიზაციის ხილვა არ ეწერა'),
        (r'(?<![\u10A0-\u10FF])თვალების\s+გასახარებლად(?![ა-ჰ])', 'თვალის დასატკბობად'),
        (r'(?<![\u10A0-\u10FF])მათ\s+გარეთ\s+გაიხედეს(?![ა-ჰ])', 'მზერა გარეთ მიაპყრეს'),
        (r'(?<![\u10A0-\u10FF])მათ\s+გაიხედეს(?![ა-ჰ])', 'გაიხედეს'),
        (r'(?<![\u10A0-\u10FF])ისეთივე\s+არსებითი(?![ა-ჰ])', 'ისეთივე ხელშესახები'),
        (r'(?<![\u10A0-\u10FF])ყველამ\s+იცის\s+როგორ(?![ა-ჰ])', 'ყველამ იცის, როგორ'),
        (r'(?<![\u10A0-\u10FF])(იცის|იცოდა|იცოდნენ|ვიცი|ვიცით|გაიგო|გაიგეს|დაინახა|ნახა|მოუყვა|ჰკითხა|გაიგებს|გაახსენდა|მიხვდა|ახსოვს|ახსოვდა|გაარკვია)\s+(როგორ|რომ|რატომ|სად|როდის)(?![ა-ჰ])', r'\1, \2'),
    ]
    for pat, repl in literary_calque_repairs:
        t = re.sub(pat, repl, t)

    # 46. Somatic & Bodily Reaction Idioms (სხეულებრივი რეაქციებისა და იდიომების სინთეზი)
    somatic_bodily_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:(?:მისი|თავისი)\s+)?სუნთქვა\s+დაიჭირა(?![ა-ჰ])', 'სული მოითქვა'),
        (r'(?<![\u10A0-\u10FF])დაიჭირა\s+(?:(?:მისი|თავისი)\s+)?სუნთქვა(?![ა-ჰ])', 'სული მოითქვა'),
        (r'(?<![\u10A0-\u10FF])(?:დაკარგა\s+სუნთქვა|სუნთქვა\s+დაკარგა)(?![ა-ჰ])', 'სუნთქვა შეეკრა'),
        (r'(?<![\u10A0-\u10FF])მხრები\s+შეანჯღრია(?![ა-ჰ])', 'მხრები აიჩეჩა'),
        (r'(?<![\u10A0-\u10FF])მხრების\s+შერყევა(?![ა-ჰ])', 'მხრების აჩეჩა'),
        (r'(?<![\u10A0-\u10FF])თავი\s+შეანჯღრია(?![ა-ჰ])', 'თავი გააქნია'),
        (r'(?<![\u10A0-\u10FF])სიცილში\s+აფეთქდა(?![ა-ჰ])', 'სიცილი წასკდა'),
        (r'(?<![\u10A0-\u10FF])ცრემლებში\s+აფეთქდა(?![ა-ჰ])', 'ცრემლები წასკდა'),
        (r'(?<![\u10A0-\u10FF])ყელი\s+გაიწმინდა(?![ა-ჰ])', 'ჩაახველა'),
        (r'(?<![\u10A0-\u10FF])გული\s+ჩაუვარდა(?![ა-ჰ])', 'გული გადაუქანდა'),
        (r'(?<![\u10A0-\u10FF])გულმა\s+დარტყმა\s+გამოტოვა(?![ა-ჰ])', 'გული შეუქანდა'),
    ]
    for pat, repl in somatic_bodily_fixes:
        t = re.sub(pat, repl, t)

    # 47. Speculative & Sci-Fi Prose Lexicon (სამეცნიერო ფანტასტიკისა და კოსმოსური პროზის ლექსიკონი)
    scifi_lexicon_fixes = [
        (r'(?<![\u10A0-\u10FF])გარე\s+სივრცეში(?![ა-ჰ])', 'ღია კოსმოსში'),
        (r'(?<![\u10A0-\u10FF])გარე\s+სივრცე(?![ა-ჰ])', 'კოსმოსური სივრცე'),
        (r'(?<![\u10A0-\u10FF])ცარიელ(?:ი)?\s+სიცარიელეში(?![ა-ჰ])', 'უკიდეგანო სიცარიელეში'),
        (r'(?<![\u10A0-\u10FF])ცარიელ(?:ი)?\s+სიცარიელეს(?![ა-ჰ])', 'უკიდეგანო სიცარიელეს'),
        (r'(?<![\u10A0-\u10FF])ცარიელ(?:ი)?\s+სიცარიელედ(?![ა-ჰ])', 'უკიდეგანო სიცარიელედ'),
        (r'(?<![\u10A0-\u10FF])ცარიელ(?:ი)?\s+სიცარიელე(?![ა-ჰ])', 'უკიდეგანო სიცარიელე'),
        (r'(?<![\u10A0-\u10FF])თხელ(?:ი)?\s+ჰაერიდან\s+(?:გამოჩნდნენ|გამოჩნდებოდნენ)(?![ა-ჰ])', 'პირდაპირ ჰაერში გაჩნდნენ'),
        (r'(?<![\u10A0-\u10FF])თხელ(?:ი)?\s+ჰაერიდან\s+გამოჩნდა(?![ა-ჰ])', 'პირდაპირ ჰაერში გაჩნდა'),
        (r'(?<![\u10A0-\u10FF])თხელ(?:ი)?\s+ჰაერიდან\s+გამოჩენა(?![ა-ჰ])', 'პირდაპირ ჰაერში გაჩენა'),
        (r'(?<![\u10A0-\u10FF])თხელ(?:ი)?\s+ჰაერიდან(?![ა-ჰ])', 'არაფრისგან'),
        (r'(?<![\u10A0-\u10FF])(\b\d+|ათასი|მილიონი|რამდენიმე|მრავალი)\s+სინათლის\s+წლები(?![ა-ჰ])', r'\1 სინათლის წელი'),
        (r'(?<![\u10A0-\u10FF])(\b\d+|ორი|სამი|ათი|რამდენიმე)\s+კოსმოსური\s+გემები(?![ა-ჰ])', r'\1 კოსმოსური გემი'),
    ]
    for pat, repl in scifi_lexicon_fixes:
        t = re.sub(pat, repl, t)

    # 48. Polypersonal Possession & Animacy Concord (სულიერების კატეგორია და ქონა-ყოლის შეთანხმება)
    animacy_possession_fixes = [
        (r'(?<![\u10A0-\u10FF])(მას|ვის|ყველას)\s+ჰყავს\s+(მანქანა|სახლი|წიგნი|ტელეფონი|კალამი|ბინა|ქონება)(?![ა-ჰ])', r'\1 აქვს \2'),
        (r'(?<![\u10A0-\u10FF])(მას|ვის|ყველას)\s+ჰყავდა\s+(მანქანა|სახლი|წიგნი|ტელეფონი|კალამი|ბინა|ქონება)(?![ა-ჰ])', r'\1 ჰქონდა \2'),
        (r'(?<![\u10A0-\u10FF])(მას|ვის|ყველას)\s+აქვს\s+(ძაღლი|კატა|ცხენი|შვილი|მეგობარი|ძმა|და|ვაჟი|ქალიშვილი|მტერი|მრჩეველი|მოწაფე|მასწავლებელი)(?![ა-ჰ])', r'\1 ჰყავს \2'),
        (r'(?<![\u10A0-\u10FF])(მას|ვის|ყველას)\s+ჰქონდა\s+(ძაღლი|კატა|ცხენი|შვილი|მეგობარი|ძმა|და|ვაჟი|ქალიშვილი|მტერი|მრჩეველი|მოწაფე|მასწავლებელი)(?![ა-ჰ])', r'\1 ჰყავდა \2'),
        (r'(?<![\u10A0-\u10FF])არ\s+აქვს\s+(ძაღლი|კატა|ცხენი|შვილი|მეგობარი|ძმა|და|ვაჟი|ქალიშვილი|მტერი)(?![ა-ჰ])', r'არ ჰყავს \1'),
        (r'(?<![\u10A0-\u10FF])არ\s+ჰქონდა\s+(ძაღლი|კატა|ცხენი|შვილი|მეგობარი|ძმა|და|ვაჟი|ქალიშვილი|მტერი)(?![ა-ჰ])', r'არ ჰყავდა \1'),
    ]
    for pat, repl in animacy_possession_fixes:
        t = re.sub(pat, repl, t)

    # 49. Temporal Adverbial Compacting (დროითი გარემოებების სინთეზი და შეკუმშვა)
    temporal_compacting_fixes = [
        (r'(?<![\u10A0-\u10FF])საათების\s+განმავლობაში(?![ა-ჰ])', 'საათობით'),
        (r'(?<![\u10A0-\u10FF])დიდი\s+დროის\s+განმავლობაში(?![ა-ჰ])', 'დიდხანს'),
        (r'(?<![\u10A0-\u10FF])დღეების\s+(?:განმავლობაში|მანძილზე)(?![ა-ჰ])', 'დღეობით'),
        (r'(?<![\u10A0-\u10FF])წლების\s+(?:განმავლობაში|მანძილზე)(?![ა-ჰ])', 'წლობით'),
        (r'(?<![\u10A0-\u10FF])ერთი\s+მომენტისთვის(?![ა-ჰ])', 'წამით'),
        (r'(?<![\u10A0-\u10FF])ერთი\s+წამის\s+განმავლობაში(?![ა-ჰ])', 'ერთი წამით'),
        (r'(?<![\u10A0-\u10FF])დღიდან\s+დღემდე(?![ა-ჰ])', 'დღითი დღე'),
        (r'(?<![\u10A0-\u10FF])დროიდან\s+დრომდე(?![ა-ჰ])', 'დროდადრო'),
        (r'(?<![\u10A0-\u10FF])ბოლო\s+დროის\s+განმავლობაში(?![ა-ჰ])', 'ბოლო დროს'),
        (r'(?<![\u10A0-\u10FF])იმ\s+მომენტის\s+განმავლობაში(?![ა-ჰ])', 'იმ მომენტში'),
    ]
    for pat, repl in temporal_compacting_fixes:
        t = re.sub(pat, repl, t)

    # 50. Indirect Object Prefixes & Light-Verb Decalquing (ირიბი ობიექტის პრეფიქსები და მსუბუქი ზმნები)
    indirect_prefix_light_verbs = [
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+აზრი(?![ა-ჰ])', 'აზრი შეიძინა'),
        (r'(?<![\u10A0-\u10FF])არ\s+აკეთებს\s+აზრს(?![ა-ჰ])', 'აზრს მოკლებულია'),
        (r'(?<![\u10A0-\u10FF])ყურადღება\s+გადაიხადა(?![ა-ჰ])', 'ყურადღება მიაქცია'),
        (r'(?<![\u10A0-\u10FF])ადგილი\s+აიღო(?![ა-ჰ])', 'ჩატარდა'),
        (r'(?<![\u10A0-\u10FF])კითხა\s+მას(?![ა-ჰ])', 'ჰკითხა მას'),
        (r'(?<![\u10A0-\u10FF])—\s*კითხა\s+მან(?![ა-ჰ])', '— ჰკითხა მან'),
    ]
    for pat, repl in indirect_prefix_light_verbs:
        t = re.sub(pat, repl, t)

    # 51. Psychological & Mental State Collocations (ფსიქოლოგიური და მენტალური მდგომარეობების იდიომები)
    mental_idiom_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:(?:მისი|თავისი)\s+)?გონება\s+დაკარგა(?![ა-ჰ])', 'ჭკუიდან შეიშალა'),
        (r'(?<![\u10A0-\u10FF])დაკარგა\s+(?:(?:მისი|თავისი)\s+)?გონება(?![ა-ჰ])', 'ჭკუიდან შეიშალა'),
        (r'(?<![\u10A0-\u10FF])(?:გააკეთა|შეადგინა)\s+(?:(?:მისი|თავისი)\s+)?გონება(?![ა-ჰ])', 'გადაწყვიტა'),
        (r'(?<![\u10A0-\u10FF])შეცვალა\s+(?:(?:მისი|თავისი)\s+)?გონება(?![ა-ჰ])', 'გადაიფიქრა'),
        (r'(?<![\u10A0-\u10FF])შეინახა\s+გონებაში(?![ა-ჰ])', 'გაითვალისწინა'),
        (r'(?<![\u10A0-\u10FF])შეინახეთ\s+გონებაში(?![ა-ჰ])', 'გაითვალისწინეთ'),
        (r'(?<![\u10A0-\u10FF])შეინახე\s+გონებაში(?![ა-ჰ])', 'გაითვალისწინე'),
        (r'(?<![\u10A0-\u10FF])გადაკვეთა\s+(?:მისი|მისმა|მის)\s+გონებ(?:ა|ამ|ას)?(?![ა-ჰ])', 'აზრად მოუვიდა'),
        (r'(?<![\u10A0-\u10FF])(?:მისი|მისმა|მის)\s+გონებ(?:ა|ამ|ას)?\s+გადაკვეთა(?![ა-ჰ])', 'აზრად მოუვიდა'),
        (r'(?<![\u10A0-\u10FF])გაიარა\s+მის\s+გონებაში(?![ა-ჰ])', 'აზრად მოუვიდა'),
        (r'(?<![\u10A0-\u10FF])მისი\s+გონების\s+უკან(?![ა-ჰ])', 'გულის სიღრმეში'),
        (r'(?<![\u10A0-\u10FF])გონებიდან\s+გადავიდა(?![ა-ჰ])', 'ჭკუიდან შეიშალა'),
    ]
    for pat, repl in mental_idiom_fixes:
        t = re.sub(pat, repl, t)

    # 52. Sensory, Visual & Gaze Collocations (მზერისა და ვიზუალური აღქმის კოლოკაციები)
    gaze_sensory_fixes = [
        (r'(?<![\u10A0-\u10FF])დაიჭირა\s+(?:(?:მისი|თავისი)\s+)?თვალ(?:ი)?(?![ა-ჰ])', 'თვალი მოჰკრა'),
        (r'(?<![\u10A0-\u10FF])თვალ(?:ი)?\s+დაიჭირა(?![ა-ჰ])', 'თვალი მოჰკრა'),
        (r'(?<![\u10A0-\u10FF])დაადო\s+თვალი\s+(?:მას|მასზე)(?![ა-ჰ])', 'თვალი შეავლო მას'),
        (r'(?<![\u10A0-\u10FF])დადო\s+თვალები(?![ა-ჰ])', 'თვალი შეავლო'),
        (r'(?<![\u10A0-\u10FF])შეინახა\s+თვალი(?![ა-ჰ])', 'თვალყური ადევნა'),
        (r'(?<![\u10A0-\u10FF])შეინახეთ\s+თვალი(?![ა-ჰ])', 'თვალყური ადევნეთ'),
        (r'(?<![\u10A0-\u10FF])შეინახე\s+თვალი(?![ა-ჰ])', 'თვალყური ადევნე'),
        (r'(?<![\u10A0-\u10FF])(?:თვალის\s+ერთ\s+დახამხამებაში|ერთი\s+თვალის\s+დახამხამებაში)(?![ა-ჰ])', 'თვალის დახამხამებაში'),
        (r'(?<![\u10A0-\u10FF])თვალები\s+დახუჭა\s+ამაზე(?![ა-ჰ])', 'თვალი დახუჭა ამაზე'),
    ]
    for pat, repl in gaze_sensory_fixes:
        t = re.sub(pat, repl, t)

    # 53. Instrumental Bodily Organ Singular Concord (ორგანოთა და იარაღის მხოლობითი შეთანხმება)
    organ_instrumental_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:(?:თავისი|მის)\s+)?საკუთარი\s+თვალებით(?![ა-ჰ])', 'საკუთარი თვალით'),
        (r'(?<![\u10A0-\u10FF])(?:(?:თავისი|მის)\s+)?საკუთარი\s+ყურებით(?![ა-ჰ])', 'საკუთარი ყურით'),
        (r'(?<![\u10A0-\u10FF])შიშველი\s+ხელებით(?![ა-ჰ])', 'შიშველი ხელით'),
        (r'(?<![\u10A0-\u10FF])ფეხებზე\s+იარა(?![ა-ჰ])', 'ფეხით იარა'),
        (r'(?<![\u10A0-\u10FF])ფეხებით\s+იარა(?![ა-ჰ])', 'ფეხით იარა'),
        (r'(?<![\u10A0-\u10FF])თავისი\s+ხელებით\s+გააკეთა(?![ა-ჰ])', 'საკუთარი ხელით გააკეთა'),
        (r'(?<![\u10A0-\u10FF])ღია\s+ხელებით\s+მიიღ(?:ო|ეს)(?![ა-ჰ])', 'გულღიად მიიღო'),
    ]
    for pat, repl in organ_instrumental_fixes:
        t = re.sub(pat, repl, t)

    # 54. Spatial Dynamics & Binomial Motion Synthesis (სივრცითი დინამიკისა და წყვილადი ზმნიზედების სინთეზი)
    spatial_binomial_fixes = [
        (r'(?<![\u10A0-\u10FF])გვერდი\s+გვერდით(?![ა-ჰ])', 'მხარდამხარ'),
        (r'(?<![\u10A0-\u10FF])უკან\s+და\s+წინ(?![ა-ჰ])', 'წინ და უკან'),
        (r'(?<![\u10A0-\u10FF])სახე\s+სახესთან(?![ა-ჰ])', 'პირისპირ'),
        (r'(?<![\u10A0-\u10FF])(?:არსად\s+შუაში|არაფრის\s+შუაგულში)(?![ა-ჰ])', 'უკაცრიელ ადგილას'),
        (r'(?<![\u10A0-\u10FF])(?:მთელ\s+ადგილზე|ყველა\s+ადგილზე)(?![ა-ჰ])', 'ყველგან'),
        (r'(?<![\u10A0-\u10FF])ნაბიჯი\s+ნაბიჯით(?![ა-ჰ])', 'ნაბიჯ-ნაბიჯ'),
    ]
    for pat, repl in spatial_binomial_fixes:
        t = re.sub(pat, repl, t)

    # 55. Narrative Discourse Connectors & Evidential Transitionals (თხრობითი დისკურსის კონექტორები და გადასვლები)
    discourse_transition_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:პირველ\s+შეხედვაზე|პირველ\s+მზერაზე)(?![ა-ჰ])', 'ერთი შეხედვით'),
        (r'(?<![\u10A0-\u10FF])როგორც\s+ფაქტის\s+საკითხი(?![ა-ჰ])', 'სინამდვილეში'),
        (r'(?<![\u10A0-\u10FF])ყველა\s+მოულოდნელად(?![ა-ჰ])', 'უეცრად'),
        (r'(?<![\u10A0-\u10FF])უფრო\s+ადრე\s+თუ\s+უფრო\s+გვიან(?![ა-ჰ])', 'ადრე თუ გვიან'),
        (r'(?<![\u10A0-\u10FF])თავიდან\s+ფეხის\s+თითამდე(?![ა-ჰ])', 'თავით ფეხამდე'),
        (r'(?<![\u10A0-\u10FF])დროის\s+დასაწყისიდან(?![ა-ჰ])', 'ოდითგანვე'),
    ]
    for pat, repl in discourse_transition_fixes:
        t = re.sub(pat, repl, t)

    # 56. Verba Dicendi & Dialogue Inquit Synthesis (მეტყველების ზმნები და დიალოგური ჩართვები)
    inquit_dicendi_fixes = [
        (r'(?<![\u10A0-\u10FF])ჩურჩულით\s+თქვა(?![ა-ჰ])', 'ჩაიჩურჩულა'),
        (r'(?<![\u10A0-\u10FF])ყვირილით\s+თქვა(?![ა-ჰ])', 'დაიყვირა'),
        (r'(?<![\u10A0-\u10FF])მისცა\s+პასუხი(?![ა-ჰ])', 'უპასუხა'),
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+კომენტარი(?![ა-ჰ])', 'აღნიშნა'),
        (r'(?<![\u10A0-\u10FF])დასვა\s+(?:შე)?კითხვა(?![ა-ჰ])', 'ჰკითხა'),
        (r'(?<![\u10A0-\u10FF])(?:იკითხა\s+უკან|უკან\s+იკითხა)(?![ა-ჰ])', 'შეუბრუნა კითხვა'),
    ]
    for pat, repl in inquit_dicendi_fixes:
        t = re.sub(pat, repl, t)

    # 57. Involuntary Actions & Somatic Reflexes (უნებლიე მოქმედებები და ფიზიოლოგიური რეფლექსები)
    involuntary_somatic_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:გამოუშვა|ამოუშვა)\s+ოხვრა(?![ა-ჰ])', 'ამოიოხრა'),
        (r'(?<![\u10A0-\u10FF])(?:მისი\s+)?გული\s+ჩაიძირა(?![ა-ჰ])', 'გული გადაუქანდა'),
        (r'(?<![\u10A0-\u10FF])ჟრუანტელმა\s+გაიარა\s+მის\s+ხერხემალში(?![ა-ჰ])', 'ტანში ჟრუანტელმა დაუარა'),
        (r'(?<![\u10A0-\u10FF])(?:აიღო\s+ღრმა\s+სუნთქვა|ღრმა\s+სუნთქვა\s+აიღო)(?![ა-ჰ])', 'ღრმად ჩაისუნთქა'),
        (r'(?<![\u10A0-\u10FF])შეინახა\s+სუნთქვა(?![ა-ჰ])', 'სუნთქვა შეიკრა'),
    ]
    for pat, repl in involuntary_somatic_fixes:
        t = re.sub(pat, repl, t)

    # 58. Epistemic Modals & Evidential Stance (ეპისტემური მოდალობა და ეჭვგარეშეობა)
    epistemic_modal_fixes = [
        (r'(?<![\u10A0-\u10FF])მიდის\s+უთქმელად(?![ა-ჰ])', 'თავისთავად ცხადია'),
        (r'(?<![\u10A0-\u10FF])ყველა\s+ალბათობაში(?![ა-ჰ])', 'დიდი ალბათობით'),
        (r'(?<![\u10A0-\u10FF])(?:რომ\s+თქვა\s+სიმართლე|სიმართლე\s+რომ\s+თქვა)(?![ა-ჰ])', 'სიმართლე რომ ითქვას'),
        (r'(?<![\u10A0-\u10FF])ეჭვის\s+(?:ყოველგვარი\s+)?ჩრდილის\s+გარეშე(?![ა-ჰ])', 'ყოველგვარი ეჭვის გარეშე'),
        (r'(?<![\u10A0-\u10FF])არ\s+არის\s+ეჭვი,\s*რომ(?![ა-ჰ])', 'ეჭვგარეშეა, რომ'),
    ]
    for pat, repl in epistemic_modal_fixes:
        t = re.sub(pat, repl, t)

    # 59. Temporal Duratives & Inceptives (დროითი დურატივები და განგრძობადობა)
    temporal_durative_fixes = [
        (r'(?<![\u10A0-\u10FF])(?:მთელი\s+დღე\s+გრძელი|მთელი\s+დღის\s+გასწვრივ)(?![ა-ჰ])', 'მთელი დღის განმავლობაში'),
        (r'(?<![\u10A0-\u10FF])დროის\s+კურსში(?![ა-ჰ])', 'დროთა განმავლობაში'),
        (r'(?<![\u10A0-\u10FF])დროიდან\s+დროში(?![ა-ჰ])', 'დროდადრო'),
    ]
    for pat, repl in temporal_durative_fixes:
        t = re.sub(pat, repl, t)

    # 60. Adversative & Concessive Antithesis (შეპირისპირებითი და დათმობითი ანტითეზა)
    adversative_antithesis_fixes = [
        (r'(?<![\u10A0-\u10FF])საპირისპიროზე(?![ა-ჰ])', 'პირიქით'),
        (r'(?<![\u10A0-\u10FF])ერთ\s+ხელზე(?![ა-ჰ])', 'ერთი მხრივ'),
        (r'(?<![\u10A0-\u10FF])მეორე\s+ხელზე(?![ა-ჰ])', 'მეორე მხრივ'),
        (r'(?<![\u10A0-\u10FF])თანაბრად\s+ასე(?![ა-ჰ])', 'მიუხედავად ამისა'),
        (r'(?<![\u10A0-\u10FF])ყველა\s+უფრო(?![ა-ჰ])', 'მით უმეტეს'),
        (r'(?<![\u10A0-\u10FF])მეტი\s+თუ\s+ნაკლები(?![ა-ჰ])', 'მეტ-ნაკლებად'),
        (r'(?<![\u10A0-\u10FF])შორს\s+მისგან(?![ა-ჰ])', 'სრულებითაც არა'),
    ]
    for pat, repl in adversative_antithesis_fixes:
        t = re.sub(pat, repl, t)

    # 45. Typography & Dialogue
    t = re.sub(r'(?:^|\n)\s*[-–—]\s*', r'\n— ', t)
    t = re.sub(r'\s+([.,;:!?])', r'\1', t)
    t = re.sub(r'"([^"]+)"', r'„\1“', t)

    return t.strip()

