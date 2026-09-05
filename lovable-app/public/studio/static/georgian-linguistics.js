// ═══════════════════════════════════════════════════════════════════════════
// GEORGIAN LINGUISTIC KNOWLEDGE BASE  v1.23.0
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
// v1.16.0 expansion (EN↔KA book comparison: questions/degree/sequence/
// instrumental/adverbial/quotative/focus/at-least, 10+ new web sources incl.
// TSU Spekali academic paper on არც/არც კი focus negation, languages42.ru
// question particles, talkpal.ai question syntax, parryc.com instrumental,
// Wiktionary -ად adverbial, sagapedia quotatives):
// KA_QUESTIONS_DEEP (yes/no intonation no-order-change, wh-words at start,
// tag particles ხომ?/არა?/ბა?/რომ?, თუ alternative questions),
// KA_DEGREE_ADVERBS (ძალიან/საკმაოდ/სრულიად/თითქმის preverbal placement,
// ძალიან vs ძალზე register),
// KA_SEQUENCERS (ჯერ/მაშინ/შემდეგ/ბოლოს/საბოლოოდ narrative chain,
// ამის შემდეგ, და ბოლოს),
// KA_INSTRUMENTAL_DEEP (-ით with/by-means-of, no preposition, გეგმით
// according-to, -ურთ together-with),
// KA_ADVERBIAL_DEEP (-ად/-დ derives adverbs from adjectives კარგად and
// numerals პირველად; essive-as professions მასწავლებლად),
// KA_QUOTATIVES (-მეთქি 1st-person / -ო 2nd-3rd-person evidential
// quotative clitics after reported speech),
// KA_FOCUS_PARTICLES (არც even-not, არც კი not-even negates minimal
// expected action on cognitive scale — TSU Spekali; კი presupposition;
// ვე even; მხოლოდ vs მარტო only),
// KA_DISCOURSE_MARKERS (საზოგადოდ/მაგალითად/კერძოდ/ამიტომაც/აქედან
// გამომდინარე formal connective tissue),
// KA_AT_LEAST (მინიმუმ quantitative lower bound, სულ ცოტა concessive
// lower bound, გონე defensive permissive).
// QA rules 3.81-3.85 (question_particle_missing, wh_question_untranslated,
// degree_adverb_untranslated, sequencer_untranslated, instrumental_
// untranslated, quotative_particle_missing, even_not_missing),
// auto-fixes 4.68-4.72 (tag particle repair, EN degree/sequence/at-least/
// focus carriers → Georgian, -ით insertion for with-by-means-of).
// v1.17.0 expansion (EN↔KA book comparison: clause-level connective
// architecture, 8+ new web sources incl. dictionary.ge corpus examples,
// georgian.se clausal-complement grammar, learnentry sentence bank,
// languages42.ru clause typology):
// KA_CONDITIONALS (თუ + future/present real condition, NO optative in
// თუ-clause; counterfactual uses რომ + pluperfect + -ებდი conditional
// — მე რომ ვსწავლობდი, ჩავაბარებდი; იქნებოდა would-be),
// KA_TEMPORAL_CLAUSES (როცა/როდესაც when, სანამ ... (არ) until/while
// with მანამ correlate, ვიდრე bookish, როგორც კი as-soon-as, მას
// შემდეგ რაც after),
// KA_PURPOSE_CLAUSES (იმისათვის რომ in-order-to, masdar + -ად
// მოსამზადებლად, ისე რომ so-that),
// KA_FREE_RELATIVES (რაც that-which, ვინც who(ever), სადაც where,
// როცა when, რასაც whatever — fused heads).
// QA rules 3.86-3.90 (conditional_untranslated, counterfactual_calque,
// temporal_conj_untranslated, purpose_clause_untranslated, free_
// relative_untranslated), auto-fixes 4.73-4.77 (EN if/otherwise →
// თუ/სხინააღმდეგ, EN when/until/as-soon-as → Georgian temporal
// carriers, EN in-order-to/so-that → purpose carriers, EN what/who/
// where free relatives → რაც/ვინც/სადაც, would/should counterfactual
// verb repair).
// v1.18.0 expansion (comparative degree & simile suffixes — georgian.se
// Lect05 adjective gradation + dictionary.ge simile corpus: თოვლივით
// white-as-snow, -ივით/-ვით/-სავით adverbial-case simile, mo-...-o
// attenuative degree, უ-...-ეს- high-style superlative; result clauses —
// polyglotgym.com + dictionary.ge "so...that" correlative frames ისე/ისეთი/
// იმდენი + რომ; the "as" family — dictionary.ge as I/II/III entries:
// როგორც manner, რაც შეეხება as-for, როგორც წესი as-usual, ასევე as-well;
// clefts & focus fronting — dictionary.ge "same II"/"exactly" corpus:
// სწორედ it-is-precisely, არა თუ ... არამედ not-only-but,
// უბრალოდ ის, რომ the-point-is):
// KA_SIMILES_DEGREE (KA-91: -ივით/-ვით/-სავით simile suffixes, mo-...-o
// attenuative, უ-...-ეს- elevative, მეტისმეტად excess),
// KA_RESULT_CORRELATIVES (KA-92: ისე ... რომ verb-result, ისეთი ...
// რომ quality-result, იმდენი ... რომ quantity-result, რაც უფრო ...
// მით უფრო proportional correlative),
// KA_AS_FAMILY (KA-93: როგორც manner/example, რაც შეეხება as-for,
// როგორც წესი as-usual, როგორც ცნობილია as-is-known, ისევე როგორც
// just-as, the same as ისეთივე როგორც),
// KA_CLEFT_EMPHASIS (KA-94: სწორედ focus cleft, არა თუ ... არამედ
// not-only-but, უბრალოდ ის რომ the-point-is, სწორედ ის ვინც it-is-he-who).
// QA rules 3.91-3.94 (simile_suffix, result_correlative_missing,
// as_family_untranslated, cleft_untranslated), auto-fixes 4.77-4.80
// (EN like/as → ვით family, EN so...that → ისე...რომ, EN the-same-as /
// just-as → ისევე როგორც, EN exactly/precisely/the-point-is →
// სწორედ/უბრალოდ ის, რომ).
// v1.19.0 expansion (motion-verb system — kahibaro.com 9.5 irregular-verb
// conjugation tables + latinum.substack.com Lessons 37/54 + Tbilisi2007
// (ILLC) preverb inventory + kartuliena.eu sit-verbs + cram.com flashcard
// set on მოყვანა/მიყვანა/წაყვანа + georgian.english-dictionary.help მოუტანს:
// KA_MOTION_VERBS (KA-95: suppletive stems წასვლა→მიდ- present vs წა-
// future/aorist წავალ/წავა, მოსვლა→მოდ- present მოდის vs მოვა, ჩამოსვლა
// →ჩამოდის, imperatives წადი!/მოდი!, ცოდნა ვიცი vs ცნობნა ვიცნობ,
// სურდეს მინდა, გაკეთება ვაკეთებ, თქმა ამბობს, იყო ვარ, ქონა მაქვს),
// KA_DIRECTIONAL_PREVERBS (KA-96: 9 simple preverbs a-/cha-/ga-/she-/
// gada-/mi-/mo-/c'a-/da- with motion-verb fusion მივდივარ→წავალ→
// გავედი გა-სვლა, შევიდა, ჩამოვედი, გადავედი, ავედი, დავბრუნდი, transitive
// motion წაიყვანს/მიყვანს წაყვანა, მოყვანს მოყვანა, მოაქვს მოტანა,
// მიაქვს მიტანა, ატარებს carry),
// KA_POSTURE_VERBS (KA-97: დგას stands — ვდგავარ/დგახარ, ზის sits —
// ვზივარ/ზიხარ + literary სხედან, იჯდეს/დაჯდება sat-down ვიჯექი/იჯდა,
// წევს lies — ვწევვარ/წევხარ; posture verbs keep present in state-
// descriptions where English uses progressive).
// QA rules 3.95-3.97 (motion_verb_untranslated, posture_verb_untranslated,
// preverb_direction_missing), auto-fixes 4.81-4.83 (EN go/goes/went →
// მიდის/წავიდა carriers, EN come/comes/came → მოდის/მოვიდა, EN
// stand/sit/lie → დგას/ზის/წევს).
// v1.20.0 expansion (masdar adverbial temporal phrases — latinum.substack.com
// Lesson 63 (დრო/time) + Lesson 54 (-ისას attestation: შუადღისას) +
// polyglotclub.com infinitives-as-nouns case declension:
// KA_MASDAR_ADVERBIAL (KA-98: genitive masdar + temporal postpositions —
// V-ის შემდეგ after-V-ing, V-ის წინ before-V-ing, V-ის დროს while-V-ing,
// literary V-ისას, V-ის დრომდე until-V-ing, perfect gerund "having done"
// → დამთავრების შემდეგ, [object-GEN masdar-GEN postposition] order:
// წიგნის წაკითხვის შემდეგ after reading the book),
// KA_TEMPORAL_NOUN_FRAMES (KA-99: N-ის დროს dative frame ომის დროს vs
// documented defect *ომის დრო, იმ დროს at that time, N-ის განმავლობაში
// during-X-duration, დროთა განმავლობაში over-the-course-of-time,
// დროიდან...-მდე დილიდან საღამომდე, ბავშვობის დროიდან since childhood,
// class-varying dayparts დილით/შუადღისას/საღამოს/ღამით/ზამთარში).
// QA rules 3.98-3.99 (masdar_adverbial_untranslated,
// temporal_dative_untranslated), auto-fixes 4.84-4.85 (EN after/before/
// while V-ing → GEN-masdar + postposition frames, EN during-the-X →
// X-ის დროს dative frame, იმ დროს/დროიდან...-მდე correlative frames).
// v1.21.0 expansion (deep participle system — en.wiktionary.org დაწერილი
// declension, talkpal.ai participles lesson, polyglotclub.com
// participles (transitive affixes მ---ელ-, მ---არ-/ალ-),
// georgian.stackexchange.com Non-finite forms (subject და-მ-ხატ-ვ-ელ-ი,
// negative და-უ-ხატ-ავ-ი, potential სა-ხატ-ავ-ელ-ი), grammar.emis.ge
// ნათქვამი resultative attestation, latinum.substack.com L72 ყოფილა:
// KA_DEEP_PARTICIPLES (KA-100: resultative ნა- ნაწერი/ნანახი/ნაჭამი/
// ნასმელი/ნათქვამი, PPP -ილ-/-ულ-/-ებულ- allomorphs დაწერილი/
// ნაპოვნი/გაკეთებული/მოკლული, potential -ებელი/-ველი გასაკეთებელი/
// საკითხავი/დასაწერი, negative და-უ- დაუჯერებელი/დაუსრულებელი/
// დაუმთავრებელი, agent მ-...-ელ- მწერალი/მხატვარი/მასწავლებელი,
// -არი/-ული instruments სასანთე/ბერეტი documented, ყოფილი been
// ≠ ყოფილა evidential), KA_EXISTENTIAL_FRAMES (KA-101: აქვს have-in-
// locative მას ჰქონდა, არსებობს exists, ნახულობს is-found-at-place,
// დგას მაგიდაზე on-table-stands, ყოფილა vs იყო evidential split).
// QA rules 3.100-3.101 (participle_untranslated: EN broken/written/
// unforgettable/burned-down left bare; potential_untranslated: EN
// -able/-ible word with no -ებელი/-ველი/სა-...-ელ-/-შეუძლებელი in
// output). Auto-fixes 4.86-4.87 (EN "was V-ed" attributive/static
// passive → PPP carrier, EN "un-/in- V-able/ible" → და-უ-...-ელი/
// -შეუძლებელი negative potential carrier, EN "-able/-ible" →
// შესაძლებელი carrier).
// v1.22.0 expansion (affective/dative-subject verb system — lingua.ge
// უყვარს full paradigm, zmnebi.com m-class person markers + be-form
// object agreement (მიყვარხარ = მ+iყვარ+ხარ), latinum.substack.com L65
// მინდა dative-wanter, en.wiktionary Appendix Georgian verbs m-set table,
// love.you phrase corpus, BYU Case Shift paper (Series III inversion)):
// KA_AFFECTIVE_VERBS (KA-102: m-class affective paradigm — მიყვარს/
// უყვარს loves with full series grid მიყვარდა/მეყვარება/მყვარებია,
// be-form object agreement მიყვარხარ/გიყვარვარ/უყვარს ის, მოსწონს
// likes მომწონს/მოსწონს, მძულს hates, მეშინია fears + GEN object,
// მსურს wants, სწამს believes + DAT, სჯერა, მჭირდება needs მჭირდება
// + NOM, სძინავს, მსმენია heard-of, სწყდება; inversion principle: experiencer
// DAT + stimulus NOM, verb agrees with EXPERIENCER not stimulus),
// KA_BEFORM_AGREEMENT (KA-103: be-form object rule — interpersonal
// emotion verbs mark 1st/2nd-person object with the PRS "to be" form
// ვარ/ხარ/არის + plural ვართ/ხართ/არიან; მიყვარხარ I-love-you,
// გიყვარვარ you-love-me, გვიყვარხართ we-love-you-pl, გყავვარ→გყავარ
// double-v collapse, only in Series I present, მოვწონვარ she-likes-me).
// QA rules 3.102-3.103 (affective_agreement_missing: EN love/like/hate/
// fear sentence with no m-class affective carrier; beform_missing:
// interpersonal "I love/miss you" with no -ხარ/-ვარ be-form suffix).
// Auto-fixes 4.88-4.89 (EN I/you love/liked/hate/fear/want/need/afraid
// → m-class affective carriers მიყვარს/მომწონს/მძულს/მეშინია/მინდა/
// მჭირდება, EN I-love-you family → be-form agreement მიყვარხარ/
// გიყვარვარ/გვიყვარხარ). 89→102 QA is v1.22.0: rules 3.102-3.103,
// fixes 4.88-4.89, sources +8 (259→267).
// v1.23.0 expansion (reported questions / indirect speech — dictionary.ge
// "whether II" + "what" entries, latinum.substack.com L50 reported-speech
// lesson): KA_REPORTED_QUESTIONS (KA-104: polar თუ conjunction (never
// რომ), თუ არა clause-final alternative, ხომ არ tag strategy მკითხა, რაიმე
// დახმარება ხომ არ მჭირდებოდა, wh-retention მკითხა, სად მივდიოდი /
// თუ რომელი წიგნი სჭირდება, tense backshift past→imperfect never
// pluperfect, double-optative წასულიყო თუ დარჩენილიყო for "whether to V
// or V", concessive იმისდა მიუხედავად, მოვა იგი თუ არა, what-if რა
// იქნება, ... რომ / ვაითუ), KA_REPORTED_COMMANDS (KA-105: reported
// commands as optative მითხრა, დაველოდე / არ წასულიყო, request სთხოვა
// + masdar vs information მკითხა, quotative -ო გჭირდებაო/მოვაო, speech
// verb inventory მკითხა/მითხრა/უთხრა/უპასუხა/ჩურჩულა/დაუყვირა,
// თქვა, რომ statements). QA rule 3.104 (reported_question_untranslated:
// EN asked if/whether/where, wonder if, told me where, don't know if,
// what if with no თუ/ხომ არ/ვაითუ/-ო carrier — თუ guarded with Georgian
// lookarounds so თუმცა does not satisfy it). Auto-fix 4.90 (EN reported
// frames → speech verb + carrier; runs AFTER 4.53/4.73/4.74 and accepts
// both raw English triggers AND their Georgian residue — whether/if
// arrive as თუ, when as როცა, "whether or not" as "თუ or not" repaired
// to თუ არა; asked me whether → მკითხა, თუ, I wonder if → მაინტერესებს,
// თუ, asked me where → მკითხა, სად (wh-retention), told me where →
// მითხრა, სად, don't know if → არ ვიცი, თუ, what if → რა იქნება, რომ).
// 104→106 blocks is v1.23.0: KA-104/KA-105, rule 3.104, fix 4.90,
// sources +3 (267→270).
// v1.24.0 expansion (future intent — glosbe.com აპირებს = "to be going to"
// [enwiki-01-2017-defs], dictionary.ge intend: "what do you intend to do?"
// → რის გაკეთებას აპირებთ?, latinum L13: ხვალ ის აპირებს სპორტზე წასვლას,
// kartuliena.eu/moods: დავწერ წერილს = I am going to write a letter):
// KA_FUTURE_INTENT (KA-106: "BE going to + VERB" → აპირებს + masdar-DAT
// (წასვლას) — NEVER the motion მიდის for intent, paradigm ვაპირებ/
// აპირებ/აპირებს/ვაპირებთ/აპირებთ/აპირებენ, imperfect აპირებდა-family
// for abandoned "was going to", აპირებთ present/imperfect ambiguity,
// semantic ladder აპირებს → მინდა → მივდიოდი (verge) → plain future
// (Georgian prose preference), motion-vs-intent decision by following
// element (place noun → მივდივარ, verb → აპირებს), copula-future "going
// to BE + N" → იქნება never აპირებს იყოს, impersonal იქნება for
// there-is-future, weather წვიმა მოდის). QA rule 3.105
// (future_intent_untranslated: EN "BE going to V" frame residue with no
// აპირებ-/იქნებ- carrier — place-object frames and copula-future
// excluded from the trigger). Auto-fix 4.91 (EN intent frames →
// აპირებს-paradigm per person incl. inverted questions and noun-subject
// residues, imperfect for was/were; copula-future → იქნება family;
// place-guard lookahead keeps motion readings for 4.81; runs BEFORE
// 4.81's bare "going to → მიდის"). 106→107 blocks is v1.24.0: KA-106,
// rule 3.105, fix 4.91, sources +4 (270→274).
// Consumed by static/app.js pipeline: prompt blocks for LLM stages,
// rule-based validator + corrector for deterministic post-processing.
// ═══════════════════════════════════════════════════════════════════════════

// ── 0. UNICODE GEORGIAN BOUNDARY HELPERS (P0-4) ─────────────────────────────
var KA_CHARS = '\\u10A0-\\u10FF';
var kaWord = (src, flags = 'g') => new RegExp(`(?<![${KA_CHARS}])(?:${src})(?![${KA_CHARS}])`, flags);
if (typeof window !== 'undefined') {
    window.KA_CHARS = KA_CHARS;
    window.kaWord = kaWord;
}

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
• DO NOT CALQUE ENGLISH SENTENCE STRUCTURE: English builds sentences with rigid SVO, passive nominalizations, and dangling prepositional chains. Georgian builds sentences with Topic-Comment and flexible SOV order, placing the verb naturally. Never translate word-for-word or clause-by-clause.
• DATIVE EXPERIENCER INVERSION: Sensation, emotion, state, and need verbs MUST use Dative subject + Inverted verb (NEVER nominative copulas):
  - "where he is hungry and cold" → სადაც მას შია და სცივა (NEVER *ის არის მშიერი და ცივი)
  - "he needs cheering up" → მას გამხნევება სჭირდება (NEVER *ის საჭიროებს გამხნევებას)
  - "I am thirsty / afraid" → მწყურია / მეშინია (NEVER *მე ვარ მწყურვალი / შეშინებული)
  - Experiencer verbs: შია (hungry), სცივა (cold), სწყურია (thirsty), ეშინია (afraid), სჭირდება (needs), უნდა (wants), ახსოვს (remembers), ესმის (understands), უყვარს (loves), მოსწონს (likes), აქვს/ჰყავს (has).
• ERGATIVE CASE IN PAST AORIST: In transitive past actions (წყვეტილი), the subject MUST take Ergative case (-მა / მან):
  - "The grown-ups advised me" → დიდებმა მირჩიეს (NEVER *დიდები მირჩიეს)
  - "My friend smiled" → ჩემმა მეგობარმა გამიღიმა (NEVER *ჩემი მეგობარი გამიღიმა)
  - "He drew / He said / He noticed" → მან დახატა / მან თქვა / მან შეამჩნია (NEVER *ის დახატა / ის თქვა)
• REPORTED SPEECH & EVIDENTIAL CLITICS:
  - First-person quoted thoughts/speech: attach -მეთქი (e.g. ვკითხე, თუ შეგეშინდათ-მეთქი; ვუთხარი, არ ვიცი-მეთქი).
  - Third-person reported speech/hearsay: attach -ო (e.g. ამბობდნენ, რომ საჭმელი მოინელონო; მეუბნებოდნენ — „ქუდიაო“; რა მშვენიერი სახლი ყოფილაო!).
• NO DUMMY LEADING "რომ": Never start an independent sentence or paragraph with a dummy leading "რომ" (e.g. *„რომ ჯერ...“ is a dead giveaway of machine calque). Direct declarative thoughts must start with the main clause or topic.
• MANDATORY SUBORDINATE CLAUSE COMMAS: In Georgian grammar, every subordinate clause introduced by რომ, რომელიც, როდესაც, რადგან, რადგანაც, თუმცა, სანამ, ვიდრე, ხოლო, რაკი MUST have a comma preceding it! Independent clauses must not run into each other without commas, semicolons, or periods.
• PARTICIPIAL ECONOMY: Prefer concise Georgian participles (გადაყლაპული სპილო, დაზიანებული ძრავა, გამოკვეთილი აზრი) instead of stacked clunky relative clauses (*სპილო, რომელიც გადაყლაპული იყო).
• ADJECTIVE CASE CONCORD: Attributive adjectives preceding Dative/Instrumental nouns use truncated bare stem (NEVER repeat case ending -ს):
  - "to the big man" → დიდ ადამიანს (NEVER *დიდს ადამიანს)
  - "to the little boy" → პატარა ბიჭს (NEVER *პატარას ბიჭს)
  - "to the beautiful flower" → ლამაზ ყვავილს (NEVER *ლამაზს ყვავილს)
• POSTPOSITION INTEGRATION: Georgian has NO prepositions. Enclitic postpositions attach to inflected noun stems:
  - "about the book" → წიგნის შესახებ (NEVER *შესახებ წიგნი)
  - "towards people" → ადამიანების მიმართ / ხალხისკენ (NEVER *მიმართ ადამიანები)
  - "together with him" → მასთან ერთად (NEVER *ერთად მასთან)
• IDIOMATIC NATIVE EQUIVALENTS:
  - "first, last, and always" → უპირველეს ყოვლისა და მუდამ (NOT *ჯერ, ბოლოს და ყოველთვის)
  - "blooms in the tomorrow of..." → მომავალში ისხამს ნაყოფს / ხვალინდელ დღეს ამშვენებს (NOT *ხვალში ყვავის)
  - "like a magnetic rod" → მაგნიტივით / მაგნიტურ ძალად (NOT *მაგნიტური ჯოხივით)
  - "every day" → ყოველდღე (adverbial ყოველდღე, NOT *ყოველ დღეს)
  - "in X's words:" → X-ის სიტყვებით:
  - "took place" → მოხდა / გაიმართა / ჩატარდა (NOT *ადგილი დაიკავა / *ადგილი ჰქონდა)
  - "took part in" → მონაწილეობა მიიღო (NOT *ნაწილი მიიღო)
  - "paid attention" → ყურადღება მიაქცია (NOT *ყურადღება გადაიხადა)
  - "as soon as possible" → რაც შეიძლება მალე (NOT *რაც შეიძლება სწრაფად)
  - "makes sense" → აზრი აქვს / სავსებით ლოგიკურია (NOT *აზრს აკეთებს / *სრული აზრი აქვს)
• Default SOV; verb not sentence-final when focusing an element — focused word goes immediately before the verb.
• Context-clear pronouns: DROP ის/მას/მათ unless disambiguation is needed. Verb morphology already encodes person/number.
• For emphasis/contrast: use the particle კი after the focused word or ეს კი "as for this"; use -ც (აფხაზებმაც) for "even/too".
• Possession: ჩემი/შენი/მისი only when ownership needs emphasis; მას აქვს წიგნი (dative possessor + nominative possessed) is native; მისი წიგნი is "his book" only in contrastive contexts.
• Dialogue: mark speaker turns with a leading em-dash — „quote“ style is for quoted speech inside narration, titles, citations.
• Quotation marks: „ … “ (low opening, high closing), never straight quotes.
• No capitalization at all — not sentence starts, not proper names.
• Dashes: spaced em-dash — for major parentheticals and dialogue breaks; numeral ranges use en-dash 1918–1921.
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
• A Georgian sentence ends with . ? ! or … exactly like standard literary prose; never leave a sentence unterminated.
• Question sentences end with ? (same as English).
• Exclamation sentences end with ! (same as English).
• Trailing thought / hesitation / unfinished sentence → … (ellipsis, three dots).
• NEVER leave a sentence without terminal punctuation — TTS prosody and reader layout depend on it.
• A new sentence starts after . / ? / ! / … followed by one space.
• Do NOT insert a comma or dash where a sentence should end — if the thought is complete, terminate with a period (.).

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
• Semicolon (;) — use sparingly, only between closely related independent clauses. Most English semicolons should become a period (.) or comma in Georgian.
• Colon (:) — before lists, explanations, or quoted material. Rare in narrative prose.

WHAT NEVER APPEARS IN GEORGIAN TEXT:
• English straight quotes " " → use „ … “
• Semicolons in dialogue → replace with a period (.) or comma.
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
• also=ასევე  so=ასე რომ  never=არასდროს  always=ყოველთვის  already=უკვე
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
• Semicolons stacking parallel clauses — Georgian prose prefers და-chaining or sentence period (.) breaks.
• Over-literal "have": "ომის ხელოვნებას მნიშვნელობა აქვს" is fine (inversion), but
  "სახელმწიფოს აქვს ომის ხელოვნება" (SVO have) is a calque — keep აქვს/არის final.
• მაგრამ needs a comma BEFORE it when joining clauses: ..., მაგრამ ....
• Attributive უნდა + masdar chain: "მთავარი მიზანი უნდა იყოს სწრაფი გამარჯვება" is correct;
  do not insert რომ after უნდა.
• Speech attribution: "სუნ ძიმ თქვა:" — native books use სუნ ძიმ თქვა: with the colon kept,
  or სუნ ძიმის სიტყვებით. Keep proper-noun agreement: სუნ ძის (genitive), სუნ ძისგან.
• ხოლო contrast chains are fine but vary with მაგრამ/თუმცა to avoid monotony.
• Punctuation discipline: one terminal mark (. ? ! …) per sentence; no space before . , ; :; single space after.`;

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
7. Punctuation Georgian („…“, —, .)? 8. Register consistent?`;

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

// KA-79 v1.16.0 — Questions & tag particles. Georgian has NO word-order
// change for yes/no questions: statement + rising intonation (+ "?" in
// writing). Wh-questions: the wh-word goes to sentence START (unlike the
// multiple wh-order of English in-situ calques).
// Wh-set: ვინ who / რა what / სად where / როდის when / რატომ why /
// როგორ how / რომელი which / რამდენი how-much-many / საიდან from-where /
// საით whither / როდისმდე until-when. Wh-word CANNOT stay in-situ mid-
// sentence as in English "You saw what?" — front it: რა დაინახე?
// Tag particles (sentence-final, after the clause, intonation rises):
// ხომ = "right? / isn't it?" — seeks agreement, expects YES
// (ლამაზია, ხომ? it's beautiful, right?); ხომ can also sit before the
// verb mid-clause with emphatic force: ხომ არ დაგავიწყდა you haven't
// forgotten, have you?; NEGATIVE tag with ხომ: ხომ არა? / ხომ?
// არა? = "right? no?" — neutral tag, expects confirmation (after both
// positive and negative statements: არ მოსულა, არა? he hasn't come, right?)
// ბა? = colloquial/surprised tag (rustic-childish flavor, dialogue only)
// რომ? = "really? is that so?" — asks for elaboration or expresses doubt
// თუ introduces ALTERNATIVE questions: მოდის თუ არა? is he coming or not;
// არის თუ არა სახლში? is he at home or not; X თუ Y? X or Y?
// Defects: (a) calquing English auxiliary inversion (Do you...? → შენ
// აკეთებ?) — Georgian keeps statement order; (b) leaving English "right?",
// "isn't it?", "really?" untranslated instead of ხომ?/არა?/რომ?;
// (c) wh-word left mid-sentence; (d) "or not" tail → თუ არა?
const KA_QUESTIONS_DEEP = `
GEORGIAN QUESTIONS & TAG PARTICLES (EN↔KA)
• YES/NO question = statement + rising intonation, NO word-order change,
  NO auxiliary: "Do you know?" → იცი? "Is he coming?" → მოდის?
• WH-word goes to sentence START: ვინ მოვიდა? who came; რა გინდა?
  what do you want; სად მიდიხარ? where are you going; როდის მოხვალ?
  when will you come; რატომ ტირი? why are you crying; როგორ ხარ?
  how are you; რამდენი წელი გაქვს? how old are you
• TAG particles: ხომ? right? (expects yes) / არა? right? neutral /
  ბა? colloquial surprise / რომ? really? elaborate-please
• ხომ preverbal emphatic: ხომ არ დაგავიწყდა? you haven't forgotten, have you?
• ALTERNATIVE: თუ არა? or-not tail: მოდის თუ არა? is he coming or not
• "right?" → ხომ? / არა?  ·  "isn't it?" → არა?  ·  "really?" → მართლა? / რომ?
TACTIC: Never translate English question syntax word-for-word: drop the
do/does/did auxiliary, keep statement order, front the wh-word, and land
the tag particle at the end. English tag questions (right? isn't it? has
he?) must surface as ხომ?/არა?/თუ არა? — never dropped silently.`;

// KA-80 v1.16.0 — Degree adverbs. Placement: BEFORE the word modified
// (adj/adv/verb). ძალიან is the neutral default; ძალზე/ძალზედ bookish;
// მეტისმეტად excessively; საკმაოდ quite/fairly; სრულიად completely;
// თითქმის almost (preverbal); ნამდვილად really; მართლა(დ) truly
// (colloquial მართლა); უზომოდ immoderately. Intensifier stacking is
// rare in good prose — one degree adverb per phrase.
// COMMON DEFECT: English very/really/quite/almost dropped entirely, or
// calqued as ძალიან for every shade. Another: "very much" after verb →
// Georgian preverbal ძალიან: მიყვარს ძალიან (I love very-much).
const KA_DEGREE_ADVERBS = `
GEORGIAN DEGREE ADVERBS (EN↔KA)
• ძალიან very (neutral default) · ძალზე/ძალზედ very (bookish/formal)
• მეტისმეტად excessively · საკმაოდ quite/fairly/rather
• სრულიად completely/totally · თითქმის almost/nearly
• ნამდვილად really/actually · მართლა(დ) truly (colloq.)
• PLACEMENT: before the modified word: ძალიან ლამაზი very beautiful,
  საკმაოდ სწრაფად quite fast, თითქმის დაასრულა almost finished
• "very much" (verb) → preverbal ძალიან: მიყვარს ძალიან / ძალიან
  მიყვარს both idiomatic
• MAPPING: very→ძალიან · quite/fairly→საკმაოდ · really→ნამდვილად ·
  almost→თითქმის · completely→სრულიად · extremely→მეტისმეტად ·
  truly→მართლად (colloq) / ნამდვილად
TACTIC: Never drop English degree adverbs; pick the shade-matched
Georgian carrier and place it preverbal/pre-adjectival. Avoid stacking
two intensifiers on one word.`;

// KA-81 v1.16.0 — Narrative sequencers. The narrative chain of Georgian
// prose: ჯერ first-at-first → მერე/შემდეგ then-next → ბოლოს finally.
// ჯერ almost always pairs with მერე/შემდეგ in the next clause (ჯერ...
// მერე... correlative). მაშინ then-at-that-time resumes after pause.
// საბოლოოდ ultimately/eventually (outcome, not just last step).
// ამის შემდეგ after-this; ამის შემდეგაც after-this-too; და ბოლოს
// and-finally (list close). Formal: პირველ რიგში first-of-all,
// შემდეგ რიგში secondly. DEFECT: dropping English first/then/next/
// finally, or overusing შემდეგ where მერე (colloq) or მაშინ fits.
const KA_SEQUENCERS = `
GEORGIAN NARRATIVE SEQUENCERS (EN↔KA)
• ჯერ first / at first — expects continuation: ჯერ ფიქრობდა, მერე
  გადაწყვიტა first he thought, then he decided (ჯერ...მერე correlative)
• მერე then (colloquial) · შემდეგ then/next (neutral/formal)
• მაშინ then / at that time — resumption after a pause
• ბოლოს finally / at last · და ბოლოს and finally (list close)
• საბოლოოდ ultimately / eventually (final outcome)
• ამის შემდეგ after this · ამის შემდეგაც after this as well
• პირველ რიგში first of all · შემდეგ რიგში secondly (formal enumeration)
• MAPPING: first→ჯერ / პირველ რიგში · then→მერე/მაშინ/შემდეგ ·
  next→შემდეგ · finally→ბოლოს · eventually→საბოლოოდ ·
  after that→ამის შემდეგ
TACTIC: Preserve the narrative chain — English first/then/finally in
narration must surface as ჯერ/მერე-შემდეგ/ბოლოს, not vanish. Use
ჯერ only when a later მერე/შემდეგ completes the pair.`;

// KA-82 v1.16.0 — Instrumental case deep. -ით = "with/by means of":
// კალმით with-a-pen, ხელით by-hand, მანქანით by-car, დანით with-a-knife.
// NO preposition — the case suffix carries "with". Idiomatic:
// გეგმით according-to-the-plan, ბრძანებით by-order/per-order,
// შემთხვევით by-chance/accidentally, შეცდომით by-mistake,
// უფლებამოსილებით by-virtue-of-authority. Accompaniment "together
// with (a person)" prefers -თან ერთად / -ურთ: მეგობართან ერთად
// with-a-friend (.animate); instrumental -ით for inanimate means:
// ავტობუსით მიდის goes by bus. Passive agent (rare, bookish): ღმერთის
// მიერ by-God (მიერ postposition, not -ით).
// DEFECT: translating "with X" as ერთად X or leaving English "with".
const KA_INSTRUMENTAL_DEEP = `
GEORGIAN INSTRUMENTAL CASE -ით (EN↔KA)
• -ით = with / by means of (inanimate instruments, transport):
  კალმით წერს writes with a pen · მანქანით მგზავრობს travels by car ·
  ხელით აკეთებს does by hand
• NO preposition: "with a knife" → დანით (one word, suffix only)
• Idiomatic: გეგმით according to the plan · ბრძანებით by order ·
  შემთხვევით by accident · შეცდომით by mistake
• Animate accompaniment: -თან ერთად / -ურთ (მეგობართან ერთად),
  not -ით; inanimate means: -ით
• Passive agent: -ის მიერ (bookish), not -ით
TACTIC: "with/by (tool, vehicle, means)" → X-ით in one word. If the
companion is a person, switch to -თან ერთად/-ურთ. Never leave English
"with" untranslated and never paraphrase კალმით as კალამი ერთად.`;

// KA-83 v1.16.0 — Adverbial case deep (-ად / -დ after vowels). Derives
// ADVERBS from adjectives: კარგი good → კარგად well; სწრაფი fast →
// სწრაფად fast(ly); ლამაზი → ლამაზად beautifully; ცუდი → ცუდად badly.
// From numerals: პირველი first → პირველად for-the-first-time; მეორე →
// მეორედ second-time; მესამე → მესამედ. Essive "as/for-a": professions
// and roles მასწავლებლად as-a-teacher, საჩუქრად as-a-gift,
// საუზმედ for-breakfast. Time: ზამთრად for-winter (rare).
// DEFECT: using the bare adjective where the -ად form is required
// (მან კარგი იმღერა ✗ → კარგად იმღერა ✓), or translating English
// "-ly" adverbs with adjective + აკეთებს paraphrase.
const KA_ADVERBIAL_DEEP = `
GEORGIAN ADVERBIAL CASE -ად/-დ (EN↔KA)
• Adjective → adverb: კარგი→კარგად well · სწრაფი→სწრაფად fast ·
  ლამაზი→ლამაზად beautifully · ცუდი→ცუდად badly · მშვიდი→მშვიდად quietly
• Numeral → "for the Nth time": პირველი→პირველად · მეორე→მეორედ ·
  მესამე→მესამედ
• Essive "as / for": მასწავლებლად as a teacher · საჩუქრად as a gift ·
  სადილად for lunch
• "well done" → კარგად შესრულებული; "he sings well" → კარგად მღერის
TACTIC: English -ly adverbs map to the -ად form of the Georgian
adjective — never to the bare nominative adjective. When describing HOW
an action is done, -ად is obligatory.`;

// KA-84 v1.16.0 — Focus particles deep (TSU Spekali, Advadze). არც =
// "not even / neither" — negates the MINIMAL unit of a cognitive scale;
// არც კი = emphatic "not even" (negates the contextually expected
// minimal action): არც კი დაფიქრებულა he didn't even think; არც
// გამოუხედავს he didn't even look at me. კი არც (order variant): მე კი
// არც გამიფრთხილებია without even warning (me). არც ერთი... არ =
// neither-one: არც ერთს არ დაუხუჭავს თვალი neither closed an eye.
// არც = "either" in negative additivity: არც ეზოებში ჩანდა ვინმე
// nobody could be seen in the yards either. English counterparts:
// not even / n't even / never / without even / neither / either.
// Positive focus: კი (presupposition, contrast): ეს კი ვიცი this I do
// know; ვე = even (postposed: მას ვე... არ), თანაც = moreover/even,
// კიდევ even/still (additive). მხოლოდ / მარტო(დ) only.
const KA_FOCUS_PARTICLES = `
GEORGIAN FOCUS PARTICLES: არც / არც კი / კი / ვე (EN↔KA)
• არც = "not even / neither": negates the minimal scale unit.
  არც გამოუხედავს — he didn't even look at me
• არც კი = emphatic "not even" (denies the expected minimal action):
  არც კი დაფიქრებულა he didn't even think; არც კი შევსულვარ I never
  (not even) entered
• კი არც = order variant (focus on the agent): მე კი არც გამიფრთხილებია
  I left without even warning (him)
• არც ერთი ... არ = neither one ... : არც ერთს არ დაუხუჭავს თვალი
• Negative additivity "either": არც ეზოებში ჩანდა ვინმე nobody in the
  yards either
• MAPPING: not even → არც (კი) · without even → კი არც · neither →
  არც ერთი · either (negative) → არც · even (positive) → ვე/თანაც/კიდევ ·
  only → მხოლოდ/მარტო
TACTIC: English "not even V" is არც (კი) + V with the verb negated —
never plain არ alone when "even" is present. Keep არც კი for the
strongest denial of the expected minimal action.`;

// KA-85 v1.16.0 — Formal discourse markers. Connective tissue of
// argumentative/formal Georgian prose: საზოგადოდ / ზოგადად generally,
// მაგალითად for-example (after comma: , მაგალითად:), კერძოდ
// specifically/namely, კონკრეტულად specifically (colloq-formal),
// ამიტომაც therefore-EMPHATIC (stronger than ამიტომ), ამის გამო
// because-of-this, ამისთვის for-this-reason, აქედან გამომდინარე
// from-this-following (officialese), შესაბამისად accordingly,
// შედეგად as-a-result, ამრიგად thus-in-this-way (formal "thus"),
// ანუ that-is (reformulation), აღნიშნული the-said (officialese
// anaphor). DEFECT: English therefore/for example/namely dropped or
// always rendered ამიტომ regardless of force.
const KA_DISCOURSE_MARKERS = `
GEORGIAN FORMAL DISCOURSE MARKERS (EN↔KA)
• საზოგადოდ / ზოგადად generally · მაგალითად for example ·
  კერძოდ namely/specifically · ანუ that is (reformulation)
• therefore ladder: ამიტომ (neutral) < ამიტომაც (emphatic) <
  აქედან გამომდინარე (officialese) · ამრიგად thus ·
  შედეგად as a result · შესაბამისად accordingly
• ამის გამო because of this · ამისთვის for this reason
• Punctuation: მაგალითად/კერძოდ usually set off by commas: , მაგალითად,
TACTIC: Match force: emphatic English therefore → ამიტომაც; legal/
official consequently → აქედან გამომდინარე or შესაბამისად. Keep for
example = მაგალითად and namely = კერძოდ distinct — do not merge into
one catch-all.`;

// KA-86 v1.16.0 — "At least" markers. მინიმუმ = quantitative lower
// bound (borrowed, invariable): მინიმუმ ათი კაცი at-least ten men.
// სულ ცოტა = "at least (the-little)" — concessive/defensive lower
// bound, colloquial-neutral: სულ ცოტა ერთი ჭიქა at least one glass.
// არანაკლებ = "no less than" (formal, emphatic): არანაკლებ ასი
// ლარი no-less-than 100 lari. გონე / გონება = archaic-folk defensive
// permissive "at least, if nothing else" (dialogue/folk narrative).
// Also: ერთი მაინც at least one (არავინ მაინც even one); მაინც after
// a focused noun gives "at least X". DEFECT: dropping "at least", or
// one-size-fits-all მინიმუმ where სულ ცოტა sounds natural.
const KA_AT_LEAST = `
GEORGIAN "AT LEAST" MARKERS (EN↔KA)
• მინიმუმ — quantitative lower bound: მინიმუმ ათი კაცი at least ten
  men · მინიმუმ სამი დღე at least three days
• სულ ცოტა — concessive/defensive lower bound (colloq-neutral):
  სულ ცოტა ერთი ჭიქა დამილევინე at least buy me one glass
• არანაკლებ — "no less than", formal-emphatic: არანაკლებ ასი ლარი
• გონე / გონება — archaic-folk "at least, if nothing else" (dialogue,
  folk narrative): გონე ერთი სიტყვა თქვი say at least one word
• Focused noun + მაინც = "at least X": ერთი მაინც at least one
• MAPPING: at least + NUMBER → მინიმუმ · at least (plea/concession) →
  სულ ცოტა · no less than → არანაკლებ · at least (folk) → გონე
TACTIC: Never drop English "at least": choose მინიმუმ for counts/
measurements, სულ ცოტა for pleas and concessions, არანაკლებ for
formal emphasis.`;

// KA-87 v1.17.0 — Conditional system (dictionary.ge corpus examples +
// learnentry sentence bank + polyglotclub conditional mood). REAL
// conditions use თუ + FUTURE/PRESENT (Series I), never optative in the
// თუ-clause: თუ ის მოვა, სთხოვეთ დაელოდოს if he comes, ask him to
// wait; თუ წვიმს, დავსველდებით if it rains, we will get wet. The
// conditional mood itself derives from imperfect + ი- (kartuliena.eu):
// ვიგრძნობდი I would feel. COUNTERFACTUAL ("if I had studied") uses
// რომ + PLUPERFECT in the protasis + -ებდი conditional in the apodosis:
// მე რომ ვსწავლობდი, გამოცდას ჩავაბარებდი if I had studied, I would
// have passed; თქვენს ადგილას რომ იყოს, იგი ამას გააკეთებდა were he
// in your place, he would do it (dictionary.ge "would"). იქნებოდა =
// "would be". English "if" can also be თუ არა if-not (negative
// condition), წინააღმდეგ შემთხვევაში otherwise. DEFECT: calquing
// "if I would have" as თუ + conditional (Georgian needs რომ +
// pluperfect), or keeping the English if-counterfactual order.
const KA_CONDITIONALS = `
GEORGIAN CONDITIONAL SYSTEM (EN↔KA)
• REAL condition (likely): თუ + FUTURE/PRESENT in BOTH clauses —
  თუ ის მოვა, სთხოვეთ დაელოდოს if he comes, ask him to wait ·
  თუ წვიმს, დავსველდებით if it rains, we'll get wet
• NO optative inside the თუ-clause: *თუ მოსულიყო (unreal) is a
  different meaning — real conditions keep Series I
• COUNTERFACTUAL (unreal / regret): რომ + PLUPERFECT protasis +
  -ებდი conditional apodosis —
  მე რომ ვსწავლობდი, გამოცდას ჩავაბარებდი if I had studied, I would
  have passed · თქვენს ადგილას რომ იყოს, გააკეთებდა were he in your
  place, he would do it
• იქნებოდა = "would be"; conditional mood = imperfect stem + ი- +
  -დი (ვიგრძნობდი I would feel)
• Negative condition: თუ არა = if not; წინააღმდეგ შემთხვევაში =
  otherwise; თორემ (colloq) otherwise/else
• "if only" → ნეტავ + რომ / მინდა რომ frames with optative
MAPPING: if + future → თუ + future · if I had/were → რომ + pluperfect
+ (-ებდი) · would + V → conditional -ებდი · otherwise → წინააღმდეგ
შემთხვევაში / თორემ
TACTIC: Never render "if he had come, he would have seen it" as თუ +
pluperfect — Georgian counterfactuals are რომ-driven (მოსულიყო რომ,
დაინახავდა). Keep თუ strictly for real/open conditions.`;

// KA-88 v1.17.0 — Temporal clauses (dictionary.ge "until/till" corpus
// + languages42.ru clause typology). როცა = when (neutral, contracts
// რომ+აც); როდესაც = when (formal/bookish). UNTIL uses the CORRELATIVE
// frame: მანამ/იქამდე ... (მანამ) სანამ ... არ — "we walked until it
// got dark" → მანამ ვიარეთ, სანამ არ დაღამდა (dictionary.ge); the
// negative marker არ inside the სანამ-clause is STANDARD
// even though the meaning is positive ("until") — a unique Georgian
// polarity quirk. ვიდრე = until/while (bookish, same pattern with
// არ: თამაში არ მთავრდება, ვიდრე მსაჯი არ დაუსტვენს). Postpositional
// shortcut: N-მდე by/until-N (დაღამებამდე ვიარეთ). როგორც კი =
// as-soon-as; მას შემდეგ რაც = after; სანამ არ მოვა until he comes
// (negative imperative: არ წახვიდეთ, ვიდრე იგი არ მოვა don't leave
// till he comes). DEFECT: dropping the არ inside სანამ/ვიდრე, or
// translating "until" with bare სანამ without the მანამ correlate.
const KA_TEMPORAL_CLAUSES = `
GEORGIAN TEMPORAL CLAUSES (EN↔KA)
• when → როცა (neutral) / როდესაც (formal): როცა ჩამოვედი, უკვე
  გვიანი იყო when I arrived, it was already late
• UNTIL (correlative frame): მანამ ... სანამ ... არ —
  მანამ ვიარეთ, სანამ არ დაღამდა we walked until it got dark ·
  დაიცადე, სანამ წვიმა (არ) გადაიღებს wait till the rain stops
• ვიდრე = until/while (bookish, takes არ the same way):
  თამაში არ მთავრდება, ვიდრე მსაჯი არ დაუსტვენს the game isn't over
  till the referee blows the whistle
• The არ inside სანამ/ვიდრე-clauses is OBLIGATORY-flavored idiom
  (polarity quirk) — do not remove it as "double negation"
• Shortcut: noun + მდე = until/by-N: დაღამებამდე until dark ·
  საღამომდე until evening
• as soon as → როგორც კი: როგორც კი მოვიდა, ყველამ შეხედა
• after → მას შემდეგ რაც / ამის შემდეგ: მას შემდეგ რაც წავიდა...
• while → სანამ (durative): სანამ ის საუბრობდა, ჩვენ ვისმენდით
MAPPING: when → როცა/როდესაც · until → (მანამ) სანამ/ვიდრე ... არ ·
as soon as → როგორც კი · after → მას შემდეგ რაც · while → სანამ
TACTIC: "until"-translations without არ inside the temporal clause
sound foreign — keep (მანამ) სანამ/ვიდრე ... არ intact; front the
temporal clause or place it after the main clause, both native.`;

// KA-89 v1.17.0 — Purpose clauses DEEP (complements KA-57 v1.12.0
// masdar/რათა/ზე system; georgian.se clausal complement grammar +
// dictionary.ge). იმისათვის რომ = in-order-that (full clause
// purpose; formal-neutral); რომ alone + subjunctive/optative
// can carry purpose after motion verbs (მოვიდა, რომ დაეხმაროს he
// came to help). ისე რომ = so-that (result-purposive): ისე იყო
// დაწერილი, რომ ვერავინ წაიკითხა it was written so that nobody could
// read it. DEFECT: rendering "in order to V" with the English
// infinitive kept in place, or choosing the full იმისათვის რომ
// where the masdar -ად one-word form is the natural literary choice.
const KA_PURPOSE_CLAUSES_DEEP = `
GEORGIAN PURPOSE CLAUSES (EN↔KA)
• in order to + CLAUSE → იმისათვის რომ + optative/subjunctive:
  იმისათვის რომ გამოცდა ჩააბაროს, ბევრს სწავლობს he studies hard in
  order to pass the exam
• in order to / to + VERB (compact) → masdar + ად (future participle
  სა-...-ელი → -ად): სადილის მოსამზადებლად in order to prepare dinner ·
  წავედი წიგნის საყიდლად I went to buy a book
• bare რომ + optative after motion verbs: მოვიდა, რომ დაეხმაროს he
  came to help
• so that / so ... that → ისე ... რომ / ისე რომ: ისე იყო დაწერილი,
  რომ ვერავინ წაიკითხა
MAPPING: in order to → იმისათვის რომ / masdar-ად · to + V (purpose) →
masdar-ად · so that → ისე რომ · lest → თუ არა ... (rare, rephrase)
TACTIC: Prefer the masdar+ად form for compact literary purpose
(მოსასყიდლად, სანახავად, მოსასმენლად); use the full იმისათვის რომ
clause when the purpose has its own subject. Never leave the English
infinitive untranslated.`;

// KA-90 v1.17.0 — Free (fused) relatives. Georgian fuses the relative
// pronoun and its head into ONE word — no external antecedent: რაც =
// that-which/what (ეს რაც გითხარი what I told you); ვინც = the-one-
// who/whoever (ვინც გინდა whoever wants); სადაც = where (fused სა-
// +და+ც; სადაც კი წახვალ wherever you go); როცა = when(ever) (fused
// რომ+აც); რასაც whatever (რასაც თქვას whatever he says); როგორაც =
// as/how (როგორაც იყო as it was); რამდენადაც
// as-far-as; იმდენი რამდენი as-much-as (correlative pair). The
// correlative construction copies the particle in both halves: ვინც
// შეიძლება, მოვა who can, will come; რაც უნდა, ის ვთქვით whatever we
// wanted, we said. DEFECT: leaving English "what/whoever/wherever"
// untranslated, or splitting რაც into რა ... იც (non-word).
const KA_FREE_RELATIVES = `
GEORGIAN FREE RELATIVES — რაც / ვინც / სადაც / როცა (EN↔KA)
• რაც = what / that-which: ეს რაც გითხარი, მართალია what I told you
  is true · რაც უნდა, ის ვთქვით we said what we wanted
• ვინც = the one who / whoever: ვინც გინდა, მოვიდეს whoever wants,
  let him come
• სადაც = where / wherever (ONE word): სადაც კი წახვალ wherever you
  go · სადაც ვცხოვრობდით where we lived
• როცა = when(ever) (ONE word, fused): როცა მომწონს რაღაც whenever
  I like something
• რასაც = whatever: რასაც თქვას, არ დაუჯერებ whatever he says, don't
  believe him
• Correlative doubling: the -ც word opens the subordinate half and
  the main half repeats the frame (ვინც ... ის; რაც ... ის):
  რაც მოგცა, ის წაიღე take whatever he gave you
• რამდენადაც as far as · იმდენი, რამდენიც as much as
MAPPING: what (clause) → რაც · whoever → ვინც · where(ver) → სადაც ·
when(ever) → როცა · whatever → რასაც / რაც ... ის
TACTIC: Never split the fused forms (სადაც/როცა are single words) and
never leave English "what/whoever/wherever" untranslated — the -ც
fused relative is the native carrier.`;

// KA-91 v1.18.0 — Simile suffixes & fine degree system (georgian.se
// Lect05 adjective gradation + dictionary.ge simile corpus). Georgian
// does NOT say "as white as snow" with the full ისევე...როგორც frame in
// literary prose — the native carrier is the ADVERBIAL-CASE simile:
// noun + -ივით/-ვით/-სავით + adjective (თოვლივით თეთრი white-as-snow,
// ტილოსავით თეთრი sheet-white). Fine degrees: mo-...-o attenuative
// (მოთეთრო whitish), უ-...-ეს- elevative high-style (უდიდესი),
// მეტისმეტად excess, საკმაოდ moderate.
const KA_SIMILES_DEGREE = `
GEORGIAN SIMILES & FINE DEGREES (EN↔KA)
• "as [adj] as [noun]" simile → NOUN + ივით/ვით/სავით + [adj]:
  თოვლივით თეთრი as white as snow · მარტივია როგორც ორი ორია
  (matters simple as two and two) · ტილოსავით თეთრი as white as a
  sheet · ლომივით მამაცი as brave as a lion · ბუზღუნასავით murmuring
• ივით attaches to vowel-final stems, სავით to consonant-final stems,
  ვით is the short literary allomorph: თოვლ+ივით, ტილო+სავით
• Attenuative "a bit [adj] / [adj]-ish": mo-...-o circumfix:
  მოთეთრო whitish/a-bit-white · მოშავო blackish · მომწარო
  bitterish · მოწითალო reddish — NEVER ცოტა თეთრი (calque)
• Elevative high-style superlative უ-...-ეს-: უდიდესი greatest ·
  უთეთრესი whitest · ულამაზესი most beautiful · უმძიმესი heaviest —
  bookish/terminology register; everyday superlative stays ყველაზე
• Excess "too": მეტისმეტად excessively · ზედმეტად overly ·
  საჭიროზე მეტი more than necessary — მეტისმეტად is stronger than
  ძალიან and carries complaint/criticism
• Moderate "rather/quite": საკმაოდ · Literary eminence: ფრიად (ფრიად
  პატიოსანი most-honored)
MAPPING: as-snow → თოვლივით · -ish/a-bit → მო-...-ო · very-superlative
high style → უ-...-ეს- · too → მეტისმეტად/ზედმეტად · rather → საკმაოდ
TACTIC: English similes sound translated-ese with ისევე...როგორც in
narration — the -ივით suffix is the native literary carrier. Never
write ცოტა + adjective for the attenuative; use the mo-...-o form.`;

// KA-92 v1.18.0 — Result clauses & proportional correlatives
// (polyglotgym.com result-clause grammar + dictionary.ge "so...that"
// corpus). Georgian encodes result with CORRELATIVE PAIRS: the
// demonstrative in the main clause (ისე / ისეთი / იმდენი) is matched
// by რომ in the subordinate clause. Proportional "the more...the
// more": რაც უფრო ... მით უფრო ...
const KA_RESULT_CORRELATIVES = `
GEORGIAN RESULT CLAUSES & PROPORTIONALS (EN↔KA)
• so + ADV/VERB ... that → ისე ... რომ (manner/degree correlative):
  ისე იყო დაწერილი, რომ ვერავინ წაიკითხა it was written so (badly)
  that nobody could read it · ისე მოსიყვარულებლად ლაპარაკობდა, რომ
  ყველას სურვილი ჰქონდა მოსმენა ესმინა
• so + ADJ ... that → ისეთი ... რომ (quality correlative):
  ისეთი გემო ჰქონდა, რომ ვერ აღვწერდი it had a taste (so odd) that I
  couldn't describe it · ისეთი მზერა მაგდო, რომ აკანკალებდი
• so MUCH/MANY ... that → იმდენი ... რომ (quantity correlative):
  იმდენი ფული მაქვს, რომ სახლის ყიდვა შემიძლია I have so much money
  that I can buy a house · იმდენი წვიმა მოვიდა, რომ გზა გადაირეცხა
• without-result: ისე, რომ არ / ისე რომ არა + clause = "so that not /
  thereby not": ისე გამოვედი, რომ არავინ შეამჩნია I left so that no
  one noticed
• proportional "the more ... the more ...": რაც უფრო ... მით უფრო ...
  — რაც უფრო ვკითხულობ, მით უფრო მესმის the more I read, the more I
  understand · რაც უფრო გვიანდება, მით უარესი the later it gets, the
  worse it is
• "(all) the more so because" → მით უფრო, რომ: მით უფრო, რომ გვიან
  იყო all the more so because it was late
MAPPING: so-adv...that → ისე...რომ · so-adj...that → ისეთი...რომ ·
so-much...that → იმდენი...რომ · the-more-the-more → რაც უფრო...მით
უფრო · the-more-so-because → მით უფრო, რომ
TACTIC: NEVER render "so X that Y" as bare ძალიან X + რომ Y — the
correlative demonstrative (ისე/ისეთი/იმდენი) in the main clause is
OBLIGATORY; რომ alone cannot carry the result meaning.`;

// KA-93 v1.18.0 — The "as" family (dictionary.ge as I/II/III entries).
// როგორც is the master manner/example marker; fixed adverbial frames:
// რაც შეეხება as-for, როგორც წესი as-usual, როგორც ცნობილია as-is-
// known, როგორც ქვემოთაა მითითებული as-follows, ასევე as-well,
// ისევე როგორც just-as, ისეთივე როგორც the-same-as.
const KA_AS_FAMILY = `
GEORGIAN "AS" FAMILY (EN↔KA)
• როგორც = as / like (manner, example): როგორც ვთქვით as we said ·
  როგორც დედას ჰგავს like a mother · ჩემი ძმისვილები, როგორც ძმა as
  brothers · დავწერე როგორც სწავლული I wrote as instructed
• as for X / as to X → რაც შეეხება X-ს (treats X as the OBJECT):
  რაც შეეხება შენს კითხვას, ... as for your question · რაც შემეხება
  as for me — the topic ALWAYS goes in the dative
• as usual → როგორც წესი · as follows → როგორც ქვემოთაა მითითებული ·
  as is known → როგორც ცნობილია · as it seems → როგორც ჩანს · as such
  → როგორც ასეთი · as well → ასევე / ამასთანავე · as yet → ჯერ კიდევ
• just as / the same as → ისევე როგორც · ისეთივე ... როგორც:
  ისევე მაღალია, როგორც შენ as tall as you · ისეთივე წიგნი, როგორც
  შენი the same kind of book as yours · მეც ასევე ვფიქრობ, როგორც
  შენ I think the same as you do
• one and the same → ერთი და იგივე · the same thing → იგივე ·
  same here → მეც ასევე
• as long as (time) → მანამ, სანამ · as long as (condition) →
  რამდენადაც / ვინაიდან · as far as (place) → -მდე · as far as
  (degree) → იმდენად, რამდენადაც · as soon as → როგორც კი
MAPPING: as-like (manner) → როგორც · as-for → რაც შეეხება + dative ·
as-usual → როგორც წესი · as-is-known → როგორც ცნობილია · as-well →
ასევე · just-as → ისევე როგორც · the-same-as → ისეთივე როგორც
TACTIC: "as" is NOT one Georgian word — pick by function. Fixed
frames (როგორც წესი / როგორც ცნობილია) must appear VERBATIM, never
recomposed word-by-word. რაც შეეხება keeps its -ს on the topic.`;

// KA-94 v1.18.0 — Cleft emphasis & focus fronting (dictionary.ge
// "same II" / "exactly" corpus). Georgian achieves English cleft
// ("it is X who/that...") with the particle სწორედ immediately before
// the focused element, plus the არა თუ ... არამედ contrastive-corrective
// frame and the უბრალოდ ის, რომ "the point is" frame.
const KA_CLEFT_EMPHASIS = `
GEORGIAN CLEFT & FOCUS EMPHASIS (EN↔KA)
• "it is/was X who/that ..." cleft → სწორედ X + rest:
  სწორედ ის ვინც მოვიდა it is precisely he who came · სწორედ ის
  რომელიც მაშინ იყო it is the very one who was there then · სწორედ
  ასე exactly so / precisely like this
• Contrastive-corrective "not X but Y / not only X but Y" →
  არა თუ X, არამედ Y: არა თუ ბრალი მდომებს, არამედ გამოცდილებას
  (not that I blame them, but experience) — არამედ REQUIRES the
  არა თუ (or არა მხოლოდ) setup before it
• "not only ... but also" → არა მხოლოდ X, არამედ Y:
  არა მხოლოდ წავიკითხე, არამედ დავწერე ანალიზი too
• "the point is / it's just that" → უბრალოდ ის, რომ / უბრალოდ:
  უბრალოდ ის, რომ დავიღალე the point is I got tired
• Fronting for emphasis: Georgian moves the focused element BEFORE
  the verb without any particles — კარგი წიგნია (it's a GOOD book)
  vs წიგნი კარგია (the book is good); ის კი არა, მაგრამ ... "him
  certainly not, but ..."
• სწორედ also = exactly/precisely as a degree adverb: სწორედ იმ
  დღეს precisely on that day · სწორედ აქ exactly here
MAPPING: it-is-X-who → სწორედ X · not-only-but → არა მხოლოდ ...
არამედ ... · not-X-but-Y → არა თუ X, არამედ Y · the-point-is →
უბრალოდ ის, რომ · exactly → სწორედ
TACTIC: An isolated არამედ without its არა თუ / არა მხოლოდ setup is
a defect — always check the corrective frame is complete. სწორედ goes
IMMEDIATELY before the focused word, never sentence-initial.`;

// KA-95 v1.19.0 — Motion verbs (suppletive system). kahibaro.com 9.5 +
// latinum.substack.com Lesson 37: English "go/come" have NO stable root —
// present uses მიდ-/მოდ- stems, future/aorist fuses წა-/მო- + -ვალ/-ვა.
// Also covers the other top-frequency irregulars (ცოდნა, სურდეს, ...).
const KA_MOTION_VERBS = `
GEORGIAN MOTION VERBS — SUPPLETIVE SYSTEM (EN↔KA)
• "go" has THREE roots by tense: present stem მიდ-, future/aorist წა-,
  masdar წასვლა:
  მივდივარ I go · მიდიხარ you go · მიდის he goes · მივდივართ we go ·
  მიდიხართ you (pl) go · მიდიან they go — BUT წავალ I will go ·
  წავა he will go · წავიდა he went · წადი! go! (imperative)
• "come": present stem მოდ-, future მო-, masdar მოსვლა:
  მოვდივარ I come · მოდიხარ you come · მოდის he comes · მოდიან they
  come — BUT მოვალ I will come · მოვა he will come · მოვიდა he came ·
  მოდი! come! · ჩამოდის he comes down · ჩამოვა he will come down
• Suppletive trap: NEVER build a present from წა- (წავდივარ is wrong)
  and NEVER build a future from მიდ- (*მივალ for plain go is wrong —
  წავალ is the future of go; მი- with მივა exists only with a goal
  phrase as a bookish variant).
• Other suppletive/high-frequency irregulars:
  ცოდნა know-a-fact → ვიცი / იცის vs ცნობნა know-a-person → ვიცნობ /
  იცნობს · სურდეს want → მინდა / გინდა / უნდა / უნდათ · გაკეთება do →
  ვაკეთებ / აკეთებს · თქმა say → ამბობს / თქვა said · იყო be → ვარ /
  ხარ / არის · ქონა have → მაქვს / აქვს / აქვთ
MAPPING: go → მიდის (present) / წავიდა (past) / წავა (future) ·
come → მოდის / მოვიდა / მოვა · imperative go! → წადი, come! → მოდი
TACTIC: Translating "he goes" word-by-word gives *წადის or *წავდის —
both wrong. Pick the root BY TENSE first, then conjugate the stem.`;

// KA-96 v1.19.0 — Directional preverbs + transitive motion. Tbilisi2007
// (ILLC) inventory + latinum.substack.com Lessons 37/54 + cram.com
// მოყვანა/მიყვანა set + georgian.english-dictionary.help მოუტანს:
// preverbs fuse with motion verbs to build directed motion; the
// bring/take-by-vehicle verbs invert (ჰ- marker).
const KA_DIRECTIONAL_PREVERBS = `
GEORGIAN DIRECTIONAL PREVERBS & TRANSITIVE MOTION (EN↔KA)
• Simple preverbs fuse with მიდის/წავიდა to give directed motion —
  each replaces "go" with a NEW verb with its own masdar:
  ა- up → ავედი (he) went up, ასვლა · ჩა- down → ჩამოვედი went down,
  ჩამოსვლა · გა- out → გავედი went out, გასვლა · შე- in → შევიდა went
  in / entered, შესვლა · გადა- across → გადავედი crossed over,
  გადასვლა · მი- to(toward a goal) → მივედი went (to), მისვლა ·
  მო- toward-speaker → მოვედი came, მოსვლა · წა- away(from speaker)
  → წავიდა went away, წასვლა · და- return → დავბრუნდი returned,
  დაბრუნება
• With DESTINATION, "went" prefers წავიდა or მივედი: სახლში წავიდა
  he went home · ქალაქში მივედი I went to the city. With SOURCE,
  წამოვიდა set out (from here). -ში/-ზე/-დან mark the goal/surface/
  source (შევიდა ოთახში entered the room).
• Transitive motion — carrying a PERSON (invertive, dative object +
  ჰ- person marker): წაიყვანს will take (someone), წაყვანა took ·
  მიყვანს / მიჰყავს takes (to a goal), მიყვანა · მოყვანს / მოჰყავს
  brings (someone here), მოყვანა. Pattern: replace მო- with მი-/წა-
  to switch from bring to take: დედამ ბავშვი სკოლამდე მიჰყავს the
  mother takes the child to school.
• Transitive motion — carrying a THING (direct object): მოაქვს /
  მოუტანს brings (a thing), მოტანა · მიაქვს / მიუტანს takes (a thing
  to a goal), მიტანა · ატარებს carries/wears, ტარება · წამოიღო took
  (a thing and left)
MAPPING: went-out → გავედი · went-in/entered → შევიდა · went-up →
ავედი · went-down → ჩამოვედი · crossed → გადავედი · returned →
დაბრუნდა · bring-sb → მოყვანს · take-sb → მიყვანს/წაიყვანს ·
bring-sth → მოაქვს · take-sth → მიაქვს · carry → ატარებს
TACTIC: English "went" collapses 6+ Georgian verbs. Choose the
preverb from the PATH (out/in/up/down/across/away/toward), not from
"went". Person-objects take the ჰ- invertive carrier (მოჰყავს), not
the direct-object form.`;

// KA-97 v1.19.0 — Posture verbs. kartuliena.eu ზის-vs-ჯდება +
// kaikki.org + cram.com III-conjugation set: დგას/ზის/წევς describe
// STATE in the present where English uses progressive "is standing/
// sitting/lying"; the change-of-state aorists are irregular.
const KA_POSTURE_VERBS = `
GEORGIAN POSTURE VERBS (EN↔KA)
• დგას stands (state): ვდგავარ I stand · დგახარ you stand · დგას he
  stands · დგანან they stand. In narration a standing figure is
  იდგა he was standing (aorist of დგომა), NOT *იყო მდგომი.
• ზის sits (state): ვზივარ I sit · ზიხარ you sit · ზის he sits ·
  სხედან they sit (irregular plural; literary alternative to ზიან).
  Literary prose often prefers სხედან for 3pl.
• Change of state "sat down": დაჯდა he sat down (aorist), masdar
  დაჯდომა/ჯდომა; aorist person grid: ვიჯექი I sat · იჯექი you sat ·
  იჯდა he sat · ვიჯეთ we sat · იჯეთ you (pl) sat · ისხდნენ they sat.
• წევს lies (state): ვწევვარ I lie · წევხარ you lie · წევს he lies ·
  წევანან they lie. "lay down" → დაწვა he lay down, დაწოლა.
• State present, not progressive: Georgian uses the simple present
  for what English renders "is standing/sitting/lying" — ქუჩაში
  დგას he is standing in the street (never *ის დგება).
MAPPING: stand/stands → დგას (ვდგავარ/დგახარ/დგანან) · stood →
იდგა · sit → ზის (ვზივარ/ზიხარ/სხედან) · sat (down) → დაჯდა /
ვიჯექი · lie/lies → წევს (ვწევვარ/წევხარ) · lay down → დაწვა
TACTIC: Posture verbs are the natural carrier for static scene
description — a character "was standing" is იდგა, a body "lay" is
წევს/ეწო. Do not import English "be + participle" periphrasis.`;

// KA-98 v1.20.0 — Masdar adverbial temporal phrases. latinum.substack.com
// Lesson 63 (დრო — daily-routine frames) + Lesson 54 (-ისას) +
// polyglotclub.com (masdars decline like nouns; genitive marks the
// action before a postposition). The genitive masdar is Georgian's
// gerund: every English "V-ing / having V-ed" time phrase maps to
// [GEN masdar] + [შემდეგ|წინ|დროს|დრომდე|დროიდან].
const KA_MASDAR_ADVERBIAL = `
GEORGIAN MASDAR ADVERBIALS — TEMPORAL FRAMES (EN↔KA)
• The masdar (verbal noun) declines like a noun; in the GENITIVE it is
  Georgian's gerund. A temporal postposition after it builds the
  equivalent of English "after/before/while V-ing":
  V-ის შემდეგ after V-ing · V-ის წინ before V-ing · V-ის დროს while/
  when V-ing · V-ის დრომდე until V-ing · V-ის დროიდან from V-ing on
• Literary compact variant: -ისას = -ის დროს (შუადღისას at midday,
  მოსვლისას on arrival). Both are correct; -ისას is more written-style.
• Perfect gerund "having done X" / "after he had done X" → X-ის
  შემდეგ: საუზმის მირთმევის შემდეგ having served breakfast ·
  დამთავრების შემდეგ after finishing · ამის შესახებ გაგების შემდეგ
  upon learning of it · გამოღვიძების შემდეგ after waking up.
• With an OBJECT, the object too goes genitive, BEFORE the masdar:
  წიგნის წაკითხვის შემდეგ after reading the book · სადილის მირთმევის
  წინ before serving lunch · სახლში დაბრუნების დროს while returning
  home (destination სახლში stays -ში and fronts the masdar).
• Attested daily-routine frames: სამსახურში წასვლის დრომდე until it
  was time to go to work · სადილის შემდეგ after lunch · ძილის წინ
  before sleep · დაძინებამდე before falling asleep · ადგომის დროს
  on getting up.
• Persian-style loan frames are common in classical narrative:
  წამოდგომისთანავე as soon as (he) rose · -ისთანავე as soon as =
  -ის თანავე; choose -ისთანავე for immediacy, -ის შემდეგ for plain
  sequence.
MAPPING: after V-ing → GEN-masdar + შემდეგ · before V-ing →
GEN-masdar + წინ · while V-ing → GEN-masdar + დროს / -ისას ·
until V-ing → GEN-masdar + დრომდე · as soon as V-ing → GEN-masdar +
-ისთანავე · having V-ed → GEN-masdar + შემდეგ
TACTIC: Never translate "after reading" as შემდეგ კითხულობს or a
finite clause "შემდეგ წაიკითხა როცა" — Georgian prefers the single
frozen frame [GEN masdar + postposition]: წაკითხვის შემდეგ. The
masdar of a preverb verb keeps its preverb: დაბრუნება, წასვლა,
შესვლა, გასვლა.`;

// KA-99 v1.20.0 — Temporal noun frames. latinum.substack.com Lesson 63:
// დრო declension (NOM დრო, GEN დროის, DAT დროს, INST დროთი, ADV დროდ)
// and documented learner defects (*ომის დრო → ომის დროს; *დრო ვკითხულობ
// → დროს ვკითხულობ; word order მე არ მაქვს დრო).
const KA_TEMPORAL_NOUN_FRAMES = `
GEORGIAN TEMPORAL NOUN FRAMES — "დრო" & CO (EN↔KA)
• დრო time declines: NOM დრო · GEN დროის · DAT დროს · INST დროთი ·
  ADV დროდ · pl დროები/დროებს. TEMPORAL USE TAKES THE DATIVE -ს:
  ომის დროს during the war (NEVER *ომის დრო) · საღამოს დროს at
  evening time · იმ დროს at that time · ამ დროს at this moment ·
  დროს ვკითხულობ I read for a time (dative, not *დრო).
• N-ის განმავლობაში during X (duration): ომის განმავლობაში during
  the war · დროთა განმავლობაში over the course of time (archaic-gen
  დროთა fixed idiom).
• From-to span: დროიდან...-მდე / N-დან N-მდე: დილიდან საღამომდე from
  morning till evening · სამსახურში წასვლის დრომდე until work-time.
• Starting point in time: N-ის დროიდან since X: ბავშვობის დროიდან
  since childhood · გუშინდან from yesterday on.
• Dayparts decline irregularly by class — memorize whole forms:
  დილით in the morning (INST-like -ით) · შუადღისას at midday (-ისას)
  · საღამოს in the evening (GEN-form) · ღამით at night (-ით) ·
  ზამთარში in winter (-ში) · გაზაფხულზე in spring (-ზე). Do not
  normalize them to one pattern.
MAPPING: during X → X-ის დროს (event) / X-ის განმავლობაში (span) ·
at that time → იმ დროს · since X → X-ის დროიდან · from X till Y →
X-დან Y-მდე · in the morning/evening/night → დილით/საღამოს/ღამით ·
over time → დროთა განმავლობაში
TACTIC: "during" with an EVENT noun is N-ის დროს (dative!); with a
DURATION noun prefer N-ის განმავლობაში. Never leave დრო bare after
a genitive attribute — *ომის დრო is the documented defect.`;

// KA-100 v1.21.0 — Deep participle system
const KA_DEEP_PARTICIPLES = `
GEORGIAN PARTICIPLE SYSTEM — DEEP MORPHOLOGY (EN↔KA)
• RESULTATIVE ნა-: "what has been V-ed (and remains)". ნაწერი written
  (stays written) · ნანახი seen · ნაჭამი eaten (leftovers) · ნასმელი
  drunk · ნათქვამი said/uttered · ნაკეთები made. Attribute first, noun
  second: ნანახი ადამიანები the people (he) had seen · ნათქვამი
  სიტყვა the words spoken. Often corresponds to English perfect
  attributives "the books (he had) read".
• PAST PASSIVE PARTICIPLE (PPP): preverb + stem + -ილ-/-ულ-/-ებულ-,
  agreeing like any adjective (NOM დაწერილი, ERG დაწერილმა, DAT/ADV
  დაწერილ, INST დაწერილით, VOC დაწერილო):
  დაწერილი written · ნაპოვნი found (masdar-ი + -ი) · მოკლული killed ·
  გაკეთებული done/made · ნაჭმევი/ნაჭამი eaten · გაბრაზებული angry
  (result-state) · დაკავებული busy/occupied. ე-verbs use -ებულ-:
  დაბადებული born · შეყვარებული in love.
• POTENTIAL / future passive: -ებელი (transitive roots: გასაკეთებელი
  to-be-done, საწერი to-be-written) and -ველი (intransitive roots:
  მომავალი coming/future, დასახმარებელი to-be-helped). Short suppletive
  set: საკითხავი worth-reading/readable, სანახავი worth-seeing, სმენა-
  dust. სა-...-ელ- circumfix for passive potential: სა-ხატ-ავ-ელ-ი
  paintable / that-can-be-painted.
• NEGATIVE POTENTIAL და-უ- (or bare უ- on stems): "that cannot be
  V-ed". დაუჯერებელი unbelievable · დაუსრულებელი unfinishable ·
  დაუმთავრებელი unfinished/never-ending · დასაჯდომარედ unwritable
  variant · უხილავი invisible · უვარგისი unusable. With preverbs:
  და-უ-ხატ-ავ-ი something-not-painted. English un-/in-/-less
  adjectives of possibility map HERE, not to არა-: *არაჯერებელი is
  wrong.
• AGENT/SUBJECT PARTICIPLES: მ-...-ელ- / მ-...-არ- (transitive):
  და-მ-წერ-ელ-ი one-who-wrote-it · მწერალი writer · მხატვარი painter ·
  მასწავლებელი teacher · მომღერალი singer · მშენებელი builder. English
  "the man who built this house" → ამ სახლის მშენებელი კაცი.
• PARTICIPLE vs ყოფილა: ყოფილი is the plain PPP of არის "been" (ყოფილი
  მოსწავლე former pupil, ყოფილი პრეზიდენტი former president); ყოფილა
  is the PERFECT screeve "apparently was" (evidential, already covered
  by v1.14.0 rules). Do not mix: *ყოფილა მოსწავლე is wrong for
  "former pupil".
MAPPING: the books he had read → ნაკითხი წიგნები / წაკითხული წიგნები ·
written (by) → დაწერილი · broken → დამტვრეული · busy → დაკავებული ·
angry → გაბრაზებული · born → დაბადებული · future → მომავალი ·
unbelievable → დაუჯერებელი · impossible → შეუძლებელი · invisible →
უხილავი · writer → მწერალი · former X → ყოფილი X
TACTIC: English attributive perfects ("the books he had read") map to
the single noun-sized RESULTATIVE/PPP, never to a finite clause
*წიგნები, რომლებიც წაიკითხა ჰქონია — the participial form is the
literary norm (v1.6.0 KA_RELATIVES already prefers it). ნა- says
"result still there"; -ილ-/-ებულ- says "result achieved"; -ებელი/
-ველი says "can be done"; და-უ- says "cannot be done".`;

// KA-101 v1.21.0 — Existential & possessive frames
const KA_EXISTENTIAL_FRAMES = `
GEORGIAN EXISTENTIAL & POSSESSIVE FRAMES (EN↔KA)
• "HAVE" is locative, not transitive: OWNER in dative + აქვს/ჰქონდა:
  მას ჰქონდა ცხენი he had a horse · მას აქვს სახლი he has a house ·
  მას არ ჰქონია he (apparently) never had. NEVER *მას ჰქონდა as
  "he possessed" with ergative. NEGATIVE of possession = არ + აქვს
  (he doesn't have), not a verb არ ფლობს.
• EXISTENCE: არის exists/is · არ არის doesn't exist · არსებობს
  exists (abstract) · არსებობდა existed (past) — "There is no X" →
  X არ არის / X არ არსებობს, never *აქ არ აქვს X.
• AVAILABILITY/PRESENCE: ნახულობს is (found) here / is available:
  მაღაზიაში პური არ ნახულობს there's no bread at the shop. Passive-
  shaped, take DAT subject + GEN agent if stated.
• LOCATION exists-frame: place + postposition + დგას/ზის/წევს for
  upright/sitting/lying things: მაგიდაზე წიგნი დევს the book is
  (lying) on the table · კედელზე სურათია there's a picture on the
  wall. English bare "is on/in" prefers the posture verb or -ია
  copula, NOT არის repeated.
• "THERE WAS" narrative openers → იყო or bare nominative: იყო და
  არა იყო, რა იყო იყო — the folk-tale formula; keep იყო for neutral
  "there was".
MAPPING: he has → მას აქვს · he had → მას ჰქონდა · there is/are →
არის / -ია · there is no → არ არის / არ არსებობს · is available →
ნახულობს · is on the table → მაგიდაზეა / მაგიდაზე დევს
TACTIC: never translate "have/has" as an ergative verb; the dative
owner is obligatory (v1.2.0 KA_IMPERSONAL frames already demand the
dative experiencer — possession is the same pattern).`;

// KA-102 v1.22.0 — Affective (dative-subject) verb system
const KA_AFFECTIVE_VERBS = `
GEORGIAN AFFECTIVE / DATIVE-SUBJECT VERB SYSTEM (EN↔KA)
• INVERSION PRINCIPLE: the EXPERIENCER (feeler) is DATIVE and the verb
  agrees with HIM/HER; the stimulus (thing loved/seen/wanted) is
  NOMINATIVE. English "I love you" → მე შენ მიყვარხარ (I-DAT you
  love-2SG-OBJ); "She loves him" → მას უყვარს ის (NOT *ის უყვარს მას).
• m-CLASS PARADIGM of უყვარს (loves): PRS მიყვარს/გიყვარს/უყვარს ·
  გვიყვარს/გიყვართ/უყვართ · IMPERF მიყვარდა/უყვარდა · FUT მეყვარება/
  ეყვარება · PERF მყვარებია/ჰყვარებია (evidential "has loved") ·
  COND მეყვარებოდა. FUTURE subjunctive: მეყვარებოდეს.
• FULL AFFECTIVE VERB SET (all m-class, DAT experiencer):
  მოსწონს likes (მომწონს I-like · მოსწონს he-likes · მოგწონთ they-like-you);
  მძულს hates (მას მძულს სიცრუე he hates lies — stimulus NOM);
  მეშინია is-afraid (object GENITIVE: მეშინია სიბნელის I fear the dark
  / მეშინია, რომ დაგვიანდება I'm afraid we'll be late);
  მსურს wants (formal; მინდა colloquial — მინდა პური I want bread,
  stimulus NOM); სწამს believes + DAT (მწამს შენი I believe you);
  სჯერა trusts + GEN (მსჯერა მისი I trust him); მჭირდება needs
  (მჭირდება ფული I need money — stimulus NOM); სძინავს sleeps/
  is-asleep (მძინავს); მსმენია has-heard-of (PERF evidential:
  მსმენია ეს ამბავი I've heard this story); მახსოვს I-remember
  (არ მახსოვს სახელი I don't remember the name); შეუძლია can
  (მშეუძლია — subject DAT, action masdar or optative).
• NEVER translate "I love/like/hate/see/know" with v-class present
  of the plain verb when the frame is affective: *მე ვუყვარვარ,
  *მე მიყვარს ვარ — always m-class with DAT experiencer.
• PAST: affective imperfect მიყვარდა/მომწონდა/მეშინია (I used to
  love/like/fear — invariable shape, DAT experiencer). PERFECT
  evidential: მყვარებია/მსმენია — English "had loved/has heard" in
  hearsay contexts.
MAPPING: I love X → მიყვარს X · she loves him → მას უყვარს ის ·
I like it → მომწონს · I hate it → მძულს · I'm afraid → მეშინია ·
I want → მინდა/მსურს · I need → მჭირდება · I remember → მახსოვს ·
I believe → მწამს
TACTIC: any English stative emotion/perception verb maps to an
m-class carrier + dative experiencer; the STIMULUS takes NOM (GEN
for მეშინია/სჯერა), never ergative; v1.13.0 KA_IMPERSONAL_DEEP
covered the bodily states (მშია/მტკივა) — this block covers the
INTERPERSONAL and cognitive set.`;

// KA-103 v1.22.0 — Be-form object agreement (მიყვარხარ family)
const KA_BEFORM_AGREEMENT = `
GEORGIAN BE-FORM OBJECT AGREEMENT (მიყვარხარ სისტემა) (EN↔KA)
• RULE: interpersonal emotion verbs (უყვარს love, მოსწონს like,
  სძულს hate, უნდება desire, ჰყავს have-someone) may mark a
  1st/2nd-PERSON OBJECT with the PRESENT "TO BE" form instead of a
  person suffix: ვარ/ხარ/არის + ვართ/ხართ/არიან.
• მიყვარხარ I-love-you (მ-1SG-DAT + ყვარ + ხარ-2SG-OBJ) ·
  გიყვარვარ you-love-me (გ-2SG-DAT + ყვარ + ვარ-1SG-OBJ) ·
  უყვარვარ he-loves-me · გვიყვარხართ we-love-you(pl) ·
  გიყვარხართ I-love-you(pl/polite) · გყავხარ you-have-me —
  plural OBJECT gets plural be-form: მიყვარხართ I-love-you-all.
• DOUBLE-v COLLAPSE: where the form would show two ვ (გყავვარ
  you-have-me), only one is written: გყავარ. Similarly
  გვყავვართ → გვყავართ shape rules; memorize the stock forms.
• SERIES RESTRICTION: be-form agreement occurs ONLY in Series I
  present group (PRS). Outside it use plain agreement: შენ გიყვარდი
  I loved you (imperfect), შენ გიყვარე you were loved (aorist).
• მოვწონვარ she-likes-me (მო- preverb + ვ-1SG-OBJ + წონ + ვარ);
  with 3SG experiencer the ს- marker is replaced by the be-form:
  უყვარხარ he-loves-you.
• PRONOUNS OPTIONAL: მე შენ მიყვარხარ is emphatic; bare მიყვარხარ
  is the neutral literary form (v1.8.0 KA_SUBORDINATION noted the
  same economy for subject pronouns).
MAPPING: I love you → მიყვარხარ · you love me → გიყვარვარ ·
we love you → გვიყვარხარ · I love you all → მიყვარხართ ·
she likes me → მოვწონვარ · do you love me? → გიყვარვარ?
TACTIC: when the OBJECT of love/like/hate/miss/have is 1st or
2nd person, append the be-form; do NOT write უყვარს შენ or
*მიყვარს შენ — that shape is reserved for 3rd-person stimuli.`;

// KA-104 v1.23.0 — Reported questions / indirect speech
const KA_REPORTED_QUESTIONS = `
GEORGIAN REPORTED QUESTIONS / INDIRECT SPEECH (არაპირდაპირი მეტყველება) (EN↔KA)
• POLAR QUESTIONS (yes/no): the conjunction is თუ — NEVER რომ:
  "He asked me if I want coffee" → მან მკითხა, თუ მინდა ყავა (Latinum
  L50); "I don't know whether she will come today" → არ ვიცი, თუ
  მოვა დღეს ის. "იცი თუ არა..." = "do you know whether..." (v1.6.0
  KA_PARTICLES complement).
• POLAR ALTERNATIVE თუ არა — clause-FINAL or pre-verbal:
  "he asked me whether we would be coming to the party" →
  მან მკითხა, მივიდოდით თუ არა წვეულებაზე (dictionary.ge);
  "I'll see whether she's at home" → ვნახავ, სახლში არის თუ არა იგი;
  "the question arose as to whether" → წამოიჭრა საკითხი, იყო თუ არა.
• ხომ არ STRATEGY: polar reported questions also use the tag frame:
  "she asked me whether I needed any help" → მან მკითხა, რაიმე
  დახმარება ხომ არ მჭირდებოდა (dictionary.ge) — ხომ არ + imperfect
  softens the polarity (expects "yes" less than თუ არა).
• WH RETENTION: wh-words are kept DIRECTLY with NO conjunction;
  statement word order, question mark DROPS:
  "he asked where I was going" → მკითხა, სად მივდიოდი (v1.6.0
  KA_RELATIVES rule, now with frames); "she told me what book she
  needs" → მან მითხრა, თუ რომელი წიგნი სჭირდება (თუ რომელი variant
  attested); "do you know which cinema it's in" → იცი თუ რომელ
  კინოთეატრშია (Latinum L50); "I believe what he told me" →
  მე მჯერა იმის, რაც მე მან მითხრა (რაც fused relative).
• TENSE BACKSHIFT: English past → Georgian IMPERFECT, never pluperfect:
  "he asked where I was going" → სად მივდიოდი; would + V → future-in-
  past მივიდოდით (v1.11.0 KA_FUTURE_IN_PAST); general truths may stay
  present: "she does not know what she wants" → არ იცის, რა უნდა;
  "no one knows exactly what happened" → ზუსტად არავინ იცის, რა მოხდა.
• DOUBLE OPTATIVE for "whether to V or V": infinitive questions become
  two optatives: "whether to go or stay" → წასულიყო თუ დარჩენილიყო
  (dictionary.ge). Masdar + თუ variant: ვნახავთ თუ შევძლებთ "we'll
  see whether we can" (Latinum L50).
• CONCESSIVE "whether or not": იმისდა მიუხედავად, მოვა იგი თუ არა...
  (dictionary.ge) — თუ არა postposed inside the concessive frame
  (v1.16.0 KA_OPTIONS_CORRELATIVE complement).
• "WHAT IF": რა იქნება, ... რომ + optative — "what if the train is
  late?" → რა იქნება, მატარებელმა რომ დაიგვიანოს? (რომ is clause-
  FINAL in the optative frame) — or the fused ვაითუ (dictionary.ge).
MAPPING: asked if → მკითხა, თუ · asked whether → მკითხა, ხომ არ/თუ არა ·
told me what → მითხრა, თუ რომელი/რა · I wonder if → მაინტერესებს, თუ ·
don't know if → არ ვიცი, თუ · what if → რა იქნება, რომ/ვაითუ ·
whether to go or stay → წასულიყო თუ დარჩენილიყო
TACTIC: reported questions keep STATEMENT word order; polar uses თუ
(never რომ), wh retains the wh-word (optionally preceded by თუ);
backshift is past→imperfect ONLY, never pluperfect; question mark
becomes a period (or ? only after რა იქნება, ... რომ frames).`;

// KA-105 v1.23.0 — Reported commands & quotative -ო
const KA_REPORTED_COMMANDS = `
GEORGIAN REPORTED COMMANDS / QUOTATIVE PARTICLE -ო (EN↔KA)
• REPORTED COMMANDS: the quote becomes an OPTATIVE marked for the
  ORIGINAL addressee (1st person if I was commanded):
  "He told me to wait" → მან მითხრა, დაველოდე (optative of
  დაელოდება); negative: "she told him not to go" → მან უთხრა,
  არ წასულიყო (or ნუ წახვალო with quotative).
• REQUESTS: "asked me to help" → სთხოვა დახმარება (request verb
  სთხოვა + masdar; the plain მკითხა is for INFORMATION questions,
  სთხოვა for favours/objects: სთხოვა ფული he asked for money).
• QUOTATIVE -ო: colloquial hearsay marker GLUED to the last word of
  the reported utterance: "she asked me whether I needed any help" →
  ... გჭირდებაო (dictionary.ge); მოვაო "he says he'll come"; ნუ წავაო
  "he says don't go". Literary narration prefers the თუ/რომ frames;
  -ო belongs to marked live dialogue (v1.16.0 KA_QUOTATIVES deepening).
• SPEECH VERBS (aorist, addressee DATIVE — მ- me, გ- you, უ- him/her):
  მკითხა asked-me · ჰკითხა asked · მითხრა told-me · უთხრა told-him ·
  გვითხრა told-us · თქვა said · უპასუხა answered/replied ·
  ჩურჩულა whispered · დაუყვირა shouted-at · დაიძახა called-out ·
  სთხოვა requested. "he phoned me" → დამირეკა (v1.19.0 motion მი-
  toward-speaker inside და- perfective).
• "SAID (THAT)" statements: თქვა, რომ + indicative — რომ is REQUIRED
  for reported statements and DROPPED for reported questions (თუ
  takes over): "he said that he was tired" → თქვა, რომ დაღლილი იყო.
MAPPING: told me to wait → მითხრა, დაველოდე · asked me to help →
სთხოვა დახმარება · he said (that) → თქვა, რომ · answered → უპასუხა ·
whispered → ჩურჩულა · told us → გვითხრა
TACTIC: choose the speech verb by INTERACTION TYPE (information →
კითხ stem, favour → სთხოვ, statement → თქვ/უთხრ); the addressee is
dative ON the verb, never a nominative pronoun; optative person of
the embedded command matches the ORIGINAL addressee, not the reporter.`;

// KA-106 v1.24.0 — Future intent: "be going to" / planned future
const KA_FUTURE_INTENT = `
FUTURE INTENT — "BE GOING TO" (glosbe.com / გლოსბე: აპირებს = "to be going to"
[enwiki-01-2017-defs]; dictionary.ge intend: "what do you intend to
do?" → რის გაკეთებას აპირებთ?; latinum L13: ხვალ ის აპირებს სპორტზე
წასვლას დილით; kartuliena.eu/moods: დავწერ წერილს = I am going to write
a letter):
• "BE going to + VERB" (planned future) → აპირებს + masdar in DATIVE
  (dictionary.ge attests რის გაკეთებას აპირებთ — the action noun takes
  -ს/-ს, the case masdars take as objects):
  "I'm going to leave" → აპირებ წასვლას · "he is going to help us" →
  აპირებს დაგვეხმაროს ან ჩვენი დახმარებას აპირებს · "what are you going
  to do?" → რას აპირებ? / რის გაკეთებას აპირებთ?
  NEVER the motion verb: "I'm going to leave" is NOT მიდის წასვლას and
  NOT *მე მიდის — "going to" marks INTENT, not walking.
• PARADIGM of აპირებს (Series I present; aorist აპირე, imperfect
  აპირებდა):
  ვაპირებ (I plan/am going to) · აპირებ (you) · აპირებს (he/she) ·
  ვაპირებთ (we) · აპირებთ (you pl) · აპირებენ (they).
  IMPERFECT (was going to): ვაპირებდი · აპირებდი · აპირებდა ·
  ვაპირებდით · აპირებდით · აპირებდნენ — the engine's attested frame:
  "on the verge of leaving" → ვაპირებდი წასვლას (KA_MASDARS).
  NOTE the ambiguity: აპირებთ is BOTH 2nd-plural present AND 1st-plural
  imperfect; disambiguate by context (ხვალ/დღეს/გუშინ).
• SEMANTIC LADDER (intent strength):
  1. Neutral plan: აპირებს + masdar-DAT (აპირებ წასვლას).
  2. General will/desire: მინდა + masdar (მინდა წავიდე / წასვლას).
  3. On the verge of (imminence): ვაპირებდი წასვლას / მივდიოდი.
  4. Plain future (prediction or intention — most natural for Georgian):
     preverb + FUTURE: "I'm going to write a letter" → დავწერ წერილს
     (kartuliena.eu). Georgian prose usually prefers the simple future;
     აპირებს is for CONTRASTED, deliberated plans ("that's the plan").
• "WAS GOING TO" (abandoned past intention) → imperfect აპირებდა +
  masdar-DAT: "I was going to call you" → დაგირეკავდი ან დაგირეკას
  ვაპირებდი — imperfect keeps the unfulfilled reading.
• "GOING TO" in literal MOTION sense ("I'm going to the market") keeps
  the motion verb: ბაზარზე მივდივარ/მივდიოდი — ზე marks the goal
  (KA_PURPOSE_CLAUSES). Decide INTENT vs MOTION by the following
  element: infinitive/gerund → intent (აპირებს), noun-place → motion
  (მივდივარ).
MAPPING: I'm going to V → ვაპირებ V-ს · are you going to V? →
აპირებ ...-ს? · he's going to V → აპირებს ...-ს · we're going to V →
ვაპირებთ ...-ს · they're going to V → აპირებენ ...-ს · was going to →
აპირებდა · not going to → არ ვაპირებ (negation on აპირებს, never on
the masdar alone)
TACTIC: when the English aux is be/is/am/are/was/were + going + to +
VERB, translate INTENT (აპირებს-paradigm) or plain future, NEVER the
bare motion mapping მიდის — that reading exists only for motion to a
PLACE. The masdar after აპირებს takes dative -ს (წასვლას, დაწერას,
ნახვას), mirroring რის გაკეთებას აპირებთ.`;

// KA-107 v1.25.0 — Habituality & hortatives
const KA_HABITUAL_HORTATIVE = `
HABITUALITY & HORTATIVES (grammars.training/ka/grammar/used-to: "used to
always refers to the past" + V1 after used to; en.wiktionary Appendix:
Georgian verbs — imperfect screeve = habitual past, "the meaning of used
to"; talkpal.ai frequency: always=ყოველთვის, usually=ჩვეულებრივ,
often=ხშირად, sometimes=ზოგჯერ, rarely=იშვიათად, never=არასდროს;
kahibaro.com habit table: ხოლმე = usually/sometimes (habit);
learnentry.com: Let's ask the teacher → მოდი ვკითხოთ მასწავლებელს,
Let's go out and eat → გავიდეთ და ვჭამოთ):
• HABITUAL PAST ladder: "used to V" / "would V (habit)" / "always V-ed"
  → IMPERFECT screeve; ხოლმე sharpens the habitual reading and sits
  NEXT TO the verb: დადიოდა ხოლმე ტბასთან (he used to go to the lake).
  Never conditional დადიოდებოდა-style forms for habit; conditional is
  ONLY future-in-past after a report or counterfactual (KA-45).
• "used to be + N/Adj" → იყო + imperfect carrier context (იყო alone
  already covers state habit: ახალგაზრდა იყო ხოლმე).
• be used to V-ing = DIFFERENT IDIOM (accustomed) → მიჩვეული ვარ + masdar
  (მიჩვეული ვარ ადრე ადგომას) — never the habitual imperfect.
• FREQUENCY ADVERBS (position: usually pre-verbal, ხოლმე post-verbal):
  always=ყოველთვის · usually=ჩვეულებრივ / ძირითადად · often=ხშირად ·
  sometimes=ზოგჯერ · rarely=იშვიათად · seldom=იშვიათად ·
  never=არასდროს (+ არ on the verb — negative concord KA-45 of
  არასდროს არ ...), every day=ყოველ დღე, every morning=ყოველ დილას.
• HORTATIVE "let's + V" → მოდი(თ) + OPTATIVE 1pl: მოდი ვკითხოთ,
  გავიდეთ და ვჭამოთ, მოდი კინოზე წავიდეთ. Negative: ნუ მივდივართ
  style prohibitive. "let us not V" → ნუ + optative.
• "let me + V" → მიმეცი/მომეცი-type optative 1sg (მოვუსმინო frame) or
  მინდა ვ... paraphrase; keep the volitive, never aorist.
MAPPING: used to V → imperfect (+ ხოლმე) · would always V → imperfect
ხოლმე · let's V → მოდი(თ) + optative-1pl · let me V → optative-1sg /
მინდა ვ · always → ყოველთვის · never → არასდროს + არ`;

// KA-108 v1.26.0 — Negation carriers: do-support auxiliaries → არ / ვერ
const KA_NEGATION_CARRIERS = `
NEGATION CARRIERS (en.wikibooks.org/wiki/Georgian/Questions#Negation:
"There are three kinds of negation particles: ar 'not', ver 'cannot',
nu 'do not!'. Ar is the chief one... Ver is only used to indicate that
the grammatical subject of the sentence is NOT ABLE to carry out an
action" — Tsasvla ar minda 'I do not want to go', Ver movedi 'I could
not come'; science.org.ge Sharashenidze "Interaction of Modality and
Negation in the Georgian Language": "Georgian has a three-member system
of negation: particle ar for neutral negation, ver expresses
possibility, nu request/prohibition"; talkpal.ai: არ sits DIRECTLY
BEFORE the verb — ის არ წავიდა 'he did not go', მე არ ვმუშაობ 'I am
not working'; ეს არ არის წიგნი 'this is not a book' (ar + aris)):
• ENGLISH DO-SUPPORT has NO Georgian counterpart: don't / doesn't /
  didn't / do not / does not / did not → არ placed IMMEDIATELY before
  the main verb; the tense lands on the Georgian verb itself
  (didn't answer → არ უპასუხა; doesn't smoke → არ ეწევის).
• won't → არ + FUTURE screeve (he won't come → არ მოვა).
• can't / cannot / can not → ვერ (subject-incapacity, KB default;
  ვერ movedi 'I could not come'); couldn't → ვერ + imperfect/aorist
  context. Never არ შემიძლია calque when ვეر suffices.
• didn't have to → არ მჭირდებოდა / არ უნდოდა context (AI refine).
• POSITION INVARIANT: English negation is pre-auxiliary, Georgian არ
  is PRE-VERBAL — in-place substitution preserves the slot. The
  residual main verb then stages to the correct screeve.
• Negative CONCORD: არასდროს / არავინ / არაფერი co-occur with არ on
  the verb (KA-45) — never strip the second არ.
MAPPING: don't/doesn't/didn't + V → არ + V · won't + V → არ + V-fut ·
can't/cannot + V → ვერ + V · couldn't + V → ვერ + V-past ·
isn't/aren't + Adj → არ არის + Adj (not არის-less calque)`;

// KA-109 v1.27.0 — Time deictics: zero-polysemy day-words → fixed Georgian
//                  forms (extends KA_TIME_EXPR which already pins the core
//                  trio yesterday/today/tomorrow).
const KA_TIME_DEICTIC = `
TIME DEICTICS — GEORGIAN HAS NO TENSE-COPYING: the deictic adverb ALONE
selects the screeve (გუშინ + aorist, ხვალ + future), and the day-word
itself is invariable — no case, no preposition (folkways.today Talking
Georgian phrasebook; dictionary.ge; ilanguages.org):
• CORE TRIO (KA_TIME_EXPR attested): yesterday → გუშინ · today → დღეს ·
  tomorrow → ხვალ (ხვალ მოვალ I will come tomorrow).
• THE TWO DAY-WORDS ENGLISH LACKS: day before yesterday →
  გუშინწინ (gushintsin, fused გუშინ+წინ 'before-yesterday');
  day after tomorrow → ზეგ (zeg) — folk/dictionary.ge day count.
  NEVER calque *ერთი დღით ადრე / *ორი დღის შემდეგ for these.
• FUSED ADVERBS: right now → ახლავე (ახლა + emphatic -ვე, v1.5.0
  focus attestation ახლავე წადი!) · tonight → ამაღამ (fused
  ამ+ა+ღამე 'at this night') · later → მოგვიანებით (folkways:
  მოგვიანებით გნახავ see you later) · soon → მალე (KA_TIME_EXPR).
• ORDERING CONSTRAINT: longest-first substitution — "right now" must
  consume BEFORE bare "now" (else ახლავე → ახლა -ვე splits), "the day
  before yesterday" BEFORE "day before yesterday", "day before
  yesterday" BEFORE bare "yesterday" (else გუშინწინ → გუშინ residue).
• SCREEVE RESIDUE: "yesterday I ..." → გუშინ + AORIST frame (4.51's
  historical-present guards stay active); "tomorrow I ..." → ხვალ +
  FUTURE frame (4.85's during-frames and 4.70's sequencers unaffected —
  they key on different English tokens: while/after/then/next day).
• NO PREPOSITION STRIPPING NEEDED: English "on Monday" → ორშაბათს
  (dative) already handled by 4.51-family; these deictics are bare.
MAPPING: yesterday→გუშინ · today→დღეს · tomorrow→ხვალ ·
the day before yesterday→გუშინწინ · day before yesterday→გუშინწინ ·
day after tomorrow→ზეგ · right now→ახლავე · tonight→ამაღამ ·
now→ახლა · later→მოგვიანებით (longest-first)`;

// KA-117 v1.35.0 — Calendar time: weekdays, months, seasons, determiner
//                   frames (this/next/last/every + period), years.
const KA_CALENDAR_TIME = `
KA-117 CALENDAR TIME — WEEKDAYS / MONTHS / SEASONS / DETERMINER FRAMES
(v1.35.0, kahibaro 10.4+5.5 + Frankfurt MFA consulate + EFC Georgia +
bab.la weekend entry + dictionary.ge every/yearly II + EUdict year by year +
ukurot.ucoz.net + languageknow.com + TraleBot issue 395 + Wiktionary
ორშაბათი etymology + de.wikipedia Wochentage + peacebridge.ge declension)

CORRECTION OF KA-109'S NOTE: its claim that English "on Monday" → ორშაბათს
was "already handled by 4.51-family" is WRONG — no weekday swap exists
anywhere in the fix chain (verified by grep sweep). Preposition+calendar
time is THIS block's job (autoFix 4.102, inserted BEFORE 4.70/4.99 so
"next week"→მომავალ კვირას and "this week"→ამ კვირას are consumed whole,
before next→შემდეგ and this→ეს could corrupt them).

WEEKDAYS (dative -ს after "on"; bare weekday never mapped — polysemy!):
• on Monday→ორშაბათს · on Tuesday→სამშაბათს · on Wednesday→ოთხშაბათს ·
  on Thursday→ხუთშაბათს · on Friday→პარასკევს · on Saturday→შაბათს ·
  on Sunday→კვირას. Every weekday also has a plural-habitual form for
  "on Mondays/ Tuesdays/..." (habitual plural): ორშაბათეობით სამშაბათეობით
  ოთხშაბათეობით ხუთშაბათეობით პარასკევეობით შაბათ-კვირაობით — the
  -ეობით adverbial marks recurrence without ყოველ (kahibaro 5.5).
• Etymology (mnemonic): ორშაბათი=ორი(two)+შაბათი(Sabbath — second day
  after the Sabbath), სამშაბათი=სამი(three), ოთხშაბათი=ოთხი(four),
  ხუთშაბათი=ხუთი(five); პარასკევი from Greek παρασκευή (preparation);
  შაბათი from Hebrew via Greek σάββατον; კვირა means BOTH Sunday and
  week — კვირადღე disambiguates Sunday.
• Attestation: მიღება ტარდება ყოველ ორშაბათს, სამშაბათს, ხუთშაბათს და
  პარასკევს (Frankfurt consulate) — ყოველ + weekday takes DATIVE, not -ში.

MONTHS (postposition -ში after "in"; doubling of final ს/რ before -ში;
bare month never mapped):
• in January→იანვარში · February→თებერვალში · March→მარტში ·
  April→აპრილში · May→მაისში · June→ივნისში · July→ივლისში ·
  August→აგვისტოში · September→სექტემბერში · October→ოქტომბერში ·
  November→ნოემბერში · December→დეკემბერში.
  DOUBLING NOTE: -ში doubles a stem-final s/r (მაის→მაისში,
  ივნის→ივნისში, ივლის→ივლისში, სექტემბერ→სექტემბერში, ოქტომბერ→
  ოქტომბერში, ნოემბერ→ნოემბერში, დეკემბერ→დეკემბერში) — the
  elsewhere-case forms keep the single consonant + -ს
  (მაისს, სექტემბერს).

SEASONS (case class varies! not a single postposition):
• in spring→გაზაფხულზე (-ზე class) · in summer→ზაფხულში (-ში class;
  ზაფხულზე also attested) · in autumn→შემოდგომაზე (-ზე class) ·
  in winter→ზამთარში (-ში class; ზამთარით instrumental also attested).

DETERMINER + PERIOD frames (whole-frame consumption — never map the bare
determiner or bare noun; SPLIT PARADIGM: month takes -ში, week/year
take dative -ს — both attested):
• this week→ამ კვირას · next week→მომავალ კვირას · last week→გასულ
  კვირას · this month→ამ თვეში · next month→მომავალ თვეს (თვეში
  variant attested) · last month→გასულ თვეში · this year→ამ წელს ·
  next year→მომავალ წელს · last year→გასულ წელს.
  Attestations: მომავალ თვეს / მომავალ წელს = "next month / next year"
  (languageknow.com); ყოველ წელს = yearly (dictionary.ge yearly II).

EVERY + PERIOD (habitual frames — ყოველ + OBLIQUE stem, NO -ი;
TraleBot issue 395: ყოველი + nominative as time adverbial is a
documented defect):
• every day→ყოველ დღე · every morning→ყოველ დილას · every
  evening→ყოველ საღამოს · every night→ყოველ ღამე · every week→ყოველ
  კვირას · every month→ყოველ თვეს · every year→ყოველ წელს.
  Attestations: ღვთისმსახურება ტარდება ყოველ კვირას 11:00 (EFC Georgia);
  კონკურსი ჩატარდება ყოველ თვეს და წლის ბოლოს (ukurot.ucoz.net);
  ყოველ წელს (dictionary.ge yearly II; EUdict year by year).
• CONTRAST — frequency intervals take -ში (NOT mapped by 4.102; the
  AI pass handles them): კვირაში ერთხელ (once a week), ყოველ სამ
  საათში [დღეში, კვირაში, თვეში] (every three hours/days/weeks/months;
  dictionary.ge), დღეგამოშვებით (every other day).

MISC FRAMES:
• in 1991 / in [19|20]xx→[year] წელს (e.g. 1991 წელს) — dative of წელი.
• from Monday to Friday→ორშაბათიდან პარასკევამდე (source elative -იდან,
  target limitative -მდე; BOTH postpositions appear on the SAME dative-
  shaped stem; weekdays keep their full -ი stem before both).
• at the weekend / on the weekend / at weekends→შაბათ-კვირას
  (bab.la: შაბათ-კვირას ოფისი დაკეტილია — "the office is closed at/on
  the weekend"); on Saturday evening→შაბათ საღამოს.
• Narrative pair (KA-71 already holds these): the next day→მეორე დღეს ·
  next morning→მეორე დილას — mapped here so they beat 4.70's next→შემდეგ.
• worked example: ყოველ წელს აგვისტოში ზღვაზე მივდივარ — three calendar
  frames in one sentence, zero prepositions.

NON-INTERFERENCE (4.102 runs at 4.69/4.70 boundary, BEFORE 4.85's
during-frames კვირის/თვის/წლის/ზაფხულის/ზამთრის დროს, BEFORE 4.92's
every day/morning, BEFORE 4.70 next→შემდეგ, BEFORE 4.99 this→ეს):
4.102 must NEVER fire on bare nouns — only inside preposition or
determiner frames. Bare weekdays/months/seasons/week/year stay
unmapped (polysemy: კვირა=week/Sunday, მაისი=May/rowan, ზამთარი=winter
but ზამთრის ამბები=genitive possessor, last=ბოლო/წინა non-temporal).
MAPPING: on Monday→ორშაბათს · ... · in January→იანვარში · ... ·
in spring→გაზაფხულზე · in summer→ზაფხულში · in autumn→შემოდგომაზე ·
in winter→ზამთარში · this/next/last week→ამ/მომავალ/გასულ კვირას ·
this/next/last month→ამ/მომავალ/გასულ თვეში · this/next/last year→
ამ/მომავალ/გასულ წელს · every week/month/year→ყოველ კვირას/თვეს/წელს ·
in [year]→[year] წელს · from Monday to Friday→ორშაბათიდან პარასკევამდე ·
at the weekend→შაბათ-კვირას (longest-first)`;

// KA-118 v1.36.0 — Narrative time deixis II: story openers, the ago-
//                  construction, daypart frames, all/every completion.
const KA_NARRATIVE_TIME = `
KA-118 NARRATIVE TIME DEIXIS II — STORY OPENERS / AGO / DAYPARTS /
ALL-FRAMES (v1.36.0; dictionary.ge since-entry "ten years ago → ათი
წლის წინ", "many years since → მრავალი წლის წინ", "long since →
დიდი ხნის წინ", "not long since → ცოტა ხნის წინ"; teachandlearnwith
georgia.wordpress.com Star Wars ka-subtitle "დიდი ხნის წინ, შორეულ
გალაქტიკაში…" = "A long time ago in a galaxy far, far away…";
date-fns ka locale "ნაკლები ხნის წინ" = "less than X ago"; ka.wiktionary
იყო და არა იყო რა lit. "there was and there was not"; folklore.usc.edu +
talkpal.ai fairy-tale notes; ka.wiktionary p.m.-entry ნაშუადღევს
"afternoon/p.m."; georgiantranslate.com "მთელი დღე = all day";
asik.su "იმ დღიდან მხოლოდ ჩემთვის ვამზადებდი" = "from that day on";
KB KA_COLLOCATIONS narrative-opener note; gapscan-v1360 six-domain
battery: openers/ago/dayparts/all-frames all Latin residue):

• AGO CONSTRUCTION — [quantity] + GENITIVE + წინ (postposition "before"):
  ათი წლის წინ ten years ago · სამი წლის წინ three years ago ·
  ერთი წლის წინ a year ago · ერთი თვის წინ a month ago (month is
  IRREGULAR genitive თვის, never *თვისის წინ) · ერთი კვირის წინ a week
  ago · ორი დღის წინ two days ago · ხუთი წუთის წინ five minutes ago.
  Discrete-genitive discipline (KA-2 numerals + KA-58 narrative past):
  სამი წლის წინ, never *სამი წლების წინ — quantity is singular while
  genitive marks the measure noun.
• WHOLE-PHRASE AGO IDIOMS (deterministic):
  a long time ago → დიდი ხნის წინ (lit. "long of time before";
    Star-Wars attested) · long ago → დიდი ხნის წინ ·
  a long while ago → დიდი ხნის წინ ·
  not long ago → არც ისე დიდი ხნის წინ ·
  a short time ago / a little while ago → ცოტა ხნის წინ ("little of
    time before"; dictionary.ge "not long since → ცოტა ხნის წინ") ·
  recently → ცოტა ხნის წინ in narrative past, ბოლო ხანში / ახლახანს
    elsewhere (KA_TIME_EXPR; contextual, AI decides) ·
  once upon a time → იყო და არა იყო რა (lit. "there was and there was
    not" — Georgian folklore opener; NEVER calque *ერთხელ ადრე) ·
  from that day on → იმ დღიდან (დღიდან = ablative-of-day; asik.su
    attested "იმ დღიდან მხოლოდ ჩემთვის ვამზადებდი") ·
  from that time on → იმ დროიდან · ever since → იმ დღიდან in
    day-frames else მას შემდეგ (KA_TEMPORAL_CLAUSES; AI decides).
• NARRATIVE ONE-DAY OPENERS — "one + daypart" = indefinite narrative
  deictic (EN "one day" ≈ "a certain day"), Georgian drops the article
  and keeps dative: ერთ დღეს one day · ერთ დილას one morning ·
  ერთ საღამოს one evening · ერთ ღამეს one night (KB KA_COLLOCATIONS
  ერთ დღეს / KA_DECISION_TABLE ერთ საღამოს attested openers).
  POLYSEMY GUARD: bare "one" NEVER maps — numeral ერთი, pronoun one,
  impersonal one (KA_IMPERSONAL) — only the "one + daypart" frame.
• DAYPART ADVERB FRAMES (KB KA_TIME_EXPR line "in the morning →
  დილას NOT *დილაში"):
  in the morning → დილას · in the evening → საღამოს ·
  in the afternoon → ნაშუადღევს (na-…-evs circumfix "after-midday";
    ka.wiktionary p.m. entry) · at noon → შუადღისას (-ისას compact;
    KA-71) · at night → ღამით (instrumental -ით; KB attested).
• ALL-COMPLETION FRAMES — მთელი + dative დროს postposition (whole + time
  during; georgiantranslate.com მთელი დღე):
  all day → მთელი დღე · all night → მთელი ღამე · all morning → მთელი
  დილა · all evening → მთელი საღამო · all week → მთელი კვირა ·
  all month → მთელი თვე · all year → მთელი წელი (nominative წელი;
    წელს is dative "in year", მთელი წელი = "the whole year" object/subject).
  POLYSEMY GUARD: bare "all" NEVER maps (all=ყველა/ყოველი quantifier,
  ყველაფერი everything) — only the "all + time-noun" frame.
• EVERY-COMPLETION (extends 4.92/4.102): every evening → ყოველ
  საღამოს · every night → ყოველ ღამე (KB-attested paradigm; 4.92
  covers only day/morning, 4.102 only week/month/year — evening/night
  fall between).
• FREQUENCY ADVERBIALS (KB KA_COLLOCATIONS კვირაში ერთხელ, -ში
  per-interval): once a day → დღეში ერთხელ · once a week → კვირაში
  ერთხელ · once a month → თვეში ერთხელ · once a year → წელიწადში
  ერთხელ (year is წელიწადში in per-interval, attested "ას წელიწადში
  ერთხელ" once in a blue moon) · twice a week → კვირაში ორჯერ ·
  three times a day → დღეში სამჯერ (-ჯერ multiplier + -ში interval).
• DAYPART × WEEKDAY COMBINATION (production case: "on Monday
  evening"): weekday-dative first, daypart dative second, NO linker —
  ორშაბათს საღამოს Monday evening (KB KA_CALENDAR_TIME: on Saturday
  evening→შაბათ საღამოს attested). 4.102's on+weekday runs FIRST,
  4.103 then completes the daypart tail.

NON-INTERFERENCE (4.103 runs at the 4.69/4.70 boundary right AFTER
4.102, BEFORE 4.70 next→შემდეგ / then→მერე, BEFORE 4.74 bare
"once"-conjunction territory, BEFORE 4.81 go→მიდის, BEFORE 4.92):
- 4.103 must NEVER fire on bare one/all/recently — only inside the
  listed frames (one=pronoun/numeral, all=ყველა, recently=AI-tense).
- "once" bare is POLYSEMOUS (conjunction "as soon as" = როგორც კი in
  4.74) — never mapped here; only "once upon a time" whole-phrase.
- 4.102's "from X to Y" consumes day-range first; 4.103's from-that-day
  frames are disjoint (that X, not weekday).
- 4.85's "at that time → იმ დროს" already handles time-not-day; 4.103
  only takes day/daypart nouns.
MAPPING: [N] years ago→[N] წლის წინ · [N] months ago→[N] თვის წინ ·
[N] weeks ago→[N] კვირის წინ · [N] days ago→[N] დღის წინ ·
a long time ago→დიდი ხნის წინ · not long ago→არც ისე დიდი ხნის წინ ·
a short time ago→ცოტა ხნის წინ · once upon a time→იყო და არა იყო რა ·
from that day on→იმ დღიდან · one day→ერთ დღეს · one morning→ერთ დილას ·
one evening→ერთ საღამოს · one night→ერთ ღამეს · in the morning→დილას ·
in the afternoon→ნაშუადღევს · in the evening→საღამოს · at noon→შუადღისას ·
at night→ღამით · all day→მთელი დღე · all night→მთელი ღამე ·
every evening→ყოველ საღამოს · every night→ყოველ ღამე ·
once a week→კვირაში ერთხელ · twice a week→კვირაში ორჯერ (longest-first)`;

// KA-119 v1.37.0 — Repetition & continuation adverbs: again / still / yet /
//                  already / anymore. Deterministic carriers ისევ-კვლავ-
//                  უკვე-ჯერ-აღარ with polysemy guards on still/yet.
const KA_REPETITION_ADV = `
KA-119 REPETITION & CONTINUATION ADVERBS — AGAIN / STILL / YET / ALREADY /
ANYMORE (v1.37.0; dictionary.ge again-entry "კვლავ, ისევ, ხელახლა;
ერთხელ კიდევ", "again and again კვლავ და კვლავ", "time and again
არაერთხელ", "over again კიდევ ერთხელ"; dictionary.ge yet-entry
"ჯერ, ჯერაც არ; ჯერჯერობით არ; ჯერ კიდევ არ" + "he hasn't come yet
ის ჯერ არ მოსულა"; ganmarteba.ge უკვე-entry "უკვე დაბრუნდა სახლში.
უკვე გავიგე. უკვე თავისით წერს."; en.wiktionary still-entry Georgian
cell "კვლავაც, ჯერაც, კიდევ, ჯერ კიდევ, ისევ, ჯერ ისევ";
lingualabs/ilovelanguages/learn101 "Not yet ჯერ არა", "No longer
უკვე აღარ"; translated-into.com anymore-entry აღარ; ka.wikipedia
აღარასოდეს თქვა არასოდეს (Never Say Never Again); talkpal.ai isev
+ kidev articles; KB KA_TIME_EXPR ჯერ note; gapscan-v1370 all five
adverbs pure Latin residue):

• AGAIN — ისევ (colloquial, primary narrative carrier) / კვლავ
  (literary; KA-108 style: literary narration → კვლავ not ისევ) /
  ხელახლა (redo, anew — only for "redo" sense, never plain again).
  Deterministic: again → ისევ. NOTE: the mechanical pass emits the
  lexical carrier; position before the verb (ისევ წვიმს "it is
  raining again") is the AI pass's word-order duty (KB KA_WORD_ORDER).
• AGAIN & AGAIN — ისევ და ისევ (colloquial) / კვლავ და კვლავ
  (literary; dictionary.ge "again and again კვლავ და კვლავ");
  over again / once again / one more time → კიდევ ერთხელ
  (dictionary.ge; languageknow attested); time and again / time after
  time → არაერთხელ (dictionary.ge "არაერთხელ, არაერთგზის").
  Bare "one more" NOT mapped here — polysemous (one more thing →
  კიდევ ერთი): the AI pass decides.
• STILL — carrier ჯერ კიდევ (continuation, attested; ჯერაც/ჯერ ისევ
  variants) · ისევ ისე (the same as ever — idiom, attested dictionary.ge
  family). POLYSEMY GUARD: still has NO mechanical rule — "still water"
  (adj მდგრადი/უძრავი), "still" (noun), "still taller" (degree —
  კიდევ უფრო, KA-80) are NOT the continuation adverb; the pure-adverb
  sense ("I am still here") is AI-decided with this carrier guidance.
• YET — POLYSEMY GUARD FIRST: bare yet NEVER maps — "yet" as
  conjunction ("yet he came" = however → მაგრამ/მაინც, KA-115) and
  "as yet" (ჯერ კიდევ, mapped whole-phrase far below) stay out.
  Deterministic negation frame only: not yet → ჯერ არ (dictionary.ge
  "ჯერ, ჯერაც არ"; lingualabs "Not yet ჯერ არა"; KB attested "ჯერ არ
  მოსულა") · hasn't come yet → ჯერ არ მოსულა pattern: [X] not ... yet
  → ჯერ არ ... (the ჯერ continuation marker + pre-verbal არ carried
  by the verb's negation). CONTRACTED frames (didn't/hasn't ... yet)
  are NOT mechanically consumed — the do-support reduction lives in
  4.93 at the function tail, AFTER 4.104, and bare yet is polysemous —
  so the leftover "yet" is QA-3.118-flagged and the AI pass renders
  ჯერ არ.
• ALREADY — უკვე (ganmarteba.ge "უკვე დაბრუნდა სახლში. უკვე გავიგე.
  უკვე თავისით წერს."; KA-107 უკვე+aorist note). Zero polysemy.
  Deterministic: already → უკვე (natural carrier order lands it
  pre-verbally — same word-order note as AGAIN).
• ANYMORE / NO LONGER — აღარ (translated-into.com; KB KA-84
  "not anymore / no longer → აღარ (+verb)") · no longer → აღარ ·
  უკვე აღარ variant attested (lingualabs "No longer უკვე აღარ") but
  აღარ alone suffices; "not ... anymore" is consumed at the ANYMORE
  arm (the spelled "not" itself is left for the AI pass to render —
  no generic not→არ swap exists; "she is not here anymore" → ის
  აღარ არის აქ).
• NEVER AGAIN — აღარასოდეს (ka.wikipedia Never-Say-Never-Again title
  attestation); stronger than არასოდეს, implies past occurrence.

NON-INTERFERENCE (4.104 runs BEFORE the 4.93 do-support negation pass at
the function tail — so a raw "not yet"/"not ... anymore" frame is
consumed here whole, before 4.93 could ever reduce the bare "not" (no
generic not→არ swap exists anyway — only auxiliaries don't/doesn't/
didn't/do not/does not/did not at 4.93). The disjoint "as yet"→ჯერ
კიდევ whole-phrase rule lives in the 4.60-family far below 4.104 —
ordering irrelevant because the patterns share no token ("not yet" ≠
"as yet"; "as yet" contains no again/already/anymore token)):
- bare yet/still NEVER mapped (conjunction/degree/adjective senses);
  only the frames above.
- "once again" is a whole-phrase (not the bare-once conjunction
  territory of 4.74) — safe to consume here.
- 4.74's bare once → როგორც კი is untouched by this rule family.
- ისევე როგორც (just as, KA-93) is a DIFFERENT word family
  (ისევე ≠ ისევ) — never touched here.
MAPPING: again→ისევ · again and again→ისევ და ისევ / კვლავ და კვლავ ·
once again→კიდევ ერთხელ · over again→კიდევ ერთხელ ·
one more time→კიდევ ერთხელ (bare "one more" NOT mapped — polysemous) ·
time and again→არაერთხელ · time after time→არაერთხელ ·
not yet→ჯერ არ · still→ჯერ კიდევ (AI-decided, continuation sense only) ·
already→უკვე · anymore→აღარ · no longer→აღარ · not ... anymore→აღარ ·
never again→აღარასოდეს (longest-first) · bare yet NEVER mechanically
mapped (conjunction vs negation-frame polysemy — AI pass decides) ·
contracted didn't/hasn't...yet frames reach the AI pass for ჯერ არ
rendering (do-support 4.93 runs after this block)`;

// KA-120 v1.38.0 — Reciprocals & otherness: each other / one another /
//                     other / another / else. Carrier ერთმანეთი with
//                     case-by-verb-government doctrine; სხვა family
//                     with possessive-sense სხვისი.
const KA_RECIPROCALS_OTHERNESS = `
KA-120 RECIPROCALS & OTHERNESS — EACH OTHER / ONE ANOTHER / OTHER /
ANOTHER / ELSE (v1.38.0; en.wiktionary ერთმანეთი-entry "each other",
pronunciation [e̞ɾtʰmäne̞tʰi], hyphenation ერ‧თმა‧ნე‧თი, Synonym
ერთიმეორე (ertimeore), attested "ძალიან უყვარდათ ერთმანეთი"; LOT
dissertation Amiridze 2006 §3.6 "The Georgian Reciprocals" + §5.5
"ertmanet- as a Subject Argument" — ertmanet- is THE reciprocal stem;
usage attestations: trend.ge "ისინი ერთმანეთისთვის იყვნენ შექმნილნი"
(made for each other), fortuna.ge "ერთმანეთის უძლურების ტვირთვა"
(GEN), rustavi2.ge "ვხედავთ ერთმანეთის" (GEN), TSU dissertation
"ერთმანეთს პირველად 1971 წელს შეხვდნენ" (DAT); dictionary.ge
touch-entry "to keep in touch ერთმანეთთან კავშირი" (COM);
en.wiktionary სხვა-entry "other", pronunciation [sχʷä], plural
სხვები, from Old Georgian სხუაჲ, Proto-Kartvelian *s₁xwa-, cognate
Mingrelian შხვა; en.wiktionary სხვისი-entry "other's / someone
else's", pronunciation [sχʷisi], Antonym ჩემი, adjectival declension
NOM/GEN/INS სხვისი · ERG სხვისმა · DAT/ADV სხვის, ref Čikobava
Explanatory Dictionary; dictionary.ge someone-entry "it must have
been someone else ალბათ ვინმე სხვა იყო"; dictionary.ge another
II-entry "1) სხვა; კიდევ ერთი" + "take this cup away and bring me
another ეს ფინჯანი წაიღეთ და სხვა მომიტანეთ"; en.wiktionary
სხვა მხრივ-entry "otherwise, in other respects"; Swadesh list #21
other=სხვა; ganmarteba.ge სხვისი; gapscan-v1380 each other / one
another / other / another / else pure Latin residue in all 35 suites):

• EACH OTHER / ONE ANOTHER — ერთმანეთი (reciprocal pronoun, stem
  ertmanet-, synonym ერთიმეორე). CASE IS VERB-GOVERNED, NOT FREE:
  NOM ერთმანეთი (ძალიან უყვარდათ ერთმანეთი) · DAT ერთმანეთს
  (ერთმანეთს შეხვდნენ "met each other" — შეხვდნენ takes dative) ·
  GEN ერთმანეთის is possessive/relative (ერთმანეთის სიყვარული
  "love of each other") · COM ერთმანეთთან (კავშირი ერთმანეთთან
  "contact with each other") · postposition frames ერთმანეთისთვის
  (for each other), ერთმანეთზე (on each other), ერთმანეთში (in
  each other). MECHANICAL POLICY: the deterministic pass renders
  ONLY the base form ერთმანეთი; every other case is the AI pass's
  verb-government decision (KB KA_CASE_SYSTEM). QA 3.119 flags any
  leftover bare "each other / one another" for that decision.
• OTHER / OTHERS — სხვა (plural სხვები; "the others" → სხვები /
  დანარჩენები). Polysemous across adjective ("other people" →
  სხვა ადამიანები), pronoun ("some ... others" → ზოგი ... სხვები),
  and determiner uses — the mechanical pass consumes ONLY the
  pinned frames below; any other "other" is QA-flagged.
• ANOTHER — TWO SENSES (dictionary.ge another II "1) სხვა;
  კიდევ ერთი"): (i) DIFFERENT-ONE → სხვა ("bring me another [cup]
  → სხვა მომიტანეთ"); (ii) ONE-MORE → კიდევ ერთი ("another day"
  in the additional sense → კიდევ ერთი დღე) — same polysemy family
  as KA-119's bare "one more" guard; the mechanical pass consumes
  ONLY "one another" (reciprocal) and pinned frames; bare "another"
  is QA-flagged, AI decides სხვა vs კიდევ ერთი.
• SOMEONE ELSE / ANYBODY ELSE — ვინმე სხვა (dictionary.ge
  someone-entry "it must have been someone else ალბათ ვინმე სხვა
  იყო"); NOTHING ELSE → სხვა არაფერი (negative frame, consistent
  with KB KA_NEGATION); ANYTHING ELSE → სხვა რამე (question frame);
  WHAT ELSE / WHO ELSE → ვინ/რა სხვა frames (AI renders; flagged).
  SOMEONE ELSE'S → სხვისი (adjectival possessive pronoun, dedicated
  lexeme — NOT *სხვის ერთი; declension სხვისი/სხვისმა/სხვის,
  Čikobava).
• ELSE (bare, after wh-words) — who else / what else / where else /
  when else → the wh-word stays, სხვა added: AI-decided placement
  (ვინ სხვა, რა სხვა, სად კიდევ); bare "else" NEVER maps alone —
  postmodifier polysemy ("or else" → თორემ/ან სხვაგვარად, covered
  by the otherwise-family 4.61) — QA flags leftovers.

NON-INTERFERENCE (4.105 sits between 4.104's repetition block and
4.102's calendar block; shared-token audit against the whole
fix-stream):
- "each other/one another" share NO tokens with any earlier rule —
  "other" appears only inside "another" (4.105 consumes one another
  FIRST — longest-first within the block).
- "someone else" is consumed whole; "somebody else / anyone else /
  anybody else" normalize to the same frame before any bare-token
  pass could split them.
- "nothing else" runs BEFORE 4.93's negation-family tail could
  reorder negatives (4.105 is far above the tail).
- "each" alone NEVER maps (each=თითოეული quantifier, KB wordbank);
  "other" alone NEVER maps (adjective/pronoun polysemy); bare
  "another" NEVER maps (two senses — AI decides).
- ერთიმეორე is the synonym carrier — accepted by QA as silencing.
MAPPING: each other / one another → ერთმანეთი (base NOM; case by
verb government — AI decides outside safe frames) · the others →
სხვები · other → სხვა (frame-guarded) · another → სხვა
(different-one) / კიდევ ერთი (one-more) — AI decides bare ·
someone/somebody/anyone/anybody else → ვინმე სხვა ·
nothing else → სხვა არაფერი · anything else → სხვა რამე ·
someone else's → სხვისი · bare else NEVER mechanically mapped
(AI pass decides; or-else belongs to the otherwise family)`;

// KA-121 v1.39.0 — Indefinite pronoun series: -thing / -body / -where
//                     (+ any-series interrogative guard, negative series,
//                     none-of partitives). Carriers: რაღაც / ვინმე /
//                     სადმე / ყველაფერი / ყველა / ყველგან / არაფერი /
//                     არავინ / არსად.
const KA_INDEFINITE_PRONOUNS = `
KA-121 INDEFINITE PRONOUN SERIES — SOMETHING/SOMEBODY/SOMEWHERE/
EVERYTHING/EVERYBODY/EVERYWHERE + ANY-SERIES (GUARDED) + NEGATIVES +
NONE-OF PARTITIVES (v1.39.0; en.wiktionary ვინმე-entry "someone",
pronunciation [vinme̞], hyphenation ვინ‧მე, etymology vin "who" +
-me suffix; en.wiktionary არავინ-entry "nobody, no one",
pronunciation [äɾävin], etymology არა- "un-" + vin; en.wiktionary
რაღაც-entry "something", pronunciation [ɾäʁät͡sʰ], hyphenation
რა‧ღაც, attested usage "რაღაც მოხდა" = something happened,
Coordinate term ვიღაც, Related რამე; en.wiktionary ვიღაც-entry
"someone", pronunciation [viʁät͡sʰ], plural ვიღაცები, attested
"ოპაა ვიღაცამ გააკუა" (ERG ვიღაცამ!); en.wiktionary სადმე-entry
"somewhere", pronunciation [sädme̞], Alternative syncopated forms
სამ / სამე, See-also არსად / ვერსად, ref Čikobava Explanatory
Dictionary; en.wiktionary არაფერი-entry "nothing", pronunciation
[äɾäpʰe̞ɾi], Antonym ყველაფერი, Coordinate ვერაფერი, FULL
DECLENSION with syncope in obliques: NOM არაფერი · ERG არაფერმა ·
DAT არაფერს(ა) · GEN არაფრის(ა) (syncopated!) · INS არაფრით(ა) ·
ADV არაფრად(ა) · VOC არაფერო; postpositions არაფერზე/არაფერთან/
არაფერში · არაფრისთვის/არაფრისგან · არაფრიდან; dictionary.ge
everybody-entry "1) ყოველი, თითოეული (ადამიანი); ყველა; not
everybody..."; dictionary.ge everything-entry "ყველაფერი; he
thinks he knows everything ჰგონია..."; dictionary.ge everyplace/
everywhere "ყველგან; I looked everyplace ყველგან ვნახე";
dictionary.ge anybody-entry "(კითხვით და პირობით წინადადებებში)
ვინმე; is there anybody here? აქ არის ვინმე?" — THE DICTIONARY
ITSELF attests the interrogative/conditional guard for the
any-series; dictionary.ge none¹-entry "1) არავინ, არც ერთი
(ორზე მეტი რაოდენობიდან); none of them is/are known to us არც
ერთ მათგანს არ ვიცნობთ (DAT + არ!); none of the applicants was
German განმცხადებელთაგან არავინ იყო გერმანელი (-თაგან + არავინ);
none of them can help me ვერც ერთი მათგანი ვერ დამეხმარება
(-გან + ვერც); I saw none of the people I wanted ვერავინ ვნახე,
ვისი ნახვაც მინდოდა; 2) არაფერი, არც ერთი; I want none of these
things ამ ნივთებიდან არც ერთი არ მჭირდება (-დან partitive);
none other than სწორედ (ties to KA_CLEFT_EMPHASIS)"; en.wiktionary
everything → ყველაფერი; ganmarteba.ge ყველაფერი synonyms ყოველივე /
სუყველაფერი; dlab.ug.edu.ge synonym set ყველა, რაც არის /
ყოველივე; gapscan-v1390 -thing/-body/-where families pure Latin
residue in all suites — არავინ/არაფერი/არსად carriers documented
since KA_NEGATION but never emitted mechanically):
• CARRIER TRIADS (Georgian builds the series morphologically):
  - რა- question stem: რაღაც something (specific-unknown) ·
    რამე anything/any-old-thing · არაფერი nothing · ყველაფერი
    everything
  - ვინ- who stem: ვინმე someone (non-specific) · ვიღაც someone
    (specific-unknown, pl. ვიღაცები) · არავინ nobody · ყველა
    everybody
  - სად- where stem: სადმე somewhere · არსად nowhere · ყველგან
    everywhere
  The -მე suffix marks the non-specific indefinite (ვინმე, სადმე);
  -ღაც marks the SPECIFIC-unknown (ვიღაც "a certain someone");
  -ც on რაღაც. AI pass may prefer ვიღაც when context implies a
  definite-but-unnamed person; mechanical pass stays neutral with
  ვინმე (dictionary.ge someone → ვინმე default).
• NEGATIVE CONCORD (KB KA_NEGATION, QA 3.76): არავინ/არაფერი/
  არსად REQUIRE არ (or ვერ-) before the verb: არავინ არ მოვიდა
  nobody came (attested substandard without არ). The mechanical
  pass emits the carrier; ა-placement stays with the AI pass
  EXCEPT the deterministic none-of frames below.
• ANY-SERIES GUARD (dictionary.ge anybody: "კითხვით და პირობით
  წინადადებებში ვინმე"): anything/anybody/anyone/anywhere map to
  რამე/ვინმე/სადმე ONLY in questions and conditionals
  (is there anybody here? → აქ არის ვინმე?). In affirmative
  free-choice statements ("anyone can do it") the carrier is
  ნებისმიერი/ნებისმიერი რამ — NEVER mechanically mapped, AI
  decides. Mechanical guard: question mark in the segment, or
  do/does/did/can/could/will/would/should + bare-anywhere at
  clause start (interrogative inversion), or if/unless/when(ever)
  conditional frames.
• PARTITIVE none-of FRAMES (dictionary.ge none¹, all attested):
  none of them/us/you + VERB → არც ერთ მათგანს/ჩვენგანს/
  თქვენგანს ... არ (DAT partitive, verb-ა concord — attested
  "არც ერთ მათგანს არ ვიცნობთ"); none of + PLURAL NOUN →
  -თაგან/-დან/-გან + არავინ (attested "განმცხადებელთაგან არავინ
  იყო გერმანელი"). Bare none (ellipsis) → არც ერთი — AI decides.
  none other than → სწორედ (cleft family).
• SYNCOPE WARNING: არაფერი's obliques syncopate the ე
  (GEN არაფრის, INS არაფრით, ADV არაფრად) — the mechanical pass
  emits only base NOM არაფერი; AI pass must syncopate in oblique
  positions. ვიღაც has ERG ვიღაცამ (epenthetic ა).
• NON-INTERFERENCE:
- 4.105 (KA-120) owns the else-family: someone else / nothing
  else / anything else are consumed BEFORE 4.106's bare rules
  (4.106 sits after 4.105). სხვ stem silences QA 3.119 first.
- anything else → სხვა რამე (4.105) must win over bare
  anything → რამე — longest-first ordering handles it.
- someone's possessive → ვინმეს (DAT-genitive function, wordbank
  ვინმეს გასაკვირი attested); nobody's → არავის.
- everything is fine / nothing happened stay mechanical-neutral
  beyond carrier emission; predicate არის/მოხდა rendering is the
  verb family's territory.
MAPPING: something → რაღაც · somebody/someone → ვინმე ·
somewhere → სადმე · everything → ყველაფერი ·
everybody/everyone → ყველა · everywhere → ყველგან ·
nothing → არაფერი · nobody/no one → არავინ · nowhere → არსად ·
anything/anybody/anyone/anywhere → რამე/ვინმე/სადმე ONLY in
questions/conditionals (free-choice → AI) · none of them/us/you →
არც ერთ მათგანს/ჩვენგანს/თქვენგანს (+verb-ა by AI) ·
someone's → ვინმეს · nobody's → არავის · bare none → არც ერთი
(AI) · ვიღაც specific-unknown — AI decides`;

// KA-122 v1.40.0 — Quantifiers: much/many/few/little/plenty/several/
//                  most/whole/half/both (amount carriers, singular
//                  agreement, polysemy guards)
const KA_QUANTIFIERS = `KA-122 QUANTIFIERS — MUCH/MANY/FEW/LITTLE/PLENTY/
SEVERAL/MOST/WHOLE/HALF/BOTH (v1.40.0)
Attested (Wiktionary, 11 entries): ბევრი [bɛvɾi] much/many/a lot —
ERG ბევრმა, DAT/ADV ბევრ, comp უფრო ბევრი, ant ცოტა, Old-Georgian
numeral "ten thousand"; მრავალი [mɾäväli] many (countable) —
ERG მრავალმა, derived სიმრავლე quantity, see ზღვა/მირიადი;
რამდენიმე [ɾämde̞nimɛ] several/a few — რამდენი+-მე, ERG
რამდენიმემ, DAT რამდენიმეს~რამდენსამე, GEN syncopates რამდენიმის;
ცოტა [tsʼo̞tʰä] few/little — Proto-Georgian-Zan *c₁oṭa-, ERG
ცოტამ, comp ნაკლები, derived ცოტ-ცოტა (little by little);
მთელი [mtʰe̞li] whole/all — Old-Georgian მრთელი, Proto-GZ
*m-rt-el-, ERG მთელმა, DAT/ADV მთელ, derived მთელი რიგი (a whole
row), მთელი რიცხვი (whole number), related მთლიანი (intact);
ნახევარი [näχe̞väɾi] half — uncomparable, noun "half past" (ორის
ნახევარი), colloq. spouse; OBLIQUES SYNCOPATE: GEN ნახევრის, INS
ნახევრით, ADV ნახევრად, pl ნახევრები; ორივე [o̞ɾive̞] both —
ორი+-ვე collective-two, determiner, ორივე მხარეს on both sides;
უმეტესი [ume̞tʼe̞si] most (of) — მეტი+უ- -ეს-i circumfix,
superlative adjective, ERG SYNCOPATES უმეტესმა (ე dropped), DAT
უმეტეს, derived უმეტესობა, see-also ბევრი; უმეტესობა
[ume̞tʼe̞so̞bä] majority — უმეტესი+-ობა, GEN syncopates
უმეტესობის(ა), INS უმეტესობით(ა), pl უმეტესობები; უამრავი
[uämɾävi] plenty of/numerous — ERG უამრავმა, DAT/ADV უამრავ,
comp უფრო უამრავი.

• AMOUNT CARRIERS: much (uncountable) → ბევრი · many (countable)
  → ბევრი (everyday) / მრავალი (formal/literary) · plenty of /
  a lot of → ბევრი · უამრავი = emphatic "loads of" · several /
  a few → რამდენიმე · few (negative, "hardly any") → ცოტა ·
  little (amount) → ცოტა · few vs a few mirrors ცოტა vs
  რამდენიმე (negative vs positive slant — "few people came ცოტა
  ადამიანი მოვიდა" vs "a few people came რამდენიმე ადამიანი
  მოვიდა").
• WHOLE/HALF/BOTH: the whole day → მთელი დღე · whole → მთელი,
  related მთლიანი (intact) · half → ნახევარი: half an hour →
  ნახევარი საათი, half past two → ორის ნახევარი ("two's half",
  genitive!), two and a half → ორნახევარი · both → ორივე: both
  hands → ორივე ხელი, on both sides → ორივე მხარეს · "both A
  and B" → როგორც A, ისე B (see KA-79 correlative).
• MOST: most (of the) people → უმეტესი ადამიანი · the majority →
  უმეტესობა · the most [adj] → ყველაზე [adj] (KA_COMPARISON —
  DIFFERENT WORD: უმეტესი is a quantifier, ყველაზე is the
  superlative degree marker; never conflate).
• SINGULAR AGREEMENT (dictionary.ge norm): ბევრი, ცოტა,
  რამდენიმე, ორივე take a SINGULAR noun: რამდენიმე წიგნი,
  ორივე მხარეს, ცოტა ხანი — NOT *რამდენიმე წიგნები, NOT
  *ორივე მხარეები. English plurals after these carriers are
  de-pluralized (წიგნები → წიგნი; mirrors numerals, KA-NUMERALS).
• POLYSEMY — AI decides, never bare-map: little = ცოტა (amount:
  little money) vs პატარა (size: little girl) · most = უმეტესი
  (quantifier) vs ყველაზე (superlative: the most beautiful →
  ყველაზე ლამაზი) · a lot (adverbial: I like it a lot) — no
  safe carrier, paraphrase ძალიან/ბევრად — AI · much (bare,
  verb-position: I don't much care) — KB-only · ზღვა "sea" is
  ATTESTED as a determiner "many" (syn ბევრი, ant ცოტა) but the
  noun "sea" dominates — KB-KNOWLEDGE ONLY, never mechanically
  mapped.
• NON-INTERFERENCE (fix 4.107 sits at the very tail, AFTER these
  frame rules): how much / how many → რამდენი (4.97) · many
  years ago → მრავალი წლის წინ, several days ago → რამდენიმე
  დღის წინ (4.103 ago-construction) · all day long → მთელი დღე,
  all week → მთელი კვირა (4.103 all-frames) · a little while
  ago / a short time ago → ცოტა ხნის წინ (4.103) · very much →
  ძალიან (4.69) · thank you very much/a lot/so much → დიდი
  მადლობა (4.94).
• IDIOMS: by halves → ნახევრად · halfhearted → ნახევარგულიანი
  (AI) · ცოტ-ცოტა = little by little · მთელი რიგი = a whole
  row/whole series of · მთელი რიცხვი = whole number.
MAPPING: much/many→ბევრი · many(formal)→მრავალი ·
plenty of/a lot of→ბევრი · several/a few→რამდენიმე ·
few/little(amount)→ცოტა · most of→უმეტესი · majority→
უმეტესობა · whole→მთელი · half→ნახევარი · both→ორივე ·
the most [adj]→ყველაზე [adj] · bare much/little/a lot/ზღვა
→ AI decides`;

// KA-110 v1.28.0 — Possessive determiners: unambiguous EN possessives →
//                  Georgian carriers (extends KA_POSSESSION's declension
//                  table with the deterministic EN-side mapping).
const KA_POSSESSIVE_DET = `
POSSESSIVE DETERMINERS — EN DETERMINER → KA CARRIER (fr.wikipedia
"Déclinaisons géorgiennes" Adjectifs possessifs: full paradigm ჩემი/
შენი/მისი/ჩვენი/თქვენი/მათი — they decline like consonant-stem
adjectives; 1st/2nd person take -ს in dative+adverbial (ჩემს, შენს,
ჩვენს, თქვენს) while 3rd person takes ZERO (მის, მათ); app2brain:
His, Hers, Its → მისი — ONE form, Georgian has no 3rd-person gender;
en.wiktionary მე-entry: genitive ჩემ/შენ/მის/მათ stems):
• DETERMINISTIC (unambiguous, auto-fixable): my → ჩემი · our → ჩვენი ·
  their → მათი · his → მისი · its → მისი (NOT a calque per person:
  its and his COLLAPSE into მისი — never *მისი vs *მის by gender).
• CONTEXT-GATED (QA-only, AI-pass decides): your → შენი (informal)
  vs თქვენი (formal/plural) — register choice per KA-52 T–V rules,
  never flattened deterministically; her → მისი (possessive "her
  book") vs მას (object "saw her") — polysemous, needs syntax.
• REFLEXIVE OVERWRITE: when the possessor is the clause subject,
  his/her must become თავისი (KA_POSSESSION/KA_SELF_REFERENCE;
  მან ... მისი → მან ... თავისი repair lives in fix 4.54).
• ECONOMY INTERACTION: after mapping, fixes 4.33 / QA 3.40 drop the
  carrier before body parts & kin (თავი მტკივა, NOT *ჩემი თავი).
• NEVER map: mine/theirs/ours/hers standalone pronouns (coal-mine
  polysemy; contrastive contexts need AI), myself-series (-self →
  თავი + case, context-dependent case ending).
MAPPING: my→ჩემი · our→ჩვენი · their→მათი · his→მისი · its→მისი ·
your→შენი|თქვენი (QA-gated) · her→მისი|მას (QA-gated) ·
1st/2nd-dat → ჩემს/შენს/ჩვენს/თქვენს · 3rd-dat → მის/მათ (zero -ს)`;

// KA-123 v1.41.0 — Personal pronouns: bare EN subject/object pronouns →
//                  Georgian case-marked carriers. Complements KA-110
//                  (possessive determiners) and KA-121 (indefinites).
//                  Attested: en.wiktionary მე entry (full declension +
//                  Template:ka-personal_and_demonstrative_pronouns),
//                  latinum.substack.com Lessons 9/13, jazykirossii.ru,
//                  zh.wikipedia 格鲁吉亚语语法.
const KA_PERSONAL_PRONOUNS = `
KA-123 PERSONAL PRONOUNS — EN PRONOUN → KA CASED CARRIER (en.wiktionary მე:
1st/2nd person are CASE-INVARIANT for the four "core" cases — მე, შენ,
ჩვენ, თქვენ serve NOM/ERG/DAT/GEN alike; only the instrumental and
adverbial inflect: ჩემით/ჩემად, შენით/შენად, ჩვენით/ჩვენად,
თქვენით/თქვენად. The 3rd person is SUPPLETIVE by case: NOM ის/იგი →
ERG მან/იმან → DAT მას/იმას → GEN მის/იმის → INS მით/იმით →
ADV იმად; plural NOM ისინი/იგინი → ERG/DAT/GEN მათ/იმათ. Georgian has
NO gender: he, she and it COLLAPSE into ის — never "gendered" forms.
Old-Georgian literary variants (იგი, იგინი, ჰქონდა-series agreement)
belong to formal prose, not to everyday narration):
• DETERMINISTIC (unambiguous, auto-fixable): I→მე · me→მე ·
  we→ჩვენ · us→ჩვენ · he→ის · she→ის · him→მას · them→მათ.
  Object-only forms take the dative: me→მე (1st/2nd are
  case-invariant, so the dative equals the nominative), him→მას,
  us→ჩვენ, them→მათ. 3rd-person plural is ANIMATE-default ისინი
  for the subject form; inanimate subjects are the AI pass's call.
• CONTEXT-GATED (QA-only, AI-pass decides): you → შენ (informal
  singular) vs თქვენ (formal/polite or plural) — the T–V register
  choice per KA-52; it → ის ONLY as an anaphoric reference to a
  known entity, NEVER as a dummy/weather subject (KB 4.24: წვიმს,
  ცივა, no dummy pronoun) and NEVER when "it is" opens a cleft
  (3.94: სწორედ X + rest). Bare "it" that survives into the final
  draft stays for the AI pass to resolve or drop.
• PRO-DROP (KA_PRONOUN_ECONOMY): Georgian verb agreement already
  encodes the subject (v-, g-, h-/m- prefixes, -თ plural), so the
  mapped pronoun is often DELETED in fluent prose: "I saw him" →
  დავინახე, not მე დავინახა მას. The bare mapping below is a
  FALLBACK for residue — the AI pass and 4.33/3.19 still prefer
  dropping the pronoun when the verb form makes it redundant.
• NEVER map: myself/yourself/himself/herself/itself/ourselves/
  themselves (reflexives → თავი + postposition/case, context-
  dependent, KA_SELF_REFERENCE), mine/yours/his/hers/ours/theirs
  standalone possessive pronouns (coal-mine polysemy, contrastive
  reading), whom/whose (relative pronouns, KA-112 territory).
• ORDER: these swaps run at the FUNCTION TAIL, after 4.97's
  what/who/where family, 4.98's said/told/gave frames, 4.99's
  this/these/those, 4.100's and/but/or, 4.101's politeness
  formulas, 4.102-4.103's time frames, 4.107's quantifier series
  and 4.95's possessive determiners — so only genuinely bare
  pronoun tokens reach the swaps below.
MAPPING: I→მე · me→მე · we→ჩვენ · us→ჩვენ · he→ის · she→ის ·
it→ის (anaphoric only, AI-gated) · him→მას · them→მათ ·
they→ისინი (animate; generic-they → ის per KA_PRONOUN_ECONOMY) ·
you→შენ|თქვენ (QA-gated, T–V register) · 1st/2nd-INS → ჩემით/
შენით/ჩვენით/თქვენით · 3rd-case → ის/მან/მას/მის/მით (suppletive)`;

// KA-125 v1.43.0 — Future screeve dictionary: person-marked will+VERB
//                  frames for the closed set of high-frequency verbs whose
//                  future paradigms are fully attested. Attested:
//                  lingua.ge conjugator (წერა → დავწერ/დაწერ/დაწერს/
//                  დავწერთ/დაწერენ; დარეკვა → დავრეკავ/დარეკავს/
//                  დავრეკავთ/დარეკავენ; დახმარება → დავეხმარები/
//                  დაეხმარება/დავეხმარებით/დაეხმარებიან; მოსვლა →
//                  მოვალ/მოხვალ/მოვა/მოვალთ/მოხვალთ/მოვლენ),
//                  cram.com (ნახვა → ვნახავ/ნახავ/ნახავს; წასვლა →
//                  წავალ/წახვალ/წავა/წავალთ/წახვალთ/წავლენ),
//                  lingualabs.com ("I will write" → მე დავწერ;
//                  "I will see you" → გნახავ), kartuliena.eu
//                  (მე დავწერ წიგნში), Springer screeve numbering
//                  (future = preverb + present stem: da-c'er-s),
//                  KB-attested ვნახავ/ვნახავთ (KA-104, Latinum L50).
const KA_FUTURE_DICT = `
KA-125 FUTURE SCREEVE DICTIONARY — the future indicative (მყოფადი,
screeve 4) is PREVERB + PRESENT STEM (Springer: da-c'er-s = დაწერს
"he will write"); the stem vowel -ებ/-ავ- is verb-class specific, so
the future is a DICTIONARY form, not a productive English-side rule.
Person-marked will+VERB frames map deterministically for the closed
attested set (fix 4.110):
• SEE (ნახვა): I→ვნახავ · we→ვნახავთ · he/she→ნახავს · they→ნახავენ
  (KB-attested ვნახავ "I'll see" KA-104; cram.com paradigm).
• WRITE (წერა): I→დავწერ · we→დავწერთ · he/she→დაწერს ·
  they→დაწერენ (lingua.ge; kartuliena "მე დავწერ წიგნში").
• CALL (დარეკვა): I→დავრეკავ · we→დავრეკავთ · he/she→დარეკავს ·
  they→დარეკავენ (lingua.ge).
• HELP (დახმარება): I→დავეხმარები · we→დავეხმარებით ·
  he/she→დაეხმარება · they→დაეხმარებიან (lingua.ge; the -ებ-
  medial paradigm like გრძნობ → იგრძნობ).
• GO (წასვლა, suppletive წა-): I→წავალ · we→წავალთ · he/she→წავა ·
  they→წავლენ (cram.com; KA-95 motion doctrine). Supersedes 4.81's
  bare will go → წავალ (1sg) which mis-agreed non-1sg subjects.
• COME (მოსვლა, suppletive მო-): I→მოვალ · we→მოვალთ · he/she→მოვა ·
  they→მოვლენ (lingua.ge მოსვლა future group).
GUARDS: 2nd person NEVER maps (T–V: წახვალ vs წახვალთ — same as
bare will be); "it" subjects AI-gated (4.108); subjectless "will V"
left (no person → no safe form); negated futures stay with 4.93's
არ family + AI rebuild; I'll-contractions stay AI-pass (4.108
placeholder protection; QA 3.124 flags).
MAPPING: will see→ვნახავ paradigm · will write→დავწერ paradigm ·
will call→დავრეკავ paradigm · will help→დავეხმარები paradigm ·
will go→წავალ paradigm · will come→მოვალ paradigm ·
TACTIC: consume SUBJECT+WILL+VERB atomically while the subject is
still visible (before 4.109/4.108 pronoun swaps); the future form
ALREADY encodes the person — pro-drop may trim the pronoun (3.19).
Everything else (2nd person, it, subjectless, negated, contracted)
stays QA-gated for the AI pass.`;

// KA-126 v1.44.0 — Present screeve dictionary: person-marked SUBJECT+VERB
//                  frames for the closed set of high-frequency verbs whose
//                  PRESENT (აწმყო, screeve 1) paradigms are fully attested.
//                  Same playbook as KA-125 (future). Attested: kahibaro.com
//                  9.5 Common Irregular Verbs (ცოდნა → ვიცი/იცი/იცის/
//                  ვიცით/იცით/იციან "ისინი არ იციან ინგლისური"; ცნობნა →
//                  ვიცნობ/იცნობ/იცნობს/ვიცნობთ/იცნობთ/იცნობენ "მე ვიცნობ
//                  ნინოს"; გაკეთება → ვაკეთებ/აკეთებ/აკეთებს/ვაკეთებთ/
//                  აკეთებთ/აკეთებენ "მე ვაკეთებ დავალებას"; თქმა →
//                  ვამბობ/ამბობ/ამბობს...; ხედვა → ვხედავ/ხედავ/ხედავს/
//                  ვხედავთ), apprenti-polyglotte.net (აკეთებ full table,
//                  matches kahibaro), latinum.substack L76 (ფიქრობს →
//                  ვფიქრობ/ფიქრობ/ფიქრობს/ვფიქრობთ/ფიქრობთ/ფიქრობენ),
//                  L80 (ვამბობ table), en.wiktionary ჭამს (ვჭამ/ჭამ/
//                  ჭამს/ვჭამთ/ჭამთ/ჭამენ) + სვამ (ვსვამ/სვამ/სვამს/
//                  ვსვამთ/სვამთ/სვამენ) + კითხულობს (ვკითხულობ/
//                  კითხულობ/კითხულობს/ვკითხულობთ/კითხულობთ/კითხულობენ),
//                  talkpal.ai (წერა present ვწერ/წერ/წერს/ვწერთ/წერთ/
//                  წერენ), sublearn.com (v- + root agreement), cram.com
//                  (ვამბობ…ამბობენ), polytranslator corpus ("ჩვენ ერთად
//                  ვჭამთ პურს", "მე ცხელ ჩაის ვსვამ").
const KA_PRESENT_DICT = `
KA-126 PRESENT SCREEVE DICTIONARY — the present indicative (აწმყო,
screeve 1) marks person/number with the v-class series: v- 1sg (ვწერ),
zero 2sg (წერ), -ს 3sg (წერს), -თ 1pl/2pl (ვწერთ/წერთ), -ენ 3pl
(წერენ). The STEM is verb-specific (often suppletive: ცოდნა → იც-),
so the present is a DICTIONARY form, not a productive English-side
rule (sublearn: "v- + root" is the regular frame; stems vary).
Person-marked SUBJECT+VERB frames map deterministically (fix 4.111):
• KNOW a fact (ცოდნა, stem იც-): I→ვიცი · we→ვიცით · he/she→იცის ·
  they→იციან (kahibaro "ისინი არ იციან ინგლისური").
• KNOW a person (ცნობნა, stem იცნობ-): I→ვიცნობ · we→ვიცნობთ ·
  he/she→იცნობს · they→იცნობენ — chosen when the OBJECT is a person
  pronoun (know him/her/them; kahibaro "მე ვიცნობ ნინოს"). These
  frames run BEFORE the bare fact frames. Proper-name objects
  ("I know Nino") are NOT auto-detected — they take the fact form
  (AI refines).
• SEE (ხედვა): I→ვხედავ · we→ვხედავთ · he/she→ხედავს · they→ხედავენ
  (kahibaro 9.5; lingoseven full table).
• EAT (ჭამა): I→ვჭამ · we→ვჭამთ · he/she→ჭამს · they→ჭამენ
  (wiktionary ჭამს; polytranslator "ვჭამთ პურს").
• DRINK (სმა): I→ვსვამ · we→ვსვამთ · he/she→სვამს · they→სვამენ
  (wiktionary სვამ; polytranslator "მე ცხელ ჩაის ვსვამ").
• READ (კითხვა): I→ვკითხულობ · we→ვკითხულობთ · he/she→კითხულობს ·
  they→კითხულობენ (wiktionary კითხულობს full table).
• WRITE (წერა): I→ვწერ · we→ვწერთ · he/she→წერს · they→წერენ
  (talkpal.ai; sublearn).
• SAY (თქმა): I→ვამბობ · we→ვამბობთ · he/she→ამბობს · they→ამბობენ
  (kahibaro/cram.com; the ეუბნებ- "tell someone" series is AI-pass).
• THINK (ფიქრი): I→ვფიქრობ · we→ვფიქრობთ · he/she→ფიქრობს ·
  they→ფიქრობენ (latinum L76).
• MAKE/DO (გაკეთება): I→ვაკეთებ · we→ვაკეთებთ · he/she→აკეთებს ·
  they→აკეთებენ (kahibaro; apprenti-polyglotte identical table).
EXCLUDED (already owned elsewhere): want → 4.88-4.89 psych-verb frames
(მინდა/გინდა/უნდა — dative-experiencer, KA-124); go/come present →
4.81 motion (მიდის/მოდის); sleep → inversion verb (ბავშვს სძინავს —
dative-subject construction, AI-pass only); love/like/hate → m-class
verbs (KA-104). GUARDS: 2nd person NEVER maps (T–V: იცი vs იცით —
register AI-decided); "it" subjects AI-gated (4.108); subjectless
verb forms left (no person → no safe form); negated presents
("don't/doesn't know") stay with 4.93's არ family + AI rebuild
(არ ვიცი); do/does-support questions untouched (Georgian drops
do-support, question formed by intonation).
MAPPING: know→ვიცი paradigm · know him→ვიცნობ paradigm · see→ვხედავ
paradigm · eat→ვჭამ paradigm · drink→ვსვამ paradigm ·
read→ვკითხულობ paradigm · write→ვწერ paradigm · say→ვამბობ paradigm ·
think→ვფიქრობ paradigm · make→ვაკეთებ paradigm.
TACTIC: consume SUBJECT+VERB atomically while the subject is still
visible (before 4.81 bare-go and 4.109/4.108 pronoun swaps); the
present form ALREADY encodes the person — pro-drop may trim the
pronoun (3.19). Everything else (2nd person, it, subjectless,
negated, questions) stays QA-gated for the AI pass (3.125).`;

// KA-124 v1.42.0 — Modals & auxiliaries: bare EN modal/copula tokens →
//                  Georgian impersonal-modal carriers + the copula
//                  paradigm. Wires the KA_MODALITY doctrine (KB-only
//                  since v1.9.0) into deterministic swaps. Attested:
//                  talkpal.ai (შეუძლია impersonal — "it is possible for
//                  [someone]"), sjani.ge (unda tsavikitkho — უნდა +
//                  optative obligation), cram.com (should → უნდა/
//                  მმართებს), Peace Corps Georgian guide +
//                  georgianlanguagesite (copula paradigm მე ვარ, შენ
//                  ხარ, ის არის, ჩვენ ვართ, თქვენ ხართ, ისინი არიან;
//                  negated არ ვარ/არ ხარ/არ არის), latinum.substack L56
//                  (არ before consonants, არა before vowels),
//                  nthuleen.com (4 verb classes; future screeve via
//                  preverb — დავწერ), kaikki.org (შეძლო paradigm).
const KA_MODALS_AUX = `
KA-124 MODALS & AUXILIARIES — Georgian has NO auxiliary verbs and NO
inflecting modals; modal meaning is carried by PARTICLE + OPTATIVE
(უნდა), impersonal dative-experiencer verbs (შე-ძლია family,
შეიძლება), or screeve choice. English do-support, perfect have, and
the copula have NO Georgian counterpart — tense/mood lives on the
verb itself.
• ABILITY — შე-...-ძლია family: an IMPERSONAL dative-experiencer
  verb ("it is possible for [someone]"); the person lives in the
  pre-radical prefix, NOT in a subject pronoun: შემიძლია (I can),
  შეგიძლია (you sg can), შეუძლია (he/she can), შეგვიძლია (we can),
  შეგიძლიათ (you pl/formal can), შეუძლიათ (they can). Past: შემეძლო,
  შეგეძლო, შეეძლო, შეგვეძლო, შეგეძლოთ, შეეძლოთ. Future: შემეძლება.
  A masdar or optative follows: შემიძლია დავწერო / დაწერა. The
  subject+modal pair is consumed TOGETHER (I can → შემიძლია) — never
  map bare "can" alone. "you can/could" is T–V gated (შეგიძლია vs
  შეგიძლიათ) and stays for QA + AI.
• OBLIGATION — უნდა is INVARIABLE: it never conjugates (NEVER
  *უნდება, *უნდავს) and takes the OPTATIVE: უნდა დავწერო (I must
  write). must / should / have to / has to / had to / have got to
  → უნდა. Negation: არ უნდა (must not / shouldn't).
• PERMISSION / POSSIBILITY — შეიძლება (impersonal): may / might →
  შეიძლება (შეიძლება მოვიდეს — I may come). იქნებ + future is the
  literary "perhaps" variant (KA_MODALITY).
• FUTURE COPULA — will be → იქნება paradigm: ვიქნები, იქნება,
  ვიქნებით, იქნებიან (you: იქნები/იქნებით T–V gated). NEGATED
  frames (won't be / will not be) are consumed in 4.93 BEFORE its
  bare won't → არ map (longest-first) — the bare map alone would
  strand the copula as "მე არ be". Positive frames live in 4.109;
  bare subjectless "will be" is LEFT (person unknown → no safe
  form; QA 3.123 + AI-pass decide). Bare "will +
  VERB" is the future screeve built by PREVERB + present stem
  (დავწერ I will write) — verb-specific, AI-pass territory.
• COPULA — present: მე ვარ, შენ ხარ, ის არის, ჩვენ ვართ, თქვენ
  ხართ, ისინი არიან. The copula is REQUIRED in 1st/2nd person
  present; 3rd person allows zero copula or the -ა clitic (ეს
  წიგნია) — see 3.33 is-calque. Past: ვიყავი, იყავი, იყო, ვიყავით,
  იყავით, იყვნენ. Negation precedes: არ ვარ, არ ხარ, არ არის, არ
  ვართ, არ არიან; არ ვიყავი, არ იყო, არ იყვნენ (არ before
  consonants, არა before vowels). "it is" NEVER maps mechanically —
  dummy/weather subjects drop (წვიმს, ცივა) and clefts rebuild
  (3.94).
• DO-SUPPORT / PERFECT HAVE — Georgian has no auxiliary: do/does/
  did (emphatic or interrogative) DROP; negation is არ/ვერ (4.93).
  have/has/had + participle is the PERFECT screeve on the verb
  itself (დაწერილია, ნახავს) — not a word swap; AI-pass rebuilds.
• WOULD — conditional screeve (ვნახავდი) or იქნებ readings;
  verb-specific, AI-pass. would be → იქნებოდა is already
  deterministic (4.91).
• ORDER: fix 4.109 consumes SUBJECT+MODAL and SUBJECT+COPULA
  frames atomically (I can → შემიძლია, I am → მე ვარ) and
  therefore runs IMMEDIATELY BEFORE 4.108's bare pronoun swaps —
  otherwise the pronoun is stripped first and the subject-adjacent
  person agreement is lost.
MAPPING: I can→შემიძლია · he/she can→შეუძლია · we can→შეგვიძლია ·
they can→შეუძლიათ · past could→შემეძლო series · must/should/
have to→უნდა (+optative follows) · must not/shouldn't→არ უნდა ·
may/might→შეიძლება · will be→იქნება paradigm · I am→მე ვარ ·
we are→ჩვენ ვართ · he/she is→ის არის · they are→ისინი არიან ·
I was→მე ვიყავი · he/she/it was→ის იყო · we were→ჩვენ ვიყავით ·
they were→ისინი იყვნენ · negated frames→არ + same paradigm ·
you-forms and bare will/would/have→QA-gated, AI-pass`;

// KA-111 v1.29.0 — Spatial deictics + existential copula: bare EN place
//                  adverbs and dummy-subject "there is/are" frames. Wires
//                  KA-101's documented-but-never-coded EXISTENCE frames
//                  into deterministic fixes.
const KA_SPATIAL_DEICTIC = `
SPATIAL DEICTICS + EXISTENTIAL COPULA — bare EN place adverbs map to
Georgian's two-way system (en.wiktionary აქ [äkʰ] "here", იქ [ikʰ]
"there"; be-easy.org /ak /ik: აქ = place NEAR THE SPEAKER, იქ = place
DISTANT relative to speaker AND listener — no English-style mid-deixis,
no demonstrative duplication; the -ვე fusions are coordinate):
• here → აქ · there → იქ (idioms: იქ სწავლობს "he studies there",
  აქ უნდა გაშენდეს ხეხილის ბაღი "an orchard is to be planted here").
• right here → აქვე · over there → იქვე (en.wiktionary, Chikobava
  Explanatory Dictionary refs: აქვე = "here, right here", იქვე = "in
  that very place" — POLYSEMOUS: also "at that very instant"; spatial
  vs temporal reading needs context, map spatial by default).
  Fused pattern აქ+ვე / იქ+ვე mirrors ახლა+ვე (KA-109).
• EXISTENTIAL COPULA (KA-101 wiring): Georgian has NO dummy subject —
  "there" DELETES, the real subject surfaces: there is a book → არის
  წიგნი / წიგნი არის. Location frame: the book is on the table →
  წიგნი მაგიდაზეა — არიس ABBREVIATES to -ა after a case suffix
  (georgiafriends.ru). there is no → არ არის / არ არსებობს.
• PLURAL ANIMACY RULE (Latinum Georgian lesson 44, literary
  attestations): inanimate plural subjects take SINGULAR იყო, animate
  plurals take იყვნენ — წიგნები იყო მაგიდაზე · ქალაქის ქუჩები იყო
  ცარიელი · პასუხები იყო სწორი · ციხე-სიმაგრეები იყო აშენებული ·
  სოფლები იყო გაფანტული · ისტორიები იყო გადმოცემული; animate:
  მეფენი იყვნენ (Rustaveli). COMMON MISTAKE: *წიგნები იყვნენ is WRONG.
  DEFAULT for bare there were → იყო (inanimate dominates text);
  animate-only frames reach QA 3.110 + AI pass.
• HOMONYM GUARD: colloquial აქ is a clipping of აქვს "has" — EN→KA
  never triggers it (English "has" never maps through here), but the
  AI pass must not "correct" locative აქ into აქვს.
• ORDERING: fix 4.91 (There's going to be → იქნება) and 4.92 (There
  used to be → იყო ხოლმე) consume their frames BEFORE 4.96 — only
  bare there is/are/was/were leftovers reach the deterministic map.
MAPPING: right here→აქვე · here→აქ · over there→იქვე · there→იქ ·
there is/are→არის · there was→იყო · there were→იყო (inanimate
default) | იყვნენ (animate, QA-gated) · there is no→არ არის ·
X on the table→X ... მაგიდაზეა (-ა fused copula)`;

// KA-127 v1.45.0 — Locative postposition dictionary: English spatial
//                  prepositions → Georgian postpositions / case suffixes.
//                  Primary goal: fix the long-standing "next to" bug
//                  (bare next→შემდეგ) by consuming LOCATIVE "next to"
//                  BEFORE 4.70's narrative sequencer swap runs.
const KA_LOCATIVE_POSTPOSITIONS = `
KA-127 LOCATIVE POSTPOSITIONS — Georgian expresses location mainly via
POSTPOSITIONS and case endings rather than English-style prepositions.
Case-government split (attested patterns; see geolang.ru, Wiktionary,
Glosbe examples, and Tatoeba corpus):
• DATIVE-governing (often written as suffixes): -ზე (on), -ში (in),
  -თან (at/near), შორის (between; separate word, takes dative).
• GENITIVE-governing postpositions: უკან (behind), წინ (in front of),
  ქვეშ (under), გარეთ (outside), გვერდით (beside/next to).
• DISTANCE: შორს + -დან/-გან ("far from X" ≈ "X-დან შორს"; "from here"
  lexicalizes as აქიდან).
TACTIC (fix 4.112): consume high-confidence English COPULA+LOCATIVE
frames and emit a Georgian carrier + a lightweight case marker on the
English noun residue (e.g. table-ზე, house-ის გარეთ). Full noun
declension (dropping -ს before -ზე/-ში, vowel harmony, Georgian noun
stems) is AI-pass work; deterministic rules only ensure the correct
postposition choice and stop the catastrophic next→შემდეგ error.
GUARDS: temporal "next" (next week/day/station) stays owned by 4.70 and
calendar rules; only the LOCATIVE bigram next+to is consumed here.`;

// KA-128 v1.46.0 — Everyday verbs, question auxiliary frames, and core adjective collocations
const KA_EVERYDAY_VERBS_QUESTIONS = `
KA-128 EVERYDAY VERBS & QUESTION FRAMES —
1. HIGH-FREQUENCY VERB PARADIGMS:
   • TAKE (აღება/იღებს): Present: ვიღებ (1sg), ვიღებთ (1pl), იღებს (3sg), იღებენ (3pl). Aorist: ავიღე (1sg), ავიღეთ (1pl), აიღო (3sg, ergative subject: მან აიღო), აიღეს (3pl, მათ აიღეს).
   • GIVE (მიცემა/აძლევს): Present: ვაძლევ (1sg), ვაძლევთ (1pl), აძლევს (3sg), აძლევენ (3pl). Aorist: მივეცი (1sg), მივეცით (1pl), მისცა (3sg, მან მისცა), მისცეს (3pl, მათ მისცეს).
   • OPEN (გაღება/აღებს): Present: ვაღებ, ვაღებთ, აღებს, აღებენ. Aorist: გავაღე, გავაღეთ, გააღო, გააღეს.
   • CLOSE (დახურვა/ხურავს): Present: ვხურავ, ვხურავთ, ხურავს, ხურავენ. Aorist: დავხურე, დავხურეთ, დახურა, დახურეს.
   • WORK (მუშაობა/მუშაობს): Present: ვმუშაობ, ვმუშაობთ, მუშაობს, მუშაობენ. Aorist: ვიმუშავე, ვიმუშავეთ, იმუშავა, იმუშავეს.
   • LIVE (ცხოვრება/ცხოვრობს): Present: ვცხოვრობ, ვცხოვრობთ, ცხოვრობს, ცხოვრობენ. Past: ვცხოვრობდი, ვცხოვრობდით, ცხოვრობდა, ცხოვრობდნენ.
   • BUY (ყიდვა/ყიდულობს): Present: ვყიდულობ, ვყიდულობთ, ყიდულობს, ყიდულობენ. Aorist: ვიყიდე, ვიყიდეთ, იყიდა, იყიდეს.
   • SELL (გაყიდვა/ყიდის): Present: ვყიდი, ვყიდით, ყიდის, ყიდიან. Aorist: გავყიდე, გავყიდეთ, გაყიდა, გაყიდეს.
   • WAIT (ლოდინი/ელოდება): Present: ველოდები, ველოდებით, ელოდება, ელოდებიან.
   • UNDERSTAND (გაგება/ესმის): Present (inversion): მესმის (to me), გვესმის (to us), ესმის (to him/her: მას ესმის), ესმით (to them: მათ ესმით).
2. QUESTION FRAMES (English auxiliary inversion → Georgian intonation / question particles):
   • "do you know" → იცი? (fact) / იცნობ? (person)
   • "will you come" → მოხვალ?
   • "can you help me" → შეგიძლია დამეხმარო?
   • "what do you want" → რა გინდა?
   • "how are you" → როგორ ხარ?
   • "why not" → რატომ არა?
   • "where do you live" → სად ცხოვრობ?
   • "where are you" → სად ხარ?
3. CORE ADJECTIVES & NOUN COLLOCATIONS:
   • In Georgian, adjectives precede nouns and take truncated agreement in the nominative:
     - "big house" → დიდი სახლი
     - "small dog" → პატარა ძაღლი
     - "new car" → ახალი მანქანა
     - "old man" → მოხუცი კაცი
     - "very good" → ძალიან კარგი
     - "beautiful day" → ლამაზი დღე
     - "long road" → გრძელი გზა`;

// KA-112 v1.30.0 — Bare interrogatives (direct-question wh-words). All
//                  FRAMED wh-uses are already consumed by earlier rules
//                  (3.90/4.75 free relatives, 3.104/4.90 reported
//                  questions, 4.74 temporal when) — this block governs
//                  the LEFTOVERS: genuine direct questions.
const KA_BARE_INTERROGATIVE = `
BARE INTERROGATIVES (direct questions) — the deterministic wh-word set
for genuine question frames, gated on sentence-final "?". Georgian
interrogatives (en.wikibooks Georgian/Questions; talkpal.ai; geolang.ru;
parryc.com interrogative/relative table):
• who → ვინ [vin] — ANIMATE ONLY (persons). Object case: ვის (dative),
  ვისი = whose. NOT for things — რა covers inanimates.
• what → რა [ɾä] — INANIMATE. Declines (en.wiktionary რა): ergative
  რამ, dative რას (direct object: რას აპირებ?), genitive რის,
  instrumental რით. Bare nominative რა for subjects/citation.
• where → სად [sad] — static location AND generic goal (dictionary.ge:
  სად ხარ? where are you; სად ცხოვრობ? where do you live). DIRECTIONAL
  SPLIT: where from → საიდან; where to → საით (en.wiktionary [säitʰ];
  dictionary.ge also საითკენ). "Where did you hear that?" → საიდან /
  სად (dictionary.ge gives both).
• when → როდის [rodis] — INTERROGATIVE ONLY (Latinum lesson 51:
  როდის = asking when; როცა = relative conjunction "at the time
  when"). როდის იყავი ბათუმში? (kahibaro). NEVER use interrogative
  როდის inside a subordinate clause — that is როცა/როდესაც.
  Relative pairs (parryc): რაც/ვინც/სადაც/როგორც/როდისაც|როცა.
• why → რატომ [rat'om] (composition რა+ტომ "what-for" shape).
  what for → რისთვის (Wikibooks: რისთვის "what for", geolang).
• how → როგორ [rogor] (attested: როგორ ხარ? — talkinggeorgian).
  how many/much → რამდენი; how old are you? → რამდენი წლის ხარ?
  ("how many years are you" — kahibaro 5.3; learn101).
• which → რომელი — selection interrogative (Wikibooks; declines like
  an adjective, agrees in case: რომელ წიგნს იღებ?).
WORD ORDER (Borise 2019, syntax of wh-phrases in Georgian): the wh-word
MUST sit IMMEDIATELY PREVERBALLY (IPrP) — ბებია რას ალაგებდა, NOT
*Ras bebia alagebda (Borise & Polinsky: *wh-fronting to clause-initial
is ungrammatical; only negation may intervene). The fix carries the
question mark through — re-ordering EN residue words around the
wh-word is AI-pass work; this block only swaps the wh-token itself.
DO-NOT-MAP guards: "how about"/"what about" (suggestion idioms, no
stable single carrier), "what's" (attested → რა იქნება only in the
what-if frame, 4.90 — otherwise copula frame, AI pass), embedded/
indirect wh (consumed by 4.90 asked/told/don't-know frames BEFORE the
tail) and free relatives (3.90/4.75 -ც fusions) never reach the bare
map. როგორ არის როგორც — the relative/complement როგორც is a separate
word (4.78 simile family); bare how → როგორ never touches it.
MAPPING: who→ვინ · what→რა · where→სად · where from→საიდან ·
where to→საით · when→როდის (questions only) · why→რატომ ·
what for→რისთვის · how→როგორ · how many/much→რამდენი ·
how old→რამდენი წლის · which→რომელი`;

// KA-113 v1.31.0 — Irregular past (aorist) dictionary. The high-frequency
//                  English irregular verbs whose Georgian aorists are
//                  SUPPLETIVE or stem-changing — a naive -eb/aorist or
//                  present-stem calque produces hard MT defects. Forms
//                  verified: Latinum lesson 26 (თქვა aorist paradigm ვთქვი/
//                  თქვი/თქვა/ვთქვით; უთხრა used when there's an indirect
//                  object — "telling someone"), dictionary.ge find II
//                  (ვიპოვე "I have found"), lingua.ge გრძნობა (იგრძნო
//                  aorist), and the engine's own KB attestations (თქვა/
//                  უთხრა/მითხრა split; დაინახა saw; იფიქრა/იცოდა mental;
//                  მოესმა heard; იგრძნო felt; მომცა gave-me; მოიტანა
//                  brought-hither; აიღო took; წაიღო took-away).
const KA_IRREGULAR_PAST = `
IRREGULAR PAST (AORIST) DICTIONARY — high-frequency English irregular
verbs whose Georgian aorists are suppletive or stem-changing. The aorist
(Series II) marks COMPLETED past action in the ERGATIVE alignment: the
subject takes -მა (მან თქვა), the direct object stays nominative
(წიგნი წაიღო). Never calque an English irregular past with the present
stem — ამბობს→*ამბო was, ხედავს→*ხედ was are hard MT defects.
SPEECH VERBS (three-way split, KB KA-SPEECH-VERBS / defect 16):
• said (no indirect object) → თქვა [tqva] (Latinum L26 paradigm:
  ვთქვი I said · თქვი you said · თქვა he said · ვთქვით we said).
• said TO someone / told → უთხრა (Latinum L26: თხრა-form used when
  there is an indirect object); said TO ME → მითხრა (mi- series fuses
  the 1st-person object: მითხრა, რომ... — KB defect 9).
  "he said that..." → თქვა, რომ... (KB: რომ REQUIRED after speech verbs
  even where English drops it).
MENTAL / PERCEPTION (KB attested set):
• thought (momentary) → იფიქრა; was thinking → ფიქრობდა (imperfect);
  realized → მიხვდა; knew → იცოდა (imperfect; იცის = knows now).
• saw → დაინახა (aorist of ნახავს-family; ხედავს = sees now);
  heard → მოესმა (aorist; მოესმოდა = could be heard; გაიგონა =
  heard/learned something new); felt → იგრძნო (lingua.ge გრძნობა
  aorist: ვიგრძენი/იგრძენი/იგრძნო); noticed → შეამჩნია.
GIVE / TAKE / BRING / FIND / MAKE (KB attested):
• gave → მისცა (beneficiary fused: gave me → მომცა, gave you → მოგცა,
  gave us → მოგვცა — KB KA-MASDARS-DEEP m/g/v/gv infixes; never
  *მეცა). • took → აიღო; took away → წაიღო (წა- away preverb).
• brought (hither) → მოიტანა (მო- toward speaker); found → იპოვა
  (dictionary.ge find II: პოვნა, ვიპოვე "I have found what I want");
  made/did → გააკეთა (გა- completive, KB preverb table); wrote →
  დაწერა (lingoseven aorist paradigm დავწერე/დაწერა/დაწერეს).
DO-NOT-MAP guards: "said" inside quoted dialogue attribution keeps the
quote intact (KB -თქო/-მეთქi quotative block governs dialogue chains);
"was/were + -ing" is imperfect territory (ფიქრობდა/მიდიოდა), never the
aorist; evidential/reported pasts ("they say he was rich") belong to
the Series III perfect block (ყოფილა/უთქვამს), not the aorist.
MAPPING: said→თქვა · said to/told→უთხრა · said to me→მითხრა ·
thought→იფიქრა · was thinking→ფიქრობდა · knew→იცოდა · realized→მიხვდა ·
saw→დაინახა · heard→მოესმა/გაიგონა · felt→იგრძნო · noticed→შეამჩნია ·
gave→მისცა (gave me→მომცა) · took→აიღო · took away→წაიღო ·
brought→მოიტანა · found→იპოვა · made/did→გააკეთა · wrote→დაწერა`;

// KA-114 v1.32.0 — Demonstratives, split-scoped. Georgian has a THREE-WAY
// demonstrative system (parryc.com; KB KA_DEMONSTRATIVES_DEEP; Latinum L40):
// ეს = near the SPEAKER (this/these), ეგ = near the ADDRESSEE (that of
// yours), ის = far / anaphoric (that/those). In non-nominative roles the
// stems change: ეს→ამ, ეგ→მაგ, ის→იმ (fr.wikipedia declensions; parryc:
// "In non-NOM situations ეს becomes ამ and ის becomes იმ").
// Old Georgian used ესე/ეგე/იგი as third-person pronouns (Wiktionary ესე);
// the unmarked form is იგი (formal register).
// DETERMINER vs STANDALONE (Latinum L40: "ეს covers both singular and
// plural" as a determiner — "ეს წიგნები" = these books; standalone plural
// pronouns are ესინი/ისინი, parryc paradigm SG ეს/ის · PL ესინი/ისინი):
// • this → ეს ALWAYS (singular determiner or emphatic pronoun).
// • these + noun → ეს (determiner, number-neutral); standalone these
//   (before a verb or sentence-finally) → ესინი.
// • those + noun → ის (determiner: "ის წიგნები"); standalone those →
//   ისინი (Latinum L38: ისინი = they, NOM; ergative/dative მათ).
// BARE "that" IS DELIBERATELY UNMAPPED: English "that" is ambiguous
// between demonstrative ("that book"), complementizer ("that he left" —
// needs რომ), and the so/such...that result frame (KB KA_DEMONSTRATIVES_
// DEEP: "choose ეგ vs ის by who possesses or perceives the referent").
// No deterministic signal separates these — bare that stays AI-pass.
// OBLIQUE CASES (ამ/მაგ/იმ + case suffixes, e.g. ამ წიგნში "in this
// book") and the ეგ medial are AI-pass work: the fix layer only maps the
// nominative-determiner / nominative-pronoun forms above.
// Narration default: prefer ის for anaphoric reference; dialogue: ეგ for
// the addressee's possessions (KB tactic).
const KA_DEMONSTRATIVES = `
DEMONSTRATIVES (THREE-WAY) — ეს / ეგ / ის. Proximal ეს = this/these (near
speaker), medial ეგ = that near YOU, distal ის = that/those (far or
anaphoric). NON-NOMINATIVE stems: ეს→ამ, ეგ→მაგ, ის→იმ (ამ წიგნში "in
this book", იმ დღეს "on that day") — case agreement continues on the
stem (ამას/იმას dative standalone). Old Georgian ესე/ეგე/იგი survive as
archaic/formal; unmarked 3rd-person pronoun იგი. STANDALONE PLURALS:
ესინი (these ones) / ისინი (those ones = they, ergative/dative მათ).
As DETERMINERS ეს/ის are number-neutral: ეს წიგნი = this book, ეს
წიგნები = these books, ის წიგნები = those books (Latinum L40).
DO-NOT-MAP: bare "that" (complementizer რომ vs demonstrative vs
so/such...that) is undecidable deterministically — AI-pass must decide
ეგ vs ის by who possesses/perceives the referent, and use რომ for the
complementizer. Oblique ამ/იმ selection depends on the following
noun's case — AI-pass work.
MAPPING: this→ეს · these+noun→ეს · these (standalone)→ესინი ·
those+noun→ის · those (standalone)→ისინი · bare that→(unmapped, AI-pass)`;

// KA-115 v1.33.0 — Coordinating conjunctions: bare and/but/or. Georgian has
// exact coordinators (KA_CONJUNCTIONS; georgian.se): და = and, მაგრამ = but,
// ან = or (ან...ან = either...or). Until now the bare forms had NO
// deterministic swap — every mixed draft left them in Latin. PUNCTUATION
// ASYMMETRY (KA_CONJUNCTIONS; georgian.se glossed example): NO comma before
// და joining clauses ("დედა სადილს ამზადებს და ნინო თამაშობს") — drop the
// English comma habit; the comma goes BEFORE მაგრამ. SHORT/FOCUS forms
// (-ც enclitic "and/too": ნინოც, კი focus particle) are stylistic — AI-pass.
// Compound frames are already handled upstream (but also/but rather→არამედ,
// not only/not just→არა მხოლოდ, not even→არც კი, either→ან, neither/nor→არც,
// although/however→თუმცა, because→იმიტომ რომ, if→თუ) — fix 4.100 only sees
// the bare leftovers.
const KA_COORDINATING_CONJ = `
COORDINATING CONJUNCTIONS — და / მაგრამ / ან. და = and (joins words,
phrases and whole clauses; NO comma before it joining clauses —
დედა სადილს ამზადებს და ნინო თამაშობს), მაგრამ = but (comma BEFORE),
ან = or; ან...ან = either...or. Georgian also marks addition with the
enclitic -ც (ნინოც "Nino too") and the focus particle კი — prefer plain
და unless the second item is an afterthought/addition (AI-pass choice).
"and then" → და შემდეგ. თუმცა = although (comma before), ხოლო =
whereas/and (contrast between parallel subjects). "not only... but
also" → არა მხოლოდ... არამედ.
MAPPING: and→და · but→მაგრამ · or→ან · either...or→ან...ან ·
neither/nor→არც · focus/-ც→AI-pass`;

// KA-116 v1.34.0 — Politeness formulas & dialogue interjections. The
// highest-frequency fixed phrases in audiobook DIALOGUE (yes/no/please/
// thank you/sorry/excuse me/hello/goodbye) had NO deterministic swap —
// every dialogue line left them in Latin. Sources: kahibaro course 6.2
// (full politeness tables), georgianlanguage.online (greetings/thanks),
// Wiktionary Basic Georgian glossary, geolang.ru. YES has a REGISTER
// TRIAD (Wiktionary): formal დიახ, neutral კი, informal ხო/ჰო — map to
// the NEUTRAL კი; the formal/informal choice is AI-pass. THANK YOU:
// გმადლობთ (formal verb form) vs მადლობა (neutral noun) — მადლობა is
// safe everywhere; დიდი მადლობა = thank you very much. RESPONSE არაფრის
// "for nothing" (Wiktionary). APOLOGY SPLIT (geolang.ru): უკაცრავად =
// introductory excuse-me (nothing to apologize for yet: passing,
// asking), ბოდიში = the actual apology — kahibaro uses ბოდიში for both
// in casual speech. GREETINGS: გამარჯობა (lit. "victory") all-purpose,
// გამარჯობათ formal; time greetings X მშვიდობისა "X of peace".
// ნახვამდის = "until we see each other" goodbye; მერე გნახავთ =
// see you later. კარგი = good/okay (filler), რა თქმა უნდა = of course
// (lit. "what to say is needed"). Address forms ბატონო/ქალბატონო
// (Sir/Madam) — gender choice is deterministic from the referent, but
// honorific usage is style — AI-pass.
// MAPPING: yes→კი · no→არა · please→გთხოვთ · thanks→მადლობა ·
// sorry→ბოდიში · excuse me→უკაცრავად · hello→გამარჯობა ·
// goodbye→ნახვამდის · you're welcome→არაფრის · okay→კარგი ·
// of course→რა თქმა უნდა · formal/informal variants→AI-pass
// NAME NOTE: KA_POLITENESS (1h, v1.2.0) already covers the T-V register
// system — this block is the fixed DIALOGUE FORMULAS layer.
const KA_POLITENESS_FORMULAS = `
POLITENESS FORMULAS & DIALOGUE INTERJECTIONS. Fixed formulas used
constantly in dialogue — translate them with the Georgian FORMULA, not
word-by-word. YES has three registers (Wiktionary): დიახ formal, კი
neutral, ხო/ჰო informal — default კი; დიახ for emphatic/formal
speech (AI-pass). NO → არა ("no, thank you" → არა, მადლობა — refusal
formula). PLEASE: no single exact word (kahibaro) — გთხოვ/გთხოვთ
"lit. I ask you" (გთხოვთ formal/polite) or თუ შეიძლება "if possible";
default გთხოვთ, sentence-final position natural (წყალი, გთხოვ).
THANK YOU: გმადლობთ formal / მადლობა neutral; დიდი მადლობა = thank
you very much ("big thanks"; მადლი = grace). YOU'RE WELCOME →
არაფრის "for nothing"; also არა ღირს "it's nothing".
APOLOGY SPLIT (geolang.ru): უკაცრავად = introductory excuse-me —
nothing to apologize for yet (passing through, getting attention,
asking a question); ბოდიში = actual apology / casual sorry
(ბოდიში, დავიგვიანე "sorry, I'm late"; ძალიან ბოდიში = I'm very
sorry). GREETINGS: გამარჯობა (lit. "victory") all-purpose hello;
გამარჯობათ formal plural-polite. Time-of-day: დილა მშვიდობისა good
morning · საღამო მშვიდობისა good evening · ღამე მშვიდობისა good
night (lit. "morning/evening/night OF PEACE" — genitive + postposition).
FAREWELL: ნახვამდის "until we see each other" — any register;
მერე გნახავთ see you later; კარგად იყავი(თ) be well/take care.
OKAY: კარგი good/okay (also კაი colloquial); OF COURSE → რა თქმა
უნდა (lit. "what is to be said"); ალბათ = probably, რასაკვირვალა =
naturally. Address: ბატონო Sir/Mr., ქალბატონო Madam/Ms. (+ name),
polite you = თქვენ (verbs take -თ). სასიამოვნოა = nice to meet you;
მოგესალმებით = greetings (formal).
MAPPING: yes→კი (დიახ formal, ხო/ჰო informal) · no→არა ·
please→გთხოვთ · thank you→მადლობა · thank you very much→დიდი
მადლობა · thanks→მადლობა · you're welcome→არაფრის · sorry→ბოდიში ·
excuse me→უკაცრავად · hello/hi→გამარჯობა · goodbye/bye→ნახვამდის ·
good morning→დილა მშვიდობისა · good evening→საღამო მშვიდობისა ·
good night→ღამე მშვიდობისა · see you later→მერე გნახავთ ·
okay→კარგი · of course→რა თქმა უნდა · Mr./Sir→ბატონო ·
Madam→ქალბატონო · formal/informal variant choice→AI-pass`;

// KA-117 v1.47.0 — Contrastive English ↔ Georgian Syntactic Patterns.
// Deep contrastive linguistic rules governing natural transformation between
// analytic English and synthetic/agglutinative Georgian.
const KA_CONTRASTIVE_PATTERNS = `
CONTRASTIVE SYNTAX & STRUCTURAL PATTERNS (EN ↔ KA):
• TYPOLOGICAL SHIFT (SVO → SOV): English is strict SVO with post-verbal objects. Georgian literary prose is SOV (Subject-Object-Verb) with a pre-verbal focus slot.
  - EN: "The old gardener carefully opened the wooden gate."
  - KA: მოხუცმა მებაღემ ხის ჭიშკარი ფრთხილად შეაღო. (Subject-ERG, Object-NOM, Adverb, Verb-AORIST).
  - CALQUE DEFECT: *მოხუცმა მებაღემ შეაღო ხის ჭიშკარი ფრთხილად (unnatural SVO rhythm).
• PASSIVE DE-NOMINALIZATION: English heavily overuses passive voice ("The city was destroyed by the enemy", "It was decided that..."). Georgian avoids passive nominalizations:
  - Synthetic Active with Ergative: მტერმა ქალაქი გაანადგურა (Active Aorist with ERG).
  - Synthetic Inverted Passive: ქალაქი განადგურდა (Middle/Passive in -d-).
  - Impersonal Decided: გადაწყვიტეს, რომ... (They decided) or გადაწყდა, რომ... (It was resolved). Never *იყო გადაწყვეტილი.
• RELATIVE CLAUSE COMPRESSION (Participles over რომელიც):
  - In English, relative clauses ("which was built", "who arrived yesterday") dangle after the noun.
  - In literary Georgian, replace stacked 'რომელიც' clauses with concise pre-nominal participles:
    * "The letter that was received yesterday" → გუშინ მიღებული წერილი (NOT *წერილი, რომელიც გუშინ მიიღეს).
    * "The man standing at the doorway" → კართან მდგომი კაცი (NOT *კაცი, რომელიც დგას კართან).
    * "The task that must be done" → გასაკეთებელი საქმე (NOT *საქმე, რომელიც უნდა გაკეთდეს).
    * "Unforgettable memories" → დაუვიწყარი მოგონებები (Negative participle in და-უ-...-ელი).
• STRICT PRO-DROP (Pronoun Pruning):
  - Georgian verbs are polypersonal (marking 1st, 2nd, and 3rd person subjects and objects). Redundant overt pronouns (მე, შენ, ის, ჩვენ, ისინი) clutter the sentence and read as bad translationese.
  - Drop pronouns unless required for contrastive focus or narrative shift:
    * EN: "He woke up, he looked at his watch, and he realized that he was late."
    * KA: გაიღვიძა, საათს დახედა და მიხვდა, რომ აგვიანდებოდა. (Zero pronouns — clean, natural prose!).
• REFLEXIVE თავისი VS POSSESSIVE მისი (Critical Semantic Distinction):
  - If the possessor is the SUBJECT of the same clause, use თავისი (one's own):
    * "The hunter took his gun" → მონადირემ თავისი თოფი აიღო (his own gun).
    * WARNING: If you write მონადირემ მისი თოფი აიღო, it means the hunter took SOMEONE ELSE'S gun!
• POSTPOSITIONAL CASE SUFFIXING (No English Prepositions):
  - English prepositions become integrated Georgian postpositional case suffixes:
    * DATIVE + -ში (in/into): ქალაქში, ოთახში, გულში.
    * DATIVE + -ზე (on/onto/about): მაგიდაზე, გზაზე, თემაზე.
    * DATIVE + -თან (at/near/with): მეგობართან, სახლთან.
    * GENITIVE + -თვის (for): ბავშვებისთვის, სამშობლოსთვის.
    * GENITIVE + -გან (from/by): მისგან, ტყიდან (syncope: ტყე-დან).
    * GENITIVE + -გამო (because of): შიშის გამო, წვიმის გამო.
    * GENITIVE + -გარეშე (without): იმედის გარეშე, ეჭვის გარეშე.
    * ADVERBIAL + -მდე (until/up to): საღამომდე, ბოლომდე.
  - Never leave a space before a postposition: *სახლ ში is an error; write სახლში.`;

// KA-118 v1.47.0 — Comprehensive Experiencer Dative Predicate Paradigm.
// Complete inventory of Georgian inverted stative, affective, and cognitive verbs.
const KA_EXPERIENCER_FRAMES_COMPREHENSIVE = `
EXPERIENCER DATIVE INVERSION PARADIGM:
In Georgian, physical sensations, inner emotions, mental states, and volitional needs DO NOT use the nominative subject + copula structure of English. The experiencer is in the DATIVE case, the stimulus/theme is in the NOMINATIVE, and the verb agrees polypersonally.
• SENSATION & PHYSICAL STATE (Experiencer-DAT + Verb):
  - "I am hungry" → მშია (NOT *მე ვარ მშიერი). Past: მშიოდა. Future: მომშივდება.
  - "I am thirsty" → მწყურია (NOT *მე ვარ მწყურვალი). Past: მწყუროდა.
  - "I am cold / freezing" → მცივა (NOT *მე ვარ ცივი). Past: მციოდა.
  - "I am hot" → მცხელა. Past: მცხელოდა.
  - "I am sleepy" → მეძინება. Past: მეძინებოდა.
  - "My head hurts / I have a headache" → თავი მტკივა (NOT *მე მაქვს თავის ტკივილი).
• EMOTION & AFFECTIVE EVALUATION:
  - "I love you" → მიყვარხარ (Polypersonal: მ-1sg-obj + i-ყვარ + ხარ-2sg-be-form).
  - "He loves her" → მას ის უყვარს (Experiencer-DAT + Stimulus-NOM).
  - "I like this book" → ეს წიგნი მომწონს (NOT *მე მომწონს ეს წიგნი as SVO).
  - "I hate lies" → ტყუილი მძულს.
  - "He is afraid of darkness" → მას სიბნელის ეშინია (Stimulus in Genitive).
  - "She is ashamed" → მას რცხვენია.
  - "We are glad / rejoice" → გვიხარია.
  - "I miss my homeland" → სამშობლო მენატრება.
• COGNITION, MEMORY & PERCEPTION:
  - "I remember" → მახსოვს (NOT *მე მახსოვს as subject). Past: მახსოვდა.
  - "I forgot" → დამავიწყდა (Aorist inverted).
  - "I hear / I understand" → მესმის.
  - "I think / It seems to me" → მგონია / მეჩვენება.
  - "He believes in God" → მას ღმერთის სწამს / სჯერა.
• VOLITION, NEED & POSSESSION:
  - "I want water" → წყალი მინდა (NOT *მე მინდა წყალი). Past: მინდოდა.
  - "I need help" → დახმარება მჭირდება (NOT *მე საჭიროებ დახმარებას).
  - "I have a book" → წიგნი მაქვს (Inanimate possession: მაქვს).
  - "I have a brother / friend" → ძმა / მეგობარი მყავს (Animate possession: მყავს).
  - "I ought to / must" → მმართებს / მევალება.`;

// KA-119 v1.47.0 — Proper Noun Transcription & Transliteration Rulebook.
// Scientific and literary principles for transliterating English, Latin, Greek,
// and European personal names, classical titles, and place names into Georgian Mkhedruli.
const KA_PROPER_NOUN_TRANSLITERATION = `
PROPER NOUN & CLASSICAL NAME TRANSLITERATION (EN/LATIN/GREEK → KA):
• PHONOLOGICAL DIGRAPH & CLUSTER MAPPINGS:
  - th (Greek θ) → თ: Athens → ათენი, Prometheus → პრომეთე, Theodore → თეოდორე, Arthur → ართური, Catherine → ეკატერინე / კატერინა.
  - ph (Greek φ) → ფ: Philosophy → ფილოსოფია, Philip → ფილიპე, Delphi → დელფო, Joseph → იოსები / ჯოზეფი.
  - Classical c / k → კ: Caesar → კეისარი, Socrates → სოკრატე, Marcus → მარკუსი, Plato → პლატონი, Carthage → კართაგენი, Cicero → ციცერონი.
  - Modern English soft c → ს before e/i/y: Francis → ფრენსისი, Cecil → სესილი.
  - Modern English soft g / j → ჯ: James → ჯეიმსი, John → ჯონი, George → ჯორჯი (classical/biblical George → გიორგი).
  - English ch → ჩ: Charles → ჩარლზი, Churchill → ჩერჩილი, Chapman → ჩეპმენი.
  - English sh → შ: Shakespeare → შექსპირი, Shelley → შელი, Shaw → შოუ.
  - English silent cluster kn- → ნ: Knight → ნაიტი.
  - English silent cluster wr- → რ: Wright → რაიტი.
  - English silent cluster ps- → ფს: Psychology → ფსიქოლოგია.
  - English -tion → -ცია in borrowed Latinate nouns: Constitution → კონსტიტუცია, Revolution → რევოლუცია, Nation → ნაცია.
  - English vowel digraph au / aw → ო or აუ: Paul → პოლი (or პავლე), Austin → ოსტინი, Shaw → შოუ.
• LITERARY & CLASSICAL AUTHORS & TITLES GLOSSARY:
  - Homer → ჰომეროსი, Iliad → ილიადა, Odyssey → ოდისეა.
  - Marcus Aurelius → მარკუს ავრელიუსი.
  - Epictetus → ეპიქტეტე, Seneca → სენეკა.
  - Aristotle → არისტოტელე, Plato → პლატონი, Socrates → სოკრატე.
  - Alexander the Great → ალექსანდრე მაკედონელი.
  - Sun Tzu → სუნ ძი (Art of War → ომის ხელოვნება).
  - Shakespeare → უილიამ შექსპირი.
  - Dante Alighieri → დანტე ალიგიერი (Divine Comedy → ღვთაებრივი კომედია).
  - Cervantes → მიგელ დე სერვანტესი (Don Quixote → დონ კიხოტი).
  - Goethe → იოჰან ვოლფგანგ ფონ გოეთე (Faust → ფაუსტი).
  - Dostoevsky → თეოდორე დოსტოევსკი, Tolstoy → ლევ ტოლსტოი.
  - Kafka → ფრანც კაფკა, Nietzsche → ფრიდრიხ ნიცშე.
• CASE ENDING ON FOREIGN CONSONANT STEMS:
  - In Georgian, any foreign proper name ending in a consonant MUST take the nominative case vowel -ი in subject or citation form:
    * Hamlet → ჰამლეტი (NOM: ჰამლეტ-ი, ERG: ჰამლეტ-მა, DAT: ჰამლეტ-ს, GEN: ჰამლეტ-ის).
    * Sherlock Holmes → შერლოკ ჰოლმსი (ჰოლმს-ი, ჰოლმს-მა, ჰოლმს-ს).
    * Kant → კანტი, Darwin → დარვინი, Newton → ნიუტონი, Einstein → აინშტაინი.
  - Names ending in a vowel (-ა, -ე, -ო, -უ) do not take -ი: Dante → დანტე, Seneca → სენეკა, Goethe → გოეთე.`;

// ── 2. ASSEMBLY HELPERS ─────────────────────────────────────────────────────
// Full knowledge base for draft translation (v1.6.0 expanded set).
function getKaKnowledgeBase() {
    return [
        KA_MORPHOLOGY,
        KA_VERBS,
        KA_SYNTAX,
        KA_CONTRASTIVE_PATTERNS,
        KA_EXPERIENCER_FRAMES_COMPREHENSIVE,
        KA_PROPER_NOUN_TRANSLITERATION,
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
        KA_QUESTIONS_DEEP,
        KA_DEGREE_ADVERBS,
        KA_SEQUENCERS,
        KA_INSTRUMENTAL_DEEP,
        KA_ADVERBIAL_DEEP,
        KA_FOCUS_PARTICLES,
        KA_DISCOURSE_MARKERS,
        KA_AT_LEAST,
        KA_CONDITIONALS,
        KA_TEMPORAL_CLAUSES,
        KA_PURPOSE_CLAUSES_DEEP,
        KA_FREE_RELATIVES,
        KA_SIMILES_DEGREE,
        KA_RESULT_CORRELATIVES,
        KA_AS_FAMILY,
        KA_CLEFT_EMPHASIS,
        KA_MOTION_VERBS,
        KA_DIRECTIONAL_PREVERBS,
        KA_POSTURE_VERBS,
        KA_MASDAR_ADVERBIAL,
        KA_TEMPORAL_NOUN_FRAMES,
        KA_DEEP_PARTICIPLES,
        KA_EXISTENTIAL_FRAMES,
        KA_AFFECTIVE_VERBS,
        KA_BEFORM_AGREEMENT,
        KA_REPORTED_QUESTIONS,
        KA_REPORTED_COMMANDS,
        KA_FUTURE_INTENT,
        KA_HABITUAL_HORTATIVE,
        KA_NEGATION_CARRIERS,
        KA_TIME_DEICTIC,
        KA_CALENDAR_TIME,
        KA_NARRATIVE_TIME,
        KA_REPETITION_ADV,
        KA_RECIPROCALS_OTHERNESS,
        KA_INDEFINITE_PRONOUNS,
        KA_QUANTIFIERS,
        KA_POSSESSIVE_DET,
        KA_PERSONAL_PRONOUNS,
        KA_FUTURE_DICT,
        KA_PRESENT_DICT,
        KA_MODALS_AUX,
        KA_SPATIAL_DEICTIC,
        KA_LOCATIVE_POSTPOSITIONS,
        KA_EVERYDAY_VERBS_QUESTIONS,
        KA_BARE_INTERROGATIVE,
        KA_IRREGULAR_PAST,
        KA_DEMONSTRATIVES,
        KA_COORDINATING_CONJ,
        KA_POLITENESS_FORMULAS,
        KA_PREVERBS,
        KA_DEFECTS,
        KA_REGISTER,
        KA_DECISION_TABLE,
        KA_STYLE_EXEMPLARS
    ].join('\n');
}

// Compact rule set for refinement stages (targeted, smaller).
function getKaCompactRules() {
    return [KA_SYNTAX, KA_CONTRASTIVE_PATTERNS, KA_EXPERIENCER_FRAMES_COMPREHENSIVE, KA_PROPER_NOUN_TRANSLITERATION, KA_MORPHOLOGY, KA_VERBS, KA_DEFECTS, KA_DECISION_TABLE, KA_PUNCTUATION, KA_WORDBANK, KA_PREVERBS, KA_CASE_SYSTEM, KA_NEGATION, KA_SPEECH_VERBS].join('\n');
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
    if (/(?<![\u10A0-\u10FF])არ\s+ვერ(?![\u10A0-\u10FF])|(?<![\u10A0-\u10FF])ვერ\s+არ(?![\u10A0-\u10FF])/.test(text)) {
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

    // 3.20 Terminal punctuation check: ensure sentences terminate with a proper mark (. ? ! …)
    // (Latin periods are standard in modern Georgian; they are never flagged as errors).

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
            issues.push({ rule: 'missing_comma_contrast', message: `Missing comma before "${m10[1]}" — contrast/concession connectors take a comma: ..., მაგრამ ...` });
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
        issues.push({ rule: 'semicolon_hint', severity: 'hint', message: 'Semicolon in Georgian prose — native style prefers a period (.) or comma; replace unless clearly needed.' });
    }

    // 3.27 Space before punctuation (typo artifact): "word ." / "word ,"
    if (/[\u10A0-\u10FF]\s+([,.:;!?…])/.test(text)) {
        issues.push({ rule: 'space_before_punct', message: 'Space before punctuation mark — remove the space (word. not word .).' });
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
    const detachedTsRe = /(^|[\s,„"(])ც(?=[\s,."”):;!?…])/g;
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
    const detachedQuotRe = /(^|[\s„"(])((თქო|მეთქი))(?=[\s.!?,"”):…])/g;
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
    const araSpanRe = /(?<![\u10A0-\u10FF])(?:არავინ|არავითარი|არაფერი|არასოდეს|არასდროს|არსად)(?![\u10A0-\u10FF])([^.!?]{0,60})/g;
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

    // 3.81 Untranslated English tag-question / question softener remnants.
    //      "right?", "isn't it?", "really?" must surface as ხომ? / არა? /
    //      მართლა? / რომ? — never vanish or stay in English.
    if (/\b(?:right\?|isn'?t it\?|aren'?t you\?|don'?t you\?|really\?|eh\?)/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:ხომ|არა|მართლა|რომ)(?![\u10A0-\u10FF])\s*\?/.test(text)) {
        issues.push({ rule: 'question_particle_missing', message: 'English tag question (right? / isn\'t it? / really?) is present in the source but the Georgian tag particle (ხომ? / არა? / მართლა? / რომ?) is missing in the translation.' });
    }

    // 3.82 Untranslated English degree adverbs.
    if (/\b(?:very|really|quite|almost|completely|extremely)\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:ძალიან|ძალზე|საკმაოდ|თითქმის|სრულიად|ნამდვილად|მეტისმეტად)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'degree_adverb_untranslated', message: 'English degree adverb (very/really/quite/almost/completely/extremely) present in source but no Georgian degree carrier (ძალიან/საკმაოდ/თითქმის/სრულიად/ნამდვილად/მეტისმეტად) found in translation.' });
    }

    // 3.83 Untranslated English sequencers.
    if (/\b(?:first(ly)?|then|next|finally|eventually)\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:ჯერ|მერე|შემდეგ|მაშინ|ბოლოს|საბოლოოდ)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'sequencer_untranslated', message: 'English sequencer (first/then/next/finally/eventually) present in source but no Georgian sequencer (ჯერ/მერე/შემდეგ/მაშინ/ბოლოს/საბოლოოდ) found. The narrative chain must not vanish.' });
    }

    // 3.84 Untranslated English instrumental "with/by + means".
    if (/\bwith (?:a|an|the) [a-z-]+\b|\bby (?:car|bus|train|plane|hand)\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])[ა-ჰ]{2,}ით(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'instrumental_untranslated', message: 'English instrumental phrase (with a tool / by car/by hand) present in source but no Georgian instrumental -ით form found. "with a pen" → კალმით (one word, no preposition).' });
    }

    // 3.85 Quotative particle misattachment: -მეთქი is FIRST-person only;
    //      hearing-reported speech of others uses -ო.
    const metekhiRe = /(?<![\u10A0-\u10FF])[ა-ჰ]{2,}\s*მეთქი(?![\u10A0-\u10FF])/g;
    let m50;
    while ((m50 = metekhiRe.exec(text)) !== null) {
        const spanStart = Math.max(0, m50.index - 80);
        const before = text.slice(spanStart, m50.index);
        // Heuristic flag: მეთქი after a 3rd-person frame (თქვა/უთხრა მან...)
        if (/(?<![\u10A0-\u10FF])(?:თქვა|უთხრა|მითხრა)(?![\u10A0-\u10FF])/.test(before)) {
            issues.push({ rule: 'quotative_particle_missing', message: `"${m50[0]}" — quotative -მეთქី marks MY OWN reported words. After frames like თქვა/უთხრა (he said), the reported speech of another person takes -ო instead.` });
        }
    }

    // 3.85b "not even" flattened to plain negation: English "even" with a
    //       negated verb must surface არც (კი), not bare არ.
    if (/\bnot even\b|\bdidn'?t even\b|\bwithout even\b|\bnever even\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])არც(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'even_not_missing', message: 'English "not even / without even" present in source but Georgian არც / არც კი missing. "he didn\'t even look" → არც გამოუხედავს — the minimal-expected-action denial needs არც.' });
    }

    // 3.86 Untranslated English conditional marker: "if" present in source
    //      but neither თუ nor the counterfactual რომ-protasis present in
    //      the translation.
    if (/\bif\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:თუ|რომ|თუ არა|ნეტავ)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'conditional_untranslated', message: 'English conditional "if" present in source but Georgian თუ (real condition) or the counterfactual რომ-protasis missing. Real: თუ მოვა, სთხოვეთ... Counterfactual: მე რომ ვსწავლობდი, ჩავაბარებდი.' });
    }

    // 3.87 Counterfactual calque: English "had + V-ed / would have" with no
    //      pluperfect (-იყო/-ები/-ებოდა family) or conditional (-ებდი) in
    //      the translation.
    if (/\b(?:had (?:not\s+)?[a-z]+ed|would(?:n'?t)? have|if only)\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:[ა-ჰ]{2,}ებდი|იყო|ებოდა|ებინა|ნეტავ)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'counterfactual_calque', message: 'English counterfactual (had done / would have done / if only) present in source but no Georgian pluperfect/conditional verb (-ებდი / იყო / -ებოდა) found. Counterfactuals use რომ + pluperfect + -ებდი: მე რომ ვსწავლობდი, ჩავაბარებდი.' });
    }

    // 3.88 Untranslated English temporal conjunctions: when/until/as soon
    //      as/after + clause present but no Georgian temporal carrier.
    if (/\bwhen\b|\buntil\b|\bwhile\b|\bas soon as\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:როცა|როდესაც|სანამ|ვიდრე|როგორც კი|მას შემდეგ|მდე)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'temporal_conj_untranslated', message: 'English temporal conjunction (when/until/while/as soon as) present in source but no Georgian temporal carrier (როცა/სანამ/ვიდრე/როგორც კი) found. "until" needs the (მანამ) სანამ/ვიდრე ... არ frame.' });
    }

    // 3.89 Untranslated English purpose clause: in order to / so that
    //      present but no იმისათვის რომ / რათა / ისე რომ / masdar-ად
    //      (სა-...-აد purpose masdar like საყიდლად / მოსამზადებლად).
    if (/\bin order to\b|\bso that\b|\bso as to\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:იმისათვის|ისე რომ|რათა|[ა-ჰ]{0,12}სა[ა-ჰ]{2,}ად)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'purpose_clause_untranslated', message: 'English purpose clause (in order to / so that) present in source but no Georgian purpose carrier (იმისათვის რომ / რათა / ისე რომ / masdar-ად) found. Compact purpose: სადილის მოსამზადებლად.' });
    }

    // 3.90 Untranslated English free relatives: what/whoever/wherever/
    //      whenever as clause heads with no -ც fused relative in output.
    if (/\bwhat (?:I|you|he|she|we|they)\b|\bwhoever\b|\bwherever\b|\bwhatever\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:რაც|ვინც|სადაც|როცა|რასაც)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'free_relative_untranslated', message: 'English free relative (what/whoever/wherever/whatever) present in source but no Georgian fused relative (რაც/ვინც/სადაც/როცა/რასაც) found. "what I saw" → რაც დავინახე.' });
    }

    // ── v1.18.0 additions: similes, result correlatives, as-family, clefts ──

    // 3.91 Simile calque: English "as ADJ as (a/the) NOUN" present but the
    //      native -ივით/-ვით/-სავით suffix AND the equality carrier
    //      როგორც are both absent — the simile was dropped or flattened.
    if (/\bas (?!soon\b|well\b|much\b|far\b|long\b|many\b|little\b|yet\b|usual\b|known\b|follows\b|such\b|to\b|for\b)[a-z]{3,} as\b/i.test(text) &&
        !/ვით|როგორც/.test(text)) {
        issues.push({ rule: 'simile_calque', message: 'English simile ("as white as snow" type) present in source but the Georgian simile suffix -ივით/-სავით or the carrier როგორც is missing. Native literary form: თოვლივით თეთრი (white as snow), ტილოსავით თეთრი (white as a sheet).' });
    }

    // 3.92 Result-correlative missing: English "so X that Y" / "such X that
    //      Y" present but the obligatory correlative demonstrative
    //      (ისე / ისეთი / იმდენი) absent in the output. "so that" (pure
    //      purpose) is excluded — rule 3.89 covers it.
    if (/\bso\b(?!\s+that\b)[^.!?]{0,40}?\bthat\b|\bsuch\b[^.!?]{0,40}?\bthat\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:ისე|ისეთი|იმდენი)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'result_correlative_missing', message: 'English result clause ("so ... that" / "such ... that") present in source but the Georgian correlative demonstrative (ისე / ისეთი / იმდენი) is missing. The pair is OBLIGATORY: ისე იყო დაწერილი, რომ ვერავინ წაიკითხა; იმდენი ფული მაქვს, რომ ....' });
    }

    // 3.93 Untranslated "as"-family fixed frames: as for / as usual /
    //      as follows / as is known present but the verbatim Georgian
    //      frames (რაც შეეხება / როგორც წესი / როგორც ქვემოთ /
    //      როგორც ცნობილია) absent.
    if (/\bas for\b|\bas to\b|\bas usual\b|\bas follows\b|\bas is known\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:შეეხება|შემეხება|როგორც წესი|ქვემოთ|ცნობილია)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'as_family_untranslated', message: 'English fixed "as"-frame (as for / as usual / as follows / as is known) present in source but the Georgian verbatim frame missing: as for → რაც შეეხება (+ dative topic), as usual → როგორც წესი, as is known → როგორც ცნობილია, as follows → როგორც ქვემოთაა მითითებული.' });
    }

    // 3.94 Cleft/corrective frame missing: English "it is X who/that" cleft,
    //      "not only ... but" corrective, or "the point is" present but no
    //      Georgian carrier (სწორედ / არა მხოლოდ ... არამედ / არა თუ /
    //      უბრალოდ ის, რომ) in the output.
    if (/\bit (?:is|was) [^.!?]{0,30}\b(?:who|that)\b|\bnot only\b|\bnot just\b|\bthe point is\b/i.test(text) &&
        !/(?<![\u10A0-\u10FF])(?:სწორედ|არა მხოლოდ|არა თუ|უბრალოდ)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'cleft_untranslated', message: 'English cleft/emphasis construction (it is X who... / not only ... but / the point is) present in source but the Georgian focus carrier missing: cleft → სწორედ + focused element, not-only-but → არა მხოლოდ ..., არამედ ..., the-point-is → უბრალოდ ის, რომ.' });
    }

    // ── v1.19.0 additions: motion verbs, posture verbs, preverb direction ──

    // 3.95 Motion-verb untranslated: English go/goes/went/come/comes/came
    //      left bare in Georgian output — the suppletive system requires
    //      root selection BY TENSE (მიდ-/მოდ- present, წავალ/მოვალ future,
    //      წავიდა/მოვიდა aorist).
    if (/\b(go|goes|going|went|gone|come|comes|coming|came)\b/i.test(text) &&
        !/მიდის|მივდივარ|მოდის|მოვდივარ|წავიდ|მოვიდ|მივიდ|მივედ|წავალ|მოვალ|წადი|მოდი|წასვლა|მოსვლა/.test(text)) {
        issues.push({ rule: 'motion_verb_untranslated', message: 'English motion verb (go/went/come/came) left untranslated. Suppletive system: present მივდივარ/მიდის & მოვდივარ/მოდის, past წავიდა/მოვიდა, future წავალ/მოვალ, imperative წადი!/მოდი!.' });
    }

    // 3.96 Posture-verb untranslated: English stand/sit/lie (any form)
    //      present but no Georgian posture verb (დგას/ზის/წევს family).
    if (/\b(stand|stands|standing|stood|sit|sits|sitting|sat|lie|lies|lying|lay down|laid)\b/i.test(text) &&
        !/დგას|დგახარ|ვდგავარ|იდგა|ზის|ვზივარ|სხედ|იჯდ|დაჯდ|ვიჯექი|წევს|ვწევვარ|დაწვა/.test(text)) {
        issues.push({ rule: 'posture_verb_untranslated', message: 'English posture verb (stand/sit/lie) left untranslated. State present: დგას/ზის/წევს (ვდგავარ, ვზივარ, ვწევვარ); change of state: დაჯდა sat down, დაწვა lay down; past state იდგა was standing.' });
    }

    // 3.97 Directional-preverb missing: English directed motion (entered/
    //      exited/returned/crossed/climbed/descended) present but the
    //      matching fused preverb verb absent from the output.
    if (/\b(entered|exited|returned|crossed|climbed|descended|went out|went in|went up|went down|went away)\b/i.test(text) &&
        !/შევიდ|შესვლა|გავიდ|გასვლა|დაბრუნდ|გადავიდ|გადასვლა|ავიდ|ასვლა|ჩამოვიდ|ჩამოსვლა|წავიდ|მივიდ|მისვლა|წამოვიდ/.test(text)) {
        issues.push({ rule: 'preverb_direction_missing', message: 'English directed motion (entered/exited/returned/crossed/went up/down) present but the fused Georgian preverb verb missing: entered → შევიდა, exited → გავიდა, returned → დაბრუნდა, crossed → გადავიდა, went up → ავიდა, went down → ჩამოვიდა.' });
    }

    // 3.98 Masdar-adverbial untranslated: English gerund time phrase
    //      (after/before/while/until V-ing, "having V-ed") present but
    //      no [GEN masdar + postposition] frame (V-ის შემდეგ/წინ/დროს/
    //      დრომდე/-ისას/-ისთანავე) in the output. წინ(?!ა) — so წინა/
    //      წინააღმდეგ do not count as the frame.
    if (/\b(after|before|while|until|upon|having)\b/i.test(text) &&
        /\b\w+ing\b/i.test(text) &&
        !/შემდეგ|წინ(?!ა)|დროს|დრომდე|დროიდან|ისას|ისთანავე/.test(text)) {
        issues.push({ rule: 'masdar_adverbial_untranslated', message: 'English gerund time phrase (after/before/while V-ing, having V-ed) present but no masdar adverbial frame: after V-ing → V-ის შემდეგ, before V-ing → V-ის წინ, while V-ing → V-ის დროს/-ისას, until V-ing → V-ის დრომდე, as soon as → V-ისთანავე. Genitive masdar is the gerund.' });
    }

    // 3.99 Temporal-dative untranslated: English "during/during the X /
    //      at that time / for a long time" present but no N-ის დროს /
    //      იმ დროს / განმავლობაში frame in the output.
    if (/\b(during|throughout|at that time|at the time|for a long time|in (?:the )?course)\b/i.test(text) &&
        !/დროს|განმავლობაში/.test(text)) {
        issues.push({ rule: 'temporal_dative_untranslated', message: 'English during/throughout/at-that-time present but the temporal dative frame missing: during X → X-ის დროს (dative; never *X-ის დრო), duration → X-ის განმავლობაში, over time → დროთა განმავლობაში, at that time → იმ დროს.' });
    }

    // 3.100 Participle untranslated: static passive (was/were/is/are/been
    //      + V-ed), participial adjective in attributive slot, or un-/in-
    //      stem word present, with no Georgian participial morphology in
    //      output and no English "by" agent (KA_VOICE prefers active
    //      aorist re-syntax when the agent is stated: "was written by X"
    //      → X-მა დაწერა). Guard substrings (ილი/ული/დაუ...) intentionally
    //      over-match common Georgian words to keep false positives low.
    const pcpGuard = /(?:ილი|ული|ებული|ნაწ|ნანახ|ნაჭ|ნასმ|ნათქვ|ნაკეთ|ნაპოვნ|დაუ|უხილავ|უვარგის|უცნობ|ებელი|ველი|ყოფილი|მომავალ)/;
    const pcpEn =
        /\b(?:was|were|is|are|been|being|seems?|seemed|looks?|looked|feels?|felt)\s+(?:very\s+|so\s+|really\s+)?(?!(?:even|often|then|when)\b)\w+(?:ed|en)\b/i.test(text) ||
        /\b(?:the|a|an|his|her|their|its|my|our)\s+(?:very\s+)?(?:tired|broken|burned|burnt|closed|locked|frozen|hidden|forgotten|written|torn|wounded|aged|crowded|frightened|excited|surprised)\s+\w+/i.test(text) ||
        /\b(?:un|in)(?:known|finished|seen|heard|written|said|done|made|found|told|forgotten|broken|opened|closed|locked|paid|employed)\b/i.test(text);
    if (pcpEn && !/\bby\b/i.test(text) && !pcpGuard.test(text)) {
        issues.push({ rule: 'participle_untranslated', message: 'English participle (V-ed/V-en) present but no Georgian participial morphology: written → დაწერილი, broken → დამტვრეული, killed → მოკლული, angry → გაბრაზებული, busy → დაკავებული, the books he had read → ნაკითხი წიგნები (resultative ნა-), unbelievable → დაუჯერებელი (და-უ- negative potential, never *არაჯერებელი), former X → ყოფილი X (NOT ყოფილა). Static passive without agent prefers PPP + იყო/არის; aorist re-syntax is OK only with a stated agent.' });
    }

    // 3.101 Potential untranslated: curated TRUE-potential English
    //      adjectives (-able/-ible family; table/comfortable/valuable etc.
    //      deliberately NOT triggers) but no potential/negative-potential
    //      morphology in output.
    const poteEn = /\b(?:impossible|unbelievable|incredible|unforgettable|invisible|unbreakable|unreadable|inevitable|unusable|readable|visible)\b/i.test(text);
    const poteGuard = /(?:ებელი|ველი|შესაძლებელი|შეუძლებელი|საკითხავი|სანახავი|უხილავი|ხილული|დაუჯერებელი|დაუვიწყარი|წაუკითხავი|აუცილებელი|უვარგისი|დაუმტვრეველი|სარწმუნო)/;
    if (poteEn && !poteGuard.test(text)) {
        issues.push({ rule: 'potential_untranslated', message: 'English -able/-ible adjective present but no Georgian potential morphology: impossible → შეუძლებელი, unbelievable/incredible → დაუჯერებელი, unforgettable → დაუვიწყარი, invisible → უხილავი, visible → ხილული, unreadable → წაუკითხავი, unbreakable → დაუმტვრეველი, inevitable → აუცილებელი, unusable → უვარგისი, readable → საკითხავი, to-be-done → გასაკეთებელი, future → მომავალი (-ველი).' });
    }

    // 3.102 Affective agreement missing: English emotion/perception verb
    //      (love/like/hate/fear/want/need/believe/remember) present but
    //      no m-class affective carrier (მიყვარს/მომწონს/მძულს/მეშინია/
    //      მინდა/მჭირდება/მწამს/მახსოვს/სურს/შემიძლია...) in output.
    const affEn = /\b(?:loves?|loved|likes?|liked|hates?|hated|fears?|feared|afraid|wants?|wanted|needs?|needed|believes?|believed|remembers?|remembered|trusts?|trusted)\b/i.test(text);
    //      Guard covers: m-class carriers (მიყვარს...), imperfect/perfect
    //      (მიყვარდა/მყვარებია), future (მეყვარება), optative stems
    //      (მინდოდეს), ეშინია family (მეშინია/გეშინია/ეშინიათ —
    //      wiktionary attested), ვისურვებ conditional, მოეწონებინა.
    //      უნდოდ covers imperfect უნდოდა — it does NOT contain the
    //      substring უნდა (the უ-ნ-დ-ო sequence breaks it).
    const affGuard = /(?:მიყვარ|გიყვარ|უყვარ|გვიყვარ|მომწონ|მოგწონ|მოსწონ|გვწონ|მძულ|მოძულ|მეშინი|გეშინი|ეშინი|მინდა|მინდოდ|გინდა|უნდა|უნდოდ|მსურ|სურს|ვისურვ|მჭირდ|სჭირდ|მწამ|გწამ|სწამ|სჯერ|მახსოვ|გახსოვ|მსმენი|შემიძლ|შეგიძლ|შეუძლ|გვშეძლ|მყვარ|გყვარ|ჰყვარ|მეყვარ|დაინტერეს|აინტერეს)/;
    if (affEn && !affGuard.test(text)) {
        issues.push({ rule: 'affective_agreement_missing', message: 'English emotion/perception verb present but no m-class affective carrier: I love X → მიყვარს X, she loves him → მას უყვარს ის (experiencer DATIVE, verb agrees with experiencer), I like → მომწონს, I hate → მძულს, I am afraid → მეშინია + GEN, I want → მინდა/მსურს, I need → მჭირდება, I remember → მახსოვს, I believe → მწამს. Never *მე ვუყვარვარ.' });
    }

    // 3.103 Be-form object agreement missing: interpersonal "I/you love/
    //      like/miss/have (1st or 2nd person object)" present but no
    //      be-form suffix (-ხარ/-ვარ/-ხართ/-ვართ) on the carrier.
    //      3rd-person objects (him/her) deliberately NOT triggers —
    //      those take plain მიყვარს (be-form is 1st/2nd-person only).
    const beEn =
        /\b(?:i|we)\s+(?:really\s+)?(?:love|loved|like|liked|miss|missed|need)\s+you\b/i.test(text) ||
        /\b(?:do\s+you|you)\s+(?:really\s+)?(?:love|like|miss)\s+me\b/i.test(text) ||
        /\blove\s+you\b|\bmiss\s+you\b/i.test(text);
    //      Guard: be-form outputs of 4.88 + attested family (მიყვარხარ
    //      kaikki.org; მენატრები pinhok/learnentry; მე შენ მჭირდები
    //      singpraises hymn; მოვწონვარ/გყავარ zmnebi.com).
    const beGuard = /(?:მიყვარხარ|მიყვარხართ|გიყვარხარ|გიყვარხართ|გვიყვარხარ|გიყვარვარ|უყვარვარ|მოვწონვარ|მომწონხარ|მოგწონვარ|გყავარ|გყავხარ|მყავხარ|მენატრ|მჭირდები)/;
    if (beEn && !beGuard.test(text)) {
        issues.push({ rule: 'beform_missing', message: 'Interpersonal emotion with 1st/2nd-person object present but no be-form agreement: I love you → მიყვარხარ (NOT *მიყვარს შენ), you love me → გიყვარვარ, we love you → გვიყვარხარ, I love you all → მიყვარხართ, I miss you → მენატრები. The object is marked with the present "to be" form (ვარ/ხარ/ვართ/ხართ), Series I present only.' });
    }

    // 3.104 Reported-question carrier missing: English indirect-speech
    //      frames (asked if/whether/where, wondered if, told me where/
    //      what, don't know if/whether/where) present but NO Georgian
    //      reported-question carrier (თუ / თუ არა / ხომ არ / ვაითუ /
    //      რა იქნება) in output. Wh-retention alone (სად/რა/რომელი)
    //      does NOT satisfy the guard — the თუ carrier is the signal.
    const repEn =
        /\b(?:asked|wonder(?:ed|s)?|wondering)\b[^.!?]{0,60}?\b(?:if|whether|where|what|why|how|when|who)\b/i.test(text) ||
        /\b(?:told|tell)\s+(?:me|him|her|us|them)\b[^.!?]{0,40}?\b(?:where|what|why|how|when|who|that)\b/i.test(text) ||
        /\b(?:do(?:es)?n'?t|did(?:n'?t)|no one|nobody)\s+(?:know|knew|knows)\b[^.!?]{0,40}?\b(?:if|whether|where|what|why|how|when|who)\b/i.test(text) ||
        /\bwhat\s+if\b/i.test(text);
    //      Guard: polar carriers (თუ / თუ არა / ხომ არ — თუ checked with
    //      Georgian-boundary lookarounds so თუმცა "although" does NOT
    //      satisfy it), quotative -ო (გჭირდებაო — but ო preceded by ყ
    //      EXCLUDED so იყო "was", the most common word-final Georgian ო,
    //      does not false-satisfy the guard), what-if frames
    //      (ვაითუ / რა იქნება, ... რომ), optative double-question
    //      (წასულიყო თუ დარჩენილიყო).
    const repGuard = /(?:(?<![\u10A0-\u10FF])თუ(?![\u10A0-\u10FF])|ხომ\s+არ|ვაითუ|რა\s+იქნება|(?<!ყ)ო(?![\u10A0-\u10FF]))/;
    if (repEn && !repGuard.test(text)) {
        issues.push({ rule: 'reported_question_untranslated', message: 'English reported/indirect question present but no Georgian carrier: asked if/whether → მკითხა, თუ / თუ არა / ხომ არ (NEVER რომ for questions), asked where → მკითხა, სად (wh-word kept, statement order, no ?), told me what → მითხრა, თუ რომელი/რა, I wonder if → მაინტერესებს, თუ, don\'t know if → არ ვიცი, თუ, whether to go or stay → წასულიყო თუ დარჩენილიყო (double optative), what if → რა იქნება, ... რომ / ვაითუ.' });
    }

    // 3.105 Future-intent residue: English "BE going to + VERB" (planned
    //      future — NOT motion to a place, which the place-word lookahead
    //      below excludes) present in the source frame, but the output
    //      still carries the English residue "going to" / "gonna" and no
    //      აპირებ- carrier. Plain-future renderings (დავწერ, წავალ) are
    //      LEGITIMATE (kartuliena.eu: დავწერ წერილს = I am going to write
    //      a letter) and do not fire — only untranslated frames do.
    const goEn =
        /\b(?:am|is|are|was|were|be)\s+(?:not\s+)?going\s+to\s+(?!(?:the|a|an|my|your|his|her|its|our|their|this|that|these|those|bed|school|work|market|church|town|home|store|cinema|hospital|airport|station|university|college|sleep|dinner|lunch|meeting|be)\b)/i.test(text) ||
        /\b(?:'s|'re|'m)\s+(?:not\s+)?going\s+to\s+(?!(?:the|a|an|my|your|his|her|its|our|their|this|that|these|those|bed|school|work|market|church|town|home|store|cinema|hospital|airport|station|university|college|sleep|dinner|lunch|meeting|be)\b)/i.test(text) ||
        /\b(?:am\s+i|is\s+(?:he|she|it)|are\s+(?:we|they|you))\s+(?:not\s+)?going\s+to\s+(?!(?:the|a|an|my|your|his|her|its|our|their|this|that|these|those|bed|school|work|market|church|town|home|store|cinema|hospital|airport|station|university|college|sleep|dinner|lunch|meeting|be)\b)/i.test(text);
    const goGuard = /აპირებ|იქნებ/;
    if (goEn && /going to|gonna/i.test(text) && !goGuard.test(text)) {
        issues.push({ rule: 'future_intent_untranslated', message: 'English planned future "BE going to VERB" untranslated: I\'m going to leave → ვაპირებ წასვლას / წავალ, he is going to help → აპირებს დახმარებას, what are you going to do? → რას აპირებ? / რის გაკეთებას აპირებთ?, was going to call → დაგირეკას ვაპირებდი / დაგირეკავდი. Paradigm: ვაპირებ/აპირებ/აპირებს/ვაპირებთ/აპირებთ/აპირებენ; imperfect აპირებდა. "going to BE + noun/adj" is the COPULA FUTURE: he\'s going to be a doctor → იქნება ექიმი (never აპირებს იყოს). NEVER the bare motion მიდის for intent frames — მიდის is only for motion to a PLACE (I\'m going to the market → ბაზარზე მივდივარ). Masdar after აპირებს takes dative -ს (რის გაკეთებას აპირებთ, dictionary.ge). Plain future (წავალ/დავწერ) is also acceptable.' });
    }

    // 3.106 Habituality & hortative residue: "used to V" (habitual past,
    //      NOT "be used to" = accustomed), "would always V", bare "let's"
    //      and "let me" frames surviving into the output.
    //      "be used to" (accustomed) is EXCLUDED — it maps to მიჩვეული,
    //      not the habitual imperfect.
    const usedToHabit = /\b(?:he|she|it|there|we|you|they|i)\s+used\s+to\b/i.test(text) || /\bused\s+to\s+[a-z]+/i.test(text);
    const habitCarrier = /ხოლმე|მიჩვეული/;
    if ((usedToHabit || /\bwould\s+always\b/i.test(text)) && /used to|would always/i.test(text) && !habitCarrier.test(text)) {
        issues.push({ rule: 'habitual_untranslated', message: 'English habitual past "used to V" / "would always V" untranslated. Habit → IMPERFECT screeve + optional ხოლმე: he used to go → დადიოდა ხოლმე, I used to write → ვწერდი (ხოლმე), they would always meet → ხვდებოდნენ ხოლმე. "be used to V-ing" (accustomed) is different: მიჩვეული ვარ + masdar. Conditional screeve is ONLY future-in-past, never habit.' });
    }
    if (/\blet'?s\b/i.test(text) && !/(?:მოდი|მოდით|გავიდეთ|optative)/i.test(text)) {
        issues.push({ rule: 'hortative_untranslated', message: 'English hortative "let\'s V" untranslated → მოდი(თ) + OPTATIVE 1pl: let\'s go → მოდი წავიდეთ / წავიდეთ, let\'s ask → მოდი ვკითხოთ, let\'s eat → ვჭამოთ. "let me V" → optative 1sg (მოვუსმინო) or მინდა ვ... Never aorist for hortatives.' });
    }
    if (/\blet\s+me\s+[a-z]+/i.test(text) && !/(?:მინდა|მომეცი|მივუსმინო|optative)/i.test(text)) {
        issues.push({ rule: 'hortative_untranslated', message: 'English "let me V" untranslated → volitive/optative 1sg: let me see → მინდა ვნახო / ვნახო, let me help → მინდა დაგეხმარო. Keep the volitive, never plain aorist.' });
    }

    // 3.107 Negation residue: do-support auxiliary surviving into Georgian
    //      output. Georgian has NO do-support — არ sits pre-verbal (KA-108);
    //      can't → ვერ (subject-incapacity), not არ.
    if (/\b(?:don'?t|doesn'?t|didn'?t|do\s+not|does\s+not|did\s+not)\b/i.test(text) && !/(?<![\u10A0-\u10FF])არ(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'negation_untranslated', message: 'English do-support negation (don\'t/doesn\'t/didn\'t) untranslated. Georgian has no auxiliary: place არ DIRECTLY before the verb, tense lands on the Georgian verb — didn\'t answer → არ უპასუხა, doesn\'t smoke → არ ეწევის, I don\'t want to go → წასვლა არ მინდა.' });
    }
    if (/\b(?:won'?t|will\s+not)\b/i.test(text) && !/(?<![\u10A0-\u10FF])არ(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'negation_untranslated', message: 'English "won\'t" untranslated → არ + FUTURE screeve: he won\'t come → არ მოვა / ის არ მოვა. The negation is plain არ, the future lands on the verb.' });
    }
    if (/\b(?:can'?t|can\s*not|cannot)\b/i.test(text) && !/(?<![\u10A0-\u10FF])ვერ(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'negation_untranslated', message: 'English "can\'t" untranslated → ვერ (subject-incapacity particle, NOT არ): I couldn\'t come → ვერ მოვედი (ver movedi). ვერ is reserved for inability; neutral negation uses არ.' });
    }

    // 3.108 Time-deictic residue: English day-words surviving into Georgian
    //      output. Georgia's day count is richer than English's — გუშინწინ
    //      (day before yesterday) and ზეგ (day after tomorrow) are single
    //      invariable words (KA-109); bare English adverbs must map to them
    //      or to the KA_TIME_EXPR core trio (გუშინ/დღეს/ხვალ).
    if (/\byesterday\b/i.test(text) && !/გუშინ(წინ)?(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'time_deictic_untranslated', message: 'English "yesterday" untranslated → გუშინ (invariable, no case/prep). "the day before yesterday" is ONE word: გუშინწინ — never a calque like *ორი დღის წინ.' });
    }
    if (/\btomorrow\b/i.test(text) && !/ხვალ(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'time_deictic_untranslated', message: 'English "tomorrow" untranslated → ხვალ + FUTURE screeve (ხვალ მოვალ). "the day after tomorrow" is ONE word: ზეგ (zeg) — never *ორი დღის შემდეგ.' });
    }
    if (/\b(?:right\s+now|tonight)\b/i.test(text) && !/ახლავე(?![\u10A0-\u10FF])|ამაღამ(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'time_deictic_untranslated', message: 'English "right now"/"tonight" untranslated → ახლავე (fused ახლა+ვე) / ამაღამ (fused ამ+ა+ღამე). "right now" consumes BEFORE bare "now" → ახლა.' });
    }

    // 3.109 Possessive-determiner residue: context-gated EN possessives
    //      surviving into Georgian output (KA-110). your → შენი|თქვენი is
    //      register-dependent (KA-52) and her → მისი|მას is syntactically
    //      polysemous — deliberately NOT auto-fixed, flagged for the AI
    //      pass. The deterministic set (my/our/their/his/its) never
    //      reaches here because fix 4.95 consumes it first.
    if (/\byour\b/i.test(text) && !/(?<![\u10A0-\u10FF])(შენი|თქვენი)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'possessive_det_untranslated', message: 'English "your" untranslated → შენი (informal) or თქვენი (formal/plural) per the T–V register rules (KA-52). The choice propagates: შენი წიგნი vs თქვენი წიგნი — match the English register, never flatten.' });
    }
    if (/\bher\b/i.test(text) && !/(?<![\u10A0-\u10FF])(მისი|მას)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'possessive_det_untranslated', message: 'English "her" untranslated → მისი (possessive: her book → მისი წიგნი) or მას (object: saw her → დაინახა მას). Polysemous — decide from syntax. If the possessor is the clause subject, use თავისი (reflexive) instead.' });
    }

    // 3.110 Spatial-deictic + existential residue (KA-111): bare EN place
    //      adverbs and dummy-subject there-frames surviving into Georgian
    //      output. SCOPE: exact there is/are/was/were bigrams ONLY — never
    //      bare "there" (3.99 temporal_dative covers "there lived a king",
    //      3.106 covers "there used to be"; a bare-there probe would
    //      double-flag both). NARRATIVE INVERSION excluded: "there lived/
    //      stood/lay X" has NO locative there — Georgian drops it (verb-
    //      first: ცხოვრობდა ერთი მეფე). DUMMY-SUBJECT frames excluded
    //      the same way (there's / there is|are|was|were / used to /
    //      going to / modal+be) — those belong to the existential and
    //      intent rules, never to the locative იქ probe. Animacy split
    //      (Latinum lesson 44): inanimate plural → იყო, animate plural →
    //      იყვნენ — *წიგნები იყვნენ WRONG.
    if (/\bhere\b/i.test(text) && !/(?<![\u10A0-\u10FF])აქ(ვე)?(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'spatial_deictic_untranslated', message: 'English "here" untranslated → აქ (place near the speaker); "right here" → აქვე (fused აქ+ვე, Chikobava). Never map locative აქ to აქვს "has" — homonym, not related.' });
    }
    if (/\bthere\b(?!\s*['’]?s\b)(?!\s+(?:is|are|was|were)\b)(?!\s+used\s+to\b)(?!\s+going\s+to\b)(?!\s+(?:will|would|can|could|must|may|might|should)\s+be\b)(?!\s+(?:lived|stood|sat|lay|hung|appeared|arose|emerged|existed|remained|grew|ruled|reigned)\b)/i.test(text) && !/(?<![\u10A0-\u10FF])იქ(ვე)?(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'spatial_deictic_untranslated', message: 'English "there" untranslated → იქ (place distant from speaker AND listener); "over there" → იქვე (fused). Georgian has no dummy subject: existential "there" DELETES (there is a book → არის წიგნი) — do not calque dummy there as იქ.' });
    }
    //      -ა fused-copula detection: the abbreviation attaches AFTER a
    //      postposition suffix (მაგიდაზეა = ზე+ა) — never bare -ა (would
    //      false-positive on მაგიდა-class nouns).
    //      Existential probe: exact there is/are/was/were bigrams ONLY.
    //      Was/were merge into one probe: იყო/იყვნენ carriers satisfy it
    //      (Latinum animacy split in the message). არ არის is covered by
    //      the არის substring.
    if (/\bthere\s+(?:is|are|was|were)\b/i.test(text) && !/(?:არის|იყო|იყვნენ|(?:ზე|ში|თან|გან|ვით)ა(?![\u10A0-\u10FF]))/.test(text)) {
        issues.push({ rule: 'existential_untranslated', message: 'English dummy-subject "there is/are/was/were" untranslated → DROP "there", use the real subject + არის/იყო (there is a book → არის წიგნი; the book is on the table → წიგნი მაგიდაზეა, -ა fused copula). Negated: there is no → არ არის / არ არსებობს (KA-101). PLURAL ANIMACY (Latinum lesson 44): inanimate plural → SINGULAR იყო (წიგნები იყო მაგიდაზე), animate plural → იყვნენ (მეფენი იყვნენ, Rustaveli) — COMMON MISTAKE: *წიგნები იყვნენ is wrong.' });
    }

    // 3.111 Bare interrogative untranslated (KA-112): an English wh-word
    //      inside a DIRECT-QUESTION frame with no Georgian interrogative
    //      carrier anywhere. Question-frame gating: the text must contain
    //      "?" with NO Georgian word after the first "?" — if Georgian
    //      follows the "?", the question already sits inside Georgian
    //      residue (mixed/double-question drafts are AI-pass work; the
    //      wh-word there is embedded, not bare). This also silences the
    //      probe on statement residue like "there is/are" inputs that
    //      merely end in "?".
    //      Guard mirrors the 4.97 map: როგორ WITHOUT the ც only — the
    //      complementizer როგორც (4.78 as-family) is NOT an
    //      interrogative and must NOT satisfy the probe; საიდან/საით
    //      satisfy the where-family; how-old/many/much inputs are
    //      satisfied by რამდენი (also via its რა substring).
    //      "how about"/"what about"/"what's" have no stable carrier —
    //      they stay flagged for the AI pass.
    const firstQ = text.indexOf('?');
    const bareWh =
        /\b(?:who|what|where|when|why|how|which)\b/i.test(text) &&
        firstQ !== -1 && !/[ა-ჰ]/.test(text.slice(firstQ + 1));
    if (bareWh && !/(?<![\u10A0-\u10FF])(?:ვინ|რა|სად|საიდან|საით|როდის|რატომ|როგორ(?!ც)|რამდენი|რომელი|რისთვის)(?![\u10A0-\u10FF])/.test(text)) {
        issues.push({ rule: 'interrogative_untranslated', message: 'English interrogative untranslated: who → ვინ (animate; ვის/ვისი object/whose), what → რა (inanimate; dative რას, genitive რის, ergative რამ), where → სად · where from → საიდან · where to → საით, when → როდის (questions ONLY — subordinate "when" is როცა, Latinum lesson 51), why → რატომ · what for → რისთვის, how → როგორ (როგორ ხარ?), how many/much → რამდენი, how old are you → რამდენი წლის ხარ?, which → რომელი. WORD ORDER: the wh-word sits IMMEDIATELY PREVERBALLY (Borise 2019: ბებია რას ალაგებდა, never *რას ბებია ალაგებდა) — reorder the residue around the question verb. "how about"/"what about" (suggestions) and "what\'s" have no single carrier — rewrite for the AI pass.' });
    }

    // 3.112 Irregular past untranslated (KA-113): a high-frequency English
    //      irregular past (said/told/saw/thought/knew/gave/took/found/
    //      made/brought/heard/felt/wrote) with NO Georgian aorist carrier
    //      anywhere. Carrier set mirrors the 4.98 map (თქვა family covers
    //      უთხრა/მითხრა via the თხრ substring; იპოვა covers იპოვე).
    //      Deliberately LOOSE: any Georgian aorist carrier in the text
    //      silences the probe — a draft like "მან თქვა ..." is fine even
    //      if a second "said" remains (dialogue chains are AI-pass work).
    //      "was/were + -ing" imperfects and Series III evidentials
    //      (ყოფილა/უთქვამს) also satisfy the probe.
    const irregPast =
        /\b(?:said|told|saw|thought|knew|gave|took|found|made|brought|heard|felt|wrote)\b/i.test(text) &&
        !/(?:თქვ|უთხრ|მითხრ|დაინახ|იფიქრ|ფიქრობ|იცოდ|მიხვდ|მისც|მო[მგვ]ც|აიღ|წაიღ|მოიტან|იპოვ|გააკეთ|დაწერ|მოესმ|გაიგონ|იგრძნ|შეამჩნ|ყოფილ|უთქვამს)(?![\u10A0-\u10FF])/.test(text);
    if (irregPast) {
        issues.push({ rule: 'irregular_past_untranslated', message: 'English irregular past untranslated: said→თქვა · said to/told→უთხრა · said to me→მითხრა · thought→იფიქრა (continuous ფიქრობდა) · knew→იცოდა · saw→დაინახა · heard→მოესმა/გაიგონა · felt→იგრძნო · gave→მისცა (gave me→მომცა — beneficiary fuses INTO the verb) · took→აიღო · took away→წაიღო · brought→მოიტანა · found→იპოვა · made/did→გააკეთა · wrote→დაწერა. AORIST ALIGNMENT (Series II, ergative): subject takes -მა (მან თქვა), object stays nominative (წიგნი წაიღო). NEVER calque with the present stem (*ამბო, *ხედ) — suppletive/stem-changing aorists only. "he said that..." needs რომ even where English drops it. was/were+-ing → imperfect (ფიქრობდა), evidential pasts → Series III perfect (უთქვამს/ყოფილა).' });
    }

    // 3.113 Demonstrative untranslated (KA-114): English this/these/those
    //      with NO Georgian demonstrative carrier anywhere. Carrier set
    //      covers ეს (and ესინი via substring), ის/ისინი, and the oblique
    //      stems ამ/იმ. Deliberately LOOSE: any carrier silences the probe
    //      (a draft mixing "ეს წიგნი" and one leftover "this" is AI-pass
    //      work, not a hard defect). Bare "that" is NOT probed — it is
    //      ambiguous (complementizer რომ vs demonstrative vs so/such...that)
    //      and deliberately unmapped (KA-114).
    const demonstrative =
        /\b(?:this|these|those)\b/i.test(text) &&
        !/(?:ეს|ის|ამ|იმ)(?![\u10A0-\u10FF])/.test(text);
    if (demonstrative) {
        issues.push({ rule: 'demonstrative_untranslated', message: 'English demonstrative untranslated: this→ეს (always; ეს covers singular AND plural as a determiner: ეს წიგნი / ეს წიგნები) · these+noun→ეს (number-neutral determiner) · these standalone→ესინი · those+noun→ის (ის წიგნები) · those standalone→ისინი (ergative/dative მათ). THREE-WAY system: ეს = near speaker, ეგ = near addressee (dialogue: "your book" → ეგ წიგნი), ის = far/anaphoric (narration default). NON-NOMINATIVE stems: ეს→ამ, ეგ→მაგ, ის→იმ (ამ წიგნში "in this book", იმ დღეს "on that day") — never ეს + oblique case. BARE "that" is ambiguous (demonstrative vs complementizer რომ vs so/such...that) — decide ეგ vs ის by who possesses/perceives the referent; complementizer clauses need რომ.' });
    }

    // 3.114 Coordinating conjunction untranslated (KA-115): bare English
    //      and/but/or with NO Georgian coordinator anywhere. Carrier check
    //      requires the coordinator to stand ALONE (string edge or a
    //      non-Georgian char on BOTH sides) — the plain negative-lookahead
    //      style of 3.113 would false-silence on imperfect verbs, which END
    //      in -და (წერდა, ფიქრობდა). Still LOOSE in the 3.113 sense: ANY
    //      one of და/მაგრამ/ან silences the probe (a draft mixing და and
    //      one leftover "but" is AI-pass work, not a hard defect).
    const coordConj =
        /\b(?:and|but|or)\b/i.test(text) &&
        !/(?:^|[^\u10A0-\u10FF])(?:და|მაგრამ|ან)(?![\u10A0-\u10FF])/.test(text);
    if (coordConj) {
        issues.push({ rule: 'coordinating_conjunction_untranslated', message: 'English coordinating conjunction untranslated: and→და · but→მაგრამ · or→ან (ან...ან = either...or). PUNCTUATION: NO comma before და joining clauses (დედა სადილს ამზადებს და ნინო თამაშობს — drop the English comma habit); comma BEFORE მაგრამ. Georgian also marks addition with the enclitic -ც (ნინოც "Nino too") and the focus particle კი — prefer plain და unless the item is an afterthought. Compound frames: not only...but also→არა მხოლოდ...არამედ · either...or→ან...ან · neither/nor→არც · although→თუმცა (comma before) · whereas/and-contrast→ხოლო.' });
    }

    // 3.115 Politeness formula untranslated (KA-116): dialogue
    //      interjections (yes/no/please/thanks/sorry/excuse me/hello/
    //      goodbye) left in Latin with NO Georgian politeness formula
    //      anywhere. Same isolated-carrier check as 3.114 (string edge
    //      or non-Georgian char on both sides — verbs like მადლობა inside
    //      inflected forms don't exist, but კი/არა appear INSIDE words
    //      everywhere: კითხულობს, არასდროს — a bare substring match would
    //      false-silence every draft). LOOSE: ANY one carrier silences.
    const politeness =
        /\b(?:yes|no|please|thanks?|sorry|excuse me|hello|hi|goodbye|bye)\b/i.test(text) &&
        !/(?:^|[^\u10A0-\u10FF])(?:კი|დიახ|არა|მადლობა|გმადლობთ|გთხოვ|ბოდიში|უკაცრავად|გამარჯობა|ნახვამდის)(?![\u10A0-\u10FF])/.test(text);
    if (politeness) {
        issues.push({ rule: 'politeness_formula_untranslated', message: 'Politeness formula untranslated in dialogue: yes→კი (დიახ formal, ხო/ჰო informal) · no→არა · please→გთხოვთ (თუ შეიძლებا "if possible") · thank you→მადლობა (გმადლობთ formal; დიდი მადლობა = very much) · you\'re welcome→არაფრის · sorry→ბოდიში · excuse me→უკაცრავად (introductory; ბოდიში for the actual apology) · hello/hi→გამარჯობა (გამარჯობათ formal) · goodbye/bye→ნახვამდის · good morning→დილა მშვიდობისა · good evening→საღამო მშვიდობისა · good night→ღამე მშვიდობისა. Translate the FORMULA, not word-by-word; refusal formula "no, thank you" → არა, მადლობა.' });
    }

    // 3.116 Untranslated calendar time (v1.35.0, KA-117). Two trigger arms:
    //      (a) bare weekday/month/season/weekend tokens (may/march excluded
    //      — polysemous with the modal and the verb); (b) determiner-period
    //      frames (this/next/last/every + week/month/year/weekend), which
    //      fix 4.102 consumes whole. LOOSE: ANY one calendar carrier
    //      silences — dative weekdays, -ში month forms, class-varying
    //      season forms, შაბათ-კვირას, მეორე დღეს/დილას, ყოველ + period,
    //      [year] წელს, determiner-period outputs, -იდან/-მდე pair.
    const calendarTime =
        (/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december|spring|summer|autumn|winter|weekend)\b/i.test(text) ||
         /\b(?:this|next|last|every)\s+(?:week|month|year|weekend)\b/i.test(text)) &&
        !/(?<![\u10A0-\u10FF])(?:ორშაბათს|სამშაბათს|ოთხშაბათს|ხუთშაბათს|პარასკევს|შაბათს|კვირას|იანვარში|თებერვალში|მარტში|აპრილში|მაისში|ივნისში|ივლისში|აგვისტოში|სექტემბერში|ოქტომბერში|ნოემბერში|დეკემბერში|გაზაფხულზე|ზაფხულში|შემოდგომაზე|ზამთარში|შაბათ-კვირას|მეორე დღეს|მეორე დილას|ორშაბათიდან|პარასკევამდე|ყოველ კვირას|ყოველ თვეს|ყოველ წელს|[12][0-9]{3} წელს|ამ კვირას|ამ თვეში|ამ წელს|მომავალ კვირას|მომავალ თვეს|მომავალ წელს|გასულ კვირას|გასულ თვეში|გასულ წელს)(?![\u10A0-\u10FF])/.test(text);
    if (calendarTime) {
        issues.push({ rule: 'calendar_time_untranslated', message: 'Calendar time untranslated: on Monday→ორშაბათს (weekdays take dative -ს after "on": ორშაბათს სამშაბათს ოთხშაბათს ხუთშაბათს პარასკევს შაბათს კვირას) · in January→იანვარში (months take -ში with s/r doubling: იანვარში თებერვალში მარტში აპრილში მაისში ივნისში ივლისში აგვისტოში სექტემბერში ოქტომბერში ნოემბერში დეკემბერში) · seasons are CLASS-VARYING: in spring→გაზაფხულზე · in summer→ზაფხულში · in autumn→შემოდგომაზე · in winter→ზამთარში · this/next/last week→ამ/მომავალ/გასულ კვირას · this/next/last month→ამ/მომავალ/გასულ თვეში · this/next/last year→ამ/მომავალ/გასულ წელს (month takes -ში, week/year take dative -ს) · every week/month/year→ყოველ კვირას/თვეს/წელს (ყოველ + OBLIQUE stem, never ყოველი) · in 1991→1991 წელს · at/on the weekend→შაბათ-კვირას · the next day→მეორე დღეს · next morning→მეორე დილას · from Monday to Friday→ორშაბათიდან პარასკევამდე. NEVER map a BARE weekday/month/season — კვირა means both week and Sunday, მაისი is May and rowan; only preposition/determiner frames consume the noun.' });
    }

    // 3.117 Untranslated narrative time (v1.36.0, KA-118). Five trigger arms:
    //      (a) the ago-construction ([qty] + daypart/period + ago);
    //      (b) one/all/every + daypart openers and completions;
    //      (c) whole-phrase idioms (once upon a time, from that day on,
    //      in the morning/afternoon/evening, at night, at noon);
    //      (d) once/twice/N-times-a-period frequency adverbials;
    //      (e) ago-idioms without a measure noun (long ago, a long
    //      time ago, not long ago, a short time ago). LOOSE:
    //      ANY one narrative-time carrier silences — წლის/დღის/კვირის/
    //      თვის წინ, დიდი/ცოტა ხნის წინ, იყო და არა იყო რა, იმ დღიდან,
    //      ერთ დღეს, მთელი დღე, დილას, საღამოს, ღამით, ნაშუადღევს,
    //      შუადღისას, ყოველ საღამოს, კვირაში ერთხელ. (4.92's ყოველ
    //      დღე/დილას carriers included.)
    const narrativeTime =
        (/\b(?:a|an|\d+|one|two|three|four|five|six|seven|eight|nine|ten|many|few|several)\s+(?:day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|moment|moments)\s+ago\b/i.test(text) ||
         /\b(?:one|all|every)\s+(?:day|night|morning|evening|week|month|year)\b/i.test(text) ||
         /\b(?:once upon a time|from that (?:day|time) on|ever since|in the (?:morning|afternoon|evening)|at night|at noon)\b/i.test(text) ||
         /\b(?:once|twice)\s+an?\s+(?:day|week|month|year)\b|\b\d+\s+times\s+an?\s+(?:day|week|month|year)\b/i.test(text) ||
         /\b(?:long ago|a long time ago|a long while ago|not long ago|a short time ago|a little while ago)\b/i.test(text)) &&
        !/(?<![\u10A0-\u10FF])(?:წლის წინ|დღის წინ|კვირის წინ|თვის წინ|ხნის წინ|იყო და არა იყო რა|იმ დღიდან|იმ დროიდან|მას შემდეგ|ერთ დღეს|ერთ დილას|ერთ საღამოს|ერთ ღამეს|მთელი დღე|მთელი ღამე|მთელი დილა|მთელი საღამო|მთელი კვირა|მთელი თვე|მთელი წელი|დილას|საღამოს|ღამით|ნაშუადღევს|შუადღისას|ყოველ საღამოს|ყოველ ღამე|ყოველ დღე|ყოველ დილას|დღეში ერთხელ|კვირაში ერთხელ|თვეში ერთხელ|წელიწადში ერთხელ|კვირაში ორჯერ|დღეში სამჯერ)(?![\u10A0-\u10FF])/.test(text);
    if (narrativeTime) {
        issues.push({ rule: 'narrative_time_untranslated', message: 'Narrative time untranslated: three years ago→სამი წლის წინ (ago = GENITIVE + წინ postposition; month irregular თვის წინ; discrete genitive — never *სამი წლების წინ) · a long time ago→დიდი ხნის წინ · not long ago→არც ისე დიდი ხნის წინ · a short time ago→ცოტა ხნის წინ · once upon a time→იყო და არა იყო რა (folklore opener, lit. "there was and there was not"; NEVER calque) · from that day on→იმ დღიდან · one day→ერთ დღეს · one morning→ერთ დილას · one evening→ერთ საღამოს · one night→ერთ ღამეს (narrative indefinite dative) · in the morning→დილას · in the afternoon→ნაშუადღევს · in the evening→საღამოს · at noon→შუადღისას · at night→ღამით · all day→მთელი დღე · all night→მთელი ღამე · all year→მთელი წელი · every evening→ყოველ საღამოს · every night→ყოველ ღამე · once a week→კვირაში ერთხელ · twice a week→კვირაში ორჯერ (-ში per-interval + -ჯერ multiplier). NEVER map bare one/all/recently/once — one=pronoun/numeral, all=ყველა, recently is tense-dependent, bare once is the conjunction "as soon as"→როგორც კი.' });
    }

    // 3.118 Untranslated repetition/continuation adverbs (v1.37.0, KA-119).
    //      Trigger arms:
    //      (a) again + again-idioms (again and again, once again, over
    //      again, time and again, time after time, one more time —
    //      the last is mechanically consumed at 4.61a-bis);
    //      (b) already; (c) anymore / no longer; (d) not yet / bare yet
    //      (bare still likewise — both are QA-FLAGGED, AI-decided: still
    //      is polysemous adj/noun/degree vs continuation adverb; yet is
    //      polysemous conjunction vs negation frame; KB KA-119 carries the
    //      guidance); (e) never again. LOOSE silencing: ANY repetition
    //      carrier present — ისევ, კვლავ, უკვე, ჯერ არ, ჯერ კიდევ,
    //      კიდევ ერთხელ, არაერთხელ, აღარ, აღარასოდეს (Georgian
    //      lookarounds on every carrier so longer ისევე forms do not
    //      false-satisfy). უკვე alone silences the already AND still/yet
    //      arms (attested overlap: still/yet ≈ ჯერ კიდევ family).
    const repAgain = /\b(?:again|again and again|once again|over again|time and again|time after time|one more time)\b/i.test(text);
    const repAlready = /\balready\b/i.test(text);
    const repAnymore = /\b(?:anymore|no longer|not any longer)\b/i.test(text);
    const repNotYet = /\b(?:not yet|yet)\b/i.test(text);
    const repStill = /\bstill\b/i.test(text);
    const repNeverAgain = /\bnever again\b/i.test(text);
    const repCarrier = /(?<![\u10A0-\u10FF])(?:ისევ|კვლავ|უკვე|ჯერ არ|ჯერ კიდევ|ჯერაც|კიდევ ერთხელ|არაერთხელ|აღარ|აღარასოდეს|არასოდეს)(?![\u10A0-\u10FF])/.test(text);
    if ((repAgain || repAlready || repAnymore || repNotYet || repStill || repNeverAgain) && !repCarrier) {
        issues.push({ rule: 'repetition_cont_untranslated', message: 'Repetition/continuation adverb untranslated: again→ისევ · again and again→ისევ და ისევ · once again / over again / one more time→კიდევ ერთხელ · time and again / time after time→არაერთხელ · already→უკვე · anymore / no longer→აღარ · not yet→ჯერ არ · never again→აღარასოდეს (აღარასოდეს is stronger than არასოდეს — implies past occurrence) · still→ჯერ კიდევ ONLY in the continuation sense ("I am still here"→მე ჯერ კიდევ აქ ვარ) — "still water" is მდგრადი/უძრავი (adj), "still taller" is კიდევ უფრო (degree): AI decides · bare yet: negation frame renders ჯერ არ ("hasn\'t come yet"→ჯერ არ მოსულა), conjunction yet = მაგრამ/მაინც: AI decides · ხელახლა is redo-only, never plain again. Carrier არასოდეს present = never-family already rendered.' });
    }

    // 3.119 Untranslated reciprocals & otherness (v1.38.0, KA-120).
    //      Trigger arms:
    //      (a) each other / one another (reciprocal pronoun — carrier
    //      ერთმანეთი; case is verb-governed: ერთმანეთს/ერთმანეთის/
    //      ერთმანეთთან/ერთმანეთისთვის);
    //      (b) other / others (adjective/pronoun polysemy — frame-
    //      guarded mechanically, rest flagged);
    //      (c) another (two senses: სხვა different-one vs კიდევ ერთი
    //      one-more — AI decides bare);
    //      (d) else (someone else / anything else / nothing else /
    //      who-what-where else; bare else is a postmodifier, "or
    //      else" belongs to the otherwise-family).
    //      LOOSE silencing: ANY otherness/reciprocal carrier present —
    //      ერთმანეთ, სხვ, დანარჩენ (stem-PREFIX match: leading
    //      Georgian lookbehind only, NO trailing lookahead — the
    //      carriers inflect, so ერთმანეთი/ერთმანეთს/ერთმანეთთან and
    //      სხვა/სხვები/სხვისი must all silence; every სხვ-/ერთმანეთ-/
    //      დანარჩენ-initial word IS an otherness carrier).
    const recEachOther = /\b(?:each other|one another)\b/i.test(text);
    const recOther = /\bothers?\b/i.test(text);
    const recAnother = /\banother\b/i.test(text);
    const recElse = /\belse\b/i.test(text);
    const recCarrier = /(?<![\u10A0-\u10FF])(?:ერთმანეთ|სხვ|დანარჩენ)/.test(text);
    if ((recEachOther || recOther || recAnother || recElse) && !recCarrier) {
        issues.push({ rule: 'reciprocal_otherness_untranslated', message: 'Reciprocal/otherness pronoun untranslated: each other / one another→ერთმანეთი (case is VERB-GOVERNED: NOM ერთმანეთი "ძალიან უყვარდათ ერთმანეთი" · DAT ერთმანეთს "ერთმანეთს შეხვდნენ" · GEN ერთმანეთის (possessive) · COM ერთმანეთთან "კავშირი ერთმანეთთან" · ერთმანეთისთვის "for each other"; synonym ერთიმეორე) · other→სხვა · the others→სხვები / დანარჩენები · another→სხვა (different-one: "bring me another→სხვა მომიტანეთ") vs კიდევ ერთი (one-more): AI decides · someone/somebody else→ვინმე სხვა ("it must have been someone else ალბათ ვინმე სხვა იყო") · someone else\'s→სხვისი (dedicated possessive lexeme) · nothing else→სხვა არაფერი · anything else→სხვა რამე · who/what else→ვინ/რა სხვა (AI placement) · bare else NEVER maps alone (postmodifier; "or else"→თორემ, otherwise-family). Carrier სხვა stem present = otherness already rendered.' });
    }

    // 3.120 Untranslated indefinite pronouns (v1.39.0, KA-121).
    //      Trigger arms: the -thing / -body / -where triads, any-series
    //      (dictionary.ge anybody: "კითხვით და პირობით წინადადებებში
    //      ვინმე" — questions/conditionals only; free-choice →
    //      ნებისმიერი, AI decides), none-of partitives (dictionary.ge
    //      none¹: "არც ერთ მათგანს არ ვიცნობთ").
    //      LOOSE silencing: ANY indefinite carrier present — stem-prefix
    //      match (leading lookbehind only, NO trailing lookahead — the
    //      carriers inflect/syncopate: არაფრის from არაფერი, ვიღაცამ
    //      from ვიღაც; every რაღაც-/ვინმე-/სადმე-/არაფრ-/არავინ-/
    //      არსად-/ყველაფრ-/ყველგან-initial word IS a carrier).
    //      Bare ყველა is deliberately NOT a silencer: it is shared with
    //      the universal-quantifier family (all) and ყველაზე superlatives,
    //      so its presence must not mask a genuinely untranslated
    //      -body/-thing word in the same segment. ყველაფრ- (stem of
    //      ყველაფერი, which syncopates in obliques) and exact ყველგან
    //      are unambiguous carriers and DO silence.
    const indThing = /\b(?:something|nothing|everything|anything)\b/i.test(text);
    const indBody = /\b(?:somebody|someone|nobody|no one|everybody|everyone|anybody|anyone)\b/i.test(text);
    const indWhere = /\b(?:somewhere|nowhere|everywhere|anywhere)\b/i.test(text);
    const indNone = /\bnone\b/i.test(text);
    const indCarrier = /(?<![\u10A0-\u10FF])(?:რაღაც|რამე|ვინმე|ვიღაც|სადმე|არსად|ვერსად|არაფრ|არავინ|ყველაფრ|ყველგან)/.test(text);
    if ((indThing || indBody || indWhere || indNone) && !indCarrier) {
        issues.push({ rule: 'indefinite_pronoun_untranslated', message: 'Indefinite pronoun untranslated: something→რაღაც ("რაღაც მოხდა") · somebody/someone→ვინმე (specific-unknown ვიღაც, pl. ვიღაცები — AI decides) · somewhere→სადმე (syncopated სამ/სამე) · everything→ყველაფერი (syn. ყოველივე) · everybody/everyone→ყველა · everywhere→ყველგან · nothing→არაფერი (NEGATIVE CONCORD: არაფერი არ ვთქვი; obliques syncopate: GEN არაფრის, INS არაფრით, ADV არაფრად) · nobody/no one→არავინ (არავინ არ მოვიდა — the ა is obligatory) · nowhere→არსად (არსად ... არ) · anything/anybody/anyone/anywhere→რამე/ვინმე/სადმე ONLY in questions & conditionals ("is there anybody here? აქ არის ვინმე?") — affirmative free-choice → ნებისმიერი (AI decides) · none of them/us/you→არც ერთ მათგანს/ჩვენგანს/თქვენგანს + verb-ა ("none of them is known to us არც ერთ მათგანს არ ვიცნობთ") · none of + plural noun→-თაგან/-დან + არავინ ("განმცხადებელთაგან არავინ იყო გერმანელი") · someone\'s→ვინმეს · nobody\'s→არავის · bare none→არც ერთი (AI). Carrier stems რაღაც/ვინმე/არაფრ/არავინ present = indefinite already rendered.' });
    }

    // 3.121 Untranslated quantifiers (v1.40.0, KA-122).
    //      Trigger arms: amount quantifiers much/many, several/a few/
    //      few, little, plenty, a lot (of)/lots (of), most (of),
    //      whole, half, both, majority.
    //      EXCLUSIONS (double-flag avoidance — these arms are owned by
    //      other rules or deterministically fixed): very much (4.69
    //      → ძალიან), how much/many (bare-wh family, რამდენი),
    //      thank you/thanks + much/a lot (4.94 → დიდი მადლობა),
    //      [qty] [period] ago frames (narrative-time rule + 4.103
    //      ago-construction: many/several/few years ago →
    //      მრავალი/რამდენიმე წლის წინ), the most [adj] (comparison
    //      rules 3.49/3.44 — ყველაზე superlative family), both...and
    //      (correlative rule → როგორც..., ისე...).
    //      LOOSE silencing: any quantifier carrier present — leading
    //      lookbehind only, NO trailing lookahead (carriers inflect/
    //      syncopate: ნახევრის from ნახევარი, უმეტესმა from უმეტესი,
    //      რამდენიმის from რამდენიმე, უმეტესობის from უმეტესობა).
    //      მთლ- alternate covers მთლიანი/მთლიანად; რამდენიმ- (with
    //      იმ) deliberately does NOT match plain რამდენი (the
    //      interrogative "how many" is not a quantifier carrier).
    //      ძალიან is NOT a silencer (it is "very", not an amount);
    //      BUT a much/most preceded by the ძალიან-residue is the
    //      4.69 "very much" output (ძალიან much → ძალიან) — exclude.
    //      ყველაზე is NOT a silencer (superlative, not a quantifier).
    //      both-arm exclusion ALSO recognizes the 4.100 and→და
    //      residue between both and and/და (standalone-და lookarounds
    //      — \b never matches Georgian chars).
    const qtMuch = /\bmuch\b/i.test(text)
        && !/\b(?:very|how)\s+much\b/i.test(text)
        && !/(?:\bvery\b|(?<![\u10A0-\u10FF])ძალიან(?![\u10A0-\u10FF]))\s+much\b/i.test(text)
        && !/\bthank(?:s| you)\b/i.test(text);
    const qtMany = /\bmany\b/i.test(text)
        && !/\bhow\s+many\b/i.test(text)
        && !/\bmany\s+[a-z]{3,9}\s+ago\b/i.test(text);
    const qtSeveral = /\bseveral\b/i.test(text)
        && !/\bseveral\s+[a-z]{3,9}\s+ago\b/i.test(text);
    const qtFew = /\bfew\b/i.test(text)
        && !/\bfew\s+[a-z]{3,9}\s+ago\b/i.test(text);
    const qtLittle = /\blittle\b/i.test(text)
        && !/\blittle\s+[a-z]{3,9}\s+ago\b/i.test(text);
    const qtPlenty = /\bplenty\b/i.test(text);
    const qtLot = /\b(?:a\s+lot|lots)\b/i.test(text)
        && !/\bthank(?:s| you)\b/i.test(text);
    const qtMost = /\bmost\b/i.test(text)
        && !/\b(?:the|at)\s+most\b/i.test(text);
    const qtWhole = /\bwhole\b/i.test(text);
    const qtHalf = /\bhalf\b/i.test(text);
    const qtBoth = /\bboth\b/i.test(text)
        && !/\bboth\b[^.!?]{0,60}?(?:\band\b|(?<![\u10A0-\u10FF])და(?![\u10A0-\u10FF]))/i.test(text);
    const qtMajority = /\bmajority\b/i.test(text);
    const qtCarrier = /(?<![\u10A0-\u10FF])(?:ბევრ|მრავალ|რამდენიმ|ცოტ|მთელ|მთლ|ნახევარ|ნახევრ|ორივე|უმეტეს|უამრავ)/.test(text);
    if ((qtMuch || qtMany || qtSeveral || qtFew || qtLittle || qtPlenty
        || qtLot || qtMost || qtWhole || qtHalf || qtBoth || qtMajority)
        && !qtCarrier) {
        issues.push({ rule: 'quantifier_untranslated', message: 'Quantifier untranslated: much (uncountable)→ბევრი · many→ბევრი (everyday) or მრავალი (formal/literary) · plenty of / a lot of / lots of→ბევრი (emphatic უამრავი) · so much→იმდენი (so much...that → იმდენი...რომ; AI) · several / a few→რამდენიმე · few (negative "hardly any")→ცოტა · little (amount)→ცოტა vs პატარა (SIZE: little girl — AI decides) · most (of the)→უმეტესი — NOT ყველაზე (that is the superlative: the most beautiful→ყველაზე ლამაზი) · majority→უმეტესობა · whole→მთელი (the whole day→მთელი დღე) · half→ნახევარი (half an hour→ნახევარი საათი; half past two→ორის ნახევარი — genitive; two and a half→ორნახევარი; obliques syncopate: ნახევრის/ნახევრით/ნახევრად) · both→ორივე (both hands→ორივე ხელი; on both sides→ორივე მხარეს; both...and→როგორც..., ისე...) · SINGULAR AGREEMENT (dictionary.ge norm): ბევრი/ცოტა/რამდენიმე/ორივე take a SINGULAR noun — რამდენიმე წიგნი, NOT *რამდენიმე წიგნები · bare a lot (adverb: I like it a lot) and bare much (I don\'t much care)→AI decides · ზღვა "sea" is attested as a determiner "many" but stays KB-only — never mechanically mapped. Carrier stems ბევრ-/მრავალ-/რამდენიმ-/ცოტ-/მთელ-/მთლ-/ნახევრ-/ორივე/უმეტეს-/უამრავ- present = quantifier already rendered.' });
    }

    // 3.122 Untranslated personal pronouns (v1.41.0, KA-123). Bare EN
    //      subject/object pronouns surviving into the draft. 1st/2nd
    //      person carriers are case-invariant (მე/შენ/ჩვენ/თქვენ);
    //      3rd person suppletive (ის/მან/მას/მის/მათ). Georgian has no
    //      gender — he/she/it all → ის. PRO-DROP: the verb already
    //      encodes the person, so the mapped pronoun is often deleted
    //      (3.19 over-explicit მე ვ... flags the redundant form).
    //      EXCLUSIONS: contractions are token-internal and skipped by
    //      the guards below; "it is/it's" frames belong to 3.33 (is-
    //      calque) and 3.94 (cleft) — never double-flag them here;
    //      bare "it" as weather/dummy subject is KB-only (წვიმს,
    //      ცივა) and stays AI-pass.
    const pronCore = /\b(?:i|me|we|us|he|she|him|them|they)\b/i.test(text);
    const pronYou = /\byou\b/i.test(text);
    const pronIt = /\bit\b/i.test(text)
        && !/\bit(?:'s|\s+is)\b/i.test(text);
    const pronCarrier = /(?<![\u10A0-\u10FF])(?:მე|შენ|ჩვენ|თქვენ|ის|მას|მათ|ისინი)(?![\u10A0-\u10FF])/.test(text);
    if ((pronCore || pronYou || pronIt) && !pronCarrier) {
        issues.push({ rule: 'personal_pronoun_untranslated', message: 'Personal pronoun untranslated: I/me→მე · we/us→ჩვენ · he/she→ის (NO gender in Georgian) · him→მას · them→მათ · they→ისინი (animate; generic-they→ის) · you→შენ (informal) or თქვენ (formal/plural — AI decides) · it→ის only as anaphora; as weather/dummy subject it DROPS (წვიმს, ცივა). PRO-DROP: the verb already carries the person — prefer dropping the pronoun entirely (დავინახე, not მე დავინახა). 3rd person declines by case: NOM ის → ERG მან → DAT მას → GEN მის. A mapped carrier (მე/შენ/ჩვენ/თქვენ/ის/მას/მათ) present = already rendered.' });
    }

    // 3.123 Untranslated modals & copula (v1.42.0, KA-124). Bare EN
    //      modal or copula tokens surviving into the draft. Georgian
    //      has NO auxiliaries: ability → შე-ძლია impersonal family
    //      (subject+modal consumed TOGETHER, person lives in the
    //      prefix); obligation → უნდა + optative (INVARIABLE — never
    //      *უნდება); permission → შეიძლება; copula → ვარ/ხარ/არის/
    //      ვართ/ხართ/არიან (past ვიყავი...იყვნენ); do-support drops;
    //      perfect have rebuilds as the perfect screeve (AI-pass).
    //      you-copula frames are T–V gated (ხარ vs ხართ) and
    //      you-modals likewise (შეგიძლია vs შეგიძლიათ). Bare will/
    //      would/have before a LEXICAL verb (future/conditional/
    //      perfect screeves) is the AI pass's rebuild — flagged but
    //      never mechanically mapped. A mapped carrier (შეძლია-
    //      stems, უნდა, შეიძლება, ვარ/ხარ/არის/ვართ/არიან, იყო/
    //      იყვნენ, იქნება family, აპირებს, KA-125 future screeve
    //      forms ვნახავ…მოვლენ) present = already rendered. Carrier
    //      list uses COMPLETE surface forms (v1.43.0 fix): stem
    //      prefixes (ვიქნებ, ნახავ, დავწერ, დაეხმარებ…) never
    //      matched their inflected outputs — the Georgian
    //      lookbehind/lookahead reject a match inside a longer word.
    const mdCore = /\b(?:can|could|must|should|may|might)\b/i.test(text);
    const mdObl = /\b(?:have|has|had)\s+to\b/i.test(text);
    const mdBe = /\b(?:will\s+be|am|is|are|was|were)\b/i.test(text)
        && !/\bthere\s+(?:is|are|was|were)\b/i.test(text);
    const mdAux = /\b(?:will|would|do|does|did)\b/i.test(text);
    const mdCarrier = /(?<![\u10A0-\u10FF])(?:შემიძლია|შეგიძლია|შეუძლია|შემეძლო|შეეძლო|შეგვეძლო|უნდა|შეიძლება|ვარ|ხარ|არის|ვართ|ხართ|არიან|ვიყავი|იყავი|იყო|იყვნენ|ვიყავით|იყავით|ვიქნები|იქნები|იქნება|ვიქნებით|იქნებით|იქნებიან|აპირებს|აპირებ|მინდა|ვნახავ|ვნახავთ|ნახავს|ნახავენ|დავწერ|დავწერთ|დაწერს|დაწერენ|დავრეკავ|დავრეკავთ|დარეკავს|დარეკავენ|დავეხმარები|დავეხმარებით|დაეხმარება|დაეხმარებიან|წავალ|წავალთ|წავა|წავლენ|მოვალ|მოვალთ|მოვა|მოვლენ)(?![\u10A0-\u10FF])/.test(text);
    if ((mdCore || mdObl || mdBe || mdAux) && !mdCarrier) {
        issues.push({ rule: 'modal_aux_untranslated', message: 'Modal/auxiliary untranslated: Georgian has NO auxiliaries — tense/mood lives on the verb. I can→შემიძლია · he/she can→შეუძლია · we can→შეგვიძლია · they can→შეუძლიათ (impersonal dative-experiencer: person in the prefix, NEVER bare can + verb) · could→შემეძლო series · must/should/have to→უნდა + OPTATIVE (უნდა დავწერო; უნდა is invariable — never *უნდება) · must not/shouldn\'t→არ უნდა · may/might→შეიძლება · will be→იქნება/ვიქნები/იქნებიან · I am→მე ვარ · we are→ჩვენ ვართ · he/she is→ის არის · they are→ისინი არიან · I was→მე ვიყავი · was→იყო · were→იყვნენ (negation precedes: არ ვარ, არ იყო; არ before consonants, არა before vowels) · do/does/did DROP (Georgian has no do-support) · will+VERB/would/have+V-ed → future/conditional/perfect screeve built on the verb itself (დავწერ, ვნახავდი, დაწერილია) — AI-pass rebuilds. you-forms are T–V gated (ხარ vs ხართ; შეგიძლია vs შეგიძლიათ). A mapped carrier (შე...ძლია / უნდა / შეიძლება / ვარ / არის / იყო / იქნებ / აპირებ) present = already rendered.' });
    }

    // 3.124 Future screeve residue (v1.43.0, KA-125). English FUTURE frames
    //      that fix 4.110 deliberately does NOT map: 2nd person (T–V
    //      gated წახვალ vs წახვალთ), it-subjects (AI-gated), subjectless
    //      "will V" (no person → no safe form), 'll-contractions (4.108
    //      placeholder-protected) and negated futures (არ + screeve is an
    //      AI rebuild alongside 4.93's არ swap). The dictionary verbs'
    //      attested future paradigms travel in the message so the AI pass
    //      (and human reviewers) see the exact targets.
    const futYou = /\bwill\s+you\b|\byou\s+will\b/i.test(text);
    const futIt = /\bit\s+will\b|\bwill\s+it\b/i.test(text);
    const futBare = /\bwill\s+(?:see|write|call|help|go|come|make|take|give|know|think|say|tell|read|eat|drink|sleep|open|close|find|buy|do|watch|listen|work|play|speak|talk|walk|run|start|finish|meet|wait|send|bring|show|ask|answer|learn|teach|live|stay|visit|return|move|change|try|use|need|want|love|like|hear|feel|remember|forget|decide|hope|plan|drive|cook|clean|wash|wear|sing|dance|laugh|smile|cry|win|lose|pay|cost|sell|build|break|cut|hold|carry|throw|catch|choose|grow|study)\b/i.test(text);
    const futCon = /\b(?:I|you|we|they|he|she|it)'ll\b/i.test(text);
    const futNeg = /\b(?:won'?t|will\s+not)\s+[a-z]+/i.test(text);
    //      Carrier uses COMPLETE surface forms (v1.43.0): stem prefixes
    //      (ნახავ, დავწერ, დარეკავ, დაეხმარებ) never matched their
    //      inflected outputs — ნახავ is fenced inside ვნახავ by the
    //      lookbehind, დავწერ inside დავწერთ by the lookahead.
    const futCarrier = /(?<![\u10A0-\u10FF])(?:ვნახავ|ვნახავთ|ნახავს|ნახავენ|დავწერ|დავწერთ|დაწერს|დაწერენ|დავრეკავ|დავრეკავთ|დარეკავს|დარეკავენ|დავეხმარები|დავეხმარებით|დაეხმარება|დაეხმარებიან|წავალ|წავალთ|წავა|წავლენ|მოვალ|მოვალთ|მოვა|მოვლენ)(?![\u10A0-\u10FF])/.test(text);
    if ((futYou || futIt || futBare || futCon || futNeg) && !futCarrier) {
        issues.push({ rule: 'future_screeve_untranslated', message: 'Future screeve untranslated (KA-125): Georgian future (მყოფადი) = PREVERB + PRESENT stem, verb-specific — a dictionary form. Attested: see→ვნახავ (I/we ვნახავ/ვნახავთ, he/she ნახავს, they ნახავენ) · write→დავწერ (დავწერ/დავწერთ/დაწერს/დაწერენ) · call→დავრეკავ (დავრეკავ/დავრეკავთ/დარეკავს/დარეკავენ) · help→დავეხმარები (დავეხმარები/დავეხმარებით/დაეხმარება/დაეხმარებიან) · go→წავალ (წავალ/წავალთ/წავა/წავლენ) · come→მოვალ (მოვალ/მოვალთ/მოვა/მოვლენ). 2nd person is T–V gated (წახვალ vs წახვალთ; AI decides შენ/თქვენ register). NEGATED future: არ + future screeve (არ ვნახავ, არ წავა) — never არ will. Contractions: I\'ll/we\'ll = I will/we will (same screeve); he\'ll/she\'ll → ნახავს-class 3sg. it-subjects: AI-gated (anaphora vs dummy). Subjectless "will V": person unknown — AI infers from context.' });
    }

    // 3.125 Present screeve residue (v1.44.0, KA-126). English PRESENT
    //      frames that fix 4.111 deliberately does NOT map: 2nd person
    //      (T–V gated იცი vs იცით), it-subjects (AI-gated), bare
    //      subjectless 3sg forms (knows/sees/… — no visible person),
    //      do/does-support questions, and negated presents ("don't/
    //      doesn't know" — 4.93 owns the არ swap; არ + present screeve
    //      is an AI rebuild). The dictionary verbs' attested present
    //      paradigms travel in the message so the AI pass (and human
    //      reviewers) see the exact targets.
    const prSjv = /\b(?:i|we|they)\s+(?:know|see|eat|drink|read|write|say|think|make)\b/i.test(text);
    const prHsv = /\b(?:he|she)\s+(?:knows|sees|eats|drinks|reads|writes|says|thinks|makes)\b/i.test(text);
    const prYou = /\byou\s+(?:know|see|eat|drink|read|write|say|think|make)\b/i.test(text);
    const prIt = /\bit\s+(?:knows|sees|eats|drinks|reads|writes|says|thinks|makes)\b/i.test(text);
    const prBare = /\b(?:knows|sees|eats|drinks|reads|writes|says|thinks|makes)\b/i.test(text);
    //      Carrier uses COMPLETE surface forms (v1.43.0 doctrine — stem
    //      prefixes like იც/ხედავ never match their inflected outputs:
    //      იცი is fenced inside იცნობს by the lookahead, ხედავ inside
    //      ვხედავ by the lookbehind). All 40 forms of fix 4.111 listed.
    const prCarrier = /(?<![\u10A0-\u10FF])(?:ვიცნობ|ვიცნობთ|იცნობს|იცნობენ|ვიცი|ვიცით|იცის|იციან|ვხედავ|ვხედავთ|ხედავს|ხედავენ|ვჭამ|ვჭამთ|ჭამს|ჭამენ|ვსვამ|ვსვამთ|სვამს|სვამენ|ვკითხულობ|ვკითხულობთ|კითხულობს|კითხულობენ|ვწერ|ვწერთ|წერს|წერენ|ვამბობ|ვამბობთ|ამბობს|ამბობენ|ვფიქრობ|ვფიქრობთ|ფიქრობს|ფიქრობენ|ვაკეთებ|ვაკეთებთ|აკეთებს|აკეთებენ)(?![\u10A0-\u10FF])/.test(text);
    if ((prSjv || prHsv || prYou || prIt || prBare) && !prCarrier) {
        issues.push({ rule: 'present_verb_untranslated', message: 'Present screeve untranslated (KA-126): Georgian present (აწმყო) = v-class person markers on a verb-specific stem — a dictionary form. Attested: know(fact)→ვიცი (I ვიცი, we ვიცით, he/she იცის, they იციან) · know(person)→ვიცნობ (ვიცნობ მას I know him; იცნობს/იცნობენ) · see→ვხედავ (ვხედავ/ვხედავთ/ხედავს/ხედავენ) · eat→ვჭამ (ვჭამ/ვჭამთ/ჭამს/ჭამენ) · drink→ვსვამ (ვსვამ/ვსვამთ/სვამს/სვამენ) · read→ვკითხულობ (ვკითხულობ/ვკითხულობთ/კითხულობს/კითხულობენ) · write→ვწერ (ვწერ/ვწერთ/წერს/წერენ) · say→ვამბობ (ვამბობ/ვამბობთ/ამბობს/ამბობენ; "tell someone" takes the ეუბნებ- series — AI decides) · think→ვფიქრობ (ვფიქრობ/ვფიქრობთ/ფიქრობს/ფიქრობენ) · make/do→ვაკეთებ (ვაკეთებ/ვაკეთებთ/აკეთებს/აკეთებენ). 2nd person is T–V gated (იცი vs იცით; AI decides შენ/თქვენ register). it-subjects: AI-gated. do/does-support DROPS — the question is formed by intonation (იცი? do you know). NEGATED present: არ directly before the verb (არ ვიცი, არ ხედავს) — never არ know. Sleeping is an INVERSION verb (მას სძინავს — dative subject, AI rebuild).' });
    }

    // 3.126 Locative postposition residue (v1.45.0, KA-127). Detect the
    //      high-frequency COPULA+LOCATIVE frames that fix 4.112 maps
    //      deterministically (next to / on / in / under / behind / in front
    //      of / between / near / above / outside / inside / far from).
    const locFrame =
        /\b(?:is|are|was|were)\s+(?:next\s+to|beside|on|in|under|behind|in\s+front\s+of|between|near|above|outside|inside|far\s+from)\b/i.test(text) ||
        /^\s*(?:next\s+to|near|far\s+from)\b/i.test(text) ||
        // Mixed-residue branch: Georgian word directly followed by an
        // untranslated English locative (e.g. 'the pen არის next to the
        // phone') — frame reached neither the English-copula branch nor
        // the string-start branch, but the locative is still stranded.
        /[\u10A0-\u10FF]\s+(?:next\s+to|beside|on|in|under|behind|in\s+front\s+of|between|near|above|outside|inside|far\s+from)\b/i.test(text);
    const locCarrier =
        /-(?:ზე|ში|თან|დან)(?![\u10A0-\u10FF])|(?<![\u10A0-\u10FF])(?:გვერდით|ქვეშ|უკან|წინ|შორის|ახლოს|ზემოთ|გარეთ|შიგნით|შორს|აქიდან)(?![\u10A0-\u10FF])/.test(text);
    if (locFrame && !locCarrier) {
        issues.push({ rule: 'locative_postposition_untranslated', message: 'Locative postposition untranslated (KA-127): Georgian uses postpositions/case endings for location. Attested carriers: -ზე (on), -ში (in), -თან ახლოს (near), X-ის ქვეშ (under), X-ის უკან (behind), X-ის წინ (in front of), X-ს შორის (between), X-ის გარეთ (outside), X-ის შიგნით (inside), X-ის გვერდით (next to/beside), X-ის ზემოთ (above), X-დან შორს / აქიდან შორს (far from). Temporal next (next week/day/…) must stay as შემდეგ/მომავალ; only locative next+to is consumed.' });
    }

    // 3.127 Question auxiliary & everyday verb residue (v1.46.0, KA-128). Detect
    //       untranslated question auxiliaries (do you, will you, can you, what do you)
    //       or stranded everyday verb forms.
    const qAuxFrame = /\b(?:do\s+you|will\s+you|can\s+you|what\s+do\s+you|how\s+are\s+you|why\s+not|where\s+do\s+you|where\s+are\s+you)\b/i.test(text);
    const qAuxCarrier = /(?:იცი|იცნობ|მოხვალ|დამეხმარო|რა\s+გინდა|როგორ\s+ხარ|რატომ\s+არა|სად\s+ცხოვრობ|სად\s+ხარ)/.test(text);
    if (qAuxFrame && !qAuxCarrier) {
        issues.push({ rule: 'question_auxiliary_untranslated', message: 'Question auxiliary frame untranslated (KA-128): English auxiliary questions (do you, will you, can you, what do you, how are you) must not leave stranded English auxiliaries. In Georgian, questions drop auxiliaries and are formed by intonation or question particles (e.g. "do you know" → იცი?, "will you come" → მოხვალ?, "what do you want" → რა გინდა?, "how are you" → როგორ ხარ?, "why not" → რატომ არა?).' });
    }

    const BLOCKING_RULES = new Set([
        'wrong_script', 'o_gen', 'double_neg', 'double_neg_clause', 'tts_symbols',
        'neg_digit', 'latin_frag', 'terminal_punct', 'neg_imperative', 'calqued_idiom',
        'tha_redundant', 'pronoun_postpos_s', 'decimal_point', 'decimal_point_ka',
        'english_ordinal', 'chunk_truncation', 'locative_postposition_untranslated',
        'question_auxiliary_untranslated'
    ]);

    for (const issue of issues) {
        if (!issue.severity) {
            issue.severity = BLOCKING_RULES.has(issue.rule) ? 'blocking' : 'hint';
        }
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

    // 4.15 Collapse duplicate periods and normalize sentence boundaries
    out = out.replace(/([\u10A0-\u10FF“”»)])\s*\.\s*\./g, '$1.');

    // 4.16 Remove apostrophe inside Georgian words
    out = out.replace(/([\u10A0-\u10FF])'([\u10A0-\u10FF])/g, '$1$2');

    // 4.17 Semicolons in narrative: normalize spacing (never strip)
    out = out.replace(/([\u10A0-\u10FF])\s*;\s*/g, '$1; ');

    // 4.18 Fix ", ," or " ," artifacts
    out = out.replace(/\s+,/g, ',');
    out = out.replace(/,\s*,/g, ',');

    // 4.19 Ensure terminal punctuation at end of text (never leave unterminated)
    if (out.trim().length > 0 && !/[.!?…]["“”»)]?$/.test(out.trim())) {
        out = out.trim() + '.';
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
    //     Lookahead includes /… because 4.15 already converted sentence periods.
    out = out.replace(/(?<=[\u10A0-\u10FF])\s+ც(?=[\s,."”):;!?…])/g, 'ც');

    // 4.43 Detached quotatives → hyphenate to the preceding word
    //     ("... თქო" → "...-თქო", "... მეთქი" → "...-მეთქი").
    out = out.replace(/(?<=[\u10A0-\u10FF])\s+(თქო|მეთქი)(?=[\s.!?,"”):…])/g, '-$1');

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
    //     Lookahead includes /… because 4.15/4.29 already normalized periods.
    out = out.replace(/(?<=[\u10A0-\u10FF])(ის|ს|ი)\s+(დან|მდე)(?=[\s,."”):;!?…])/g, '$1$2');

    // 4.48 Detached -გან → fuse to the preceding genitive stem
    //     ("... ის გან" → "...-გან").
    out = out.replace(/(?<=[\u10A0-\u10FF])ის\s+გან(?=[\s,."”):;!?…])/g, 'ისგან');

    // 4.49 Untranslated English purpose connectors → რათა + optative reading
    //     (deterministic: "in order to/so as to" should never survive into
    //     Georgian output as English words).
    //     v1.17.0: purpose ladder enriched — full-clause purpose now prefers
    //     იმისათვის რომ (formal-neutral); რათა remains for literary/optative
    //     flavor; result-purposive "so that" → ისე რომ.
    out = out.replace(/\bin order to\b/gi, 'იმისათვის რომ');
    out = out.replace(/\bso as to\b/gi, 'იმისათვის რომ');
    out = out.replace(/\bin order that\b/gi, 'იმისათვის რომ');
    out = out.replace(/\bso that\b/gi, 'ისე რომ');

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
    //      "whether or not" maps whether→თუ here too; the leftover
    //      "თუ or not" residue is repaired to თუ არა by 4.90 (v1.23.0).
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
    //      the safe unambiguous adverb). Lookahead includes  because earlier
    //      fixes already normalized periods.
    out = out.replace(/([^.\n!?]*)(?<![\u10A0-\u10FF])ხან(?![\u10A0-\u10FF])([^.\n!?]*[.!?])/g,
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

    // 4.61a "no less than" (quantity lower bound) must be consumed BEFORE
    //      the bare comparative "less" → ნაკლებად mapping in 4.61.
    out = out.replace(/\bno less than\b/gi, 'არანაკლებ');

    // 4.61a-bis (v1.37.0) "one more time" must be consumed as a WHOLE
    //      phrase BEFORE 4.61's bare more→უფრო could eat the "more"
    //      (longest-first: whole idiom outranks the bare word).
    out = out.replace(/\bone more time\b/gi, 'კიდევ ერთხელ');

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
    const negFixRe = /(?<![\u10A0-\u10FF])(არავინ|არავითარი|არაფერი|არასოდეს|არასდროს|არსად)(?![\u10A0-\u10FF])([^.!?]{0,80})/g;
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
    //      let's / let me are EXCLUDED here — they are hortatives handled
    //      by 4.92 (მოდით / მინდა), never the causative დაუშვა (KA-107).
    out = out.replace(/\blet\b(?!'?\s?s\b|\s+me\b)/gi, 'დაუშვა');
    out = out.replace(/\bforced\b/gi, 'აიძულა');

    // 4.67 Plural vowel-loss repair: X-იები → X-ები (drop the kept singular
    //      -ი before the plural marker; standard syncope applies to the
    //      base stem which only the AI pass can restore — here we only fix
    //      the mechanical double-vowel defect).
    out = out.replace(/(?<![\u10A0-\u10FF])([ა-ჰ]+)ი(ებ(?:ი|ს|მა|ს|ით|ად|ო|ში|ზე|თან|გან))(?![\u10A0-\u10FF])/g, '$1$2');

    // 4.68 Untranslated English tag questions → Georgian tag particles.
    out = out.replace(/\bisn'?t it\?/gi, 'არა?');
    out = out.replace(/\baren'?t you\?/gi, 'არა?');
    out = out.replace(/\bdon'?t you\?/gi, 'არა?');
    out = out.replace(/\bright\?/gi, 'ხომ?');
    out = out.replace(/\beh\?/gi, 'არა?');

    // 4.69 Untranslated English degree adverbs → Georgian carriers.
    out = out.replace(/\bvery much\b/gi, 'ძალიან');
    out = out.replace(/\bvery\b/gi, 'ძალიან');
    out = out.replace(/\bquite\b/gi, 'საკმაოდ');
    out = out.replace(/\bfairly\b/gi, 'საკმაოდ');
    out = out.replace(/\balmost\b/gi, 'თითქმის');
    out = out.replace(/\bcompletely\b/gi, 'სრულიად');
    out = out.replace(/\bextremely\b/gi, 'მეტისმეტად');
    out = out.replace(/\breally\b/gi, 'ნამდვილად');

    // 4.104 (v1.37.0, KA-119) Repetition & continuation adverbs → Georgian
    //      carriers. Runs BEFORE 4.70's then/finally and 4.74's bare once
    //      (so "once again" is consumed as a whole
    //      phrase before bare once could touch it) and BEFORE 4.93's
    //      do-support tail (so "not yet" is consumed whole; the disjoint
    //      "as yet" rule sits far below and shares no token with these
    //      frames).
    //      "never again" is consumed before the generic never
    //      swap. Bare yet/still are NEVER mechanically
    //      mapped here (conjunction/degree/adjective polysemy — KB
    //      guard); QA 3.118 flags them and the AI pass decides.
    out = out.replace(/\bnever again\b/gi, 'აღარასოდეს');
    out = out.replace(/\bagain and again\b/gi, 'ისევ და ისევ');
    out = out.replace(/\btime after time\b/gi, 'არაერთხელ');
    out = out.replace(/\btime and again\b/gi, 'არაერთხელ');
    out = out.replace(/\bonce again\b/gi, 'კიდევ ერთხელ');
    out = out.replace(/\bover again\b/gi, 'კიდევ ერთხელ');
    //      ("one more time" is consumed EARLIER — 4.61a-bis, before 4.61's
    //      bare more→უფრო could eat the frame)
    out = out.replace(/\bno longer\b/gi, 'აღარ');
    out = out.replace(/\bnot yet\b/gi, 'ჯერ არ');
    out = out.replace(/\balready\b/gi, 'უკვე');
    out = out.replace(/\banymore\b/gi, 'აღარ');
    out = out.replace(/\bagain\b/gi, 'ისევ');

    // 4.105 (v1.38.0, KA-120) Reciprocals & otherness → Georgian carriers.
    //      Runs AFTER 4.104 (shares no token with the repetition family)
    //      and BEFORE 4.102's calendar frames and 4.93's do-support /
    //      negation tail ("nothing else" must be consumed whole before
    //      any negative-reordering pass could touch it).
    //      Longest-first INSIDE the block: "one another" before any
    //      "other"-token rule; possessive 's frames before the bare
    //      else-frames (someone else's consumed whole).
    //      ONLY SAFE FRAMES are deterministic: the reciprocal base NOM
    //      ერთმანეთი (case by verb government is the AI pass's decision
    //      — KB KA_CASE_SYSTEM), the else-family, and "the others".
    //      Bare other / another / each / else are NEVER mechanically
    //      mapped (polysemy: adjective vs pronoun; სხვა vs კიდევ ერთი;
    //      quantifier თითოეული; postmodifier "or else") — QA 3.119
    //      flags and the AI pass decides.
    out = out.replace(/\bone another\b/gi, 'ერთმანეთი');
    out = out.replace(/\beach other\b/gi, 'ერთმანეთი');
    out = out.replace(/\bthe others\b/gi, 'სხვები');
    out = out.replace(/\bsomeone else's\b/gi, 'სხვისი');
    out = out.replace(/\bsomebody else's\b/gi, 'სხვისი');
    out = out.replace(/\bsomeone else\b/gi, 'ვინმე სხვა');
    out = out.replace(/\bsomebody else\b/gi, 'ვინმე სხვა');
    out = out.replace(/\banyone else\b/gi, 'ვინმე სხვა');
    out = out.replace(/\banybody else\b/gi, 'ვინმე სხვა');
    out = out.replace(/\bnothing else\b/gi, 'სხვა არაფერი');
    out = out.replace(/\banything else\b/gi, 'სხვა რამე');

    // 4.106 (v1.39.0, KA-121) Indefinite pronoun series → Georgian carriers.
    //      Runs AFTER 4.105 so the else-frames (someone else / anything
    //      else / nothing else) are consumed WHOLE before any bare rule
    //      could fire, and BEFORE 4.93's do-support/negation tail and
    //      4.77's question family (any-series in questions must already
    //      be carriers by then).
    //      DETERMINISTIC ONLY: the some/every/no triads map directly
    //      (dictionary.ge/wiktionary attested). The any-series maps ONLY
    //      under the interrogative/conditional guard (dictionary.ge
    //      anybody: "კითხვით და პირობით წინადადებებში ვინმე") —
    //      affirmative free-choice any → ნებისმიერი is the AI pass's
    //      decision and is NEVER mechanically mapped.
    //      Possessives before bare frames: someone's / nobody's
    //      consumed whole (\'s swallowed by \b).
    //      Negative-concord carriers (არავინ/არაფერი/არსად) are emitted
    //      base-NOM; ა-placement before the verb remains with the AI
    //      pass except in the attested none-of frames mapped whole.
    //      Interrogative arm: question mark / inverted opening (direct
    //      inversion, first 12 chars) / INVERTED ORDER (aux directly
    //      BEFORE the any-token, ≤12 chars gap — "did anybody", "is
    //      anything"). A loose proximity window would wrongly arm
    //      declaratives like "She is better than anyone" (is…anyone =
    //      13 chars) — comparison frames stay AI-only.
    const anyGuard = /\?|¡/.test(out)
        || /\b(?:do|does|did|can|could|will|would|should|is|are|was|were|have|has|had)\b[^\n]{0,12}?\b(?:anybody|anyone|anything|anywhere)\b/i.test(out)
        || /^\s*(?:do|does|did|can|could|will|would|should|is|are|was|were|have|has|had)\b/i.test(out)
        || /\b(?:if|unless|whenever)\b[^\n]{0,60}?\b(?:anybody|anyone|anything|anywhere)\b/i.test(out);
    // possessive frames first (\'s consumed whole)
    out = out.replace(/\bsomeone's\b/gi, 'ვინმეს');
    out = out.replace(/\bsomebody's\b/gi, 'ვინმეს');
    out = out.replace(/\bnobody's\b/gi, 'არავის');
    // none-of partitives (attested dictionary.ge none¹ frames)
    out = out.replace(/\bnone of them\b/gi, 'არც ერთი მათგანი');
    out = out.replace(/\bnone of us\b/gi, 'არც ერთი ჩვენგანი');
    out = out.replace(/\bnone of you\b/gi, 'არც ერთი თქვენგანი');
    // any-series under the interrogative/conditional guard
    if (anyGuard) {
        out = out.replace(/\banybody\b/gi, 'ვინმე');
        out = out.replace(/\banyone\b/gi, 'ვინმე');
        out = out.replace(/\banything\b/gi, 'რამე');
        out = out.replace(/\banywhere\b/gi, 'სადმე');
    }
    // some-series
    out = out.replace(/\bsomething\b/gi, 'რაღაც');
    out = out.replace(/\bsomebody\b/gi, 'ვინმე');
    out = out.replace(/\bsomeone\b/gi, 'ვინმე');
    out = out.replace(/\bsomewhere\b/gi, 'სადმე');
    // every-series
    out = out.replace(/\beverything\b/gi, 'ყველაფერი');
    out = out.replace(/\beverybody\b/gi, 'ყველა');
    out = out.replace(/\beveryone\b/gi, 'ყველა');
    out = out.replace(/\beverywhere\b/gi, 'ყველგან');
    // no-series (negative-concord carriers; ა by AI pass)
    out = out.replace(/\bnothing\b/gi, 'არაფერი');
    out = out.replace(/\bnobody\b/gi, 'არავინ');
    out = out.replace(/\bno one\b/gi, 'არავინ');
    out = out.replace(/\bnowhere\b/gi, 'არსად');

    // 4.102 (v1.35.0, KA-117) Calendar time frames → Georgian carriers.
    //      MUST run BEFORE 4.70's next→შემდეგ and 4.99's this→ეს (whole
    //      frames are consumed first) and BEFORE 4.85's during-frames /
    //      4.92's every day-morning (this block covers week/month/year).
    //      NEVER fires on a BARE weekday/month/season/last/every — only
    //      inside preposition or determiner frames (polysemy protection:
    //      კვირა=week/Sunday, მაისი=May/rowan, "last"=ბოლო non-temporal).
    //      Longest-first: "the next day" before "next morning", frames
    //      before any bare-token rule could touch their tokens.
    out = out.replace(/\bthe next day\b/gi, 'მეორე დღეს');
    out = out.replace(/\bnext morning\b/gi, 'მეორე დილას');
    out = out.replace(/\b(?:at|on|over) the weekend\b/gi, 'შაბათ-კვირას');
    out = out.replace(/\bat weekends\b/gi, 'შაბათ-კვირას');
    out = out.replace(/\bfrom (\w+) to (\w+)\b/gi, (m, a, b) => {
        const days = { monday: 'ორშაბათიდან', tuesday: 'სამშაბათიდან',
            wednesday: 'ოთხშაბათიდან', thursday: 'ხუთშაბათიდან',
            friday: 'პარასკევიდან', saturday: 'შაბათიდან', sunday: 'კვირიდან' };
        const tos = { monday: 'ორშაბათამდე', tuesday: 'სამშაბათამდე',
            wednesday: 'ოთხშაბათამდე', thursday: 'ხუთშაბათამდე',
            friday: 'პარასკევამდე', saturday: 'შაბათამდე', sunday: 'კვირამდე' };
        const s = days[a.toLowerCase()], e = tos[b.toLowerCase()];
        return (s && e) ? s + ' ' + e : m;
    });
    const calDet = { this: 'ამ', next: 'მომავალ', last: 'გასულ' };
    out = out.replace(/\b(this|next|last) (week|month|year)\b/gi, (m, d, n) => {
        const det = calDet[d.toLowerCase()];
        if (!det) return m;
        if (n.toLowerCase() === 'week') return det + ' კვირას';
        if (n.toLowerCase() === 'year') return det + ' წელს';
        return det + ' თვეში';
    });
    out = out.replace(/\bevery (week|month|year)\b/gi, (m, n) => {
        const k = n.toLowerCase();
        return k === 'week' ? 'ყოველ კვირას' : k === 'year' ? 'ყოველ წელს' : 'ყოველ თვეს';
    });
    out = out.replace(/\bon (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, (m, d) => {
        const days = { monday: 'ორშაბათს', tuesday: 'სამშაბათს',
            wednesday: 'ოთხშაბათს', thursday: 'ხუთშაბათს', friday: 'პარასკევს',
            saturday: 'შაბათს', sunday: 'კვირას' };
        return days[d.toLowerCase()] || m;
    });
    out = out.replace(/\bin (january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, (m, mo) => {
        const months = { january: 'იანვარში', february: 'თებერვალში',
            march: 'მარტში', april: 'აპრილში', may: 'მაისში', june: 'ივნისში',
            july: 'ივლისში', august: 'აგვისტოში', september: 'სექტემბერში',
            october: 'ოქტომბერში', november: 'ნოემბერში', december: 'დეკემბერში' };
        return months[mo.toLowerCase()] || m;
    });
    out = out.replace(/\bin (spring|summer|autumn|winter)\b/gi, (m, s) => {
        const seasons = { spring: 'გაზაფხულზე', summer: 'ზაფხულში',
            autumn: 'შემოდგომაზე', winter: 'ზამთარში' };
        return seasons[s.toLowerCase()] || m;
    });
    out = out.replace(/\bin ((?:19|20)\d{2})\b/gi, '$1 წელს');

    // 4.103 (v1.36.0, KA-118) Narrative time: story openers, ago-
    //      construction, daypart frames, all/every/frequency completion.
    //      Runs right AFTER 4.102 (weekday datives already in place — the
    //      daypart-tail rule completes "on Monday evening" → ორშაბათს
    //      საღამოს) and BEFORE 4.70's next/then and 4.74's bare once
    //      (whole phrases consumed first; bare one/all/once NEVER touched).
    //      Longest-first: "not long ago" before "long ago", "once upon a
    //      time" before any frequency "once a N", "a long time ago"
    //      before the bare ago-construction.
    out = out.replace(/\bonce upon a time\b/gi, 'იყო და არა იყო რა');
    out = out.replace(/\bnot long ago\b/gi, 'არც ისე დიდი ხნის წინ');
    out = out.replace(/\ba long time ago\b/gi, 'დიდი ხნის წინ');
    out = out.replace(/\ba long while ago\b/gi, 'დიდი ხნის წინ');
    out = out.replace(/\blong ago\b/gi, 'დიდი ხნის წინ');
    out = out.replace(/\ba short time ago\b/gi, 'ცოტა ხნის წინ');
    out = out.replace(/\ba little while ago\b/gi, 'ცოტა ხნის წინ');
    out = out.replace(/\bfrom that day on\b/gi, 'იმ დღიდან');
    out = out.replace(/\bfrom that time on\b/gi, 'იმ დროიდან');
    out = out.replace(/\ball day long\b/gi, 'მთელი დღე');
    out = out.replace(/\b(\d+|a|one|two|three|four|five|six|seven|eight|nine|ten|many|several)\s+(year|years|month|months|week|weeks|day|days|hour|hours|minute|minutes)\s+ago\b/gi, (m, q, n) => {
        const nums = { a: 'ერთი', one: 'ერთი', two: 'ორი', three: 'სამი',
            four: 'ოთხი', five: 'ხუთი', six: 'ექვსი', seven: 'შვიდი',
            eight: 'რვა', nine: 'ცხრა', ten: 'ათი', many: 'მრავალი',
            several: 'რამდენიმე' };
        const gens = { year: 'წლის', years: 'წლის', month: 'თვის',
            months: 'თვის', week: 'კვირის', weeks: 'კვირის',
            day: 'დღის', days: 'დღის', hour: 'საათის', hours: 'საათის',
            minute: 'წუთის', minutes: 'წუთის' };
        const geo = nums[q.toLowerCase()] || q;
        const gen = gens[n.toLowerCase()];
        return gen ? geo + ' ' + gen + ' წინ' : m;
    });
    out = out.replace(/\bone (day|morning|evening|night)\b/gi, (m, d) => {
        const openers = { day: 'ერთ დღეს', morning: 'ერთ დილას',
            evening: 'ერთ საღამოს', night: 'ერთ ღამეს' };
        return openers[d.toLowerCase()] || m;
    });
    out = out.replace(/\bin the (morning|afternoon|evening)\b/gi, (m, d) => {
        const parts = { morning: 'დილას', afternoon: 'ნაშუადღევს',
            evening: 'საღამოს' };
        return parts[d.toLowerCase()] || m;
    });
    out = out.replace(/\bat noon\b/gi, 'შუადღისას');
    out = out.replace(/\bat night\b/gi, 'ღამით');
    out = out.replace(/\ball (day|night|morning|evening|week|month|year)\b/gi, (m, n) => {
        const alls = { day: 'მთელი დღე', night: 'მთელი ღამე',
            morning: 'მთელი დილა', evening: 'მთელი საღამო',
            week: 'მთელი კვირა', month: 'მთელი თვე', year: 'მთელი წელი' };
        return alls[n.toLowerCase()] || m;
    });
    out = out.replace(/\bevery (evening|night)\b/gi, (m, n) => {
        return n.toLowerCase() === 'evening' ? 'ყოველ საღამოს' : 'ყოველ ღამე';
    });
    out = out.replace(/\bonce a (day|week|month|year)\b/gi, (m, n) => {
        const freq = { day: 'დღეში ერთხელ', week: 'კვირაში ერთხელ',
            month: 'თვეში ერთხელ', year: 'წელიწადში ერთხელ' };
        return freq[n.toLowerCase()] || m;
    });
    out = out.replace(/\btwice a (day|week|month|year)\b/gi, (m, n) => {
        const freq = { day: 'დღეში ორჯერ', week: 'კვირაში ორჯერ',
            month: 'თვეში ორჯერ', year: 'წელიწადში ორჯერ' };
        return freq[n.toLowerCase()] || m;
    });
    out = out.replace(/\b(?:three|four|five|\d+) times a (day|week|month|year)\b/gi, (m, n) => {
        const mults = { three: 'სამჯერ', four: 'ოთხჯერ', five: 'ხუთჯერ' };
        const intervals = { day: 'დღეში', week: 'კვირაში', month: 'თვეში',
            year: 'წელიწადში' };
        const mult = mults[m.match(/three|four|five|\d+/i)[0].toLowerCase()] ||
            (/\d+/.test(m) ? m.match(/\d+/)[0] + '-ჯერ' : null);
        const iv = intervals[n.toLowerCase()];
        return (mult && iv) ? iv + ' ' + mult : m;
    });
    out = out.replace(/(?<![\u10A0-\u10FF])(ორშაბათს|სამშაბათს|ოთხშაბათს|ხუთშაბათს|პარასკევს|შაბათს|კვირას) (morning|evening|night|afternoon)\b/gi, (m, w, d) => {
        const tails = { morning: 'დილას', evening: 'საღამოს',
            night: 'ღამეს', afternoon: 'ნაშუადღევს' };
        const tail = tails[d.toLowerCase()];
        return tail ? w + ' ' + tail : m;
    });

    // 4.112 Locative postpositions (KA-127). MUST run BEFORE 4.70's bare
    //      next→შემდეგ, otherwise "next to" is destroyed into "შემდეგ to".
    //      Strategy: consume high-confidence copula+locative frames and
    //      emit a Georgian carrier with a lightweight case marker on the
    //      (often English) noun residue (e.g. table-ზე, house-ის გარეთ).
    const kaAttach = (phrase, suffix) => {
        const parts = (phrase || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return phrase;
        const last = parts.pop();
        const isKa = /[\u10A0-\u10FF]/.test(last);
        const outLast = isKa ? (last + suffix) : (last + '-' + suffix);
        parts.push(outLast);
        return parts.join(' ');
    };
    const kaGen = (phrase) => kaAttach(phrase, 'ის');
    const kaDat = (phrase) => kaAttach(phrase, 'ს');

    // far from here → აქიდან შორს (lexicalized)
    out = out.replace(/\bfar\s+from\s+here\b/gi, 'აქიდან შორს');
    // far from X → X-დან შორს (place default; person/abstract -გან is AI-pass)
    out = out.replace(/\bfar\s+from\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, obj) => `${kaAttach(obj, 'დან')} შორს`);

    // next to + determiner phrases ("her friend", "my brother") — drop the
    // English determiner and attach genitive to the noun head.
    out = out.replace(/\bnext\s+to\s+(?:my|your|his|her|our|their)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, obj) => `${kaGen(obj)} გვერდით`);

    // next to + pronouns (genitive pronouns are fixed forms)
    out = out.replace(/\bnext\s+to\s+me\b/gi, 'ჩემ გვერდით');
    out = out.replace(/\bnext\s+to\s+(?:him|her)\b/gi, 'მის გვერდით');
    out = out.replace(/\bnext\s+to\s+them\b/gi, 'მათ გვერდით');
    out = out.replace(/\bnext\s+to\s+us\b/gi, 'ჩვენ გვერდით');

    // next to / beside + NP → NP-ის გვერდით (NP can be 1–2 words)
    out = out.replace(/\b(?:right\s+)?next\s+to\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, obj) => `${kaGen(obj)} გვერდით`);
    out = out.replace(/\bbeside\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, obj) => `${kaGen(obj)} გვერდით`);

    // Copula-anchored locatives (avoid touching calendar/time idioms).
    // IMPORTANT ORDER: the specific "in front of" rule must run BEFORE the
    // generic "in" rule, otherwise "in front of X" gets degraded into
    // "front-of-...-ში".
    out = out.replace(/\b(is|are|was|were)\s+on\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaAttach(obj, 'ზე')}`);
    out = out.replace(/\b(is|are|was|were)\s+in\s+front\s+of\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaGen(obj)} წინ`);
    out = out.replace(/\b(is|are|was|were)\s+in\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaAttach(obj, 'ში')}`);
    out = out.replace(/\b(is|are|was|were)\s+under\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaGen(obj)} ქვეშ`);
    out = out.replace(/\b(is|are|was|were)\s+behind\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaGen(obj)} უკან`);
    out = out.replace(/\b(is|are|was|were)\s+between\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaDat(obj)} შორის`);
    out = out.replace(/\b(is|are|was|were)\s+near\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaAttach(obj, 'თან')} ახლოს`);
    out = out.replace(/\b(is|are|was|were)\s+above\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaGen(obj)} ზემოთ`);
    out = out.replace(/\b(is|are|was|were)\s+outside\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaGen(obj)} გარეთ`);
    out = out.replace(/\b(is|are|was|were)\s+inside\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, be, obj) => `${be} ${kaGen(obj)} შიგნით`);

    // Bare "near X" / "next to X" fragments (common residue shapes)
    out = out.replace(/(^|[.!?]\s+)near\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, p, obj) => `${p}${kaAttach(obj, 'თან')} ახლოს`);
    out = out.replace(/(^|[.!?]\s+)next\s+to\s+(?:the\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/gi, (m, p, obj) => `${p}${kaGen(obj)} გვერდით`);

    // 4.70 Untranslated English sequencers → Georgian narrative chain.
    out = out.replace(/\bfirst of all\b/gi, 'პირველ რიგში');
    out = out.replace(/\bfirstly\b/gi, 'ჯერ');
    out = out.replace(/\bfirst\b/gi, 'ჯერ');
    out = out.replace(/\bnext\b/gi, 'შემდეგ');
    out = out.replace(/\bthen\b/gi, 'მერე');
    out = out.replace(/\bafter that\b/gi, 'ამის შემდეგ');
    out = out.replace(/\beventually\b/gi, 'საბოლოოდ');
    out = out.replace(/\bfinally\b/gi, 'ბოლოს');

    // 4.71 Untranslated English "at least" / discourse-markers remnants.
    out = out.replace(/\bat least\b/gi, 'მინიმუმ');
    out = out.replace(/\bnot even\b/gi, 'არც კი');
    out = out.replace(/\bdidn'?t even\b/gi, 'არც კი');
    out = out.replace(/\bnever even\b/gi, 'არც კი');
    out = out.replace(/\bwithout even\b/gi, 'კი არც');
    out = out.replace(/\bfor example\b/gi, 'მაგალითად');
    out = out.replace(/\bnamely\b/gi, 'კერძოდ');
    out = out.replace(/\bin general\b/gi, 'ზოგადად');

    // 4.72 Untranslated English "by + transport/means" → instrumental -ით.
    out = out.replace(/\bby car\b/gi, 'მანქანით');
    out = out.replace(/\bby bus\b/gi, 'ავტობუსით');
    out = out.replace(/\bby train\b/gi, 'მატარებლით');
    out = out.replace(/\bby plane\b/gi, 'თვითმფრინავით');
    out = out.replace(/\bby hand\b/gi, 'ხელით');

    // ── v1.20.0 additions — MUST run before the v1.17.0 conjunction
    //      mappings below: bare "while"/"until"/"as soon as" (4.74) and
    //      bare "after/before" would otherwise consume the gerund-phrase
    //      forms first. Same ordering class as 4.78's "one and the same",
    //      4.80's "but also", 4.81's "will go".

    // 4.84 Untranslated English gerund time phrases → masdar adverbial
    //      frames. Longest/most-specific FIRST. Each maps to
    //      [GEN masdar] + [postposition]; the masdar itself is left as
    //       masdar-GEN skeleton for the AI pass to fill lexically.
    //      Lookup normalizes the (\w+)ing capture: e-drop (leav→leave,
    //      wak→wake) and doubled final consonant (sitt→sit, runn→run).
    const masdarLookup = (dict, raw) => dict[raw] || dict[raw + 'e'] ||
        dict[raw.replace(/(.)\1$/, '$1')] || dict[raw.replace(/(.)\1$/, '$1') + 'e'] || null;
    out = out.replace(/\bafter (?:he|she|it|they|we|I|you) (?:had|have) (\w+ed|\w+en)\b/gi, 'მას შემდეგ, რაც $1');
    out = out.replace(/\b(?:before|after|upon) (\w+)ing\b/gi, (m, v) => {
        const masdars = {
            read: 'წაკითხვის', write: 'დაწერის', eat: 'ჭამის', drink: 'სმის',
            wake: 'გამოღვიძების', finish: 'დამთავრების', return: 'დაბრუნების',
            come: 'მოსვლის', go: 'წასვლის', arrive: 'მოსვლის',
            leave: 'წასვლის', sleep: 'დაძინების', work: 'მუშაობის',
            speak: 'ლაპარაკის', see: 'დანახვის', hear: 'გაგების',
            learn: 'გაგების', get: 'მიღების', take: 'წაღების',
            make: 'გაკეთების', do: 'კეთების', say: 'თქმის', tell: 'თქმის',
            enter: 'შესვლის', exit: 'გასვლის', stand: 'დგომის',
            sit: 'ჯდომის', lie: 'წოლის', think: 'ფიქრის',
            wait: 'ლოდინის', walk: 'სეირნობის', talk: 'ლაპარაკის',
            look: 'შეხედვის', watch: 'ყურების', ask: 'კითხვის',
            open: 'გახსნის', close: 'დახურვის', laugh: 'სიცილის',
            cry: 'ტირილის', smile: 'ღიმილის', dance: 'ცეკვის',
            live: 'ცხოვრების', start: 'დაწყების', begin: 'დაწყების',
            find: 'პოვნის', lose: 'დაკარგვის', give: 'მიცემის',
            meet: 'შეხვედრის'
        };
        const stem = masdarLookup(masdars, v.toLowerCase());
        const frame = m.trim().toLowerCase().startsWith('before') ? 'წინ' : 'შემდეგ';
        return stem ? stem + ' ' + frame : m;
    });
    out = out.replace(/\bwhile (\w+)ing\b/gi, (m, v) => {
        const masdars = {
            read: 'კითხვის', write: 'წერის', work: 'მუშაობის',
            speak: 'ლაპარაკის', walk: 'სეირნობის', wait: 'ლოდინის',
            think: 'ფიქრის', live: 'ცხოვრების', eat: 'ჭამის',
            drink: 'სმის', go: 'მიმსვლელობის', come: 'მოსვლის',
            sit: 'სხდომის', stand: 'დგომის', lie: 'წოლის',
            sleep: 'ძილის', talk: 'ლაპარაკის', look: 'ყურების',
            watch: 'ყურების', laugh: 'სიცილის', cry: 'ტირილის',
            run: 'სირბილის', drive: 'მართვის', cook: 'კეთების'
        };
        const stem = masdarLookup(masdars, v.toLowerCase());
        return stem ? stem + ' დროს' : m;
    });
    out = out.replace(/\buntil (\w+)ing\b/gi, (m, v) => {
        const masdars = {
            return: 'დაბრუნების', come: 'მოსვლის', arrive: 'მოსვლის',
            finish: 'დამთავრების', end: 'დამთავრების', sleep: 'დაძინების',
            leave: 'წასვლის', go: 'წასვლის', wake: 'გამოღვიძების',
            die: 'გარდაცვალების', stop: 'გაჩერების', close: 'დახურვის',
            start: 'დაწყების', begin: 'დაწყების', find: 'პოვნის'
        };
        const stem = masdarLookup(masdars, v.toLowerCase());
        return stem ? stem + ' დრომდე' : m;
    });
    out = out.replace(/\b(?:having|upon) (\w+ed|\w+en)\b/gi, (m, v) => {
        const perfects = {
            finished: 'დამთავრების', returned: 'დაბრუნების',
            arrived: 'მოსვლის', woken: 'გამოღვიძების', woke: 'გამოღვიძების',
            eaten: 'ჭამის', read: 'წაკითხვის', said: 'თქმის',
            heard: 'გაგების', learned: 'გაგების', learnt: 'გაგების',
            left: 'წასვლის', done: 'კეთების', seen: 'დანახვის',
            spoken: 'ლაპარაკის', written: 'წერის', taken: 'წაღების',
             given: 'მიცემის', found: 'პოვნის', made: 'გაკეთების'
         };
        const stem = masdarLookup(perfects, v.toLowerCase());
        return stem ? stem + ' შემდეგ' : m;
    });

    // 4.85 Untranslated English temporal noun frames → dative დროს
    //      frames. Longest FIRST: "during the" must be consumed before
    //      "during" (same ordering discipline as 4.74's "as soon as").
    out = out.replace(/\bat that (?:very )?time\b/gi, 'იმ დროს');
    out = out.replace(/\bat the (?:very )?time\b/gi, 'იმ დროს');
    out = out.replace(/\bfor a long time\b/gi, 'დიდხანს');
    out = out.replace(/\bin the course of\b/gi, 'განმავლობაში');
    out = out.replace(/\bthroughout the (\w+)\b/gi, (m, n) => {
        const nouns = {
            war: 'ომის', night: 'ღამის', day: 'დღის', year: 'წლის',
            summer: 'ზაფხულის', winter: 'ზამთრის', story: 'ამბის',
            book: 'წიგნის', life: 'ცხოვრების'
        };
        const stem = nouns[n.toLowerCase()] || null;
        return stem ? 'მთელი ' + stem + ' განმავლობაში' : m;
    });
    out = out.replace(/\bthroughout\b/gi, 'განმავლობაში');
    out = out.replace(/\bduring the (\w+(?: \w+)?)\b/gi, (m, n) => {
        const nouns = {
            war: 'ომის', night: 'ღამის', day: 'დღის', morning: 'დილის',
            evening: 'საღამოს', summer: 'ზაფხულის', winter: 'ზამთრის',
            meal: 'ჭამის', lunch: 'სადილის', dinner: 'ვახშმის',
            meeting: 'შეხვედრის', conversation: 'საუბრის', trip: 'მოგზაურობის',
            journey: 'მოგზაურობის', story: 'ამბის', rain: 'წვიმის',
            storm: 'ქარიშხლის', year: 'წლის', week: 'კვირის', month: 'თვის'
        };
        const first = n.split(' ')[0].toLowerCase();
        const stem = nouns[first] || null;
        return stem ? stem + ' დროს' : m;
    });
    out = out.replace(/\bduring\b/gi, 'დროს');

    // ── v1.17.0 additions ──

    // 4.73 Untranslated English conditional markers → Georgian carriers.
    //      "if" maps to თუ (real condition); "otherwise" family maps to
    //      the formal წინააღმდეგ შემთხვევაში. Counterfactual rewrites
    //      (if ... had ... → რომ + pluperfect) are left to the AI pass —
    //      only the connector is deterministic here.
    out = out.replace(/\bif not\b/gi, 'თუ არა');
    out = out.replace(/\botherwise\b/gi, 'წინააღმდეგ შემთხვევაში');
    out = out.replace(/\bif\b/gi, 'თუ');

    // 4.74 Untranslated English temporal conjunctions → Georgian carriers.
    //      "as soon as" MUST be consumed before the bare "as" mappings;
    //      "until" maps to the bookish ვიდრე + აر frame carrier (the არ
    //      inside the clause is the standard polarity quirk).
    //      "when" is SENTENCE-AWARE (KA-112, Latinum lesson 51: როდის is
    //      the INTERROGATIVE, როცა the relative conjunction): if the
    //      sentence containing "when" ends in "?" and still carries
    //      English (direct wh-question), map როდის; otherwise the
    //      temporal-conjunction როცა (all prior suites' inputs are
    //      statement frames and keep როცა).
    out = out.replace(/\bas soon as\b/gi, 'როგორც კი');
    out = out.replace(/\bwhen\b/gi, (m, off, whole) => {
        if (whole.indexOf('?') === -1) return 'როცა';
        const before = whole.slice(0, off);
        const start = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('…'), before.lastIndexOf('?'));
        const end = whole.slice(off).search(/[.!?…]/);
        const sentence = whole.slice(start + 1, end === -1 ? undefined : off + end + 1);
        return (sentence.indexOf('?') !== -1 && /[A-Za-z]/.test(sentence)) ? 'როდის' : 'როცა';
    });
    out = out.replace(/\bwhile\b/gi, 'სანამ');
    out = out.replace(/\buntil\b/gi, 'ვიდრე არ');
    out = out.replace(/\btill\b/gi, 'ვიდრე არ');

    // 4.75 Untranslated English free relatives → fused -ც relatives.
    out = out.replace(/\bwhoever\b/gi, 'ვინც');
    out = out.replace(/\bwherever\b/gi, 'სადაც');
    out = out.replace(/\bwhenever\b/gi, 'როცა');
    out = out.replace(/\bwhatever\b/gi, 'რასაც');

    // 4.76 Counterfactual verb remnants: bare English "would be" left in
    //      Georgian output → იქნებოდა (conditional of არის). "should be"
    //      (unreal) → უნდა იყოს (obligative). Conservative: only the
    //      copula forms; lexical would+V stays for the AI pass.
    out = out.replace(/\bwould be\b/gi, 'იქნებოდა');
    out = out.replace(/\bshould be\b/gi, 'უნდა იყოს');

    // ── v1.18.0 additions ──

    // 4.77 Untranslated English "than" (comparative conjunction) → ვიდრე.
    //      The -ზე postposition variant requires re-syntaxing that only the
    //      AI pass can do; the conjunction ვიდრე is the safe deterministic
    //      carrier (ნიკო უფრო მაღალია ვიდრე ნინო).
    out = out.replace(/\bthan\b/gi, 'ვიდრე');

    // 4.78 The "as" family leftovers (4.74 has already consumed "as soon
    //      as"; 4.49 has consumed "so as to"). Fixed frames FIRST, then
    //      the bare manner "as"/"like" → როგორც fallback.
    out = out.replace(/\bas usual\b/gi, 'როგორც წესი');
    out = out.replace(/\bas is known\b/gi, 'როგორც ცნობილია');
    out = out.replace(/\bas follows\b/gi, 'როგორც ქვემოთაა მითითებული');
    out = out.replace(/\bas such\b/gi, 'როგორც ასეთი');
    out = out.replace(/\bas yet\b/gi, 'ჯერ კიდევ');
    out = out.replace(/\bas well as\b/gi, 'ასევე');
    out = out.replace(/\bas well\b/gi, 'ასევე');
    out = out.replace(/\bas for\b/gi, 'რაც შეეხება');
    out = out.replace(/\bas to\b/gi, 'რაც შეეხება');
    out = out.replace(/\bjust as\b/gi, 'ისევე როგორც');
    out = out.replace(/\bone and the same\b/gi, 'ერთი და იგივე');
    out = out.replace(/\bthe same as\b/gi, 'ისეთივე როგორც');
    out = out.replace(/\bthe same\b/gi, 'იგივე');
    out = out.replace(/\bas\b/gi, 'როგორც');
    //      verb-"like" carve-out: a pronoun subject (with ნამდვილად
    //      residue from 4.69, which runs earlier) marks "like" as the
    //      affective VERB ("I like the story") — leave it for 4.88/4.89
    //      (მომწონს/გვწონს...). Comparison-"like" ("books like this",
    //      "like father") still → როგორც.
    out = out.replace(/(?<!\b(?:i|we|they|she|he|you)\s+(?:ნამდვილად\s+)?)like\b/gi, 'როგორც');

    // 4.79 Result/equality remnants: bare "such" → ასეთი. The full "such
    //      ... that" → ისეთი ... რომ and "so ... that" → ისე ... რომ
    //      re-syntaxing stays with the AI pass.
    out = out.replace(/\bsuch\b/gi, 'ასეთი');

    // 4.80 Cleft & corrective carriers: "but also/but rather" completes
    //      the არამედ frame BEFORE "not only" so the pair lands together;
    //      exactly/precisely → სწორედ; "the point is" → უბრალოდ ის, რომ.
    //      NOTE: 4.46 consumes bare "also" → ასევე, so the corrective
    //      residue "but ასევე" must also be consumed here.
    out = out.replace(/\bbut also\b/gi, 'არამედ');
    out = out.replace(/\bbut\s+ასევე/gi, 'არამედ');
    out = out.replace(/\bbut rather\b/gi, 'არამედ');
    out = out.replace(/\bnot only\b/gi, 'არა მხოლოდ');
    out = out.replace(/\bnot just\b/gi, 'არა მხოლოდ');
    out = out.replace(/\bthe point is\b/gi, 'უბრალოდ ის, რომ');
    out = out.replace(/\bexactly\b/gi, 'სწორედ');
    out = out.replace(/\bprecisely\b/gi, 'სწორედ');

    // ── v1.24.0 additions ──

    // 4.91 Future-intent frames: BE + going to + VERB → აპირებს-paradigm
    //      (ვაპირებ/აპირებ/აპირებს/ვაპირებთ/აპირებთ/აპირებენ; imperfect
    //      აპირებდა-family for "was/were going to"). Runs BEFORE 4.81's
    //      bare "going to → მიდის" motion mapping — "I'm going to leave"
    //      is PLANNED FUTURE (გლოსბე: აპირებს = "to be going to"), not
    //      walking. Attested frames: რის გაკეთებას აპირებთ? (dictionary.ge),
    //      აპირებს სპორტზე წასვლას (latinum L13), ვაპირებდი წასვლას
    //      (engine KA_MASDARS). Place-guard lookahead keeps the MOTION
    //      reading alive ("I was going to the market" is untouched here —
    //      4.81 keeps it მიდის/მივდიოდი). The embedded verb stays as
    //      residue for the LLM stages / later fixes (same frame strategy
    //      as 4.88-4.90); QA 3.105 is satisfied by the აპირებ carrier.
    //      Bare "gonna" is intentionally left to QA 3.105 + AI refinement
    //      (subject-less, highest ambiguity).
    //      COPULA-FUTURE comes FIRST: "BE going to BE + N/Adj" is the
    //      copula future იქნება (he's going to be a doctor → იქნება
    //      ექიმი), NOT an აპირებს-frame — Georgian marks the nominal
    //      predicate future directly on the copula. there-is frames are
    //      impersonal იქნება (inanimate plural subjects keep 3sg
    //      agreement: პრობლემები იქნება). Weather frames are idiomatic
    //      (It's going to rain → წვიმა მოდის).
    out = out.replace(/\bthere(?:'s|\s+is|\s+are|\s+isn't|\s+aren't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნება' : 'იქნება'));
    out = out.replace(/\bit(?:'s|\s+is)\s+going\s+to\s+rain\b/gi, 'წვიმა მოდის');
    out = out.replace(/\bit(?:'s|\s+is)\s+going\s+to\s+snow\b/gi, 'თოვლი მოდის');
    out = out.replace(/\bi(?:'m|\s+am|\s+ain't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ ვიქნები' : 'ვიქნები'));
    out = out.replace(/\b(?:he|she|it)\s*(?:'s|\s+is|\s+isn't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნება' : 'იქნება'));
    out = out.replace(/\bwe\s*(?:'re|\s+are|\s+aren't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ ვიქნებით' : 'ვიქნებით'));
    out = out.replace(/\bthey\s*(?:'re|\s+are|\s+aren't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნებიან' : 'იქნებიან'));
    out = out.replace(/\byou\s*(?:'re|\s+are|\s+aren't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნები' : 'იქნები'));
    out = out.replace(/\bi\s+was(?:n't)?\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ ვიქნებოდი' : 'ვიქნებოდი'));
    out = out.replace(/\b(?:he|she|it)\s+was(?:n't)?\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნებოდა' : 'იქნებოდა'));
    out = out.replace(/\bwe\s+were(?:n't)?\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ ვიქნებოდით' : 'ვიქნებოდით'));
    out = out.replace(/\bthey\s+were(?:n't)?\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნებოდნენ' : 'იქნებოდნენ'));
    out = out.replace(/\byou\s+were(?:n't)?\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნებოდით' : 'იქნებოდით'));
    out = out.replace(/\b(?:'s|is|isn't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნება' : 'იქნება'));
    out = out.replace(/\b(?:'re|are|aren't)\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნებიან' : 'იქნებიან'));
    out = out.replace(/\bwas(?:n't)?\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნებოდა' : 'იქნებოდა'));
    out = out.replace(/\bwere(?:n't)?\s+(not\s+)?going\s+to\s+be\b/gi, (m, neg) => (neg || /n't/i.test(m) ? 'არ იქნებოდნენ' : 'იქნებოდნენ'));
    //      Place guard: REGEX LOOKAHEAD CANNOT DO CASE-SENSITIVE CHECKS
    //      under the i-flag ([A-Z] matches lowercase too — proven by
    //      debug run: guard always fired). So the guard runs in the
    //      REPLACE CALLBACK instead: capture the word right after "to"
    //      and bail (return m untouched → 4.81 motion მიდის) when it is
    //      a place/sleep/determiner noun or a Proper noun (capitalized).
    //      Verb objects fall through to the აპირებს-paradigm carrier.
    const PLACE_NOUNS = '(?:the|a|an|my|your|his|her|its|our|their|this|that|these|those|some|any|be|bed|school|work|market|church|town|home|abroad|back|sleep|dinner|lunch|store|cinema|hospital|airport|station|university|college|meeting)';
    const isPlaceWord = (w) => !!w && (new RegExp('^' + PLACE_NOUNS + '$', 'i').test(w) || /^[A-Z]/.test(w));
    //      intent helper: replace "SUBJ (not) going to [WORD]" → carrier
    //      (+ WORD), keeping place/proper-noun frames untouched for 4.81.
    //      negAt: index of the negation capture group in the pattern.
    //      Polarity: n't inside the aux (weren't/isn't/ain't) is detected
    //      on the full match — the capture group alone would miss it.
    const intent = (re, negAt, posCar, negCar) => out.replace(re, (m, ...rest) => {
        const g = rest[negAt] || /n't/i.test(m);
        const nxt = rest[negAt + 1] || '';
        if (isPlaceWord(nxt)) return m;
        return (g ? negCar : posCar) + (nxt ? ' ' + nxt : '');
    });
    //      per-subject frames — group 1 = negation, group 2 = next word
    out = intent(/\bi(?:'m|\s+am|\s+ain't)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'ვაპირებ', 'არ ვაპირებ');
    out = intent(/\b(?:he|she|it)\s*(?:'s|\s+is|\s+isn't)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებს', 'არ აპირებს');
    out = intent(/\bwe\s*(?:'re|\s+are|\s+aren't)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'ვაპირებთ', 'არ ვაპირებთ');
    out = intent(/\bthey\s*(?:'re|\s+are|\s+aren't)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებენ', 'არ აპირებენ');
    out = intent(/\byou\s*(?:'re|\s+are|\s+aren't)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებ', 'არ აპირებ');
    //      inverted questions: are you going to...? / is he going to...?
    out = intent(/\bam\s+i\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'ვაპირებ', 'არ ვაპირებ');
    out = intent(/\bis(?:n't)?\s+(?:he|she|it)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებს', 'არ აპირებს');
    out = intent(/\bare(?:n't)?\s+we\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'ვაპირებთ', 'არ ვაპირებთ');
    out = intent(/\bare(?:n't)?\s+they\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებენ', 'არ აპირებენ');
    out = intent(/\bare(?:n't)?\s+you\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებ', 'არ აპირებ');
    //      past: was/were going to (abandoned intention → imperfect)
    out = intent(/\bi\s+was(?:n't)?\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'ვაპირებდი', 'არ ვაპირებდი');
    out = intent(/\b(?:he|she|it)\s+was(?:n't)?\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებდა', 'არ აპირებდა');
    out = intent(/\bwe\s+were(?:n't)?\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'ვაპირებდით', 'არ ვაპირებდით');
    out = intent(/\bthey\s+were(?:n't)?\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებდნენ', 'არ აპირებდნენ');
    out = intent(/\byou\s+were(?:n't)?\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებდით', 'არ აპირებდით');
    //      generic noun-subject residues AFTER specific subjects consumed:
    //      "the men are going to V" → აპირებენ; "Tom's going to V" →
    //      აპირებს (the "'s" here is always the "is" contraction; the
    //      subject itself remains as residue for later stages, and the
    //      place guard still applies to the word AFTER "to").
    out = intent(/(?:'s|\bis|isn't)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებს', 'არ აპირებს');
    out = intent(/(?:'re|\bare|aren't)\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებენ', 'არ აპირებენ');
    out = intent(/\bwas(?:n't)?\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებდა', 'არ აპირებდა');
    out = intent(/\bwere(?:n't)?\s+(not\s+)?going\s+to\s*([a-z']*)/gi, 0, 'აპირებდნენ', 'არ აპირებდნენ');
    //      BARE MOTION, no "to": "going home/abroad/back" — direction
    //      adverbs never take "to" in English, so "going" here is ALWAYS
    //      motion (intent needs "to" + VERB). Present მიდის; past
    //      continuous მივდიოდა/მივდიოდნეน mirrors 4.81's tense-sensitive
    //      strategy (was going home → მივდიოდა სახლში).
    out = out.replace(/\bgoing\s+(?:home|abroad|back|away|downtown|upstairs|downstairs|outside|inside|there)\b/gi, 'მიდის');
    out = out.replace(/\bwas\s+going\s+(?:home|abroad|back|away|downtown|upstairs|downstairs|outside|inside|there)\b/gi, 'მივდიოდა');
    out = out.replace(/\bwere\s+going\s+(?:home|abroad|back|away|downtown|upstairs|downstairs|outside|inside|there)\b/gi, 'მივდიოდნენ');

    // 4.92 Habituality & hortatives (KA-107). Strategy = carrier + residue
    //      (same as 4.91): consume the English FRAME, insert the Georgian
    //      carrier (ხოლმე / მოდით / frequency adverb), leave the main
    //      verb as residue for the LLM/imperfect stages. Runs BEFORE
    //      4.69/4.81 so "used to go" isn't degraded to bare მიდის and
    //      "let's go" isn't split into fragments.
    //      "be used to V-ING" (ACCUSTOMED idiom) is consumed FIRST and
    //      excluded from the habitual mapping (მიჩვეული, never ხოლმე).
    //      -ing REQUIRED: passive "was used to MAKE" (purpose) must NOT
    //      match — only the gerund marks the accustomed idiom.
    out = out.replace(/\b(?:'m|'s|'re|am|is|are|was|were)\s+used\s+to\s+([a-z]+ing)\b/gi, 'მიჩვეული $1');
    //      existential past-habit: "there used to be" → fairy-tale იყო ხოლმე
    out = out.replace(/\bthere\s+used\s+to\s+be\b/gi, 'იყო ხოლმე');
    out = out.replace(/\bI\s+used\s+to\s+be\b/gi, 'ვიყავი ხოლმე');
    out = out.replace(/\bwe\s+used\s+to\s+be\b/gi, 'ვიყავით ხოლმე');
    out = out.replace(/\bused\s+to\s+be\b/gi, 'იყო ხოლმე');
    //      habitual frame: "SUBJ used to V" → "SUBJ ხოლმე V" (verb residue
    //      later staged to imperfect by AI; ხოლმე pre-verbal is attested)
    out = out.replace(/\b(?:i|he|she|it|we|you|they|there)\s+used\s+to\b/gi, (m) => m.replace(/\s*used\s+to\b/i, ' ხოლმე'));
    out = out.replace(/\bused\s+to\b/gi, ' ხოლმე');
    //      habitual motion residue: "go" inside a ხოლმე frame → imperfect
    //      დადიოდა (attested დადიოდა ხოლმე ტბასთან) — must precede 4.81's
    //      bare go → მიდის which would degrade the habitual reading
    out = out.replace(/(ხოლმე)\s+go\b/gi, '$1 დადიოდა');
    out = out.replace(/\bwould\s+always\b/gi, 'ყოველთვის ხოლმე');
    //      hortatives: "let's not V" → ნუ + optative; "let's V" → მოდით;
    //      attested collocations first (learnentry.com)
    out = out.replace(/\blet'?s\s+go\b/gi, 'მოდი წავიდეთ');
    out = out.replace(/\blet'?s\s+not\b/gi, 'ნუ');
    out = out.replace(/\blet'?s\b/gi, 'მოდით');
    out = out.replace(/\blet\s+me\s+know\b/gi, 'გამატყობინე');
    out = out.replace(/\blet\s+me\b/gi, 'მინდა');
    //      frequency adverbs (talkpal.ai / kahibaro.com tables)
    out = out.replace(/\balways\b/gi, 'ყოველთვის');
    out = out.replace(/\busually\b/gi, 'ჩვეულებრივ');
    out = out.replace(/\boften\b/gi, 'ხშირად');
    out = out.replace(/\brarely\b/gi, 'იშვიათად');
    out = out.replace(/\bseldom\b/gi, 'იშვიათად');
    out = out.replace(/\bnever\b/gi, 'არასდროს');
    out = out.replace(/\bevery\s+day\b/gi, 'ყოველ დღე');
    out = out.replace(/\bevery\s+morning\b/gi, 'ყოველ დილას');

    // ── v1.19.0 additions ──

    // 4.110 Future screeve dictionary (KA-125, v1.43.0). FUNCTION TAIL —
    //      runs BEFORE 4.81's motion maps: its bare "will go"/"will come"
    //      (→ 1sg წავალ/მოვალ regardless of subject) and bare go/come
    //      maps would otherwise mis-agree the future ("we წავალ") or
    //      degrade it to a present form. Also runs BEFORE 4.109/4.108's
    //      pronoun swaps — the subject must still be visible for person
    //      marking. Person-marked SUBJECT+WILL+VERB frames for the closed
    //      set of verbs whose future paradigms are fully attested (KA-125):
    //      SEE ვნახავ · WRITE დავწერ · CALL დავრეკავ · HELP დავეხმარები ·
    //      GO წავალ · COME მოვალ. GUARDS: 2nd person NEVER maps (T–V
    //      gated: წახვალ vs წახვალთ — same doctrine as bare will be);
    //      "it" subjects excluded (it is AI-gated, 4.108); bare
    //      subjectless "will V" left (no person → no safe form); negated
    //      futures ("won't/will not V") untouched — 4.93's არ family owns
    //      them and the negated screeve is an AI rebuild; contractions
    //      (I'll...) are placeholder-protected by 4.108 and stay AI-pass
    //      (QA 3.124 flags the residue).
    //      NOTE: \b never matches after Georgian chars (JS \b is
    //      ASCII-word-based) — safe to run after earlier Georgian swaps.
    //      SEE — ვნახავ family (cram.com; KB-attested ვნახავ KA-104)
    out = out.replace(/\bI\s+will\s+see\b/gi, 'მე ვნახავ');
    out = out.replace(/\bwe\s+will\s+see\b/gi, 'ჩვენ ვნახავთ');
    out = out.replace(/\b(?:he|she)\s+will\s+see\b/gi, 'ის ნახავს');
    out = out.replace(/\bthey\s+will\s+see\b/gi, 'ისინი ნახავენ');
    //      WRITE — დავწერ family (lingua.ge წერა; kartuliena მე დავწერ)
    out = out.replace(/\bI\s+will\s+write\b/gi, 'მე დავწერ');
    out = out.replace(/\bwe\s+will\s+write\b/gi, 'ჩვენ დავწერთ');
    out = out.replace(/\b(?:he|she)\s+will\s+write\b/gi, 'ის დაწერს');
    out = out.replace(/\bthey\s+will\s+write\b/gi, 'ისინი დაწერენ');
    //      CALL — დავრეკავ family (lingua.ge დარეკვა)
    out = out.replace(/\bI\s+will\s+call\b/gi, 'მე დავრეკავ');
    out = out.replace(/\bwe\s+will\s+call\b/gi, 'ჩვენ დავრეკავთ');
    out = out.replace(/\b(?:he|she)\s+will\s+call\b/gi, 'ის დარეკავს');
    out = out.replace(/\bthey\s+will\s+call\b/gi, 'ისინი დარეკავენ');
    //      HELP — დავეხმარები family (lingua.ge დახმარება)
    out = out.replace(/\bI\s+will\s+help\b/gi, 'მე დავეხმარები');
    out = out.replace(/\bwe\s+will\s+help\b/gi, 'ჩვენ დავეხმარებით');
    out = out.replace(/\b(?:he|she)\s+will\s+help\b/gi, 'ის დაეხმარება');
    out = out.replace(/\bthey\s+will\s+help\b/gi, 'ისინი დაეხმარებიან');
    //      GO — წავალ family (cram.com წასვლა; KA-95 suppletive წა-).
    //      Supersedes 4.81's bare will go → წავალ (1sg) which mis-agreed
    //      with we/they/he subjects ("we წავალ", "he წავალ").
    out = out.replace(/\bI\s+will\s+go\b/gi, 'მე წავალ');
    out = out.replace(/\bwe\s+will\s+go\b/gi, 'ჩვენ წავალთ');
    out = out.replace(/\b(?:he|she)\s+will\s+go\b/gi, 'ის წავა');
    out = out.replace(/\bthey\s+will\s+go\b/gi, 'ისინი წავლენ');
    //      COME — მოვალ family (lingua.ge მოსვლა; KA-95 suppletive მო-).
    //      Supersedes 4.81's bare will come → მოვალ (1sg).
    out = out.replace(/\bI\s+will\s+come\b/gi, 'მე მოვალ');
    out = out.replace(/\bwe\s+will\s+come\b/gi, 'ჩვენ მოვალთ');
    out = out.replace(/\b(?:he|she)\s+will\s+come\b/gi, 'ის მოვა');
    out = out.replace(/\bthey\s+will\s+come\b/gi, 'ისინი მოვლენ');

    // 4.111 Present screeve dictionary (KA-126, v1.44.0). FUNCTION TAIL —
    //      runs AFTER 4.110 (future frames are longer, will+VERB, and
    //      must win) and BEFORE 4.81's bare-motion maps: "I go to Tbilisi"
    //      needs the go frames settled before 4.81 degrades a bare "go".
    //      Also BEFORE 4.109/4.108's pronoun swaps — the subject must
    //      still be visible for person marking. Person-marked
    //      SUBJECT+VERB frames for the closed set of verbs whose present
    //      (აწმყო) paradigms are fully attested (KA-126):
    //      KNOW ვიცი · KNOW-person ვიცნობ · SEE ვხედავ · EAT ვჭამ ·
    //      DRINK ვსვამ · READ ვკითხულობ · WRITE ვწერ · SAY ვამბობ ·
    //      THINK ვფიქრობ · MAKE ვაკეთებ. GUARDS: 2nd person NEVER maps
    //      (T–V gated: იცი vs იცით — same doctrine as bare will be);
    //      "it" subjects excluded (it is AI-gated, 4.108); bare
    //      subjectless verb forms left (no person → no safe form);
    //      negated presents ("don't/doesn't know") untouched — 4.93's
    //      არ family owns them and არ + present is an AI rebuild;
    //      do/does-support questions untouched.
    //      NOTE: \b never matches after Georgian chars (JS \b is
    //      ASCII-word-based) — safe to run after earlier Georgian swaps.
    //      INVERSION GUARD: SUBJECT+VERB frames must not fire inside
    //      subject-auxiliary inversions ("will they see", "do I know")
    //      — questions stay AI-gated (v1.43.0 doctrine, 3.124/4.110
    //      pins). A sentinel \uE000 is injected between AUX and SUBJECT
    //      for the duration of this block only (restored right after),
    //      breaking the subject-verb adjacency that the frames match on.
    out = out.replace(/\b(will|shall|can|could|may|might|must|should|would|do|does|did|won'?t|don'?t|doesn'?t|didn'?t|can'?t|couldn'?t|shouldn'?t|mustn'?t|wouldn'?t|cannot)\s+(I|we|they|he|she)\b/gi, '$1 $2\uE000');
    //      KNOW-person FIRST — object pronoun selects ცნობნა (ვიცნობ)
    //      over ცოდნა (ვიცი); kahibaro "მე ვიცნობ ნინოს"
    out = out.replace(/\bI\s+know\s+him\b/gi, 'მე ვიცნობ მას');
    out = out.replace(/\bI\s+know\s+her\b/gi, 'მე ვიცნობ მას');
    out = out.replace(/\bwe\s+know\s+him\b/gi, 'ჩვენ ვიცნობთ მას');
    out = out.replace(/\bwe\s+know\s+her\b/gi, 'ჩვენ ვიცნობთ მას');
    out = out.replace(/\bI\s+know\s+them\b/gi, 'მე ვიცნობ მათ');
    out = out.replace(/\bwe\s+know\s+them\b/gi, 'ჩვენ ვიცნობთ მათ');
    out = out.replace(/\b(?:he|she)\s+knows\s+him\b/gi, 'ის იცნობს მას');
    out = out.replace(/\b(?:he|she)\s+knows\s+her\b/gi, 'ის იცნობს მას');
    out = out.replace(/\b(?:he|she)\s+knows\s+them\b/gi, 'ის იცნობს მათ');
    out = out.replace(/\bthey\s+know\s+him\b/gi, 'ისინი იცნობენ მას');
    out = out.replace(/\bthey\s+know\s+her\b/gi, 'ისინი იცნობენ მას');
    out = out.replace(/\bthey\s+know\s+them\b/gi, 'ისინი იცნობენ მათ');
    //      KNOW a fact — ვიცი family (kahibaro ცოდნა)
    out = out.replace(/\bI\s+know\b/gi, 'მე ვიცი');
    out = out.replace(/\bwe\s+know\b/gi, 'ჩვენ ვიცით');
    out = out.replace(/\b(?:he|she)\s+knows\b/gi, 'ის იცის');
    out = out.replace(/\bthey\s+know\b/gi, 'ისინი იციან');
    //      SEE — ვხედავ family (kahibaro 9.5; lingoseven)
    out = out.replace(/\bI\s+see\b/gi, 'მე ვხედავ');
    out = out.replace(/\bwe\s+see\b/gi, 'ჩვენ ვხედავთ');
    out = out.replace(/\b(?:he|she)\s+sees\b/gi, 'ის ხედავს');
    out = out.replace(/\bthey\s+see\b/gi, 'ისინი ხედავენ');
    //      EAT — ვჭამ family (wiktionary ჭამს; polytranslator corpus)
    out = out.replace(/\bI\s+eat\b/gi, 'მე ვჭამ');
    out = out.replace(/\bwe\s+eat\b/gi, 'ჩვენ ვჭამთ');
    out = out.replace(/\b(?:he|she)\s+eats\b/gi, 'ის ჭამს');
    out = out.replace(/\bthey\s+eat\b/gi, 'ისინი ჭამენ');
    //      DRINK — ვსვამ family (wiktionary სვამ; polytranslator corpus)
    out = out.replace(/\bI\s+drink\b/gi, 'მე ვსვამ');
    out = out.replace(/\bwe\s+drink\b/gi, 'ჩვენ ვსვამთ');
    out = out.replace(/\b(?:he|she)\s+drinks\b/gi, 'ის სვამს');
    out = out.replace(/\bthey\s+drink\b/gi, 'ისინი სვამენ');
    //      READ — ვკითხულობ family (wiktionary კითხულობს)
    out = out.replace(/\bI\s+read\b/gi, 'მე ვკითხულობ');
    out = out.replace(/\bwe\s+read\b/gi, 'ჩვენ ვკითხულობთ');
    out = out.replace(/\b(?:he|she)\s+reads\b/gi, 'ის კითხულობს');
    out = out.replace(/\bthey\s+read\b/gi, 'ისინი კითხულობენ');
    //      WRITE — ვწერ family (talkpal.ai; sublearn). Future დავწერ
    //      already consumed by 4.110 above.
    out = out.replace(/\bI\s+write\b/gi, 'მე ვწერ');
    out = out.replace(/\bwe\s+write\b/gi, 'ჩვენ ვწერთ');
    out = out.replace(/\b(?:he|she)\s+writes\b/gi, 'ის წერს');
    out = out.replace(/\bthey\s+write\b/gi, 'ისინი წერენ');
    //      SAY — ვამბობ family (kahibaro/cram.com თქმა)
    out = out.replace(/\bI\s+say\b/gi, 'მე ვამბობ');
    out = out.replace(/\bwe\s+say\b/gi, 'ჩვენ ვამბობთ');
    out = out.replace(/\b(?:he|she)\s+says\b/gi, 'ის ამბობს');
    out = out.replace(/\bthey\s+say\b/gi, 'ისინი ამბობენ');
    //      THINK — ვფიქრობ family (latinum L76)
    out = out.replace(/\bI\s+think\b/gi, 'მე ვფიქრობ');
    out = out.replace(/\bwe\s+think\b/gi, 'ჩვენ ვფიქრობთ');
    out = out.replace(/\b(?:he|she)\s+thinks\b/gi, 'ის ფიქრობს');
    out = out.replace(/\bthey\s+think\b/gi, 'ისინი ფიქრობენ');
    //      MAKE/DO — ვაკეთებ family (kahibaro; apprenti-polyglotte)
    out = out.replace(/\bI\s+make\b/gi, 'მე ვაკეთებ');
    out = out.replace(/\bwe\s+make\b/gi, 'ჩვენ ვაკეთებთ');
    out = out.replace(/\b(?:he|she)\s+makes\b/gi, 'ის აკეთებს');
    out = out.replace(/\bthey\s+make\b/gi, 'ისინი აკეთებენ');
    //      INVERSION GUARD restore — remove the sentinel; any subject that
    //      was shielded inside an inversion is now left unmapped (AI pass).
    out = out.replace(/\uE000/g, '');

    // 4.113 Everyday verb paradigms, Question Frames & Core Adjectives (KA-128, v1.46.0).
    //       Runs after 4.111 and 4.112. Consumes everyday verb frames, question frames,
    //       and high-frequency adjective-noun collocations.

    // Question auxiliary frames (consume before bare pronouns or verbs)
    out = out.replace(/\bdo\s+you\s+know\s+(him|her)\b/gi, 'იცნობ მას?');
    out = out.replace(/\bdo\s+you\s+know\s+them\b/gi, 'იცნობ მათ?');
    out = out.replace(/\bdo\s+you\s+know\b/gi, 'იცი?');
    out = out.replace(/\bwill\s+you\s+come\b/gi, 'მოხვალ?');
    out = out.replace(/\bcan\s+you\s+help\s+me\b/gi, 'შეგიძლია დამეხმარო?');
    out = out.replace(/\bcan\s+you\s+help\b/gi, 'შეგიძლია დაეხმარო?');
    out = out.replace(/\bwhat\s+do\s+you\s+want\b/gi, 'რა გინდა?');
    out = out.replace(/\bhow\s+are\s+you\b/gi, 'როგორ ხარ?');
    out = out.replace(/\bwhy\s+not\b/gi, 'რატომ არა?');
    out = out.replace(/\bwhere\s+do\s+you\s+live\b/gi, 'სად ცხოვრობ?');
    out = out.replace(/\bwhere\s+are\s+you\b/gi, 'სად ხარ?');

    // Core Adjective-Noun collocations
    out = out.replace(/\b(?:a\s+|the\s+)?big\s+house\b/gi, 'დიდი სახლი');
    out = out.replace(/\b(?:a\s+|the\s+)?small\s+dog\b/gi, 'პატარა ძაღლი');
    out = out.replace(/\b(?:a\s+|the\s+)?new\s+car\b/gi, 'ახალი მანქანა');
    out = out.replace(/\b(?:an\s+|the\s+)?old\s+man\b/gi, 'მოხუცი კაცი');
    out = out.replace(/(?:^|\s)(?:very|ძალიან)\s+good\b/gi, m => (m.startsWith(' ') ? ' ძალიან კარგი' : 'ძალიან კარგი'));
    out = out.replace(/\b(?:a\s+|the\s+)?beautiful\s+day\b/gi, 'ლამაზი დღე');
    out = out.replace(/\b(?:a\s+|the\s+)?long\s+road\b/gi, 'გრძელი გზა');

    // TAKE (აღება / იღებს)
    out = out.replace(/\bI\s+take\b/gi, 'მე ვიღებ');
    out = out.replace(/\bwe\s+take\b/gi, 'ჩვენ ვიღებთ');
    out = out.replace(/\b(?:he|she)\s+takes\b/gi, 'ის იღებს');
    out = out.replace(/\bthey\s+take\b/gi, 'ისინი იღებენ');
    out = out.replace(/\bI\s+took\b/gi, 'მე ავიღე');
    out = out.replace(/\bwe\s+took\b/gi, 'ჩვენ ავიღეთ');
    out = out.replace(/\b(?:he|she)\s+took\b/gi, 'მან აიღო');
    out = out.replace(/\bthey\s+took\b/gi, 'მათ აიღეს');

    // GIVE (მიცემა / აძლევს)
    out = out.replace(/\bI\s+give\b/gi, 'მე ვაძლევ');
    out = out.replace(/\bwe\s+give\b/gi, 'ჩვენ ვაძლევთ');
    out = out.replace(/\b(?:he|she)\s+gives\b/gi, 'ის აძლევს');
    out = out.replace(/\bthey\s+give\b/gi, 'ისინი აძლევენ');
    out = out.replace(/\b(?:he|she)\s+gave\b/gi, 'მან მისცა');
    out = out.replace(/\bthey\s+gave\b/gi, 'მათ მისცეს');

    // OPEN (გაღება / აღებს)
    out = out.replace(/\bI\s+open\b/gi, 'მე ვაღებ');
    out = out.replace(/\bwe\s+open\b/gi, 'ჩვენ ვაღებთ');
    out = out.replace(/\b(?:he|she)\s+opens\b/gi, 'ის აღებს');
    out = out.replace(/\bthey\s+open\b/gi, 'ისინი აღებენ');
    out = out.replace(/\b(?:he|she)\s+opened\b/gi, 'მან გააღო');

    // CLOSE (დახურვა / ხურავს)
    out = out.replace(/\bI\s+close\b/gi, 'მე ვხურავ');
    out = out.replace(/\bwe\s+close\b/gi, 'ჩვენ ვხურავთ');
    out = out.replace(/\b(?:he|she)\s+closes\b/gi, 'ის ხურავს');
    out = out.replace(/\bthey\s+close\b/gi, 'ისინი ხურავენ');
    out = out.replace(/\b(?:he|she)\s+closed\b/gi, 'მან დახურა');

    // WORK (მუშაობა / მუშაობს)
    out = out.replace(/\bI\s+work\b/gi, 'მე ვმუშაობ');
    out = out.replace(/\bwe\s+work\b/gi, 'ჩვენ ვმუშაობთ');
    out = out.replace(/\b(?:he|she)\s+works\b/gi, 'ის მუშაობს');
    out = out.replace(/\bthey\s+work\b/gi, 'ისინი მუშაობენ');
    out = out.replace(/\b(?:he|she)\s+worked\b/gi, 'მან იმუშავა');

    // LIVE (ცხოვრება / ცხოვრობს)
    out = out.replace(/\bI\s+live\b/gi, 'მე ვცხოვრობ');
    out = out.replace(/\bwe\s+live\b/gi, 'ჩვენ ვცხოვრობთ');
    out = out.replace(/\b(?:he|she)\s+lives\b/gi, 'ის ცხოვრობს');
    out = out.replace(/\bthey\s+live\b/gi, 'ისინი ცხოვრობენ');
    out = out.replace(/\b(?:he|she)\s+lived\b/gi, 'ის ცხოვრობდა');

    // BUY (ყიდვა / ყიდულობს)
    out = out.replace(/\bI\s+buy\b/gi, 'მე ვყიდულობ');
    out = out.replace(/\bwe\s+buy\b/gi, 'ჩვენ ვყიდულობთ');
    out = out.replace(/\b(?:he|she)\s+buys\b/gi, 'ის ყიდულობს');
    out = out.replace(/\bthey\s+buy\b/gi, 'ისინი ყიდულობენ');
    out = out.replace(/\b(?:he|she)\s+bought\b/gi, 'მან იყიდა');

    // SELL (გაყიდვა / ყიდის)
    out = out.replace(/\bI\s+sell\b/gi, 'მე ვყიდი');
    out = out.replace(/\bwe\s+sell\b/gi, 'ჩვენ ვყიდით');
    out = out.replace(/\b(?:he|she)\s+sells\b/gi, 'ის ყიდის');
    out = out.replace(/\bthey\s+sell\b/gi, 'ისინი ყიდიან');
    out = out.replace(/\b(?:he|she)\s+sold\b/gi, 'მან გაყიდა');

    // WAIT (ლოდინი / ელოდება)
    out = out.replace(/\bI\s+wait\b/gi, 'მე ველოდები');
    out = out.replace(/\bwe\s+wait\b/gi, 'ჩვენ ველოდებით');
    out = out.replace(/\b(?:he|she)\s+waits\b/gi, 'ის ელოდება');
    out = out.replace(/\bthey\s+wait\b/gi, 'ისინი ელოდებიან');

    // UNDERSTAND (გაგება / ესმის)
    out = out.replace(/\bI\s+understand\b/gi, 'მე მესმის');
    out = out.replace(/\bwe\s+understand\b/gi, 'ჩვენ გვესმის');
    out = out.replace(/\b(?:he|she)\s+understands\b/gi, 'მას ესმის');
    out = out.replace(/\bthey\s+understand\b/gi, 'მათ ესმით');

    // 4.81 Untranslated English motion verbs. Tense-sensitive carriers from
    //      the suppletive system; past "went to/came to" keeps the goal
    //      phrase in place (წავიდა სახლში). The bare "will go"/"will come"
    //      1sg maps (წავალ/მოვალ) MOVED to 4.110's person-marked dictionary
    //      (v1.43.0) — the 1sg form mis-agreed with we/they/he subjects
    //      ("we წავალ"); 4.110 runs before this rule.
    out = out.replace(/\bgoing to\b/gi, 'მიდის');
    out = out.replace(/\bgoes to\b/gi, 'მიდის');
    out = out.replace(/\bgo to\b/gi, 'მიდის');
    out = out.replace(/\bgoes\b/gi, 'მიდის');
    out = out.replace(/\bgo\b/gi, 'მიდის');
    out = out.replace(/\bcoming to\b/gi, 'მოდის');
    out = out.replace(/\bcomes to\b/gi, 'მოდის');
    out = out.replace(/\bcome to\b/gi, 'მოდის');
    out = out.replace(/\bcomes\b/gi, 'მოდის');
    out = out.replace(/\bcome\b/gi, 'მოდის');
    out = out.replace(/\bwent to\b/gi, 'წავიდა');
    out = out.replace(/\bcame to\b/gi, 'მოვიდა');
    out = out.replace(/\bwent\b/gi, 'წავიდა');
    out = out.replace(/\bcame\b/gi, 'მოვიდა');

    // 4.82 Untranslated English posture verbs: state present დგას/ზის/
    //      წევს, change of state დაჯდა/დაწვა, past state იდგა.
    out = out.replace(/\bis standing\b/gi, 'დგას');
    out = out.replace(/\bare standing\b/gi, 'დგანან');
    out = out.replace(/\bwas standing\b/gi, 'იდგა');
    out = out.replace(/\bwere standing\b/gi, 'იდგნენ');
    out = out.replace(/\bstands\b/gi, 'დგას');
    out = out.replace(/\bstanding\b/gi, 'დგომა');
    out = out.replace(/\bstood\b/gi, 'იდგა');
    out = out.replace(/\bstand\b/gi, 'დგას');
    out = out.replace(/\bis sitting\b/gi, 'ზის');
    out = out.replace(/\bare sitting\b/gi, 'სხედან');
    out = out.replace(/\bwas sitting\b/gi, 'ზიოდა');
    out = out.replace(/\bwere sitting\b/gi, 'სხედნენ');
    out = out.replace(/\bsits\b/gi, 'ზის');
    out = out.replace(/\bsitting\b/gi, 'ჯდომა');
    out = out.replace(/\bsat down\b/gi, 'დაჯდა');
    out = out.replace(/\bsat\b/gi, 'იჯდა');
    out = out.replace(/\bsit\b/gi, 'ზის');
    out = out.replace(/\bis lying\b/gi, 'წევს');
    out = out.replace(/\bwas lying\b/gi, 'წევოდა');
    out = out.replace(/\blies\b/gi, 'წევს');
    out = out.replace(/\blying\b/gi, 'წოლა');
    out = out.replace(/\blay down\b/gi, 'დაწვა');
    out = out.replace(/\blay\b/gi, 'იწვა');
    out = out.replace(/\blie\b/gi, 'წევს');

    // 4.83 Untranslated English directed motion: fused preverb verbs carry
    //      the PATH, so enter/exit/return/cross map to whole new verbs.
    out = out.replace(/\bentered\b/gi, 'შევიდა');
    out = out.replace(/\benters\b/gi, 'შედის');
    out = out.replace(/\benter\b/gi, 'შედის');
    out = out.replace(/\bexited\b/gi, 'გავიდა');
    out = out.replace(/\bexits\b/gi, 'გადის');
    out = out.replace(/\bexit\b/gi, 'გადის');
    out = out.replace(/\breturned\b/gi, 'დაბრუნდა');
    out = out.replace(/\breturns\b/gi, 'ბრუნდება');
    out = out.replace(/\breturn\b/gi, 'ბრუნდება');
    out = out.replace(/\bcrossed\b/gi, 'გადავიდა');
    out = out.replace(/\bcrosses\b/gi, 'გადადის');
    out = out.replace(/\bcross\b/gi, 'გადადის');
    out = out.replace(/\bclimbed\b/gi, 'ავიდა');
    out = out.replace(/\bdescended\b/gi, 'ჩამოვიდა');

    // ── v1.21.0 additions — run LAST so earlier verb-carrier fixes (4.81-4.83
    //      motion/posture, 4.84 gerunds) have already consumed their
    //      forms; these patterns key on copula + participle leftovers and
    //      un-/in- prefixed adjectives.

    // 4.86 Untranslated English participles → PPP/resultative carriers.
    //      Static passive "was V-ed" → PPP + იყო (იყვნენ pl.); present
    //      "is/are V-ed" → PPP + არის (არიან); perfect passive "has/have/
    //      had been V-ed" → PPP + ა (დაწერილია). Attributive "the V-ed N"
    //      → PPP in attributive slot. masdarLookup (4.84) is reused as the
    //      stem normalizer (same e-drop / doubled-consonant logic).
    const pcpLookup = masdarLookup;
    const ppps = {
        written: 'დაწერილი', finished: 'დამთავრებული', done: 'გაკეთებული',
        made: 'გაკეთებული', closed: 'დახურული', opened: 'გახსნილი',
        locked: 'დაკეტილი', broken: 'დამტვრეული', killed: 'მოკლული',
        found: 'ნაპოვნი', tired: 'დაღლილი', born: 'დაბადებული',
        hidden: 'დამალული', forgotten: 'დავიწყებული', frozen: 'გაყინული',
        torn: 'დაგლეჯილი', wounded: 'დაჭრილი', paid: 'გადახდილი',
        employed: 'დასაქმებული', surprised: 'გაკვირვებული',
        excited: 'აღელვებული', frightened: 'შეშინებული',
        crowded: 'გადაჭედილი', aged: 'მოხუცებული', told: 'ნათქვამი',
        seen: 'ნანახი', read: 'ნაკითხი', heard: 'ნასმენი'
    };
    out = out.replace(/\b(?:has|have|had) been (\w+)\b/gi, (m, v) => {
        const p = pcpLookup(ppps, v.toLowerCase());
        return p ? p + 'ა' : m;
    });
    //      Copula + participle: intensifiers preserved pre-participle
    //      (4.69 has usually already translated very/really/quite →
    //      ძალიან/საკმაოდ/ნამდვილად by the time 4.86 runs, so the
    //      Georgian forms are matched too; bare "so" is mapped here).
    //      was → იყო, were → იყვნენ, is → არის, are → არიან.
    const copK = { was: ' იყო', were: ' იყვნენ', is: ' არის', are: ' არიან' };
    out = out.replace(/\b(was|were|is|are) (ძალიან |საკმაოდ |ნამდვილად |თითქმის |სრულიად |მეტისმეტად |very |so |really )?(\w+)\b/gi,
        (m, cop, inten, v) => {
            const p = pcpLookup(ppps, v.toLowerCase());
            if (!p) return m;
            const gi = inten
                ? (inten === 'so ' || inten === 'very ' ? 'ძალიან '
                    : inten === 'really ' ? 'ნამდვილად ' : inten)
                : '';
            return gi + p + copK[cop.toLowerCase()];
        });
    out = out.replace(/\b(broken|burned|burnt|closed|locked|frozen|hidden|forgotten|written|torn|wounded|killed|tired|aged|crowded|frightened|excited|surprised|employed|paid) (?!by\b|and\b|or\b|but\b|the\b|a\b|an\b|is\b|was\b|were\b|to\b|in\b|on\b|at\b)(\w+)\b/gi,
        (m, v, n) => {
            const p = pcpLookup(ppps, v.toLowerCase());
            return p ? p + ' ' + n : m;
        });

    // 4.87 Untranslated English potential/negative-potential adjectives →
    //      და-უ- negative potential / -ებელი-ველი potential carriers.
    //      Negative (un-/in-/im-) FIRST: unbreakable must not fall to a
    //      bare-breakable map (same longest-first discipline as 4.74's
    //      "as soon as" / 4.85's "during the"). former X → ყოფილი X
    //      (participle of არის; NEVER ყოფილა, which is evidential).
    out = out.replace(/\bunbelievable\b/gi, 'დაუჯერებელი');
    out = out.replace(/\bincredible\b/gi, 'დაუჯერებელი');
    out = out.replace(/\bunforgettable\b/gi, 'დაუვიწყარი');
    out = out.replace(/\bunbreakable\b/gi, 'დაუმტვრეველი');
    out = out.replace(/\bunreadable\b/gi, 'წაუკითხავი');
    out = out.replace(/\binvisible\b/gi, 'უხილავი');
    out = out.replace(/\bimpossible\b/gi, 'შეუძლებელი');
    out = out.replace(/\binevitable\b/gi, 'აუცილებელი');
    out = out.replace(/\bunusable\b/gi, 'უვარგისი');
    out = out.replace(/\bunknown\b/gi, 'უცნობი');
    out = out.replace(/\bunfinished\b/gi, 'დაუმთავრებელი');
    out = out.replace(/\bvisible\b/gi, 'ხილული');
    out = out.replace(/\breadable\b/gi, 'საკითხავი');
    out = out.replace(/\bfuture\b/gi, 'მომავალი');
    out = out.replace(/\bformer (\w+)\b/gi, 'ყოფილი $1');

    // 4.88 (renumbered 4.89 here in execution order) Be-form interpersonal
    //      agreement → მიყვარხარ family. MUST run BEFORE the plain
    //      affective map below so "I love you" gets the be-form, not
    //      მიყვარს + bare pronoun. you-ALL before you (the \b in
    //      "i love you\b" would otherwise match the prefix of
    //      "i love you all"). Attested: მიყვარხარ (kaikki.org "მე შენ
    //      მიყვარხარ"), მენატრები (pinhok/learnentry), მძულხარ
    //      (learnentry), მე შენ მჭირდები (singpraises hymn), მოვწონვარ
    //      (zmnebi.com).
    //      (zmnebi.com). The ნამდვილად alternation tolerates intensifier
    //      residue — 4.69 (really → ნამდვილად) runs earlier in the
    //      pipeline, so "I really love you" reaches this block as
    //      "I ნამდვილად love you" and must still match.
    out = out.replace(/\bi\s+(?:really\s+|ნამდვილად\s+)?love\s+you\s+all\b|\bi\s+(?:really\s+|ნამდვილად\s+)?love\s+you\s+guys\b/gi, 'მიყვარხართ');
    out = out.replace(/\bi\s+(?:really\s+|ნამდვილად\s+)?love\s+you\b/gi, 'მიყვარხარ');
    out = out.replace(/\bwe\s+(?:really\s+|ნამდვილად\s+)?love\s+you\b/gi, 'გვიყვარხარ');
    out = out.replace(/\byou\s+(?:really\s+|ნამდვილად\s+)?love\s+me\b/gi, 'გიყვარვარ');
    out = out.replace(/\bhe\s+(?:really\s+|ნამდვილად\s+)?loves?\s+me\b|\bshe\s+(?:really\s+|ნამდვილად\s+)?loves?\s+me\b/gi, 'უყვარვარ');
    out = out.replace(/\bshe\s+(?:really\s+|ნამდვილად\s+)?likes?\s+me\b|\bhe\s+(?:really\s+|ნამდვილად\s+)?likes?\s+me\b/gi, 'მოვწონვარ');
    out = out.replace(/\bi\s+(?:really\s+|ნამდვილად\s+)?miss\s+you\b/gi, 'მენატრები');
    out = out.replace(/\bi\s+(?:really\s+|ნამდვილად\s+)?need\s+you\b/gi, 'მჭირდები');
    out = out.replace(/\bi\s+hate\s+you\b/gi, 'მძულხარ');
    //      Attested be-forms of the liking verbs themselves (same
    //      1st/2nd-person object-agreement rule): მომწონხარ "I like you",
    //      მოგწონვარ "you like me" (zmnebi.com — მოგწონხარ would be
    //      morphologically contradictory: 2SG experiencer + 2SG object).
    out = out.replace(/\bi\s+(?:really\s+|ნამდვილად\s+)?like\s+you\b/gi, 'მომწონხარ');
    out = out.replace(/\byou\s+(?:really\s+|ნამდვილად\s+)?like\s+me\b/gi, 'მოგწონვარ');

    // 4.89 (renumbered 4.88 here in execution order) Untranslated English
    //      affective/emotion verbs → m-class affective carriers (DAT
    //      experiencer; stimulus stays as-is — case repair is the LLM
    //      stages' job, these are lexical carriers). loved/liked past →
    //      affective imperfect (მიყვარდა/მომწონდა), NOT the aorist — the
    //      experiencer frame is tense-stable.
    out = out.replace(/\b(?:i|we|he|she|they)\s+am\s+afraid\b|\bi'?m\s+afraid\b|\bshe'?s\s+afraid\b|\bhe'?s\s+afraid\b|\b(?:are|is)\s+afraid\b/gi, 'მეშინია');
    out = out.replace(/\b(?:i|we)\s+am\s+scared\b|\bi'?m\s+scared\b/gi, 'მეშინია');
    out = out.replace(/\bwe\s+(love|like|hate|want|need)\b/gi, (m, v) => {
        const w = { love: 'გვიყვარს', like: 'გვწონს', hate: 'გვძულს', want: 'გვინდა', need: 'გვჭირდება' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bthey\s+(love|like|hate|want|need)\b/gi, (m, v) => {
        const w = { love: 'უყვართ', like: 'მოსწონთ', hate: 'მძულთ', want: 'უნდათ', need: 'სჭირდებათ' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bshe\s+(loves|likes|hates|wants|needs|fears)\b/gi, (m, v) => {
        const w = { loves: 'უყვარს', likes: 'მოსწონს', hates: 'მძულს', wants: 'უნდა', needs: 'სჭირდება', fears: 'მეშინია' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bhe\s+(loves|likes|hates|wants|needs|fears)\b/gi, (m, v) => {
        const w = { loves: 'უყვარს', likes: 'მოსწონს', hates: 'მძულს', wants: 'უნდა', needs: 'სჭირდება', fears: 'მეშინია' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bi\s+(love|like|hate|want|need|remember|believe)\b/gi, (m, v) => {
        const w = { love: 'მიყვარს', like: 'მომწონს', hate: 'მძულს', want: 'მინდა', need: 'მჭირდება', remember: 'მახსოვს', believe: 'მწამს' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bi\s+(loved|liked|hated|wanted|needed)\b/gi, (m, v) => {
        const w = { loved: 'მიყვარდა', liked: 'მომწონდა', hated: 'მძულდა', wanted: 'მინდოდა', needed: 'მჭირდებოდა' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bi\s+(loved|liked)\s+the\s+(\w+)\b/gi, (m, v, n) =>
        (v.toLowerCase() === 'loved' ? 'მიყვარდა ' : 'მომწონდა ') + n);
    out = out.replace(/\bi\s+(loved|liked)\s+(?!the\b)(\w+)\b/gi, (m, v, n) =>
        (v.toLowerCase() === 'loved' ? 'მიყვარდა ' : 'მომწონდა ') + n);
    out = out.replace(/\byou\s+(love|like|hate|want|need)\b/gi, (m, v) => {
        const w = { love: 'გიყვარს', like: 'მოგწონს', hate: 'გძულს', want: 'გინდა', need: 'გჭირდება' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\byou\s+(loved|liked|hated|wanted|needed)\b/gi, (m, v) => {
        const w = { loved: 'გიყვარდა', liked: 'მოგწონდა', hated: 'გძულდა', wanted: 'გინდოდა', needed: 'გჭირდებოდა' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bhe\s+(loved|liked|hated|wanted|needed)\b/gi, (m, v) => {
        const w = { loved: 'უყვარდა', liked: 'მოსწონდა', hated: 'მძულდა', wanted: 'უნდოდა', needed: 'სჭირდებოდა' }[v.toLowerCase()];
        return w || m;
    });
    out = out.replace(/\bshe\s+(loved|liked|hated|wanted|needed)\b/gi, (m, v) => {
        const w = { loved: 'უყვარდა', liked: 'მოსწონდა', hated: 'მძულდა', wanted: 'უნდოდა', needed: 'სჭირდებოდა' }[v.toLowerCase()];
        return w || m;
    });

    // ── v1.23.0 additions ──

    // 4.90 Reported-question frames: ask/tell/wonder/know + embedded
    //      question → Georgian speech verb + თუ carrier. Runs AFTER the
    //      bare conjunction mappings (4.53 whether→თუ, 4.73 if→თუ,
    //      4.74 when→როცა), so the patterns below accept BOTH the raw
    //      English trigger and its Georgian residue: the თუ/როცa left
    //      behind by 4.53/4.73/4.74 is embedded into the frame whole
    //      (v1.22.0 ნამდვილად-tolerance discipline). The თუ fragment is
    //      guarded by Georgian-boundary lookarounds (NOT \b — Georgian
    //      chars are not \w and \b fails after them; each თუ alternative
    //      self-terminates via its trailing lookahead) so თუმცა inside a
    //      clause never leaks a false match; "whether or not" arrives
    //      as residue "თუ or not" (no bare or/not mappings exist) and
    //      is repaired to the attested concessive carrier თუ არა
    //      (dictionary.ge). Wh-word frames (told me where/what) map
    //      თუ-free: Georgian keeps the wh-word without a carrier.
    const tu = '(?<![\\u10A0-\\u10FF])თუ(?![\\u10A0-\\u10FF])';
    const roca = '(?<![\\u10A0-\\u10FF])როცა(?![\\u10A0-\\u10FF])';
    out = out.replace(new RegExp(`\\b(?:whether|if)\\s+or\\s+not\\b|${tu}\\s+or\\s+not\\b`, 'gi'), 'თუ არა');
    out = out.replace(new RegExp(`\\basked\\s+me\\s+(?:whether|if|${tu})`, 'gi'), 'მკითხა, თუ');
    out = out.replace(new RegExp(`\\basked\\s+(?:him|her)\\s+(?:whether|if|${tu})`, 'gi'), 'ჰკითხა, თუ');
    out = out.replace(new RegExp(`\\basked\\s+(?:us|them)\\s+(?:whether|if|${tu})`, 'gi'), 'ჰკითხა, თუ');
    out = out.replace(new RegExp(`\\basked\\s+(?:whether|if|${tu})`, 'gi'), 'ჰკითხა, თუ');
    out = out.replace(new RegExp(`\\b(?:ask|asked)\\s+(?:to\\s+)?(?:himself|herself|myself|themselves)?\\s*(?:aloud\\s+)?(?:whether|if|${tu})`, 'gi'), 'ჰკითხა, თუ');
    //      "I wonder if" MUST be consumed before the generic wonder
    //      pattern below, or the stranded English "I" would survive
    //      ("I მაინტერესებდა"); "wonders" (present) → მაინტერესებს,
    //      "wonder(ed)" → მაინტერესებდა.
    out = out.replace(new RegExp(`\\bi\\s+wonder\\s+(?:whether|if|${tu})`, 'gi'), 'მაინტერესებს, თუ');
    out = out.replace(new RegExp(`\\bwonders\\s+(?:to\\s+)?(?:himself|herself|myself|themselves)?\\s*(?:aloud\\s+)?(?:whether|if|${tu})`, 'gi'), 'მაინტერესებს, თუ');
    out = out.replace(new RegExp(`\\bwonder(?:ed)?\\s+(?:to\\s+)?(?:himself|herself|myself|themselves)?\\s*(?:aloud\\s+)?(?:whether|if|${tu})`, 'gi'), 'მაინტერესებდა, თუ');
    out = out.replace(new RegExp(`\\btold\\s+me\\s+(where|what|why|who|${roca})`, 'gi'), (m, w) => {
        const map = { where: 'მითხრა, სად', what: 'მითხრა, რა', why: 'მითხრა, რატომ', who: 'მითხრა, ვინ' };
        if (map[w.toLowerCase()]) return map[w.toLowerCase()];
        return 'მითხრა, როდის'; // when / როცა residue → როდის (attested reported-time wh-word)
    });
    out = out.replace(new RegExp(`\\btell\\s+me\\s+(where|what|why|who|${roca})`, 'gi'), (m, w) => {
        const map = { where: 'მითხრა, სად', what: 'მითხრა, რა', why: 'მითხრა, რატომ', who: 'მითხრა, ვინ' };
        if (map[w.toLowerCase()]) return map[w.toLowerCase()];
        return 'მითხრა, როდის'; // when / როცა residue → როდის
    });
    out = out.replace(new RegExp(`\\btold\\s+me\\s+(?:that\\s+)?how\\b`, 'gi'), 'მითხრა, როგორ');
    out = out.replace(new RegExp(`\\btell\\s+me\\s+(?:that\\s+)?how\\b`, 'gi'), 'მითხრა, როგორ');
    //      Attested wh-retention frames (dictionary.ge): "He asked me
    //      where I was going" → მან მკითხა, სად მივდიოდი — speech verb
    //      + KEPT wh-word, statement order, NO თუ carrier, NO question
    //      mark. მკითხა for "asked me" (no h-external), ჰკითხა for
    //      3rd-person/plural objects (h-external). Polar frames are
    //      consumed by the earlier patterns above, so no collision.
    out = out.replace(new RegExp(`\\basked\\s+(me|him|her|us|them)\\s+(where|what|why|who|${roca})`, 'gi'), (m, obj, w) => {
        const verb = obj.toLowerCase() === 'me' ? 'მკითხა' : 'ჰკითხა';
        const map = { where: 'სად', what: 'რა', why: 'რატომ', who: 'ვინ' };
        return verb + ', ' + (map[w.toLowerCase()] || 'როდის'); // when / როცა residue → როდის
    });
    out = out.replace(new RegExp(`\\b(?:don'?t|do not)\\s+know\\s+(?:whether|if|${tu})`, 'gi'), 'არ ვიცი, თუ');
    out = out.replace(new RegExp(`\\b(?:didn'?t|did not)\\s+know\\s+(?:whether|if|${tu})`, 'gi'), 'არ ვიცოდი, თუ');
    out = out.replace(new RegExp(`\\b(?:doesn'?t|does not)\\s+know\\s+(?:whether|if|${tu})`, 'gi'), 'არ იცის, თუ');
    out = out.replace(new RegExp(`\\bwhat\\s+(?:if|${tu})`, 'gi'), 'რა იქნება, რომ');

    // 4.93 Negation carriers (KA-108). Placed at the FUNCTION TAIL — after
    //      4.90 whose frames key on the raw auxiliaries (don't/didn't/doesn't
    //      know if → არ ვიცი, თუ etc.), and after 4.71's didn't even slice —
    //      so only the leftovers reach this general rule.
    //      ORDER MATTERS (longest-first): "do not/does not/did not" before
    //      their contractions is unnecessary (contractions match first, the
    //      spelled forms are separate alternations), but "will not" must run
    //      before "won't" shares the same არ target anyway; crucially
    //      can't-family → ვერ runs BEFORE the general არ family would ever
    //      see it (separate pattern, listed first for clarity).
    //      can't/cannot/couldn't → ვერ (subject-incapacity, Wikibooks:
    //      "ver is only used to indicate that the subject is not able")
    out = out.replace(/\bcan'?t\b/gi, 'ვერ');
    out = out.replace(/\bcannot\b/gi, 'ვერ');
    out = out.replace(/\bcan\s+not\b/gi, 'ვერ');
    out = out.replace(/\bcouldn'?t\b/gi, 'ვერ');
    //      do-support → არ (Georgian has no auxiliary; არ is pre-verbal,
    //      tense lands on the Georgian verb — talkpal.ai placement rule)
    out = out.replace(/\bdon'?t\b/gi, 'არ');
    out = out.replace(/\bdoesn'?t\b/gi, 'არ');
    out = out.replace(/\bdidn'?t\b/gi, 'არ');
    out = out.replace(/\bdo\s+not\b/gi, 'არ');
    out = out.replace(/\bdoes\s+not\b/gi, 'არ');
    out = out.replace(/\bdid\s+not\b/gi, 'არ');
    //      future negation → არ + future screeve residue.
    //      NEGATED FUTURE COPULA frames run BEFORE bare won't (longest-
    //      first — same ordering class as can't-family → ვეর running
    //      before the general არ family): 4.109's won't-be frames were
    //      DEAD CODE because this bare map consumed won't first, leaving
    //      "I won't be here" → "მე არ be აქ" (untranslated be).
    out = out.replace(/\bI\s+won'?t\s+be\b/gi, 'მე არ ვიქნები');
    out = out.replace(/\bwe\s+won'?t\s+be\b/gi, 'ჩვენ არ ვიქნებით');
    out = out.replace(/\b(?:he|she|it)\s+won'?t\s+be\b/gi, 'ის არ იქნება');
    out = out.replace(/\bthey\s+won'?t\s+be\b/gi, 'ისინი არ იქნებიან');
    out = out.replace(/\bwon'?t\s+be\b/gi, 'არ იქნება');
    out = out.replace(/\bwon'?t\b/gi, 'არ');
    out = out.replace(/\bwill\s+not\s+be\b/gi, 'არ იქნება');
    out = out.replace(/\bwill\s+not\b/gi, 'არ');
    //      copula negation: isn't/aren't + Adj → არ არის (talkpal.ai:
    //      ეს არ არის წიგნი). Not mapped when followed by a participle —
    //      4.86's copK pass already consumed that frame earlier.
    out = out.replace(/\bisn'?t\b/gi, 'არ არის');
    out = out.replace(/\baren'?t\b/gi, 'არ არის');

    // 4.94 Time deictics (KA-109). FUNCTION TAIL, after 4.93 — negation
    //      auxiliaries are consumed first ("didn't come yesterday" →
    //      არ გუშინ come residue), then the bare day-words map. ZERO-
    //      POLYSEMY single-word swaps, the proven 4.70/4.72 pattern.
    //      ORDER MATTERS (longest-first):
    //      "the day before yesterday" before "day before yesterday"
    //      before bare "yesterday" — else გუშინწიン degrades to გუშინ;
    //      "right now" before bare "now" — else ახლავე splits.
    out = out.replace(/\bthe\s+day\s+before\s+yesterday\b/gi, 'გუშინწინ');
    out = out.replace(/\bday\s+before\s+yesterday\b/gi, 'გუშინწინ');
    out = out.replace(/\bday\s+after\s+tomorrow\b/gi, 'ზეგ');
    out = out.replace(/\bright\s+now\b/gi, 'ახლავე');
    //      core trio + fused adverbs (folkways.today phrasebook; KA_TIME_EXPR)
    out = out.replace(/\byesterday\b/gi, 'გუშინ');
    out = out.replace(/\btoday\b/gi, 'დღეს');
    out = out.replace(/\btomorrow\b/gi, 'ხვალ');
    out = out.replace(/\btonight\b/gi, 'ამაღამ');
    out = out.replace(/\bnow\b/gi, 'ახლა');
    out = out.replace(/\blater\b/gi, 'მოგვიანებით');

    // 4.95 Possessive determiners (KA-110). FUNCTION TAIL — after every
    //      frame rule that keys on longer tokens ("my own" collocations,
    //      4.88's "loves me" frames, 4.90's ask/tell frames). Only the
    //      DETERMINISTIC set maps; your (T–V register) and her (possessive
    //      vs object) are deliberately left for QA 3.109 + the AI pass.
    //      \b guards against the standalone-pronoun hazard: mine/theirs/
    //      ours/hers never match (\bmy\b cannot match inside "mine" —
    //      no word boundary before the n). Standalone possessive
    //      pronouns stay for the AI pass (coal-mine polysemy).
    //      its → მისი mapped FIRST (\bits\b and any bare-\bit\b rule are
    //      disjoint, but order documents intent).
    //      his → მისი (app2brain: His, Hers, Its → მისი, no gender split).
    out = out.replace(/\bits\b/gi, 'მისი');
    out = out.replace(/\bhis\b/gi, 'მისი');
    out = out.replace(/\bmy\b/gi, 'ჩემი');
    out = out.replace(/\bour\b/gi, 'ჩვენი');
    out = out.replace(/\btheir\b/gi, 'მათი');

    // 4.96 Spatial deictics + existentials (KA-111). FUNCTION TAIL — runs
    //      AFTER 4.91 (There's going to be → იქნება) and 4.92 (There used
    //      to be → იყო ხოლმე) have consumed their frames, so only bare
    //      there is/are/was/were leftovers reach these swaps. ZERO-
    //      POLYSEMY single-word/bigram swaps, the proven 4.94 pattern.
    //      ORDER MATTERS (longest-first):
    //      "right here" before "here" — else აქვე degrades to აქ;
    //      "over there" before "there" — else იქვე degrades to იქ;
    //      "there is no" before "there is" — else negation splits;
    //      there-is/are/was/were before bare "there" — else the dummy
    //      subject leaks to იქ (Georgian has no dummy subject: it DROPS).
    //      იყვნენ is deliberately NOT mapped (animate QA-gated per
    //      Latinum lesson 44) — bare there were → იყო inanimate default.
    //      NARRATIVE INVERSION (attested verb-first: იყო და არსებობდა,
    //      ცხოვრობდა ერთი მეფე): "there lived a king" has no locative
    //      there — DELETE the dummy before inversion verbs, never map იქ
    //      ("at that time there lived a king" → იმ დროს ცხოვრობდა ...).
    //      Same for modal existentials (there will/would/can/could/must/
    //      may/might/should be) — delete, the modal-copula frame is
    //      AI-pass territory (იქნება წვეულება, never *იქ will be).
    out = out.replace(/\bthere\s+(?=(?:lived|stood|sat|lay|hung|appeared|arose|emerged|existed|remained|grew|ruled|reigned)\b)/gi, '');
    out = out.replace(/\bthere\s+(?=(?:will|would|can|could|must|may|might|should)\s+be\b)/gi, '');
    out = out.replace(/\bright\s+here\b/gi, 'აქვე');
    out = out.replace(/\bover\s+there\b/gi, 'იქვე');
    out = out.replace(/\bthere\s+is\s+no\b/gi, 'არ არის');
    out = out.replace(/\bthere\s+is\b/gi, 'არის');
    out = out.replace(/\bthere\s+are\b/gi, 'არის');
    out = out.replace(/\bthere\s+was\b/gi, 'იყო');
    out = out.replace(/\bthere\s+were\b/gi, 'იყო');
    out = out.replace(/\bhere\b/gi, 'აქ');
    out = out.replace(/\bthere\b/gi, 'იქ');

    // 4.97 Bare interrogatives (KA-112). FUNCTION TAIL — after 4.74's
    //      sentence-aware when (questions → როდის already), 4.75 free
    //      relatives (-ც fusions), 4.78 as-family (როგორც), and 4.90's
    //      reported-question frames (asked/told/don't-know + wh kept),
    //      so ONLY direct-question leftovers reach the bare swaps.
    //      ORDER MATTERS (longest-first): where from/where to before
    //      bare where; what for before bare what; how many/how much/
    //      how old before bare how — else რამდენი degrades to რა,
    //      საიდან/საით degrade to სად.
    //      SUPPRESSIONS & CONTRACTIONS: 's-copula contractions map to
    //      wh + არის FIRST (attested: ვინ არის აქ? languages42;
    //      სად არის ..., რა არის ეს?), "what's more" (discourse idiom)
    //      excluded — stays English for the AI pass. "how about"/
    //      "what about" (suggestion idioms, no stable carrier) are
    //      look-ahead-suppressed on the bare words. Case forms stay
    //      bare-nominative (რა/ვინ) — the dative რას / ergative რამ
    //      choice depends on the screeve (Borise: რას ალაგებდა dative
    //      in Series I) and is AI-pass work; the question mark is
    //      preserved by the fix engine.
    //      "what's more" (discourse idiom) is placeholder-protected —
    //      the word "more" is consumed by an earlier rule (→ უფრო),
    //      so the protect must match the ALREADY-SUBSTITUTED residue.
    //      NOTE: \b never matches after Georgian chars (JS \b is
    //      ASCII-word-based) — use a Georgian lookaround instead.
    out = out.replace(/\bwhat'?s\s+(?:more\b|უფრო(?![\u10A0-\u10FF]))/gi, "what's \uE000MORE\uE001");
    out = out.replace(/\bwho'?s\b/gi, 'ვინ არის');
    out = out.replace(/\bwhere'?s\b/gi, 'სად არის');
    out = out.replace(/\bhow'?s\b/gi, 'როგორ არის');
    out = out.replace(/\bwhat'?s\b(?!\s*[\uE000\uE001])/gi, 'რა არის');
    out = out.replace(/\bhow\s+old\b/gi, 'რამდენი წლის');
    out = out.replace(/\bhow\s+many\b/gi, 'რამდენი');
    out = out.replace(/\bhow\s+much\b/gi, 'რამდენი');
    out = out.replace(/\bwhere\s+from\b/gi, 'საიდან');
    out = out.replace(/\bwhere\s+to\b/gi, 'საით');
    out = out.replace(/\bwhat\s+for\b/gi, 'რისთვის');
    out = out.replace(/\bwho\b/gi, 'ვინ');
    out = out.replace(/\bwhat\b(?!\s+about\b)(?!\s*['’]?s\b)/gi, 'რა');
    out = out.replace(/\bwhere\b/gi, 'სად');
    out = out.replace(/\bwhy\b/gi, 'რატომ');
    out = out.replace(/\bhow\b(?!\s+about\b)/gi, 'როგორ');
    out = out.replace(/\bwhich\b/gi, 'რომელი');
    out = out.replace(/\uE000MORE\uE001/gi, 'more');

    // 4.98 Irregular past aorist dictionary (KA-113). FUNCTION TAIL — runs
    //      AFTER 4.90's reported-question frames (asked me where... etc.
    //      already consumed; bare said/told leftovers only), AFTER 4.74's
    //      when and 4.97's bare interrogatives, so the aorist swaps never
    //      fire inside a consumed frame. ZERO-POLYSEMY single-word swaps
    //      EXCEPT the guarded ones:
    //      • said: "said to (someone)" → უთხრა FIRST (Latinum L26: the
    //        თხრ- form takes the indirect object); bare "said" → თქვა.
    //        "said to me" → მითხრა (mi- series) — longest-first.
    //      • took away → წაიღო (წა- away preverb) before bare took → აიღო.
    //      • gave me/you/us → მომცა/მოგცა/მოგვცა (beneficiary fused,
    //        KB m/g/v/gv infixes) before bare gave → მისცა.
    //      • was/were + V-ing is imperfect territory — the aorist map
    //        must NOT touch the progressive: guard with a lookahead on
    //        the -ing participle (saw/thought etc. never take -ing here,
    //        but "said" inside "was saying" would wrongly aorist-ize).
    //      NOTE: \b never matches after Georgian chars (JS \b is
    //      ASCII-word-based) — Georgian lookarounds where needed.
    out = out.replace(/\bsaid\s+to\s+me\b/gi, 'მითხრა');
    out = out.replace(/\bsaid\s+to\b/gi, 'უთხრა');
    out = out.replace(/\btold\b/gi, 'უთხრა');
    out = out.replace(/\bsaid\b/gi, 'თქვა');
    out = out.replace(/\btook\s+away\b/gi, 'წაიღო');
    out = out.replace(/\bgave\s+me\b/gi, 'მომცა');
    out = out.replace(/\bgave\s+you\b/gi, 'მოგცა');
    out = out.replace(/\bgave\s+us\b/gi, 'მოგვცა');
    out = out.replace(/\bgave\b/gi, 'მისცა');
    out = out.replace(/\btook\b/gi, 'აიღო');
    out = out.replace(/\bbrought\b/gi, 'მოიტანა');
    out = out.replace(/\bfound\b/gi, 'იპოვა');
    out = out.replace(/\bmade\b/gi, 'გააკეთა');
    out = out.replace(/\bsaw\b/gi, 'დაინახა');
    out = out.replace(/\bthought\b/gi, 'იფიქრა');
    out = out.replace(/\bknew\b/gi, 'იცოდა');
    out = out.replace(/\bfelt\b/gi, 'იგრძნო');
    out = out.replace(/\bwrote\b/gi, 'დაწერა');

    // 4.99 Demonstratives (KA-114). FUNCTION TAIL — runs AFTER 4.97's bare
    //      interrogatives and 4.98's aorist swaps. SPLIT-SCOPED: only the
    //      near-unambiguous forms are mapped; BARE "that" is deliberately
    //      NOT mapped (complementizer რომ vs demonstrative vs so/such...
    //      that — undecidable deterministically, KA-114 DO-NOT-MAP).
    //      LONGEST-FIRST: standalone plurals ესინი/ისინი before the
    //      number-neutral determiners ეს/ის.
    //      • this → ეს ALWAYS (Latinum L40: ეს covers singular and
    //        plural as a determiner; also the emphatic pronoun).
    //      • these + noun → ეს (determiner); these NOT followed by a
    //        noun (standalone pronoun) → ესინი (parryc PL ესინი).
    //      • those + noun → ის (determiner: ის წიგნები); standalone
    //        those → ისინი (Latinum L38: ისინი = they).
    //      NOTE: \b never matches after Georgian chars (JS \b is
    //      ASCII-word-based) — safe to run after earlier Georgian swaps.
    out = out.replace(/\bthese\b(?!\s+[a-z])/gi, 'ესინი');
    out = out.replace(/\bthese\b/gi, 'ეს');
    out = out.replace(/\bthose\b(?!\s+[a-z])/gi, 'ისინი');
    out = out.replace(/\bthose\b/gi, 'ის');
    out = out.replace(/\bthis\b/gi, 'ეს');

    // 4.100 Coordinating conjunctions (KA-115). FUNCTION TAIL — runs AFTER
    //      every compound-conjunction rule (but also/but rather→არამედ,
    //      not only/not just→არა მხოლოდ, not even→არც კი, either→ან,
    //      neither/nor→არც, although/though/however→თუმცა, because→
    //      იმიტომ რომ, if→თუ, also→ასევე), so bare and/but/or here only
    //      sees true leftovers. PUNCTUATION (KA-115): NO comma before და
    //      joining clauses; comma BEFORE მაგრამ — punctuation is the
    //      DRAFT's job, the swaps below never insert commas.
    //      NOTE: \b never matches after Georgian chars (JS \b is
    //      ASCII-word-based) — safe to run after earlier Georgian swaps.
    //      "either or" → ან ან (either→ან upstream, then or→ან) —
    //      exactly the attested ან...ან frame.
    out = out.replace(/\band\b/gi, 'და');
    out = out.replace(/\bbut\b/gi, 'მაგრამ');
    out = out.replace(/\bor\b/gi, 'ან');

    // 4.101 Politeness formulas & dialogue interjections (KA-116).
    //      FUNCTION TAIL — runs after every frame rule that consumes the
    //      longer surroundings (4.90 don't-know frames, 4.96 there-is-no,
    //      4.94 later→მოგვიანებით, 4.97 wh-swaps), so only the fixed
    //      formulas and their bare leftovers reach these swaps.
    //      ZERO-POLYSEMY formula swaps (kahibaro 6.2, georgianlanguage.
    //      online, Wiktionary Basic Georgian glossary, geolang.ru).
    //      ORDER MATTERS (longest-first):
    //      "no thank you/thanks" (refusal formula → არა, მადლობა) before
    //      bare thanks/no; "thank you very much" (→ დიდი მადლობა, kahibaro)
    //      before "thank you" — BUT 4.69 already turned "very much"→ძალიან,
    //      so the compound only catches a lot/so much; the ძალიან residue
    //      is repaired to დიდი მადლობა after the bare thanks swap. "good
    //      morning/evening/night" (X მშვიდობისა "X of peace") before any
    //      bare residue; "see you later" must match the ALREADY-SUBSTITUTED
    //      residue (4.94 turned later→მოგვიანებით) — and the \b must sit on
    //      the LATIN branch only (JS \b never matches against Georgian
    //      chars) — same precedent as 4.97's "what's more".
    //      DELIBERATE SPLIT on "no": answer-particle (before punctuation —
    //      INCLUDING the auto-appended  danda from 4.19 — or string end)
    //      → არა; determiner "no money/no problem" stays Latin — negation
    //      placement is screeve-dependent, AI-pass (KB 4.11: do-support →
    //      არ + verb).
    //      Bare yes → კი (Wiktionary neutral register; დიახ formal and
    //      ხო/ჰო informal are AI-pass choices). sorry→ბოდიში (actual
    //      apology); excuse me→უკაცრავად (introductory — geolang.ru).
    //      Address: sir→ბატონო, madam/ma'am→ქალბატონო, Mr./Mrs./Ms.→
    //      ბატონო/ქალბატონო (abb. dot consumed — Georgian uses none).
    //      NOTE: \b never matches after Georgian chars (JS \b is
    //      ASCII-word-based) — safe to run after earlier Georgian swaps.
    //      "no, thank you" (with comma) also reaches the refusal rule.
    out = out.replace(/\bno[,]?\s+(?:thank you|thanks)\b/gi, 'არა, მადლობა');
    out = out.replace(/\b(?:thank you|thanks)\s+(?:very much|a lot|so much)\b/gi, 'დიდი მადლობა');
    out = out.replace(/\byou'?re\s+welcome\b/gi, 'არაფრის');
    out = out.replace(/\byou\s+are\s+welcome\b/gi, 'არაფრის');
    out = out.replace(/\bgood\s+morning\b/gi, 'დილა მშვიდობისა');
    out = out.replace(/\bgood\s+evening\b/gi, 'საღამო მშვიდობისა');
    out = out.replace(/\bgood\s+night\b/gi, 'ღამე მშვიდობისა');
    out = out.replace(/\bsee\s+you\s+(?:მოგვიანებით|later)/gi, 'მერე გნახავთ');
    out = out.replace(/\bexcuse\s+me\b/gi, 'უკაცრავად');
    out = out.replace(/\bof\s+course\b/gi, 'რა თქმა უნდა');
    out = out.replace(/\bma'?am\b/gi, 'ქალბატონო');
    out = out.replace(/\bmadam\b/gi, 'ქალბატონო');
    out = out.replace(/\bsir\b/gi, 'ბატონო');
    out = out.replace(/\bMrs\.?/gi, 'ქალბატონო');
    out = out.replace(/\bMs\.?/gi, 'ქალბატონო');
    out = out.replace(/\bMr\.?/gi, 'ბატონო');
    out = out.replace(/\bthank\s+you\b/gi, 'მადლობა');
    out = out.replace(/\bthanks\b/gi, 'მადლობა');
    // 4.69 already turned "very much"→ძალიან, so "thank you very much" ends
    // up as "მადლობა ძალიან" — repair it to the attested დიდი მადლობა
    // ("big thanks", kahibaro).
    out = out.replace(/მადლობა\s+ძალიან/g, 'დიდი მადლობა');
    out = out.replace(/\bplease\b/gi, 'გთხოვთ');
    out = out.replace(/\bsorry\b/gi, 'ბოდიში');
    out = out.replace(/\bhello\b/gi, 'გამარჯობა');
    out = out.replace(/\bhi\b/gi, 'გამარჯობა');
    out = out.replace(/\bgoodbye\b/gi, 'ნახვამდის');
    out = out.replace(/\bbye\b/gi, 'ნახვამდის');
    out = out.replace(/\bokay\b/gi, 'კარგი');
    out = out.replace(/\bok\b/gi, 'კარგი');
    out = out.replace(/\byes\b/gi, 'კი');
    out = out.replace(/\bno(?=\s*[,;.!?…:—]|\s*$)/gi, 'არა');

    // 4.107 (v1.40.0, KA-122) Quantifier series → Georgian amount
    //      carriers. FUNCTION TAIL placement — MUST run AFTER every
    //      rule that owns a longer quantifier phrase: 4.97 how-family
    //      (how much/many → რამდენი), 4.103 ago-construction ("many/
    //      several years ago" → მრავალი/რამდენიმე ... წინ — its
    //      callback consumes the WHOLE phrase, so bare many/several
    //      would otherwise corrupt it), 4.103 all-frames (all day →
    //      მთელი დღე — bare whole/all must not double-map), 4.103
    //      "a little while ago"/"a short time ago" → ცოტა ხნის წინ,
    //      4.69 very much → ძალიან, 4.94 thank-you compounds → დიდი
    //      მადლობა, and 4.99-4.101 bare-word politeness tails. At the
    //      tail, all these frames have already been consumed into
    //      Georgian, so the surviving English quantifier tokens are
    //      genuinely bare.
    //      4.107a correlative first: "both X and Y" → როგორც X, ისე Y
    //      (KB-attested pattern: როგორც მამა, ისე შვილი — no earlier
    //      fix rule owns the correlative, so it is mapped HERE, before
    //      bare-both, never degrading to ორივე...და). X/Y = 1-2 word
    //      noun phrases in either script; and-or its 4.100 residue და
    //      (standalone — lookarounds, since \b never matches Georgian
    //      chars; დახმარება/დაინახა cannot false-positive). Then
    //      pronoun partitives (both of them/us/you → ორივე
    //      მათგანი/ჩვენგანი/თქვენგანი, nominative default — case
    //      refinement is AI/QA work), then bare both → ორივე.
    //      Excluded from mechanical mapping (AI/KB-only, per
    //      KA-122 POLYSEMY): bare much (verb-position), bare most
    //      ("the most [adj]" superlative → ყველაზე via comparison
    //      fixes; "at most" is idiomatic), bare little (amount
    //      ცოტა vs size პატარა), bare a lot (adverbial), ზღვა
    //      (determiner "many" attested but "sea" dominates).
    out = out.replace(
        /\bboth\s+((?:[\u10A0-\u10FF]+|[a-z']+)(?:\s+(?:[\u10A0-\u10FF]+|[a-z']+))?)\s+(?:\band\b|(?<![\u10A0-\u10FF])და(?![\u10A0-\u10FF]))\s+((?:[\u10A0-\u10FF]+|[a-z']+)(?:\s+(?:[\u10A0-\u10FF]+|[a-z']+))?)/gi,
        'როგორც $1, ისე $2'
    );
    out = out.replace(/\bboth\s+of\s+them\b/gi, 'ორივე მათგანი');
    out = out.replace(/\bboth\s+of\s+us\b/gi, 'ორივე ჩვენგანი');
    out = out.replace(/\bboth\s+of\s+you\b/gi, 'ორივე თქვენგანი');
    out = out.replace(/\bplenty\s+of\b/gi, 'ბევრი');
    out = out.replace(/\ba\s+lot\s+of\b/gi, 'ბევრი');
    out = out.replace(/\blots\s+of\b/gi, 'ბევრი');
    out = out.replace(/\bthe\s+whole\b/gi, 'მთელი');
    out = out.replace(/\bwhole\b/gi, 'მთელი');
    out = out.replace(/\bhalf\s+an\s+hour\b/gi, 'ნახევარი საათი');
    out = out.replace(/\bhalf\s+a\b/gi, 'ნახევარი');
    out = out.replace(/\bhalf\s+the\b/gi, 'ნახევარი');
    out = out.replace(/\bhalf\b/gi, 'ნახევარი');
    out = out.replace(/\bboth\b/gi, 'ორივე');
    out = out.replace(/\bmajority\b/gi, 'უმეტესობა');
    out = out.replace(/\bseveral\b/gi, 'რამდენიმე');
    out = out.replace(/\bmany\b/gi, 'მრავალი');
    // 4.107b singular agreement — runs OUTSIDE the both...and guard:
    //      AI output can equally carry plural nouns after quantifier
    //      carriers (ბევრი წიგნები → ბევრი წიგნი; dictionary.ge norm:
    //      რამდენიმე წიგნი, NOT *რამდენიმე წიგნები). Georgian plural
    //      morphology has THREE classes, so a naive strip is unsafe —
    //      a callback classifies each noun:
    //      1. RESTORE map: elided ა-stems whose plural drops the
    //         grade-vowel (წლები→წელი, ხნები→ხანი) — strip AND
    //         restore the vowel.
    //      2. EXCLUSION list: syncopated plural stems where stripping
    //         yields a non-word (მშობლები→*მშობლი, the true singular
    //         is მშობელი; სიტყვები→*სიტყვი vs სიტყვა; მწერლები,
    //         ცხვრები, მხედრები, მოსწავლები, სიზმრები, ზმნები) and
    //         elided ა-stems needing restoration not in the map
    //         (ზღვები→ზღვა, მიწები, დროშები, ქვეყნები, კალათები,
    //         ტბები, ხმები, თმები, რქები) — left for QA/AI.
    //      3. V+რ-final stems (კვირები→კვირა, ფანჯრები→ფანჯარა) —
    //         რ-final nouns are virtually all ა-stems; excluded.
    //      4. Vowel-final stems (ე-stems მხარეები, დღეები — stripping
    //         yields *მხარეი; also full-grade ა-stems) — unchanged.
    //      5. SAFE DEFAULT: consonant-final stems ≥3 chars keep the
    //         consonant and take -ი directly (წიგნები→წიგნი,
    //         სახლები→სახლი, კაცები→კაცი, ხელები→ხელი, თავები→თავი,
    //         წუთები→წუთი, ბავშვები→ბავშვი) — the epenthetic -ებ-
    //         contributes no vowel here.
    //      Oblique/plural-compound suffixes (მა/ს/ის/ით/ად/ო/ში/ზე/
    //      თან) are preserved as-is; მთელი deliberately not in the
    //      carrier set (its plural is not normatively banned).
    out = out.replace(
        /(^|\s)(ბევრი|მრავალი|რამდენიმე|ცოტა|ორივე|უამრავი)\s+([ა-ჰ]+)ებ(ი|მა|ს|ის|ით|ად|ო|ში|ზე|თან)(?![\u10A0-\u10FF])/g,
        (m, pre, q, stem, suf) => {
            const restore = { 'წლ': 'წელ', 'ხნ': 'ხან' };
            if (restore[stem] && suf === 'ი') return pre + q + ' ' + restore[stem] + suf;
            if (/(?:სიტყვ|სიზმრ|ზმნ|მშობლ|მწერლ|ცხვრ|მხედრ|მოსწავლ|ზღვ|მთ|ტბ|ხმ|თმ|რქ|მიწ|დროშ|ქვეყნ|კალათ)$/.test(stem)) return m;
            if (/[აეიოუ][რ]$/.test(stem)) return m;
            if (/[აეიოუ]$/.test(stem) || stem.length < 3) return m;
            return pre + q + ' ' + stem + suf;
        }
    );

    // 4.109 (v1.42.0, KA-124) Modals & auxiliaries → Georgian carriers.
    //      Runs IMMEDIATELY BEFORE 4.108: subject+modal and
    //      subject+copula frames are consumed ATOMICALLY (I can →
    //      შემიძლია, I am → მე ვარ) — if the bare-pronoun pass ran
    //      first, the pronoun would be stripped and the person
    //      agreement inside the შე-ძლია prefix / copula form lost.
    //      DOCTRINE (KA_MODALITY + KA-124): Georgian has no
    //      auxiliary verbs and no inflecting modals.
    //      ABILITY = impersonal dative-experiencer შე-ძლია family
    //      (talkpal.ai: "it is possible for [someone]"; the person
    //      lives in the pre-radical prefix — შემიძლია/შეუძლია/
    //      შეგვიძლია; past შემეძლო-series; kaikki.org შეძლო paradigm).
    //      OBLIGATION = უნდა + optative (sjani.ge: unda tsavikitkho);
    //      უნდა is INVARIABLE — NEVER *უნდება / *უნდავს.
    //      PERMISSION = შეიძლება (impersonal; იქნებ is the literary
    //      "perhaps" variant). FUTURE COPULA — the NEGATED frames
    //      (won't be / will not be) live in 4.93 BEFORE its bare
    //      won't → არ map (longest-first; bare map stranded the
    //      copula as "მე არ be"); POSITIVE will be frames live HERE.
    //      COPULA = მე ვარ, შენ ხარ, ის არის, ჩვენ ვართ, თქვენ ხართ,
    //      ისინი არიან (Peace Corps guide); past ვიყავი, იყავი, იყო,
    //      ვიყავით, იყავით, იყვნენ; negation PRECEDES the copula:
    //      არ ვარ, არ არის, არ ვიყავი, არ იყო (latinum L56: არ before
    //      consonants, არა before vowels).
    //      you-forms are deliberately NOT mapped (T–V register,
    //      KA-52/3.58): you are → ხარ vs ხართ, you can → შეგიძლია vs
    //      შეგიძლიათ — QA 3.123 + AI-pass decide.
    //      do/does/did (do-support) — see section 5: bare auxiliaries
    //      are LEFT for QA 3.123 + AI-pass (a mechanical drop cannot
    //      tell auxiliary from main verb). Question inversion
    //      (are we, is he, was she) maps via the same paradigm.
    //      BARE can/could/must/should/may/will/would/have with no
    //      mapped subject are LEFT (subject unknown or non-pronominal
    //      — person agreement would be a guess) and handed to
    //      QA 3.123 + AI. Bare do/does/did are likewise LEFT —
    //      dropping them corrupts main-verb do ("do homework",
    //      "what does it mean") and erases the interrogative signal
    //      of inversion ("do you know?") — QA 3.123 flags the bare
    //      aux and the AI-pass drops it on screeve rebuild.
    //      ORDER GUARD: must NOT touch "there is/are/was/were"
    //      (4.96 existentials own არის/არიან/იყო there) — lookbehind
    //      on "there " keeps those frames intact.
    //      1. ABILITY — subject + can/could → შე-ძლია family
    out = out.replace(/\bI\s+can'?t?\b/gi, (m) => (/n't/i.test(m) ? 'ვერ შემიძლია' : 'შემიძლია'));
    out = out.replace(/\bwe\s+can'?t?\b/gi, (m) => (/n't/i.test(m) ? 'ვერ შეგვიძლია' : 'შეგვიძლია'));
    out = out.replace(/\b(?:he|she)\s+can'?t?\b/gi, (m) => (/n't/i.test(m) ? 'ვერ შეუძლია' : 'შეუძლია'));
    out = out.replace(/\bthey\s+can'?t?\b/gi, (m) => (/n't/i.test(m) ? 'ვერ შეუძლიათ' : 'შეუძლიათ'));
    out = out.replace(/\bI\s+could\b/gi, 'შემეძლო');
    out = out.replace(/\bwe\s+could\b/gi, 'შეგვეძლო');
    out = out.replace(/\b(?:he|she)\s+could\b/gi, 'შეეძლო');
    out = out.replace(/\bthey\s+could\b/gi, 'შეეძლოთ');
    //      1b. PERSON RESTORE after 4.93 — 4.93 (can't/cannot/
    //      couldn't → ვერ) runs BEFORE this rule, so "I can't swim"
    //      arrives here as "I ვერ swim" with the pronoun intact but
    //      unregistered. The pronoun is kept and the pair normalized
    //      to person+ Georgian (მე ვერ, ის ვერ) — Georgian negated
    //      ability renders as ვერ + verb screeve (the ვერ already
    //      sits before the verb residue), never as a bare
    //      subjectless ვერ (KA-124: dative-experiencer frame).
    out = out.replace(/\bI\s+ვერ(?![\u10A0-\u10FF])/gi, 'მე ვერ');
    out = out.replace(/\bwe\s+ვერ(?![\u10A0-\u10FF])/gi, 'ჩვენ ვერ');
    out = out.replace(/\b(?:he|she)\s+ვერ(?![\u10A0-\u10FF])/gi, 'ის ვერ');
    out = out.replace(/\bthey\s+ვერ(?![\u10A0-\u10FF])/gi, 'ისინი ვერ');
    //      2. OBLIGATION — must/should/have-to → უნდა (invariable).
    //      Negated frames first (mustn't/shouldn't): არ უნდა. The
    //      subject pronoun STAYS — the optative rebuild needs the
    //      person cue (მე არ უნდა წავიდე); pro-drop 3.19 trims it
    //      later if redundant.
    out = out.replace(/\bI\s+(?:mustn'?t|shouldn'?t)\b/gi, 'მე არ უნდა');
    out = out.replace(/\bwe\s+(?:mustn'?t|shouldn'?t)\b/gi, 'ჩვენ არ უნდა');
    out = out.replace(/\b(?:he|she|it)\s+(?:mustn'?t|shouldn'?t)\b/gi, 'ის არ უნდა');
    out = out.replace(/\bthey\s+(?:mustn'?t|shouldn'?t)\b/gi, 'ისინი არ უნდა');
    out = out.replace(/\bI\s+(?:must|should)\b/gi, 'მე უნდა');
    out = out.replace(/\bwe\s+(?:must|should)\b/gi, 'ჩვენ უნდა');
    out = out.replace(/\b(?:he|she|it)\s+(?:must|should)\b/gi, 'ის უნდა');
    out = out.replace(/\bthey\s+(?:must|should)\b/gi, 'ისინი უნდა');
    out = out.replace(/\bI\s+have\s+to\b/gi, 'მე უნდა');
    out = out.replace(/\bwe\s+have\s+to\b/gi, 'ჩვენ უნდა');
    out = out.replace(/\b(?:he|she|it)\s+has\s+to\b/gi, 'ის უნდა');
    out = out.replace(/\bthey\s+have\s+to\b/gi, 'ისინი უნდა');
    out = out.replace(/\bI\s+had\s+to\b/gi, 'მე უნდა');
    out = out.replace(/\bwe\s+had\s+to\b/gi, 'ჩვენ უნდა');
    out = out.replace(/\b(?:he|she|it)\s+had\s+to\b/gi, 'ის უნდა');
    out = out.replace(/\bthey\s+had\s+to\b/gi, 'ისინი უნდა');
    //      bare (subjectless/modal-frame) obligation residue — after
    //      the pronoun frames consumed theirs: must/should/have to/
    //      has to/had to/have got to → უნდა; shouldn't/mustn't →
    //      არ უნდა. Question inversion (must I, should we) also lands
    //      here after its subject is already gone? No — inversion
    //      keeps subject AFTER the modal: handled by the pronoun
    //      swaps in 4.108 leaving უნდა + მე. The bare map below only
    //      fires when NO mapped carrier precedes.
    out = out.replace(/\bmustn'?t\b/gi, 'არ უნდა');
    out = out.replace(/\bshouldn'?t\b/gi, 'არ უნდა');
    out = out.replace(/\bhave\s+got\s+to\b/gi, 'უნდა');
    out = out.replace(/\b(?:must|have\s+to|has\s+to|had\s+to|should)\b/gi, 'უნდა');
    //      3. PERMISSION / POSSIBILITY — may/might → შეიძლება.
    //      "may I/we" consumed FIRST (polite request frame); the
    //      month guard preserves capital "May" verbatim — მაისი
    //      polysemy (4.102: May/rowan) — only lowercase may maps.
    //      might has no homograph and maps unconditionally.
    out = out.replace(/\bmay\s+(I|we)\b/gi, 'შეიძლება $1');
    out = out.replace(/\bmay\b/g, (m) => (m[0] === 'M' ? 'May' : 'შეიძლება'));
    out = out.replace(/\bmight\b/gi, 'შეიძლება');
    //      4. FUTURE COPULA (positive will be) — the NEGATED frames
    //      (won't be / will not be) are consumed EARLIER by 4.93, before
    //      its bare won't → არ map could strand the copula ("მე არ be").
    //      Positive will be has NO owner (4.91 owns going-to-be only;
    //      4.81 owns will go/will come) — a closed copula paradigm
    //      (KA-124: ვიქნები, იქნება, ვიქნებით, იქნებიან), so a
    //      deterministic person-marked mapping is KB-consistent.
    //      BARE "will be" (no subject) is deliberately LEFT: without a
    //      person it cannot pick a form safely ("you will be" would
    //      wrongly take 3sg იქნება — same T–V/animacy guard as bare
    //      are/were). QA 3.123 mdBe flags it; AI-pass decides.
    out = out.replace(/\bI\s+will\s+be\b/gi, 'მე ვიქნები');
    out = out.replace(/\bwe\s+will\s+be\b/gi, 'ჩვენ ვიქნებით');
    out = out.replace(/\b(?:he|she|it)\s+will\s+be\b/gi, 'ის იქნება');
    out = out.replace(/\bthey\s+will\s+be\b/gi, 'ისინი იქნებიან');
    //      5. DO-SUPPORT — bare do/does/did are NOT dropped here.
    //      A mechanical drop cannot tell auxiliary from main verb
    //      ("do homework" is lexical) and erases the interrogative
    //      marker of inversion ("Do you know?" — without "do" the
    //      AI-pass would read a declarative). Negated forms are
    //      already 4.93's (don't/doesn't/didn't → არ); the bare
    //      auxiliaries are left in the draft, flagged by QA 3.123
    //      (mdAux: will|would|do|does|did), and dropped by the
    //      AI-pass during screeve rebuild.
    //      6. COPULA — present/past, negated first. The pronoun is
    //      kept in the output (მე ვარ) — Georgian 1st/2nd person
    //      REQUIRES the copula and the pronoun is common in narration
    //      (მე ვარ მასწავლებელი); pro-drop trimming is 3.19's job.
    //      NEGATED frames before positive (isn't/aren't already →
    //      არ არის in 4.93; here: am not/was not/were not leftovers).
    out = out.replace(/\bI\s+am\s+not\b/gi, 'მე არ ვარ');
    out = out.replace(/\bI'?m\s+not\b/gi, 'მე არ ვარ');
    out = out.replace(/\bwe\s+are\s+not\b/gi, 'ჩვენ არ ვართ');
    out = out.replace(/\bwe'?re\s+not\b/gi, 'ჩვენ არ ვართ');
    out = out.replace(/\bthey\s+are\s+not\b/gi, 'ისინი არ არიან');
    out = out.replace(/\bthey'?re\s+not\b/gi, 'ისინი არ არიან');
    out = out.replace(/\b(?:he|she)\s+is\s+not\b/gi, 'ის არ არის');
    //      contracted he's/she's not → ის არ არის (it's is excluded —
    //      dummy-it/cleft polysemy is AI-gated, 4.108 doctrine).
    out = out.replace(/\b(?:he|she)'s\s+not\b/gi, 'ის არ არის');
    //      past-negated frames (4.93 does NOT own wasn't/weren't) —
    //      person-marked first; არ PRECEDES the copula (latinum L56).
    out = out.replace(/\bI\s+wasn'?t\b/gi, 'მე არ ვიყავი');
    out = out.replace(/\bwe\s+weren'?t\b/gi, 'ჩვენ არ ვიყავით');
    out = out.replace(/\bthey\s+weren'?t\b/gi, 'ისინი არ იყვნენ');
    out = out.replace(/\b(?:he|she)\s+wasn'?t\b/gi, 'ის არ იყო');
    out = out.replace(/\bit\s+wasn'?t\b/gi, 'ის არ იყო');
    out = out.replace(/\bI\s+was\s+not\b/gi, 'მე არ ვიყავი');
    out = out.replace(/\bwe\s+were\s+not\b/gi, 'ჩვენ არ ვიყავით');
    out = out.replace(/\bthey\s+were\s+not\b/gi, 'ისინი არ იყვნენ');
    out = out.replace(/\b(?:he|she|it)\s+was\s+not\b/gi, 'ის არ იყო');
    //      bare residue: wasn't/was not → არ იყო (person-invariant);
    //      weren't/were not LEFT — animacy decides (არ იყვნენ animate
    //      vs არ იყო inanimate: Georgian inanimate PLURAL subjects
    //      take SINGULAR verb agreement) → AI-pass.
    out = out.replace(/\bwasn'?t\b/gi, 'არ იყო');
    out = out.replace(/\bwas\s+not\b/gi, 'არ იყო');
    //      positive frames — subject+copula atomically:
    out = out.replace(/\bI\s+am\b/gi, 'მე ვარ');
    out = out.replace(/\bwe\s+are\b/gi, 'ჩვენ ვართ');
    out = out.replace(/\bthey\s+are\b/gi, 'ისინი არიან');
    out = out.replace(/\b(?:he|she)\s+is\b/gi, 'ის არის');
    out = out.replace(/\bI\s+was\b/gi, 'მე ვიყავი');
    out = out.replace(/\bwe\s+were\b/gi, 'ჩვენ ვიყავით');
    out = out.replace(/\bthey\s+were\b/gi, 'ისინი იყვნენ');
    out = out.replace(/\b(?:he|she|it)\s+was\b/gi, 'ის იყო');
    //      question inversion + bare copula (subject AFTER or absent):
    //      am I → ვარ, are we → ვართ, is he → არის, was she → იყო —
    //      the postposed subject then maps via 4.108's bare swaps
    //      (are we here → ვართ ჩვენ აქ). there-frames are guarded:
    //      the lookbehind below only fires when NOT preceded by
    //      "there ".
    out = out.replace(/\bam\s+I\b/gi, 'ვარ მე');
    out = out.replace(/\bare\s+we\b/gi, 'ვართ ჩვენ');
    out = out.replace(/\bare\s+they\b/gi, 'არიან ისინი');
    out = out.replace(/\bis\s+(?:he|she)\b/gi, 'არის ის');
    out = out.replace(/\bwas\s+I\b/gi, 'ვიყავი მე');
    out = out.replace(/\bwere\s+we\b/gi, 'ვიყავით ჩვენ');
    out = out.replace(/\bwere\s+they\b/gi, 'იყვნენ ისინი');
    out = out.replace(/\bwas\s+(?:he|she|it)\b/gi, 'იყო ის');
    //      bare copula residue LAST (after every framed form).
    //      Only the person-UNAMBIGUOUS forms map: am → ვარ
    //      (exclusively 1sg), is → არის (exclusively 3sg), was →
    //      იყო (safe default — past copula; inanimate-plural
    //      subjects also take the singular იყო). bare are/were are
    //      LEFT untranslated: are spans 2sg (T–V gated, ხარ vs
    //      ხართ) / 1pl / 3pl-animate; were spans 2pl (T–V) /
    //      animate-plural / inanimate-plural-singular-agreement /
    //      subjunctive (if I were) — person or animacy would be a
    //      guess → QA 3.123 (mdBe) flags them and the AI-pass
    //      decides.
    out = out.replace(/\bam\b/gi, 'ვარ');
    out = out.replace(/\bis\b/gi, 'არის');
    out = out.replace(/\bwas\b/gi, 'იყო');

    // 4.108 (v1.41.0, KA-123) Personal pronouns → Georgian cased
    //      carriers. ABSOLUTE FUNCTION TAIL — runs after EVERY rule
    //      that consumes a pronoun-containing phrase: 4.90 reported-
    //      question frames (told me / asked me), 4.92 hortatives
    //      (let me/let's), 4.92-family affectives (loves me →
    //      უყვარვარ, I am afraid → მეშინია), 4.91/4.92 going-to-be
    //      frames (I/we/they/you 're going to be), 4.98 aorist
    //      dictionary (said to me → მითხრა, gave me → მომცა), 4.99
    //      demonstratives (these/those + noun), 4.100 conjunctions,
    //      4.101 politeness (you're welcome → არაფრის, see you later),
    //      4.102-4.103 time frames, 4.107 quantifiers (both of them/
    //      us/you partitives). Only genuinely bare tokens remain.
    //      1st/2nd person case-invariant (მე/ჩვენ serve NOM and DAT
    //      alike — en.wiktionary მე), 3rd person suppletive: subject
    //      he/she → ის (NO gender), object him → მას (dative),
    //      them → მათ (dative/plural-ergative homograph). they →
    //      ისინি (animate subject default). you is QA-gated (T–V
    //      register, KA-52) and it is AI-gated (dummy subject /
    //      cleft polysemy) — neither maps mechanically.
    //      CONTRACTION GUARD: \b matches inside contractions ("I'm"
    //      → boundary before m), so I'm/I'll/I've/I'd/you're/it's
    //      are placeholder-protected FIRST — the full contraction is
    //      restored verbatim after the bare swaps, leaving the
    //      auxiliary residue for the AI pass instead of degrading to
    //      a wrong bare pronoun + orphan fragment.
    //      PLACEHOLDER DESIGN (bug fix): the original placeholder
    //      embedded the pronoun letter (\uE000I\uE001) — but \uE000 is
    //      a non-word char, so \bI\b matched INSIDE the placeholder
    //      and clobbered it. Fix: placeholders are \uE000<index>\uE001
    //      with the original text kept in a per-call array; digits are
    //      \w so no bare-pronoun \b regex can match inside, and the
    //      restore returns the exact original contraction.
    //      NOTE: \b never matches after Georgian chars — safe after
    //      earlier Georgian swaps.
    const savedContr = [];
    const protectContr = (m) => { savedContr.push(m); return '\uE000' + (savedContr.length - 1) + '\uE001'; };
    out = out.replace(/\bI(?:'m|'ll|'ve|'d)\b/gi, protectContr);
    out = out.replace(/\byou(?:'re|'ll|'ve|'d)\b/gi, protectContr);
    out = out.replace(/\bwe(?:'re|'ll|'ve|'d)\b/gi, protectContr);
    out = out.replace(/\bthey(?:'re|'ll|'ve|'d)\b/gi, protectContr);
    out = out.replace(/\bit(?:'s|'ll|'ve|'d)\b/gi, protectContr);
    out = out.replace(/\bhe(?:'s|'ll|'ve|'d)\b/gi, protectContr);
    out = out.replace(/\bshe(?:'s|'ll|'ve|'d)\b/gi, protectContr);
    out = out.replace(/\bI\b/gi, 'მე');
    out = out.replace(/\bme\b/gi, 'მე');
    out = out.replace(/\bwe\b/gi, 'ჩვენ');
    out = out.replace(/\bus\b/gi, 'ჩვენ');
    out = out.replace(/\bshe\b/gi, 'ის');
    out = out.replace(/\bhe\b/gi, 'ის');
    out = out.replace(/\bhim\b/gi, 'მას');
    out = out.replace(/\bthem\b/gi, 'მათ');
    out = out.replace(/\bthey\b/gi, 'ისინი');
    out = out.replace(/\uE000(\d+)\uE001/g, (m, i) => savedContr[+i]);

    return out;
}

// ── 5. REGISTRIES (for status panel display) ────────────────────────────────
const GEORGIAN_KNOWLEDGE_VERSION = '1.47.0';
const GEORGIAN_KNOWLEDGE_STATS = {
    promptBlocks: 132,
    qaRules: 128,
    autoFixes: 113,
    researchSources: 388
};

// ── 6. NODE EXPORT (test harness mirror) ────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        KA_CHARS,
        kaWord,
        KA_CONTRASTIVE_PATTERNS,
        KA_EXPERIENCER_FRAMES_COMPREHENSIVE,
        KA_PROPER_NOUN_TRANSLITERATION,
        getKaKnowledgeBase,
        getKaCompactRules,
        getKaRepairRules,
        validateGeorgianTranslation,
        correctGeorgianMorphology,
        GEORGIAN_KNOWLEDGE_VERSION,
        GEORGIAN_KNOWLEDGE_STATS
    };
}
