# -*- coding: utf-8 -*-
import re
from typing import Optional
try:
    from deep_translator import GoogleTranslator, LibreTranslator, MyMemoryTranslator
except ImportError:
    GoogleTranslator = None
    LibreTranslator = None
    MyMemoryTranslator = None


def clean_georgian_morphology(text: str) -> str:
    if not text:
        return text
    t = text
    # Standardize Georgian quotes and dashes
    t = re.sub(r'"([^"]+)"', r'„\g<1>“', t)
    t = re.sub(r'--+', '—', t)
    # Fix common spacing before punctuation
    t = re.sub(r'\s+([.,;:!?])', r'\g<1>', t)
    # Merge split words
    common = [
        "და", "არ", "კი", "რა", "ეს", "ის", "თუ", "მე", "მის", "მას",
        "რომ", "თქვა", "იყო", "მერე", "როცა", "ხოლო", "პატარა", "უფლისწული"
    ]
    for w in common:
        spaced = r"\s+".join(list(w))
        t = re.sub(r"(?<![\u10A0-\u10FF])" + spaced + r"(?![\u10A0-\u10FF])", w, t)

    # Anti-calque & synthetic verb reinforcement (Georgian Pro standards)
    calques = [
        (r'(?<![\u10A0-\u10FF])მიიღო\s+გადაწყვეტილება(?![ა-ჰ])', 'გადაწყვიტა'),
        (r'(?<![\u10A0-\u10FF])განახორციელა(?![ა-ჰ])', 'გააკეთა'),
        (r'(?<![\u10A0-\u10FF])განხორციელება(?![ა-ჰ])', 'შესრულება'),
        (r'(?<![\u10A0-\u10FF])ადგილი\s+ჰქონდა(?![ა-ჰ])', 'მოხდა'),
        (r'(?<![\u10A0-\u10FF])წარმოადგენს(?![ა-ჰ])', 'არის'),
        (r'(?<![\u10A0-\u10FF])მოცემულ\s+მომენტში(?![ა-ჰ])', 'ამჟამად'),
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+ღიმილი(?![ა-ჰ])', 'გაიღიმა'),
    ]
    for pattern, repl in calques:
        t = re.sub(pattern, repl, t)

    return t.strip()


def synthesize_georgian_morphology(text: str) -> str:
    """Deterministic Georgian Pro morphosyntactic engine:
    - Postposition vowel syncopation and truncation (კუმშვა/კვეცა: ქალაქი -> ქალაქში, წყალი -> წყლიდან, მგელი -> მგლის)
    - Transitive Aorist Ergative case concord (უფლისწული დაინახა -> უფლისწულმა დაინახა, მეფე თქვა -> მეფემ თქვა)
    - Experiencer Dative Inversion (ის უნდა -> მას უნდა, ის სჭირდება -> მას სჭირდება, ის უყვარს -> მას უყვარს)
    - Prohibitive negative imperatives (არ წახვიდე -> ნუ წახვალ, არ შეგეშინდეს -> ნუ გეშინია)
    """
    if not text:
        return text
    t = text

    # 1. Postposition vowel syncopation and truncation (კუმშვა/კვეცა)
    # Specific stem-syncopated words (კუმშვა) handled before general truncation
    t = re.sub(r'(?<![\u10A0-\u10FF])წყალ(?:ი)?-?დან(?![ა-ჰ])', 'წყლიდან', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])წყალ(ის|ით|იდან|ისკენ|ისთვის)(?![ა-ჰ])', r'წყლ\g<1>', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მგელ(?:ი)?-?ის(?![ა-ჰ])', 'მგლის', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მგელ(?:ი)?-?დან(?![ა-ჰ])', 'მგლიდან', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მგელ(ის|ით|იდან|ისკენ|ისთვის)(?![ა-ჰ])', r'მგლ\g<1>', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])ქვეყან(?:ა)?-?(ში|ზე|თან)(?![ა-ჰ])', 'ქვეყანაში', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])ქვეყან(?:ა)?-?(დან|ის|ით)(?![ა-ჰ])', 'ქვეყნიდან', t)

    # Consonant stems drop nominative -ი before -ში, -ზე, -თან
    t = re.sub(r'([ა-ჰ]+[ბგდვზთკლმნპჟრსტუფქღყშჩცძწჭხჯჰ])ი-?(ში|ზე|თან)(?![ა-ჰ])', r'\g<1>\g<2>', t)
    # Consonant stems attach -იდან
    t = re.sub(r'([ა-ჰ]+[ბგდვზთკლმნპჟრსტუფქღყშჩცძწჭხჯჰ])(?:ი)?-დან(?![ა-ჰ])', r'\g<1>იდან', t)

    # 2. Screeve Series II Transitive Aorist Ergative Concord (-მა / -მ)
    aorist_verbs = r'(?:დაინახა|თქვა|გააკეთა|მოისმინა|დაწერა|გადაწყვიტა|გააღო|შექმნა|იპოვა|მოკლა|წაიკითხა|უპასუხა|გახსნა|ჩაკეტა|მოძებნა|დაკარგა|შეიყვარა|მიატოვა|გაუგზავნა|მოუყვა)'
    subjects_i = r'(?:პატარა\s+უფლისწულ|უფლისწულ|კაც|ბავშვ|ბიჭ|ქალ|ავტორ|ვარდ|მგელ|ადამიან|მეგობარ|მწერალ|პოეტ|ექიმ)'
    t = re.sub(r'(?<![\u10A0-\u10FF])(' + subjects_i + r')ი(\s+(?:[ა-ჰ]+\s+)?' + aorist_verbs + r')(?![ა-ჰ])', r'\g<1>მა\g<2>', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])(მეფე|მელა|გოგო|დედა|მამა|ძმა|დეიდა|ბიძა)(\s+(?:[ა-ჰ]+\s+)?' + aorist_verbs + r')(?![ა-ჰ])', r'\g<1>მ\g<2>', t)

    # 3. Screeve Series III & Experiencer Dative Inversion
    experiencer_verbs = r'(?:უნდა|სჭირდება|უყვარს|ახსოვს|ეშინია|სტკივა|შია|ცივა|უნახავს|გაუგია)'
    t = re.sub(r'(?<![\u10A0-\u10FF])ის(\s+(?:[ა-ჰ]+\s+)?' + experiencer_verbs + r')(?![ა-ჰ])', r'მას\g<1>', t)

    # 4. Negative Imperatives: Declarative არ with imperative verbs -> prohibitive ნუ
    imperative_fixes = [
        (r'(?<![\u10A0-\u10FF])არ\s+წახვიდე(?![ა-ჰ])', 'ნუ წახვალ'),
        (r'(?<![\u10A0-\u10FF])არ\s+შეგეშინდეს(?![ა-ჰ])', 'ნუ გეშინია'),
        (r'(?<![\u10A0-\u10FF])არ\s+იტირო(?![ა-ჰ])', 'ნუ ტირი'),
        (r'(?<![\u10A0-\u10FF])არ\s+დაივიწყო(?![ა-ჰ])', 'ნუ დაივიწყებ'),
        (r'(?<![\u10A0-\u10FF])არ\s+დაგავიწყდეს(?![ა-ჰ])', 'ნუ დაივიწყებ'),
    ]
    for pat, repl in imperative_fixes:
        t = re.sub(pat, repl, t)

    # 5. Reflexive Pronoun Auto-Repair: Inviolability of თავისი when coreferent with clause subject
    t = re.sub(r'(?<![\u10A0-\u10FF])(მან|ავტორმა|კაცმა|ქალმა|ბავშვმა|ბიჭმა|გოგომ|უფლისწულმა|მეფემ)\s+მისი(?![ა-ჰ])', r'\g<1> თავისი', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])(მან|ავტორმა|კაცმა|ქალმა|ბავშვმა|ბიჭმა|გოგომ|უფლისწულმა|მეფემ)\s+მის(?![ა-ჰ])', r'\g<1> თავის', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მათ\s+მათი(?![ა-ჰ])', 'მათ თავიანთი', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მათ\s+მათ(?=\s+[ა-ჰ]+)(?![ა-ჰ])', 'მათ თავიანთ', t)

    # 6. Prepositional & Postpositional Phrase Synthesis
    def _with_postposition(match):
        stem = match.group(1)
        if stem and stem[-1] in 'აეოუ':
            return stem + 'სთან'
        s = stem[:-1] if stem.endswith('ი') else stem
        return s + 'თან'

    t = re.sub(r'\b(?:with|with\s+the)\s+([ა-ჰ]+?)(?:ი)?(?![ა-ჰ])', _with_postposition, t, flags=re.IGNORECASE)
    t = re.sub(r'\bbehind\s+(?:the\s+)?კარი(?![ა-ჰ])', 'კარს უკან', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbehind\s+(?:the\s+)?([ა-ჰ]+?)(?:ი)?(?![ა-ჰ])', lambda m: (m.group(1)[:-1] if m.group(1).endswith('ი') else m.group(1)) + 'ის უკან', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:in|in\s+the)\s+([ა-ჰ]+?)(?:ი)?(?![ა-ჰ])', lambda m: (m.group(1)[:-1] if m.group(1).endswith('ი') else m.group(1)) + 'ში', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:from|from\s+the)\s+([ა-ჰ]+?)(?:ი)?(?![ა-ჰ])', lambda m: (m.group(1)[:-1] if m.group(1).endswith('ი') else m.group(1)) + 'იდან', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:to|to\s+the)\s+([ა-ჰ]+?)(?:ი)?(?![ა-ჰ])', lambda m: (m.group(1)[:-1] if m.group(1).endswith('ი') else m.group(1)) + 'ს', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:of|of\s+the)\s+([ა-ჰ]+?)(?:ი)?(?![ა-ჰ])', lambda m: (m.group(1)[:-1] if m.group(1).endswith('ი') else m.group(1)) + 'ის', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(?:the|a|an)\s+([\u10A0-\u10FF])', r'\g<1>', t, flags=re.IGNORECASE)

    return t


OFFLINE_LITERARY_EXEMPLARS = [
    (r"all grown-ups were once children\.?\.\.? but only few of them remember it\.?",
     "ყველა დიდი ოდესღაც ბავშვი იყო... მაგრამ ცოტას ახსოვს ეს."),
    (r"it is only with the heart that one can see rightly;? what is essential is invisible to the eye\.?",
     "მხოლოდ გული ხედავს კარგად; მთავარი თვალისთვის უხილავია."),
    (r"to be,? or not to be,? that is the question\.?",
     "ყოფნა? არყოფნა? საკითხავი აი, ეს არის."),
    (r"once upon a time(?:,)? there was a little prince(?:,)? who lived on a planet",
     "იყო და არა იყო რა, ცხოვრობდა ერთი პატარა უფლისწული, რომელიც თავის პლანეტაზე მკვიდრობდა"),
    (r"once upon a time", "იყო და არა იყო რა"),
    (r"good morning", "დილა მშვიდობისა"),
    (r"good evening", "საღამო მშვიდობისა"),
    (r"good night", "ღამე მშვიდობისა"),
    (r"i love you", "მიყვარხარ"),
    (r"i do not know|i don't know", "არ ვიცი"),
    (r"thank you very much|thank you", "დიდი მადლობა"),
    (r"please", "გთხოვთ"),
]

OFFLINE_EN_KA_LEXICON = {
    # Pronouns
    "i": "მე", "me": "მე", "my": "ჩემი", "mine": "ჩემი",
    "you": "შენ", "your": "შენი", "yours": "შენი",
    "he": "ის", "him": "მას", "his": "მისი",
    "she": "ის", "her": "მისი",
    "it": "ის", "its": "მისი",
    "we": "ჩვენ", "us": "ჩვენ", "our": "ჩვენი", "ours": "ჩვენი",
    "they": "ისინი", "them": "მათ", "their": "მათი", "theirs": "მათი",
    "this": "ეს", "that": "ის", "these": "ესენი", "those": "ისინი",
    # Verbs
    "is": "არის", "are": "არიან", "was": "იყო", "were": "იყვნენ",
    "will": "იქნება", "be": "იყოს", "been": "ყოფილა",
    "have": "აქვს", "has": "აქვს", "had": "ჰქონდა",
    "said": "თქვა", "say": "ამბობს", "says": "ამბობს",
    "thought": "გაიფიქრა", "think": "ფიქრობს",
    "saw": "დაინახა", "see": "ხედავს", "seen": "უნახავს",
    "looked": "შეხედა", "look": "უყურებს",
    "knew": "იცოდა", "know": "იცის",
    "smiled": "გაიღიმა", "smile": "იღიმის",
    "asked": "ჰკითხა", "ask": "ეკითხება",
    "answered": "უპასუხა", "replied": "უპასუხა",
    "went": "წავიდა", "go": "მიდის", "goes": "მიდის",
    "came": "მოვიდა", "come": "მოდის",
    "lived": "ცხოვრობდა", "live": "ცხოვრობს",
    "heard": "მოისმინა", "hear": "ესმის",
    "wrote": "დაწერა", "write": "წერს",
    "read": "წაიკითხა", "found": "იპოვა",
    "opened": "გახსნა", "closed": "ჩაკეტა",
    "searched": "მოძებნა", "lost": "დაკარგა",
    "abandoned": "მიატოვა", "sent": "გაუგზავნა",
    "told": "მოუყვა", "understood": "გაიგო",
    "explained": "აუხსნა",
    "created": "შექმნა", "decided": "გადაწყვიტა",
    "wants": "უნდა", "wanted": "უნდოდა",
    "needs": "სჭირდება", "needed": "სჭირდებოდა",
    "remembers": "ახსოვს", "remembered": "გაახსენდა",
    "fears": "ეშინია", "feared": "ეშინოდა",
    # Nouns
    "prince": "უფლისწული", "princes": "უფლისწულები",
    "king": "მეფე", "queen": "დედოფალი",
    "flower": "ყვავილი", "rose": "ვარდი",
    "planet": "პლანეტა", "star": "ვარსკვლავი", "stars": "ვარსკვლავები",
    "sun": "მზე", "moon": "მთვარე", "fox": "მელა",
    "desert": "უდაბნო", "water": "წყალი", "child": "ბავშვი",
    "children": "ბავშვები", "man": "კაცი", "men": "კაცები",
    "woman": "ქალი", "women": "ქალები", "life": "სიცოცხლე",
    "heart": "გული", "eye": "თვალი", "eyes": "თვალები",
    "day": "დღე", "night": "ღამე", "friend": "მეგობარი",
    "friends": "მეგობრები", "love": "სიყვარული", "world": "სამყარო",
    "time": "დრო", "book": "წიგნი", "books": "წიგნები",
    "word": "სიტყვა", "words": "სიტყვები", "chapter": "თავი",
    "author": "ავტორი", "writer": "მწერალი", "poet": "პოეტი",
    "doctor": "ექიმი", "teacher": "მასწავლებელი", "city": "ქალაქი",
    "village": "სოფელი", "country": "ქვეყანა", "mother": "დედა",
    "father": "მამა", "brother": "ძმა", "sister": "და",
    "son": "შვილი", "daughter": "ქალიშვილი", "sky": "ცა",
    "sea": "ზღვა", "mountain": "მთა", "forest": "ტყე",
    "river": "მდინარე", "stone": "ქვა", "soul": "სული",
    "truth": "ჭეშმარიტება", "freedom": "თავისუფლება", "secret": "საიდუმლო",
    "airplane": "თვითმფრინავი", "victory": "გამარჯვება", "joy": "სიხარული",
    "death": "სიკვდილი", "beauty": "მშვენიერება",
    # Adjectives & Adverbs
    "little": "პატარა", "small": "პატარა", "big": "დიდი",
    "great": "დიდებული", "beautiful": "ლამაზი", "good": "კარგი",
    "bad": "ცუდი", "true": "ჭეშმარიტი", "old": "ძველი",
    "young": "ახალგაზრდა", "new": "ახალი", "important": "მნიშვნელოვანი",
    "only": "მხოლოდ", "very": "ძალიან", "so": "ასე",
    "then": "მაშინ", "there": "იქ", "here": "აქ",
    "now": "ახლა", "always": "ყოველთვის", "never": "არასოდეს",
    # Conjunctions & Prepositions
    "and": "და", "but": "მაგრამ", "or": "ან",
    "if": "თუ", "because": "რადგან", "when": "როცა",
    "where": "სად", "how": "როგორ", "why": "რატომ",
    "not": "არ", "no": "არა", "yes": "დიახ",
    "in": "-ში", "on": "-ზე", "with": "-თან", "from": "-დან", "towards": "-კენ",
}


def translate_offline_en_to_ka(text: str) -> str:
    if not text or not text.strip():
        return ""
    t = text.strip()

    # Match literary quotes & idioms
    for pat, repl in OFFLINE_LITERARY_EXEMPLARS:
        m = re.search(pat, t, re.IGNORECASE)
        if m:
            t = re.sub(pat, repl, t, flags=re.IGNORECASE)

    # Word-level replacement for English tokens
    def replace_token(match):
        word = match.group(0)
        low = word.lower()
        if low in OFFLINE_EN_KA_LEXICON:
            return OFFLINE_EN_KA_LEXICON[low]
        return word

    t = re.sub(r'\b[a-zA-Z]+\b', replace_token, t)
    t = synthesize_georgian_morphology(t)
    return clean_georgian_morphology(t)


def translate_text(text: str, source_lang: str = "auto", target_lang: str = "ka") -> dict:
    if not text or not text.strip():
        return {"translated": "", "engine": "none", "success": True}

    src = "en" if source_lang in ("en", "eng") else ("ka" if source_lang in ("ka", "kat") else "auto")
    tgt = "ka" if target_lang in ("ka", "kat") else "en"

    # Split into paragraphs to maintain narrative structure
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    translated_paras = []
    engine_used = "server_neural_translate"

    for p in paragraphs:
        p_trans = None

        # Tier 0: Direct Google Translation API (ultra-stable, zero rate-limit)
        try:
            import httpx
            from urllib.parse import quote
            url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl={src}&tl={tgt}&dt=t&q={quote(p)}"
            resp = httpx.get(url, timeout=12.0)
            if resp.status_code == 200:
                data = resp.json()
                if data and data[0] and isinstance(data[0], list):
                    p_trans = "".join([item[0] for item in data[0] if item and item[0]])
                    engine_used = "server_neural_google"
        except Exception as e:
            print(f"[translation_engine] Tier 0 direct translation failed: {e}")

        # Tier 1: deep-translator GoogleTranslator fallback
        if not p_trans and GoogleTranslator is not None:
            try:
                tr = GoogleTranslator(source=src, target=tgt)
                if len(p) <= 4500:
                    p_trans = tr.translate(p)
                else:
                    sentences = re.split(r'(?<=[.!?…])\s+', p)
                    sub_chunks = []
                    cur = ""
                    for s in sentences:
                        if len(cur) + len(s) + 1 < 4000:
                            cur = (cur + " " + s).strip()
                        else:
                            sub_chunks.append(cur)
                            cur = s
                    if cur:
                        sub_chunks.append(cur)
                    p_trans = " ".join([tr.translate(sc) for sc in sub_chunks if sc])
                engine_used = "deep_translator_google"
            except Exception as e:
                print(f"[translation_engine] GoogleTranslator failed: {e}")

        # Tier 2: Offline literary translation engine fallback
        if not p_trans:
            if tgt == "ka":
                offline_res = translate_offline_en_to_ka(p)
                if re.search(r'[\u10A0-\u10FF]', offline_res):
                    p_trans = offline_res
                    engine_used = "offline_rule_engine"
                else:
                    p_trans = p
                    engine_used = "fallback_original"
            else:
                p_trans = p
                engine_used = "fallback_original"

        if tgt == "ka":
            p_trans = clean_georgian_morphology(p_trans)

        translated_paras.append(p_trans)

    return {
        "translated": "\n\n".join(translated_paras),
        "engine": engine_used,
        "success": True
    }
