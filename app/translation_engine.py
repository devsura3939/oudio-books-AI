# -*- coding: utf-8 -*-
import os
import re
from typing import Optional
from app.text_integrity import normalize_language, detect_language, split_bounded, translation_is_valid

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
        (r'(?<![\u10A0-\u10FF])დიდი\s+მნიშვნელობა\s+აქვს(?![ა-ჰ])', 'სასიცოცხლო მნიშვნელობისაა'),
        (r'(?<![\u10A0-\u10FF])ნათელი\s+გახდა(?![ა-ჰ])', 'გამოჩნდა'),
        (r'(?<![\u10A0-\u10FF])აზრი\s+გამოთქვა(?![ა-ჰ])', 'თქვა'),
        (r'(?<![\u10A0-\u10FF])ყურადღება\s+გაამახვილა(?![ა-ჰ])', 'ხაზი გაუსვა'),
        (r'(?<![\u10A0-\u10FF])თავის\s+მხრივ(?![ა-ჰ])', 'თავისთავად'),
        (r'(?<![\u10A0-\u10FF])საფუძველი\s+ჩაუყარა(?![ა-ჰ])', 'დააფუძნა'),
        (r'(?<![\u10A0-\u10FF])თვალის\s+დევნება(?![ა-ჰ])', 'ყურება'),
        (r'(?<![\u10A0-\u10FF])სარგებლობა\s+მოაქვს(?![ა-ჰ])', 'სარგებელი აქვს'),
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
    aorist_verbs = r'(?:დაინახა|თქვა|გააკეთა|მოისმინა|დაწერა|გადაწყვიტა|გააღო|შექმნა|იპოვა|მოკლა|წაიკითხა|უპასუხა|გახსნა|ჩაკეტა|მოძებნა|დაკარგა|შეიყვარა|მიატოვა|გაუგზავნა|მოუყვა|გამოაცხადა|დადო|დაასრულა|შეამჩნია|აღმოაჩინა|ააშენებინა|დააწერინა|დაალევინა|გააკეთებინა|აიშენა|აუშენა|შეიკერა|შეუკერა)'
    subjects_i = r'(?:პატარა\s+უფლისწულ|უფლისწულ|მარკუს\s+ავრელიუს|არისტოტელ|პლატონ|ჰომეროს|შექსპირ|ციცერონ|სენეკ|ეპიქტეტ|მაკიაველ|მოგზაურ|მეცნიერ|ფილოსოფოს|კაც|ბავშვ|ბიჭ|ქალ|ავტორ|ვარდ|მგელ|ადამიან|მეგობარ|მწერალ|პოეტ|ექიმ|ოსტატ|მასწავლებელ|შეგირდ|პროფესორ|კონსტანტინე\s+არსაკიძ|არსაკიძ|თეიმურაზ\s+ხევისთავ|ჯაყო|კვაჭი|იაკობ\s+ცურტაველ|იოანე\s+საბანისძ|დავით\s+გურამიშვილ|მკითხველ(?:მა)?\s+მეცნიერ)'
    t = re.sub(r'(?<![\u10A0-\u10FF])(' + subjects_i + r')ი(\s+(?:[ა-ჰ]+\s+)?' + aorist_verbs + r')(?![ა-ჰ])', r'\g<1>მა\g<2>', t)
    t = re.sub(r'(?<![\u10A0-\u10FF])(მეფე|მელა|გოგო|დედა|მამა|ძმა|დეიდა|ბიძა|სახელმწიფო|სოკრატე|სენეკა)(\s+(?:[ა-ჰ]+\s+)?' + aorist_verbs + r')(?![ა-ჰ])', r'\g<1>მ\g<2>', t)

    # 3. Screeve Series III & Experiencer Dative Inversion
    experiencer_verbs = r'(?:უნდა|უნდოდა|სჭირდება|სჭირდებოდა|უყვარს|უყვარდა|ახსოვს|ახსოვდა|ეშინია|ეშინოდა|სტკივა|სტკიოდა|შია|ცივა|უნახავს|გაუგია|დაეკარგა|გაუტყდა|შეეშალა|დაავიწყდა)'
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


def translate_text(text: str, source_lang: str = "auto", target_lang: str = "ka", api_key: Optional[str] = None) -> dict:
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
    effective_key = api_key or os.environ.get("GEMINI_API_KEY")

    # Split into paragraphs to maintain narrative structure
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    translated_paras = []
    engine_used = "server_neural_translate"

    chunk_groups = [split_bounded(paragraph, 4000) for paragraph in paragraphs]
    chunks = [chunk for group in chunk_groups for chunk in group]
    for chunk_index, p in enumerate(chunks):
        p_trans = None

        # Tier 0: Frontier AI Literary Translation (Gemini 2.5 Flash)
        if genai is not None and effective_key:
            try:
                client = genai.Client(api_key=effective_key, http_options={"timeout": 20000})
                if tgt == "ka":
                    sys_instruction = (
                        "You are an acclaimed Georgian literary translator. Translate this text faithfully into authentic, elegant Georgian. "
                        "Rules: "
                        "1. Use authentic Mkhedruli script with proper punctuation and quotation marks („...“). "
                        "2. Observe Georgian morphosyntax: Ergative case (-მა/-მ) for transitive verbs in Series II Aorist; "
                        "Dative case (-ს) for inverted experiencer verbs (მას უნდა, მას უყვარს, მას ახსოვს, მას სჭირდება); "
                        "stem vowel syncopation and truncation (კუმშვა/კვეცა: წყლიდან, მგლის, ქვეყანაში). "
                        "3. Natural pro-drop: do NOT mechanically repeat overt pronouns (მან, ის, მას) in every sentence. "
                        "4. Coreference: use თავისი/თავის for reflexive subject reference, and მისი/მის only for external referents. "
                        "5. Anti-calque: replace bureaucratic passive phrases with active synthetic Georgian verbs (გადაწყვიტა instead of მიიღო გადაწყვეტილება, მოხდა instead of ადგილი ჰქონდა, გაიღიმა instead of გააკეთა ღიმილი). "
                        "6. Prohibitive negation: use ნუ with imperative verbs (ნუ გეშინია, ნუ ტირი). "
                        "Output ONLY the translated Georgian text without commentary."
                    )
                else:
                    sys_instruction = (
                        "You are an acclaimed literary translator. Translate this text faithfully into natural, fluent, and expressive English. "
                        "Preserve literary voice, idioms, and emotional nuance. "
                        "Output ONLY the translated English text without commentary."
                    )
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=p,
                    config=dict(system_instruction=sys_instruction, temperature=0.2)
                )
                reason = getattr(response.candidates[0], "finish_reason", None) if response and response.candidates else None
                if response and response.text and str(getattr(reason, "value", reason)).upper() == "STOP":
                    p_trans = response.text.strip()
                    engine_used = "gemini-2.5-flash"
            except Exception as e:
                print(f"[translation_engine] Tier 0 Gemini translation failed: {e}")

        if p_trans and not translation_is_valid(p, p_trans, tgt):
            p_trans = None

        # Tier 1: Direct Google translation; availability is not guaranteed.
        if not p_trans:
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
                print(f"[translation_engine] Tier 1 direct translation failed: {e}")

        if p_trans and not translation_is_valid(p, p_trans, tgt):
            p_trans = None

        # Tier 2: deep-translator GoogleTranslator fallback
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
                print(f"[translation_engine] Tier 2 GoogleTranslator failed: {e}")

        if p_trans and not translation_is_valid(p, p_trans, tgt):
            p_trans = None

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

        if tgt == "ka":
            p_trans = synthesize_georgian_morphology(p_trans)
            p_trans = clean_georgian_morphology(p_trans)
            if load_active_pack is not None and apply_pack is not None:
                try:
                    active_pack = load_active_pack("ka")
                    if active_pack.get("enabled", True):
                        p_trans = apply_pack(p_trans, active_pack.get("items", []), kind="translate")
                except Exception as e:
                    print(f"[translation_engine] active pack translate post-edit warning: {e}")
        elif tgt == "en":
            if load_active_pack is not None and apply_pack is not None:
                try:
                    active_pack = load_active_pack("en")
                    if active_pack.get("enabled", True):
                        p_trans = apply_pack(p_trans, active_pack.get("items", []), kind="translate")
                except Exception:
                    pass

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

