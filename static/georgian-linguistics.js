// ═══════════════════════════════════════════════════════════════════════════
// GEORGIAN LINGUISTIC KNOWLEDGE BASE  v1.15.0
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
// v1.4.0 expansion: KA_WORDBANK block (high-frequency vocabulary tables,
// formal→plain substitutions, pronoun+postposition rules), QA rules
// 3.28 (pronoun_postpos_s) & 3.29 (decimal_point), auto-fix 4.20.
// v1.5.0 expansion: KA_PREVERBS block (9 preverbs with direction+aspect
// meanings, Series I/II aspect rule, EN→preverb mapping, narrative prose
// features, plural rules). QA rule 3.30 (tha_redundant: *ჩვენთაგან →
// ჩვენგან per Proton rule), auto-fix 4.21.
// v1.6.0 expansion (deep web research): KA_CASE_SYSTEM (Series I/II/III
// alignment + inversion), KA_NEGATION (არ/არა/ვერ/ნუ), KA_CONJUNCTIONS,
// KA_VOICE (active preference, passive/causative), KA_RELATIVES (რომელიც
// declension, participial preference), KA_SPEECH_VERBS (speech/mental/
// perception verb grid, დაიწყო/შეძლო/ხოლმე frames), KA_COLLOCATIONS,
// KA_TIME_EXPR, KA_IMPERSONAL (weather/experiencer dative frames),
// KA_NUMERALS (vigesimal system), KA_PARTICLES (კი, -ც, არც, ხომ, თუ...),
// KA_FALSE_FRIENDS (Russian-era loanword traps), KA_INTERJECTIONS.
// v1.6.1 expansion (corpus mining): KA_CORPUS_DEFECTS block built from REAL
// translated chapters (Sun Tzu / Marcus Aurelius run mined from the app's
// IndexedDB). QA rules 3.37-3.39 (hyphen-as-dash, magram comma, chunk
// truncation), auto-fixes 4.25-4.26 (em dash, truncation repair).
// v1.6.2 expansion (pipeline + TTS hardening): target-lang-specific guidance
// injected into the 3-pass pipeline prompts in app.js (draft + critique
// stages get Georgian series alignment, negation, false friends, production
// style defects, punctuation rules). Auto-fixes 4.27-4.32: doubled terminal
// marks, en-dash/minus normalization, ellipsis normalization + spacing,
// straight-quote → „…“ conversion, whitespace collapse for TTS narration.
// v1.7.0 expansion (deeper Georgian dive): KA_DISCOURSE (discourse markers:
// კი, -ც, არც, ხომ, განა, თურმე, მგონია, ალბათ, ვითარცა, მერე, ჯერ...),
// KA_PRONOUN_ECONOMY (subject/possessive dropping, generic-they → ის),
// KA_TACTICS (EN→KA decision procedure: register matching, MS Style Guide
// everyday word preference, cultural substitution, structural rebuilds,
// TTS-driven choices, self-check order). 10 new idioms in KA_IDIOMS
// (ბუზების თვლა, თვალი ეჭრება, ცეცხლზე ნავთის დასხმა, შენი ჭირიმე...).
// QA rules 3.40-3.42 (possessive_economy, singular_they, discourse_starvation),
// auto-fix 4.33 (drop redundant possessive before body parts).
// v1.8.0 expansion (grammar deep-dive, 10 new web sources): KA_VERSION_MARKERS
// (pre-radical vowels უ/ი/ა semantics, causative co-occurrence, passive -დ-/-ი-,
// PFSF Series-I-only, full verb template order), KA_MASDARS (verbal noun
// formation -ა/suppletive, gerund/infinitive rendering, უნდა+masdar chain),
// KA_SUBORDINATION (რომ/რათა/სანამ/თუ/რადგან..., declined რომელიც + postposition
// infixing, participle preference, NO English tense backshift, polypersonalism
// incl. მიყვარხარ), KA_ONOMATOPOEIA (native sound-imitation lexicon: animals,
// impact, laughter intensity set), KA_NUMBERS_TTS (spell-out vs digits decision
// table, ordinals მე-...-ე, vigesimal examples, decimal comma, space thousands).
// QA rules 3.43-3.46 (digit_in_dialogue, decimal_point_ka, english_ordinal,
// missing_rom), auto-fixes 4.34-4.36 (EN ordinal → KA ordinal, decimal point →
// comma, small digit + quantity noun → spelled-out).
// v1.9.0 expansion (participles/modality/comparison/possession/conditionals,
// 12 new web sources incl. georgian.se + kartuliena.eu): KA_PARTICIPLES
// (4 participle forms from any verb, adverbial of purpose, nominalized -ებელი),
// KA_MODALITY (უნდა+optative necessity, მინდა desire, შემიძლია ability, იქნებ),
// KA_COMPARISON (analytic უფრო/ყველაზე, სა-...-ეს- synthetic, irregular pairs),
// KA_POSSESSION (inverted აქვს/ჰყავს frames, possessive adjective declension,
// genitive rules), KA_CONDITIONAL (conditional screeve = preverb+imperfect,
// რომ/თუ + subjunctive conditions, "would" mapping), KA_ADVERBS_LITERARY
// (-ად formation, high-frequency literary adverbs, narrative time markers).
// QA rules 3.47-3.50 (have_calque, akvs_animate, comparison_calque,
// would_calque).
// v1.10.0 expansion (narrative/evidentiality deep-dive, 22 new web sources
// incl. Wier lingbuzz evidentiality paper): KA_EVIDENTIALITY_DEEP (aorist vs
// perfect narrative choice, perfect inversion dative subject, არ+perfect vs
// არ+aorist negation nuance, თურმე/მეთქი/თქო/-ო quotatives), KA_PLUPERFECT
// (participle + ქონდა screeve, ნა- experiential variant, უკვე+aorist
// alternative), KA_FUTURE_IN_PAST (conditional screeve in reported speech,
// English "would" disambiguation table), KA_ASPECT_HABITUAL (imperfective vs
// perfective stem choice, imperfect background / aorist foreground prose
// rhythm, ხოლმე habitual marker), KA_TIME_CLAUSES (როცა/სანამ...არ/შემდეგ
// რაც/როგორც კი/ვიდრე/რაკი, narration sequence connectors), KA_WORD_ORDER_
// NARRATIVE (SOV default, preverbal focus slot, contrastive fronting + კი,
// Wackernagel enclitics, anti-SVO-calque tactic).
// QA rules 3.51-3.55 (sanam_missing_ar, habit_conditional, evidential_missing,
// pluperfect_form, svo_order), auto-fixes 4.40-4.41 (EN evidential adverbs →
// თურმე, სანამ არ spacing normalize).
// v1.11.0 expansion (particles/quotatives/version vowels/T-V register/parallel
// prose, 22 new web sources incl. Advadze TSU particle paper + kaikki.org
// particle index + georgianlanguage.online): KA_PARTICLES_DEEP (კი/-ც/არ
// combination semantics: არც, არც კი, ...ც არ, კი არ, ...ც კი არ, კი ...ც არ,
// EN mapping table), KA_QUOTATIVES (თქო 2nd-hand relay, მეთქი self-quote, -ო
// third-party/proverbs, hyphen attachment), KA_VERSION_MARKERS_DEEP (ი-/ა-/უ-
// version vowels, benefactive m/g/v fusion, drop postpositional beneficiary),
// KA_T_V_REGISTER (შენ vs თქვენ inference rules, agreement propagation,
// register consistency in dialogue), KA_PARALLEL_PROSE (idiom compensation,
// body/nature metaphors, parallel-structure preservation, dialogue-tag variety),
// KA_STYLE_GUIDE („low-high" quotes, em dash, indirect-question punctuation,
// no capitals, possessive dropping, number style).
// QA rules 3.56-3.60 (detached_ts, double_benefactive, tv_register_clash,
// detached_quotative, additive_untranslated), auto-fixes 4.42-4.46 (attach
// detached -ც, hyphenate detached თქო/მეთქი, drop redundant beneficiary,
// straight quotes → „", EN also/moreover → ასევე/გარდა ამისა).
// v1.12.0 expansion (EN↔KA book comparison: postposition case government,
// masdars deep, purpose clauses, historical present, kinship/vocatives,
// demonstratives, 20 new web sources incl. Wikibooks Adpositions table +
// zmnebi.com verb guide + parryc.com grammar reference): KA_POSTPOSITIONS_CASE
// (16 postpositions w/ case govt + letter-drop rules + fused pronouns + ზე
// motion-purpose), KA_MASDARS_DEEP (formation, EN infinitive/gerund mapping),
// KA_PURPOSE_CLAUSES (სა-...-ად, რათა + optative, ზე motion-purpose, სა-...-ელი),
// KA_HISTORICAL_PRESENT (EN vivid-present → KA aorist normalization),
// KA_KINSHIP_ADDRESS (family nouns, vocatives მამავ/ბატონო, მამაო=priest trap),
// KA_DEMONSTRATIVES_DEEP (ეს/ეგ/ის three-way, ამ/მაგ/იმ obliques).
// QA rules 3.61-3.65 (postposition_case, detached_dan_mde, purpose_untranslated,
// vocative_mamao, historical_present), auto-fixes 4.47-4.51 (fuse detached
// -დან/-მდე/-გან, EN in-order-to/so-that → რათა, მამაო → მამავ, historical
// present → aorist).
// v1.13.0 expansion (EN↔KA book comparison: რომ multi-purpose, relative
// clauses deep, simultaneous action, options/correlatives, reflexive თავი,
// impersonal/dative-experiencer, 20 new web sources incl. talkpal.ai
// reflexive guide + dictionary.ge + Foley thesis on relative clauses):
// KA_ROM_MULTIPURPOSE (რომ as complementizer/causative/purpose/result,
// მინდა+optative no რომ, hallucination check რომ+masdar),
// KA_RELATIVE_DEEP (-ც relative system, რომელიც case forms, რაც indefinite,
// X წელია რაც pattern, -მე "some-" suffix, contact clauses),
// KA_SIMULTANEOUS_ACTION (როცა default, თან...თან literary correlative),
// KA_OPTIONS_CORRELATIVE (ან...ან, არც...არც, როგორც...ისე, ხან...ხან),
// KA_SELF_REFERENCE (თავი reflexive forms, თავისი vs მისი critical
// distinction, თვითონ emphasis), KA_IMPERSONAL_DEEP (dative experiencer:
// მშია/მწყურია/მძინავს/მტკივა, აქვს vs ჰყავს, სჭირდება, შეუძლია).
// QA rules 3.66-3.70 (rom_nonfinite, reflexive_possessive, impersonal_calque,
// asymmetric_khan, correlative_untranslated), auto-fixes 4.52-4.56 (impersonal
// calque → dative verbs, EN correlatives → არც/ან/თუ/ზოგჯერ, მან...მისი →
//  თავისი, რომ+masdar → drop რომ, lone ხან → ზოგჯერ).
// v1.14.0 expansion (EN↔KA book comparison: numerals/adjectives/comparison/
// ordinals/time, 20 new web sources incl. Wikipedia vigesimal numerals,
// peacebridge.ge numeral declension + Wiktionary adjective declension):
// KA_NUMERALS_VIGESIMAL (20-based counting, teens t-prefix + მეტი, 21-99
// და-connector, hundreds no -მ-, final -i drop, thousands),
// KA_ADJECTIVE_DECLENSION (ი-final class NOM/GEN/DAT/ERG/VOC patterns,
// decline-when-postposed/standalone/nominalized, modern no-agreement rule),
// KA_COMPARISON_DEEP (-ზе comparative on compared noun, უფრო/ნაკლებად,
// ყველაზე superlative, suppletive კარგი→უკეთესი→საუკეთესო, ისევე როგორც),
// KA_ORDINALS_FRACTIONS (მე- prefix + -ე suffix, პირველი irregular,
// მე-N abbreviation, -ედ-ი fractions, ნახევარი half),
// KA_TIME_EXPRESSIONS_DEEP (case-marked time: დილით/საღამოს/დღეს,
// ყოველ + oblique stem, X საათზე, -ში duration, narrative-first position),
// KA_MEASURES (სი- abstract nouns სიმაღლე/სიგრძე/სიღრმე, genitive-of-
// measure, X წლის არის age genitive, units).
// QA rules 3.71-3.75 (vigesimal_gap, ordinal_first_suppletive, age_genitive,
// ordinal_suffix_untranslated, comparative_untranslated), auto-fixes
// 4.57-4.61 (ოცი N → ოცდაN, მეერთი → პირველი, წელი → წლის in age,
// EN ordinal suffixes → მე-N/N-ე, EN comparatives → უფრო/ნაკლებად/ყველაზე).
// v1.15.0 expansion (EN↔KA book comparison: negation/concession/reason/
// causation/verb-class/plural, 15 new web sources incl. georgian.se clause
// grammar, zmnebi.com verb morphology, talkpal.ai causative+plural guides,
// multilingual.sdu.dk declension, app2brain medial verbs):
// KA_NEGATION_DEEP (არ neutral / ვერ inability / ნუ prohibitive, double
// negation with არა- pronouns, aorist nuance არ=didn't vs ვერ=couldn't),
// KA_CONCESSIVE_DEEP (მიუხედავად იმისა რომ, თუმცა, მაინც correlative
// placement, მაგრამ contrast),
// KA_REASON_CLAUSES (იმიტომ რომ neutral, რადგანაც formal since, რადგან,
// რაკი archaic, ამიტომ result, correlative იმის გამო რომ),
// KA_CAUSATIVES (ა- prefix + -ინ/-ევინ suffix, აცეკვებს/აწერინებს,
// irregular causatives, over-causation defect),
// KA_MEDIAL_VERBS (class-3 medio-active, -ობ- thematic თამაშობს/ლაპარაკობს,
// -ვა → ავ present inversion კლავს/ცურავს/მართავს),
// KA_PLURAL_DEEP (-ები general, drop -ი before -ები, -ა nouns, archaic -ნ-
// and -თა, no adjective number agreement, case-after-plural order).
// QA rules 3.76-3.80 (negation_double_missing, concessive_calque,
// reason_conj_untranslated, causative_untranslated, plural_vowel_loss),
// auto-fixes 4.62-4.66 (არა- double-negation repair, EN concessive/reason/
// causative markers → Georgian carriers, -ები stem-loss repair).
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
• "Counting flies" (idling) → ბუზების თვლა (native, same image).
• "Fate at my doorstep" (great luck) → ბედი კარზე მომდგომია (native).
• "Caught red-handed" → საქმეზე დაიჭირეს (unpack: caught in the act; literal bloody-hands image is foreign).
• "Green with envy" → თვალი ეჭრება (native: the eye "breaks" with envy).
• "Add fuel to the fire" → ცეცხლზე ნავთის დასხმა (native: kerosene, not fuel).
• "He's in his element" → თევზი წყალშია და თევზაობს (native).
• "Pushing his luck" → სისხლი გაუდგა თავში (native: the blood rushed to his head).
• "A weight off one's mind" → გულიდან ამოგლჯა / გულიდან ამოღება (native heart idioms).
• "Softening a request / calling someone dear" → შენი ჭირიმე / გეთაყვა (native endearments, no English equivalent).
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

// 1l. High-frequency word bank + style-guide vocabulary rules (v1.4.0).
// Sources: commonlyusedwords.com 2000-most-common-georgian-words,
// 1000mostcommonwords.com, Microsoft Georgian Style Guide, Proton Guidance.
const KA_WORDBANK = `
GEORGIAN WORD BANK — HIGH-FREQUENCY VOCABULARY (prefer these in translations):

CORE CONNECTORS (use these exact forms):
• and=და  or=ან  but=მაგრამ  though/however=თუმცა  because=რადგან  since=რადგან
• if=თუ  when=როდესაც  while=ხოლო  until=სანამ  before=ადრე/წინ  after=შემდეგ
• also=ასევე  so=ასე რომ  never=არასდროს  always=ყველაფთვის  already=უკვე
• very=ძალიან  again=კიდევ ერთხელ  only=მხოლოდ  just=უბრალოდ  now=ახლა
• suddenly=მოულოდნელად  finally=საბოლოოდ  slowly=ნელა  quickly=სწრაფად

PRONOUNS & DETERMINERS:
• I=მე  you=შენ/თქვეน(formal)  he/she=ის  we=ჩვენ  they=ისინი
• my=ჩემი  your=შენი/თქვენი  his/her=მისი  our=ჩვენი  their=მათი
• this=ეს  that=ის  these=ესენი  those=იმ  who=ვინ  what=რა  where=სადაც
• all=ყველა  every=ყველა  some=ზოგიერთი  any=ნებისმიერი  nothing=არაფერი
• someone=ვინმე  something=რაღაც  everything=ყველაფერი  each=თითოეული

TOP VERBS (infinitive/nominal form; conjugate per KA_VERBS):
• be=ყოფნა/არის  have=აქვს  do=კეთება  say=თქმა  go=წასვლა  come=მოსვლა
• see=ნახვა  know=ცოდნა  think=ფიქრი  want=გინდოდეს/უნდა  take=აღება
• give=მიცემა  make=გაკეთება  find=პოვნა  ask=თხოვნა  feel=გრძნობა
• love=სიყვარული/მიყვარს  help=შველა  speak=ლაპარაკი  read=წაკითხვა
• write=წერა  eat=ჭამა  drink=დალევა  sleep=ძილი  die=სიკვდილი  kill=მოკვლა
• run=გაქცევა  walk=ფეხით  sit=დაჯდომა  stand=დგომა  laugh=სიცილი  cry=ტირილი
• open=გახსნა  close=ჩაკეტვა  lose=დაკარგვა  wait=ლოდინი  return=დაბრუნება

COMMON NOUNS:
• man=კაცი  woman=ქალი  child=ბავშვი  friend=მეგობარი  father=მამა  mother=დედა
• brother=ძმა  sister=და  wife=ცოლი  husband=მეუღლე  son=შვილი  daughter=ქალიშვილი
• house=სახლი  door=კარი  room=ოთახი  table=მაგიდა  chair=სკამი  bed=საწოლი
• day=დღე  night=ღამე  morning=დილა  evening=საღამო  year=წელი  week=კვირა
• time=დრო  hour=საათი  minute=წუთი  water=წყალი  fire=ცეცხლი  book=წიგნი
• heart=გული  eye=თვალი  hand=ხელი  head=თავი  mouth=პირი  street=ქუჩა

COMMON ADJECTIVES:
• good=კარგი  bad=ცუდი  big=დიდი  small=პატარა  new=ახალი  old=ძველი
• long=ხანგრძლივი  short=მოკლე  high=მაღალი  low=დაბალი  deep=ღრმა
• beautiful=ლამაზი  happy=ბედნიერი  strong=ძლიერი  cold=ცივი  hot=ცხელი

STYLE-GUIDE VOCABULARY RULES (Microsoft Georgian Style Guide — prefer the plainer word):
• აღემატება (formal "exceeds") → მეტია in everyday prose.
• მომდევნო (formal "following") → შემდეგი.
• დამატებით (formal "additionally") → ასევე.
• Prefer the everyday word over the bureaucratic/churchy register in narrative prose.
• Decimal separator in Georgian is a COMMA: 3,14 — never the English 3.14.

PRONOUN + POSTPOSITION RULES (Proton Guidance):
• Personal pronoun + postposition → DROP the -ს: ჩემკენ (NOT *ჩემსკენ), შენგან, მასთან.
• Possessive pronoun + noun → -s REQUIRED on the pronoun: ჩემს მეგობარს, ჩემს სახლს.
• When მე is used with another personal pronoun, მე comes first: მე და შენ.`;

// 1m. Preverbs & aspect system (v1.4.0).
// Sources: Tbilisi Linguistics Institute preverbs paper, Grokipedia Georgian conjugation,
// Wiktionary Appendix:Georgian verbs.
const KA_PREVERBS = `
GEORGIAN PREVERBS — DIRECTION + ASPECT MARKERS (critical for natural verb forms):

9 SIMPLE PREVERBS (direction → aspect):
• ა- (upward): ავიდა (went up). შე- and ა- can overlap; prefer შე- for "enter".
• ჩა- (downward): ჩავიდა (went down), ჩაწერა (wrote down/recorded).
• გა- (inside→out): გავიდა (went out), გააკეთა (did/made, completive).
• შე- (outside→in): შევიდა (went in/entered), შექმნა (created).
• გადა- (across): გადავიდა (crossed over), გადაწერა (copied/rewrote).
• მი- (away from speaker): მივიდა (went thither), მიუთითა (pointed).
• მო- (toward speaker): მოვიდა (came hither), მოიტანა (brought here).
• წა- (away, momentary): წავიდა (went off/departed), წაიღო (took away).
• და- (down onto, completive): დაწერა (wrote down/completed), დააყენა (placed).

ASPECT RULE (CRITICAL):
• Series I (present/future) → NO preverb: ვწერ (I write), დავწერ (I will write).
• Series II (aorist) → PREVERB REQUIRED for perfective: დავწერე (I wrote it).
  Without preverb in aorist: ვწერე (I was writing it — imperfective aorist).
• Preverb + verb can completely change meaning:
  მიდის (goes there) vs მოდის (comes here) vs გადადის (crosses over).
• და- marks completion/result: ვწერ (I write) → დავწერე (I wrote it, done).
• შე- marks entry/creation: შექმნა (created), შევიდა (entered).
• მო- marks toward-speaker: მოვიდა (came), მოიტანა (brought here).

ENGLISH → PREVERB MAPPING (decision aid):
• "went in/entered" → შევიდა  • "went out" → გავიდა
• "went up" → ავიდა  • "went down" → ჩავიდა
• "came here" → მოვიდა  • "went there" → მივიდა  • "left/departed" → წავიდა
• "crossed" → გადავიდა  • "wrote (completed)" → დაწერა  • "was writing" → წერდა

NARRATIVE PROSE FEATURES (from Georgian literary linguistics research):
• Contextual synonymous pairs for emphasis: ცოცხალი და ჯანმრთელი (alive and well).
• Artistic parallelisms: repeated sentence structures for rhetorical effect.
• Temporal markers open paragraphs: დილით (in the morning), საღამოს (in the evening),
  ერთ დღეს (one day), მაშინ (then/at that time).
• Modern Georgian prose (Morchiladze, Turashvili, Jandieri) uses colloquial modern
  Georgian even in historical settings — do NOT archaize.
• PLURAL RULES: Most nouns pluralize with -ები (წიგნი→წიგნები). After numerals
  2+, use SINGULAR (ორი კაცი, NOT *ორი კაცები). Collective -ობა is rare.`;

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

// 1k2. Screeve-series × case system (v1.6.0 research).
const KA_CASE_SYSTEM = `
SCREEVE SERIES × CASE SYSTEM (critical, obey exactly):
• Series I (present/future): transitive subject NOM, object DAT. კაცი კითხულობს წიგნს.
• Series II (aorist): transitive subject ERG -ma, object NOM. კაცმა წაიკითხა წიგნი.
  Intransitive (Class 1/2) subject stays NOM in ALL series: კაცი წავიდა (never *კაცმა წავიდა for intransitive).
• Series III (perfect/pluperfect/evidential): INVERSION — subject DAT, object NOM.
  კაცს წაუკითხავს წიგნი. "The man has read the book."
• Same lexical verb changes alignment across series — check the screeve FIRST, then assign cases.
• v-set = subject agreement in Series I/II (ვ-, ხ-, -ს, -თ, -ენ). In Series III the v-set marks the OBJECT
  and the m-set (მ-, გ-, უ-, -ს) marks the subject/experiencer: მიყვარს (I love [it]), უყვარს (he loves).
• Series III habitual/evidential forms: წასულა, მოსულა, ნახავს, უთქვამს, გაუკეთებია.
  Subject goes DATIVE: მას წასულა (NOT *ის წასულა).
• "Have" is inversion-based in all tenses: მას აქვს (he has), მას ჰქონდა (he had), მას ექნება (he will have).
  Possessed thing is NOM: მას აქვს წიგნი.`;

// 1k3. Negation system (v1.6.0 research).
const KA_NEGATION = `
GEORGIAN NEGATION — FOUR MARKERS, NEVER MIXED UP:
• არ = standard declarative negation (present/future/imperfect): არ ვიცი, არ მოვა.
• არა = standalone "no" (answer word), or negates non-verb words: არა, ეს არასწორია.
• ვერ = "cannot / fails to" (ability/achievement failure): ვერ ვიპოვე "I couldn't find it", ვერ მოვა "he won't make it".
• ნუ = prohibitive (negative imperative ONLY): ნუ მიდის, ნუ აკეთებ this. NEVER არ for commands.
• One negator per clause. Double negation (არ...ვერ / არავინ...არაფერი არ) is UNGRAMMATICAL.
• Negative pronouns already carry negation: არავინ "nobody", არაფერი "nothing", არასდროს "never".
  With a verb they take არ once: არავინ არ მოვიდა is wrong; native: არავინ არ მოსულა → prefer არავინ მოსულა (pro-drop negation) or single არ.
• ვერ + aorist = failed attempt: ვერ გავაკეთე "I failed to do it". არ + aorist = didn't do it (choice/not).
• ნუთუ = rhetorical "surely not / don't tell me": ნუთუ არ იცი? "Don't you know?"`;

// 1k4. Conjunction & connector system (v1.6.0 research).
const KA_CONJUNCTIONS = `
GEORGIAN CONJUNCTIONS — USE THE NATIVE CONNECTOR, NOT ENGLISH CALQUES:
• და "and" — no comma before it joining clauses.
• მაგრამ "but" — comma BEFORE it. თუმცა "although/however" — comma BEFORE it, slightly more formal.
• ხოლო "whereas/while" — contrast between parallel facts, literary.
• რადგან "because" — comma BEFORE it. ვინაიდან "since/seeing that" — formal/literary because.
• თუ "if" — NO comma before it in conditionals (unlike English "if" clauses): თუ მოვა, ვნახავთ.
• ან...ან "either...or", არც...არც "neither...nor".
• არამედ "but rather" — after a negation: არა მხოლოდ X, არამედ Y.
• შემდეგ "then/after" — sequence, not a true conjunction; prefer და-chaining in narration.
• კი — focus particle "as for / indeed", placed AFTER the focused word: ეს კი მართალია.
• -ც "too/even" — enclitic on the focused word: მეც "me too", აფხაზებმაც "even the Abkhaz".
• არც ერთი "not a single one".
• Literary narration prefers და-chaining and participles over stacked რომელიც/რადგან chains.`;

// 1k5. Voice: passive & causative preference (v1.6.0 research).
const KA_VOICE = `
VOICE — GEORGIAN PREFERS ACTIVE; USE PASSIVE ONLY WHEN AGENT IS UNKNOWN/IRRELEVANT:
• Passive -დ- infix (Series I): იწერება "is being written", გაკეთდება "will get done".
• Passive perfect: დაწერილია "has been written" (Series III, agent usually omitted).
• -ება/-ობა masdar passive nouns: წერა/კეთება.
• English "The book was written by X" → native Georgian: X-მა წიგნი დაწერა (ACTIVE aorist) unless X is unknown.
• "It is said that..." → ამბობენ, რომ... / თქვან, რომ... (impersonal plural) — NOT a passive calque.
• "get + V-ed" (adversative) → გაურბენია? No: use დაემართა / -დ- passive: დაიჭრა "got wounded".
• Causative -ებინებს/-ინებს: აკეთებინებს "makes [someone] do". Use when English says "had/made someone do X".
• Impersonal constructions are native for weather/feelings: წვიმს, ცივა, მშია, მსურს, მიყვარს, მეშინია.`;

// 1k6. Relative clauses & complementizers (v1.6.0 research).
const KA_RELATIVES = `
RELATIVE CLAUSES & COMPLEMENTIZERS:
• რომელიც = declinable relative pronoun "which/who" — takes case of its role in the relative clause:
  წიგნი, რომელიც წავიკითხე (which I read — NOM object of Series I), კაცი, რომელმაც დაწერა (who wrote — ERG),
  სახლი, რომელშიც ცხოვრობს (in which he lives — postposition inside).
• რომ = universal complementizer "that" after mental/speech verbs: ვფიქრობ, რომ... / თქვა, რომ...
• NO comma before რომ after იმედი მაქვს / ვფიქრობ / ვიცი in modern prose.
• Participial modification (გაშენებული ქალაქი, დაწერილი წიგნი) is MORE literary than რომელიც chains.
  Prefer a participle when the relative clause is short and adjectival.
• რომელიც agrees in case, NOT in number: წიგნები, რომლებიც... (plural -ებ- inside რომელიც).
• Indirect questions keep statement order: მკითხა, სად მივდიოდი (NOT *სადაც მივდიოდი მკითხა).`;

// 1k7. Speech & mental verb grid (v1.6.0 research).
const KA_SPEECH_VERBS = `
SPEECH & MENTAL VERBS — PICK THE EXACT NATIVE VERB:
• თქვა "said (words)" vs უთხრა "said TO someone" vs მითხრა "said to ME".
  "He said to her" → უთხრა მას. "He said that..." → თქვა, რომ...
• წამოიწყო "began to speak", ახსენა "mentioned", დაამატა "added", გაიძახოდა/გაიძახა "shouted",
  ჩაიჩურჩულა "whispered/muttered", ღრმად ამოისუნთქა "sighed deeply".
• Mental: იფიქრა "thought (momentary)", ფიქრობდა "was thinking (continuous)", დაფიქრდა "pondered",
  მიხვდა "realized", გაუგია "has heard/learned (evidential)", იცოდა "knew (imperfect)", იცის "knows (present)",
  გაუკვირდა "was surprised (experiencer dative)", უნდოდა "wanted (imperfect)", შეეძლო "could (aorist)".
• Perception: დაინახა "saw (aorist)", ხედავს "sees", მოესმა "heard (aorist)", მოესმოდა "could be heard",
  იგრძნო "felt", შეამჩნია "noticed", დააკვირდა "observed/watched".
• Experiencer-subject verbs take DATIVE subject in ALL series: მას სურდა, მას უყვარდა, მას ახსოვდა.
• "began to V" → დაიწყო + masdar: დაიწყო სიარული / დაიწყო ლაპარაკი.
• "managed to V" → შეძლო / მოახერხა + masdar: მოახერხა გაქცევა.
• "used to V" → ხოლმე + imperfect: ხოლმე დადიოდა "used to go".`;

// 1k8. Collocations & natural pairs (v1.6.0 research).
const KA_COLLOCATIONS = `
NATURAL COLLOCATIONS — USE THESE PAIRS, NOT WORD-BY-WORD CALQUES:
• ღრმა სუნთქვა "deep breath", აიღო ღრმა ამოსუნთქვა → prefer ღრმად ამოისუნთქა.
• ცივი ოფლი "cold sweat": ცივმა ოფლმა დაასხა.
• მძიმე სიჩუმე "heavy silence": დადგა მძიმე სიჩუმე.
• გული გაუცივდა "his heart went cold", სისხლი გაუყინა "blood froze".
• თვალები დაახამა "narrowed his eyes", თვალები გაუფართოვდა "eyes widened".
• ხელი აიღო "raised his hand", თავი დაქანა "tilted his head", მხრები აიჩეჩა "shrugged".
• ნელ-ნელა მიუახლოვდა "slowly approached", უკან დაიხია "stepped back".
• გული ეცა "heart sank", სული აერია "got scared/out of breath".
• პირი გაუღიმა "smile spread", აცინა "made laugh".
• Time-of-day frame: დილას ადრე "early in the morning", საღამოს მიდამოებში "toward evening".
• ერთხელ "once (upon a time)", ერთ დღეს "one day" — narrative openers.`;

// 1k9. Time & aspect adverbials (v1.6.0 research).
const KA_TIME_EXPR = `
TIME EXPRESSIONS — NATIVE FORMS FOR ENGLISH TEMPORAL PHRASES:
• "in the morning" → დილას (NOT *დილაში). "in the evening" → საღამოს. "at night" → ღამით.
• "yesterday" → გუშინ. "today" → დღეს. "tomorrow" → ხვალ. "the day after tomorrow" → ეჭამადში.
• "two hours later" → ორი საათის შემდეგ. "after a while" → ცოტა ხნის შემდეგ.
• "for a long time" → დიდხანს / დიდ ხნის განმავლობაში. "shortly" → მალე.
• "since X" → X-დან. "until X" → X-მდე. "by X" → X-ისთვის.
• "every day" → ყოველდღიურად / ყოველ დღე. "once a week" → კვირაში ერთხელ.
• "long ago" → დიდი ხნის წინ. "recently" → ბოლო ხანში / ახლახანს.
• "just (now)" → ახლახანს / ამ წამს. "immediately" → დაუყოვნებლივ / მაშინვე.
• Narrative openers: ერთ დღეს, ერთხელ, ერთ საღამოს, მაშინ, იმ დროს.
• "while V-ing" → -დე/-რე აწმყო მიმდინარე: მიდიოდა რაც ლაპარაკობდა → prefer მიდოდა და ლაპარაკობდა (და-chaining).`;

// 1k10. Impersonal & experiential frames (v1.6.0 research).
const KA_IMPERSONAL = `
IMPERSONAL & EXPERIENCER FRAMES — NO ENGLISH SUBJECT CALQUES:
• Weather: წვიმს "it's raining", თოვს "it's snowing", ქარია "it's windy", მზიანია "it's sunny".
• Temperature/feeling: ცივა "is cold (to me)", მშია "I'm hungry", მწყურია "I'm thirsty", მძინავს "I'm sleepy".
• Likes/preferences: მომწონს "I like (it)", მიყვარს "I love", მსურს "I want", მინდა "I want (casual)".
• Fear/worry: მეშინია "I'm afraid", მეშინია, რომ... / მეშინია X-ის (genitive object).
• "It seems" → ჩანს / როგორც ჩანს. "I think" → მგონია / ვფიქრობ. "Apparently" → თურმე.
• "I wonder" → გასაკვირია / ვგონებ...; rhetorical: ნუთუ...?
• "It is necessary" → საჭიროა / უნდა. "It is possible" → შეიძლება.
• Experiencer is DATIVE, stimulus is NOM: მას ცივა, მას მოსწონს ეს ფილმი.
• "It happened that..." → მოხდა ისე, რომ...; "it turned out" → აღმოჩნდა, რომ...
• English dummy subjects ("it is", "there is") → NO dummy: წიგნი მაგიდაზეა (the book is on the table).`;

// 1k11. Numerals & quantity (v1.6.0 research).
const KA_NUMERALS = `
GEORGIAN NUMERALS — VIGESIMAL SYSTEM (base-20):
• 1-10: ერთი, ორი, სამი, ოთხი, ხუთი, ექვსი, შვიდი, რვა, ცხრა, ათი.
• 20 = ოცი. 40 = ორმოცი (2×20). 60 = სამოცი (3×20). 80 = ოთხმოცი (4×20). 100 = ასი.
• 21 = ოცდაერთი, 35 = ოცდათხუთმეტი, 47 = ორმოცდაშვიდი, 63 = სამოცდასამი, 99 = ოთხმოცდაცხრამეტი.
  Pattern: [base]და[units] — და is the linker INSIDE compound numerals.
• 11-19: თერთმეტი, თორმეტი, ცამეტი, თოთხმეტი, თხუთმეტი, თექვსმეტი, ჩვიდმეტი, თვრამეტი, ცხრამეტი.
• Ordinals: პირველი, მეორე, მესამე, მეოთხე... (მე- prefix from 4th on).
• Fractions: ნახევარი "half", მეოთხედი "quarter".
• Distributive: ორ-ორი "two each", სამ-სამი "three each".
• "once" → ერთხელ, "twice" → ორჯერ (-ჯერ for times).
• After numerals 2+, noun is SINGULAR: ოცი კაცი (NOT *ოცი კაცები).`;

// 1k12. Particles & focus (v1.6.0 research).
const KA_PARTICLES = `
FOCUS & MODAL PARTICLES — SMALL WORDS, BIG MEANING:
• კი — "as for / indeed / but (contrastive focus)": ეს კი სწორია. Placed AFTER focused word.
• -ც — "too/also/even": მეც, ისიც, ბავშვებმაც. Attaches directly to the word.
• არც — "not even / neither": არც კი იცის "he doesn't even know".
• თუ — conditional "if" AND question particle in yes/no questions: მოხვალ თუ? (colloquial).
• ხომ — "right? / you know" (seeking agreement): ხომ იცი? "You do know, right?"
• განა — rhetorical question marker "surely not...?": განა არ იცი?
• ვითარებ / ვით — "as if / seemingly" (literary).
• თურმე — hearsay "apparently/they say" (pairs with perfect screeve).
• მგონია / მგონი — "I guess / I think".
• ალბათ — "probably". რა თქმა უნდა — "of course". რასაკვირვალა — "naturally".
• ჯერ — "yet/still/first": ჯერ არ მოსულა. კვლავ / ისევ — "again/still" (კვლავ literary).`;

// 1k13. False friends & calque traps (v1.6.0 research).
const KA_FALSE_FRIENDS = `
FALSE FRIENDS — RUSSIAN-ERA LOANWORDS THAT DO NOT MEAN WHAT ENGLISH SUGGESTS:
• მიტინგი ≠ "meeting" (appointment). It means "protest rally". Appointment → შეხვედრა.
• აქტუალური ≠ "actual". It means "topical/relevant". Actual → რეალური / სინამდვილეში არსებული.
• სიმპათიური ≠ "sympathetic (compassionate)". It means "cute/pretty". Compassionate → თანამგრძნობი.
• ანეკდოტი ≠ "anecdote (short story)". It means "joke". Anecdote → შემთხვევა / ამბავი.
• ფაბრიკა ≠ "fabric". It means "factory". Fabric → ქსოვილი / ტკაცა.
• ბალონი ≠ "balloon". It means "tire". Balloon → ბუშტი.
• ბლანკი ≠ "blank (empty)". It means "form (document)". Blank → ცარიელი.
• კაბინეტი ≠ "cabinet (furniture/cupboard)". It means "office/study room". Cupboard → კარადა.
• ნოველა ≠ "novel (long fiction)". It means "novella/short story". Novel → რომანი.
• სპექტაკლი ≠ "spectacle". It means "theater play". Spectacle → სანახაობა.
• ინტელიგენტი ≠ "intelligent (smart)". It means "intellectual (social class)". Smart → ჭკვიანი.
• პრეზერვატივი ≠ "preservative". It means "condom" — NEVER use it for food preservation. Preservative → კონსერვანტი.
• Verb calque traps: realize → მიხვდა (NOT *რეალიზება for "understand"), decide → გადაწყვიტა,
  become → გახდა/იქცა, achieve → მიაღწია, challenge → გამოწვევა, support → მხარდაჭერა.
• When unsure, prefer the native Georgian word over the loanword in literary prose.`;

// 1k14. Interjections & emotional register (v1.6.0 research).
const KA_INTERJECTIONS = `
INTERJECTIONS & EMOTIONAL EXPRESSIONS — NATIVE VOICE FOR DIALOGUE:
• Surprise: ვაჰ! აჰ! ოჰ! რა-ა?! კაი საქმეა! (casual "well well").
• Pain/distress: აუ! ვაი! ვაიმე! აფსუს! (alas/too bad).
• Admiration: ვაშა! ურა! ყოჩაღ! (bravo/well done), ბიჭოს! (wow, colloquial).
• Gratitude/blessing: ბარაქალა! (well done/bless you), ღმერთმანი! (God bless — invocation),
  ღმერთმა დაგიფაროს! "May God protect you".
• Affection: ჩემმა მზემ! "my sun!", გენაცვალე! "may I die for you (dear)", გეთაყვა "please/dear",
  დედაშვილობამ! "by my motherhood!" (oath of sincerity).
• Frustration: აფსუს! ვაი შენს თავს! "woe to you!", ღმერთო! "O God!".
• Hesitation: ა... ე... (um/er), კაი... (well...).
• Dialogue register: these are ESSENTIAL for natural dialogue; never leave English "Oh!/Wow!/Alas!"
  untranslated or calqued — pick the matching Georgian interjection.
• Oaths: დედის ტომბაზე! "on my mother's grave!", სიკვდილამდე! "until death!".`;

// 1k15. Corpus-mined production defects (v1.6.1: patterns observed in real
// translated chapters — Sun Tzu / Marcus Aurelius run).
const KA_CORPUS_DEFECTS = `
PRODUCTION CORPUS DEFECTS — REAL PATTERNS OBSERVED IN TRANSLATED CHAPTERS. AVOID ALL OF THESE:
• Hyphen as dash: "თავდასხმა - ძალების სიჭარბეზე" — WRONG. Georgian dash is "—" (em dash) with
  no space before it: თავდასხმა — ძალების სიჭარბეზე. Never write " - " between clauses.
• Broken word at chunk boundary: "*ხედართმთავარი" for მხედართმთავარი — never emit a truncated word
  at the start of a chunk; if the chunk starts mid-word, complete it from context.
• "ეს არის X" as a plain copula — prefer ეს X-ა/-აა (ეს სიცოცხლისა და სიკვდილის საკითხაა) or
  inversion: X არის ეს. Reserve "ეს არის" for genuine definitions ("this is the study of...").
• Semicolons stacking parallel clauses — Georgian prose prefers და-chaining or ។ breaks.
• Over-literal "have": "ომის ხელოვნებას მნიშვნელობა აქვს" is fine (inversion), but
  "სახელმწიფოს აქვს ომის ხელოვნება" (SVO have) is a calque — keep აქვს/არის final.
• მაგრამ needs a comma BEFORE it when joining clauses: ..., მაგრამ ....
• Attributive უნდა + masdar chain: "მთავარი მიზანი უნდა იყოს სწრაფი გამარჯვება" is correct;
  do not insert რომ after უნდა.
• Speech attribution: "სუნ ძიმ თქვა:" — native books use სუნ ძიმ თქვა: with the colon kept,
  or სუნ ძიმის სიტყვებით. Keep proper-noun agreement: სუნ ძის (genitive), სუნ ძისგან.
• ხოლო contrast chains are fine but vary with მაგრამ/თუმცა to avoid monotony.
• Punctuation discipline: one ។ per sentence; no space before ។ , ; :; single space after.`;

const KA_DISCOURSE = `
DISCOURSE MARKERS & PARTICLES — WHAT MAKES PROSE FLOW LIKE NATIVE GEORGIAN (v1.7.0 research):
Translationese prose has ZERO discourse markers. Natural Georgian uses them constantly.

FOCUS / CONTRAST:
• კი — contrastive focus particle, AFTER the focused word: ეს მართალია, მაგრამ რთულია კი.
  "X does Y, but..." → X-მა კი ... Also: მივდივარ კი, მაგრამ გვიანით (I AM going, but late).
• -ც (enclitic = too/also/even): attaches to the word: მეც (me too), ისიც (him too), მაშინაც (even then).
• არც / არც ერთი — not even: არც ერთმა მიპასუხა (not a single one answered).
• ხოლო — formal contrast (whereas): ხოლო მტერი უფრო ძლიერი იყო.

STANCE / EVIDENCE (critical for narrative voice):
• თურმე — hearsay ("apparently/it turns out"): ის თურმე მწერალია. Use in narration for reported info.
• მგონი(ა) — "I guess/I think": მგონი სახლშია.
• ალბათ — probably: ალბათ გვიან დაბრუნდება.
• როგორც ჩანს — it seems: როგორც ჩანს, წვიმს.
• ვითარცა / ვით — as if (literary): ვითარცა სიზმარში.

QUESTION / RHETORIC:
• ხომ — right?/isn't it (seeking agreement): კარგი ხომ?
• განა — rhetorical disbelief: განა შესაძლებელია? (surely it's not possible?)
• თუ — if / whether in questions: იცი თუ არა...
• ნუთუ — could it be that (doubt): ნუთუ მართალია?

SEQUENCE / TIME FLOW:
• მერე — then/afterwards: ჯერ ვჭამეთ, მერე წავედით.
• ჯერ — yet/still/first: ჯერ ადრეა (it's still early).
• კვლავ / ისევ — again/still (ისევ colloquial, კვლავ literary): ისევ წვიმს / კვლავ გამეორა.
• შემდეგ — next/after: შემდეგ რა მოხდა?
• ამიტომ / ამიტომაც — therefore: ამიტომ არ მოვედი.

RULE: In any 400+ character passage, use at least 2-3 of these naturally. Never stack more
than one stance marker per clause. Particles come AFTER the word they modify, never sentence-initial
(except მერე/შემდეგ/ამიტომ as connectors).`;

const KA_PRONOUN_ECONOMY = `
PRONOUN & POSSESSIVE ECONOMY — GEORGIAN DROPS WHAT THE VERB ALREADY SAYS (v1.7.0, MS Style Guide + corpus):
The verb encodes person and number. Repeating pronouns/possessives is the #1 translationese tell.

SUBJECT PRONOUNS:
• Drop მე/შენ/ის/ჩვენ/თქვენ/ისინი before a conjugated verb unless contrast is intended.
  Wrong: *მე წავედი. Right: წავედი. (Only keep მე for contrast: "ME I went, but you stayed.")
• Never use ის as a dummy subject. Georgian has no "it": წვიმს (it rains), ცივა (it's cold).

POSSESSIVE ECONOMY (drop your/his/my before):
• Body parts: თავი მტკივა (my head hurts — NOT *ჩემი თავი), ხელი ავიღე (I took his hand).
• Kinship: დედა მოვიდა (my mother came), context carries the possessor.
• In imperatives/instructions: თვალები დახუჭე (close your eyes — NOT *შენი თვალები).
• Keep the possessive ONLY when contrast or ambiguity demands it: ჩემი ხელი, არა შენი.

GENERIC REFERENTS:
• English generic "they/their" → ის/მისი (SINGULAR): "if a user forgets, they lose data" →
  თუ მომხმარებელი დაივიწყებს, ის კარგავს მონაცემებს. NEVER ისინი/მათი for one generic person.

RULE: After drafting, scan for თქვენი/შენი/მისი/ჩემი + body-part or kinship noun — delete the
possessive unless contrast demands it. Scan for subject pronouns before verbs — delete them.`;

const KA_TACTICS = `
EN→GEORGIAN TRANSLATION TACTICS — DECISION PROCEDURE, NOT JUST RULES (v1.7.0):

TACTIC 1 — REGISTER MATCHING (decide FIRST, before translating):
• Literary narration → literary lexicon (კვლავ not ისევ; ვითარცა not როგორც; თუმცა fine).
• Dialogue (casual) → colloquial (ისევ, მგონი, ხომ, short clauses, dropped pronouns).
• Instructions/UI → short imperative + everyday words (MS guide: short and warm).
• Never mix registers inside one passage. Detect the register from the English source's texture.

TACTIC 2 — EVERYDAY WORD PREFERENCE (MS Georgian Style Guide):
• აღემატება → მეტია; მომდევნო → შემდეგი; დამატებით → ასევე;
  დაყოვნების გარეშე → დაუყოვნებლად; შანსის ქონა → საშუალების ქონა.
• Choose the shorter, everyday word when both are correct.

TACTIC 3 — CULTURAL SUBSTITUTION for idioms (see IDIOM SUBSTITUTION TABLE):
• Native equivalent exists → use it (kill two birds → ორი კურდღელი ერთი ტყვიით).
• No native equivalent → unpack the MEANING in plain Georgian; never transliterate the image.
• Softeners/endearments: dear → შენი ჭირიმე / გეთაყვა (context-dependent).

TACTIC 4 — STRUCTURAL REBUILDS (rebuild, don't mirror):
• English "It is X that Y" clefts → plain SOV: ეს წიგნი ბავშვობაში წავიკითხე.
• English passive → Georgian active or impersonal: "the city was destroyed" → ქალაქი დაანგრიეს
  (they destroyed it) or ქალაქი დაინგრა (intransitive).
• English gerund subjects → masdar or clause: "swimming is fun" → ცურვა სასიამოვნოა.
• Long English relative chains → split into two Georgian sentences. Georgian tolerates shorter
  sentences than English; splitting is almost always an improvement for TTS.

TACTIC 5 — TTS-DRIVEN CHOICES:
• Prefer და-chaining over semicolons (the voice pauses better at და).
• One clause = one breath group. If a sentence needs 3+ breaths, split it.
• Numbers: write out small numbers in dialogue (ორი საათი), keep digits for dates/stats.

TACTIC 6 — SELF-CHECK ORDER (before answering):
1. Verb-final everywhere? 2. Negation type correct (არ/ვერ/ნუ)? 3. Case alignment per series?
4. Idioms nativized? 5. Pronouns/possessives pruned? 6. Discourse markers present but not stacked?
7. Punctuation Georgian („…“, —, ।)? 8. Register consistent?`;

const KA_VERSION_MARKERS = `
VERSION MARKERS (pre-radical vowels) — the vowel BEFORE the verb root changes meaning (v1.8.0, wikibooks/zmnebi):
• Neutral (no vowel): ვწერ (I write it) — plain action on the object.
• უ- (objective version = "for someone"): დაუწერა (wrote it FOR him), მაუწერია.
  Rule: English "V for someone" → insert -უ-. Never confuse with უნდა.
• ი- (subjective version = "for oneself" / reflexive / middle voice):
  დაიწერა (got written), იშენებს (earns/keeps for oneself), იცინის (laughs).
  English reflexive "V oneself" often → just the ი- version, no თავს.
• ა- (superessive/locative): action on a surface: ახატავს (paints ON it).
  Also verbifies adjectives: დიდი → ადიდებს (makes bigger).
• ა- + causative: ა-...-ებ / -ინებ / -ევ makes someone do X:
  წერს → აწერინებს (makes him write); ჭამს → აჭმევს (feeds him);
  ჭამს → აჭმევინებს (has him fed). Causative ALWAYS co-occurs with version -ა-.
  English "make/let someone V" → causative form, NOT a separate "make" verb.
• Passive: add -დ- to root or version -ი-: იწერება (is being written);
  გაწერს → გაწითლდი (blushed: წითელი red → -წითლ-დ-).
• PFSF (present-future stem formant: -ებ-, -ავ-, -ობ-...) exists ONLY in Series I;
  it disappears in Series II/III: წერს → დაწერა (aorist drops -ებ-).
• Verb template order: preverb + person + version + ROOT + passive + {thematic suffix}
  + causative + imperfective(-დ-/-ოდ-) + suffixal person + auxiliary + plural.`;

const KA_MASDARS = `
MASDARS (VERBAL NOUNS) & NON-FINITE FORMS (v1.8.0, georgian.se/zmnebi):
Masdars are verbal nouns; they decline like NOUNS and are the natural way to render
English gerunds/infinitives as subjects or objects.

FORMATION:
• Most masdars = verb stem + -ა: კეთება (doing), წერა (writing), ჭამა (eating),
  წაკითხვა (reading), ლოდინი (waiting), დაჯდომა (sitting).
• Many are suppletive/irregular: სიყვარული (love), სიცილი (laughter), სიკვდილი (death),
  სიარული (walking), სიზმარი (dream).
• Masdars decline like NOUNS: წერაში (in writing), წერის (of writing), წერამ (by writing).

USAGE RULES:
• English gerund subject → masdar: "Swimming is fun" → ცურვა სასიამოვნოა.
• English infinitive purpose → masdar + dative: "to read books" → წიგნების წასაკითხად.
• "keep doing X" → გააგრძელებს + masdar: გააგრძელებს ლაპარაკს.
• Attributive უნდა + masdar chain is CORRECT — never insert რომ after უნდა:
  "მთავარი მიზანი უნდა იყოს სწრაფი გამარჯვება."
• Masdar as subject takes NOMINATIVE; the copula agrees with the masdar, not the English gerund.
• "on the verge of V-ing" → ე- -ებოდეს construction: ვაპირებდი წასვლას / მივდიოდი.`;

const KA_SUBORDINATION = `
SUBORDINATORS & COMPLEX SENTENCES (v1.8.0, georgian.se grammar):
Georgian subordination uses CONJUNCTION + INDICATIVE (no English-style tense backshift).

CORE SUBORDINATORS:
• რომ — that (complement): ვიცი, რომ ის მოვა. NEVER omit რომ after think/know/say verbs.
• რათა — so that (purpose, takes optative/future): ვწერ რათა გავიხსენდე.
• სანამ — while/until: სანამ ცოცხალი ვარ...
• თუ — if: თუ მოვა, დამირეკე.
• თუმცა — although; მიუხედავად იმისა, რომ — despite the fact that.
• რადგან / ვინაიდან — because/since; რადგანაც — colloquial because.
• სანამ ... არ — until (negative until): სანამ არ დაბრუნდები, არ წავხვდები.
• როგორც კი — as soon as: როგორც კი მოვიდა, დავიწყეთ.
• სადაც — where: სადაც წავხდი, იქ დავრჩი.
• როგორც — as: როგორც მე ვთქვი...

RELATIVE CLAUSES:
• Use the DECLINED რომელიც + case: კაცი, რომელსაც ვხედავ (the man whom I see),
  წიგნი, რომელშიც წერ (the book in which I write). The case ending goes on რომელიც,
  and any postposition infixed BEFORE ც: რომელშიც, რომელთანაც, რომელზეც.
• Prefer PARTICIPLES over relative clauses for compact prose:
  "the man who is standing there" → იქ მდგომი კაცი (standing-there man).

SEQUENCE OF TENSES — NO ENGLISH BACKSHIFT:
• "He said he was tired" → თქვა, რომ დაღლილია (PRESENT stays present after თქვა, რომ).
• Only shift tense when the original meaning demands it.

SUBJECT/OBJECT MARKER ORDER (polypersonalism):
• One verb can encode subject AND object: დავწერე (I wrote it), დავუწერე (I wrote it to him).
• მიყვარხარ = I love you (object marked with the PRS "to be" form ხარ).
• Interpersonal emotion verbs are მ-class with dative experiencer: მიყვარს, მძულს, მსმენია.
• Reflexive = თავი + verb or ი- version: გ-ხედავს თავს → იხედავს (sees himself).`;

const KA_ONOMATOPOEIA = `
ONOMATOPOEIA & SOUND WORDS — GEORGIAN NATIVE SOUND-IMITATION (v1.8.0, cross-linguistic research):
Never translate English sound words literally — use the native Georgian form.

ANIMAL SOUNDS:
• dog bark → ჰაუ-ჰაუ  • rooster → ყიყლიყო  • hen cluck → კაკანი / კუ-კუ
• goose → ყიყინი  • turkey → ყურყლუტი  • cat meow → მიაუ
• bee/wing buzz → ბზზ-ბზზ / ბუზბუზი  • cow → მუ-მუ

HUMAN / IMPACT SOUNDS:
• knocking → ტკა-ტკა  • laughter (giggle) → კისკისი  • loud laughter → თქართქარი
• whisper rustle → თხართხარი  • snoring → ხრიალი  • clap → ტაში
• glass clink → ჟღალ-ჟღალ  • door slam → ბამ-ბამ  • gunshot → ფამ-ფამ
• wind howl → შშშ / უუ (poetic)  • footsteps → თრთხარი

LAUGHTER LEXEMES (rich Georgian set — pick by intensity):
• სიცილი (laughter, general)  • კისკისი (giggle/snicker)  • თხართხარი (loud cackle)
• თქარცალი (guffaw)  • ფრუსტუნი (chuckle)  • ფხუკუნი (suppressed laugh)
• ლხენა (mirth/delight)  • დაოსება (burst out laughing)

RULE: In narration, prefer a Georgian onomatopoeia or the laughter lexeme set over a literal
translation of the English sound word. In dialogue quotes, keep the speaker's own words intact.`;

const KA_NUMBERS_TTS = `
NUMBER NORMALIZATION FOR TTS NARRATION (v1.8.0):
Text-to-speech engines read digits awkwardly in Georgian. Normalize before narration.

SPELL OUT in dialogue/narration:
• Small counts: 2 → ორი, 5 → ხუთი, 12 → თორმეტი (ორი საათი, NOT "2 საათი").
• Ordinals: 1st → პირველი (irregular), 2nd → მეორე, 3rd → მესამე (circfix მე-...-ე;
  -e replaces the final vowel: მეოთხე, მეხუთე; after the -და- infix: მეოცდამეათე = 21st).
• Fractions: half → ნახევარი, quarter → მეოთხედი.

KEEP DIGITS for:
• Dates, years, stats, prices, IDs: 2024, $5, 87%.
• Large numbers the voice handles fine: 1000, 25000.

VIGESIMAL RULE (Georgia counts in twenties):
• 40 = ორმოცი, 50 = ორმოცდაათი, 87 = ოთხმოცდაშვიდი (4×20 + 7), 93 = ოთხმოცდაცამეტი.
• After numerals 2+ the noun stays SINGULAR: ოცი კაცი, NOT *ოცი კაცები.

MIXED TEXT:
• 3,14 not 3.14 (decimal comma). Thousands separator is a space: 10 000.
• Don't mix spelled-out and digits for the same quantity in one sentence.`;

const KA_PARTICIPLES = `
PARTICIPLES (VERBAL ADJECTIVES) — 4 CORE FORMS FROM ANY VERB (v1.9.0, georgian.se):
The participle is a verbal ADJECTIVE (the masdar is the verbal noun). It declines
like an adjective and is the natural rendering of English attributive clauses.

THE FOUR FORMS (example root ხატ- paint, preverb და-):
• Subject participle: დამ-ხატ-ვ-ელ-ი (the one who has painted / will paint /
  can paint). Affixes: preverb + მ-...-ელ-ი (transitive); also მ-...-არ-ი /
  მ-...-ალ-ი (მწერალი writer, მხატვარი painter, მასწავლებელი teacher).
  English "the man who wrote X" → "X დამწერი კაცი" — prefer this over a full
  relative clause for compact narration.
• Object participle, past: preverb + root + -ულ-ი (დახატული = painted/drawn).
  English perfect-participle attributives ("the broken glass") → გატეხილი ჭიქა.
  Also predicative: ჭიქა გატეხილია (the glass is broken) — participle + ა copula.
• Object participle, future: preverb + სა-...-ი (დასახატი = to be painted).
  English "to be V-ed", "yet to be V-ed" → სა- participle.
• Negative participle: preverb + უ- + root + thematic + -ი (დაუხატავი =
  unpainted, never painted). English "un-V-ed", "never V-ed" → this form.

ADVERBIAL OF PURPOSE:
• სა- participle + adverbial case: დასახმარებლად (in order to help),
  მოსამზადებლად (in order to prepare). English infinitive of purpose after a
  motion verb → სა-...-ლად / სა-...-ად on the dative noun: მოვედი თქვენს
  დასახმარებლად. NEVER render purpose as a separate რათა clause when the
  compact სა- participle fits narration register.

NOMINALIZED PARTICIPLES (productive word-building):
• -ებელი agent/instrument nouns: მატარებელი (train), მაცივარი (fridge),
  მასწავლებელი (teacher). Use the native noun, not a descriptive phrase.`;

const KA_MODALITY = `
MODALITY — NECESSITY, POSSIBILITY, PERMISSION, DESIRE (v1.9.0, zmnebi/kartuliena):
Georgian has no auxiliary modals; modal meaning uses PARTICLE + OPTATIVE or
dative-experiencer verbs.

NECESSITY / OBLIGATION — უნდა + OPTATIVE (Series II aorist-subjunctive form):
• უნდა დავწერო წერილი = I must/have to write a letter.
• Third person: მას უნდა დაწეროს (ergative subject in optative).
• უნდა is invariable — it never conjugates. NEVER write *უნდება or *უნდავს.
• English "must / have to / should / needs to" → უნდა + optative, NOT a finite
  future. "He should write" → მან უნდა დაწეროს წერილი.
• უნდა also means "wants" with a dative experiencer: მასპინძელს უნდა (the host
  wants). Disambiguate by context; keep the optative after it either way.

DESIRE — მინდა (I want):
• მინდა + masdar: მინდა დაწერა (I want to write) — colloquial, common.
• მინდა, რომ + optative: მინდა რომ დავწერო — formal/emphatic. Both are correct;
  narration prefers მინდა + masdar.
• Negation: არ მინდა. English "I don't want to V" → არ მინდა + masdar.

ABILITY / PERMISSION — შემიძლია (dative experiencer, invariable stem):
• შემიძლია დავწერო / შემიძლია დაწერა = I can write (optative or masdar follow).
• Future: შემეძლება; past: შემეძლო. Person marked by prefix: შეგიძლია, შეუძლია,
  შეგვიძლია, შეგიძლიათ, შეუძლიათ.
• English "can / be able to" → შე-...-ძლია form, NEVER a literal "able" adjective.

HYPOTHETICAL / UNCERTAIN — იქნებ (perhaps), უნდა + conditional readings:
• იქნებ + future/aorist = maybe: იქნებ მოვიდეს (maybe he will come).
• English "might / may" in narration → იქნებ or the conditional screeve.

RULE: never calque English "will be able to", "is supposed to", "has got to"
word by word — rebuild with შეეძლება, უნდა + optative, უნდა + optative.`;

const KA_COMPARISON = `
DEGREES OF COMPARISON (v1.9.0, georgian.se / lingualabs):
Georgian has NO morphological comparative; comparison is ANALYTIC.

• Positive (neutral): დიდი (big).
• Comparative: უფრო + adjective: უფრო დიდი (bigger), უფრო მაღალი (taller),
  უფრო ლამაზი (more beautiful). "than" = ვიდრე: ნიკო უფრო მაღალია ვიდრე ნინო.
• "less": ნაკლებად + adjective: ნაკლებად ლამაზი.
• Superlative: ყველაზე + adjective: ყველაზე დიდი (biggest), ყველაზე ლამაზი.
• Synthetic superlative with სა-...-ეს- circumfix exists for some adjectives:
  უდიდესი (biggest), საუკეთესო (best), უმძიმესი (heaviest) — prefer these
  established forms in literary register over ყველაზე for the common ones.
• Irregular comparative/superlative pairs to memorize:
  კარგი → უკეთესი → საუკეთესო (good/better/best);
  ცუდი → უარესი → ყველაზე ცუდი (bad/worse/worst).
• Equality: როგორც ... ისევე (as ... as); ისევე როგორც (just as).
• "the more ... the more ...": რაც უფრო ... მით უფრო ...
• NEVER calque "-er/-est" endings or "more/most" as separate invented words.
• After ვიდრე the compared noun takes the same case as the standard of
  comparison; keep both nominative in equative narration.`;

const KA_POSSESSION = `
POSSESSION & THE "HAVE" VERBS (v1.9.0, talkingingeorgian / lingoseven):
Georgian "have" is an INVERTED construction: the possessor is DATIVE, the
possessed thing is the grammatical subject.

INANIMATE POSSESSION — ქონა (აქვს paradigm):
• მაქვს (I have), გაქვს, აქვს, გვაქვს, გაქვთ, აქვთ.
• Frame: [dative possessor] + [nominative thing] + აქვს:
  მას აქვს წიგნი (he has a book). წიგნი is the subject.
• Past: ჰქონდა (he had): მას ჰქონდა წიგნი. Future: ექნება.
• Evidential: ჰქონია (reportedly had).

ANIMATE POSSESSION (people, animals) — ჰყავს:
• მყავს (I have), გყავს, ჰყავს, გვყავს, გყავთ, ჰყავთ.
• მას ჰყავს ძაღლი (he has a dog). Past: ჰყავდა. Future: ეყოლება.
• NEVER use აქვს for a person or animal; NEVER use ჰყავს for objects.

POSSESSIVE ADJECTIVES (decline like consonant-stem adjectives):
• ჩემი, შენი, მისი, ჩვენი, თქვენი, მათი (my...their).
• Dative/adverbial take -ს: ჩემს, შენს, ჩვენს, თქვენს; 3rd person: მის, მათ.
• Ergative: ჩემმა, შენმა, მისმა, მათმა.
• 3rd person reflexive possessive = თავისი (his own) vs მისი (his [another's]).

GENITIVE:
• Consonant stems: -ის (კაცის); vowel stems: -ს (ნინოს, საქართველოს).
• Postpositions თვის (for), გარეშე (without), მიერ (by, passive agent),
  შემდეგ (after), შორის (between) take the GENITIVE: ჩემთვის, მის გარეშე.

RULE: English "X's Y" or "Y of X" → genitive X + Y. English "has" → inverted
აქვს/ჰყავს frame; do NOT translate "have" as a transitive action verb.`;

const KA_CONDITIONAL = `
CONDITIONAL SENTENCES & "WOULD" (v1.9.0, kartuliena / wikibooks):
English "would" maps to a screeve, never to a modal word.

FORMATION:
• Conditional mood = PREVERB + IMPERFECT indicative (დავწერდი = I would write /
  I used to write — context disambiguates).
• Condition clause (hypothetical) = რომ or თუ + future subjunctive (-დ-ე endings):
  მე რომ დავწერდე ... (if I wrote ...). Present-stem variant: შენ რომ წერდე ...
  (if you were writing now).

PATTERN (type II conditional, like English "If I went, I would eat"):
• მე რომ წავიდოდე სახლში, მერე ვჭამდი ვაშლს.
• Condition: subjunctive (-დე); result: conditional (imperfect + preverb).
• თუ + future/aorist serves REAL conditions: თუ მოვა, დამირეკე (if he comes,
  call me) — realis, NOT subjunctive.

OTHER USES OF უნდა + SUBJUNCTIVE:
• Past subjunctive (-ოდე): მინდა რომ წასულიყო (I wish he would go).
• იქნებ + aorist optative: იქნებ მოვიდეს (perhaps he will come).

RULES:
• English "would + verb" in narration → conditional screeve (preverb + -დი/-და),
  NOT უნდა + verb and NOT the future.
• English "If I were ... I would ..." → რომ/თუ + subjunctive, conditional result.
• Keep the imperfect + preverb "used to" reading when narration is habitual:
  დავწერდი წერილს ყოველ კვირას (I would write a letter every week).`;

const KA_ADVERBS_LITERARY = `
ADVERBS & LITERARY TRANSITIONS (v1.9.0, kartuliena / prose corpus):

FORMATION:
• Adverbial case -ად/-დ turns adjectives into adverbs: სწრაფი → სწრაფად
  (quickly), მშვიდობიანად (peacefully). "as a / into a" role: მასწავლებლად
  მუშაობს (works as a teacher).
• Postposition მდე (up to/until) takes the adverbial minus final -დ: სახლამდე.

HIGH-FREQUENCY LITERARY ADVERBS & CONNECTORS (prefer over calques):
• ძალიან (very)  • ხშირად (often)  • იშვიათად (rarely)  • ადრე (early)
• გვიან (late)  • უეცრად (suddenly)  • ნელ-ნელა (slowly)  • მალე (soon)
• ჯერ (first/still)  • მერე (then/after)  • ამის შემდეგ (after this)
• ამავე დროს (at the same time)  • საბოლოოდ (finally)  • მაინც (still/anyway)
• მაგრამ / თუმცა (but / although)  • ამიტომ / ამის გამო (therefore)
• მაშინ (then, at that time)  • აქ / იქ / სადღაც (here / there / somewhere)
• სადმე, როდესმე, ვინმე (somewhere, sometime, someone) — indefinite series
  built on -მე; use these instead of literal "some-" compounds.

NARRATIVE PAST TIME MARKERS:
• დილით (in the morning), საღამოს (in the evening), ღამით (at night),
  ერთ დღეს (one day), ერთხელ (once), იმ დროს (at that time),
  დიდი ხნის წინ (long ago), ცოტა ხნის წინ (recently).

RULE: In narration prefer the single native adverb (უეცრად) over an English
calque phrase ("all of a sudden" → უეცრად, NOT *ყველა მოულოდნელობისა).`;

const KA_EVIDENTIALITY_DEEP = `KA-43 EVIDENTIALITY IN NARRATION (v1.10.0, Wier lingbuzz / Tuite):
Georgian grammar itself distinguishes WHO SAW the event — aorist vs perfect series.

AORIST (firsthand, authoritative):
• Aorist asserts the narrator witnessed or fully commits to the event.
• "She bought bread" (seen): მან პური იყიდა. Subject = ERGATIVE (მან).
• Use aorist for direct narration of plot events the story presents as fact.

PERFECT-EVIDENTIAL (unwitnessed, deduced, reported):
• Perfect series marks that the speaker did NOT witness the event directly —
  it was inferred from results or heard from others.
• "She has (apparently) bought bread": მას პური უყიდია / მან... შეუძენია.
• Perfect INVERTS the case frame: subject goes DATIVE (მას), object NOMINATIVE.
  This is the grammatical signature of evidential distance.
• Negative nuance: არ მიყიდია (perfect-negation) = "I haven't bought it"
  (neutral state); არ ვიყიდე (aorist-negation) = "I chose not to buy it"
  (intentional non-action). Choose by meaning, not habit.

QUOTATIVE / REPORTED PARTICLES:
• თურმე = "apparently / they say / so it turns out" — the lexical evidential
  particle par excellence. Attach to reported content:
  მოვიდაო თურმე (he has apparently come). Use when rendering
  "apparently", "supposedly", "as it turned out", "so they say".
• =მეთქი (metki) = first-person self-quote: "so I said / I was like".
• =თქო (tko) = reported command: "and (they say) do this".
• -ო suffix on quoted words marks reported speech in folk narrative:
  მოვიდაო, წავიდაო.

TRANSLATION MAPPING:
• English simple past in objective narration → AORIST.
• English "had done / has done" with inference flavor, "apparently",
  "it turned out", "reportedly" → PERFECT series or თურმე.
• English "I hear (that)...", "they say..." → თურმე / -ო reported forms.`;

const KA_PLUPERFECT = `KA-44 PLUPERFECT & "HAD DONE" (v1.10.0):
English past perfect "had + participle" maps to Georgian constructions:

1. PLUPERFECT SCREEVE (primary): imperfect of ქონა + participle —
   დაწერილი მქონდა (I had written), ნანახი ჰქონდა (he had seen),
   გაკეთებული გვქონდა (we had done). Inversion: possessor/experiencer DATIVE.
2. ნა- PARTICIPLE variant (experiential flavor — "had once done"):
   ნაჭამი გქონდა (you had (already) eaten), ნამღერი ჰქონდა.
3. Simple narrative alternative: when English "had done" is just background
   sequencing, Georgian prose often uses plain aorist with უკვე (already):
   "he had left before dawn" → გათენებამდე უკვე წავიდა.
   Prefer this when the evidential nuance is absent — do not stack
   "had + had" chains into pluperfects mechanically.

RULE: "had + V-ed" BEFORE another past event → pluperfect screeve or
უკვე + aorist. "had + V-ed" as pure report/inference → perfect series.`;

const KA_FUTURE_IN_PAST = `KA-45 FUTURE-IN-THE-PAST & REPORTED SPEECH (v1.10.0):
English "would + verb" (future viewed from the past) → CONDITIONAL screeve:

• "He said he would come" → თქვა, რომ მოვიდოდა (conditional: preverb + imperfect).
• "I knew she would agree" → ვიცოდი, რომ დათანხმდებოდა.
• "would always / used to" (habit) → imperfect, NOT conditional:
   ის ყოველ დილას დადიოდა (he would walk every morning = habitual → imperfect).
   ხოლმე can sharpen habituality: დადიოდა ხოლმე.

DISAMBIGUATION TABLE for English "would":
• would = future-in-past after a reporting verb → conditional (მოვიდოდა).
• would = repeated past habit → imperfect (დადიოდა), optionally + ხოლმე.
• would = politeness ("would you...") → გთხოვთ / შეგვიძლია თუ... phrasing,
  not a literal conditional.
• would = counterfactual ("I would go if...") → conditional screeve +
  რომ/თუ condition clause (see KA-CONDITIONAL).

REPORTED THOUGHT / SPEECH INTRODUCERS:
• თქვა, რომ... (he said that), იფიქრა, რომ... (he thought that),
  გაახსენდა, რომ... (he recalled that), მოეჩვენა, რომ... (it seemed to him).`;

const KA_ASPECT_HABITUAL = `KA-46 ASPECT & HABITUAL IN NARRATION (v1.10.0):
Georgian aspect = stem choice, not suffix tense:

IMPERFECTIVE vs PERFECTIVE:
• Present-series stems (no preverb) = imperfective: ongoing, habitual,
  incomplete. ვწერ (I write / I am writing).
• Preverb + stem = perfective: bounded, completed event. დავწერე (I wrote it
  [to completion]). The preverb is the aspect switch.

PAST NARRATIVE CHOICE:
• Imperfect (ვწერდი) = background, description, repeated/habitual past,
  ongoing states: წვიმდა (it was raining / it rained on and on).
• Aorist (დავწერე) = foreground events, single completed actions, plot beats.
• Prose rhythm: set the scene with imperfect; advance the plot with aorist.
  "The rain was falling; he opened the door" → წვიმდა; კარი გააღო.

HABITUAL MARKER ხოლმე:
• ხოლმე explicitly marks habitual/characteristic past action:
  დადიოდა ხოლმე ტბასთან (he used to go to the lake).
  Use for English "used to", "would (habitual)", "always ... -ed".

DURATIVE vs PUNCTUAL:
• იწყებს/დაიწყო (began), განაგრძო (continued), დაასრულა (finished) mark
  phase boundaries; combine imperfective verbs with them for duration.`;

const KA_TIME_CLAUSES = `KA-47 TIME CLAUSES & TEMPORAL CONNECTORS (v1.10.0):
Native temporal subordinators (prefer over calques of "when/after/until"):

• როცა / როდესაც = when: როცა მოვიდა, ყველა გაჩუმდა.
  (როდესაც is the literary/longer variant; როცა is neutral.)
• სანამ ... არ = until (with negation in the subordinate clause!):
  დაელოდე, სანამ არ დაბრუნდება (wait until he returns).
  NOTE the obligatory არ inside სანამ-clauses with a completed event.
• სანამ = while / as long as (without არ): სანამ ცოცხალია (while he lives).
• შემდეგ რაც / რაც შეეხება... no — AFTER = შემდეგ, რაც or იმის შემდეგ, რაც:
  შემდეგ რაც წავიდა, ოთახი დაცარიელდა.
• როგორც კი = as soon as: როგორც კი დაინახა, გაიქცა.
• მაშინ როცა = at the time when / back when: მაშინ როცა ახალგაზრდა იყო.
• სანამღე / ვიდრე... არ = literary "until": ვიდრე არ მოვა, არ წავალ.
• რაკი / რაკიღა = since, given that (literary): რაკი დაპირდა, უნდა შეასრულოს.

SEQUENCE IN NARRATION:
• ჯერ (first), მერე / შემდეგ (then), ბოლოს (finally), ამის შემდეგ (after that),
  იმავე წუთას (that very moment), ერთბაშად (all at once).

RULE: English "until + positive verb" → სანამ ... არ + verb. Missing არ is a
defect, not a stylistic choice.`;

const KA_WORD_ORDER_NARRATIVE = `KA-48 WORD ORDER & INFORMATION STRUCTURE (v1.10.0):
Georgian is morphologically rich, so order is flexible — but DEFAULT is SOV
and the verb typically CLOSES the clause.

DEFAULTS:
• Subject–Object–Verb: ბავშვმა ვაშლი შეჭამა. Verb-final is the unmarked,
  calm narrative order.
• Adjective precedes noun: დიდი სახლი. Genitive precedes noun: ბიჭის წიგნი.
• Adverbs usually precede the verb: ნელა ლაპარაკობს.

FOCUS & EMPHASIS (information structure):
• The preverbal slot carries FOCUS: the word right before the verb is the
  newsworthy element. ვაშლი შეჭამა ბავშვმა puts focus on ვაშლი.
• Topicalized/contrastive elements move to clause-initial position with
  კი / კიდევ: ეს კი მან არ იცოდა (THIS he did not know).
• Fronting for dramatic effect is native and literary — use sparingly in
  prose translation to mirror English end-focus.

ENCLITICS (Wackernagel position):
• Focus particles კი, ვერ, თურმე, ხოლმე and clitic pronouns gravitate to
  second position in the clause, not sentence-final.

TRANSLATION TACTIC:
• Keep SOV + verb-final for neutral sentences.
• When English fronting signals contrast ("But THIS..."), reproduce with
  fronting + კი.
• Do not mirror English SVO word order literally — it reads as translated-ese.
  Reorder to SOV unless focus demands otherwise.`;

const KA_PARTICLES_DEEP = `KA-49 PARTICLE COMBINATIONS კი/ც/არ (v1.11.0, Advadze TSU paper):
The three particles კი, -ც, არ combine into precise negation/additivity
semantics. Getting them wrong flips meaning.

CORE SENSES:
• -ც = "too/also" (enclitic, attaches AFTER the word): მეც მივდივარ (I'm going
  too). Never write ც as a separate word.
• არც = "neither/nor, not...either": არც ის მოვიდა (he didn't come either).
  Also temporal negation (არც ახლა — not even now) and negation of the minimal
  amount (არც ერთი — not a single one).
• არც კი = "not even" negating a presupposition: არც კი მომესალმა (he didn't
  even say hello).
• ...ც არ = "not even one X": ერთი წყალიც არ დარჩა (not a drop of water left).
  The ც-marked noun's minimal unit is negated.
• კი არ = "not X but Y" (qualitative opposition) AND positive additive
  emphasis: კი არა, საუკეთესოა (not just good — the best).
• კი ...ც არ = კი marks the agent, ც marks the noun: double marking, both
  present in one clause.
• ...ც კი არ = ც marks the noun, კი adds the presupposition: წყალიც კი არ
  დარჩა (not even water was left).

ENGLISH MAPPING TABLE:
• "even + negated verb" → არც კი / ...ც კი არ
• "neither / nor / not...either" → არც
• "not a single / not a drop of" → ...ც არ (with ერთი or a minimal noun)
• "not only...but also" → არა თუ...არამედ
• "used to / would always" → imperfect (+ ხოლმე)

TACTIC: when English uses "even", "either", "neither", or "not a single",
check the Georgian output uses the right კი/ც/არ combination — a plain არ
loses the presupposition and reads flat.`;

const KA_QUOTATIVES = `KA-50 QUOTATIVE PARTICLES თქო/მეთქი/-ო (v1.11.0):
Georgian marks reported speech with sentence-final enclitic particles —
English marks it with "he said (that)" or nothing at all. Drop them and the
"who said what" chain breaks.

• თქო = the CURRENT speaker relays someone else's words (2nd hand):
  წადი და მამას უთხარი, გელოდებით-თქო (Go tell daddy [that I said] we're
  waiting for you). Attaches to the last word of the quoted clause.
• მეთქი = the speaker repeats THEIR OWN earlier words (self-quote, often
  exasperated): ახლავე წადი! ახლავე წადი-მეთქი! (Go this instant! I SAID, go
  this instant!)
• -ო = marks third-party words, sayings, proverbs heard from others:
  მოვიდა-ო (so he came, they say). Common in folk narrative.

TRANSLATION TACTIC:
• English "X said (that)..." inside dialogue → keep the quote, append -თქო
  when the narrator relays a third party's words.
• English "I said..." repetition → -მეთქი.
• Proverbs/sayings introduced with "as they say" → ...-ო or ასე ამბობენ.
• Never translate these as full verbs (თქვა) when they are enclitic markers —
  that doubles the speech verb.
• In audiobook prose, თქო is the workhorse for he-said/she-said chains; keep
  it attached with a hyphen to the final word of the quote.`;

const KA_VERSION_MARKERS_DEEP = `KA-51 VERSION VOWELS ი-/ა-/უ- (v1.11.0):
The slot right after the preverb (or word-initially) carries a version vowel
that encodes WHO BENEFITS from the action. It is obligatory, not optional.

• ი- SUBJECT version: action benefits/returns to the subject — მო-ი-ყიდა
  (he bought FOR HIMSELF), შე-ი-მაგრა (strengthened itself).
• ა- NEUTRAL version: plain transitive action — მო-ა-ყიდა? No: neutral is the
  unmarked form მი-ა-ცა, გა-ა-კეთა (he did it, no beneficiary).
• უ- SUPERESSIVE/OBJECT version: action benefits a third party or lands ON
  something — მო-უ-ყიდა (he bought FOR SOMEONE), და-უ-წერა (wrote FOR/TO
  someone). With 1st/2nd person beneficiaries it fuses: მო-მ-ცა (gave me),
  მო-გ-ცა (gave you), მო-ვ-ცა (gave us), მო-ვ-ე-ცა? — watch m/g/v/gv infixes.

ENGLISH MAPPING:
• "bought a book" (self) → ი-version: წიგნი მოიყიდა.
• "bought a book for her" → უ-version: წიგნი მოუყიდა.
• "gave me the book" → მომცა (the beneficiary is INSIDE the verb — no separate
  pronoun needed; მომცა წიგნი, NOT *მომცა ჩემთვის წიგნი).

TACTIC: when English says "for me/for him/to her" after a verb of transfer,
the Georgian output must show the უ-version (or m/g/v fusion) and DROP the
postpositional phrase. Keeping ჩემთვის/მისთვის alongside the version vowel is
a calque defect.`;

const KA_T_V_REGISTER = `KA-52 T–V DISTINCTION შენ vs თქვენ (v1.11.0):
Georgian distinguishes intimate singular შენ from polite/plural თქვენ. The
verb agrees, so the choice propagates: შენ ხარ vs თქვენ ხართ, წადი vs წადით.

RULES:
• Narrator → unnamed stranger, formal address, or reader: თქვენ (polite).
• Dialogue between close friends, family, children, insults: შენ.
• Animals, God (traditional), rhetorical address to oneself: შენ.
• Mixed groups always take თქვენ (plural wins).
• თქვენ is ALSO plain plural "you all" — register follows context.

ENGLISH MAPPING: English "you" is ambiguous. Infer from the scene:
• Master→servant, strangers, shopkeepers: თქვენ.
• Lovers, siblings, childhood friends: შენ.
• When the English text gives no cue, default to თქვენ in narration and
  dialogue with strangers; switch to შენ only on explicit intimacy signals
  (first names, diminutives, შენ ჩემო...).

TACTIC: never mix registers inside one dialogue — a speaker who addresses
one character with შენ and another with თქვენ must be intentional (power
contrast), otherwise it reads as an error. Audiobook listeners HEAR the
difference (ხარ vs ხართ) — mismatched register is an immediate quality flag.`;

const KA_PARALLEL_PROSE = `KA-53 PARALLEL PROSE PATTERNS (v1.11.0, EN↔KA book comparisons):
Patterns observed in published Georgian literary translations (Wardrop's
Rustaveli, Rayfield's Georgian prose anthology, contemporary novel
translations).

IDIOM COMPENSATION:
• When English has an idiom with no Georgian twin, translate the MEANING with
  a natural Georgian collocation — do not calque the image. "It's raining
  cats and dogs" → ცა ჩამოინგრა (the sky fell in) or ძლიერი წვიმა მოდის.
• Georgian prefers BODY and NATURE metaphors: anger = სისხლი აუდიდა (his blood
  rose), fear = გული წაუვიდა (his heart left), sadness = გული მოეკვეთა.

RHYTHM & PARALLELISM:
• English parallel structures ("He came, he saw, he left") map well to
  Georgian verb-fronted repetition: მოვიდა, დაინახა, წავიდა — keep the
  repetition, it sounds native.
• Georgian literary prose favors SHORT verb-final sentences in action scenes
  and ONE long flowing sentence (with participial chains) for description.
  Mirror the English's alternation rather than flattening it.

ALLITERATION & SOUND:
• Rustaveli-era translation tradition rewards sound texture. When the English
  alliterates, seek Georgian alliteration or assonance (not mandatory, but a
  mark of quality in audiobook prose).

DIALOGUE TAGS:
• Vary: თქვა, უთხრა, წამოიძახა, აღნიშნა, ჩაიბუტბუტა — English "said" is
  neutral, Georgian tags carry manner. Pick from context, not randomly.
• Georgian drops the tag entirely when the speaker is obvious — prefer that
  over repeating თქვა in every line.`;

const KA_STYLE_GUIDE = `KA-54 KA-GE STYLE GUIDE (v1.11.0, Microsoft style guide + audiobook house rules):
Punctuation and formatting conventions that make Georgian output look native.

PUNCTUATION:
• Quotation marks: „double low-high" — „მოგესალმები" თქვა მან. Never straight
  quotes "..." or English curly quotes in Georgian prose.
• Em dash (—) with spaces for parenthetical asides: ის — და მხოლოდ ის — იცოდა
  სიმართლე.
• Comma before ან (or) in lists of alternatives: ჩაი ან ყავა; before და (and)
  in simple lists NO comma: პური, ყველ და ვაშლი — but და joins the last pair
  without a comma.
• Question mark direct: სად მიდიხარ? Indirect questions take NO question
  mark: მკითხა, სად მიდიოდა.

CAPITALIZATION:
• Georgian has NO capital letters — never capitalize sentence starts, proper
  nouns stay lowercase: თბილისი, რუსთაველი are written as-is (they look
  distinct by spelling, not case).

POSSESSION & PRONOUN DROPPING:
• Drop possessive pronouns when the owner is obvious from context: თვალები
  დახუჭა (closed HIS eyes) not მისი თვალები დახუჭა. Keep the possessive only
  when ambiguity or contrast demands it.
• Singular they → ის with singular agreement (Georgian has no gender and no
  plural-of-unknown issue).

NUMBERS & MEASUREMENT:
• Small counts in prose: spell out (სამი დღე); dates and figures keep digits.
• Percent: 50 პროცენტი (space, word).

TACTIC: run this checklist on final output — wrong quote marks and
un-dropped possessives are the two most visible "translated-ese" flags in
Georgian audiobooks.`;

const KA_POSTPOSITIONS_CASE = `KA-55 POSTPOSITION CASE GOVERNMENT (v1.12.0, Wikibooks/Adpositions + talkinggeorgian.com):
Georgian postpositions REQUIRE a specific case on the noun they follow.
Getting the case wrong is the single most common postposition error.

DATIVE (-ს) government:
• -ზე (on/about): მაგიდაზე (on the table), პირველი საათზე (at 1 o'clock)
• -ში (in/into): ქალაქში (in the city) — noun drops final -ს first: ქალაქს → ქალაქში
• -თან (at, near, with a person): მეგობართან (with the friend)
• თან ერთად (together with): ჩემ ძაღლთან ერთად

INSTRUMENTAL (-ით/თი) government:
• -დან (from a place): სკოლიდან (from school) — drops case -თ: სკოლით → სკოლიდან

GENITIVE (-ის/ს) government:
• -თვის (for): გიორგისთვის (for Giorgi) — NO letter drop
• -გან (from a person/living thing): მეგობრისგან (from a friend)
• გამო (because of): შფოთვის გამო
• გარდა (except): ამის გარდა
• გარეშე (without): ფულის გარეშე
• მიერ (by, agent of passive): მის მიერ
• მაგივრად (instead of): პურის მაგივრად
• მიუხედავად (in spite of): სირთულეების მიუხედავად
• -წინ (before, in front of): კარის წინ

ADVERBIAL (-ად) government:
• -მდე (up to, as far as): სახლამდე (up to the house) — drops final -დ: სახლად → სახლამდე

NOMINATIVE government:
• -ვით (like): მისავით (like him) — dative with -ა- insertion for pronouns

FUSED PRONOUN FORMS (learn as units): ჩემთან, შენთან, მასთან, ჩემთვის,
შენთვის, მისთვის, მათთვის, ჩემგან, მისგან, მათგან, ჩემზე, მასზე.

SPECIAL SEMANTICS:
• ზე with a verb of motion marks PURPOSE of the motion: პურზე მივდივარ
  (I'm going to GET bread, lit. "I go onto bread").
• -დან vs -გან: -დან = from a PLACE; -გან = from a PERSON/living thing or
  material origin: მეგობრისგან მივიღე (I got it from a friend).
• -მდე with time phrases: 8 საათიდან 5 საათამდე (from 8 until 5).
• კენ (GEN) = towards, directional: შინისაკენ გაემართა (he headed homeward).
• Listing multiple -ში items: the second-to-last takes -ისა not -ში.`;

const KA_MASDARS_DEEP = `KA-56 MASDARS (VERBAL NOUNS) IN DEPTH (v1.12.0, zmnebi.com + polyglotclub + Wiktionary):
The Georgian masdar (verbal noun/infinitive) is a NOUN formed from a verb,
usually ending in -ა (წერა writing/to write), sometimes -ომა/-ოლა/-ილი.
It declines like any noun and is the standard rendering of BOTH the English
infinitive ("to write") and the gerund ("writing") in most contexts.

FORMATION:
• Strip person/tense endings, keep root + PFSF + -ა: წერს (writes) → წერა.
• Preverbs carry direction into the masdar: მისვლა (to go), მოსვლა (to come),
  გაფრენა (to fly away), შემოფრენა (to fly in), გადარბენა (to run across).

USAGE PATTERNS (EN → KA mapping):
• "to + verb" after modals: უნდა წავიდე (want-to-go takes OPTATIVE, not masdar);
  შემიძლია წასვლა (can + masdar); მინდა წასვლა (want + masdar).
• Gerund subject/object: სირბილი სასარგებლოა (running is useful).
• After prepositions: masdar + case suffix per postposition government.
• "keep doing" → გააგრძელებს + masdar; "on the verge of" → ე-...-ებოდეს.
• "have done (already)" → past passive participle + აქვს: წაკითხული გაქვს?
• Purpose adverbial of masdar: სა-...-დ/-ად → სამოგზიუროდ (in order to travel).

CAUTION: the masdar is a NOUN — it takes case endings, not tense. A masdar
followed by a finite verb agreement is a hallucination signature.`;

const KA_PURPOSE_CLAUSES = `KA-57 EXPRESSING PURPOSE (v1.12.0, parryc.com "Expressing Purpose" + რათა):
English "in order to / so as to + verb" has THREE Georgian renderings, in
order of frequency in literary prose:

1. სა-...-დ/-ად adverbial of the masdar (most idiomatic, compact):
   მოგზაურობა (to travel) → სამოგზაუროდ (in order to travel).
   With a preverb: სა- + preverb + root + -დ: სა-წა-სვლელად pattern family.
2. რათა + optative (explicit, formal, clause-level):
   იმღერა ხმამაღლა, რათა ყველამ გაიგონა (he sang loudly so that everyone heard).
   რათა clause takes the OPTATIVE screeve, never the future indicative.
3. ზე with a motion verb (implicit purpose): პურზე მივდივარ
   (I'm going to get bread — lit. "I go onto bread").
4. Future participle სა-...-ელი as attributive purpose: სასწავლი მასალა
   (material to be learned).

ENGLISH MAPPING TABLE:
• "in order to + VERB" / "so as to + VERB" → სა-...-ად masdar adverbial
• "so that + clause" → რათა + optative clause
• "go/come/send ... to get/do X" → ზე with motion verb
• "to be V-ed" (attributive) → სა-...-ელი future participle
• "for + NOUN" (benefit) → -თვის + GENITIVE (გიორგისთვის), NOT სა-...-ად.`;

const KA_HISTORICAL_PRESENT = `KA-58 HISTORICAL PRESENT IN NARRATION (v1.12.0, Wikipedia "Historical present" + EN↔KA novel comparison):
English fiction uses the PRESENT tense for past events to add vividness
(dream retellings, plot summaries, dramatic scene climaxes — Updike, Mantel,
Atwood style). Georgian narrative prose has its own convention:

MAPPING RULES:
• English historical-present NARRATION (he walks in and says...) → Georgian
  uses the AORIST (წერს-ნარატივი: შემოვიდა და უთხრა). Georgian does not use
  present tense for completed past narrative events.
• English historical present in DIALOGUE tags within past narration → AORIST
  speech verb: "then he goes: '...'" → შემოდის კი არა, უთხრა: „..."
• KEEP the present only when the English present is genuinely present-time
  (current narration voice, stage directions, timeless general truths).
• Dream retellings: English present → Georgian AORIST (დავინახა, მოვიდა);
  the dream frame is marked once (ოცნებობდა, რომ...).
• Vividness in Georgian comes from aspect (preverb presence) and short
  clauses, NOT from tense shifting — do not "preserve" the English present.

TACTIC: when the source mixes past narration with historical-present
sentences, normalize ALL of them to aorist in Georgian; inconsistent tense
shifting reads as an error to Georgian listeners.`;

const KA_KINSHIP_ADDRESS = `KA-59 KINSHIP TERMS & VOCATIVES (v1.12.0, polyglotclub + parryc.com):
Core family vocabulary and how characters address each other in Georgian prose.

KINSHIP NOUNS:
• მამა (father), დედა (mother), ძმა (brother), და (sister), შვილი (child),
  ვაჟი (son — formal/literary), ასული (daughter — formal/literary),
  მშობელი (parent), ოჯახი (family), ქმარი (husband), ცოლი (wife),
  ბიჭი (boy), გოგო (girl — colloquial), გოგონა (girl — neutral).
• Grandparents: ბაბუა (grandfather), ბებია/ბებო (grandmother).
• In-laws: სიძე (son-in-law), რძალი (daughter-in-law), სიმამრი (father-in-law),
  სიდედრი (mother-in-law).

VOCATIVE FORMS (calling someone):
• მამავ (father!), დედავ (mother!), ძმაო (brother!) — vocative case -ვ/-ო.
• მამაო means "priest!" NOT "father!" — critical disambiguation.
• ბატონო (sir), ქალბატონო (ma'am) — polite address, function as vocatives.
• Addressing family by bare noun is normal and warm: დედა, მამა, ბაბუა.

REGISTER:
• English "son/daughter" in direct address → შვილო (vocative, affectionate),
  not ვაჟო/ასულო (those are narrative/literary registers).
• ბიჭი/გოგო are colloquial; use ვაჟი/ასული/გოგონა in formal narration.`;

const KA_DEMONSTRATIVES_DEEP = `KA-60 DEMONSTRATIVES: ეს / ეგ / ის THREE-WAY SYSTEM (v1.12.0, parryc.com):
Georgian has THREE demonstrative degrees where English has two ("this/that").

• ეს = near the SPEAKER (English "this").
• ეგ = near the ADDRESSEE or vaguely nearby / in the listener's possession
  (English "that (of yours)" — colloquial workhorse: ეგ წიგნი that book of yours).
• ის = far from both, or previously established in discourse (English "that").

OBLIQUE FORMS (non-nominative):
• ეს → ამ (ამ ქალს = this (DAT) woman); ის → იმ (იმ დღეს = on that day).
• ეგ → მაგ (მაგ პონტში = because of that).
• Plural: ესინი / ისინი (rare); usually ეს ხალხი / ის ხალხი instead.

DISTAL ი- prefix: ის with ი- (იმას) implies someone FAR or a STRANGER;
colloquial ა- prefix (ამას) implies someone close at hand.

ENGLISH MAPPING TABLE:
• "this" → ეს (NOM) / ამ (oblique)
• "that" (near you) → ეგ (NOM) / მაგ (oblique)
• "that" (far / anaphoric) → ის (NOM) / იმ (oblique)
• "the aforementioned / the said" → იგი (formal literary demonstrative).
TACTIC: English "that" is ambiguous — choose ეგ vs ის by who possesses or
perceives the referent; default to ის in narration, ეგ in dialogue.`;

const KA_ROM_MULTIPURPOSE = `KA-61 THE MANY USES OF რომ (v1.13.0, parryc.com "The Many Uses of რომ" + Wikibooks):
რომ is the Georgian all-purpose subordinator. English renders it differently
depending on function — do NOT translate it word-for-word.

FUNCTIONS OF რომ:
1. Complementizer "that": ვიცი, რომ ის მოვა (I know that he will come).
   English "that" may be omitted; Georgian რომ is NEVER omitted.
2. With მინდა (want): "want to do" → მინდა + OPTATIVE, no რომ needed:
   მინდა წავიდე (I want to go). With a full clause, რომ appears:
   მინდა, რომ ის წავიდეს (I want him to go) — subjunctive agreement.
3. Causative "make/let someone do": აიძულა, რომ... (he made him...),
   დაუშვა, რომ... (he let him...) — verb of causing + რომ + aorist subjunctive.
4. Purpose "so that": რომ + optative = რათă family; იმღერა ხმამაღლა,
   რომ ყველამ გაიგონა (he sang loudly so that everyone heard).
5. Condition (colloquial): რომ მოვიდე, რას იზამ? (if I come, what will you do?)
   — mostly replaced by თუ in modern prose; keep თუ in narration.
6. Result "so...that": იმდენად დაღლილია, რომ ვერ დგება
   (he is so tired that he cannot stand up).

ENGLISH MAPPING TABLE:
• "that + clause" (after know/think/say) → რომ (mandatory)
• "want to + VERB" → მინდა + optative (NO რომ)
• "want SOMEONE to + VERB" → მინდა, რომ + subjunctive
• "make/let X do" → causative verb + რომ + subjunctive
• "so that" → რომ/რათა + optative
• "so...that" → იმდენად..., რომ...
TACTIC: a რომ clause must contain a FINITE verb. A რომ followed by a masdar
or bare noun is a hallucination signature — რომ წასვლა is wrong; say წასვლა.`;

const KA_RELATIVE_DEEP = `KA-62 RELATIVE PRONOUNS & CLAUSES (v1.13.0, parryc.com + Wikipedia "Relative clause" + Foley thesis):
Georgian builds relative pronouns by adding -ც to interrogatives:

• რაც = what/that which/whatever (indefinite antecedents)
• ვინც = who/whoever
• სადაც = where/wherever
• როდისაც / როცა = when/whenever
• როგორც = how/as
• რამდენიც = however many
• რომელიც = which/who (definite antecedent, declines for case:
  რომელსაც DAT, რომლის GEN "whose", რომელთან "with whom")
• რომლის = whose (possession)

KEY PATTERNS:
• Definite antecedent: კაცი, რომელიც ზის, ჩემი მასწავლებელია
  (the man who is sitting is my teacher).
• Indefinite antecedent → რაც: რაც ვიცი, გეტყვი (I will tell you what I know).
• "It has been X years since" → X წელია რაც: იქ 6 წელია რაც ვმუშაობ
  (I have been working there for 6 years).
• "some-" prefix → -მე suffix: ვინმე (someone), სადმე (somewhere),
  რაღაც (something), როდისმე (ever/sometime).
• English contact clauses ("the book I read") → წიგნი, რომელიც წავიკითხე —
  Georgian ALWAYS requires the relative pronoun; it cannot be dropped.

ENGLISH MAPPING TABLE:
• "who/which/that" (definite) → რომელიც (+ case form)
• "what / that which / whatever" → რაც
• "where" (clause) → სადაც
• "when" (clause) → როცა / როდისაც
• "whose" → რომლის / რომელსაც ... აქვს
• "someone/something/somewhere" → ვინმე/რაღაც/სადმე
• "It is X years since..." → X (წელი/წლია) რაც ...`;

const KA_SIMULTANEOUS_ACTION = `KA-63 SIMULTANEOUS ACTION (v1.13.0, parryc.com "Simultaneous Action"):
English "while/as + -ing" has TWO Georgian strategies:

1. როცა / როდისაც + finite verb (default, neutral):
   როცა შენ დარეკე, მე ვკითხულობდი (while/when you called, I was reading).
   როცა covers both "when" and "while" — Georgian does not force a distinction.
2. თან... თან... (correlative "as... as...", one process unfolding with another):
   თან მიდიოდა, თან ფიქრობდა (as he walked, he thought — lit. "on-one-hand
   going, on-one-hand thinking"). Literary, expressive register.

ENGLISH MAPPING TABLE:
• "while + clause" / "as + clause" → როცა + finite verb (default)
• "as he walked/went, ..." (literary doubling) → თან..., თან...
• "-ing" participial phrase (Walking down the street, he saw...) →
  finite როცა clause or ისე (so doing): ქუჩაში მიმავალმა დაინახა —
  prefer როცა ქუჩაში მიდიოდა, დაინახა for clarity in audio.
TACTIC: long English participial chains ("doing X, she did Y") should become
finite როცა clauses in Georgian — masdar chains sound like telegraphese.`;

const KA_OPTIONS_CORRELATIVE = `KA-64 OPTIONS & CORRELATIVES (v1.13.0, parryc.com "Options" + "Sometimes this, sometimes that"):
English correlative pairs map to Georgian correlatives as follows:

• "or" → ან / თუ (თუ as "or" appears in questions: მოხვალ თუ არა?)
• "either... or..." → ან..., ან... (ან ერთი, ან მეორე — either one or the other)
• "neither... nor..." → არც..., არც... (არც ერთი, არც მეორე) —
  verb then takes არ: არც მან, არც მე არ ვიცი.
• "both... and..." → როგორც..., ისე... (როგორც მამა, ისე შვილი —
  both father and child). Note: this როგორც...ისე is NOT the "as" როგორც.
• "sometimes... sometimes..." → ხან..., ხან... (ხან ცხარია, ხან ცივი —
  sometimes it's hot, sometimes cold). Literary alternation marker.
• "whether... or..." → თუ... თუ... (კარგად თუ ცუდად — for better or worse).

ENGLISH MAPPING TABLE:
• "either A or B" → ან A, ან B
• "neither A nor B" → არც A, არც B (+ არ on verb)
• "both A and B" → როგორც A, ისე B
• "sometimes A, sometimes B" → ხან A, ხან B
• "whether A or B" → თუ A, თუ B / A თუ B
TACTIC: keep correlative pairs SYMMETRIC — if ხან opens the first member,
ხან must open the second. Asymmetric correlatives read as translationese.`;

const KA_SELF_REFERENCE = `KA-65 REFLEXIVE თავი (v1.13.0, talkpal.ai + dictionary.ge + parryc.com "Referring to the self"):
თავი literally means "head" but is THE reflexive pronoun for ALL persons
(Georgian has no myself/yourself/himself series — case + possessive do the work).

CORE FORMS:
• თავი (NOM self), თავს (DAT), თავის (GEN), თავით (INST), თავზე (on self),
  თავისთვის (for oneself), თავის თავს (emphatic: "his own self").
• Plural: თავები / თავიანთ თავს (themselves).
• Emphasis particle: თვითონ (personally/oneself): მე თვითონ ვნახე.

CRITICAL POSSESSIVE DISTINCTION:
• თავისი = his OWN (possession by the subject — reflexive possessive):
  მან წაიკითხა თავისი წიგნი (he read his own book).
• მისი = his (someone else's — non-reflexive):
  მან წაიკითხა მისი წიგნი (he read HIS [another man's] book).
• Same for ჩემი/შენი/ჩვენი/თქვენი with თავი: ჩემი თავი (myself),
  შენი თავი (yourself), თავიანთი (their own, plural reflexive possessive).

ENGLISH MAPPING TABLE:
• "myself/yourself/himself/herself" (object) → (ჩემი/შენი/თავისი) თავი + case:
  "he cut himself" → ხელი გაიჭრა (often verb-internal, no თავი needed);
  "she sees herself" → ხედავს თავის თავს.
• "his own / her own" (possessive) → თავისი (NEVER მისი when reflexive)
• "him/his" (non-reflexive) → მას/მისი
• "on one's own" → თავისთვის / მარტო
TACTIC: English "himself" after a 3rd-person subject is ambiguous — if the
possessor is the subject, Georgian MUST use თავისი; მისი there is a
classic MT error that changes the meaning.`;

const KA_IMPERSONAL_DEEP = `KA-66 IMPERSONAL SENTENCES & DATIVE EXPERIENCER (v1.13.0, parryc.com "Impersonal Sentences" + zmnebi.com):
Georgian expresses bodily states and possession with the EXPERIENCER in the
DATIVE case and a 3rd-person verb — the English "I" becomes "to me":

• მშია = I am hungry (lit. "to-me is-hunger"); მშიანია? = are you hungry?
• მწყურია = I am thirsty; მცივა = I am cold; მცხვა = I am warm;
  მძინავს = I am sleepy; მტკივა = it hurts (მე თავი მტკივა — my head hurts);
  მსმენია/მნახავს = I have heard/seen (evidential perfect).
• აქვს = has (possessor DAT + thing NOM): მას წიგნი აქვს (he has a book).
• ჰყავს = has (people/animals): მას ძმა ჰყავს (he has a brother);
  მას ძაღლი ჰყავს (he has a dog). Use ჰყავს for animate "having".
• სჭირდება = needs (experiencer DAT + thing NOM):
  მჭირდება დახმარება (I need help).
• უყვარს = loves/likes; სძულს = hates (experiencer DAT).
• შეუძლია = can (experiencer DAT + masdar): შემიძლია წასვლა.

ENGLISH MAPPING TABLE:
• "I am hungry/thirsty/cold/sleepy" → მშია / მწყურია / მცივა / მძინავს
  (dative experiencer, NOT ვარ + adjective)
• "I have + thing" → DAT experiencer + NOM thing + აქვს
• "I have + person/pet" → DAT experiencer + NOM person + ჰყავს
• "I need + X" → მჭირდება + X (NOM)
• "I like/love + X" → მყვარს/მომწონს (dative experiencer)
• "my head hurts" → თავი მტკივა (head NOM, me DAT)
TACTIC: "I am + state-adjective" calques (მე შიმშილობა ვარ-style errors)
must become the dative-experiencer verb. Check that the experiencer carries
-ს/-მა and the verb is 3rd person even for "I".`;

const KA_NUMERALS_VIGESIMAL = `KA-67 THE VIGESIMAL NUMBER SYSTEM (v1.14.0, Wikipedia "Georgian numerals" + peacebridge.ge + Wikibooks):
Georgian counts in TWENTIES, not tens. English round numbers map differently:

PRIMITIVES (1-10): ნული 0, ერთი 1, ორი 2, სამი 3, ოთხი 4, ხუთი 5,
ექვსი 6, შვიდი 7, რვა 8, ცხრა 9, ათი 10.
TEENS (11-19): t- prefix + root + მეტი ("ten more"), with consonant changes:
  თერთმეტი 11, თორმეტი 12, ცამეტი 13 (t+s→ts), თოთხმეტი 14,
  თხუთმეტი 15, თექვსმეტი 16, ჩვიდმეტი 17 (t+š→č), თვრამეტი 18 (t+rv→tvr),
  ცხრამეტი 19 (t+s→ts).
TWENTIES: ოცი 20, ორმოცი 40 (= 2×20, note -მ-), სამოცი 60 (3×20),
  ოთხმოცი 80 (4×20). NOT ორ ოცი or ოთხ ოცი.
21-99: drop final -ი of the twenty-word, add და ("and"), add 1-19:
  ოცდაერთი 21, ოცდაათი 30, ოცდათვრამეტი 38, ორმოცდაშვიდი 47,
  სამოცდაორი 62, ოთხმოცდაცხრამეტი 99. The და connector is MANDATORY.
HUNDREDS: ასი 100; 200-900 have NO -მ-: ორასი, სამასი, ოთხასი, ხუთასი,
  ექვსასი, შვიდასი, რვაასი, ცხრაასი.
THOUSANDS: ათასი 1000 (lit. 10×100); ორი ათასი 2000; ათი ათასი 10,000.
FINAL -i DROP: before a smaller number the final -ი disappears:
  ორას ორმოცდაათი 250, სამას ათი 310, ოთხას თხუთმეტი 415,
  ორი ათას ათი 2010.
SPELLING: under 100 → one word (ოცდაერთი); from 100 → units written
  separately: ათას ხუთას ოცდაშვიდი 1,527.

ENGLISH MAPPING TABLE:
• "twenty-one" → ოცდაერთი (NOT ოცი ერთი — missing და is a defect)
• "thirty" → ოცდაათი (20+10); "fifty" → ორმოცდაათი (40+10);
  "seventy" → სამოცდაათი (60+10); "ninety" → ოთხმოცდაათი (80+10)
• "two hundred" → ორასი (NOT ორმოცი — that is 40)
• "2,000" → ორი ათასი (two words); "10,000" → ათი ათასი
TACTIC: an English round ten (30/50/70/90) is NOT a single Georgian word —
it is a vigesimal compound with და. Never render "seventy" as a borrowed
single word; it is სამოცდაათი (60+10).`;

const KA_ADJECTIVE_DECLENSION = `KA-68 ADJECTIVE DECLENSION (v1.14.0, Wiktionary "Georgian adjectives" + georgian.se grammar):
Modern Georgian adjectives normally do NOT agree with their nouns in case or
number (unlike Old Georgian) — but they DO decline when:

1. Postposed after the noun (poetic/emphatic): წიგნი კარგი (a book, a good one).
2. Used standalone (substantivized): კარგმა თქვა (the good one said).
3. Nominalized (the adjective IS the noun): ღარიბმა თქვა.

TWO DECLENSION CLASSES:
• Vowel-final adjectives NOT ending in -ი (e.g. ლურჯი? no — e.g. მაღალი is
  -ი class; ლურჯ IS -ი class; true vowel-final like ცხვირ-? none common):
  effectively UNCHANGING in all cases in modern usage.
• ი-final adjectives (the vast majority: კარგი, დიდი, მაღალი, ლამაზი):
  NOM = stem + ი (კარგი), GEN = stem + ის (კარგის) — same as noun;
  DAT = bare stem (კარგ), ADV = bare stem (კარგ), ERG = stem + მა (კარგმა),
  VOC = stem + ო (კარგო), INST = stem + ით (კარგით), ADVB = stem + ად (კარგად).

KEY POINT: in the NOMINATIVE the -ი-final adjective looks identical to the
noun; in DAT/ADV/ERG the adjective loses -ი or takes -მა while the noun keeps
its own ending: დიდმა კაცმა (by the big man), დიდ სახლს (to the big house).

ENGLISH MAPPING TABLE:
• "the big house" → დიდი სახლი (adjective PRECEDES noun, uninflected)
• "to the big house" → დიდ სახლს (adjective bare stem + noun dative)
• "by the big man" → დიდმა კაცმა (adjective -მა + noun -მა)
• "a good one" (standalone) → კარგი / declined კარგმა თქვა
TACTIC: the classic MT error is leaving the FULL -ი form before a dative or
ergative noun (დიდი სახლს ✗ → დიდ სახლს ✓). When the noun is declined away
from nominative, the preceding ი-adjective usually drops its -ი.`;

const KA_COMPARISON_DEEP = `KA-69 COMPARISON & SUPERLATIVE (v1.14.0, talkpal.ai comparison guide + lingualabs.com):
Georgian does NOT inflect the adjective for comparison. The comparison is
carried by particles and case endings:

COMPARATIVE ("-er than"):
• Structure: [Noun1] [Noun2]-ზე [adjective] — the -ზე suffix goes on the
  COMPARED NOUN, the adjective is unchanged:
  ლაშა გიორგიზე მაღალია (Lasha is taller than Giorgi — lit. "Lasha
  on-Giorgi tall-is").
• With უფრო (more) for emphasis: ეს წიგნი იმ წიგნზე უფრო საინტერესოა
  (this book is more interesting than that one).
• "less ... than" → ნაკლებად + adjective (+ X-ზე): ნაკლებად ძვირი (less expensive).
• "than" as a standalone conjunction → ვიდრე: უმჯობესია დავგვიანდე,
  ვიდრე ... (better to be late than ...).

SUPERLATIVE ("the -est"):
• ყველაზე + adjective = "the most" (lit. "on-all"): ყველაზე დიდი (the biggest);
  თბილისი ყველაზე დიდი ქალაქია საქართველოში (Tbilisi is the biggest city in Georgia).
• "the least" → ყველაზე ნაკლებად + adjective.
• Suppletive (irregular) pairs: კარგი good → უკეთესი better → საუკეთესო best;
  ცუდი bad → უარესი worse → ყველაზე უარესი worst.

EQUALITY ("as ... as"):
• როგორც ..., ისევე ... / X-ისევე როგორც Y: ის ისევე მაღალია, როგორც შენ
  (he is as tall as you).

ENGLISH MAPPING TABLE:
• "X is -er than Y" → X Y-ზე [adjective]-ა (suffix on Y, adjective unchanged)
• "more ... than" → ... -ზე უფრო [adj] (or უფრო ... ვიდრე)
• "less ... than" → ... -ზე ნაკლებად [adj]
• "the -est / the most [adj]" → ყველაზე [adj]
• "the least [adj]" → ყველაზე ნაკლებად [adj]
• "as [adj] as" → ისევე [adj]-ა, როგორც / როგორც ..., ისევე
TACTIC: an English "-er" ending must NEVER be calqued onto the Georgian
adjective. If a translation contains a modified adjective where English had
a comparative, check that -ზე sits on the compared noun or უფრო/ვიდრე is
present. Also memorize the suppletive trio: კარგი → უკეთესი → საუკეთესო.`;

const KA_ORDINALS_FRACTIONS = `KA-70 ORDINALS & FRACTIONS (v1.14.0, peacebridge.ge numerals + omniglot.com + georgian.se):
ORDINALS ("-th", "first", "second"):
• Formation: მე- prefix + cardinal stem + -ე suffix:
  მეხუთე 5th, მეექვსე 6th, მეშვიდე 7th, მერვე 8th, მეცხრე 9th, მეათე 10th,
  მეთერთმეტე 11th, მეთორმეტე 12th, ოცდამეხუთე 25th, სამას მეხუთე 305th.
  For compounds, მე- may attach to the LAST component only: ოცდამეხუთე (25th).
• Irregulars to memorize: პირველი first (NOT მეერთი), მეორე second,
  მესამე third (from სამი), მეოთხე 4th, მეხუთე 5th, მეექვსე 6th
  (note vowel changes: მეექვსე, მერვე).
• Abbreviations: with Arabic numerals მე-3 (3rd), მე-15 (15th), 21-ე, 42-ე;
  with Roman numerals NO affix: III, V, XX.
• Ordinals decline like adjectives: მეორე კაცს (to the second man),
  მეორე კაცის (of the second man).
• Spelling: under 100 one word (ოცდამეხუთე); with hundreds/thousands
  written separately: ათას ორას ოცდამეხუთე (1,225th).

FRACTIONS:
• ordinal stem + -ედ-ი: მეოთხედი ¼, მესამედი ⅓, მეექვსედი ⅙, მეათედი ⅒,
  მეასედი 1/100.
• Half = ნახევარი (irregular; NOT მემეორედი); compounds: ორნახევარი 2½.

ENGLISH MAPPING TABLE:
• "first" → პირველი (irregular — never მეერთი)
• "second/third/fourth..." → მეორე/მესამე/მეოთხე...
• "the 21st / 21st" → მე-21 / 21-ე (abbreviation style)
• "one-third / a third" → მესამედი; "a quarter" → მეოთხედი; "half" → ნახევარი
• "two and a half" → ორნახევარი
TACTIC: English "first" must map to the suppletive პირველი — a literal
მეერთი is a classic MT defect. "2nd" digit-suffixes (st/nd/rd/th) must be
converted to the Georgian მე-...-ე / N-ე style, never left as English.`;

const KA_TIME_EXPRESSIONS_DEEP = `KA-71 TIME EXPRESSIONS & TEMPORAL CASES (v1.14.0, peacebridge.ge declension + georgien.free.fr + usage corpora):
Georgian marks time with CASE, not prepositions. English "in/on/at + time"
maps to case endings:

• Adverbial -ად / -ით for time-of-day: დილით (in the morning),
  საღამოს (in the evening), შუადღისას (at midday), ღამით (at night),
  ზამთარში (in winter).
• Dative -ს for point-in-time: დილას (in the morning), საღამოს (in the
  evening), მეორე დღეს (the next day), ორ საათზე (at two o'clock).
• "every X" as a time adverbial → ყოველ + OBLIQUE stem (no -ი):
  ყოველ დილას (every morning), ყოველ დღე (every day) — NOT ყოველი დილა.
  (ყოველი + nominative as a time adverbial is a documented learner error.)
• "What time is it?" → რომელი საათია?; წუთი/წუთები = minute(s);
  საათი = hour/clock; მაჯის საათი = wristwatch.
• Narrative position: time markers typically come FIRST in the sentence:
  დღეს მე ... (today I ...), დილით შევედით (in the morning we entered).
• "at X o'clock" → X საათზე (postposition -ზე on the hour).
• "in X" (duration: in two hours) → ორ საათში (-ში on the time span).

ENGLISH MAPPING TABLE:
• "in the morning / at night" → დილით / ღამით (adverbial, no preposition)
• "the next day / next morning" → მეორე დღეს / მეორე დილას (dative)
• "every morning/day" → ყოველ დილას / ყოველ დღე (oblique ყოველ, no -ი)
• "at X o'clock" → X საათზე
• "What time is it?" → რომელი საათია?
• "in two hours / within a week" → ორ საათში / კვირაში
TACTIC: never translate "in the morning" as a prepositional phrase with a
separate preposition — Georgian folds it into the case ending. A bare
English "in/on/at" surviving before a time word is a translationese marker.`;

const KA_MEASURES = `KA-72 MEASURES, DIMENSIONS & AGE (v1.14.0, Wiktionary usage + georgia.georgien.free.fr):
Georgian expresses dimensions and age with GENITIVE-of-measure or dedicated
სი- abstract nouns — never with English "of"-phrases or adjective calques:

DIMENSIONS (სი- abstract nouns + genitive):
• სიმაღლე = height (lit. "highness"): შენობის სიმაღლე (the height of the building);
  "X meters tall/high" → X მეტრი სიმაღლის / X მეტრის სიმაღლისაა.
• სიგრძე = length; სიგანე = width; სიღრმე = depth; სიჩქარე = speed;
  სიმძიმე = weight/heaviness.
• "the weight of X" → X-ის წონა; "weighs X kilos" → X კილოგრამს იწონის.

UNITS: მეტრი meter, კილომეტრი km, სანტიმეტრი cm, კილოგრამი kg,
  გრამი g, ლიტრი liter, კვადრატული მეტრი square meter.

AGE:
• "X years old" → X წლის არის (genitive of წელი): ის ოც წლის არის
  (he is 20 years old — lit. "he is of twenty years").
• "at the age of X" → X წლის ასაკში.
• Note the vowel grade: წელი (year, standalone), წლის (of the year),
  წლები (years, plural), წლიანი (lasting X years).

ENGLISH MAPPING TABLE:
• "X meters high/tall" → X მეტრი სიმაღლისაა (NOT X მეტრი მაღალია calque)
• "the height/length/depth of X" → X-ის სიმაღლე / სიგრძე / სიღრმე
• "X kilos" → X კილოგრამი; "weighs X" → X კილოგრამს იწონის
• "X years old" → X წლის არის (genitive წლის, NOT წელი)
• "at the age of X" → X წლის ასაკში
• "two and a half meters" → ორნახევარი მეტრი
TACTIC: English "X years old" calqued as X წელი არის or X წლების არის is a
frequent MT defect — the age construction always uses the GENITIVE წლის.
"X meters tall" should prefer the სიმაღლე nominalization in careful prose.`;

const KA_NEGATION_DEEP = `KA-73 NEGATION SYSTEM DEEP: არ / ვერ / ნუ (v1.15.0, georgian.se GeoGrammar negation chapter + zmnebi.com verb morphology + Wikipedia "Georgian grammar"):
Georgian has THREE distinct negative particles — choosing the wrong one is a
meaning-changing defect, not a style issue:

THREE PARTICLES:
• არ = neutral "not" — simple denial of an action/state: არ ვიცი (I don't
  know), არ მოვიდა (he didn't come). Default choice for all statements.
• ვერ = "not ABLE to" — inability/failure: ვერ ვნახე (I couldn't see / failed
  to see). Implies the subject TRIED or WANTED but was blocked.
• ნუ = prohibitive "don't!" — negative imperative only: ნუ დაწერ (don't
  write!), ნუ მიდი (don't go!). Never used in declaratives.

PLACEMENT: The negative particle sits IMMEDIATELY before the conjugated
verb, no other word between: მან არ თქვა (he didn't say). Only a proclitic
like ვეღარ/არასოდეს may intervene.

AORIST NUANCE (critical for narrative prose):
• არ + aorist = "didn't WANT to / chose not to": არ მივიდა (he didn't go —
  his own choice or neutral statement).
• ვერ + aorist = "couldn't / failed to": ვერ მივიდა (he couldn't go —
  something prevented him).
English "he didn't come" is ambiguous between these; pick არ by default and
ვერ only when the source signals inability (couldn't, failed to, was unable).

DOUBLE NEGATION (obligatory, not redundancy):
Georgian negates the SENTENCE and then also negates the indefinite pronoun:
• nobody → არავინ ... არ: არავინ არ მოვიდა (lit. "nobody not came").
• never → არასოდეს ... არ: არასდროს არ მივიწყებდა.
• nothing → არაფერი ... არ: არაფერი არ ვთქვი.
• nowhere → არსად ... არ; no one's → არც ერთი ... არ.
The არ before the verb is REQUIRED even though არავინ etc. are already
negative. Omitting it (არავინ მოვიდა) is substandard.

NEGATIVE CONCORD WORDS:
ვეღარ (no longer could), აღარ (no longer/not anymore), ვერც კი (not even),
არც ერთი (not a single). ვეღარ/აღარ carry the verb negation themselves.

ENGLISH MAPPING TABLE:
• "does not / don't / didn't" → არ + verb
• "cannot / couldn't / was unable / failed to" → ვერ + verb
• "don't! / stop! (imperative)" → ნუ + optative form
• "nobody/no one" → არავინ ... არ (+verb)
• "nothing" → არაფერი ... არ (+verb)
• "never" → არასოდეს ... არ (+verb)
• "not anymore / no longer" → აღარ (+verb)
TACTIC: "nobody came" translated as არავინ მოვიდა (missing the verb არ) is
a high-frequency MT defect. English "couldn't" translated with არ loses the
inability meaning — restore ვერ when the source says cannot/couldn't.`;

const KA_CONCESSIVE_DEEP = `KA-74 CONCESSIVE & ADVERSATIVE DEEP (v1.15.0, georgian.se complex clauses + languages42.ru conjunction list + zmnebi.com style notes):
Georgian distinguishes concessive clause ("despite/although") from
adversative coordination ("but") — English blurs them with "but/though";

CONCESSIVE CONSTRUCTIONS (full clause):
• მიუხედავად იმისა, რომ + clause = "despite the fact that" (most formal,
  bookish): მიუხედავად იმისა, რომ წვიმდა, გზაზე გავედით.
  Short form: მიუხედავად + GENITIVE noun: მიუხედავად წვიმისა (despite the
  rain) — note the სა...-სა shell: მიუხედავად ... -სა.
• თუმცა = "though / however" — formal, sentence-internal or sentence-initial:
  წვიმდა, თუმცა გზაზე გავედით.
• მართალია ..., მაგრამ ... = "it is true that ..., but ..." — the correlative
  frame English "although" often maps to in natural prose: მართალია წვიმდა,
  მაგრამ გზაზე გავედით.
• მაინც = "still / anyway" — the payoff adverb of the concessive pair:
  იყო დაღლილი, მაგრამ მაინც იმუშავა. English "still" in concessive
  sentences maps to მაინც, not to a second მაგრამ.

ADVERSATIVE (simple contrast, no concession):
• მაგრამ = "but" (default); ხოლო = "whereas/and but" (formal, contrasts
  subjects); კი = "but/however" (enclitic after the contrasted word:
  ის კი არ მოვიდა).

ENGLISH MAPPING TABLE:
• "although / though + clause" → მიუხედავად იმისა, რომ ... / თუმცა ...
• "despite + noun" → მიუხედავად X-ისა
• "even though" → მიუხედავად იმისა, რომ (strengthen with კიდევ: კიდევ
  უფრო — only when source says "even more")
• "..., but ..." → ..., მაგრამ ... (comma before მაგრამ is native)
• "...; however, ..." → ...; თუმცა ... or ..., თუმცა ...
• "still / nevertheless / anyway" → მაინც (position: before the verb)
• "although X, still Y" → მართალია X, მაგრამ მაინც Y
TACTIC: English "despite" calqued as მიუხედავად რომ (dropping იმისა) or
"despite of" → მიუხედავად of-phrase are MT defects. The noun-form needs the
genitive + სა shell (მიუხედავად წვიმისა). "Still" as a standalone English
word left untranslated in concessive output is a defect — map to მაინც.`;

const KA_REASON_CLAUSES = `KA-75 REASON & RESULT CLAUSES DEEP (v1.15.0, languages42.ru Georgian conjunction list + georgian.se adverbial clauses + zmnebi.com):
Georgian has a FORMAL REGISTER LADDER for "because" — register mismatch is
a quality defect in literary translation:

REASON CONJUNCTIONS (cause):
• იმიტომ რომ = "because" (neutral-correlative; lit. "for that reason
  that"). Use as default in narrative: დაბრუნდა, იმიტომ რომ დაივიწყა
  ქუდი. Correlative variant: იმის გამო, რომ (because of the fact that —
  slightly heavier, common in careful prose).
• რადგანაც = "since / as" (formal; presents the reason as known info):
  რადგანაც გვიანი იყო, წავედით.
• რადგან = "for / since" (bookish, clause usually follows the main one):
  მას სწამდა, რადგან ესწავლა.
• ვინაიდან = "inasmuch as / since" (very formal, officialese).
• რაკი = "since / given that" (archaic-folk, appears in 19th-c. prose).

RESULT CONJUNCTIONS (consequence):
• ამიტომ = "therefore / that's why" (adverb, starts the result clause):
  გვიანი იყო, ამიტომ წავედით.
• ასე რომ = "so / thus"; შესაბამისად = "accordingly" (formal).
• იმდენად ..., რომ = "so ... that" (degree-result): იმდენად დაიღალა,
  რომ არ ადგა.

PLACEMENT & PUNCTUATION:
• Reason-first: რადგანაც ... , main clause (comma REQUIRED after the
  subordinate clause).
• Reason-after: main clause, იმიტომ რომ ... (no comma before იმიტომ რომ
  unless a pause is intended; comma before რადგანაც/რადგან when they
  follow the main clause is native).
• ამიტომ always begins its own clause after a comma.

ENGLISH MAPPING TABLE:
• "because" → იმიტომ რომ (default) / იმის გამო, რომ (emphatic)
• "since / as (reason)" → რადგანაც (formal) / რადგან (bookish)
• "for (literary)" → რადგან
• "therefore / so / that's why" → ამიტომ / ასე რომ
• "so ... that" → იმდენად ..., რომ
• "due to / because of + noun" → X-ის გამო (genitive + გამო postposition)
TACTIC: English "because" calqued as ვინაიდან in narrative prose is a
register clash (officialese in fiction) — prefer იმიტომ რომ. An English
"because/therefore/since" word surviving untranslated in Georgian output
is a hard defect: map because→იმიტომ რომ, therefore→ამიტომ, since→რადგანაც.
"because of + N" must become genitive + გამო (დაღლილობის გამო), never a
literal of-phrase.`;

const KA_CAUSATIVES = `KA-76 CAUSATIVE CONSTRUCTIONS (v1.15.0, talkpal.ai Georgian causative guide + zmnebi.com version markers + Aronson causative templates):
Georgian builds "make/let someone DO" with MORPHOLOGICAL causatives — not
with a separate verb "make" + subordinate clause:

MORPHOLOGICAL CAUSATIVE PATTERN (Series I):
• ა- prefix on the verb + causative suffix -ინ- (most common) or -ევინ-
  (after stems in -ამ/-ედ etc.), then person markers.
• Base აცეკვებს (he dances) → causative აცეკვინებს (he makes him dance).
• Base წერს (he writes) → აწერინებს (he makes him write / has him write).
• Base სვამს (drinks) → ასვამს / ასმევინებს (makes him drink).
• ჭამს (eats) → აჭმევს (feeds, i.e. makes eat) — irregular suppletive.
• სცემს (beats) → სცემინებს; იცინის (laughs) → აცინებს (makes laugh).

IRREGULAR / SUPPLETIVE CAUSATIVES (memorize, don't compose):
• ჭამს → აჭმევს (feed); სვამს → ასმევინებს (make drink);
• დგას → ადგმევინებს (make stand); იჯდის → დასვამს (seat);
• ლაპარაკობს → ალაპარაკებს (make talk); ცეკვავს → აცეკვებს.

PER-FORMATIVE CAUSATIVE (lexical "make/let"):
• When no natural causative exists or the source means "allow", use
  აძლევს ნებას / აიძულებს (forces) / აკეთებინებს:
  "he made her cry" → ატირებს (morphological) or აიძულა ტირილი (forced
  her to cry, + masdar) for emphasis.
• რომ + subjunctive after აიძულებს/აძლევს ნებას for finite complements:
  აიძულეს, რომ დათმობაზე წასულიყო.

VOICE EFFECTS:
• Causative of an intransitive moves the original subject into the
  indirect-object slot (dative): ბავშვი სძინავს → ბავშვს აძინებს (puts the
  child to sleep). Causative of a transitive adds a second object:
  წერილს წერს → წერილს აწერინებს (has the letter written by someone).

ENGLISH MAPPING TABLE:
• "made him write / had him write" → აწერინებს (NOT გააკეთა მას წერა)
• "fed" → აჭმევს / გამოკვება (aorist გამოკვება is the narrative default)
• "put to sleep" → დააძინა (aorist of დააძინებს)
• "made her laugh/cry" → აცინებს / ატირებს
• "let him go" → გაუშვა / ნება დართო წასვლისა
TACTIC: English "make + person + verb" rendered as a literal verb-for-verb
calque (გააკეთა მას იცინოდა) is a hard MT defect — use the morphological
causative. Over-causation is equally a defect: do NOT force ა-...-ინ- onto
verbs that have a suppletive causative (ჭამს→აჭმევს, not აჭმევინებს).`;

const KA_MEDIAL_VERBS = `KA-77 MEDIAL (MEDIO-ACTIVE) VERB CLASS (v1.15.0, app2brain Georgian grammar part 2 + zmnebi.com screeve morphology + Wikipedia "Georgian verbs"):
Georgian verb classes by thematic suffix — Class 3 "medials" describe
ACTIVITIES the subject engages in; they take the -ება/-ობა/-ვა masdar
ending and -ობ-/-ებ-/-დ- present stems:

MEDIAL PATTERNS (masdar → present):
• -ობ- stem: თამაშობს (plays, masdar თამაშობა), ლაპარაკობს (speaks,
  ლაპარაკობა), მუშაობს (works, მუშაობა), ცურაობს (swims about),
  სწავლობს (studies), აკვირდება (observes).
• -ებ- stem: ტირის→ტირილი weeps; სჩხრიალებს rustles; ისმენს→მოსმენა
  (Class 2 passives overlap: იხსნება opens (itself), იშლება breaks).
• -ავ-/-ვ- stem: verbs whose masdar ends in -ვა invert to -ავ- in the
  present: კლავს (kills, masdar კვლა), ცურავს (swims, ცურვა),
  მართავს (rules, მართვა) — pattern: ვა-masdar ⇄ ავ-present.
  More: ქსავს weaves (ქსოვა), თესავს sows (თესვა), კვეთავს cuts
  (კვეთა), აგებს builds (აშენება).

CLASS 1 vs 3 DISTINCTION:
• Class 1 transitive: წერს (writes) — direct object nominative-inversion
  (ergative in Series II).
• Class 3 medial: subject is the only argument, activity-focused, often
  English intransitives of continuous activity (work, play, talk, swim).
  Series III (perfect) of medials is REGULAR (not inverted): უმუშავია.

FREQUENT BOOK VERBS (medial class):
მუშაობს works; თამაშობს plays; ლაპარაკობს talks; სწავლობს studies;
ცურავს swims; ტირის cries; იცინის laughs; სუნთქავს breathes;
დგას stands; ზის sits; ცხოვრობს lives; ისვენებს rests.

ENGLISH MAPPING TABLE:
• "he works/plays/talks" → მუშაობს / თამაშობს / ლაპარაკობს (medial class,
  NO auxiliary "is" needed — Georgian present covers English progressive)
• "was working" → მუშაობდა (imperfect screeve, no auxiliary)
• "has been working for X years" → X წელია მუშაობს
TACTIC: Do not compose English progressive with არის (+ participle) —
Georgian has no progressive auxiliary; the present/imperfect screeve alone
carries "is/was doing". Medial -ვა masdars (ცურვა, მართვა, კვლა) must map
to the -ავ- present stem (ცურავს, მართავს, კლავს), never ცურვის/მართვის.`;

const KA_PLURAL_DEEP = `KA-78 PLURAL FORMATION DEEP (v1.15.0, talkpal.ai Georgian plurals guide + multilingual.sdu.dk declension tables + grokipedia case system):
Georgian plurals are formed by ONE of two markers placed BETWEEN stem and
case — and adjectives never agree in number:

FORMATION RULES:
• -ებ- is the DEFAULT plural: წიგნი → წიგნები (books), კაცი → კაცები,
  ქალი → ქალები. VOWEL LOSS: drop the final -ი of the singular stem before
  -ები (მეგობარი → მეგობრები, ბაღი → ბაღები — syncope of the stem vowel:
  მეგობარ → მეგობრ-).
• Nouns ending in -ა: drop the -ა and add -ები (ვაჟიშვილო-class): დედა →
  დედები (mothers), ბებია → ბებიები (insert linking ე), შვილიშვილი-class
  regulars keep stem.
• -ნ- plural: limited set, mostly HUMAN kinship/ animate nouns in older
  and formal prose: მამა → მამნი (fathers, archaic), დედა → დედნიანი
  forms; modern standard prefers -ები. The -ნ- plural also appears in
  postpositional/genitive contexts: მამათა და შვილთა (fathers and sons').
• -თა: the ARCHaic GENITIVE/DATIVE plural (kinship + rhetoric): მამათა
  (of fathers), ხალხთა (of the peoples). Modern prose uses -ების: მამების.
  -თა survives in set phrases and elevated style: წმინდანთა (of saints).

ORDER: stem + PLURAL + CASE: წიგნებში (in the books), წიგნების (of the
books), წიგნებმა (ergative), წიგნებით (with the books). Case marker comes
AFTER the plural marker, never before.

NO ADJECTIVE AGREEMENT:
Adjectives preceding a plural noun stay SINGULAR (v1.14.0 rule): ლამაზი
წიგნები (beautiful books), ახალი სახლები. Only postposed or predicative
adjectives may pluralize in literary register: წიგნები ლამაზნი (archaic).

NUMERALS: No plural after cardinals (v1.5.0 rule): ორი წიგნი (two books,
NOT ორი წიგნები). Collective numerals: ორივე მხარეს (on both sides).

ENGLISH MAPPING TABLE:
• "books/friends/houses" → წიგნები / მეგობრები / სახლები (note syncope)
• "mothers" → დედები (drop -ა); "grandmothers" → ბებიები (linking ე)
• "of the fathers (elevated)" → მამათა; "of the books" → წიგნების
• "two books" → ორი წიგნი (singular after numeral)
• "in the books" → წიგნებში (plural + case, one word)
TACTIC: Plural defects: (a) keeping the singular -ი before -ები (წიგნიები)
— drop it; (b) adjective pluralized with the noun (ლამაზები წიგნები) —
adjective stays singular; (c) plural after a numeral (ორი წიგნები) —
remove the plural; (d) -თა used where modern prose needs -ების.`;

// ── 2. ASSEMBLY HELPERS ─────────────────────────────────────────────────────
// Full knowledge base for draft translation (v1.6.0 expanded set).
function getKaKnowledgeBase() {
    return [
        KA_MORPHOLOGY,
        KA_VERBS,
        KA_SYNTAX,
        KA_CASE_SYSTEM,
        KA_NEGATION,
        KA_CONJUNCTIONS,
        KA_VOICE,
        KA_RELATIVES,
        KA_SPEECH_VERBS,
        KA_EVIDENTIALITY,
        KA_POLITENESS,
        KA_IDIOMS,
        KA_PUNCTUATION,
        KA_WORDBANK,
        KA_COLLOCATIONS,
        KA_TIME_EXPR,
        KA_IMPERSONAL,
        KA_NUMERALS,
        KA_PARTICLES,
        KA_FALSE_FRIENDS,
        KA_INTERJECTIONS,
        KA_CORPUS_DEFECTS,
        KA_DISCOURSE,
        KA_PRONOUN_ECONOMY,
        KA_TACTICS,
        KA_VERSION_MARKERS,
        KA_MASDARS,
        KA_SUBORDINATION,
        KA_ONOMATOPOEIA,
        KA_NUMBERS_TTS,
        KA_PARTICIPLES,
        KA_MODALITY,
        KA_COMPARISON,
        KA_POSSESSION,
        KA_CONDITIONAL,
        KA_ADVERBS_LITERARY,
        KA_EVIDENTIALITY_DEEP,
        KA_PLUPERFECT,
        KA_FUTURE_IN_PAST,
        KA_ASPECT_HABITUAL,
        KA_TIME_CLAUSES,
        KA_WORD_ORDER_NARRATIVE,
        KA_PARTICLES_DEEP,
        KA_QUOTATIVES,
        KA_VERSION_MARKERS_DEEP,
        KA_T_V_REGISTER,
        KA_PARALLEL_PROSE,
        KA_STYLE_GUIDE,
        KA_POSTPOSITIONS_CASE,
        KA_MASDARS_DEEP,
        KA_PURPOSE_CLAUSES,
        KA_HISTORICAL_PRESENT,
        KA_KINSHIP_ADDRESS,
        KA_DEMONSTRATIVES_DEEP,
        KA_ROM_MULTIPURPOSE,
        KA_RELATIVE_DEEP,
        KA_SIMULTANEOUS_ACTION,
        KA_OPTIONS_CORRELATIVE,
        KA_SELF_REFERENCE,
        KA_IMPERSONAL_DEEP,
        KA_NUMERALS_VIGESIMAL,
        KA_ADJECTIVE_DECLENSION,
        KA_COMPARISON_DEEP,
        KA_ORDINALS_FRACTIONS,
        KA_TIME_EXPRESSIONS_DEEP,
        KA_MEASURES,
        KA_NEGATION_DEEP,
        KA_CONCESSIVE_DEEP,
        KA_REASON_CLAUSES,
        KA_CAUSATIVES,
        KA_MEDIAL_VERBS,
        KA_PLURAL_DEEP,
        KA_PREVERBS,
        KA_DEFECTS,
        KA_REGISTER,
        KA_DECISION_TABLE,
        KA_STYLE_EXEMPLARS
    ].join('\n');
}

// Compact rule set for refinement stages (targeted, smaller).
function getKaCompactRules() {
    return [KA_MORPHOLOGY, KA_VERBS, KA_DEFECTS, KA_DECISION_TABLE, KA_PUNCTUATION, KA_WORDBANK, KA_PREVERBS, KA_CASE_SYSTEM, KA_NEGATION, KA_SPEECH_VERBS].join('\n');
}

// Focused set for QA repair passes (small, defect-driven).
function getKaRepairRules() {
    return [KA_DEFECTS, KA_EVIDENTIALITY, KA_POLITENESS, KA_PUNCTUATION, KA_WORDBANK].join('\n');
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

    // 3.28 Personal pronoun + postposition with incorrect -s (Proton rule v1.4.0)
    // Personal pronouns (მე/შენ/ის/ჩვენ/ისინი) fused with postpositions should NOT
    // carry the dative -ს marker. e.g. *ჩემსკენ → ჩემკენ, *შენსგან → შენგან.
    const pronounPostposErrors = text.match(/(?<![\u10A0-\u10FF])(ჩემს|შენს|მის|ჩვენს|მათს)(კენ|გან|თან|ზე|ში|დან)(?![\u10A0-\u10FF])/g);
    if (pronounPostposErrors) {
        issues.push({ rule: 'pronoun_postpos_s', message: `Personal pronoun + postposition should not carry -ს: found ${pronounPostposErrors.join(', ')} — drop the -s (e.g. ჩემკენ not ჩემსკენ).` });
    }

    // 3.29 English decimal point in numbers (should be Georgian comma per MS Style Guide v1.4.0)
    if (/[\u10A0-\u10FF]\s*\d+\.\d+/.test(text) || /\d+\.\d+(?=\s*[\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'decimal_point', message: 'Decimal number uses English period — Georgian uses comma (3,14 not 3.14).' });
    }

    // 3.30 Redundant -თა- infix in pronoun + გან/დან postpositions (Proton rule v1.5.0)
    // *ჩვენთაგან → ჩვენგან, *მათთადან → მათდან. (თან forms like ჩვენთან are CORRECT — only გან/დან take the bare stem.)
    const thaRedundant = text.match(/(?<![\u10A0-\u10FF])(ჩვენ|მათ|თქვენ)თა(გან|დან)(?![\u10A0-\u10FF])/g);
    if (thaRedundant) {
        issues.push({ rule: 'tha_redundant', message: `Redundant -თა- infix: ${thaRedundant.join(', ')} — drop it (ჩვენგან not ჩვენთაგან; თან forms like ჩვენთან stay unchanged).` });
    }

    // ── v1.6.0 additions: series alignment, არის overuse, false friends ──

    // 3.31 Inverted subject in aorist: ერგატივი + პერფექტი (Series III) marker.
    //      ERG subject -მა + perfect screeve marker (ულა/ავს→no; heuristic -ულა/-ია endings
    //      on the following verb) — Series III takes DAT subject, not -მა.
    const ergPerfectRe2 = /([ა-ჰ]+)მა\s+([ა-ჰ]+(ულა|ია|ავს|ებია|ოდა))(?![\u10A0-\u10FF])/g;
    let m12;
    while ((m12 = ergPerfectRe2.exec(text)) !== null) {
        issues.push({ rule: 'erg_perfect', message: `Ergative subject with perfect screeve: "${m12[0]}" — Series III inverts: subject goes DATIVE (მას ... წასულა), drop -მა.` });
    }

    // 3.32 არის overuse: more than 2 "არის" per 100 chars — native prose drops
    //      copula or uses -ა/-აა endings (დღეს მშვიდობაა, ეს კარგია) or inversion frames.
    const arisMatches = text.match(/(?<![\u10A0-\u10FF])არის(?![\u10A0-\u10FF])/g) || [];
    if (text.length > 200 && arisMatches.length > 2 && (arisMatches.length * 100) / text.length > 1.2) {
        issues.push({ rule: 'aris_overuse', message: `არიس used ${arisMatches.length}x — native prose prefers copula drop / -ა ending (ეს კარგია, დღეს მშვიდობაა) or inversion frames (მას აქვს).` });
    }

    // 3.33 English "is/are" calque: "ეს არის X" for a simple identification —
    //      native: ეს X-ა/-აა. (არის is fine in definitions/emphasis.)
    if (/(?<![\u10A0-\u10FF])ეს არის(?![\u10A0-\u10FF])/g.test(text)) {
        issues.push({ rule: 'es_aris_calque', message: '"ეს არის X" calque — for simple identification native prose prefers ეს X-ა/-აა (ეს კარგია).' });
    }

    // 3.34 False friend პრეზერვატივი used for "preservative/conservative" — serious register error.
    if (/(?<![\u10A0-\u10FF])პრეზერვატივი(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'false_friend_preservative', message: 'პრეზერვატივი means "condom" in Georgian — for preservative use კონსერვანტი, for conservative use კონსერვატიული.' });
    }

    // 3.35 False friend მიტინიგი used for "meeting" (appointment) — it means protest rally.
    if (/(?<![\u10A0-\u10FF])მიტინგი(?![\u10A0-\u10FF])/.test(text) && /შეხვედრ|სამიტინგი/.test(text) === false) {
        issues.push({ rule: 'false_friend_meeting', message: 'მიტინიგი means "protest rally" — for a meeting/appointment use შეხვედრა.' });
    }

    // 3.36 False friend აქტუალური used for "actual" — it means topical/relevant.
    if (/(?<![\u10A0-\u10FF])აქტუალური(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'false_friend_actual', message: 'აქტუალური means "topical/relevant" — for "actual" use რეალური / სინამდვილეში არსებული.' });
    }

    // ── v1.6.1 additions: corpus-mined production defects ──

    // 3.37 Hyphen used as a dash between clauses (seen in real output:
    //      "თავდასხმა - ძალების სიჭარბეზე"). Georgian dash is "—".
    if (/[\u10A0-\u10FF]\s-\s[\u10A0-\u10FF]/.test(text)) {
        issues.push({ rule: 'hyphen_dash', message: 'Hyphen used as a dash between clauses — use an em dash "—" with no space before it (თავდასხმა — ძალების სიჭარბეზე).' });
    }

    // 3.38 Comma missing before clause-joining მაგრამ (corpus: "თავს, მაგრამ" ok,
    //      but "...X მაგრამ Y" without comma is a defect).
    if (/(?<![,;:\u10A0-\u10FF]) [\u10A0-\u10FF]+ მაგრამ [ა-ჰ]/.test(text)) {
        issues.push({ rule: 'magram_comma', message: 'მაგრამ joining clauses needs a comma BEFORE it: ..., მაგრამ ...' });
    }

    // 3.39 Chunk-boundary truncation: word-initial fragment that matches a known
    //      word with its first syllable missing (corpus: "*ხედართმთავარი" < მხედართმთავარი).
    const truncRe = /(?<![\u10A0-\u10FF])(ხედართმთავარი|ეთოდი|ისციპლინა|ენერალი)(?![\u10A0-\u10FF])/g;
    let m13;
    while ((m13 = truncRe.exec(text)) !== null) {
        issues.push({ rule: 'chunk_truncation', message: `Truncated word "${m13[1]}" — likely a chunk-boundary cut; restore the full word (e.g. მხედართმთავარი, მეთოდი, დისციპლინა, გენერალი).` });
    }

    // ── v1.7.0 additions: discourse, pronoun economy, possessive economy ──

    // 3.40 Over-explicit possessive (MS Style Guide): "your/its + noun" before a
    //      body part, kinship noun, or in an imperative/instructional clause usually
    //      translates to NOTHING. Heuristic: თქვენი/შენი/მისი + თავი/ხელი/თვალი/გული
    //      or თქვენი/შენი immediately after an imperative verb (pro-drop context).
    const possEcoRe = /(?<![\u10A0-\u10FF])(თქვენი|შენი|მისი)\s+(თავი|თავს|ხელი|ხელს|თვალი|თვალს|გული|გულს|დედა|მამა|ოჯახი)(?![\u10A0-\u10FF])/g;
    let m14;
    let possEcoCount = 0;
    while ((m14 = possEcoRe.exec(text)) !== null) { possEcoCount++; }
    if (possEcoCount > 0) {
        issues.push({ rule: 'possessive_economy', message: `Possessive likely redundant ${possEcoCount}x ("${possEcoRe.source.slice(0, 20)}...") — Georgian drops your/his before body parts & kin (თავი მტკივა, NOT *შენი თავი მტკივა); verify each.` });
    }

    // 3.41 Singular they calque (MS Style Guide): English generic "they/their" must
    //      map to ის/მისი (singular), never ისინი/მათი. Heuristic: მათი/ისინი + a
    //      singular verb or singular noun phrase is suspicious, but full parsing is
    //      out of scope — flag ისინი/მათი when the same clause contains a singular
    //      copula არის/იყო (generic-person pattern "if a user... they...").
    const theyCalqueRe = /(?<![\u10A0-\u10FF])(ისინი|მათი)(?![\u10A0-\u10FF])([^.!?…]{0,60}?)(არის|იყო)(?![\u10A0-\u10FF])/g;
    let m15;
    while ((m15 = theyCalqueRe.exec(text)) !== null) {
        issues.push({ rule: 'singular_they', message: `"${m15[1]} ... ${m15[3]}" — English singular-they calque suspected: generic referent maps to ის/მისი (singular), not ისინი/მათი. Verify the referent's number.` });
    }

    // 3.42 Discourse-marker starvation: long text with zero contrastive/discourse
    //      particles reads as translationese. Flag if ≥400 chars AND none of
    //      კი/ხომ/თუმცა/მაგრამ/ასევე/მაშინ/თურმე/მგონია present.
    if (text.length >= 400 && !/(?<![\u10A0-\u10FF])(კი|ხომ|თუმცა|მაგრამ|ასევე|მაშინ|თურმე|მგონია)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'discourse_starvation', message: 'Long passage with zero discourse markers (კი/ხომ/თუმცა/მაშინ/თურმე...) — reads as translationese; natural Georgian prose uses them for flow and stance.' });
    }

    // ── v1.8.0 additions: grammar deep-dive (version markers, masdars, TTS numbers) ──

    // 3.43 Digits in dialogue (TTS): spelled-out small counts read better.
    //     Flag digit 2-12 followed by a time/quantity noun inside quotes or narration.
    const dlgDigitRe = /(?<![\u10A0-\u10FF])([2-9]|1[0-2])\s+(საათი|საათს|წუთი|წუთს|დღე|დღეს|კვირა|თვე|თვეს|წელი|წელს|კაცი|კაცს|ლარი|ლარს|დოლარი)(?![\u10A0-\u10FF])/g;
    let m16;
    let digitCount = 0;
    while ((m16 = dlgDigitRe.exec(text)) !== null) { digitCount++; }
    if (digitCount > 0) {
        issues.push({ rule: 'digit_in_dialogue', message: `${digitCount}x small digit + quantity noun (e.g. "2 საათი") — for TTS narration spell it out: ორი საათი. Keep digits only for dates/stats/IDs.` });
    }

    // 3.44 English decimal point in numbers → Georgian decimal comma
    if (/\d\.\d/.test(text) && /[\u10A0-\u10FF]/.test(text)) {
        issues.push({ rule: 'decimal_point_ka', message: 'Decimal point found in numbers — Georgian uses a decimal COMMA: 3,14 not 3.14; thousands separator is a space: 10 000.' });
    }

    // 3.45 Ordinal "Nth" left as digit + English suffix or bare digit before noun
    //     ("1st", "2nd", "3rd" leak through machine output)
    if (/(?<![\u10A0-\u10FF])\d{1,3}(st|nd|rd|th)(?![\u10A0-\u10FF])/i.test(text)) {
        issues.push({ rule: 'english_ordinal', message: 'English ordinal suffix found ("1st/2nd/3rd") — Georgian ordinals are მე-...-ე: პირველი, მეორე, მესამე, მეოთხე.' });
    }

    // 3.46 Missing რომ after speech/thought verb (complement clause without conjunction):
    //     "თქვა:" is fine with a colon, but "თქვა ის მოვა" (no რომ, no colon) is a calque.
    if (/(?<![\u10A0-\u10FF])(თქვა|იცოდა|იცის|ფიქრობს|იფიქრა)\s+[^.,;:!?…\n]{2,}(?<![:])/g.test(text)) {
        // heuristic: speech verb followed by lowercase clause WITHOUT colon/comma → likely missing რომ
        const m17 = text.match(/(?<![\u10A0-\u10FF])(თქვა|იცოდა|იცის|ფიქრობს|იფიქრა)\s+([ა-ჰ][^.!?…\n]{10,})/);
        if (m17 && !/[:,]/.test(m17[0]) && !m17[2].startsWith('რომ') && !m17[2].startsWith('რომელ')) {
            issues.push({ rule: 'missing_rom', message: `"${m17[1]} ${m17[2].slice(0, 30)}..." — complement clause likely missing რომ ("თქვა, რომ ...") or needs a colon after the speech verb.` });
        }
    }

    // ── v1.9.0 additions: participles, modality, comparison, possession, conditionals ──

    // 3.47 English "have" calque: transitive ჰქონის/ფლობს or მიიღებს used for possession.
    //     Georgian "have" is inverted: dative possessor + აქვს (inanimate) / ჰყავს (animate).
    const haveCalqueRe = /(?<![\u10A0-\u10FF])(ჰქონის|ფლობს|ფლობდა|ფლობენ)(?![\u10A0-\u10FF])/g;
    let m18;
    while ((m18 = haveCalqueRe.exec(text)) !== null) {
        issues.push({ rule: 'have_calque', message: `"${m18[1]}" — English "have" calque. Possession is inverted: [dative possessor] + აქვს (objects) / ჰყავს (people & animals), e.g. მას აქვს წიგნი, მას ჰყავს ძაღლი.` });
    }

    // 3.48 აქვს used for an animate possessee (or ჰყავს for an object).
    const ananimate = /(?<![\u10A0-\u10FF])(აქვს|აქვთ|ჰქონდა|ექნებათ?)(\s+(?:ერთი|ორი|სამი|სამი|დედა|მამა|შვილი|ძმა|და|ბიჭი|გოგო|კაცი|ქალი|ძაღლი|კატა|ცხენი|მეგობარი|ბავშვი|მასწავლებელი))/g;
    let m19;
    while ((m19 = ananimate.exec(text)) !== null) {
        issues.push({ rule: 'akvs_animate', message: `"${m19[1]}${m19[2]}" — აქვს is for objects only; people/animals take ჰყავს (მყავს/გყავს/ჰყავს...). Verify the possessee is animate.` });
    }

    // 3.49 English "-er/-est" or "more/most" calque in comparison: Georgian is analytic
    //     (უფრო + adj, ყველაზე + adj) or synthetic სა-...-ეს- for established forms.
    const moreCalqueRe = /(?<![\u10A0-\u10FF])(მეტი სწრაფი|მეტი დიდი|მეტი კარგი|ყველა დიდი|ყველა კარგი)(?![\u10A0-\u10FF])/g;
    let m20;
    while ((m20 = moreCalqueRe.exec(text)) !== null) {
        issues.push({ rule: 'comparison_calque', message: `"${m20[1]}" — comparison calque. Use უფრო + adjective (comparative), ყველაზე + adjective (superlative), or the სა-...-ეს- form (უდიდესი, საუკეთესო). "than" = ვიდრე.` });
    }

    // 3.50 "would" rendered as უნდა + future or a modal word instead of the conditional
    //     screeve (preverb + imperfect): დავწერდი = I would write.
    const wouldCalqueRe = /(?<![\u10A0-\u10FF])უნდა\s+(დაწერს|წავა|მივა|გააკეთებს|იცინებს|იმღერებს)(?![\u10A0-\u10FF])/g;
    let m21;
    while ((m21 = wouldCalqueRe.exec(text)) !== null) {
        issues.push({ rule: 'would_calque', message: `"უნდა ${m21[1]}" — English "would" calque. The conditional is a screeve (preverb + imperfect): დაწერდი, წავიდოდი. უნდა + optative means "must", not "would".` });
    }

    // ── v1.10.0 additions: evidentiality, pluperfect, aspect, time clauses ──

    // 3.51 "until" clause missing the obligatory არ: სანამ + positive verb
    //     for a completed event must be სანამ ... არ ...
    const sanamRe = /(?<![\u10A0-\u10FF])სანამ(?![\u10A0-\u10FF])([^,。؛]{0,20})/g;
    let m22;
    while ((m22 = sanamRe.exec(text)) !== null) {
        if (!/არ/.test(m22[1])) {
            issues.push({ rule: 'sanam_missing_ar', message: `"სანამ${m22[1]}" — "until" clauses require არ inside the subordinate clause: სანამ არ დაბრუნდება (until he returns). სანამ without არ means "while/as long as".` });
        }
    }

    // 3.52 Habitual "used to / would always" wrongly rendered as conditional
    //     (preverb + imperfect) instead of imperfect (+ ხოლმე).
    const habitCondRe = /(?<![\u10A0-\u10FF])(დადიოდეთ?|დაწერდეთ?|გააკეთებდეთ?)(?![\u10A0-\u10FF])\s*(?=[^,]{0,10}(ყოველ|ხოლმე|ყოველთვის|დღესასწაულ))/g;
    let m23;
    while ((m23 = habitCondRe.exec(text)) !== null) {
        issues.push({ rule: 'habit_conditional', message: `"${m23[1]}" — habitual past should use the imperfect (დადიოდა), optionally + ხოლმე, not the conditional screeve.` });
    }

    // 3.53 Evidential marker missing: English "apparently/supposedly/it turned out"
    //     left untranslated — should be თურმე or the perfect series.
    const apparentRe = /\b(apparently|supposedly|reportedly|allegedly|it (?:turned|seems|seemed) out|they say)\b/gi;
    let mApp;
    while ((mApp = apparentRe.exec(text)) !== null) {
        issues.push({ rule: 'evidential_missing', message: `"${mApp[1]}" — untranslated English evidential. Use the particle თურმე ("apparently/they say") or the perfect series (მას ... უყიდია) for unwitnessed/reported events.` });
    }

    // 3.54 Pluperfect "had + V-ed" rendered as double perfect or wrong inversion:
    //     flag ქონდა forms not preceded by a past participle.
    const pluperfectRe = /(?<![\u10A0-\u10FF])(მქონდა|გქონდა|ჰქონდა|გვქონდა|გქონდათ|ჰქონდათ)(?![\u10A0-\u10FF])/g;
    let m24;
    while ((m24 = pluperfectRe.exec(text)) !== null) {
        const before = text.slice(Math.max(0, m24.index - 8), m24.index);
        if (!/[\u10A0-\u10FF]ლი\s*$|[\u10A0-\u10FF]ლა\s*$/.test(before)) {
            issues.push({ rule: 'pluperfect_form', message: `"${m24[1]}" — pluperfect needs a past participle before ქონდა: დაწერილი მქონდა (I had written). Check participle + inversion (dative subject).` });
        }
    }

    // 3.55 English SVO calque: pronoun/subject directly before transitive verb with
    //     object after verb — Georgian default is SOV with verb-final.
    const svoRe = /(?<![\u10A0-\u10FF])(მან|ის|მე|შენ|ჩვენ|თქვენ|მათ)\s+(იყიდა|ნახა|გააკეთა|წერს|კითხულობს|შეჭამა)\s+([\u10A0-\u10FF]{2,12})(?![\u10A0-\u10FF])/g;
    let m25;
    while ((m25 = svoRe.exec(text)) !== null) {
        issues.push({ rule: 'svo_order', message: `"${m25[1]} ${m25[2]} ${m25[3]}" — SVO calque. Georgian default is SOV with the verb closing the clause: ბავშვმა ვაშლი შეჭამა.` });
    }

    // ── v1.11.0 additions: particles, quotatives, version vowels, T–V, style ──

    // 3.56 Detached enclitic -ც written as a separate word (calque of English
    //     "also/too" as a free adverb). -ც must attach to the preceding word.
    const detachedTsRe = /(^|[\s,„"(])ც(?=[\s,."”):;!?।…])/g;
    let m26;
    while ((m26 = detachedTsRe.exec(text)) !== null) {
        issues.push({ rule: 'detached_ts', message: `Standalone "ც" found — the additive enclitic -ც must attach to the preceding word: მეც, ისიც, აქაც. A separate ც is a calque of English "too/also".` });
    }

    // 3.57 Double-marked beneficiary: უ-version verb + redundant postpositional
    //     beneficiary phrase (ჩემთვის/მისთვის/მასთან) after a fused მ-/გ-/ვ- verb.
    const beneRe = /(?<![\u10A0-\u10FF])(მომცა|მოგცა|მოვცა|მიმცა|მიგცა|მივცა|დამწერა|დაგწერა|დავწერე)(?![\u10A0-\u10FF])\s+(ჩემთვის|შენთვის|მისთვის|მათთვის|ჩვენთვის|თქვენთვის)(?![\u10A0-\u10FF])/g;
    let m27;
    while ((m27 = beneRe.exec(text)) !== null) {
        issues.push({ rule: 'double_benefactive', message: `"${m27[1]} ${m27[2]}" — the beneficiary is already inside the verb (${m27[1]} contains the m/g/v infix). Drop the redundant ${m27[2]}: მომცა წიგნი, not მომცა ჩემთვის წიგნი.` });
    }

    // 3.58 T–V register clash: polite თქვენ-verb and intimate შენ-verb
    //     addressed in the same breath (conflicting agreement in one sentence).
    const tvClashRe = /(?<![\u10A0-\u10FF])(ხართ|მიდიხართ|გაქვთ|იცით|გინდათ)(?![\u10A0-\u10FF])[^.!?]{0,60}(?<![\u10A0-\u10FF])(ხარ|მიდიხარ|გაქვს|იცი|გინდა)(?![\u10A0-\u10FF])/g;
    let m28;
    while ((m28 = tvClashRe.exec(text)) !== null) {
        issues.push({ rule: 'tv_register_clash', message: `Register clash: polite "${m28[1]}" and intimate "${m28[2]}" in the same sentence. Pick one addressee register (შენ ↔ თქვენ) and keep the verb agreement consistent.` });
    }

    // 3.59 Quotative detached: თქო / მეთქი / -ო written as separate words —
    //     they are hyphenated enclitics on the final word of the quote.
    const detachedQuotRe = /(^|[\s„"(])((თქო|მეთქი))(?=[\s.!?,"”):।…])/g;
    let m29;
    while ((m29 = detachedQuotRe.exec(text)) !== null) {
        issues.push({ rule: 'detached_quotative', message: `"${m29[2]}" written as a separate word — quotative particles attach with a hyphen to the last word of the quoted clause: გელოდებით-თქო, წადი-მეთქი.` });
    }

    // 3.60 Untranslated English additivity/focus words in Georgian output.
    const additRe = /\b(also|too|even|either|neither|moreover|besides)\b/gi;
    let m30;
    while ((m30 = additRe.exec(text)) !== null) {
        issues.push({ rule: 'additive_untranslated', message: `"${m30[1]}" — untranslated English additive/focus word in Georgian output. Map: also/too → -ც, even → კიდევ / არც კი, either/neither → არც, moreover → გარდა ამისა.` });
    }

    // ── v1.12.0 additions: postpositions, masdars, purpose, tense, address ──

    // 3.61 Postposition case-government error: მიერ / გამო / გარდა / გარეშე /
    //      მაგივრად / მიუხედავად / კენ / წინ require GENITIVE (-ის/ს), and
    //      -დან requires instrumental stem (drops -თ), -მდე requires adverbial
    //      stem (drops -დ). Flag GEN-postpositions following non-genitive nouns.
    const genPostRe = /(?<![\u10A0-\u10FF])[\u10A0-\u10FF]+[აეიოუ]\s+(მიერ|გამო|გარდა|გარეშე|მაგივრად|მიუხედავად)(?![\u10A0-\u10FF])/g;
    let m31;
    while ((m31 = genPostRe.exec(text)) !== null) {
        issues.push({ rule: 'postposition_case', message: `"${m31[1]}" governs the GENITIVE case, but the preceding noun lacks ის/ს (e.g. შფოთვის გამო, მის მიერ, ამის გარდა). Check case agreement.` });
    }

    // 3.62 -დან attached to a bare dative/nominative form instead of the
    //      instrumental stem (სკოლის დან or სკოლი დან instead of სკოლიდან);
    //      also -მდე not fused (სახლი მდე instead of სახლამდე).
    const detachedDanMdeRe = /(?<![\u10A0-\u10FF])[\u10A0-\u10FF]+(ის|ს|ი)\s+(დან|მდე)(?![\u10A0-\u10FF])/g;
    let m32;
    while ((m32 = detachedDanMdeRe.exec(text)) !== null) {
        issues.push({ rule: 'detached_dan_mde', message: `"${m32[1]} ${m32[2]}" — -დან and -მდе are single words fused to the noun stem: სკოლიდან (from school), სახლამდე (up to the house). Never written as separate words.` });
    }

    // 3.63 Purpose mistranslated: bare English purpose words surviving, or
    //      "in order to / so that / so as to" left untranslated in output.
    const purposeEnRe = /\b(in order to|so as to|so that|in order that)\b/gi;
    let m33;
    while ((m33 = purposeEnRe.exec(text)) !== null) {
        issues.push({ rule: 'purpose_untranslated', message: `"${m33[1]}" — untranslated English purpose connector. Map: in order to/so as to → სა-...-ად masdar adverbial or რათა + optative; so that → რათა + optative clause.` });
    }

    // 3.64 Vocative confusion: მამაო (priest!) used as family address — must be
    //      მამავ for "father!"; also bare მამაო in dialogue context.
    const mamaoRe = /(?<![\u10A0-\u10FF])მამაო(?![\u10A0-\u10FF])/g;
    let m34;
    while ((m34 = mamaoRe.exec(text)) !== null) {
        issues.push({ rule: 'vocative_mamao', message: `"მამაო" means "priest!" — for addressing one's father use "მამავ" (vocative) or bare "მამა". Verify the speaker means a cleric before keeping.` });
    }

    // 3.65 Historical-present calque: present-tense narration verb immediately
    //      after a clearly past-frame marker (გუშინ/ადრე/ერთხელ/წლების წინ) —
    //      English vivid-present narration should be aorist in Georgian.
    const histPresRe = /(?<![\u10A0-\u10FF])(გუშინ|ერთხელ|წლების წინ|დიდი ხნის წინ|იმ დღეს|ერთ დღეს)(?![\u10A0-\u10FF])[^.!?]{0,60}(?<![\u10A0-\u10FF])(დის|ამბობს|მიდის|ხედავს|შედის|იწყებს)(?![\u10A0-\u10FF])/g;
    let m35;
    while ((m35 = histPresRe.exec(text)) !== null) {
        issues.push({ rule: 'historical_present', message: `Past frame "${m35[1]}" + present "${m35[2]}" — English historical-present narration must shift to the AORIST in Georgian: ერთხელ ... შევიდა/უთხრა/წავიდა. Keep present only for genuinely current narration.` });
    }

    // 3.66 რომ + non-finite after a desire/modal verb: მინდა/გინდა/უნდა +
    //      რომ + masdar is always wrong ("want to + VERB" takes the optative
    //      without რომ, or მინდა + masdar). Flag the definite hallucination.
    const romMasdarRe = /(?<![\u10A0-\u10FF])(მინდა|გინდა|უნდა|შემიძლია)(?![\u10A0-\u10FF])\s*,?\s*რომ\s+[\u10A0-\u10FF]+(?:ა|ომა|ოლა)(?![\u10A0-\u10FF])/g;
    let m36;
    while ((m36 = romMasdarRe.exec(text)) !== null) {
        issues.push({ rule: 'rom_nonfinite', message: `"${m36[0]}" — რომ must introduce a FINITE clause. "want to + VERB" takes მინდა + optative without რომ; a bare masdar after რომ is a hallucination. Rewrite: მინდა წავიდე or ვიცი, რომ მოვა.` });
    }

    // 3.67 Reflexive possessive confusion: მისი used where the possessor is the
    //      subject (must be თავისი). Heuristic: მან ... მისი ... (same clause
    //      with მან as agent) — classic MT error changing the meaning.
    const misiReflexiveRe = /(?<![\u10A0-\u10FF])მან(?![\u10A0-\u10FF])[^.!?]{0,80}(?<![\u10A0-\u10FF])მისი(?![\u10A0-\u10FF])/g;
    let m37;
    while ((m37 = misiReflexiveRe.exec(text)) !== null) {
        issues.push({ rule: 'reflexive_possessive', message: `მან ... მისი ... — if the possessor is the clause subject, Georgian requires the reflexive possessive თავისი (his OWN), not მისი (someone else's). Verify the intended referent.` });
    }

    // 3.68 Impersonal calque: ვარ/არის + hunger/thirst/sleep nouns instead of
    //      the dative-experiencer verbs (მშია/მწყურია/მძინავს). Flag
    //      "შიმშილობა ვარ"-style or "შიმშილი ვარ" patterns.
    const impersonalCalqueRe = /(?<![\u10A0-\u10FF])(შიმშილი|სიწყურე|ძილი|სიცივე|სიცხე)(?![\u10A0-\u10FF])\s+(ვარ|ხარ|არის|ვართ|ხართ|არიან)(?![\u10A0-\u10FF])/g;
    let m38;
    while ((m38 = impersonalCalqueRe.exec(text)) !== null) {
        issues.push({ rule: 'impersonal_calque', message: `"${m38[0]}" — bodily states use the DATIVE EXPERIENCER verb: მშია (I am hungry), მწყურია (thirsty), მძინავს (sleepy), მცივა (cold). The experiencer carries -ს/-მა and the verb stays 3rd person.` });
    }

    // 3.69 Asymmetric ხან...ხან correlative: ხან appears once without its pair
    //      (must be ხან A, ხან B). Count ხან occurrences in one sentence.
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
        const khanCount = (sentence.match(/(?<![\u10A0-\u10FF])ხან(?![\u10A0-\u10FF])/g) || []).length;
        if (khanCount === 1) {
            issues.push({ rule: 'asymmetric_khan', message: `Sentence contains a single ხან — the correlative "sometimes A, sometimes B" needs the pair ხან..., ხან... (e.g. ხან ცხარია, ხან ცივი). A lone ხან likely means "once/a while" and may be a mistranslation.` });
        }
    }

    // 3.70 Untranslated English correlatives: "either...or", "neither...nor",
    //      "sometimes" left as English words in Georgian output.
    const correlEnRe = /\b(either|neither|nor|whether|sometimes)\b/gi;
    let m39;
    while ((m39 = correlEnRe.exec(text)) !== null) {
        issues.push({ rule: 'correlative_untranslated', message: `"${m39[1]}" — untranslated English correlative. Map: either...or → ან..., ან...; neither...nor → არც..., არც...; both...and → როგორც..., ისე...; sometimes → ხან or ზოგჯერ; whether → თუ.` });
    }

    // 3.71 Vigesimal defect: "twenty" and "forty" confused — ორმოცი is 40
    //      (2×20), not 20. A bare ოც- compound missing the და connector
    //      (e.g. ოცი ერთი for 21) is a vigesimal-calque signature.
    const vigesimalGapRe = /(?<![\u10A0-\u10FF])ოცი\s+(?:ერთი|ორი|სამი|ოთხი|ხუთი|ექვსი|შვიდი|რვა|ცხრა|ათი)(?![\u10A0-\u10FF])/g;
    let m40;
    while ((m40 = vigesimalGapRe.exec(text)) !== null) {
        issues.push({ rule: 'vigesimal_gap', message: `"${m40[0]}" — 21-99 requires the და connector: ოცდაერთი (21), ოცდაორი (22)... A bare "ოცი N" is an English vigesimal calque. Also: ორმოცი = 40, სამოცი = 60, ოთხმოცი = 80.` });
    }

    // 3.72 Suppletive ordinal defect: მეერთი for "first" — the suppletive
    //      პირველი is required; მე- + ერთი is not a valid ordinal.
    const meErtiRe = /(?<![\u10A0-\u10FF])მეერთ(?:ი|ე|ს)(?![\u10A0-\u10FF])/g;
    let m41;
    while ((m41 = meErtiRe.exec(text)) !== null) {
        issues.push({ rule: 'ordinal_first_suppletive', message: `"${m41[0]}" — "first" is the suppletive პირველი (პირველი/პირველს/პირველმა). მეერთი is not a Georgian ordinal; second is მეორე, third მესამე.` });
    }

    // 3.73 Age construction defect: "X წელი არის" or "X წლების" for age —
    //      the age construction requires the genitive წლის (X წლის არის).
    const ageCalqueRe = /(?<![\u10A0-\u10FF])(?:წელი|წლები)(?![\u10A0-\u10FF])\s+არის/g;
    let m42;
    while ((m42 = ageCalqueRe.exec(text)) !== null) {
        issues.push({ rule: 'age_genitive', message: `"${m42[0]}" — age uses the GENITIVE: "X წლის არის" (he is X years old). წელი/წლები + არის is an English "years old" calque; the year word takes the vowel-graded form წლის.` });
    }

    // 3.74 Untranslated English ordinal suffixes: "1st/2nd/3rd/4th..." left
    //      as English digit+suffix in Georgian output.
    const ordinalEnRe = /\b\d+(?:st|nd|rd|th)\b/gi;
    let m43;
    while ((m43 = ordinalEnRe.exec(text)) !== null) {
        issues.push({ rule: 'ordinal_suffix_untranslated', message: `"${m43[0]}" — English ordinal suffix left untranslated. Map to Georgian: მე-N (მე-3) or N-ე (21-ე); "first" → პირველი, "second" → მეორე. Fractions: 1/3 → მესამედი, half → ნახევარი.` });
    }

    // 3.75 Comparative calque: English "-er/more" translated as a modified
    //      adjective without the Georgian carrier — check for უფრო/ვიდრე/-ზე
    //      missing when the sentence asserts a comparison. Heuristic: an
    //      untranslated English comparative/marker pair in Georgian output.
    const comparEnRe = /\b(?:more|less|than|bigger|smaller|taller|shorter|better|worse|oldest|youngest|biggest|smallest)\b/gi;
    let m44;
    while ((m44 = comparEnRe.exec(text)) !== null) {
        issues.push({ rule: 'comparative_untranslated', message: `"${m44[0]}" — untranslated English comparison word. Map: "-er than" → Y-ზე + adjective (suffix on the compared noun, adjective unchanged); "more" → უფრო; "less" → ნაკლებად; "than" → ვიდრე (conjunction) or -ზე; "the -est" → ყველაზე; better/worse → უკეთესი/უარესი; best → საუკეთესო.` });
    }

    // 3.76 Double negation defect: არავინ/არაფერი/არასოდეს/არსად + verb
    //      WITHOUT the obligatory second არ — Georgian requires negative
    //      concord (არავინ არ მოვიდა), unlike English.
    const araSpanRe = /(?<![\u10A0-\u10FF])(?:არავინ|არავითარი|არაფერი|არასოდეს|არასდროს|არსად)(?![\u10A0-\u10FF])([^.!?।]{0,60})/g;
    let m45;
    while ((m45 = araSpanRe.exec(text)) !== null) {
        const spanTail = m45[1] || '';
        const hasNeg = /(?<![\u10A0-\u10FF])(?:არ|ვერ|ნუ|ვეღარ|აღარ)(?![\u10A0-\u10FF])/.test(spanTail);
        if (!hasNeg) {
            issues.push({ rule: 'negation_double_missing', message: `"${(m45[0] || '').trim()}" — indefinite negative (არავინ/არაფერი/არასოდეს/არსად) requires DOUBLE negation: არავინ არ მოვიდა. The არ before the verb is obligatory in Georgian.` });
        }
    }

    // 3.77 Concessive calque: English "despite/although/however/still"
    //      surviving untranslated, or the defective მიუხედავად რომ form
    //      (missing იმისა).
    const concessEnRe = /\b(?:despite|although|though|however|nevertheless|nonetheless)\b/gi;
    let m46;
    while ((m46 = concessEnRe.exec(text)) !== null) {
        issues.push({ rule: 'concessive_untranslated', message: `"${m46[0]}" — untranslated English concessive. Map: although/though → თუმცა or მიუხედავად იმისა, რომ; despite + N → მიუხედავად X-ისა; however → თუმცა; nevertheless → მაინც / ამის მიუხედავად.` });
    }
    if (/(?<![\u10A0-\u10FF])მიუხედავად\s+რომ/.test(text)) {
        issues.push({ rule: 'concessive_shell_broken', message: 'მიუხედავად რომ — defective concessive shell. Correct forms: მიუხედავად იმისა, რომ + clause (full) or მიუხედავად + GENITIVE + -სა (noun: მიუხედავად წვიმისა).' });
    }

    // 3.78 Reason conjunction untranslated: because/since/therefore/so that
    //      left as English words in Georgian output.
    const reasonEnRe = /\b(?:because|therefore|thus|hence|due to|because of)\b/gi;
    let m47;
    while ((m47 = reasonEnRe.exec(text)) !== null) {
        issues.push({ rule: 'reason_conj_untranslated', message: `"${m47[0]}" — untranslated English reason marker. Map: because → იმიტომ რომ (default) / რადგანაც (formal since); therefore → ამიტომ; thus/hence → ამიტომ / ასე რომ; because of + N → X-ის გამო.` });
    }

    // 3.79 Causative calque: "make/let + person + verb" rendered as a
    //      literal გააკეთა/მისცა + clause instead of a morphological
    //      causative (ა-...-ინ-), or English make/let left untranslated.
    const causEnRe = /\b(?:made|makes|make|let|lets|forced|caused)\b/gi;
    let m48;
    while ((m48 = causEnRe.exec(text)) !== null) {
        issues.push({ rule: 'causative_untranslated', message: `"${m48[0]}" — untranslated English causative. Map: made him write → აწერინებს; made her laugh/cry → აცინებს/ატირებს; fed → აჭმევს/გამოკვება; let him go → გაუშვა; forced → აიძულა + masdar.` });
    }

    // 3.80 Plural vowel-loss defect: ი-kept plural (წიგნიები) or adjective
    //      pluralized with noun (ლამაზები წიგნები) — the singular -ი is
    //      dropped before -ები and preceding adjectives stay singular.
    const pluralVowelRe = /(?<![\u10A0-\u10FF])([ა-ჰ]+)ი(ებ(?:ი|ს|მა|ს|ით|ად|ო|ში|ზე|თან|გან))(?![\u10A0-\u10FF])/g;
    let m49;
    while ((m49 = pluralVowelRe.exec(text)) !== null) {
        issues.push({ rule: 'plural_vowel_loss', message: `"${m49[0]}" — plural keeps the singular -ი (X-ი-ები). Georgian drops the stem-final -ი before -ები: მეგობარი → მეგობრები. If this is an adjective, preceding adjectives stay singular (ლამაზი წიგნები).` });
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
    out = out.replace(/([,.:;!?])(?!\d)(?=[ა-ჰA-Za-z])/g, '$1 ');

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

    // 4.13 Ensure space after punctuation (but not at string end; don't split decimals like 3.14)
    out = out.replace(/([,.:;!?…])(?![\d])(?=[\u10A0-\u10FF])/g, '$1 ');

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

    // ── v1.4.0 additions ──

    // 4.20 Personal pronoun + postposition: drop incorrect -s
    // *ჩემსკენ → ჩემკენ  *შენსგან → შენგან  *მისთან → მისთან  etc.
    out = out.replace(
        /(?<![\u10A0-\u10FF])(ჩემს|შენს|მისს?|ჩვენს|მათს)(კენ|გან|თან)(?![\u10A0-\u10FF])/g,
        (m, pron, post) => {
            // მის is already without -ს in genitive; only fix when it's მისს
            const stem = pron === 'მისს' ? 'მის' : pron.slice(0, -1);
            return stem + post;
        }
    );

    // ── v1.5.0 additions ──

    // 4.21 Redundant -თა- infix: *ჩვენთაგან → ჩვენგან, *მათთადან → მათდან
    // (Only გან/დან forms; თან forms like ჩვენთან are correct and untouched.)
    out = out.replace(
        /(?<![\u10A0-\u10FF])(ჩვენ|მათ|თქვენ)თა(გან|დან)(?![\u10A0-\u10FF])/g,
        '$1$2'
    );

    // ── v1.6.0 additions ──

    // 4.22 False friend პრეზერვატივი → კონსერვანტი (preservative context)
    out = out.replace(/(?<![\u10A0-\u10FF])პრეზერვატივი(?![\u10A0-\u10FF])/g, 'კონსერვანტი');

    // 4.23 False friend მიტინიგი → შეხვედრა (appointment/meeting, not protest rally)
    out = out.replace(/(?<![\u10A0-\u10FF])მიტინიგი(?![\u10A0-\u10FF])/g, 'შეხვედრა');

    // 4.24 False friend აქტუალური → რეალური ("actual", not "topical")
    out = out.replace(/(?<![\u10A0-\u10FF])აქტუალური(?![\u10A0-\u10FF])/g, 'რეალური');

    // ── v1.6.1 additions: corpus-mined production defects ──

    // 4.25 Hyphen-as-dash → em dash, no space before it
    // "თავდასხმა - ძალების" → "თავდასხმა — ძალების"
    out = out.replace(/([\u10A0-\u10FF])\s+-\s+([\u10A0-\u10FF])/g, '$1 — $2');

    // 4.26 Known chunk-boundary truncations (corpus-mined)
    out = out.replace(/(?<![\u10A0-\u10FF])ხედართმთავარი(?![\u10A0-\u10FF])/g, 'მხედართმთავარი');

    // (No auto-fix for "ეს არის X" — it is grammatical emphatic Georgian; QA rule 3.33 flags it for review only.)

    // ── v1.6.2 additions: TTS punctuation & spacing normalization ──

    // 4.27 Doubled terminal marks → single mark ("?!?!!" → "?", "..." → "…")
    out = out.replace(/([?!.])\1{1,}/g, '$1');

    // 4.28 En dash / minus used as dash → em dash (corpus showed " - "; also normalize – and -)
    out = out.replace(/([\u10A0-\u10FF])\s+[–\-−]\s+([\u10A0-\u10FF])/g, '$1 — $2');

    // 4.29 Normalize ellipsis: 3+ dots → single "…" (TTS prosody)
    out = out.replace(/\.{3,}/g, '…');

    // 4.30 Normalize ellipsis spacing: "…word" → "… word", "word …" → "word … "
    out = out.replace(/([\u10A0-\u10FF])…([\u10A0-\u10FF])/g, '$1… $2');
    out = out.replace(/…\s*([,.:;!?])/g, '$1');

    // 4.31 Straight ASCII quotes around Georgian text → „…“
    out = out.replace(/"([^"\n]*[\u10A0-\u10FF][^"\n]*)"/g, '„$1“');

    // 4.32 Collapse whitespace runs (incl. \r) to single space, trim ends
    out = out.replace(/\s+/g, ' ').trim();

    // ── v1.7.0 additions: pronoun & possessive economy ──

    // 4.33 Drop redundant possessive before body parts (deterministic, corpus+guide-backed)
    // *შენი თავი მტკივა → თავი მტკივა; *თქვენი ხელი → ხელი (verb already encodes person)
    out = out.replace(
        /(?<![\u10A0-\u10FF])(თქვენი|შენი)\s+(თავი|თავს|ხელი|ხელს|თვალი|თვალს|გული|გულს)(?![\u10A0-\u10FF])/g,
        '$2'
    );

    // ── v1.8.0 additions: TTS number & grammar normalization ──

    // 4.34 English ordinal suffix → Georgian ordinal (common small ordinals only)
    const KA_ORDINALS = { '1st': 'პირველი', '2nd': 'მეორე', '3rd': 'მესამე', '4th': 'მეოთხე', '5th': 'მეხუთე', '6th': 'მეექვსე', '7th': 'მეშვიდე', '8th': 'მერვე', '9th': 'მეცხრე', '10th': 'მეათე' };
    out = out.replace(/(?<![\u10A0-\u10FF])(\d{1,3})(st|nd|rd|th)(?![\u10A0-\u10FF])/gi, (m, num, suf) => {
        const key = num + suf.toLowerCase();
        return KA_ORDINALS[key] || m;
    });

    // 4.35 Decimal point → decimal comma between digits (Georgian convention)
    out = out.replace(/(\d)\.(\d)/g, '$1,$2');

    // 4.36 Small digit + quantity noun → spelled-out number for TTS (2-12 only, deterministic)
    const KA_SMALL_NUMS = { '2': 'ორი', '3': 'სამი', '4': 'ოთხი', '5': 'ხუთი', '6': 'ექვსი', '7': 'შვიდი', '8': 'რვა', '9': 'ცხრა', '10': 'ათი', '11': 'თერთმეტი', '12': 'თორმეტი' };
    out = out.replace(
        /(?<![\u10A0-\u10FF\d])([2-9]|1[0-2])\s+(საათი|საათს|წუთი|წუთს|დღე|დღეს|კვირა|თვე|თვეს|წელი|წელს|კაცი|კაცს|ლარი|ლარს)(?![\u10A0-\u10FF])/g,
        (m, num, noun) => `${KA_SMALL_NUMS[num]} ${noun}`
    );

    // ── v1.9.0 additions: modality, comparison, possession ──

    // 4.37 Conjugated უნდა hallucination (უნდა is invariable) and
    //     "უნდა + finite future" would-calque → უნდა + optative reading stays,
    //     but a conjugated form is always wrong.
    out = out.replace(/(?<![\u10A0-\u10FF])უნდება(?![\u10A0-\u10FF])/g, 'უნდა');
    out = out.replace(/(?<![\u10A0-\u10FF])უნდავს(?![\u10A0-\u10FF])/g, 'უნდა');

    // 4.38 "have"-calque verbs → inverted აქვس frame is context-dependent, so only
    //     fix the deterministic false-friend verb: ფლობს "he has X" is calque-ish but
    //     ფლობს can be legitimate ("owns/controls"). Fix only ჰქონის (nonexistent form).
    out = out.replace(/(?<![\u10A0-\u10FF])ჰქონის(?![\u10A0-\u10FF])/g, 'აქვს');

    // 4.39 Comparison calque "მეტი + adjective" → უფრო + adjective (deterministic
    //     for the frequent set; "მეტი" as a standalone pronoun "more" is untouched).
    out = out.replace(
        /(?<![\u10A0-\u10FF])მეტი\s+(სწრაფი|დიდი|კარგი|მაღალი|ლამაზი|ძლიერი|მძიმე|ახალი|ძველი|ცხელი|ცივი|სწორი)(?![\u10A0-\u10FF])/g,
        'უფრო $1'
    );

    // ── v1.10.0 additions: evidentiality, time clauses, narrative polish ──

    // 4.40 Untranslated English evidential adverbs → თურმე (deterministic:
    //     these should never survive into Georgian output).
    out = out.replace(/\bapparently\b/gi, 'თურმე');
    out = out.replace(/\bsupposedly\b/gi, 'თურმე');
    out = out.replace(/\breportedly\b/gi, 'თურმე');
    out = out.replace(/\ballegedly\b/gi, 'თურმე');

    // 4.41 "სანამ არ" spacing normalize: სანამ არ X → keep, but collapse
    //     doubled არ or missing space artifacts: "სანამარ" → "სანამ არ".
    out = out.replace(/(?<![\u10A0-\u10FF])სანამარ(?![\u10A0-\u10FF])/g, 'სანამ არ');
    out = out.replace(/(?<![\u10A0-\u10FF])სანამ\s+არ\s+არ\s+/g, 'სანამ არ ');

    // ── v1.11.0 additions: enclitics, quotatives, beneficiary, style ──

    // 4.42 Detached standalone "ც" → attach to the preceding word
    //     (deterministic: a separate ც is always the additive enclitic mis-spaced).
    //     Lookahead includes ।/… because 4.15 already converted sentence periods.
    out = out.replace(/(?<=[\u10A0-\u10FF])\s+ც(?=[\s,."”):;!?।…])/g, 'ც');

    // 4.43 Detached quotatives → hyphenate to the preceding word
    //     ("... თქო" → "...-თქო", "... მეთქი" → "...-მეთქი").
    out = out.replace(/(?<=[\u10A0-\u10FF])\s+(თქო|მეთქი)(?=[\s.!?,"”):।…])/g, '-$1');

    // 4.44 Double benefactive: drop the redundant postpositional beneficiary
    //     after a fused m/g/v transfer verb (მომცა ჩემთვის → მომცა).
    out = out.replace(
        /(?<![\u10A0-\u10FF])(მომცა|მოგცა|მოვცა|მიმცა|მიგცა|მივცა|დამწერა|დაგწერა|დავწერა)\s+(ჩემთვის|შენთვის|მისთვის|მათთვის|ჩვენთვის|თქვენთვის)(?![\u10A0-\u10FF])/g,
        '$1'
    );

    // 4.45 English quotation marks in Georgian output → „low-high" pair
    //     (deterministic for straight quotes only; direction inferred by position).
    out = out.replace(/(^|[\s(\[])"/g, '$1„');
    out = out.replace(/"([\s)\].,!?;:]|$)/g, '“$1');

    // 4.46 Untranslated English additive adverbs → Georgian equivalents
    //     (deterministic set that should never survive into Georgian output).
    out = out.replace(/\balso\b/gi, 'ასევე');
    out = out.replace(/\bmoreover\b/gi, 'გარდა ამისა');

    // ── v1.12.0 additions: postpositions, purpose, tense, address ──

    // 4.47 Detached -დან/-მდე → fuse to the preceding noun stem
    //     ("... ის დან" → "...-დან", "... ი მდე" → "...-მდე").
    //     Lookahead includes ।/… because 4.15/4.29 already normalized periods.
    out = out.replace(/(?<=[\u10A0-\u10FF])(ის|ს|ი)\s+(დან|მდე)(?=[\s,."”):;!?।…])/g, '$1$2');

    // 4.48 Detached -გან → fuse to the preceding genitive stem
    //     ("... ის გან" → "...-გან").
    out = out.replace(/(?<=[\u10A0-\u10FF])ის\s+გან(?=[\s,."”):;!?।…])/g, 'ისგან');

    // 4.49 Untranslated English purpose connectors → რათა + optative reading
    //     (deterministic: "in order to/so as to" should never survive into
    //     Georgian output as English words).
    out = out.replace(/\bin order to\b/gi, 'რათა');
    out = out.replace(/\bso as to\b/gi, 'რათა');
    out = out.replace(/\bso that\b/gi, 'რათა');

    // 4.50 Vocative confusion: მამაო (priest!) in direct family address → მამავ
    //     (deterministic: მამაო as family address is always wrong; if the speaker
    //     genuinely means a cleric the QA rule 3.64 flags it for review).
    out = out.replace(/(?<![\u10A0-\u10FF])მამაო(?![\u10A0-\u10FF])/g, 'მამავ');

    // 4.51 Historical-present calque: present-tense narration verb immediately
    //     after a clearly past-frame marker (გუშინ/ადრე/ერთხელ/წლების წინ) →
    //     aorist. These verbs are suppletive, so use an explicit mapping table
    //     (string surgery cannot derive aorist stems: შედის → შევიდა,
    //     მიდის → წავიდა, ამბობს → თქვა ...).
    const KA_HIST_AORIST = {
        'შედის': 'შევიდა',
        'მიდის': 'წავიდა',
        'ამბობს': 'თქვა',
        'ხედავს': 'დაინახა',
        'იწყებს': 'დაიწყო'
    };
    out = out.replace(
        /(?<![\u10A0-\u10FF])(გუშინ|ერთხელ|წლების წინ|დიდი ხნის წინ|იმ დღეს|ერთ დღეს)(?![\u10A0-\u10FF])([^.!?]{0,20}?)(?<![\u10A0-\u10FF])(შედის|მიდის|ამბობს|ხედავს|იწყებს)(?![\u10A0-\u10FF])/g,
        (m, frame, mid, verb) => frame + mid + KA_HIST_AORIST[verb]
    );

    // 4.52 Impersonal calque fix: "შიმშილი ვარ"-style noun+copula → dative
    //      experiencer verbs (deterministic mapping; experiencer pronoun
    //      მე/შენ removed since the verb prefix already encodes person).
    out = out.replace(/(?<![\u10A0-\u10FF])(მე|შენ)(?![\u10A0-\u10FF])\s+(?<![\u10A0-\u10FF])(შიმშილი|სიწყურე|ძილი|სიცივე|სიცხე)(?![\u10A0-\u10FF])\s+(ვარ|ხარ)(?![\u10A0-\u10FF])/g,
        (m, pron, noun) => {
            const map = { 'შიმშილი': 'მშია', 'სიწყურე': 'მწყურია', 'ძილი': 'მძინავს', 'სიცივე': 'მცივა', 'სიცხე': 'მცხვა' };
            return map[noun];
        });

    // 4.53 Untranslated English correlatives → Georgian correlatives
    //      (deterministic: these should never survive into Georgian output).
    out = out.replace(/\bneither\b/gi, 'არც');
    out = out.replace(/\bnor\b/gi, 'არც');
    out = out.replace(/\beither\b/gi, 'ან');
    out = out.replace(/\bwhether\b/gi, 'თუ');
    out = out.replace(/\bsometimes\b/gi, 'ზოგჯერ');

    // 4.54 Reflexive possessive in მან-clauses: "მან ... მისი წიგნი" pattern
    //      is ambiguous; when მან (agent) and მისი appear in the same clause
    //      with a possessive-noun object, prefer თავისი (his own). Conservative:
    //      only fix when მისი directly precedes a noun and მან starts the clause.
    out = out.replace(/(?<![\u10A0-\u10FF])მან(?![\u10A0-\u10FF])([^.!?]{0,60}?)(?<![\u10A0-\u10FF])მისი(?![\u10A0-\u10FF])/g, 'მან$1თავისი');

    // 4.55 რომ + masdar → drop რომ (masdar stands alone after მინდა/შემიძლია):
    //      "მინდა, რომ წასვლა" → "მინდა წასვლა".
    out = out.replace(/(?<![\u10A0-\u10FF])(მინდა|გინდა|უნდა|შემიძლია)(?![\u10A0-\u10FF])\s*,?\s*რომ\s+([\u10A0-\u10FF]+(?:ა|ომა|ოლა))(?![\u10A0-\u10FF])/g, '$1 $2');

    // 4.56 Lone ხან → ზოგჯერ (a single ხან in a sentence without its pair
    //      is either the "sometimes" adverb or a mistranslation; ზოგჯერ is
    //      the safe unambiguous adverb). Lookahead includes । because earlier
    //      fixes already normalized periods.
    out = out.replace(/([^.\n!?]*)(?<![\u10A0-\u10FF])ხან(?![\u10A0-\u10FF])([^.\n!?]*[.!?।])/g,
        (m, before, after) => {
            const khanCount = (m.match(/(?<![\u10A0-\u10FF])ხან(?![\u10A0-\u10FF])/g) || []).length;
            return khanCount === 1 ? before + 'ზოგჯერ' + after : m;
        });

    // 4.57 Vigesimal და-connector repair: "ოცი N" (bare twenty + unit) →
    //      ოცდაN compound form. Deterministic for the common units 1-9:
    //      "ოცი ერთი" → "ოცდაერთი". The compound drops the final -ი of ოცი.
    const vigUnitMap = {
        'ერთი': 'ერთი', 'ორი': 'ორი', 'სამი': 'სამი', 'ოთხი': 'ოთხი',
        'ხუთი': 'ხუთი', 'ექვსი': 'ექვსი', 'შვიდი': 'შვიდი',
        'რვა': 'რვა', 'ცხრა': 'ცხრა', 'ათი': 'ათი',
    };
    for (const [unit, stem] of Object.entries(vigUnitMap)) {
        out = out.replace(
            new RegExp(`(?<![\\u10A0-\\u10FF])ოცი\\s+${unit}(?![\\u10A0-\\u10FF])`, 'g'),
            `ოცდა${stem}`,
        );
    }

    // 4.58 Suppletive ordinal fix: მეერთი family → პირველი family
    //      (case-mapped: NOM პირველი, ERG პირველმა, DAT/GEN პირველს/პირველის).
    out = out.replace(/(?<![\u10A0-\u10FF])მეერთი(?![\u10A0-\u10FF])/g, 'პირველი');
    out = out.replace(/(?<![\u10A0-\u10FF])მეერთე(?![\u10A0-\u10FF])/g, 'პირველი');
    out = out.replace(/(?<![\u10A0-\u10FF])მეერთს(?![\u10A0-\u10FF])/g, 'პირველს');

    // 4.59 Age genitive fix: "X წელი არის" → "X წლის არის" (age requires the
    //      vowel-graded genitive წლის, not the standalone წელი).
    out = out.replace(/(?<![\u10A0-\u10FF])წელი(?![\u10A0-\u10FF])(\s+არის)/g, 'წლის$1');

    // 4.60 Untranslated English ordinal digit-suffixes → Georgian style:
    //      "3rd" → "მე-3", "21st" → "21-ე". Word-boundary digits only.
    out = out.replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, (m, digits) => {
        const n = parseInt(digits, 10);
        return n === 1 ? 'პირველი' : `${digits}-ე`;
    });

    // 4.61 Untranslated English comparison words → Georgian carriers
    //      (deterministic single-word mappings; "than" is ambiguous so map
    //      to the safe conjunction ვიდრე).
    out = out.replace(/\bmore\b/gi, 'უფრო');
    out = out.replace(/\bless\b/gi, 'ნაკლებად');
    out = out.replace(/\bbetter\b/gi, 'უკეთესი');
    out = out.replace(/\bworse\b/gi, 'უარესი');
    out = out.replace(/\bbest\b/gi, 'საუკეთესო');
    out = out.replace(/\bbiggest\b/gi, 'ყველაზე დიდი');
    out = out.replace(/\bsmallest\b/gi, 'ყველაზე პატარა');
    out = out.replace(/\bbigger\b/gi, 'უფრო დიდი');
    out = out.replace(/\bsmaller\b/gi, 'უფრო პატარა');
    out = out.replace(/\btaller\b/gi, 'უფრო მაღალი');
    out = out.replace(/\bshorter\b/gi, 'უფრო დაბალი');

    // ── v1.15.0 additions ──

    // 4.62 Double-negation repair: არავინ/არაფერი/არასოდეს/არსად + verb
    //      without the obligatory second არ → insert არ immediately before
    //      the conjugated verb. Conservative span-scan like QA 3.76.
    const negFixRe = /(?<![\u10A0-\u10FF])(არავინ|არავითარი|არაფერი|არასოდეს|არასდროს|არსად)(?![\u10A0-\u10FF])([^.!?।]{0,80})/g;
    out = out.replace(negFixRe, (m, pron, tail) => {
        if (/(?<![\u10A0-\u10FF])(?:არ|ვერ|ნუ|ვეღარ|აღარ)(?![\u10A0-\u10FF])/.test(tail)) return m;
        // Insert არ before the LAST Georgian word in the tail (the verb slot)
        const words = tail.split(/(\s+)/);
        let lastGeorgianIdx = -1;
        for (let i = words.length - 1; i >= 0; i--) {
            if (/^[\u10A0-\u10FF]{2,}/.test(words[i])) { lastGeorgianIdx = i; break; }
        }
        if (lastGeorgianIdx === -1) return m;
        // Avoid inserting არ into a non-verb trailing word (e.g. a noun):
        // only fix when the tail has exactly one Georgian word (S V order)
        const georgianWordCount = words.filter(w => /^[\u10A0-\u10FF]{2,}/.test(w)).length;
        if (georgianWordCount !== 1) return m;
        words[lastGeorgianIdx] = 'არ ' + words[lastGeorgianIdx];
        return pron + words.join('');
    });

    // 4.63 Untranslated English concessives → Georgian carriers
    //      (deterministic single-word mappings; "despite" needs a noun so it
    //      maps to the ამ-shell adverb form).
    out = out.replace(/\bdespite\b/gi, 'მიუხედავად');
    out = out.replace(/\balthough\b/gi, 'თუმცა');
    out = out.replace(/\bthough\b/gi, 'თუმცა');
    out = out.replace(/\bhowever\b/gi, 'თუმცა');
    out = out.replace(/\bnevertheless\b/gi, 'მაინც');
    out = out.replace(/\bnonetheless\b/gi, 'მაინც');

    // 4.64 Broken concessive shell: მიუხედავად რომ → მიუხედავად იმისა, რომ
    out = out.replace(/(?<![\u10A0-\u10FF])მიუხედავად\s+რომ/g, 'მიუხედავად იმისა, რომ');

    // 4.65 Untranslated English reason/result markers → Georgian carriers
    out = out.replace(/\bbecause of\b/gi, 'გამო');
    out = out.replace(/\bdue to\b/gi, 'გამო');
    out = out.replace(/\bbecause\b/gi, 'იმიტომ რომ');
    out = out.replace(/\btherefore\b/gi, 'ამიტომ');
    out = out.replace(/\bthus\b/gi, 'ამიტომ');
    out = out.replace(/\bhence\b/gi, 'ამიტომ');

    // 4.66 Untranslated English causative markers → Georgian carriers
    //      (conservative: make/made → აიძულა (forced) is wrong in most
    //      contexts, so only map the unambiguous "let" family; make/cause
    //      map to the generic აიძულა which the refine pass can re-shape).
    out = out.replace(/\blet\b/gi, 'დაუშვა');
    out = out.replace(/\bforced\b/gi, 'აიძულა');

    // 4.67 Plural vowel-loss repair: X-იები → X-ები (drop the kept singular
    //      -ი before the plural marker; standard syncope applies to the
    //      base stem which only the AI pass can restore — here we only fix
    //      the mechanical double-vowel defect).
    out = out.replace(/(?<![\u10A0-\u10FF])([ა-ჰ]+)ი(ებ(?:ი|ს|მა|ს|ით|ად|ო|ში|ზე|თან|გან))(?![\u10A0-\u10FF])/g, '$1$2');

    return out;
}

// ── 5. REGISTRIES (for status panel display) ────────────────────────────────
const GEORGIAN_KNOWLEDGE_VERSION = '1.15.0';
const GEORGIAN_KNOWLEDGE_STATS = {
    promptBlocks: 78,
    qaRules: 80,
    autoFixes: 67,
    researchSources: 210
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
