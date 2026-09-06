"""
Georgian Phonetics & Linguistic Verbalizer for Human-Like TTS Narration
Lumina Audio Studio / EngBot

Converts raw Georgian text containing numbers, dates, fractions, percentages,
currencies, units, Roman numerals, abbreviations, and Latin proper nouns into
fluent, phonetically accurate Mkhedruli script with natural narrative pauses.

Strictly avoids ASCII \\b word boundaries adjacent to Georgian Unicode characters
(\\u10A0-\\u10FF), using unicode lookbehind/lookahead boundaries instead.
"""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple

KA_CHARS = r"\u10A0-\u10FF"
KA_PREFIX = rf"(?<![{KA_CHARS}])"
KA_SUFFIX = rf"(?![{KA_CHARS}])"

# ── Georgian Number Words (Vigesimal System) ──────────────────────────────────
UNITS = ["", "ერთი", "ორი", "სამი", "ოთხი", "ხუთი", "ექვსი", "შვიდი", "რვა", "ცხრა"]
TEENS = [
    "ათი", "თერთმეტი", "თორმეტი", "ცამეტი", "თოთხმეტი",
    "თხუთმეტი", "თექვსმეტი", "ჩვიდმეტი", "თვრამეტი", "ცხრამეტი"
]
SCORE_PREFIXES = {1: "ოც", 2: "ორმოც", 3: "სამოც", 4: "ოთხმოც"}
HUNDREDS = {
    1: "ას", 2: "ორას", 3: "სამას", 4: "ოთხას",
    5: "ხუთას", 6: "ექვსას", 7: "შვიდას", 8: "რვაას", 9: "ცხრაას"
}

ORDINALS_1_TO_10 = {
    1: "პირველი", 2: "მეორე", 3: "მესამე", 4: "მეოთხე", 5: "მეხუთე",
    6: "მეექვსე", 7: "მეშვიდე", 8: "მერვე", 9: "მეცხრე", 10: "მეათე"
}
TEENS_ORDINALS = {
    11: "მეთერთმეტე", 12: "მეთორმეტე", 13: "მეცამეტე", 14: "მეთოთხმეტე", 15: "მეთხუთმეტე",
    16: "მეთექვსმეტე", 17: "მეჩვიდმეტე", 18: "მეთვრამეტე", 19: "მეცხრამეტე"
}
EXACT_MULTIPLES_ORDINALS = {
    20: "მეოცე", 40: "მეორმოცე", 60: "მესამოცე", 80: "მეოთხმოცე",
    100: "მეასე", 200: "მეორასე", 300: "მესამასე", 400: "მეოთხასე",
    500: "მეხუთასე", 600: "მეექვსასე", 700: "მეშვიდასე", 800: "მერვაასე", 900: "მეცხრაასე",
    1000: "მეათასე"
}


def georgian_number_to_words(num: int) -> str:
    """Convert an integer (0 to 999,999,999,999) to natural Georgian words."""
    if num == 0:
        return "ნული"
    if num < 0:
        return "მინუს " + georgian_number_to_words(-num)

    def _convert_under_100(n: int) -> str:
        if n < 10:
            return UNITS[n]
        if n < 20:
            return TEENS[n - 10]
        score = n // 20
        rem = n % 20
        base = SCORE_PREFIXES.get(score, "")
        if rem == 0:
            return base + "ი"
        else:
            sub = UNITS[rem] if rem < 10 else TEENS[rem - 10]
            return base + "და" + sub

    def _convert_under_1000(n: int) -> str:
        if n < 100:
            return _convert_under_100(n)
        h = n // 100
        rem = n % 100
        base = HUNDREDS.get(h, "")
        if rem == 0:
            return base + "ი"
        else:
            return base + " " + _convert_under_100(rem)

    def _convert_large(n: int) -> str:
        if n < 1000:
            return _convert_under_1000(n)
        if n < 1_000_000:
            th = n // 1000
            rem = n % 1000
            th_str = "ათას" if th == 1 else _convert_under_1000(th) + " ათას"
            if rem == 0:
                return th_str + "ი"
            return th_str + " " + _convert_under_1000(rem)
        if n < 1_000_000_000:
            m = n // 1_000_000
            rem = n % 1_000_000
            m_str = "მილიონ" if m == 1 else _convert_under_1000(m) + " მილიონ"
            if rem == 0:
                return m_str + "ი"
            return m_str + " " + _convert_large(rem)
        if n < 1_000_000_000_000:
            b = n // 1_000_000_000
            rem = n % 1_000_000_000
            b_str = "მილიარდ" if b == 1 else _convert_under_1000(b) + " მილიარდ"
            if rem == 0:
                return b_str + "ი"
            return b_str + " " + _convert_large(rem)
        return str(n)

    return _convert_large(num)


def georgian_ordinal_to_words(n: int) -> str:
    """Convert an integer ordinal to natural Georgian words (e.g. 1 -> პირველი)."""
    if n in ORDINALS_1_TO_10:
        return ORDINALS_1_TO_10[n]
    if n in TEENS_ORDINALS:
        return TEENS_ORDINALS[n]
    if n in EXACT_MULTIPLES_ORDINALS:
        return EXACT_MULTIPLES_ORDINALS[n]

    last_20 = n % 20
    base = (n // 20) * 20
    base_words = {20: "ოცდა", 40: "ორმოცდა", 60: "სამოცდა", 80: "ოთხმოცდა"}
    if base in base_words and last_20 > 0:
        sub_ord = ORDINALS_1_TO_10.get(last_20) or TEENS_ORDINALS.get(last_20) or f"მე-{last_20}"
        return base_words[base] + sub_ord

    num_words = georgian_number_to_words(n)
    if num_words.endswith("ი"):
        return f"მე{num_words[:-1]}ე"
    return f"მე-{num_words}"


ROMAN_TO_ORDINAL_KA = {
    "I": "პირველი", "II": "მეორე", "III": "მესამე", "IV": "მეოთხე", "V": "მეხუთე",
    "VI": "მეექვსე", "VII": "მეშვიდე", "VIII": "მერვე", "IX": "მეცხრე", "X": "მეათე",
    "XI": "მეთერთმეტე", "XII": "მეთორმეტე", "XIII": "მეცამეტე", "XIV": "მეთოთხმეტე",
    "XV": "მეთხუთმეტე", "XVI": "მეთექვსმეტე", "XVII": "მეჩვიდმეტე", "XVIII": "მეთვრამეტე",
    "XIX": "მეცხრამეტე", "XX": "მეოცე", "XXI": "ოცდამეერთე", "XXII": "ოცდამეორე",
    "XXIII": "ოცდამესამე", "XXIV": "ოცდამეოთხე", "XXV": "ოცდამეხუთე", "XXVI": "ოცდამეექვსე",
    "XXVII": "ოცდამეშვიდე", "XXVIII": "ოცდამერვე", "XXIX": "ოცდამეცხრე", "XXX": "ოცდამეათე"
}

# ── Classical Names and Proper Nouns Transliteration Map ──────────────────────
LITERARY_NAMES_MAP = {
    "mr": "მისტერ", "mrs": "მისის", "ms": "მის", "dr": "დოქტორ", "prof": "პროფესორ",
    "sir": "სერ", "lord": "ლორდ", "lady": "ლედი", "prince": "უფლისწული", "king": "მეფე",
    "queen": "დედოფალი", "emperor": "იმპერატორი", "captain": "კაპიტანი",
    "marcus": "მარკუს", "aurelius": "ავრელიუსი", "socrates": "სოკრატე", "plato": "პლატონი",
    "aristotle": "არისტოტელე", "homer": "ჰომეროსი", "achilles": "აქილევსი", "odysseus": "ოდისევსი",
    "odyssey": "ოდისეა", "iliad": "ილიადა", "caesar": "კეისარი", "cicero": "ციცერონი",
    "alexander": "ალექსანდრე", "seneca": "სენეკა", "epictetus": "ეპიქტეტე", "herodotus": "ჰეროდოტე",
    "thucydides": "თუკიდიდე", "pythagoras": "პითაგორა", "archimedes": "არქიმედე",
    "virgil": "ვირგილიუსი", "ovid": "ოვიდიუსი", "horace": "ჰორაციუსი",
    "rome": "რომი", "athens": "ათენი", "sparta": "სპარტა", "troy": "ტროა", "carthage": "კართაგენი",
    "olympus": "ოლიმპო", "zeus": "ზევსი", "apollo": "აპოლონი", "athena": "ათენა", "ares": "არესი",
    "poseidon": "პოსეიდონი", "hades": "ჰადესი", "hermes": "ჰერმესი", "hercules": "ჰერკულესი",
    "shakespeare": "შექსპირი", "dante": "დანტე", "cervantes": "სერვანტესი", "goethe": "გოეთე",
    "dostoevsky": "დოსტოევსკი", "tolstoy": "ტოლსტოი", "kafka": "კაფკა", "nietzsche": "ნიცშე",
    "kant": "კანტი", "hegel": "ჰეგელი", "schopenhauer": "შოპენჰაუერი", "freud": "ფროიდი",
    "jung": "იუნგი", "darwin": "დარვინი", "newton": "ნიუტონი", "einstein": "აინშტაინი",
    "hemingway": "ჰემინგუეი", "orwell": "ორუელი", "dickens": "დიკენსი", "austen": "ოსტინი",
    "chekhov": "ჩეხოვი", "sun": "სუნ", "tzu": "ძი",
    "john": "ჯონ", "james": "ჯეიმს", "george": "ჯორჯ", "william": "უილიამ", "charles": "ჩარლზ",
    "david": "დავით", "robert": "რობერტ", "edward": "ედუარდ", "henry": "ჰენრი", "thomas": "თომას",
    "mary": "მერი", "elizabeth": "ელიზაბეთ", "sarah": "სარა", "jane": "ჯეინ", "emma": "ემა",
    "harry": "ჰარი", "potter": "პოტერი", "sherlock": "შერლოკ", "holmes": "ჰოლმსი", "watson": "ვატსონი",
    "london": "ლონდონი", "england": "ინგლისი", "paris": "პარიზი", "france": "საფრანგეთი",
    "america": "ამერიკა", "york": "იორკი", "street": "სტრიტი",
    # Modern Acronyms & Terms
    "ai": "ეი-აი", "it": "აი-ტი", "usa": "იუ-ეს-ეი", "eu": "ევროკავშირი",
    "nato": "ნატო", "unesco": "იუნესკო", "ceo": "სი-ი-ო", "dna": "დნმ",
    "rna": "რნმ", "fbi": "ეფ-ბი-აი", "cia": "სი-აი-ეი", "nasa": "ნასა"
}

PHONETIC_CHAR_MAP = {
    "a": "ა", "b": "ბ", "d": "დ", "e": "ე", "f": "ფ", "h": "ჰ", "i": "ი", "j": "ჯ",
    "k": "კ", "l": "ლ", "m": "მ", "n": "ნ", "o": "ო", "p": "პ", "q": "კ", "r": "რ",
    "s": "ს", "t": "ტ", "u": "უ", "v": "ვ", "w": "ვ", "x": "ქს", "y": "ი", "z": "ზ"
}


def transliterate_latin_word_to_ka(word: str) -> str:
    """Transliterate an English/Latin word to natural Georgian Mkhedruli phonetics."""
    if not word:
        return ""
    lower = word.lower()
    if lower in LITERARY_NAMES_MAP:
        return LITERARY_NAMES_MAP[lower]

    s = lower
    # Silent clusters and special English onsets
    s = re.sub(r"^kn", "ნ", s)
    s = re.sub(r"^wr", "რ", s)
    s = re.sub(r"^ps", "ფს", s)
    s = re.sub(r"^wh", "ვ", s)

    # Suffixes and Latinate endings
    s = re.sub(r"tion\b", "შენ", s)
    s = re.sub(r"sion\b", "ჟენ", s)
    s = re.sub(r"igh", "აი", s)
    s = re.sub(r"ew\b", "იუ", s)

    # Digraphs & Multigraphs
    s = re.sub(r"sch", "შ", s)
    s = re.sub(r"tch", "ჩ", s)
    s = re.sub(r"ch", "ჩ", s)
    s = re.sub(r"sh", "შ", s)
    s = re.sub(r"th", "თ", s)
    s = re.sub(r"ph", "ფ", s)
    s = re.sub(r"kh", "ხ", s)
    s = re.sub(r"zh", "ჟ", s)
    s = re.sub(r"gh", "ღ", s)
    s = re.sub(r"ts", "ც", s)
    s = re.sub(r"dz", "ძ", s)
    s = re.sub(r"ck", "კ", s)
    s = re.sub(r"qu", "კვ", s)
    s = re.sub(r"ee", "ი", s)
    s = re.sub(r"ea", "ი", s)
    s = re.sub(r"oo", "უ", s)
    s = re.sub(r"ou", "აუ", s)
    s = re.sub(r"au|aw", "ო", s)
    s = re.sub(r"ai|ay|ei|ey", "ეი", s)

    # Soft/Hard c and g
    s = re.sub(r"c([eiy])", r"ს\1", s)
    s = re.sub(r"c", "კ", s)
    s = re.sub(r"g([eiy])", r"ჯ\1", s)
    s = re.sub(r"g", "გ", s)

    return "".join(PHONETIC_CHAR_MAP.get(ch, ch) for ch in s)


def transliterate_latin_in_georgian(text: str) -> str:
    """Find isolated Latin words in text and transliterate them to Mkhedruli."""
    if not text or not re.search(r"[a-zA-Z]", text):
        return text
    return re.sub(r"\b[A-Za-z]+(?:'[A-Za-z]+)?\b", lambda m: transliterate_latin_word_to_ka(m.group(0)), text)


def verbalize_georgian_for_tts(text: str) -> str:
    """
    Complete linguistic preprocessor for Georgian TTS.
    Converts numbers, dates, ordinals, currencies, fractions, abbreviations,
    and Latin proper nouns into natural Georgian spoken phonemes with organic breath pauses.
    """
    if not text:
        return ""

    out = unicodedata.normalize("NFC", text)

    # 1. Roman Numerals in Headings, Centuries & Monarchs
    # A. Headings: "თავი IV" -> "თავი მეოთხე"
    def _replace_roman_heading(m):
        prefix, rom = m.group(1), m.group(2).upper()
        return f"{prefix} {ROMAN_TO_ORDINAL_KA.get(rom, rom)}"

    out = re.sub(
        rf"{KA_PREFIX}(თავი|კარი|ნაწილი|წიგნი|ტომი|გვერდი)\s+([IVXLCDM]+){KA_SUFFIX}",
        _replace_roman_heading,
        out,
        flags=re.IGNORECASE
    )

    # B. Centuries: "XXI საუკუნე" -> "ოცდამეერთე საუკუნე"
    def _replace_roman_century(m):
        rom, suffix = m.group(1).upper(), m.group(2)
        return f"{ROMAN_TO_ORDINAL_KA.get(rom, rom)} {suffix}"

    out = re.sub(
        rf"{KA_PREFIX}([IVXLCDM]+)\s+(საუკუნე(?:ში|დან|მდე|ს)?){KA_SUFFIX}",
        _replace_roman_century,
        out,
        flags=re.IGNORECASE
    )

    # C. Monarchs: "ერეკლე II" -> "ერეკლე მეორე"
    def _replace_roman_monarch(m):
        name, rom = m.group(1), m.group(2).upper()
        return f"{name} {ROMAN_TO_ORDINAL_KA.get(rom, rom)}"

    out = re.sub(
        rf"([{KA_CHARS}]+)\s+([IVXLCDM]+){KA_SUFFIX}",
        _replace_roman_monarch,
        out
    )

    # 2. Georgian Ordinals: 1-ლი, 2-ე, 3-ე, მე-5, etc.
    def _replace_ordinal(m):
        prefix = m.group(1) or ""
        num = int(m.group(2))
        suffix = m.group(3) or ""
        ord_word = georgian_ordinal_to_words(num)
        if suffix == "ში":
            return ord_word + "ში"
        if suffix == "მა":
            return ord_word + "მ"
        return ord_word

    out = re.sub(r"(მე-)?(\d+)-(ლი|ე|ში|მა|ად)\b", _replace_ordinal, out)
    out = re.sub(r"\bმე-(\d+)\b", lambda m: georgian_ordinal_to_words(int(m.group(1))), out)

    # 3. Percentages & Decimals
    out = re.sub(
        r"(\b\d{1,9})\s*%",
        lambda m: georgian_number_to_words(int(m.group(1))) + " პროცენტი",
        out
    )
    out = re.sub(
        r"(\b\d{1,9})\.(\d{1,4})\b",
        lambda m: f"{georgian_number_to_words(int(m.group(1)))} მთელი {georgian_number_to_words(int(m.group(2)))}",
        out
    )

    # 4. Common Fractions
    out = re.sub(r"(?<!\d)1/2(?!\d)", "ნახევარი", out)
    out = re.sub(r"(?<!\d)1/3(?!\d)", "მესამედი", out)
    out = re.sub(r"(?<!\d)1/4(?!\d)", "მეოთხედი", out)
    out = re.sub(r"(?<!\d)3/4(?!\d)", "სამი მეოთხედი", out)

    # 5. Metric Measurements
    out = re.sub(
        rf"(\b\d{{1,9}})\s*(კმ|კილომეტრი|კილომეტრში){KA_SUFFIX}",
        lambda m: f"{georgian_number_to_words(int(m.group(1)))} {'კილომეტრში' if m.group(2) == 'კილომეტრში' else 'კილომეტრი'}",
        out
    )
    out = re.sub(
        rf"(\b\d{{1,9}})\s*(მ|მეტრი|მეტრში){KA_SUFFIX}",
        lambda m: f"{georgian_number_to_words(int(m.group(1)))} {'მეტრში' if m.group(2) == 'მეტრში' else 'მეტრი'}",
        out
    )
    out = re.sub(
        rf"(\b\d{{1,9}})\s*(კგ|კილოგრამი){KA_SUFFIX}",
        lambda m: f"{georgian_number_to_words(int(m.group(1)))} კილოგრამი",
        out
    )
    out = re.sub(
        rf"(\b\d{{1,9}})\s*(სმ|სანტიმეტრი){KA_SUFFIX}",
        lambda m: f"{georgian_number_to_words(int(m.group(1)))} სანტიმეტრი",
        out
    )
    out = re.sub(
        r"(\b\d{1,9})\s*°C\b",
        lambda m: f"{georgian_number_to_words(int(m.group(1)))} გრადუსი ცელსიუსით",
        out
    )

    # 6. Currencies
    out = re.sub(
        r"\$(\d+[\d,]*)",
        lambda m: f"{georgian_number_to_words(int(m.group(1).replace(',', '')))} დოლარი",
        out
    )
    out = re.sub(
        r"(\d+[\d,]*)\s*₾",
        lambda m: f"{georgian_number_to_words(int(m.group(1).replace(',', '')))} ლარი",
        out
    )
    out = re.sub(
        r"€(\d+[\d,]*)",
        lambda m: f"{georgian_number_to_words(int(m.group(1).replace(',', '')))} ევრო",
        out
    )

    # 7. Common Abbreviations
    abbrev_replacements = [
        (rf"{KA_PREFIX}და\s*ა\.შ\.{KA_SUFFIX}", "და ასე შემდეგ"),
        (rf"{KA_PREFIX}ე\.ი\.{KA_SUFFIX}", "ესე იგი"),
        (rf"{KA_PREFIX}ე\.წ\.{KA_SUFFIX}", "ეგრეთ წოდებული"),
        (rf"{KA_PREFIX}მაგ\.{KA_SUFFIX}", "მაგალითად"),
        (rf"{KA_PREFIX}ბ-ნი{KA_SUFFIX}", "ბატონი"),
        (rf"{KA_PREFIX}ქ-ნი{KA_SUFFIX}", "ქალბატონი"),
        (rf"{KA_PREFIX}დოქტ\.{KA_SUFFIX}", "დოქტორი"),
        (rf"{KA_PREFIX}პროფ\.{KA_SUFFIX}", "პროფესორი"),
        (rf"{KA_PREFIX}წ\.{KA_SUFFIX}", "წელი"),
        (rf"{KA_PREFIX}სს\.{KA_SUFFIX}", "საუკუნე"),
    ]
    for pattern, repl in abbrev_replacements:
        out = re.sub(pattern, repl, out)

    # 8. Year Ranges: 1939-1945 -> ათას ცხრაას ოცდაცხრამეტიდან ათას ცხრაას ორმოცდახუთ წლამდე
    def _replace_year_range(m):
        y1, y2 = int(m.group(1)), int(m.group(2))
        if 1000 <= y1 <= 2100 and 1000 <= y2 <= 2100:
            w1 = georgian_number_to_words(y1)
            w2 = georgian_number_to_words(y2)
            from1 = (w1[:-1] + "იდან") if w1.endswith("ი") else (w1 + "დან")
            to2 = w2[:-1] if w2.endswith("ი") else w2
            return f"{from1} {to2} წლამდე"
        return m.group(0)

    out = re.sub(r"(\b\d{4})\s*[-–—]\s*(\d{4}\b)", _replace_year_range, out)

    # 9. Standalone Years: 1920 წელს -> ათას ცხრაას ოც წელს
    def _replace_standalone_year(m):
        y, suffix = int(m.group(1)), m.group(2)
        if 1000 <= y <= 2100:
            w = georgian_number_to_words(y)
            stem = w[:-1] if w.endswith("ი") else w
            if suffix == "წელს":
                return f"{stem} წელს"
            if suffix == "წლიდან":
                return f"{stem} წლიდან"
            if suffix == "წლამდე":
                return f"{stem} წლამდე"
            if suffix == "წლის":
                return f"{stem} წლის"
            if suffix == "წლებში":
                return f"{stem} წლებში"
            if suffix == "წლები":
                return f"{w} წლები"
        return m.group(0)

    out = re.sub(
        rf"(\b\d{{4}})\s+(წელს|წლიდან|წლამდე|წლის|წლები|წლებში){KA_SUFFIX}",
        _replace_standalone_year,
        out
    )

    # 10. Standalone Numbers
    out = re.sub(
        r"\b(\d{1,9})\b",
        lambda m: georgian_number_to_words(int(m.group(1))),
        out
    )

    # 11. Transliterate Latin Words to Mkhedruli
    out = transliterate_latin_in_georgian(out)

    # 12. Dialogue dashes & click removal
    # Strip line-initial dialogue dashes so spoken lines do not begin with an acoustic click
    out = re.sub(r"(^|[\r\n]+)\s*[—–-]\s*", r"\1", out)

    # Convert dialogue quotation marks and colons into conversational commas / breath pauses
    out = re.sub(r"(:\s*)?[„\"“]", ", ", out)
    out = re.sub(r"[”\"»]", ", ", out)
    out = re.sub(r"\s+[—–-](\s|$)", r", \1", out)
    out = re.sub(r"\s*[—–]\s*", ", ", out)
    out = re.sub(rf"([{KA_CHARS}]+)-([{KA_CHARS}]+)", r"\1 \2", out)
    out = re.sub(r";", ", ", out)
    out = re.sub(r":", ", ", out)
    out = re.sub(r"^[,\s]+", "", out)
    out = re.sub(r"\s+", " ", out).strip()

    # 13. Natural breath pause before Georgian conjunctions
    conjunctions = (
        "მაგრამ|თუმცა|ხოლო|რადგანაც|რადგან|ვინაიდან|რაკი|როდესაც|რომელიც|რომ|სანამ|ვიდრე"
    )
    out = re.sub(
        rf"([^,.;:!?])\s+({conjunctions}){KA_SUFFIX}",
        r"\1, \2",
        out
    )

    # 14. Interrogative & Exclamation cadence
    out = re.sub(r"\s*\?\s*", "? ", out)
    out = re.sub(r"\s*!\s*", "! ", out)

    # 15. Known Edge-TTS pronunciation tuning
    out = re.sub(rf"{KA_PREFIX}სუნ\s+ცუ{KA_SUFFIX}", "სუნ ძი", out, flags=re.IGNORECASE)
    out = re.sub(rf"{KA_PREFIX}სუნ\s+ტზუ{KA_SUFFIX}", "სუნ ძი", out, flags=re.IGNORECASE)

    return out.strip()
