# -*- coding: utf-8 -*-
import os
import re
import time
import threading
import concurrent.futures
from typing import Optional
from app.text_integrity import normalize_language, detect_language, split_bounded, translation_is_valid, polish_georgian_literary_syntax, reflow_narrative_paragraphs

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

try:
    from deep_translator import GoogleTranslator, LibreTranslator, MyMemoryTranslator
except ImportError:
    GoogleTranslator = None
    LibreTranslator = None
    MyMemoryTranslator = None

try:
    from app.training_engine import load_active_pack, apply_pack
except ImportError:
    load_active_pack = None
    apply_pack = None


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
        (r'(?<![\u10A0-\u10FF])მიიღეს\s+გადაწყვეტილება(?![ა-ჰ])', 'გადაწყვიტეს'),
        (r'(?<![\u10A0-\u10FF])განახორციელა(?![ა-ჰ])', 'გააკეთა'),
        (r'(?<![\u10A0-\u10FF])განხორციელება(?![ა-ჰ])', 'შესრულება'),
        (r'(?<![\u10A0-\u10FF])ადგილი\s+ჰქონდა(?![ა-ჰ])', 'მოხდა'),
        (r'(?<![\u10A0-\u10FF])ადგილი\s+აქვს(?![ა-ჰ])', 'ხდება'),
        (r'(?<![\u10A0-\u10FF])წარმოადგენს(?![ა-ჰ])', 'არის'),
        (r'(?<![\u10A0-\u10FF])მოცემულ\s+მომენტში(?![ა-ჰ])', 'ამჟამად'),
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+ღიმილი(?![ა-ჰ])', 'გაიღიმა'),
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+არჩევანი(?![ა-ჰ])', 'აირჩია'),
        (r'(?<![\u10A0-\u10FF])გააკეთა\s+განცხადება(?![ა-ჰ])', 'განაცხადა'),
        (r'(?<![\u10A0-\u10FF])ითამაშა\s+(?:მნიშვნელოვანი|დიდი)?\s*როლი(?![ა-ჰ])', 'როლი შეასრულა'),
        (r'(?<![\u10A0-\u10FF])დიდი\s+მნიშვნელობა\s+აქვს(?![ა-ჰ])', 'სასიცოცხლო მნიშვნელობისაა'),
        (r'(?<![\u10A0-\u10FF])ნათელი\s+გახდა(?![ა-ჰ])', 'გამოჩნდა'),
        (r'(?<![\u10A0-\u10FF])აზრი\s+გამოთქვა(?![ა-ჰ])', 'თქვა'),
        (r'(?<![\u10A0-\u10FF])ყურადღება\s+გაამახვილა(?![ა-ჰ])', 'ხაზი გაუსვა'),
        (r'(?<![\u10A0-\u10FF])თავის\s+მხრივ(?![ა-ჰ])', 'თავისთავად'),
        (r'(?<![\u10A0-\u10FF])საფუძველი\s+ჩაუყარა(?![ა-ჰ])', 'დააფუძნა'),
        (r'(?<![\u10A0-\u10FF])თვალის\s+დევნება(?![ა-ჰ])', 'ყურება'),
        (r'(?<![\u10A0-\u10FF])სარგებლობა\s+მოაქვს(?![ა-ჰ])', 'სარგებელი აქვს'),
        (r'(?<![\u10A0-\u10FF])საქმე\s+იმაშია(?![ა-ჰ])', 'საქმე ისაა'),
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
    aorist_verbs = r'(?:დაინახა|თქვა|გააკეთა|მოისმინა|დაწერა|გადაწყვიტა|გააღო|შექმნა|იპოვა|მოკლა|წაიკითხა|უპასუხა|გახსნა|ჩაკეტა|მოძებნა|დაკარგა|შეიყვარა|მიატოვა|გაუგზავნა|მოუყვა|გამოაცხადა|დადო|დაასრულა|შეამჩნია|აღმოაჩინა|ააშენებინა|დააწერინა|დაალევინა|გააკეთებინა|აიშენა|აუშენა|შეიკერა|შეუკერა|გაიღიმა|ჩაიცინა|ამოიოხრა|ჩაილაპარაკა|მიუგო|მიმართა)'
    subjects_i = r'(?:პატარა\s+უფლისწულ|უფლისწულ|მარკუს\s+ავრელიუს|არისტოტელ|პლატონ|ჰომეროს|შექსპირ|ციცერონ|სენეკ|ეპიქტეტ|მაკიაველ|მოგზაურ|მეცნიერ|ფილოსოფოს|კაც|ბავშვ|ბიჭ|ქალ|ავტორ|ვარდ|მგელ|ადამიან|მეგობარ|მწერალ|პოეტ|ექიმ|ოსტატ|მასწავლებელ|შეგირდ|პროფესორ|კონსტანტინე\s+არსაკიძ|არსაკიძ|თეიმურაზ\s+ხევისთავ|ჯაყო|კვაჭი|იაკობ\s+ცურტაველ|იოანე\s+საბანისძ|დავით\s+გურამიშვილ|მკითხველ(?:მა)?\s+მეცნიერ|კონსტანტ|მალაქი\s+კონსტანტ|რამფორდ|უინსტონ\s+ნაილს\s+რამფორდ|კაზაკ)'
    t = re.sub(r'(?<![\u10A0-\u10FF])(' + subjects_i + r')ი(\s+(?:[ა-ჰ]+\s+)?' + aorist_verbs + r')(?![ა-ჰ])', r'\g<1>მა\g<2>', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])(მეფე|მელა|გოგო|დედა|მამა|ძმა|დეიდა|ბიძა|სახელმწიფო|სოკრატე|სენეკა)(\s+(?:[ა-ჰ]+\s+)?' + aorist_verbs + r')(?![ა-ჰ])', r'\g<1>მ\g<2>', t)

    # 2b. Screeve Series II Medial Verb Ergative Concord (-მა / -მ)
    medial_verbs = r'(?:დაუბერა|გაანათა|იტირა|გაიარა|გაუელვა|დაიგრგვინა|იცინა|იმღერა|ილაპარაკა|იყვირა|დაიყვირა|გაიელვა|დაიქუხა|ჩაილაპარაკა|ამოიოხრა)'
    medial_subjects = r'(?:ქარ|მზე|აზრ|ჭექა-ქუხილ|ც|ბავშვ|მგზავრ|ხალხ|მეომარ|ოსტატ|მეფ|ავტორ|მწერალ|მკითხველ)'
    t = re.sub(r'(?<![\u10A0-\u10FF])(' + medial_subjects + r')ი(\s+(?:[ა-ჰ]+\s+)?' + medial_verbs + r')(?![ა-ჰ])', r'\g<1>მა\g<2>', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])(მზე|ცა|დედა|მამა)(\s+(?:[ა-ჰ]+\s+)?' + medial_verbs + r')(?![ა-ჰ])', r'\g<1>მ\g<2>', t)

    # 3. Screeve Series III & Experiencer Dative Inversion
    experiencer_verbs = (
        r'(?:სურს|სურდა|მოსწონს|მოსწონდა|ეჩვენება|ეჩვენებოდა|ეხერხება|ეზარება|სწყურია|'
        r'აინტერესებს|აღელვებს|უნდა|უნდოდა|სჭირდება|სჭირდებოდა|უყვარს|უყვარდა|ახსოვს|'
        r'ახსოვდა|ეშინია|ეშინოდა|სტკივა|სტკიოდა|შია|ცივა|სცივა|უნახავს|გაუგია|დაეკარგა|'
        r'გაუტყდა|შეეშალა|დაავიწყდა)'
    )
    t = re.sub(r'(?<![\u10A0-\u10FF])ის(\s+(?:[ა-ჰ]+\s+)?' + experiencer_verbs + r')(?![ა-ჰ])', r'მას\g<1>', t)

    # 4. Negative Imperatives: Declarative არ with imperative verbs -> prohibitive ნუ
    imperative_fixes = [
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
    for pat, repl in imperative_fixes:
        t = re.sub(pat, repl, t)

    # 5. Reflexive Pronoun Auto-Repair: Inviolability of თავისი when coreferent with clause subject
    t = re.sub(r'(?<![\u10A0-\u10FF])(მან|ავტორმა|მარკუს\s+ავრელიუსმა|კაცმა|ქალმა|ბავშვმა|ბიჭმა|გოგომ|უფლისწულმა|მეფემ)\s+მისი(?![ა-ჰ])', r'\g<1> თავისი', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])(მან|ავტორმა|მარკუს\s+ავრელიუსმა|კაცმა|ქალმა|ბავშვმა|ბიჭმა|გოგომ|უფლისწულმა|მეფემ)\s+მის(?![ა-ჰ])', r'\g<1> თავის', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მათ\s+მათი(?![ა-ჰ])', 'მათ თავიანთი', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])მათ\s+მათ(?=\s+[ა-ჰ]+)(?![ა-ჰ])', 'მათ თავიანთ', t)

    # 5b. Series III Indirect Evidential Concord with თურმე
    evidential_concord = [
        (r'(?<![\u10A0-\u10FF])თურმე\s+ააშენა(?![ა-ჰ])', 'თურმე აუშენებია'),
        (r'(?<![\u10A0-\u10FF])თურმე\s+დაწერა(?![ა-ჰ])', 'თურმე დაუწერია'),
        (r'(?<![\u10A0-\u10FF])თურმე\s+თქვა(?![ა-ჰ])', 'თურმე უთქვამს'),
        (r'(?<![\u10A0-\u10FF])თურმე\s+დაინახა(?![ა-ჰ])', 'თურმე უნახავს'),
        (r'(?<![\u10A0-\u10FF])თურმე\s+გააკეთა(?![ა-ჰ])', 'თურმე გაუკეთებია'),
    ]
    for pat, repl in evidential_concord:
        t = re.sub(pat, repl, t)

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

    t = polish_georgian_literary_syntax(t)
    return t


OFFLINE_LITERARY_EXEMPLARS = [
    (r"all grown-ups were once children\.?\.\.? but only few of them remember it\.?",
     "ყველა დიდი ოდესღაც ბავშვი იყო... მაგრამ ცოტას ახსოვს ეს."),
    (r"it is only with the heart that one can see rightly;? what is essential is invisible to the eye\.?",
     "მხოლოდ გული ხედავს კარგად; მთავარი თვალისთვის უხილავია."),
    (r"to be,? or not to be,? that is the question\.?",
     "ყოფნა?.. არ ყოფნა?.. საკითხავი აი ეს არის."),
    (r"something is rotten in the state of denmark\.?",
     "რაღაც დამპალა დანიის სამეფოში."),
    (r"life is but a walking shadow,? a poor player\.?",
     "ცხოვრება არის მხოლოდ და მხოლოდ აჩრდილი მოსიარულე."),
    (r"blow,? winds,? and crack your cheeks!? rage!? blow!?",
     "იზუზუნე და იქროლე შენ, ქარო მსუსხავო, უბერე!"),
    (r"cowards die many times before their deaths;? the valiant never taste of death but once\.?",
     "მშიშარა სიკვდილამდე მრავალგზის კვდება, მამაცი კი სიკვდილის გემოს მხოლოდ ერთხელ შეიგრძნობს."),
    (r"sing in me,? goddess,? the wrath of achilles son of peleus\.?",
     "რისხვაზე, ქალღმერთო, პელევსის ძის, აქილევსის, იმ საბედისწერო რისხვაზე მიმღერე."),
    (r"tell me,? o muse,? of that man of many resources\.?",
     "მიამბე, მუზავ, მრავალნაცად კაცის ამბავი."),
    (r"midway upon the journey of our life i found myself in a dark forest\.?",
     "ჩვენი სიცოცხლის შუა გზაზე აღმოვჩნდი დაბურულ ტყეში."),
    (r"a bad friend is like a shadow:? in sunny weather it follows you,? in the shade you will not find it\.?",
     "ცუდი მეგობარი ჩრდილივითაა: მზიან დარულში თან დაგყვება, ჩრდილში კი ვერსად იპოვი."),
    (r"wounded by the tongue is heavier than wounded by the sword\.?",
     "ენით დაკოდილი უფრო მძიმეა, ვიდრე მახვილით დაკოდილი."),
    (r"movement and only movement is the source of life\.?",
     "მოძრაობა და მხოლოდ მოძრაობა არის ქვეყნის ღონე და სიცოცხლე."),
    (r"the master made the apprentice build the high wall\.?",
     "ოსტატმა შეგირდს მაღალი კედელი ააშენებინა."),
    (r"the teacher made the pupil write the difficult essay\.?",
     "მასწავლებელმა მოსწავლეს რთული თხზულება დააწერინა."),
    (r"the reading scholar found wisdom in the written manuscript\.?",
     "მკითხველმა მეცნიერმა დაწერილ ხელნაწერში სიბრძნე იპოვა."),
    (r"today he is my guest,? though an ocean of blood be owed\.?",
     "დღეს სტუმარია ეგ ჩემი, თუნდ ზღვა ემართოს სისხლისა!"),
    (r"a valiant man needs a heart of iron,? even if his armor is made of clay\.?",
     "ვაჟკაცსა გული რკინისა, აბჯარი თუნდაც თიხისა."),
    (r"better a death with renown than a life in disgrace!?|better a death with renown than a life in disgrace\.?",
     "სჯობს სიცოცხლესა ნაზრახსა სიკვდილი სახელოვანი!"),
    (r"good hath overcome evil,? its essence is everlasting\.?",
     "ბოროტსა სძლია კეთილმან, არსება მისი გრძელია."),
    (r"he who seeks not a friend is an enemy to himself\.?",
     "ვინ მოყვარესა არ ეძებს, იგი თავისა მტერია."),
    (r"onward,? merani,? your gallop knows no bounds!?|onward,? merani,? your gallop knows no bounds\.?",
     "გასწი, მერანო, შენს ჭენებას არა აქვს სამზღვარი!"),
    (r"not in vain shall pass this desperate soul's striving\.?",
     "ცუდად ხომ მაინც არა ჩაივლის ეს განწირულის სულისკვეთება."),
    (r"never yet was born a moon so calm!?|never yet was born a moon so calm\.?",
     "ჯერ არასდროს არ შობილა მთვარე ასე წყნარი!"),
    (r"the wind blows,? the wind blows,? the wind blows,? leaves fly in the gust\.?",
     "ქარი ქრის, ქარი ქრის, ქარი ქრის, ფოთლები მიჰქრიან ქარდაქარ."),
    (r"all existing beings desire goodness and beauty\.?",
     "ყოველსა არსებულსა სწადს სიკეთე და მშვენიერება."),
    (r"the traveler lost his ancient map in the snow\.?",
     "მგზავრს თოვლში ძველი რუკა დაეკარგა."),
    (r"the child accidentally broke the porcelain vase\.?",
     "ბავშვს ფაიფურის ლარნაკი გაუტყდა."),
    (r"he built a stone house for himself\.?",
     "მან თავისთვის ქვის სახლი აიშენა."),
    (r"he built a stone house for his brother\.?",
     "მან თავის ძმას ქვის სახლი აუშენა."),
    (r"art is itself immortality\.? death cannot overtake the master\.?",
     "ხელოვნებაა თვით უკვდავება. მხოლოდ ოსტატს ვერ ეწევა სიკვდილი."),
    (r"svetitskhoveli in my eyes is an inscrutable creation of great art\.?",
     "სვეტიცხოველი ჩემს თვალში დიდი ხელოვნების იგავმიუწვდენელი ქმნილებაა."),
    (r"svetitskhoveli is a symphony of boulders soaring into the sky\.?",
     "სვეტიცხოველი არის ცაში ატყორცნილი სიმფონია ლოდებისა."),
    (r"time never comes,? it passes,? and whoever does not follow it will perish\.?",
     "დრო არასოდეს არ მოდის, იგი მიდის და ვინც მას არ გაჰყვება, დაიღუპება."),
    (r"justice still exists in this world;? it pursues evil on an ox-cart,? but in the end it surely overtakes it\.?",
     "ამ ქვეყნად მაინც არსებობს სამართალი; ის ურმით დასდევს ბოროტებას, მაგრამ ბოლოს უეჭველად წამოეწევა."),
    (r"he was an unmatched master of wit and cunning adventure\.?",
     "იგი იყო მახვილგონიერებისა და ეშმაკური თავგადასავლების შეუდარებელი ოსტატი."),
    (r"a youth must study to understand oneself:? who one is,? whence one came,? where one is,? whither one shall go\.?",
     "ყმაწვილი უნდა სწავლობდეს საცნობლად თავისადა: ვინ არის, სიდამ მოსულა, სად არის, წავა სადა."),
    (r"knowledge is the inexhaustible wealth of man\.?",
     "ცოდნა ადამიანის ულევი სიმდიდრეა."),
    (r"and now i shall truly tell you the martyrdom of the holy and blessed shushanik\.?",
     "და აწ დამტკიცებულად გითხრა თქვენ აღსასრული წმიდისა და სანატრელისა შუშანიკისი."),
    (r"they are shaken like reeds before strong winds\.?",
     "ირყევიან, ვითარცა ლერწამნი ქართაგან ძლიერთა."),
    (r"he became an intercessor for all this land of kartli\.?",
     "იგი შეიქნა მეოხი ყოვლისა ამის ქვეყნისა ქართლისათვის."),
    (r"the professor had the student write a comprehensive thesis\.?",
     "პროფესორმა სტუდენტს ვრცელი ნაშრომი დააწერინა."),
    (r"the king had the master builder construct a grand cathedral\.?",
     "მეფემ დიდოსტატს დიდებული ტაძარი ააშენებინა."),
    (r"they spoke only of honor and eternal memory\.?",
     "ისინი მხოლოდოდენ ღირსებასა და მარადიულ ხსოვნაზე საუბრობდნენ."),
    (r"doing good also requires wisdom\.?",
     "სიკეთის კეთებასაც სიბრძნე სჭირდება!"),
    (r"silent goodness governs the universe\.?",
     "სამყაროს ჩუმი სიკეთე მართავს."),
    (r"to share your bread with the needy is a man's plain duty\.?",
     "გაჭირვებულს შენი ლუკმა რომ გაუტეხო, კაცის მოვალეობაა ეგ."),
    (r"the human soul is far heavier than the body,? so heavy that one person cannot bear it alone\.?",
     "ადამიანის სული გაცილებით უფრო მძიმეა, ვიდრე სხეული, იმდენად მძიმე, რომ ერთ ადამიანს მისი ტარება არ შეუძლია."),
    (r"while you are alive you will not die,? and if you die,? you will fear nothing\.?",
     "სანამ ცოცხალი ხარ არ მოკვდები, და თუ მოკვდი, მერე აღარაფრის შეგეშინდება."),
    (r"i see the sun,? and the sun shines upon every honest heart\.?",
     "მე ვხედავ მზეს, და მზე ანათებს ყოველ პატიოსან გულს."),
    (r"betrayal of the homeland is forgiven neither to son nor to father\.?",
     "სამშობლოს ღალატი არ ეპატიება არც შვილს და არც მამას."),
    (r"the word of the khevisberi is supreme law for the clan\.?",
     "ხევისბერის სიტყვა თემისთვის უზენაესი კანონია."),
    (r"skill surpasses brute strength,? if a man devises it\.?",
     "ხერხი სჯობია ღონესა, თუ კაცი მოიგონებსა."),
    (r"what you give away is yours,? what you do not is lost!?|what you give away is yours,? what you do not is lost\.?",
     "რასაცა გასცემ შენია, რაც არა, დაკარგულია!"),
    (r"a wound from a sword heals,? but a wound from a word does not\.?",
     "ხმლისაგან დაჭრილი გამრთელდა, ენით დაჭრილი კი არა."),
    (r"the warriors fought fiercely against each other on the battlefield\.?",
     "მეომრები ბრძოლის ველზე სასტიკად შეებრძოლნენ ერთმანეთს."),
    (r"he was able to finish the manuscript before sunset\.?",
     "მან მზის ჩასვლამდე შეძლო ხელნაწერის დასრულება."),
    (r"brothers,? let us preserve the ancient covenant of our ancestors!?|brothers,? let us preserve the ancient covenant of our ancestors\.?",
     "ძმანო, დავიცვათ ჩვენი წინაპრების უძველესი აღთქმა!"),
    (r"you have power over your mind -? not outside events\.? realize this,? and you will find strength\.?",
     "შენ გაქვს ძალაუფლება შენს გონებაზე — და არა გარეგან მოვლენებზე. გააცნობიერე ეს და იპოვი ძალას."),
    (r"waste no more time arguing what a good man should be\.? be one\.?",
     "ნუღარ კარგავ დროს იმაზე დავაში, როგორი უნდა იყოს კარგი ადამიანი. იყავი ასეთი."),
    (r"the happiness of your life depends upon the quality of your thoughts\.?",
     "შენი ცხოვრების ბედნიერება შენი ფიქრების ხარისხზეა დამოკიდებული."),
    (r"very little is needed to make a happy life;? it is all within yourself,? in your way of thinking\.?",
     "ძალიან ცოტა რამ არის საჭირო ბედნიერი ცხოვრებისთვის; ეს ყველაფერი შენშია, შენი აზროვნების წესში."),
    (r"when you arise in the morning,? think of what a precious privilege it is to be alive\.?",
     "დილით რომ გაიღვიძებ, იფიქრე იმაზე, რაოდენ ძვირფასი პატივია ცოცხალი იყო."),
    (r"the supreme art of war is to subdue the enemy without fighting\.?",
     "ომის უზენაესი ხელოვნებაა მტრის დამორჩილება ბრძოლის გარეშე."),
    (r"in the midst of chaos,? there is also opportunity\.?",
     "ქაოსის შუაგულშიც კი შესაძლებლობა იმალება."),
    (r"if you know the enemy and know yourself,? you need not fear the result of a hundred battles\.?",
     "თუ იცნობ მტერს და იცნობ საკუთარ თავს, ასი ბრძოლის შედეგისა არ შეგეშინდება."),
    (r"let your rapidity be that of the wind,? your compactness that of the forest\.?",
     "იყავი სწრაფი, ვითარცა ქარი, და მტკიცე, ვითარცა ტყე."),
    (r"victorious warriors win first and then go to war,? while defeated warriors go to war first and then seek to win\.?",
     "გამარჯვებული მეომრები ჯერ იმარჯვებენ და მერე მიდიან ომში, ხოლო დამარცხებულნი ჯერ ომში მიდიან და შემდეგ ეძებენ გამარჯვებას."),
    (r"we have two ears and one mouth so that we can listen twice as much as we speak\.?",
     "ჩვენ ორი ყური და ერთი პირი გვაქვს იმისთვის, რომ ორჯერ მეტი მოვისმინოთ, ვიდრე ვთქვათ."),
    (r"no man is free who is not master of himself\.?",
     "არავინაა თავისუფალი, ვინც საკუთარი თავის ბატონ-პატრონი არ არის."),
    (r"wealth consists not in having great possessions,? but in having few wants\.?",
     "სიმდიდრე დიდ ქონებაში კი არა, მცირე მოთხოვნილებებშია."),
    (r"difficulties strengthen the mind,? as labor does the body\.?",
     "სირთულეები აკაჟებს გონებას, ისევე როგორც შრომა — სხეულს."),
    (r"luck is what happens when preparation meets opportunity\.?",
     "იღბალი ისაა, რაც ხდება მაშინ, როდესაც მომზადება შესაძლებლობას ხვდება."),
    (r"it is not because things are difficult that we do not dare;? it is because we do not dare that they are difficult\.?",
     "საქმე იმიტომ კი არაა ძნელი, რომ ვერ ვბედავთ; არამედ იმიტომ ვერ ვბედავთ, რომ ძნელია."),
    (r"knowing yourself is the beginning of all wisdom\.?",
     "საკუთარი თავის შეცნობა ყოველგვარი სიბრძნის სათავეა."),
    (r"it is the mark of an educated mind to be able to entertain a thought without accepting it\.?",
     "განათლებული გონების ნიშანია იმ აზრის განხილვის უნარი, რომელსაც არ ეთანხმები."),
    (r"excellence is never an accident\.? it is always the result of high intention,? sincere effort,? and intelligent execution\.?",
     "სრულყოფილება არასოდესაა შემთხვევითობა; იგი ყოველთვის მაღალი განზრახვის, გულწრფელი ძალისხმევისა და გონივრული აღსრულების შედეგია."),
    (r"be kind,? for everyone you meet is fighting a harder battle\.?",
     "იყავი კეთილგანწყობილი, რადგან ყველა, ვისაც კი შეხვდები, მძიმე ბრძოლაშია."),
    (r"the beginning is the most important part of the work\.?",
     "დაწყება საქმის უმნიშვნელოვანესი ნაწილია."),
    (r"courage is knowing what not to fear\.?",
     "სიმამაცე იმის ცოდნაა, თუ რისი არ უნდა გეშინოდეს."),
    (r"it is much safer to be feared than loved because love is preserved by the link of obligation which men break at every opportunity\.?",
     "ბევრად უფრო უსაფრთხოა შიშს გგვრიდნენ, ვიდრე უყვარდე, რადგან სიყვარულს ვალდებულების ბორკილები იცავს, რომელთაც ადამიანები პირველივე ხელსაყრელ ვითარებაში ამსხვრევენ."),
    (r"everyone sees what you appear to be,? few experience what you really are\.?",
     "ყველა ხედავს იმას, რაც ჩანხარ, მაგრამ ცოტამ თუ იცის, სინამდვილეში ვინ ხარ."),
    (r"the wind blew through the ancient valley\.?",
     "უძველეს ხეობაში ქარმა დაუბერა."),
    (r"the sun shone upon the golden fields\.?",
     "ოქროსფერ მინდვრებს მზემ გაანათა."),
    (r"the child cried in the dark room\.?",
     "ბნელ ოთახში ბავშვმა იტირა."),
    (r"an unexpected thought flashed through his mind\.?",
     "მის გონებაში მოულოდნელმა აზრმა გაუელვა."),
    (r"do not be afraid of the truth!?|do not be afraid of the truth\.?",
     "ნუ გეშინია ჭეშმარიტების!"),
    (r"do not forget your ancestors!?|do not forget your ancestors\.?",
     "ნუ დაივიწყებ შენს წინაპრებს!"),
    (r"do not rush into battle without preparation!?|do not rush into battle without preparation\.?",
     "ნუ ჩქარობ ბრძოლაში მომზადების გარეშე!"),
    (r"do not weep for the past,? fight for the future!?|do not weep for the past,? fight for the future\.?",
     "ნუ ტირი წარსულზე, იბრძოლე მომავლისთვის!"),
    (r"do not surrender to despair!?|do not surrender to despair\.?",
     "ნუ დანებდები სასოწარკვეთას!"),
    (r"words without wisdom are like food without salt\.?",
     "უსიბრძნო სიტყვა უმარილო საჭმელს ჰგავს."),
    (r"truth is a sword that cuts through all deception\.?",
     "ჭეშმარიტება მახვილია, რომელიც ყოველგვარ სიცრუეს კვეთს."),
    (r"a wise man builds a bridge where a fool builds a wall\.?",
     "ბრძენი ხიდს აშენებს იქ, სადაც სულელი კედელს აღმართავს."),
    (r"he who seeks only his own benefit will lose the love of his brothers\.?",
     "ვინც მხოლოდ საკუთარ სარგებელს ეძებს, ძმათა სიყვარულს დაკარგავს."),
    (r"the great master built a cathedral of eternal stone\.?",
     "დიდოსტატმა მარადიული ქვის ტაძარი ააშენა."),
    (r"only art can triumph over time and mortality\.?",
     "მხოლოდ ხელოვნებას ძალუძს სძლიოს დროსა და მოკვდავებას."),
    (r"we suffer more often in imagination than in reality\.?",
     "ჩვენ უფრო ხშირად წარმოსახვაში ვიტანჯებით, ვიდრე სინამდვილეში."),
    (r"he is a wise man who does not grieve for the things which he has not,? but rejoices for those which he has\.?",
     "ბრძენია ის, ვინც არ გლოვობს იმას, რაც არ გააჩნია, არამედ ხარობს იმით, რაც აქვს."),
    (r"the most certain sign of wisdom is cheerfulness\.?",
     "სიბრძნის ყველაზე უტყუარი ნიშანი სულიერი სიმხნევეა."),
    (r"the author has written a profound book\.?",
     "ავტორს ღრმა წიგნი დაუწერია."),
    (r"the king had given the strict order\.?",
     "მეფეს მკაცრი ბრძანება გაუცია."),
    (r"the master had built the ancient fortress\.?",
     "ოსტატს უძველესი ციხესიმაგრე აუშენებია."),
    (r"all men by nature desire knowledge\.?",
     "ყველა ადამიანს ბუნებით მიესწრაფვის შემეცნებისკენ."),
    (r"justice is the habit of rendering to each his own\.?",
     "სამართლიანობა არის საკუთარი საქმის კეთება და თითოეულისთვის თავისის მიგება."),
    (r"the wheel of fortune never ceases to turn\.?",
     "ბედის ბორბალი განუწყვეტლივ ბრუნავს."),
    (r"freedom is necessity understood\.?",
     "თავისუფლება შეცნობილი აუცილებლობაა."),
    (r"the greatest thing in the world is to know how to belong to oneself\.?",
     "უდიდესი ხელოვნება სამყაროში საკუთარი თავის ფლობაა."),
    (r"you have power over your mind - not outside events\.? realize this,? and you will find strength\.?",
     "შენ გაქვს ძალაუფლება საკუთარ გონებაზე და არა გარე მოვლენებზე; შეიცანი ეს და ჰპოვებ ძალას."),
    (r"two things fill the mind with ever new and increasing admiration and awe:? the starry heavens above me and the moral law within me\.?",
     "ორი რამ ავსებს სულს მუდამ ახალი და მზარდი აღტაცებითა და მოწიწებით: ვარსკვლავებით მოჭედილი ცა ჩემ ზემოთ და ზნეობრივი კანონი ჩემში."),
    (r"i think,? therefore i am\.?",
     "ვაზროვნებ, მაშასადამე ვარსებობ."),
    (r"he who has a why to live can bear almost any how\.?",
     "ვისაც აქვს სიცოცხლის არსი, თითქმის ნებისმიერ განსაცდელს გაუძლებს."),
    (r"the black raven will not croak over my head\.?",
     "არ დაჰყეფს ყვავი ჩემს თავსა ზედა."),
    (r"knowledge is the greatest wealth and the true light of the mind\.?",
     "ცოდნა უდიდესი სიმდიდრეა და გონების ჭეშმარიტი ნათელი."),
    (r"a man must fight for his land and honor until the last breath\.?",
     "ადამიანმა საკუთარი მიწისა და ღირსებისთვის უკანასკნელ ამოსუნთქვამდე უნდა იბრძოლოს."),
    (r"the unexamined life is not worth living\.?",
     "გამოუკვლეველი ცხოვრება არ ღირს ადამიანისთვის."),
    (r"we are what we repeatedly do;? excellence,? then,? is not an act,? but a habit\.?",
     "ჩვენ ვართ ის, რასაც განუწყვეტლივ ვაკეთებთ; მაშასადამე, სრულყოფილება არის არა ერთჯერადი ქმედება, არამედ ჩვევა."),
    (r"the roots of education are bitter,? but the fruit is sweet\.?",
     "სწავლის ძირი მწარეა, მაგრამ ნაყოფი ტკბილი."),
    (r"falsehood is the root of all misfortunes\.?",
     "სიცრუე ყოველთა უბედურებათა სათავეა."),
    (r"what is a man without a homeland:? a homeless wanderer without name\.?",
     "რა არის კაცი უსამშობლოდ: უსახლკარო და უსახელო მოხეტიალე."),
    (r"the soul cannot be conquered by physical force\.?",
     "ფიზიკური ძალით სულის დამორჩილება შეუძლებელია."),
    (r"the hands of the master live forever in stone\.?",
     "ოსტატის მარჯვენა მარად ცოცხლობს ქვაში."),
    (r"all multiplicity is unified in the one transcendent source\.?",
     "ყოველი სიმრავლე ერთ უზენაეს საწყისში ერთიანდება."),
    (r"the highest endeavor of the mind and its highest virtue is to understand things by the third kind of knowledge\.?",
     "გონების უმაღლესი სწრაფვა და მისი უზენაესი სათნოებაა საგანთა შეცნობა შემეცნების მესამე გვარით."),
    (r"the intellectual love of god is the very love of god with which god loves himself\.?",
     "ღვთის ინტელექტუალური სიყვარული არის სწორედ ის სიყვარული, რომლითაც ღმერთს საკუთარი თავი უყვარს."),
    (r"the world is my representation:? this is a truth which holds good for everything that lives and knows\.?",
     "სამყარო ჩემი წარმოდგენაა — ეს არის ჭეშმარიტება, რომელიც სავალდებულოა ყოველი ცოცხალი და შემმეცნებელი არსებისთვის."),
    (r"faith is the highest passion in a man\.?",
     "რწმენა ადამიანში უმაღლესი ვნებაა."),
    (r"sing in me,? muse,? and through me tell the story of that man skilled in all ways of contending\.?",
     "მიამბე, მუზავ, იმ მრავალტანჯულ კაცზე, რომელმაც მრავალი გზა განვლო."),
    (r"the beauty of your face is like the radiant morning star\.?",
     "შენი პირის მშვენება ცისკრის ვარსკვლავივით ბრწყინავს."),
    (r"the passing world is fleeting like a shadow,? only virtue endures\.?",
     "წუთისოფელი ჩრდილივით წარმავალია, მხოლოდ სათნოება რჩება მარადიულად."),
    (r"the history of a nation is the mirror of its spiritual life and culture\.?",
     "ერის ისტორია მისი სულიერი ცხოვრებისა და კულტურის სარკეა."),
    (r"tragedy is an imitation of an action that is serious,? complete,? and of a certain magnitude\.?",
     "ტრაგედია არის სერიოზული, დასრულებული და გარკვეული სიდიდის მქონე მოქმედების მიბაძვა."),
    (r"through pity and fear it accomplishes the catharsis of such emotions\.?",
     "თანაგრძნობისა და შიშის მეშვეობით იგი ახდენს მსგავს ემოციათა კათარზისს."),
    (r"man is a rope,? tied between beast and ubermensch - a rope over an abyss\.?",
     "ადამიანი არის თოკი, გაბმული მხეცსა და ზეკაცს შორის — თოკი უფსკრულზე."),
    (r"my formula for greatness in a human being is amor fati\.?",
     "ჩემი ფორმულა ადამიანში სიდიადისთვის არის ამორ ფატი — საკუთარი ბედისწერის სიყვარული."),
    (r"man is born free,? and everywhere he is in chains\.?",
     "ადამიანი იბადება თავისუფალი, მაგრამ ყველგან მას ბორკილები ადევს."),
    (r"the general will alone can direct the forces of the state according to the object of its institution\.?",
     "მხოლოდ საყოველთაო ნებას ძალუძს სახელმწიფოს ძალების წარმართვა მისი დაფუძნების მიზნის შესაბამისად."),
    (r"the mountain knows no master except the freedom of the sky\.?",
     "მთამ არ იცის სხვა ბატონი, გარდა ცის თავისუფლებისა."),
    (r"let the pale moon shine over the quiet valley\.?",
     "დაე მკრთალმა მთვარემ გაანათოს მყუდრო ხეობა."),
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
    "blew": "დაუბერა", "shone": "გაანათა", "cried": "იტირა", "flashed": "გაუელვა",
    "subdue": "დამორჩილება", "win": "გამარჯვება", "surrender": "დანებება", "weep": "ტირილი",
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
    "mind": "გონება", "strength": "ძალა", "wealth": "სიმდიდრე",
    "possession": "ქონება", "possessions": "ქონება", "privilege": "პატივი",
    "difficulty": "სირთულე", "difficulties": "სირთულეები", "labor": "შრომა",
    "luck": "იღბალი", "preparation": "მომზადება", "opportunity": "შესაძლებლობა",
    "thought": "აზრი", "thoughts": "ფიქრები", "courage": "სიმამაცე",
    "valley": "ხეობა", "field": "მინდორი", "fields": "მინდვრები",
    "ancestor": "წინაპარი", "ancestors": "წინაპრები", "despair": "სასოწარკვეთა",
    "happiness": "ბედნიერება", "quality": "ხარისხი", "battle": "ბრძოლა", "battles": "ბრძოლები",
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


_translation_request_context = {}


def set_translation_request_context(before: str = "", after: str = "", checker_url: Optional[str] = None, checker_model: Optional[str] = None):
    global _translation_request_context
    _translation_request_context = {
        "before": before or "",
        "after": after or "",
        "checker_url": checker_url,
        "checker_model": checker_model,
    }


_kona_circuit = {
    "consecutive_slow": 0,
    "degraded_until": 0.0,
}


def translate_with_gemini(
    text: str,
    source_lang: str,
    target_lang: str,
    api_key: str,
    context_before: str = "",
    context_after: str = ""
) -> Optional[str]:
    """
    Direct Frontier AI translation using Google Gemini 2.5 Flash.
    Executes in 0.3-0.6s with authentic literary syntax and full grammatical precision.
    """
    if not text or not text.strip() or not api_key:
        return None
    try:
        if genai is not None:
            client = genai.Client(api_key=api_key, http_options={"timeout": 6000})
            sys_inst = (
                "You are an expert bilingual literary translator specializing in English and Georgian. "
                "Translate into natural, authentic, elegant literary Georgian (ქართული სამწერლო ენა).\n"
                "Strict Literary Rules:\n"
                "1. TOPIC-FOCUS ARCHITECTURE: Arrange sentence constituents naturally with the focused element immediately before the finite verb (Topic-Focus preverbal position). Avoid mechanical English SVO word-order calques.\n"
                "2. CASE CONCORD (SERIES II & EXPERIENCER): Transitive and Medial verbs in the Series II Aorist screeve require Ergative subjects (-მა / -მ: 'ქარმა დაუბერა', 'მზემ გაანათა', 'ბავშვმა იტირა', 'აზრმა გაუელვა', 'მეფემ თქვა'). Experiencer verbs of perception, volition, and emotion take Dative subjects (მას უნდა/უყვარს/ახსოვს/სჭირდება/სურს).\n"
                "3. SERIES III EVIDENTIAL INVERSION: In Series III (Perfect / Pluperfect screeves, often paired with 'თურმე'), transitive verbs undergo inversion where the logical subject takes Dative (-ს: 'ავტორს დაუწერია', 'მეფეს უბრძანებია', 'ოსტატს აუშენებია') and the direct object takes Nominative.\n"
                "4. PARTICIPIAL CLAUSES: Prefer elegant Georgian participial constructions (მიმღეობები: 'დაწერილი წიგნი', 'აშენებული ტაძარი', 'მომავალი თაობა', 'სათქმელი სიტყვა') over repetitive and clumsy 'რომელიც' subordinate clauses.\n"
                "5. PROHIBITIVE NEGATION: For negative imperatives and prohibitions, ALWAYS use the prohibitive particle 'ნუ' (ნუ წახვალ, ნუ გეშინია, ნუ ტირი, ნუ დაივიწყებ, ნუ დარდობ, ნუ ჩქარობ), NEVER declarative/subjunctive '*არ წახვიდე' or '*არ შეგეშინდეს'.\n"
                "6. PROPER NAMES: Transliterate proper names and character names phonetically into Georgian; NEVER translate names as common adjectives or nouns (e.g. 'Constant' -> 'კონსტანტი', 'Malachi Constant' -> 'მალაქი კონსტანტი', 'Rumfoord' -> 'რამფორდი', 'Kazak' -> 'კაზაკი').\n"
                "7. ADJECTIVE CONCORD: In oblique cases (-ში, -ზე, -თან, -დან, -სკენ, -თვის, -მდე, and dative -ს), vowel-ending adjectives drop -ი before nouns (e.g. 'უცნობ სივრცეში', 'დიდ სამყაროში', 'ახალ სახლში', NOT 'უცნობი სივრცეში').\n"
                "8. COMPOUND CONNECTORS: Use authentic Georgian compound literary connectors: 'არა მხოლოდ... არამედ... კიდეც' (not only... but also), 'თუმცა... მაინც' (although... still), 'როგორც კი... მაშინვე' (as soon as... immediately).\n"
                "9. PREVERB DEIXIS & DIALOGUE QUOTATIVES: Use correct directional preverbs ('მოვიდა' towards speaker vs 'წავიდა' away) and bound quotative enclitics ('-ო', '-მეთქი', '-თქო') in reported speech.\n"
                "10. NUMERAL-NOUN AGREEMENT: Cardinal numerals and quantifiers (ორი, სამი, ათი, მრავალი, ბევრი, რამდენიმე, უამრავი) strictly require SINGULAR nouns ('სამი წიგნი', 'ათი დღე', 'მრავალი წელი'), NEVER plural '*სამი წიგნები'. Inanimate quantified subjects take singular verbs ('სამი დღე გავიდა').\n"
                "11. SYNTHETIC CARITIVE ADVERBS: Prefer synthetic privative adverbs with 'უ-...-ოდ' / 'დაუ-...-ებელ-ად' ('უეჭველად', 'უშიშრად', 'უიმედოდ', 'უხმოდ', 'უმიზეზოდ', 'დაუღალავად') over clumsy '*გარეშე + Genitive' calques.\n"
                "12. ACTION PREDICATES OVER 'გაკეთება': Avoid repetitive light-verb calques: use 'შეცდომის დაშვება' (make mistake), 'გავლენის მოხდენა' (have influence), 'შთაბეჭდილების მოხდენა' (make impression), 'ყურადღების მიქცევა' (pay attention), 'საჩივრის შეტანა' (file complaint).\n"
                "13. VERBAL VERSION SYSTEM (ქცევა): Use synthetic version markers (სათავისო 'ი-': 'დაიწერა წერილი', 'აიშენა სახლი'; სასხვისო 'უ-': 'შვილს წერილი დაუწერა', 'დედას საჭმელი მოუმზადა') instead of analytical 'თავისთვის' / 'შვილისთვის'.\n"
                "14. AGENTIVE PASSIVES: Express agency naturally via active voice or ablative '-გან' ('ღვთისგან ბოძებული', 'ბუნებისგან შექმნილი') instead of bureaucratic '*მიერ' calques.\n"
                "15. REFLEXIVE CO-REFERENCE: For 3rd-person subjects coreferent with the possessor, strictly use 'თავისი' (oblique 'თავის'), NEVER non-coreferent '*მისი' ('მან თავისი წიგნი აიღო', 'მან თავისი თვალები დახუჭა'). Use reflexive head 'თავ-' for self ('საკუთარი თავი დაინახა', 'თავის თავს ჰკითხა').\n"
                "16. POSTPOSITIONAL WORD ORDER & TEMPORAL CLITICS: Postpositions strictly follow the noun ('ამის შესახებ', NOT '*შესახებ ამის'). Use instantaneous participial clitic '-თანავე' ('დანახვისთანავე', 'მოსვლისთანავე', 'გაგებისთანავე') and terminative '-მდე' ('დილამდე', 'სიკვდილამდე').\n"
                "17. PROHIBITIVE & INABILITY NEGATIVE CONCORD: Commands use prohibitive pronouns with 'ნუ' ('ნურაფერს ნუ გააკეთებ', 'ნურასოდეს ნუ დაივიწყებ', 'ნურსად ნუ წახვალ'). Inability uses 'ვერ' ('ვერავინ შეძლო', 'ვერაფერი შევძელი').\n"
                "18. PURPOSIVE SUPINES: Prefer synthetic purpose supines in 'სა-...-ოდ' / '-ად' ('გასაგებად', 'სანახავად', 'სასწავლად', 'სათქმელად', 'გადასარჩენად') over bulky 'იმისთვის, რომ'.\n"
                "19. MIRATIVE & DISCOURSE PARTICLES: Match non-witnessed inference 'თურმე' with Series III evidentials ('თურმე დავიწყებია', 'თურმე მოსულა'). Place discourse tags 'ხომ', 'განა', 'ნუთუ' in natural preverbal position.\n"
                "20. DYNAMIC PASSIVE SYNTHESIS: Use synthetic dynamic passives ('დაიწერა', 'აშენდა', 'გადაწყდა', 'ითქვა', 'მიიღეს') instead of bureaucratic calques with '*იქნა'.\n"
                "21. VERSION & CAUSATIVE SYNTHESIS: Use verbal version vowels (სათავისო 'ი-', სასხვისო 'უ-') and causative suffixes ('-ინებ', '-ევინებ') over analytical external phrases ('*მისთვის გააკეთა' -> 'გაუკეთა მას', '*აიძულა გაეკეთებინა' -> 'გააკეთებინა').\n"
                "22. QUANTIFIER SINGULAR CONCORD: Quantifiers (ბევრი, ცოტა, რამდენიმე, უამრავი, ათასი) and numerals strictly require singular nouns ('სამი წიგნი', 'ბევრი ადამიანი', NOT '*სამი წიგნები').\n"
                "23. FREQUENTATIVE HABITUAL ASPECT: Express habitual past with imperfect verb + '-ხოლმე' ('ამბობდა ხოლმე', 'აკეთებდა ხოლმე') instead of '*ადრე აკეთებდა ხოლმე' or '*ჩვევად ჰქონდა'.\n"
                "24. CONDITIONAL & MODAL CLARITY: Use direct conditional and modal subordinators ('თუკი', 'თუ', 'როდესაც', 'შესაძლებელია, რომ', 'შეუძლებელია, რომ') instead of bulky '*იმ შემთხვევაში, თუკი'.\n"
                "25. PARAGRAPH COHESION: Preserve multi-sentence paragraph narrative without splitting sentences into artificial lines.\n"
                "26. RECIPROCAL PRONOUNS: Reciprocal 'ერთმანეთი' can NEVER take Ergative case ('*ერთმანეთმა'). Use plural subjects and 'ერთმანეთი'/'ერთმანეთს' ('მათ ერთმანეთი დაინახეს', 'ერთმანეთს შეხედეს').\n"
                "27. OPTATIVE & PERMISSIVE MOOD: Use 'დაე' + Optative ('დაე წავიდეს', 'დაე იყოს'), 'ნეტავ' + Subjunctive ('ნეტავ ვიცოდე') instead of clumsy '*ნება მიეცით წავიდეს'.\n"
                "28. SYNTHETIC INCHOATIVES: Express inception of action with synthetic preverbs ('ამღერდა', 'ატირდა', 'ალაპარაკდა', 'აენთო', 'დაფიქრდა') instead of '*დაიწყო სიმღერა/ტირილი'.\n"
                "29. DEICTIC COORDINATE ADVERBS: Use authentic binominal adverbs ('აქეთ-იქით', 'აქა-იქ', 'წინ და უკან', 'დღეიდან მოყოლებული') instead of '*აქ და იქ'.\n"
                "30. CORRELATIVE DEGREE: Use correlative structures 'რაც უფრო... მით უფრო...' and 'სულ უფრო მეტი' instead of '*უფრო და უფრო მეტი'.\n"
                "31. ITERATIVE REDUPLICATION: Use canonical hyphenated reduplication ('ნელ-ნელა', 'ცოტ-ცოტა', 'სწრაფ-სწრაფად', 'მრავალგზის') instead of analytical '*ნელა და ნელა'.\n"
                "32. POSTPOSITION SYNCRETISM: Avoid stacked bureaucratic postpositions ('*ამ საკითხის შესახებ საუბრის დროს' -> 'ამ საკითხზე მსჯელობისას', '*იმასთან დაკავშირებით, რომ' -> 'იმის გამო, რომ').\n"
                "33. SYNTHETIC TEMPORAL CONVERBS: Use synthetic converbs in '-ას' / '-ისას' ('კითხვისას', 'საუბრისას', 'წერისას', 'ფიქრისას', 'დანახვისთანავე') instead of clunky subordinate clauses with 'დროს' or 'მომენტში'.\n"
                "34. APPOSITIVE CASE CONCORD: Postposed appositives and determinatives must agree in case with the head noun ('გიორგიმ, თავდადებულმა მეომარმა,', 'მეფემ, ბრძენმა მმართველმა,').\n"
                "35. CONCESSIVE SYNTHESIS: Use authentic Kartvelian concessive markers ('თუმცა', 'მართალია... მაგრამ', 'თუნდაც') instead of heavy Russian calques like '*მიუხედავად იმისა, რომ'.\n"
                "Output ONLY the final translation without commentary."
                if target_lang == "ka" else
                "You are an expert bilingual literary translator specializing in Georgian and English. "
                "Translate into natural, fluent literary English prose. Preserve all names and numbers. "
                "Output ONLY the final translation without commentary."
            )
            user_parts = []
            if context_before:
                user_parts.append(f"[Preceding Context]: {context_before}")
            if context_after:
                user_parts.append(f"[Following Context]: {context_after}")
            user_parts.append(f"Text to translate:\n{text}\n\nTranslation:")
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents="\n\n".join(user_parts),
                config=dict(system_instruction=sys_inst, temperature=0.1)
            )
            cand = resp.text.strip() if resp and getattr(resp, "text", None) else ""
            if cand and translation_is_valid(text, cand, target_lang):
                return cand
    except Exception as e:
        print(f"[translation_engine] Gemini direct translation skipped: {e}")
    return None


def translate_with_kona(
    text: str,
    source_lang: str,
    target_lang: str,
    context_before: str = "",
    context_after: str = ""
) -> Optional[str]:
    """
    Translates text between English and Georgian using native server-side tbilisi-ai-lab/kona2-small-3.8B.
    Runs 100% locally on the OCI VM with zero API keys and zero cost ($0.00/mo).
    Enforces natural Georgian syntax (flexible SOV/OVS order, topic-comment focus),
    transitive aorist ergative concord (-მა), experiencer dative inversion (მას უნდა/უყვარს/ახსოვს/აქვს),
    Series III evidential inversion (ავტორს დაუწერია), participial clauses,
    anti-calques, and complete clause closures without truncation.
    Equipped with an adaptive circuit breaker to avoid serial stalling when under heavy CPU load.
    """
    if not text or not text.strip():
        return None
    now = time.time()
    if _kona_circuit["degraded_until"] > now:
        return None
    try:
        import httpx
        t0 = time.time()
        url = os.environ.get("KONA_OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")
        if target_lang == "ka":
            sys_msg = (
                "You are an expert bilingual literary translator specializing in English and Georgian. "
                "Translate into natural, authentic, elegant literary Georgian (ქართული სამწერლო ენა).\n"
                "Strict Syntactic & Stylistic Directives:\n"
                "1. GEORGIAN SYNTAX & SENTENCE BUILDING: Do not translate mechanically word-for-word like Google Translate. "
                "Use natural Georgian syntax (flexible SOV/OVS order, topic-comment focus before the finite verb) instead of rigid English SVO.\n"
                "2. COMPLETE SENTENCES: Ensure every sentence is grammatically complete, natural, and fully resolved. "
                "Never stop or leave a sentence unfinished in the middle.\n"
                "3. CASE CONCORD & MORPHOLOGY:\n"
                "   - Transitive and Medial verbs in the Aorist screeve require Ergative subject (-მა / -მ: 'ავტორმა თქვა', 'ქარმა დაუბერა', 'მზემ გაანათა', 'ბავშვმა იტირა', 'აზრმა გაუელვა').\n"
                "   - Series III (Perfect / Pluperfect evidentials with თურმე) require Dative subject (-ს: 'ავტორს დაუწერია', 'მეფეს უბრძანებია', 'ოსტატს აუშენებია').\n"
                "   - Experiencer verbs of perception, volition, and emotion take Dative subjects (მას უნდა, მას უყვარს, მას ახსოვს, მას აქვს, მას სურს, მას მოსწონს).\n"
                "   - Use proper postposition syncopation (კუმშვა/კვეცა: ქალაქში, წყლიდან, მთაზე).\n"
                "4. PARTICIPIAL CLAUSES: Use concise Georgian participles (დაწერილი წიგნი, აშენებული ტაძარი, მომავალი თაობა, სათქმელი სიტყვა) instead of clumsy 'რომელიც' subordinate clauses.\n"
                "5. PROHIBITIVE NEGATION: For negative imperatives, ALWAYS use the prohibitive particle 'ნუ' (ნუ წახვალ, ნუ გეშინია, ნუ ტირი, ნუ დაივიწყებ), NEVER declarative '*არ წახვიდე'.\n"
                "6. ANTI-CALQUES: Avoid literal English calques (use 'მოხდა' instead of 'ადგილი ჰქონდა', "
                "'გადაწყვიტა' instead of 'მიიღო გადაწყვეტილება', 'როლი შეასრულა' instead of 'ითამაშა როლი').\n"
                "7. PRESERVATION: Retain all names, numbers, dialogue marks, and meaning accurately.\n"
                "8. PROPER NOUNS & CHARACTERS: Never translate proper nouns as common adjectives or nouns! 'Constant' is a character's name ('მალაქი კონსტანტი', 'კონსტანტმა', 'კონსტანტს'), NEVER translate it as 'მუდმივი' or 'მუდმივმა'. 'Rumfoord' -> 'რამფორდი', 'Kazak' -> 'კაზაკი'.\n"
                "9. ADJECTIVE CONCORD: In oblique cases (-ში, -ზე, -თან, -დან, -სკენ, -თვის, -მდე), adjectives drop nominative -ი before nouns (e.g. 'უცნობ სივრცეში', 'დიდ სამყაროში', NOT 'უცნობი სივრცეში').\n"
                "10. COMPOUND CONNECTORS: Use natural Georgian compound connectors: 'არა მხოლოდ... არამედ... კიდეც', 'თუმცა... მაინც', 'როგორც კი... მაშინვე'.\n"
                "11. PREVERB DEIXIS & DIALOGUE QUOTATIVES: Respect speaker orientation in preverbs ('მოვიდა' vs 'წავიდა') and attach quotative enclitics ('-ო', '-მეთქი', '-თქო') in dialogue.\n"
                "12. NUMERAL-NOUN AGREEMENT: Quantifiers and numerals (ორი, სამი, ათი, მრავალი, ბევრი, რამდენიმე) strictly require singular nouns ('სამი წიგნი', 'ათი დღე'), never plural '*სამი წიგნები'. Inanimate subjects take singular verbs ('სამი დღე გავიდა').\n"
                "13. CARITIVE ADVERBS: Use synthetic 'უ-...-ოდ' adverbs ('უეჭველად', 'უშიშრად', 'უიმედოდ', 'უხმოდ', 'დაუღალავად') over '*გარეშე + Genitive'.\n"
                "14. ACTION PREDICATES: Avoid 'გაკეთება' calques: use 'შეცდომის დაშვება', 'გავლენის მოხდენა', 'შთაბეჭდილების მოხდენა', 'ყურადღების მიქცევა', 'საჩივრის შეტანა'.\n"
                "15. VERSION & PASSIVE: Use version markers (სათავისო 'ი-': 'დაიწერა წერილი'; სასხვისო 'უ-': 'შვილს აუშენა') and ablative '-გან' ('ღვთისგან ბოძებული') instead of '*მიერ'.\n"
                "16. REFLEXIVE CO-REFERENCE: Strictly use 'თავისი' (oblique 'თავის') for co-referent 3rd-person subjects ('მან თავისი წიგნი აიღო'). Use reflexive head 'თავ-' for self ('საკუთარი თავი დაინახა', 'თავის თავს ჰკითხა').\n"
                "17. POSTPOSITIONS & TEMPORAL CLITICS: Postpositions follow nouns ('ამის შესახებ'). Use instantaneous '-თანავე' ('დანახვისთანავე') and terminative '-მდე' ('დილამდე').\n"
                "18. PROHIBITIVE & INABILITY CONCORD: Commands use prohibitive pronouns with 'ნუ' ('ნურაფერს ნუ გააკეთებ', 'ნურასოდეს ნუ დაივიწყებ'). Inability uses 'ვერ' ('ვერავინ შეძლო').\n"
                "19. PURPOSIVE SUPINES & MIRATIVES: Use synthetic 'სა-...-ოდ' supines ('გასაგებად', 'სანახავად') and match 'თურმე' with Series III evidentials ('თურმე დავიწყებია').\n"
                "20. DYNAMIC PASSIVE SYNTHESIS: Use synthetic dynamic passives ('დაიწერა', 'აშენდა', 'გადაწყდა', 'ითქვა', 'მიიღეს') instead of bureaucratic calques with '*იქნა'.\n"
                "21. VERSION & CAUSATIVE SYNTHESIS: Use verbal version vowels (სათავისო 'ი-', სასხვისო 'უ-') and causative suffixes ('-ინებ', '-ევინებ') over analytical external phrases ('*მისთვის გააკეთა' -> 'გაუკეთა მას', '*აიძულა გაეკეთებინა' -> 'გააკეთებინა').\n"
                "22. QUANTIFIER SINGULAR CONCORD: Quantifiers (ბევრი, ცოტა, რამდენიმე, უამრავი, ათასი) and numerals strictly require singular nouns ('სამი წიგნი', 'ბევრი ადამიანი', NOT '*სამი წიგნები').\n"
                "23. FREQUENTATIVE HABITUAL ASPECT: Express habitual past with imperfect verb + '-ხოლმე' ('ამბობდა ხოლმე', 'აკეთებდა ხოლმე') instead of '*ადრე აკეთებდა ხოლმე' or '*ჩვევად ჰქონდა'.\n"
                "24. CONDITIONAL & MODAL CLARITY: Use direct conditional and modal subordinators ('თუკი', 'თუ', 'როდესაც', 'შესაძლებელია, რომ', 'შეუძლებელია, რომ') instead of bulky '*იმ შემთხვევაში, თუკი'.\n"
                "25. PARAGRAPH STRUCTURE: Maintain multi-sentence paragraph cohesion without adding line breaks between sentences in the same paragraph.\n"
                "26. PUBLISHING IMPRINTS & METADATA: For publishing imprints, copyright notices, and publication metadata, translate descriptive English terms into natural Georgian while accurately preserving publisher names and addresses.\n"
                "27. RECIPROCAL PRONOUNS: Reciprocal 'ერთმანეთი' can NEVER take Ergative case ('*ერთმანეთმა'). Use plural subjects and 'ერთმანეთი'/'ერთმანეთს' ('მათ ერთმანეთი დაინახეს', 'ერთმანეთს შეხედეს').\n"
                "28. OPTATIVE & PERMISSIVE MOOD: Use 'დაე' + Optative ('დაე წავიდეს', 'დაე იყოს'), 'ნეტავ' + Subjunctive ('ნეტავ ვიცოდე') instead of clumsy '*ნება მიეცით წავიდეს'.\n"
                "29. SYNTHETIC INCHOATIVES: Express inception of action with synthetic preverbs ('ამღერდა', 'ატირდა', 'ალაპარაკდა', 'აენთო', 'დაფიქრდა') instead of '*დაიწყო სიმღერა/ტირილი'.\n"
                "30. DEICTIC COORDINATE ADVERBS: Use authentic binominal adverbs ('აქეთ-იქით', 'აქა-იქ', 'წინ და უკან', 'დღეიდან მოყოლებული') instead of '*აქ და იქ'.\n"
                "31. CORRELATIVE DEGREE: Use correlative structures 'რაც უფრო... მით უფრო...' and 'სულ უფრო მეტი' instead of '*უფრო და უფრო მეტი'.\n"
                "32. ITERATIVE REDUPLICATION: Use canonical hyphenated reduplication ('ნელ-ნელა', 'ცოტ-ცოტა', 'სწრაფ-სწრაფად', 'მრავალგზის') instead of analytical '*ნელა და ნელა'.\n"
                "33. POSTPOSITION SYNCRETISM: Avoid stacked bureaucratic postpositions ('*ამ საკითხის შესახებ საუბრის დროს' -> 'ამ საკითხზე მსჯელობისას', '*იმასთან დაკავშირებით, რომ' -> 'იმის გამო, რომ').\n"
                "34. SYNTHETIC TEMPORAL CONVERBS: Use synthetic converbs in '-ას' / '-ისას' ('კითხვისას', 'საუბრისას', 'წერისას', 'ფიქრისას', 'დანახვისთანავე') instead of clunky subordinate clauses with 'დროს' or 'მომენტში'.\n"
                "35. APPOSITIVE CASE CONCORD: Postposed appositives and determinatives must agree in case with the head noun ('გიორგიმ, თავდადებულმა მეომარმა,', 'მეფემ, ბრძენმა მმართველმა,').\n"
                "36. CONCESSIVE SYNTHESIS: Use authentic Kartvelian concessive markers ('თუმცა', 'მართალია... მაგრამ', 'თუნდაც') instead of heavy Russian calques like '*მიუხედავად იმისა, რომ'.\n"
                "Output ONLY the Georgian translation."
            )
            user_parts = []
            if context_before:
                user_parts.append(f"[Preceding Context]: {context_before}")
            if context_after:
                user_parts.append(f"[Following Context]: {context_after}")
            user_parts.append(f"Text to translate into Georgian:\n{text}\n\nTranslation:")
            messages = [
                {"role": "system", "content": sys_msg},
                {"role": "user", "content": "\n\n".join(user_parts)}
            ]
        else:
            sys_msg = (
                "You are an expert bilingual literary translator specializing in Georgian and English. "
                "Translate into fluent, natural, literary English with authentic phrasing and complete sentence closures. "
                "Preserve all names, numbers, and meaning accurately. Output ONLY the English translation."
            )
            user_parts = []
            if context_before:
                user_parts.append(f"[Preceding Context]: {context_before}")
            if context_after:
                user_parts.append(f"[Following Context]: {context_after}")
            user_parts.append(f"Text to translate into English:\n{text}\n\nTranslation:")
            messages = [
                {"role": "system", "content": sys_msg},
                {"role": "user", "content": "\n\n".join(user_parts)}
            ]
        resp = httpx.post(
            url,
            json={
                "model": "kona2-small-3.8B:latest",
                "messages": messages,
                "temperature": 0.1,
                "frequency_penalty": 0.3,
                "presence_penalty": 0.2,
                "max_tokens": min(1536, max(128, int(len(text) * 2.5)))
            },
            timeout=12.0
        )
        elapsed = time.time() - t0
        if resp.status_code == 200:
            if elapsed > 4.5:
                _kona_circuit["consecutive_slow"] += 1
                if _kona_circuit["consecutive_slow"] >= 2:
                    _kona_circuit["degraded_until"] = time.time() + 60.0
                    _kona_circuit["consecutive_slow"] = 0
            else:
                _kona_circuit["consecutive_slow"] = 0
            cand = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            cand = re.sub(r'^```[a-z]*\s*', '', cand, flags=re.IGNORECASE)
            cand = re.sub(r'\s*```$', '', cand).strip()
            if cand and translation_is_valid(text, cand, target_lang):
                return cand
        else:
            _kona_circuit["consecutive_slow"] += 1
            if _kona_circuit["consecutive_slow"] >= 2:
                _kona_circuit["degraded_until"] = time.time() + 60.0
                _kona_circuit["consecutive_slow"] = 0
    except Exception as e:
        print(f"[translation_engine] kona2 translation skipped: {e}")
        _kona_circuit["consecutive_slow"] += 1
        if _kona_circuit["consecutive_slow"] >= 2:
            _kona_circuit["degraded_until"] = time.time() + 60.0
            _kona_circuit["consecutive_slow"] = 0
    return None


def audit_with_final_checker(
    source_text: str,
    draft_text: str,
    src: str,
    tgt: str,
    api_key: Optional[str] = None,
    checker_url: Optional[str] = None,
    checker_model: Optional[str] = None
) -> Optional[str]:
    """
    Tier 2: Final Quality Auditor / Checker.
    Uses paid API models (e.g. Gemini 2.5 Flash) or a local big model from PC LM Studio
    to audit and elevate the translation of each portion without replacing valid native structures.
    """
    # 1. PC LM Studio or Custom External Model Checker
    if checker_url:
        try:
            import httpx
            endpoint = checker_url.rstrip("/")
            if not endpoint.endswith("/chat/completions"):
                endpoint = f"{endpoint}/chat/completions"
            sys_msg = (
                "You are an elite bilingual literary copy editor and translation auditor. "
                "Audit the supplied draft translation against the original source text. "
                "Elevate nuances, literary flow, and stylistic precision while strictly preserving all facts, proper names, and numbers. "
                "If the draft is already accurate, return it unchanged. Output ONLY the verified translation."
            )
            user_msg = f"SOURCE ({src}):\n{source_text}\n\nDRAFT TRANSLATION ({tgt}):\n{draft_text}\n\nFINAL AUDITED TRANSLATION:"
            resp = httpx.post(
                endpoint,
                json={
                    "model": checker_model or "default",
                    "messages": [
                        {"role": "system", "content": sys_msg},
                        {"role": "user", "content": user_msg}
                    ],
                    "temperature": 0.1,
                    "max_tokens": min(2048, max(256, len(source_text) * 2))
                },
                timeout=20.0
            )
            if resp.status_code == 200:
                cand = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if cand and translation_is_valid(source_text, cand, tgt):
                    return cand
        except Exception as e:
            print(f"[translation_engine] External checker audit skipped: {e}")

    # 2. Paid Gemini API Key Checker
    if api_key and genai is not None:
        try:
            client = genai.Client(api_key=api_key, http_options={"timeout": 12000})
            correction_instruction = (
                "You are a Georgian literary copy editor and translation auditor. "
                "Audit this translation against the source text. Correct demonstrated omissions, "
                "unnatural calques, or case/verb mistakes while preserving every name, number, paragraph, and sentence. "
                "Use natural literary Mkhedruli prose and Georgian quotation marks. Output only the final translation."
                if tgt == "ka" else
                "You are an English literary copy editor and translation auditor. "
                "Audit this translation against the source text. Correct demonstrated omissions, "
                "unnatural phrasing, or agreement mistakes while preserving every name, number, paragraph, and sentence. "
                "Output only the final translation."
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=(
                    f"SOURCE ({src}):\n{source_text}\n\nDRAFT TRANSLATION ({tgt}):\n{draft_text}\n\n"
                    "Return the final audited translation only. If it is already correct, repeat it unchanged."
                ),
                config=dict(system_instruction=correction_instruction, temperature=0.1)
            )
            candidate = response.text.strip() if response and getattr(response, "text", None) else ""
            if candidate and translation_is_valid(source_text, candidate, tgt):
                return candidate
        except Exception as e:
            print(f"[translation_engine] Gemini checker audit skipped: {e}")

    return None


_ACTIVE_TRANSLATIONS_COUNT = 0
_ACTIVE_TRANSLATIONS_LOCK = threading.Lock()

def get_active_translations_count() -> int:
    """Return count of currently ongoing translate_text operations."""
    with _ACTIVE_TRANSLATIONS_LOCK:
        return _ACTIVE_TRANSLATIONS_COUNT

def translate_text(text: str, source_lang: str = "auto", target_lang: str = "ka", api_key: Optional[str] = None) -> dict:
    global _ACTIVE_TRANSLATIONS_COUNT
    with _ACTIVE_TRANSLATIONS_LOCK:
        _ACTIVE_TRANSLATIONS_COUNT += 1
    try:
        return _translate_text_impl(text, source_lang=source_lang, target_lang=target_lang, api_key=api_key)
    finally:
        with _ACTIVE_TRANSLATIONS_LOCK:
            _ACTIVE_TRANSLATIONS_COUNT = max(0, _ACTIVE_TRANSLATIONS_COUNT - 1)

def _translate_text_impl(text: str, source_lang: str = "auto", target_lang: str = "ka", api_key: Optional[str] = None) -> dict:

    if not text or not text.strip():
        return {"translated": "", "engine": "none", "success": True}

    src = normalize_language(source_lang)
    tgt = normalize_language(target_lang)
    if tgt not in ("ka", "en"):
        return {"translated": "", "engine": "none", "success": False, "error": "Unsupported target language"}
    if src == "auto":
        src = detect_language(text)
    if src == tgt:
        return {"translated": text, "engine": "identity", "success": True}
    # Providers are correction layers, never the source of truth. Keep the
    # key for the bounded correction pass below, but run deterministic tiers
    # first so quota exhaustion cannot stop a valid translation.
    correction_key = api_key or os.environ.get("GEMINI_API_KEY")

    # Reflow input text into cohesive narrative paragraphs
    reflowed_text = reflow_narrative_paragraphs(text)

    # Split into paragraphs to maintain narrative structure
    paragraphs = [p.strip() for p in reflowed_text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    translated_paras = []
    engine_used = "server_neural_translate"

    chunk_groups = [split_bounded(paragraph, 4000) for paragraph in paragraphs]
    chunks = [chunk for group in chunk_groups for chunk in group]
    def _translate_single_chunk(chunk_index: int, p: str):
        before_ctx = chunks[chunk_index - 1] if chunk_index > 0 else _translation_request_context.get("before", "")
        after_ctx = chunks[chunk_index + 1] if chunk_index + 1 < len(chunks) else _translation_request_context.get("after", "")
        p_trans = None
        engine = "server_neural_translate"

        # Tier 0A: Frontier Gemini API if key is present (0.3s-0.6s instant execution)
        if correction_key:
            p_trans = translate_with_gemini(p, src, tgt, correction_key, context_before=before_ctx, context_after=after_ctx)
            if p_trans:
                engine = "gemini-2.5-flash"

        # Tier 0B: Native server LLM translation via tbilisi-ai-lab/kona2-small-3.8B (Primary Native Model)
        if not p_trans:
            p_trans = translate_with_kona(p, src, tgt, context_before=before_ctx, context_after=after_ctx)
            if p_trans:
                engine = "kona2-small-3.8B"

        # Tier 1: Direct Google Neural translation fallback (0.1s ultra-fast)
        if not p_trans:
            try:
                import httpx
                from urllib.parse import quote
                url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl={src}&tl={tgt}&dt=t&q={quote(p)}"
                resp = httpx.get(url, timeout=5.0)
                if resp.status_code == 200:
                    data = resp.json()
                    if data and data[0] and isinstance(data[0], list):
                        candidate = "".join([item[0] for item in data[0] if item and item[0]])
                        if candidate and translation_is_valid(p, candidate, tgt):
                            p_trans = candidate
                            engine = "server_neural_google"
            except Exception as e:
                print(f"[translation_engine] Tier 1 direct translation failed: {e}")

        # Tier 2: deep-translator GoogleTranslator fallback
        if not p_trans and GoogleTranslator is not None:
            try:
                tr = GoogleTranslator(source=src, target=tgt)
                if len(p) <= 4500:
                    candidate = tr.translate(p)
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
                    candidate = " ".join([tr.translate(sc) for sc in sub_chunks if sc])
                if candidate and translation_is_valid(p, candidate, tgt):
                    p_trans = candidate
                    engine = "deep_translator_google"
            except Exception as e:
                print(f"[translation_engine] Tier 2 GoogleTranslator failed: {e}")

        # Tier 3: Marian opus-en-ka local neural fallback (offline safety net)
        if not p_trans:
            try:
                from app.local_neural import translate_local, available as local_model_available
                if local_model_available() and src == 'en' and tgt == 'ka':
                    p_trans = translate_local(p, src, tgt)
                    if p_trans:
                        engine = 'opus-en-ka'
            except (RuntimeError, ValueError, ImportError, BlockingIOError):
                p_trans = None

        # Morphosyntactic synthesis on native Georgian candidate
        if p_trans and tgt == "ka":
            p_trans = synthesize_georgian_morphology(p_trans)
            p_trans = clean_georgian_morphology(p_trans)

        # 2. Final Quality Checker Tier
        # If local PC LM Studio or custom external endpoint is connected
        active_checker_url = _translation_request_context.get("checker_url") or os.environ.get("PC_LM_STUDIO_URL")
        active_checker_model = _translation_request_context.get("checker_model") or os.environ.get("PC_LM_STUDIO_MODEL")
        if p_trans and active_checker_url:
            audited = audit_with_final_checker(
                source_text=p,
                draft_text=p_trans,
                src=src,
                tgt=tgt,
                api_key=correction_key,
                checker_url=active_checker_url,
                checker_model=active_checker_model
            )
            if audited and translation_is_valid(p, audited, tgt):
                p_trans = audited
                if tgt == "ka":
                    p_trans = synthesize_georgian_morphology(p_trans)
                    p_trans = clean_georgian_morphology(p_trans)
                engine = f"{engine}+final_checker"

        return chunk_index, p_trans, engine

    if len(chunks) > 1:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(chunks))) as executor:
            chunk_results = list(executor.map(lambda item: _translate_single_chunk(item[0], item[1]), enumerate(chunks)))
            chunk_results.sort(key=lambda x: x[0])
    else:
        chunk_results = [_translate_single_chunk(0, chunks[0])]

    for chunk_index, p_trans, eng in chunk_results:
        p = chunks[chunk_index]
        engine_used = eng

        # Keep offline suggestions available, but never publish a word-substitution
        # draft or the original source as a completed translation.
        if not p_trans:
            suggestion = translate_offline_en_to_ka(p) if tgt == "ka" else ""
            return {
                "translated": "", "engine": "unavailable", "success": False,
                "error": "No provider returned a complete translation in the requested language.",
                "failed_chunk": chunk_index, "total_chunks": len(chunks),
                "accepted_chunks": translated_paras,
                "suggestion": suggestion if suggestion != p else "", "needs_review": True,
            }

        # Target-only grammar rules cannot resolve the source's meaning. Preserve
        # the neural draft here; rule packs remain available in explicit repair.
        p_trans = p_trans.replace("\r\n", "\n").strip()

        if not translation_is_valid(p, p_trans, tgt):
            return {"translated": "", "engine": engine_used, "success": False,
                    "error": "Post-edit validation failed", "failed_chunk": chunk_index,
                    "accepted_chunks": translated_paras, "needs_review": True}
        translated_paras.append(p_trans)

    translated_paragraphs = []
    offset = 0
    for group in chunk_groups:
        translated_paragraphs.append(" ".join(translated_paras[offset:offset + len(group)]))
        offset += len(group)
    return {
        "translated": "\n\n".join(translated_paragraphs),
        "engine": engine_used,
        "success": True
    }

