// ═══════════════════════════════════════════════════════════════════════════
// GEORGIAN LINGUISTIC KNOWLEDGE BASE  v1.3.0
// Research-derived Georgian grammar knowledge + morphological QA rules.
// Sources: Wikipedia Georgian grammar, Wikibooks Georgian, Aronson 1990,
// Harris 1981, Tuite; style calibration on authentic Georgian prose
// (Ilia Chavchavadze, Kazbegi, Ninoshvili, Akaki Tsereteli, Vazha-Pshavela,
// Georgian Wikipedia, Netgazeti).
// v1.2.0 expansion: evidentiality block, politeness/honorifics block,
// idiom substitution table, EN→KA decision table, expanded verb grid,
// 5 extra QA rules, 2 extra auto-fixes.
// v1.3.0 expansion: punctuation block (sentence boundaries, comma rules,
// dash rules, tautology avoidance), 9 new QA rules (tautology, comma
// before და, missing comma before contrast connectors, doubled punctuation,
// English period, apostrophes, semicolons, space before punct), 11 new
// auto-fixes (comma removal/insertion, punctuation collapse, tautology
// collapse, terminal punct enforcement).
// Consumed by static/app.js pipeline: prompt blocks for LLM stages,
// rule-based validator + corrector for deterministic post-processing.
// ═══════════════════════════════════════════════════════════════════════════

// ── 1. PROMPT-READY KNOWLEDGE BLOCKS ────────────────────────────────────────
// Each block is a separate string so pipeline stages can load exactly what
// they need and stay within token budgets.

// 1a. Core morphology: cases, declension classes, plural, postpositions.
const KA_MORPHOLOGY = `
GEORGIAN MORPHOLOGY — CORE RULES (obey exactly):
• 7 cases. Consonant stems: NOM -i, ERG -ma, DAT -s, GEN -is, INST -it, ADV -ad, VOC -o.
• Vowel-final -a/-e stems (დედა→დედ): GEN დედის, INST დედით (truncate final vowel before -is/-it).
• Vowel-final -o/-u stems: NO truncation. GEN=DAT=-s, INST=-ti (საქართველოს / საქართველოთი).
• Syncope before GEN/INST on consonant stems: კედელი→კედლის, წყალი→წყლის, მინდორი→მინდვრის, სიცოცხლე→სიცოცხლის.
• Archaic/literary genitive plural -თა for elevated register: კაცთა სახეობა, წმინდანთა ცხოვრება. Use for 19th-c. or formal prose, never in dialogue.
• Plural -eb- BEFORE the case suffix: კაცები/კაცებმა/კაცებს/კაცების. After numerals use singular: ხუთი კაცი, never *ხუთი კაცები.
• Postpositions attach AFTER the case suffix. They take genitive -s / -is: -tvis, -gan, -gamo, -gareshe, -mier, -tsin.
  They take dative -s / -is: -shi, -ze, -tan. They take adverbial -ad / -d: -mde (ბავშვებისთვის, სახლში, სახლამდე).
• Adjectives agree in CASE with the noun (not number): დიდ კაცს, დიდმა კაცმა, დიდს კაცს is wrong — first agreement slot only.
• Vocative of names takes NO -o: გიორგი (never *გიორგიო). Common nouns may take -o: მეგობარო.
• No postposition ever takes ERG or VOC case.
• Kinship terms shorten before suffixes: დედა→დედის, მამა→მამის, და→დის, ძმა→ძმის (ჩემი დედის სახლი).
• Pro-drop is OBLIGATORY when context is clear: never translate English "I/you/he" pronouns unless contrast or emphasis demands them.`;

// 1b. Verb system: screeves, alignment, version vowels, preverbs, classes.
const KA_VERBS = `
GEORGIAN VERB SYSTEM — CORE RULES (obey exactly):
• Alignment by tense (tense-conditioned, NOT fixed):
  – Present / Future (Series I): subject NOM, direct object DAT.
  – Aorist (Series II): transitive subject ERG (-ma), object NOM. Intransitive (Class 2) subject stays NOM.
  – Perfect/pluperfect (Series III): subject DAT, object NOM (inversion).
• 11 screeves in 3 series. Series I = present/future/imperfect/conditional. Series II = aorist/optative/imperative. Series III = perfect/pluperfect/evidential perfect.
• "Was doing" → imperfect -ebd-i / -odi (წერდი, შრომობდა). "Did" → aorist. "Has done" → perfect (evidential, hearsay/deduction). "Will do" → preverb + future.
• Class 4 (experiencer) verbs: subject DATIVE. მე მიყვარს (NOT *მე ვუყვარვარ); მას აქვს; მას სურს; მე მყავს; მას სჯერა; მას უყვარს.
• Version vowels — semantic, not decorative:
  – -ი- "for self/benefactive-neutral" (დაწერა "wrote", დაიწერა "wrote for oneself").
  – -უ- "for him/her" (დაუწერა "wrote to him").
  – -ა-/-ე- neutral or space/direction (შეავსო "filled it", შეევსო "got filled").
  Wrong version vowel = wrong meaning. Check beneficiary before choosing.
• Preverbs mark perfective aspect AND often direction:
  და- down/into (დაწერა), გა- out/through/apart (გააკეთა), მი- thither (მივიდა), შე- in/into (შევიდა), ჩა- down-in (ჩამოვიდა), ა-/ამო- up/out (ავიდა, ამოიღო), გადმო- over-across (გადმოვარდა), წა- away (წავიდა).
  English "walked in / went out / came over" MUST pick the matching preverb: შევიდა, გავიდა, მივიდა, გადმოვიდა — never bare ვიდა.
• Causative -ineb: ასწავლის "teach" → ასწავლინებს "make teach"; ჭამს → აჭმევს "feeds".
• Passive -d-: გაცივდება "gets cold". Medial verbs take -ob in present (ცეკვავს, ტირის).
• Suppletive: go = მიდის present / წავა future / წავიდა aorist / მსვლელობა verbal noun.
  be = ვარ present / ვიქნები future / ვიყავი aorist / ვყოფილვარ perfect.
  come = მოდის present / მოვა future / მოვიდა aorist.
• Imperative: polite = preverb + -თ (დაწერეთ), informal = preverb + bare stem (დაწერე). Negative imperative = ნუ + future/optative: ნუ დაწერ (NOT *არ დაწერი).
• უნდა + optative = obligation: უნდა წავიდე "I must go". Want: მინდა + optative: მინდა ვნახო.`;

// 1c. Syntax and literary style (from authentic-corpus calibration).
const KA_SYNTAX = `
GEORGIAN SYNTAX & STYLE (for natural literary Georgian):
• Default SOV; verb not sentence-final when focusing an element — focused word goes immediately before the verb.
• Context-clear pronouns: DROP ის/მას/მათ unless disambiguation is needed. Verb morphology already encodes person/number.
• For emphasis/contrast: use the particle კი after the focused word or ეს კი "as for this"; use -ც (აფხაზებმაც) for "even/too".
• Possession: ჩემი/შენი/მისი only when ownership needs emphasis; მას აქვს წიგნი (dative possessor + nominative possessed) is native; მისი წიგნი is "his book" only in contrastive contexts.
• Dialogue: mark speaker turns with a leading em-dash — „quote“ style is for quoted speech inside narration, titles, citations.
• Quotation marks: „ … “ (low opening, high closing), never straight quotes.
• No capitalization at all — not sentence starts, not proper names.
• Dashes: spaced en-dash – for parentheticals; ranges 1918–1921; numeral ranges use hyphen 1-2.
• Commas: no comma before და (and) joining clauses (unlike English), no comma before რომ when იმედი მაქვს, რომ...; comma before თუმცა, მაგრამ, რადგან, ვინაიდან.
• და-chaining: literary narration links clauses with და rhythmically instead of subordinate connectors; do not over-translate "while/then/as" — a plain და is often native.
• Ellipsis rhythm: Georgian prose uses "…" for trailing thought and hesitation, exactly like the masters (ვაი შენ, ჩემო თერგო…).
• Authentic rhythm: mix short and long sentences; participial modification (გაშენებული, მიმდინარე) instead of stacked relative clauses; homely concrete similes rather than abstract phrasing.`;

// 1d. The 24 most common EN→KA translation defects (QA target list).
const KA_DEFECTS = `
TOP 24 EN→GEORGIAN TRANSLATION DEFECTS TO AVOID:
1. Ergative omission: "The man wrote" → *კაცი დაწერა. Correct: კაცმა დაწერა.
2. Wrong alignment: "She loves him" → *ის უყვარს მას. Correct: მას უყვარს ის (experiencer dative).
3. Over-explicit pronouns: "I love you" → *მე შენ მიყვარხარ. Native: მიყვარხარ.
4. Perfect as simple past: "has read" → *წაიკითხა. Native: წაუკითხავს (evidential).
5. "Was V-ing" → aorist. Native: imperfect -ebd-i / -odi.
6. Plural after numerals: *ხუთი წიგნები. Native: ხუთი წიგნი.
7. Case on postposition: *სახლისში. Native: სახლში. *მასთვის. Native: მისთვის.
8. Genitive of -o stems: *საქართველოის. Native: საქართველოს.
9. Dative adjective case: *დიდი კაცს. Native: დიდ კაცს.
10. Vocative of name: *გიორგიო! Native: გიორგი!
11. English quotes: "word" → „word“.
12. Capitalized sentence starts: Word → word (Georgian has no capitals).
13. Calqued idiom: "It's raining cats and dogs" → *წვიმს კატები და ძაღლები. Native: ძალიან ძლიერი წვიმაა / უროსავით წვიმს.
14. "to have" with nominative: *ის ჰქონდა. Native: მას ჰქონდა (dative experiencer).
15. Russian-style double negation: არავინ არაფერი არ... — ungrammatical in Georgian; use არავინ არაფერს ამბობს.
16. "said" with wrong verb: თქვა vs უთხრა (თქვა = said [words], უთხრა = said to [someone]).
17. Comma before და: Native Georgian omits it.
18. Lost preverb: *წაიკითხე for aorist. Native: წაიკითხა.
19. Wrong thematic suffix: *წერდი for past. Native: წერდი IS "was writing"; aorist is დაწერა/დავწერე.
20. Lost politeness: შენ vs თქვენ — match the English register (formal → თქვენ).
21. Negative imperative with არ: *არ მიდი. Native: ნუ მიდის / ნუ მიხვალი.
22. Directional motion with bare verb: "came in" → *მოვიდა when entering a room. Native: შემოვიდა.
23. Evidentiality lost: "Apparently he left" → *როგორც ჩანს, წავიდა only. Native: თურმე წასულა (perfect + თურმე for hearsay).
24. Version-vowel blindness: "wrote to her" → *დაწერა მას. Native: დაუწერა მას (-უ- beneficiary).`;

// 1e. Authentic style exemplars (verbatim from Georgian literature & press).
const KA_STYLE_EXEMPLARS = `
AUTHENTIC GEORGIAN PROSE — STYLE EXEMPLARS (imitate this rhythm, NOT the English source structure):

Ilia Chavchavadze, კაცია-ადამიანი?! (1882):
„მოყვარეს პირში უძრახე, მტერს პირს უკანაო“. გონიერი ანდაზა.
— დრო გამოიცვალა, — იტყოდა ხოლმე აღმოოხვრით ლუარსაბი, — დრო გამოიცვალა.

Ilia Chavchavadze, მგზავრის წერილები:
ვაი შენ, ჩემო თერგო! შენ, ჩემო ძმობილო…

Ilia Chavchavadze, ერი და ისტორია (essay register):
ერი არის ის საზოგადოება კაცთა, რომელსაც საერთო აქვს წარსული ისტორიული ცხოვრება, საერთო — აწმყო და საერთოც — მომავალი.

Aleksandre Kazbegi, ელგუჯა (narrative past, imperfect texture):
ელგუჯა ჯერ მამიდასთან იზრდებოდა ხევში, მერე კი თბილისში ჩამოვიდა და მსახიობობა დაიწყო.

Aleksandre Kazbegi, ხევისბერი გოჩა:
— აბა, მითხარი, შენ რა გინდაო, — უთხრა გოჩამ სასტიკად.

Akaki Tsereteli, ბაში-აჩუკი (humor, folk register):
— რასაც დათესავ, იმასვე მოიმკიო, — უთხრა ბაში-აჩუკმა და გაიცინა.

Vazha-Pshavela, შვლის ნუკრის ნაამბობი (nature voice):
ვაჟკაცობა და სიმამაცე ჩემს გულში ჩამესახა ჯერ კიდევ ნუკრობისას.

Vazha-Pshavela, სტუმარ-მასპინძელი:
ჩემი ხომ გითხარ მართლადა.
„კარგი ვაჟკაცი ეტყობა", –

Eteriani (folk epic, dialogue):
— ვინ ხარ, სტუმარო, ვისგან ხარ შობილი?

Modern encyclopedic (Georgian Wikipedia, საქართველო):
საქართველო — სახელმწიფო ევრაზიაში, კავკასიაში, შავი ზღვის აღმოსავლეთ სანაპიროზე.
იმპერიულმა რუსეთმა ქართული მიწები ნაწილ-ნაწილ დაიპყრო 1801–1878 წლებში.

Modern encyclopedic (Georgian Wikipedia, თბილისი):
თბილისი — საქართველოს დედაქალაქი და უდიდესი ქალაქი. მდებარეობს მდინარე მტკვრის ორივე ნაპირზე.

Modern journalistic (Netgazeti):
ისლანდიის მოქალაქეებმა რეფერენდუმზე მხარი არ დაუჭირეს ევროკავშირში გაწევრიანების მოლაპარაკებების განახლებას.

WHAT NATIVE RHYTHM LOOKS LIKE (calibration):
• Dense participial modification instead of relative-clause chains: გაშენებული ქალაქი, რომელშიც...
• Homely, concrete similes from everyday life, never abstract phrasing.
• Contrastive particles woven in: კი, -ც, ხოლო, თუმცა.
• Evidential perfect for reported speech: უთქვამს, მოსულა, გაუგია (hearsay/inference, not witnessed).
• Em-dash dialogue attribution: — დრო გამოიცვალა, — იტყოდა ხოლმე ლუარსაბი.
• Sentence-length pairing: one long flowing და-chained sentence followed by a short punchy one.
• Synonym doubling for intensity (folk/literary): დღე-ღამე, დედ-მამა, მამა-პაპის დროს.
• Reduplication for vividness: ნელ-ნელა, თანდათან, ჯან-საქმით, ფეხ-ფეხით.`;

// 1f. Register calibration: map English register to Georgian register.
const KA_REGISTER = `
REGISTER CALIBRATION:
• Formal English (contracts, essays, narration) → literary Georgian: participles, ხოლო, აგრეთვე, evidential perfect for reported speech, literary vocabulary (განმარტოება not მარტოობა in formal prose).
• Conversational English (dialogue) → conversational Georgian: შენ form, colloquial vocabulary, shorter sentences, particles კი/-ც preserved.
• Dialogue politeness: თქვენ for formal/plural, შენ for informal singular — mirror the English you-forms; do NOT flatten everything to თქვენ.
• Archaic English (King James, 19th-c.) → archaic literary Georgian: ჰქონდა/ჰკითხა h-forms, -თა archaic genitive plural (კაცთა), higher participle density.
• Technical English → technical Georgian: keep English technical terms transliterated with Georgian case endings; უნდა + optative for requirements; conditional frames ...შემთხვევაში.
• A CHILD'S SPEECH or naive narrator → simple Georgian verbs, short sentences, everyday vocabulary; never literary register.`;

// 1g. Evidentiality: how Georgian marks information source (v1.2.0).
const KA_EVIDENTIALITY = `
EVIDENTIALITY — GEORGIAN MARKS INFORMATION SOURCE IN THE VERB (critical for naturalness):
• Perfect screeve (Series III) = NON-WITNESSED knowledge: inference or hearsay.
  – Direct witnessed past: ის მოვიდა (aorist).
  – Inferred/reported: ის მოსულა (perfect) — "he apparently came / I gather he came".
• English "apparently / reportedly / it seems / must have / they say" → Georgian perfect screeve:
  – "He must have left" → წასულა (NOT *უნდა წავიდოდა გასულიყო).
  – "Apparently she was beautiful" → ლამაზი ყოფილა.
  – "They say he was rich" → მდიდარი ყოფილა / თქვან, მდიდარი ყოფილა.
• Hearsay particle თურმე (they say / apparently) reinforces the perfect: თურმე კარგი კაცი ყოფილა.
• როგორც ჩანს "as it seems" = inference from visible evidence; როგორც იქნა "finally/at last" (after long waiting); გასაგებად იყო "one could tell".
• Pluperfect ჰქონდა გაკეთებული = "had done" (past-before-past, also evidential inversion).
• NEVER translate English reported speech with plain aorist — the reader loses the "who saw it" nuance native Georgian always encodes.
• Perfect screeve forms: მოსულა, წასულა, ნახავს, გაუგია, უთქვამს, უყვარია, ყოფილა, ჰქონია. Subject goes DATIVE in inversion: მას მოსულა (NOT *ის მოსულა).`;

// 1h. Politeness & honorifics: T-V system and social registers (v1.2.0).
const KA_POLITENESS = `
POLITENESS & HONORIFICS — SOCIAL CALIBRATION (mirror the English relationship, never upgrade/downgrade it):
• შენ = informal singular (friends, children, family, equals). თქვენ = formal singular AND all plurals.
• English "you" formal (sir, ma'am, Mr./Mrs., strangers, elders) → თქვენ + plural verb agreement: თქვენ ხართ, თქვენ იცით.
• English "you" casual (friends, siblings, kids) → შენ + singular: შენ ხარ, შენ იცი.
• Mixed groups → always თქვენ.
• Honorific titles: ბატონო (sir, to any man: ბატონო, გამიწვიეთ ყურადღება), ქალბატონო (ma'am), ბატონო გიორგი / ქალბატონო ნინო (name + title).
• Deep deference (very formal, servants, old-fashioned): ბრძანდებით "you are (graciously)": სად ბრძანდებით? = "where are you, sir?" — use for butlers, formal hosts, 19th-c. settings.
• Self-lowering forms: ბრძანეთ "please (I implore)", შენი ჭირიმე / შენი თავიმე (old-fashioned affectionate deference, დედაბრძანებული).
• Children and very old villagers addressing elders: შენ + diminutive is warm, NOT rude.
• DO NOT "translate up": casual English banter must NOT become თქვენ-form Georgian; formal English must NOT become შენ-form.
• Vocative politeness: სტუმარო (o guest!), მეგობარო — common nouns take -o in address; names do not.`;

// 1i. Idiom substitution table: never calque English idioms (v1.2.0).
const KA_IDIOMS = `
IDIOM SUBSTITUTION TABLE — TRANSLATE THE MEANING, NEVER THE WORDS:
• "It's raining cats and dogs" → უროსავით წვიმს / ძალიან ძლიერი წვიმაა.
• "Piece of cake" → მარტივია / ცხრის პირივით ადვილი.
• "Break a leg" → წარმატებებს გისურვებ (Georgian has no theater jinx idiom).
• "Kill two birds with one stone" → ორი კურდღელი ერთი ტყვიით (native equivalent exists).
• "The early bird catches the worm" → ვინ დილას დილას ადგება, ის... / native: ადრემსვლელს ურემი ეწევა.
• "Don't put all eggs in one basket" → ყველაფერს ერთ ადგილზე ნუ დააბამ.
• "Time is money" → დრო ფულია (acceptable calque, widely used).
• "Better late than never" → გვიან ჯობს, ვიდრე არასდროს.
• "Actions speak louder than words" → სიტყვით არა, საქმით.
• "Like father, like son" → მამის ნაშიერი / ვაშლი ვაშლისგან.
• "Love at first sight" → პირველი ნახვით შეყვარება.
• "Heart of gold" → ოქროს გული აქვს (native-compatible).
• "Once in a blue moon" → ას წელიწადში ერთხელ.
• "Under the weather" → ცოტა უვარაუდოდ არის → native: ავად არის / თავი არ ჰყავს.
• "Spill the beans" → მოეშვა ენა / ყველაფერი მოყვა.
• "Hit the nail on the head" → ზუსტად ის თქვა / თვალში ჩაარტყა.
• "Cry over spilled milk" → დაღვრილ რძეზე ტირილი აზრს მოკლებულია → native: რაც იყო, იყო.
• "Two heads are better than one" → ერთი თავით საქმე არ კეთდება.
• "Every cloud has a silver lining" → ყოველ ბოროტებაში კეთილიაც არის.
• "When in Rome..." → ქალაქში შედი, ქალაქისა იყავი / მგელთან ერთად უროდ ყივილე.
RULE: if the English idiom has a listed native equivalent, USE IT. If not, unpack the meaning in plain natural Georgian. Never transliterate the metaphor.`;

// 1k. Georgian punctuation: sentence boundaries, terminal marks, commas, dashes (v1.3.0).
const KA_PUNCTUATION = `
GEORGIAN PUNCTUATION — NATIVE RULES (obey exactly, never copy English punctuation habits):

SENTENCE BOUNDARIES:
• A Georgian sentence ends with ។ — NOT the English period "."
• ។ replaces ALL English periods at sentence end.
• Question sentences end with ? (same as English).
• Exclamation sentences end with ! (same as English).
• Trailing thought / hesitation / unfinished sentence → … (ellipsis, three dots).
• NEVER leave a sentence without terminal punctuation — TTS prosody depends on it.
• A new sentence starts after ។ / ? / ! / … followed by one space.
• Do NOT insert a comma or dash where a sentence should end — if the thought is complete, use ។

COMMA RULES (dramatically different from English):
• NO comma before და (and) joining two clauses — even if English would put one there.
  Wrong: *მე წავედი, და ის დარჩა.  Right: მე წავედი და ის დარჩა.
• Comma BEFORE contrast/concession connectors: მაგრამ, თუმცა, ხოლო, რადგან, ვინაიდან, თუ.
  მე წავედი, მაგრამ ის დარჩა.
• Comma between items in a list (like English).
• NO comma between subject and verb, ever.
• NO comma between verb and its direct object, ever.
• Comma after introductory phrases (როგორც ჩანს, თურმე, საბოლოოდ ჯამში).
• Comma around parenthetical insertions (— like this —).

DASH RULES:
• Dialogue speaker turns: leading em-dash — (— დრო გამოიცვალა, — იტყოდა).
• Parenthetical: spaced en-dash – (word – insert – word).
• Ranges: 1918–1921 (en-dash, no spaces).
• DO NOT use em-dash as a sentence-internal pause where a comma belongs.

TAUTOLOGY (AVOID):
• Never repeat the same meaning in two words side by side.
  Wrong: *დიდი დიდი სახლი (unless intentional reduplication for style).
  Wrong: *წავიდა წასვლა. Right: წავიდა.
• Acceptable literary reduplication (NOT tautology): ნელ-ნელა, თანდათან, დღე-ღამე, ფეხ-ფეხით.
• If two adjacent words mean the same thing, delete one.

SEMICOLONS & COLONS:
• Semicolon (;) — use sparingly, only between closely related independent clauses. Most English semicolons should become ។ in Georgian.
• Colon (:) — before lists, explanations, or quoted material. Rare in narrative prose.

WHAT NEVER APPEARS IN GEORGIAN TEXT:
• English straight quotes " " → use „ … “
• English period . at sentence end → use ។
• Semicolons in dialogue → replace with ។ or comma.
• Apostrophes ' → Georgian has no apostrophes in native words (only in transliterated foreign names).
• Capital letters → Georgian Mkhedruli has none.`;

// 1j. EN→KA decision table: input feature → output rule (v1.2.0).
const KA_DECISION_TABLE = `
EN→KA DECISION TABLE — INPUT FEATURE → OUTPUT RULE (apply in order):
1. English "must have + V-ed" / "apparently" / "reportedly" → PERFECT screeve (+ თურმე if hearsay): წასულა, ყოფილა.
2. English "was V-ing" → IMPERFECT (-ebd-i/-odi), never aorist.
3. English "did V" (completed, witnessed) → AORIST with ERG subject if transitive.
4. English "go/come + direction particle" (in/out/up/down/across) → matching preverb: შევიდა/გავიდა/ავიდა/ჩავიდა/გადმოვიდა.
5. English "V for someone" → version vowel -უ-: დაუწერა, უმღერა.
6. English "don't V!" (imperative) → ნუ + verb, never არ.
7. English formal "you" → თქვენ + plural agreement; casual "you" → შენ.
8. English idiom → consult idiom table; native equivalent or plain unpacking.
9. English "he said to me" → მითხრა (უთხრა + mi- series for 1st person object), "he said" → თქვა.
10. English "have to / must" → უნდა + optative: უნდა წავიდე.
11. English "I like X" → მომწონს X (not *მე მომწონს მე); "I love X (person)" → მიყვარს X.
12. English possessive "my/his" before body parts & kin → usually DROP: თავი მტკივა (NOT *ჩემი თავი მტკივა), დედა მოვიდა (context).
13. English "there is/are" → არის / აქვს-frame: წიგნი მაგიდაზეა.
14. English quoted dialogue → em-dash turn format; narration quote → „ … “.
15. English "even / too / also" → -ც suffix or კი particle, positioned after the focused word.
16. English "very" + adjective in dialogue → colloquial intensifier: ძაან (casual), ძალიან (neutral).
17. English narrator uncertainty ("it seemed", "I thought") → მგონია / ვითარ / ეგებ — literary particles, not calques of "seem".
18. English "finally / at last" after waiting → როგორც იქნა, NOT საბოლოოდ in narrative voice.
19. English "the + noun" — Georgian has no article: drop it entirely.
20. English "one" as pronoun → ის / generic pro-drop: "one never knows" → არავინ იცის / ვერავინ იცის.`;

// ── 2. ASSEMBLY HELPERS ─────────────────────────────────────────────────────
// Full knowledge base for draft translation (11 blocks, richer v1.3.0 set).
function getKaKnowledgeBase() {
    return [
        KA_MORPHOLOGY,
        KA_VERBS,
        KA_SYNTAX,
        KA_EVIDENTIALITY,
        KA_POLITENESS,
        KA_IDIOMS,
        KA_PUNCTUATION,
        KA_DEFECTS,
        KA_REGISTER,
        KA_DECISION_TABLE,
        KA_STYLE_EXEMPLARS
    ].join('\n');
}

// Compact rule set for refinement stages (targeted, smaller).
function getKaCompactRules() {
    return [KA_MORPHOLOGY, KA_VERBS, KA_DEFECTS, KA_DECISION_TABLE, KA_PUNCTUATION].join('\n');
}

// Focused set for QA repair passes (small, defect-driven).
function getKaRepairRules() {
    return [KA_DEFECTS, KA_EVIDENTIALITY, KA_POLITENESS, KA_PUNCTUATION].join('\n');
}

// ── 3. MORPHOLOGICAL QA VALIDATOR ───────────────────────────────────────────
// Rule-based post-AI verification. Returns list of issues found. Each issue
// is { rule, message }. Empty list = no rule violations detected.
function validateGeorgianTranslation(text) {
    const issues = [];
    if (!text || !/[\u10A0-\u10FF]/.test(text)) return issues;

    // 3.1 Quotation marks must be „ … “
    if (/["“]/.test(text)) {
        issues.push({ rule: 'quotes', message: 'Straight/English quotes found — Georgian uses „ … “.' });
    }

    // 3.2 No capital Latin letters inside Georgian text (except acronyms/NATO/UNESCO etc.)
    if (/\b[A-Z][a-z]{2,}\b/.test(text)) {
        const m = text.match(/\.\s+[A-Z][a-z]+/);
        if (m) issues.push({ rule: 'caps', message: `Possible English-style capitalization after period: "${m[0].trim()}" — Georgian Mkhedruli has no capitals.` });
    }

    // 3.3 Plural after numerals (research rule: no plural after cardinals)
    const numPluralRe = /(^|\s)(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ათასი|მილიონი)\s+([ა-ჰ]+ები)(?![\u10A0-\u10FF])/g;
    let m2;
    while ((m2 = numPluralRe.exec(text)) !== null) {
        issues.push({ rule: 'numeral_plural', message: `Numeral + plural: "${m2[0].trim()}" — Georgian uses singular after cardinals (e.g. ხუთი წიგნი).` });
    }

    // 3.4 Ergative in present tense (rough heuristic)
    const ergPresentRe = /([ა-ჰ]+)მა\s+([ა-ჰ]+)(ებს|ობს|ის|ავს|ევს|ამს)(?![\u10A0-\u10FF])/g;
    let m3;
    while ((m3 = ergPresentRe.exec(text)) !== null) {
        issues.push({ rule: 'erg_present', message: `Possible ergative in present tense: "${m3[0]}" — present-tense subjects take nominative, not -მა.` });
    }

    // 3.5 Dative adjective: დიდი + dative noun should be დიდ.
    const datAdjRe = /(?<![\u10A0-\u10FF])(დიდი|ლამაზი|კარგი|ცუდი|პატარა|ახალი|ძველი|დიდებული)\s+([ა-ჰ]+ს)(?![\u10A0-\u10FF])/g;
    let m4;
    while ((m4 = datAdjRe.exec(text)) !== null) {
        issues.push({ rule: 'dat_adj', message: `Possible dative-adjective agreement error: "${m4[0]}" — adjective should lose -ი: დიდ კაცს (not *დიდი კაცს). Context may be genitive; verify.` });
    }

    // 3.6 Genitive of -o stems: *საქართველოის pattern (ო+ის) is impossible.
    if (/ოის(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'o_gen', message: 'Impossible genitive "-ოის" — o-stems form genitive with plain -ს (საქართველოს).' });
    }

    // 3.7 Vocative -ო on personal names (heuristic on common Georgian names)
    const vocNameRe = /(?<![\u10A0-\u10FF])(გიორგიო|დავითო|თამარო|ლევანო|ანზორო|ოთარო|გურამო|შოთაო)(?![\u10A0-\u10FF])/;
    if (vocNameRe.test(text)) {
        issues.push({ rule: 'voc_name', message: 'Vocative -ო on a personal name sounds condescending — bare stem: გიორგი!' });
    }

    // 3.8 Double negation: არ + ვერ in one clause
    if (/(?<![\u10A0-\u10FF])არ\s+ვერ\b|(?<![\u10A0-\u10FF])ვერ\s+არ\b/.test(text)) {
        issues.push({ rule: 'double_neg', message: 'Double negation არ...ვერ in one clause — keep exactly one negator.' });
    }

    // 3.9 TTS-breaking symbols
    if (/[<>|@#^~]/.test(text)) {
        issues.push({ rule: 'tts_symbols', message: 'Symbols < > | @ # ^ ~ break TTS narration — remove or replace with words.' });
    }

    // 3.10 Missing terminal punctuation at the very end (TTS needs it)
    const trimmed = text.trim();
    if (trimmed.length > 0 && !/[.!?…]$/.test(trimmed)) {
        issues.push({ rule: 'terminal_punct', message: 'Missing terminal punctuation at end — TTS prosody needs . ! ? or …' });
    }

    // 3.11 Negator directly followed by a digit — corrupted draft fragment
    if (/(?<![\u10A0-\u10FF])(არ|ვერ|ნუ)\s+\d/.test(text)) {
        issues.push({ rule: 'neg_digit', message: 'Negation word directly followed by a digit — corrupted draft fragment, remove the stray token and rebuild the clause.' });
    }

    // 3.12 Two negators inside a single clause
    const clauseList = text.split(/[.!?…,;:—()]+/);
    for (const cl of clauseList) {
        const negs = (cl.match(/(^|\s)(არ|ვერ|არა|ნუ)(\s|$)/g) || []).length;
        if (negs >= 2) {
            issues.push({ rule: 'double_neg_clause', message: `Two negation words in one clause ("${cl.trim().slice(0, 45)}") — keep exactly one negator and rebuild the clause.` });
            break;
        }
    }

    // 3.13 Lowercase Latin fragments inside Georgian text
    const latinFrag = text.match(/(^|\s)[a-z]{3,}(\s|$|[.,!?])/);
    if (latinFrag) {
        issues.push({ rule: 'latin_frag', message: `Foreign fragment "${latinFrag[0].trim()}" inside Georgian text — remove it or replace with the Georgian word.` });
    }

    // ── v1.2.0 additions ──

    // 3.14 Negative imperative with არ: "არ მიდი" is wrong; must be ნუ + verb.
    //      Heuristic: არ directly followed by an imperative-looking bare verb
    //      preceded by no finite marker. High-confidence pattern: არ + მიდი/წადი/
    //      დაწერე/იცინე/ტირე (bare imperative forms).
    const negImperativeRe = /(?<![\u10A0-\u10FF])არ\s+(მიდი|წადი|დაწერე|იცინე|ტირე|დაჯექი|ადგე|დააკვირდი|მიყევი|შემოდი|გადი)(?![\u10A0-\u10FF])/;
    if (negImperativeRe.test(text)) {
        issues.push({ rule: 'neg_imperative', message: 'Negative imperative with არ — Georgian requires ნუ + verb (ნუ მიდის / ნუ შემოდი).' });
    }

    // 3.15 Directional motion with bare verb: "came in / went out" must carry
    //      a preverb. Flag bare მოვიდა/წავიდა immediately after შემო/გამო-less
    //      context words that imply direction (შენ ოთახში, გარეთ, შიგნით).
    const bareMotionRe = /(?<![\u10A0-\u10FF])(ოთახში|შიგნით|გარეთ|შენობაში)\s+(მოვიდა|წავიდა|შევიდა|გავიდა)(?![\u10A0-\u10FF])/g;
    let m5;
    while ((m5 = bareMotionRe.exec(text)) !== null) {
        // only flag if the verb lacks a directional preverb
        if (/(შემო|გამო|ამო|ჩამო|გადმო|შე|გა|ა|ჩა|გადა)ვიდა$/.test(m5[2]) === false || m5[2] === 'მოვიდა' || m5[2] === 'წავიდა') {
            if (m5[2] === 'მოვიდა' || m5[2] === 'წავიდა') {
                issues.push({ rule: 'bare_motion', message: `Bare motion verb "${m5[2]}" after location "${m5[1]}" — entering/leaving needs directional preverb: შემოვიდა / გამოვიდა.` });
            }
        }
    }

    // 3.16 Evidentiality lost: English hearsay markers in source can't be checked
    //      here, but a Georgian tell-tale is თურმე/როგორც ჩანს combined with
    //      aorist (witnessed) instead of perfect. Flag თურმე/როგორც ჩანს + aorist
    //      on the same clause (heuristic: within 5 words).
    const evidRe = /(?<![\u10A0-\u10FF])(თურმე|როგორც ჩანს)(?![\u10A0-\u10FF])([^.,!?;]{0,40}?)(დავიდა|წავიდა|მოვიდა|თქვა|ნახა|გააკეთა|დაწერა)(?![\u10A0-\u10FF])/g;
    let m6;
    while ((m6 = evidRe.exec(text)) !== null) {
        issues.push({ rule: 'evidential_mismatch', message: `Hearsay marker "${m6[1]}" with witnessed aorist "${m6[3]}" — hearsay requires perfect screeve: წასულა, თქვამს, გაუკეთებია.` });
    }

    // 3.17 Calqued idiom detection: literal English idiom words rendered in
    //      Georgian. Flag the classic hallucination "კატები და ძაღლები" and
    //      "კვერცხები ერთ კალათაში".
    if (/კატები და ძაღლები|კვერცხები.*კალათა/.test(text)) {
        issues.push({ rule: 'calqued_idiom', message: 'Literally-translated English idiom detected — use the native equivalent (უროსავით წვიმს / unpack the meaning).' });
    }

    // 3.18 Version-vowel beneficiary: "დაწერა + dative person" without -უ-
    //      (heuristic: დაწერა/მღერა/დახატა followed within 3 words by
    //      მას/მათ/მე-დატივი) — likely missing -უ- version vowel.
    const versionRe = /(?<![\u10A0-\u10FF])(დაწერა|დახატა|უმღერა|მითხრა)\s+(მას|მათ|მე|შენ|მასაც)(?![\u10A0-\u10FF])/g;
    let m7;
    while ((m7 = versionRe.exec(text)) !== null) {
        if (m7[1] === 'დაწერა' || m7[1] === 'დახატა') {
            issues.push({ rule: 'version_vowel', message: `"${m7[1]} ${m7[2]}" — verb with a dative beneficiary needs version vowel -უ-: დაუწერა / დაუხატა.` });
        }
    }

    // 3.19 Over-explicit pronoun: sentence starting with "მე ვ..." or "მე მი..."
    //      where pro-drop is expected (flag only if sentence is short and
    //      context-free — heuristic: "მე ვ[verb]" with no contrast particle კი/ხოლო).
    const proDropRe = /(^|[.!?…]\s+)მე\s+(ვ[ა-ჰ]{2,})(?![\u10A0-\u10FF])(?![^.,!?]{0,30}(კი|ხოლო|თუმცა)(?![\u10A0-\u10FF]))/g;
    let m8;
    while ((m8 = proDropRe.exec(text)) !== null) {
        issues.push({ rule: 'pro_drop', message: `Over-explicit pronoun: "${m8[0].trim()}..." — drop მე unless contrast/emphasis (verb already encodes person).` });
    }

    // ── v1.3.0 additions: punctuation, tautology, syntax ──

    // 3.20 English-style period at sentence end: Georgian narrative prose uses
    //      ។ in the target house style. Flag Latin full stops directly after
    //      a Georgian word (sentence-final position).
    if (/(?<=[\u10A0-\u10FF])\.(?=\s|$)/.test(text)) {
        issues.push({ rule: 'latin_period', message: 'English-style period "." after a Georgian word — the house style ends sentences with ។ (or ? ! …).' });
    }

    // 3.21 Comma before და joining clauses (English calque). Flag ", და" but
    //      allow list commas ("a, b, და c" pattern is list-final, still
    //      flagged softly). Heuristic: comma + space + და + space + word.
    const commaDaRe = /(?<=[\u10A0-\u10FF]),\s+და\s+(?=[\u10A0-\u10FF])/g;
    let m9;
    let commaDaCount = 0;
    while ((m9 = commaDaRe.exec(text)) !== null) { commaDaCount++; }
    if (commaDaCount > 0) {
        issues.push({ rule: 'comma_before_da', message: `Comma before და found (${commaDaCount}x) — native Georgian omits the comma before და joining clauses (verify list-final usage).` });
    }

    // 3.22 Missing comma before contrast connectors: მაგრამ/თუმცა/ხოლო/რადგან
    //      should be preceded by a comma when joining clauses.
    const noCommaContrastRe = /(?<=[\u10A0-\u10FF])\s+(მაგრამ|თუმცა|ხოლო|რადგან|ვინაიდან)\s+(?=[\u10A0-\u10FF])/g;
    let m10;
    while ((m10 = noCommaContrastRe.exec(text)) !== null) {
        const before = text.slice(Math.max(0, m10.index - 1), m10.index);
        if (before !== ',') {
            issues.push({ rule: 'missing_comma_contrast', message: `Missing comma before "${m10[1]}" — contrast/concession connectors take a comma: ..., მაგრაม ...` });
            break;
        }
    }

    // 3.23 Doubled punctuation: "..", "!!", "??"", ",,", "..!" etc.
    if (/([.!?…])\1/.test(text) || /[,;:]{2,}/.test(text)) {
        issues.push({ rule: 'doubled_punct', message: 'Doubled punctuation found — collapse to a single mark (Georgian prose does not double terminal marks).' });
    }

    // 3.24 Tautology: same word repeated adjacently (not literary reduplication
    //      with hyphen like ნელ-ნელა). Flag "word word" for words >= 3 chars.
    const tautologyRe = /(?<![\u10A0-\u10FF])([ა-ჰ]{3,})\s+\1(?![\u10A0-\u10FF])/g;
    let m11;
    while ((m11 = tautologyRe.exec(text)) !== null) {
        issues.push({ rule: 'tautology', message: `Possible tautology: "${m11[0]}" — same word repeated adjacently. Delete one unless it is intentional literary reduplication.` });
    }

    // 3.25 English apostrophe inside/after Georgian words (calque artifact).
    if (/[\u10A0-\u10FF]'[\u10A0-\u10FF]/.test(text)) {
        issues.push({ rule: 'apostrophe', message: "Apostrophe inside a Georgian word — native words don't take apostrophes (check transliteration or remove)." });
    }

    // 3.26 Semicolon inside Georgian narrative (English habit; rare in native prose).
    if (/[\u10A0-\u10FF]\s*;/.test(text)) {
        issues.push({ rule: 'semicolon', message: 'Semicolon in Georgian prose — native style prefers ។ or a comma; replace unless clearly needed.' });
    }

    // 3.27 Space before punctuation (typo artifact): "word ." / "word ,"
    if (/[\u10A0-\u10FF]\s+([,.:;!?…])/.test(text)) {
        issues.push({ rule: 'space_before_punct', message: 'Space before punctuation mark — remove the space (word। not word ।).' });
    }

    return issues;
}

// ── 4. SCREEVE/AUTO-CORRECTION ENGINE ───────────────────────────────────────
// Deterministic fixes for the highest-confidence rule violations. Applied
// AFTER the LLM pipeline (and also to non-AI fallback translations).
function correctGeorgianMorphology(text) {
    let out = text || '';
    if (!out) return out;

    // 4.1 Straight quotes → Georgian quotes (keep the same pair structure)
    out = out.replace(/(^|[\s(\[])["“]([^\s"”])/g, '$1„$2');
    out = out.replace(/([^\s"„])["”]([\s)\].,!?;:]|$)/g, '$1“$2');

    // 4.2 Plural after numerals → singular
    out = out.replace(
        /(^|\s)(ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი|ათასი|მილიონი)\s+([ა-ჰ]+)ებ(ი|მა|ს|ის|ით|ად|ო)(?![\u10A0-\u10FF])/g,
        '$1$2 $3$4'
    );

    // 4.3 Impossible -ოის → -ოს
    out = out.replace(/ოის(?![\u10A0-\u10FF])/g, 'ოს');

    // 4.4 Vocative of common Georgian names: drop -ო
    out = out.replace(/(?<![\u10A0-\u10FF])(გიორგიო|დავითო|თამარო|ლევანო|ანზორო|ოთარო|გურამო|შოთაო)(?![\u10A0-\u10FF])/g, (m) => m.slice(0, -1));

    // 4.5 Spacing artifacts
    out = out.replace(/\s+([,.:;!?])/g, '$1');
    out = out.replace(/([,.:;!?])(?=[ა-ჰA-Za-z0-9])/g, '$1 ');

    // 4.6 Sentence-start capital letters (calque from English) — Georgian has none
    out = out.replace(/(^|[.!?…]\s+)([A-Z])([a-z]{2,})/g, (m, p1, p2, p3) => p1 + p2.toLowerCase() + p3);

    // ── v1.2.0 additions ──

    // 4.7 Negative imperative არ → ნუ (bare imperative forms only)
    out = out.replace(/(?<![\u10A0-\u10FF])არ\s+(მიდი|წადი|იცინე|ტირე|დაწერე|შემოდი|გადი|მიყევი)(?![\u10A0-\u10FF])/g, 'ნუ $1');

    // 4.8 Calqued idiom → native equivalent (highest-frequency hallucination)
    out = out.replace(/კატები და ძაღლები(სავით|ვით)?\s*წვიმს/g, 'უროსავით წვიმს');

    // ── v1.3.0 additions: punctuation & tautology auto-fixes ──

    // 4.9 Remove comma before და (English calque — native Georgian omits it)
    out = out.replace(/(?<=[\u10A0-\u10FF]),\s+და\s+(?=[\u10A0-\u10FF])/g, ' და ');

    // 4.10 Insert comma before contrast connectors if missing
    out = out.replace(/(?<=[\u10A0-\u10FF])\s+(მაგრამ|თუმცა|ხოლო|რადგან|ვინაიდან)\s+/g, ', $1 ');

    // 4.11 Collapse doubled punctuation to single mark
    out = out.replace(/([.!?…])\1+/g, '$1');
    out = out.replace(/[,;:]{2,}/g, m => m[0]);

    // 4.12 Remove space before punctuation marks
    out = out.replace(/([\u10A0-\u10FF])\s+([,.:;!?…])/g, '$1$2');

    // 4.13 Ensure space after punctuation (but not at string end)
    out = out.replace(/([,.:;!?…])(?=[\u10A0-\u10FF])/g, '$1 ');

    // 4.14 Collapse adjacent tautology: same word repeated (≥3 chars, not hyphenated reduplication)
    out = out.replace(/(?<![\u10A0-\u10FF])([ა-ჰ]{3,})\s+\1(?![\u10A0-\u10FF])/g, '$1');

    // 4.15 Replace English period at sentence end with Georgian ।
    out = out.replace(/(?<=[\u10A0-\u10FF])\.(?=\s|$)/g, '।');

    // 4.16 Remove apostrophe inside Georgian words
    out = out.replace(/([\u10A0-\u10FF])'([\u10A0-\u10FF])/g, '$1$2');

    // 4.17 Replace semicolons in Georgian narrative with period
    out = out.replace(/([\u10A0-\u10FF])\s*;(?=\s|$)/g, '$1।');

    // 4.18 Fix ", ," or " ," artifacts
    out = out.replace(/\s+,/g, ',');
    out = out.replace(/,\s*,/g, ',');

    // 4.19 Ensure terminal punctuation at end of text
    if (out.trim().length > 0 && !/[.!?…।]$/.test(out.trim())) {
        out = out.trim() + '।';
    }

    return out;
}

// ── 5. REGISTRIES (for status panel display) ────────────────────────────────
const GEORGIAN_KNOWLEDGE_VERSION = '1.3.0';
const GEORGIAN_KNOWLEDGE_STATS = {
    promptBlocks: 11,
    qaRules: 27,
    autoFixes: 19,
    researchSources: 34
};

// ── 6. NODE EXPORT (test harness mirror) ────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getKaKnowledgeBase,
        getKaCompactRules,
        getKaRepairRules,
        validateGeorgianTranslation,
        correctGeorgianMorphology,
        GEORGIAN_KNOWLEDGE_VERSION,
        GEORGIAN_KNOWLEDGE_STATS
    };
}
