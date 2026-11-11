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

KA_CHARS = r"\u10A0-\u10FF\u1C90-\u1CBF"
KA_PREFIX = rf"(?<![{KA_CHARS}])"
KA_SUFFIX = rf"(?![{KA_CHARS}])"


def normalize_mtavruli_to_mkhedruli(text: str) -> str:
    """Convert Georgian Mtavruli uppercase (U+1C90..U+1CBF) to standard Mkhedruli (U+10D0..U+10FF)."""
    if not text or not re.search(r"[\u1C90-\u1CBF]", text):
        return text
    out_chars = []
    for ch in text:
        cp = ord(ch)
        if (0x1C90 <= cp <= 0x1CBA) or (0x1CBD <= cp <= 0x1CBF):
            out_chars.append(chr(cp - 0x0BC0))
        else:
            out_chars.append(ch)
    return "".join(out_chars)

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
    "rustaveli": "რუსთაველი", "shota": "შოთა", "descartes": "დეკარტი", "spinoza": "სპინოზა",
    "leibniz": "ლაიბნიცი", "montaigne": "მონტენი", "pascal": "პასკალი", "voltaire": "ვოლტერი",
    "rousseau": "რუსო",
    "dostoevsky": "დოსტოევსკი", "tolstoy": "ტოლსტოი", "kafka": "კაფკა", "nietzsche": "ნიცშე",
    "kant": "კანტი", "hegel": "ჰეგელი", "schopenhauer": "შოპენჰაუერი", "freud": "ფროიდი",
    "jung": "იუნგი", "darwin": "დარვინი", "newton": "ნიუტონი", "einstein": "აინშტაინი",
    "hemingway": "ჰემინგუეი", "orwell": "ორუელი", "dickens": "დიკენსი", "austen": "ოსტინი",
    "chekhov": "ჩეხოვი", "sun": "სუნ", "tzu": "ძი",
    "machiavelli": "მაკიაველი", "kierkegaard": "კირკეგორი", "heidegger": "ჰაიდეგერი",
    "sartre": "სარტრი", "camus": "კამიუ", "plutarch": "პლუტარქე", "tacitus": "ტაციტუსი",
    "heraclitus": "ჰერაკლიტე", "parmenides": "პარმენიდე", "democritus": "დემოკრიტე",
    "epicurus": "ეპიკურე", "zeno": "ზენონი", "marx": "მარქსი", "weber": "ვებერი",
    "durkheim": "დიურკჰაიმი", "locke": "ლოკი", "hobbes": "ჰობსი", "hume": "ჰიუმი",
    "berkeley": "ბერკლი", "spenser": "სპენსერი", "milton": "მილტონი", "byron": "ბაირონი",
    "shelley": "შელი", "keats": "ქითსი", "wordsworth": "უორდსუორთი", "chaucer": "ჩოსერი",
    "baratashvili": "ბარათაშვილი", "chavchavadze": "ჭავჭავაძე", "vazha": "ვაჟა",
    "pshavela": "ფშაველა", "merani": "მერანი", "petritsi": "პეტრიწი", "ioane": "იოანე",
    "proclus": "პროკლე", "aluda": "ალუდა", "ketelauri": "ქეთელაური", "zviadauri": "ზვიადაური",
    "jokhola": "ჯოყოლა", "galaktion": "გალაკტიონი", "akaki": "აკაკი", "machabeli": "მაჩაბელი",
    "peleus": "პელევსი", "hamlet": "ჰამლეტი", "macbeth": "მაკბეთი", "othello": "ოტელო",
    "orbeliani": "ორბელიანი", "sulkhan": "სულხან", "saba": "საბა", "tabidze": "ტაბიძე",
    "alighieri": "ალიგიერი", "tsereteli": "წერეთელი", "hesiod": "ჰესიოდე", "sappho": "საფო",
    "pindar": "პინდარე", "euripides": "ევრიპიდე", "sophocles": "სოფოკლე", "aeschylus": "ესქილე",
    "aristophanes": "არისტოფანე",
    "gamsakhurdia": "გამსახურდია", "javakhishvili": "ჯავახიშვილი", "arsakidze": "არსაკიძე",
    "konstantine": "კონსტანტინე", "guramishvili": "გურამიშვილი", "shushanik": "შუშანიკი",
    "tsurtaveli": "ცურტაველი", "sabanisdze": "საბანისძე", "varsken": "ვარსქენი",
    "abo": "აბო", "tbileli": "თბილელი", "svetitskhoveli": "სვეტიცხოველი",
    "khevistavi": "ხევისთავი", "jaqo": "ჯაყო", "kvachi": "კვაჭი", "arshusha": "არშუშა",
    "amirejibi": "ამირეჯიბი", "tutashkhia": "თუთაშხია", "zarandia": "ზარანდია",
    "mushni": "მუშნი", "dumbadze": "დუმბაძე", "kazbegi": "ყაზბეგი", "khevisberi": "ხევისბერი",
    "gocha": "გოჩა", "onise": "ონისე", "dzidzia": "ძიძია",
    "john": "ჯონ", "james": "ჯეიმს", "george": "ჯორჯ", "william": "უილიამ", "charles": "ჩარლზ",
    "david": "დავით", "davit": "დავით", "robert": "რობერტ", "edward": "ედუარდ", "henry": "ჰენრი", "thomas": "თომას",
    "mary": "მერი", "elizabeth": "ელიზაბეთ", "sarah": "სარა", "jane": "ჯეინ", "emma": "ემა",
    "harry": "ჰარი", "potter": "პოტერი", "sherlock": "შერლოკ", "holmes": "ჰოლმსი", "watson": "ვატსონი",
    "london": "ლონდონი", "england": "ინგლისი", "paris": "პარიზი", "france": "საფრანგეთი",
    "america": "ამერიკა", "york": "იორკი", "street": "სტრიტი",
    # Georgian Cities, Regions & Cultural Names in Latin
    "georgia": "ჯორჯია", "sakartvelo": "საქართველო", "tbilisi": "თბილისი",
    "batumi": "ბათუმი", "kutaisi": "ქუთაისი", "rustavi": "რუსთავი",
    "mtskheta": "მცხეთა", "gori": "გორი", "zugdidi": "ზუგდიდი", "telavi": "თელავი",
    "kakheti": "კახეთი", "svaneti": "სვანეთი", "imereti": "იმერეთი",
    "samegrelo": "სამეგრელო", "kartli": "ქართლი", "adjara": "აჭარა",
    "ilia": "ილია", "lasha": "ლაშა", "giorgi": "გიორგი", "nino": "ნინო",
    "tamar": "თამარ", "mariam": "მარიამ", "elene": "ელენე", "ana": "ანა",
    "luka": "ლუკა", "levan": "ლევან", "zurab": "ზურაბ", "irakli": "ირაკლი",
    "tornike": "თორნიკე", "niko": "ნიკო", "pirosmani": "ფიროსმანი",
    "bagrationi": "ბაგრატიონი", "saakashvili": "სააკაშვილი", "shevardnadze": "შევარდნაძე",
    # Common International Names & Tech/Literary Terms
    "steve": "სტივ", "mike": "მაიკ", "michael": "მაიკლ", "kate": "კეიტ",
    "alice": "ელის", "andrew": "ენდრიუ", "matthew": "მეთიუ", "paul": "პოლ",
    "peter": "პიტერ", "mark": "მარკ", "stephen": "სტივენ", "richard": "რიჩარდ",
    "victor": "ვიქტორ", "alex": "ალექს", "anna": "ანა", "maria": "მარია",
    "elena": "ელენა", "sophia": "სოფია", "google": "გუგლი", "apple": "ეპლი",
    "oracle": "ორაკლი", "microsoft": "მაიკროსოფტი", "amazon": "ამაზონი",
    "iphone": "აიფონი", "android": "ანდროიდი", "openai": "ოუპენ-ეი-აი",
    "chatgpt": "ჩატ-ჯი-პი-ტი", "claude": "კლოდი", "gemini": "ჯემინაი",
    "youtube": "იუთუბი", "github": "გითჰაბი", "studio": "სტუდიო",
    "engbot": "ენგბოტ", "lumina": "ლუმინა",
    # Modern Acronyms & Terms
    "ai": "ეი-აი", "it": "აი-ტი", "usa": "იუ-ეს-ეი", "eu": "ევროკავშირი",
    "nato": "ნატო", "unesco": "იუნესკო", "ceo": "სი-ი-ო", "dna": "დნმ",
    "rna": "რნმ", "fbi": "ეფ-ბი-აი", "cia": "სი-აი-ეი", "nasa": "ნასა",
    "bbc": "ბი-ბი-სი", "cnn": "სი-ენ-ენ", "pdf": "პი-დი-ეფ", "usb": "იუ-ეს-ბი",
    "tv": "თი-ვი", "ok": "ოქეი", "okay": "ოქეი", "vip": "ვი-აი-პი",
    "gps": "ჯი-პი-ეს", "wifi": "ვაი-ფაი", "un": "გაერო", "uk": "დიდი ბრიტანეთი"
}

LATIN_LETTER_KA = {
    "A": "ეი", "B": "ბი", "C": "სი", "D": "დი", "E": "ი", "F": "ეფ",
    "G": "ჯი", "H": "ეიჩ", "I": "აი", "J": "ჯეი", "K": "ქეი", "L": "ელ",
    "M": "ემ", "N": "ენ", "O": "ოუ", "P": "პი", "Q": "ქიუ", "R": "არ",
    "S": "ეს", "T": "თი", "U": "იუ", "V": "ვი", "W": "დაბლიუ", "X": "ექს",
    "Y": "უაი", "Z": "ზი"
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

    # Unpronounceable ALL-CAPS Latin consonant acronyms (2-5 chars, excluding Roman numerals)
    if (
        word.isupper()
        and 2 <= len(word) <= 5
        and not re.search(r"[AEIOUY]", word)
        and word not in ROMAN_TO_ORDINAL_KA
        and not re.fullmatch(r"[IVXLCDM]+", word)
    ):
        return "-".join(LATIN_LETTER_KA.get(ch, ch) for ch in word)

    s = lower
    # Collapse doubled English consonants so ka-GE doesn't stutter/geminate
    s = re.sub(r"([bdfgklmnprstz])\1", r"\1", s)
    s = re.sub(r"cc(?![eiy])", "k", s)

    # Silent clusters and special English onsets
    s = re.sub(r"^kn", "ნ", s)
    s = re.sub(r"^wr", "რ", s)
    s = re.sub(r"^ps", "ფს", s)
    s = re.sub(r"^wh", "ვ", s)

    # Suffixes and Latinate endings
    s = re.sub(r"tion\b", "შენ", s)
    s = re.sub(r"sion\b", "ჟენ", s)
    s = re.sub(r"ture\b", "ჩერ", s)
    s = re.sub(r"dge", "ჯ", s)
    s = re.sub(r"igh", "აი", s)
    s = re.sub(r"ew\b", "იუ", s)
    s = re.sub(r"ow\b", "ოუ", s)
    # Silent final -e (including consonant + -le) when word contains another vowel
    if len(s) > 3 and re.search(r"[aeiouy]", s[:-1]):
        s = re.sub(r"(?<=[bcdfghjklmnpqrstvwxz])e\b", "", s)

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
    s = re.sub(r"oa", "ოუ", s)
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


KA_MONTHS_GEN_OR_NOM = {
    1: "იანვარი", 2: "თებერვალი", 3: "მარტი", 4: "აპრილი",
    5: "მაისი", 6: "ივნისი", 7: "ივლისი", 8: "აგვისტო",
    9: "სექტემბერი", 10: "ოქტომბერი", 11: "ნოემბერი", 12: "დეკემბერი"
}


def verbalize_georgian_for_tts(text: str) -> str:
    """
    Complete linguistic preprocessor for Georgian TTS.
    Converts Mtavruli capitals, numbers, dates, ordinals, decades, currencies,
    fractions, abbreviations, and Latin proper nouns into natural Georgian spoken forms
    with organic breath pauses.
    """
    if not text:
        return ""

    out = normalize_mtavruli_to_mkhedruli(unicodedata.normalize("NFC", text))

    # 1. Roman Numerals in Headings, Centuries, Monarchs & Suffixed Forms
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

    # B2. Suffixed Roman numerals: "XXI-ე" -> "ოცდამეერთე", "XX-ში" -> "მეოცეში"
    def _replace_roman_suffixed(m):
        rom, suffix = m.group(1).upper(), m.group(2)
        ord_word = ROMAN_TO_ORDINAL_KA.get(rom)
        if not ord_word:
            return m.group(0)
        if suffix in ("ე", "ლი"):
            return ord_word
        if suffix == "მა":
            return ord_word + "მ"
        return ord_word + suffix

    out = re.sub(
        rf"(?<![A-Za-z])([IVXLCDM]+)-(ე|ლი|ში|მა|ად|ზე|მდე|დან){KA_SUFFIX}",
        _replace_roman_suffixed,
        out
    )

    # C. Monarchs: "ერეკლე II" -> "ერეკლე მეორე"
    def _replace_roman_monarch(m):
        name, rom = m.group(1), m.group(2).upper()
        return f"{name} {ROMAN_TO_ORDINAL_KA.get(rom, rom)}"

    out = re.sub(
        rf"([{KA_CHARS}]+)\s+([IVXLCDM]+)(?![a-zA-Z{KA_CHARS}])",
        _replace_roman_monarch,
        out
    )

    # 1b. Dates before decimal parsing: DD.MM.YYYY or DD/MM/YYYY
    def _replace_full_date(m):
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= day <= 31 and 1 <= month <= 12 and 1000 <= year <= 2100:
            day_w = georgian_number_to_words(day)
            month_w = KA_MONTHS_GEN_OR_NOM.get(month, "")
            year_w = georgian_number_to_words(year)
            return f"{day_w} {month_w}, {year_w} წელი"
        return m.group(0)

    out = re.sub(r"\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b", _replace_full_date, out)

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

    # 2a. Hyphenated Numeral Decades & Oblique Case Suffixes:
    # e.g. 1990-იანი -> ათას ცხრაას ოთხმოცდაათიანი, 10-დან -> ათიდან, 50-მდე -> ორმოცდაათამდე, 20-ზე -> ოცზე
    def _replace_num_case_suffix(m):
        num = int(m.group(1))
        suffix = m.group(2)
        w = georgian_number_to_words(num)
        stem = w[:-1] if w.endswith(("ი", "ა")) else w
        if suffix.startswith("იან") or suffix in ("ის", "ისთვის"):
            return stem + suffix
        if suffix in ("ეული", "წლიანი", "ში", "ზე", "ს", "ით", "თან", "კენ"):
            return (w[:-1] if w.endswith("ი") else w) + suffix
        if suffix == "დან":
            return stem + "იდან"
        if suffix == "მდე":
            return (stem + "ამდე") if w.endswith("ი") else (w + "მდე")
        if suffix == "სთვის":
            return (stem + "ისთვის") if w.endswith("ი") else (w + "სთვის")
        return stem + suffix

    out = re.sub(
        rf"\b(\d{{1,9}})-(იანები|იანებში|იანების|იანთა|იანი|იან|ეული|წლიანი|ისთვის|სთვის|მდე|დან|ში|ზე|ით|თან|კენ|ის|ს){KA_SUFFIX}",
        _replace_num_case_suffix,
        out
    )

    # 2b. Multiplicative Adverbials (e.g. 1-ჯერ -> ერთხელ, 2-ჯერ -> ორჯერ, 3-ჯერ -> სამჯერ)
    def _replace_multiplicative(m):
        num = int(m.group(1))
        if num == 1:
            return "ერთხელ"
        w = georgian_number_to_words(num)
        stem = w[:-1] if w.endswith("ი") else w
        return stem + "ჯერ"

    out = re.sub(r"\b(\d+)-ჯერ\b", _replace_multiplicative, out)

    # 2c. Clock Time (e.g. 14:30 -> თოთხმეტ საათსა და ნახევარზე, 15:00 -> თხუთმეტ საათზე)
    def _replace_clock_time(m):
        h = int(m.group(1))
        mins = int(m.group(2))
        if 0 <= h <= 24 and 0 <= mins < 60:
            hw = georgian_number_to_words(h)
            hstem = hw[:-1] if hw.endswith("ი") else hw
            if mins == 0:
                return f"{hstem} საათზე"
            elif mins == 30:
                return f"{hstem} საათსა და ნახევარზე"
            else:
                mw = georgian_number_to_words(mins)
                return f"{hstem} საათსა და {mw} წუთზე"
        return m.group(0)

    out = re.sub(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", _replace_clock_time, out)

    # 3. Percentages & Fractions & Symbols
    out = re.sub(
        r"(\b\d{1,9})\s*%",
        lambda m: georgian_number_to_words(int(m.group(1))) + " პროცენტი",
        out
    )
    out = re.sub(
        r"№\s*(\d{1,9})\b",
        lambda m: "ნომერი " + georgian_number_to_words(int(m.group(1))),
        out
    )
    out = re.sub(
        r"§\s*(\d{1,9})\b",
        lambda m: "პარაგრაფი " + georgian_number_to_words(int(m.group(1))),
        out
    )

    # 4. Common & Compound Fractions (dot & comma decimals)
    out = re.sub(r"(?<!\d)0[.,]5(?!\d)", "ნახევარი", out)
    out = re.sub(r"(?<!\d)1[.,]5(?!\d)", "ერთ-ნახევარი", out)
    out = re.sub(r"(?<!\d)2[.,]5(?!\d)", "ორ-ნახევარი", out)
    out = re.sub(r"(?<!\d)3[.,]5(?!\d)", "სამ-ნახევარი", out)
    out = re.sub(r"(?<!\d)4[.,]5(?!\d)", "ოთხ-ნახევარი", out)
    out = re.sub(r"(?<!\d)5[.,]5(?!\d)", "ხუთ-ნახევარი", out)
    out = re.sub(r"(?<!\d)1/2(?!\d)", "ნახევარი", out)
    out = re.sub(r"(?<!\d)1/3(?!\d)", "მესამედი", out)
    out = re.sub(r"(?<!\d)1/4(?!\d)", "მეოთხედი", out)
    out = re.sub(r"(?<!\d)3/4(?!\d)", "სამი მეოთხედი", out)
    out = re.sub(r"(?<!\d)1\s+1/2(?!\d)", "ერთ-ნახევარი", out)
    out = re.sub(r"(?<!\d)2\s+1/2(?!\d)", "ორ-ნახევარი", out)

    # Decimals (dot or comma with no space after comma)
    out = re.sub(
        r"(\b\d{1,9})[.,](\d{1,4})\b",
        lambda m: f"{georgian_number_to_words(int(m.group(1)))} მთელი {georgian_number_to_words(int(m.group(2)))}",
        out
    )

    # Space-separated thousands: 10 000 -> ათი ათასი
    out = re.sub(
        r"\b(\d{1,3}(?: \d{3})+)\b",
        lambda m: georgian_number_to_words(int(m.group(1).replace(" ", ""))),
        out
    )

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
    out = re.sub(rf"(?<=[{KA_CHARS}\d])\s*კგ{KA_SUFFIX}", " კილოგრამი", out)
    out = re.sub(rf"(?<=[{KA_CHARS}\d])\s*კმ{KA_SUFFIX}", " კილომეტრი", out)
    out = re.sub(rf"(?<=[{KA_CHARS}\d])\s*სმ{KA_SUFFIX}", " სანტიმეტრი", out)
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

    # 7. Common Abbreviations & Unpronounceable Acronyms (ordered longest-first!)
    abbrev_replacements = [
        (rf"{KA_PREFIX}და\s*ა\.შ\.{KA_SUFFIX}", "და ასე შემდეგ"),
        (rf"{KA_PREFIX}ძვ\.?\s*წ\.{KA_SUFFIX}", "ძველი წელთაღრიცხვით"),
        (rf"{KA_PREFIX}ახ\.?\s*წ\.{KA_SUFFIX}", "ახალი წელთაღრიცხვით"),
        (rf"{KA_PREFIX}ჩვ\.?\s*წ\.{KA_SUFFIX}", "ჩვენი წელთაღრიცხვით"),
        (rf"{KA_PREFIX}ე\.ი\.{KA_SUFFIX}", "ესე იგი"),
        (rf"{KA_PREFIX}ე\.წ\.{KA_SUFFIX}", "ეგრეთ წოდებული"),
        (rf"{KA_PREFIX}მ\.შ\.{KA_SUFFIX}", "მათ შორის"),
        (rf"{KA_PREFIX}თ\.შ\.{KA_SUFFIX}", "თავისთავად"),
        (rf"{KA_PREFIX}მაგ\.{KA_SUFFIX}", "მაგალითად"),
        (rf"{KA_PREFIX}ბ-ნი{KA_SUFFIX}", "ბატონი"),
        (rf"{KA_PREFIX}ქ-ნი{KA_SUFFIX}", "ქალბატონი"),
        (rf"{KA_PREFIX}დოქტ\.{KA_SUFFIX}", "დოქტორი"),
        (rf"{KA_PREFIX}პროფ\.{KA_SUFFIX}", "პროფესორი"),
        (rf"{KA_PREFIX}აკად\.{KA_SUFFIX}", "აკადემიკოსი"),
        (rf"{KA_PREFIX}შ\.?პ\.?ს\.?{KA_SUFFIX}", "შე-პე-სე"),
        (rf"{KA_PREFIX}დღგ{KA_SUFFIX}", "დე-ღე-გე"),
        (rf"{KA_PREFIX}თსუ{KA_SUFFIX}", "თე-ეს-უ"),
        (rf"{KA_PREFIX}აშშ{KA_SUFFIX}", "ა-შე-შე"),
        (rf"{KA_PREFIX}შსს{KA_SUFFIX}", "შე-ეს-ეს"),
        (rf"{KA_PREFIX}სსრკ{KA_SUFFIX}", "ეს-ეს-ერ-კა"),
        (rf"{KA_PREFIX}მლნ\.?{KA_SUFFIX}", "მილიონი"),
        (rf"{KA_PREFIX}მლრდ\.?{KA_SUFFIX}", "მილიარდი"),
        (rf"{KA_PREFIX}წთ\.?{KA_SUFFIX}", "წუთი"),
        (rf"{KA_PREFIX}წმ\.?{KA_SUFFIX}", "წამი"),
        (rf"{KA_PREFIX}წ\.{KA_SUFFIX}", "წელი"),
        (rf"{KA_PREFIX}წწ\.{KA_SUFFIX}", "წლები"),
        (rf"{KA_PREFIX}სს\.{KA_SUFFIX}", "საუკუნე"),
        (rf"{KA_PREFIX}გვ\.{KA_SUFFIX}", "გვერდი"),
        (rf"{KA_PREFIX}ტ\.{KA_SUFFIX}", "ტომი"),
        (rf"{KA_PREFIX}ნაწ\.{KA_SUFFIX}", "ნაწილი"),
        (rf"{KA_PREFIX}იხ\.{KA_SUFFIX}", "იხილეთ"),
        (rf"{KA_PREFIX}შდრ\.{KA_SUFFIX}", "შეადარეთ"),
    ]
    for pattern, repl in abbrev_replacements:
        out = re.sub(pattern, repl, out)

    out = re.sub(rf"{KA_PREFIX}ქ\.\s*(?=[{KA_CHARS}])", "ქალაქ ", out)
    out = re.sub(rf"{KA_PREFIX}სოფ\.\s*(?=[{KA_CHARS}])", "სოფელი ", out)
    # Strip dot from single-letter Georgian initials before surnames: ი. ჭავჭავაძე -> ი ჭავჭავაძე
    out = re.sub(r"(^|\s)([ა-ჰ])\.\s*(?=[ა-ჰ])", r"\1\2 ", out)

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

    # 10b. Cardinal & Vigesimal Numeral Stem Elision Before Oblique Nouns & Measures
    # In Georgian morphosyntax, cardinal numbers drop the final -ი when modifying an oblique noun:
    # e.g., "ოცი კაცს" -> "ოც კაცს", "თხუთმეტი წუთში" -> "თხუთმეტ წუთში", "ათი დღეს" -> "ათ დღეს", "ასი წლამდე" -> "ას წლამდე".
    cardinal_stems = (
        r'(?:'
        r'(?:[ა-ჰ]*და)?(?:ერთ|ორ|სამ|ოთხ|ხუთ|ექვს|შვიდ|ათ|თერთმეტ|თორმეტ|ცამეტ|თოთხმეტ|თხუთმეტ|თექვსმეტ|ჩვიდმეტ|თვრამეტ|ცხრამეტ)|'
        r'(?:[ა-ჰ]*და)?(?:ოც|ორმოც|სამოც|ოთხმოც)|'
        r'(?:[ა-ჰ]+\s+)?(?:ას|ორას|სამას|ოთხას|ხუთას|ექვსას|შვიდას|რვაას|ცხრაას|ათას|მილიონ|მილიარდ)'
        r')'
    )
    verbs_ending_in_s = r'(?:არის|ჩანს|გადის|შედის|იცის|აქვს|ჰყავს|უნდა|იტყვის|ხედავს|წერს|ამბობს|მოდის|მიდის|ხდება|უყვარს|ახსოვს|სჭირდება|ესმის|დგას|ზის|წევს|ჰქვია|ჰგავს|მუშაობს|ფიქრობს|ცხოვრობს|დადის|ყიდის|იღებს|იწყებს|გრძნობს|ლაპარაკობს)'
    oblique_noun_pattern = rf'(?!{verbs_ending_in_s}(?![{KA_CHARS}]))(?:[{KA_CHARS}]+(?:ს|ით|ად|დან|თან|კენ|ზე|ში|ისთვის|მდე))'
    out = re.sub(
        rf"{KA_PREFIX}({cardinal_stems})ი\s+({oblique_noun_pattern}){KA_SUFFIX}",
        r"\g<1> \g<2>",
        out
    )

    # 11. Transliterate Latin Words to Mkhedruli
    out = transliterate_latin_in_georgian(out)

    # 12. Dialogue dashes click removal at line starts
    out = re.sub(r"(^|[\r\n]+)\s*[—–-]\s*", r"\1", out)

    # 13. Natural breath pauses before Georgian conjunctions and relative clauses
    conjunctions = (
        r"მაგრამ|თუმცა|თუმცაღა|ხოლო|რადგანაც|რადგან|ვინაიდან|რაკი|რაკიღა|რამდენადაც|"
        r"როგორც\s+კი|როდესაც|სანამ|ვიდრე|თუნდ|თუნდაც|ვინძლო|ვითარცა|მხოლოდოდენ|რამეთუ|"
        r"რომელიც|რომელსაც|რომელშიც|რომელზეც|რომლის|რომლითაც|რომელთა|რომელთაც|რომელთათვის"
    )
    out = re.sub(
        rf"([^,.;:!?\s])\s+({conjunctions}){KA_SUFFIX}",
        r"\1, \2",
        out
    )

    out = re.sub(r"[ \t]+", " ", out).strip()

    # 15. Known Edge-TTS pronunciation tuning
    out = re.sub(rf"{KA_PREFIX}სუნ\s+ცუ{KA_SUFFIX}", "სუნ ძი", out, flags=re.IGNORECASE)
    out = re.sub(rf"{KA_PREFIX}სუნ\s+ტზუ{KA_SUFFIX}", "სუნ ძი", out, flags=re.IGNORECASE)

    return out.strip()


def prepare_ka_tts_utterance(text: str) -> str:
    """
    Applies acoustic-only Edge-TTS utterance shaping to verbalized Georgian text:
    removes decorative quotes/brackets that trigger glottal stops or pitch resets,
    smooths mid-sentence dialogue dashes into natural breathing commas, and strips
    non-spoken reference symbols without altering displayed chapter text.
    """
    if not text:
        return ""
    out = normalize_mtavruli_to_mkhedruli(text)
    # Strip bracketed academic footnotes like [1], [23]
    out = re.sub(r"\[\s*\d+\s*\]", "", out)
    # Strip decorative quotation marks that cause Edge-TTS ka-GE pitch stutters
    out = re.sub(r"[„“”«»\"`]", "", out)
    # Replace spaced dialogue em/en dashes with breathing commas for smooth clause cadence
    out = re.sub(r"\s*[—–]\s+", ", ", out)
    out = re.sub(r"\s+[—–]", ",", out)
    # Replace Georgian archaic section mark with clean pause
    out = out.replace("჻", ".")
    # Clean stray formatting symbols (*, #, _, ~) without harming hyphens in words
    out = re.sub(r"[*_#~|]", "", out)
    # Clean duplicate punctuation like ",," or ",." or "!,"
    out = re.sub(r",\s*,+", ",", out)
    out = re.sub(r"([.!?])\s*,+", r"\1", out)
    out = re.sub(r",\s*([.!?])", r"\1", out)
    out = re.sub(r"^[,\s]+", "", out)
    out = re.sub(r"[ \t]+", " ", out).strip()
    return out
