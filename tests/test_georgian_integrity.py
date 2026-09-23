# -*- coding: utf-8 -*-
"""
Deep test suite for Literary Narrative Structure, Reflow Engine,
and Georgian Translation Morphosyntax Integrity.
"""
import unittest
import sys
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR))

from app.text_integrity import reflow_narrative_paragraphs, polish_georgian_literary_syntax
from app.translation_engine import synthesize_georgian_morphology, clean_georgian_morphology


class TestGeorgianLiteraryIntegrity(unittest.TestCase):

    def test_01_reflow_soft_wraps_and_hyphens(self):
        """Verify that hard-wrapped visual PDF lines and split words are merged into unified narrative paragraphs."""
        raw_pdf_fragment = (
            "The crowd had gathered because there was to be a materialization. A man and\n"
            "his dog were\n\n\n"
            "going to materialize, were going to appear out of thin air — wispily at first,\n"
            "becoming, finally, as\n\n"
            "substantial as any man and dog alive.\n\n"
            "The crowd wasn't going to get to see the materialization. The materialization was\n"
            "strictly a\n\n"
            "private affair on private property, and the crowd was emphatically not invited to\n"
            "feast its eyes."
        )
        reflowed = reflow_narrative_paragraphs(raw_pdf_fragment)
        paras = reflowed.split("\n\n")
        self.assertEqual(len(paras), 2, f"Expected exactly 2 narrative paragraphs, got {len(paras)}: {paras}")
        self.assertIn("A man and his dog were going to materialize", paras[0])
        self.assertIn("becoming, finally, as substantial as any man and dog alive.", paras[0])
        self.assertIn("The materialization was strictly a private affair", paras[1])

    def test_02_reflow_georgian_cross_line_fragments(self):
        """Verify that fragmented Georgian machine translation lines rejoin cleanly."""
        ka_fragment = (
            "ამგვარად, ბუნტი იყო სავარჯიშო მეცნიერებაში და თეოლოგიაში - მინიშნებების ძიება\n"
            "ცოცხალის მიერ როგორც\n\n"
            "რა იყო ცხოვრება.\n\n"
            "მძღოლმა, ბოლოს და ბოლოს, მის წინ სუფთა გზა დაინახა, დააჭირა ამაჩქარებელს\n"
            "იატაკი. The\n\n"
            "ლიმუზინი დაშორდა."
        )
        reflowed = reflow_narrative_paragraphs(ka_fragment)
        paras = reflowed.split("\n\n")
        self.assertEqual(len(paras), 2, f"Expected 2 paragraphs, got {len(paras)}")
        self.assertIn("ცოცხალის მიერ როგორც რა იყო ცხოვრება.", paras[0])
        self.assertIn("დააჭირა ამაჩქარებელს იატაკი. The ლიმუზინი დაშორდა.", paras[1])

    def test_03_dialogue_boundaries_preserved(self):
        """Ensure true dialogue markers and headings remain independent paragraphs."""
        dialogue_text = (
            "უინსტონმა მიმოიხედა და გაიღიმა.\n\n"
            "— სად მიდიხარ, მალაქი? — ჰკითხა მან.\n\n"
            "— არსად, — უპასუხა კონსტანტმა."
        )
        reflowed = reflow_narrative_paragraphs(dialogue_text)
        paras = reflowed.split("\n\n")
        self.assertEqual(len(paras), 3, f"Expected 3 paragraphs for narrative + 2 dialogue turns, got {len(paras)}")
        self.assertTrue(paras[1].startswith("— "))
        self.assertTrue(paras[2].startswith("— "))

    def test_04_proper_name_preservation_constant(self):
        """Verify that Malachi Constant is never translated as an adjective (მუდმივი / მუდმივმა)."""
        bad_texts = [
            "მუდმივმა გაიღიმა და წინ წავიდა.",
            "მალაქი მუდმივი იყო უმდიდრესი ადამიანი.",
            "მისტერ მუდმივმა უპასუხა.",
            "მუდმივმა თქვა, რომ ყველაფერი რიგზეა."
        ]
        for bad in bad_texts:
            polished = synthesize_georgian_morphology(bad)
            self.assertNotIn("მუდმივმა გაიღიმა", polished)
            self.assertNotIn("მალაქი მუდმივი", polished)
            self.assertNotIn("მისტერ მუდმივმა", polished)
            self.assertNotIn("მუდმივმა თქვა", polished)
            self.assertIn("კონსტანტ", polished)

    def test_05_proper_name_preservation_kazak_rumfoord(self):
        """Verify accurate transliteration of Kazak and Rumfoord."""
        text = "კბაჰაკს შეეშინდა, როდესაც რუმფოულდმა დაუძახა."
        polished = synthesize_georgian_morphology(text)
        self.assertIn("კაზაკს", polished)
        self.assertIn("რამფორდმა", polished)

    def test_06_oblique_adjective_truncation(self):
        """Verify that consonant-stem adjectives drop -ი before nouns in oblique cases."""
        samples = [
            ("უცნობი სივრცეში", "უცნობ სივრცეში"),
            ("დიდი სამყაროში", "დიდ სამყაროში"),
            ("ახალი სახლში", "ახალ სახლში"),
            ("ძველი ქალაქიდან", "ძველ ქალაქიდან"),
            ("უცნობი ადამიანს", "უცნობ ადამიანს"),
            ("კოსმიური სივრცეში", "კოსმიურ სივრცეში"),
            ("მატერიალური სამყაროში", "მატერიალურ სამყაროში"),
        ]
        for raw, expected in samples:
            polished = synthesize_georgian_morphology(raw)
            self.assertIn(expected, polished, f"Failed for {raw}: expected {expected}, got {polished}")


    def test_07_rumfoord_all_variants(self):
        """Verify that all historical corruptions of Rumfoord unify to რამფორდ-."""
        variants = [
            ("რუმფოროდს გაეღიმა.", "რამფორდს გაეღიმა."),
            ("ქალბატონი რუმფოუდმა შეხედა.", "ქალბატონმა რამფორდმა შეხედა."),
            ("მისტერ რუმფოარდმა უპასუხა.", "მისტერ რამფორდმა უპასუხა."),
            ("რუმფოორდი იდგა დარბაზში.", "რამფორდი იდგა დარბაზში."),
            ("უინსონ ნიილის რუმფოორდი", "უინსტონ ნაილს რამფორდი"),
            ("რუმფორდთან საუბრის დროს", "რამფორდთან საუბრისას")
        ]
        for raw, expected in variants:
            polished = synthesize_georgian_morphology(raw)
            self.assertIn(expected, polished, f"Failed for '{raw}': got '{polished}'")

    def test_08_constant_sirens_corpus_cases(self):
        """Verify real corpus cases from Sirens of Titan for Malachi Constant."""
        cases = [
            ("— მალაქჩის მუდმივი", "— მალაქი კონსტანტი"),
            ("მუდმივი Constant-ის მიერ", "კონსტანტის მიერ"),
            ("მუდმივთან საუბრის დროს", "კონსტანტთან საუბრისას"),
            ("მუდმივი, რომელიც რამფორდთან საუბრობდა", "კონსტანტი, რომელიც რამფორდთან საუბრობდა"),
            ("რა მუდმივი ჰქონდა გონებაში", "რა ჰქონდა კონსტანტს გონებაში")
        ]
        for raw, expected in cases:
            polished = synthesize_georgian_morphology(raw)
            self.assertIn(expected, polished, f"Failed for '{raw}': got '{polished}'")

    def test_09_medial_verb_ergative_concord(self):
        """Verify that Class 3 medial intransitive verbs require Series II Ergative case subjects."""
        pairs = [
            ("ქარი დაუბერა", "ქარმა დაუბერა"),
            ("მზე გაანათა", "მზემ გაანათა"),
            ("ბავშვი იტირა", "ბავშვმა იტირა"),
            ("აზრი გაუელვა", "აზრმა გაუელვა"),
            ("ჭექა-ქუხილი დაიგრგვინა", "ჭექა-ქუხილმა დაიგრგვინა"),
            ("ცივი ქარი დაუბერა", "ცივმა ქარმა დაუბერა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertIn(expected, polished, f"Medial verb concord failed for '{raw}': got '{polished}'")

    def test_10_prohibitive_negative_imperatives(self):
        """Verify that negative commands/imperatives strictly use the prohibitive particle ნუ."""
        pairs = [
            ("არ წახვიდე!", "ნუ წახვალ!"),
            ("არ შეგეშინდეს!", "ნუ გეშინია!"),
            ("არ შეშინდე!", "ნუ გეშინია!"),
            ("არ იტირო!", "ნუ ტირი!"),
            ("არ დაივიწყო!", "ნუ დაივიწყებ!"),
            ("არ დაგავიწყდეს!", "ნუ დაივიწყებ!"),
            ("არ იდარდო!", "ნუ დარდობ!"),
            ("არ იჩქარო!", "ნუ ჩქარობ!"),
            ("არ ინერვიულო!", "ნუ ნერვიულობ!"),
            ("არ დანებდე!", "ნუ დანებდები!"),
            ("არ შეჩერდე!", "ნუ შეჩერდები!"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Prohibitive negation failed for '{raw}': got '{polished}'")

    def test_11_experiencer_dative_inversion(self):
        """Verify that experiencer verbs of perception, volition and emotion take Dative subjects."""
        pairs = [
            ("ის სურს", "მას სურს"),
            ("ის მოსწონს", "მას მოსწონს"),
            ("ის ეჩვენება", "მას ეჩვენება"),
            ("ის აინტერესებს", "მას აინტერესებს"),
            ("ის უყვარს", "მას უყვარს"),
            ("ის ახსოვს", "მას ახსოვს"),
            ("ის ეშინია", "მას ეშინია"),
            ("ის სჭირდება", "მას სჭირდება"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Experiencer dative inversion failed for '{raw}': got '{polished}'")

    def test_12_extended_oblique_adjective_truncation(self):
        """Verify truncation of consonant-stem adjectives in oblique cases and before postpositions."""
        pairs = [
            ("მშვენიერი ბაღში", "მშვენიერ ბაღში"),
            ("ღვთაებრივი სინათლეში", "ღვთაებრივ სინათლეში"),
            ("სულიერი სიმშვიდეს", "სულიერ სიმშვიდეს"),
            ("მარადიული სიბრძნეს", "მარადიულ სიბრძნეს"),
            ("ახალი ეპოქაში", "ახალ ეპოქაში"),
            ("დიდი ქალაქში", "დიდ ქალაქში"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Adjective truncation failed for '{raw}': got '{polished}'")

    def test_13_autonomous_training_pack_eval(self):
        """Verify that the active rule pack scores 100% with zero regressions across all 500+ benchmark cases."""
        from app.training_engine import load_active_pack, load_benchmark_cases, evaluate_pack
        pack = load_active_pack("ka")
        cases = load_benchmark_cases("ka")
        self.assertGreaterEqual(len(cases), 740, "Expected at least 740 benchmark cases")
        self.assertGreaterEqual(len(pack.get("items", [])), 850, "Expected at least 850 rule pack items")
        self.assertGreaterEqual(int(pack.get("version", 0)), 40, "Active pack version must be at least 40")
        eval_res = evaluate_pack(pack.get("items", []), cases)
        self.assertEqual(eval_res["score"], 100.0, f"Expected 100.0 score, got {eval_res['score']}")
        self.assertEqual(eval_res["passed"], eval_res["total"], f"Failures: {eval_res['failures']}")
        self.assertEqual(eval_res["qa_false_positives"], 0, f"QA false positives found: {eval_res['qa_false_positives']}")

    def test_14_series_iii_evidential_inversion(self):
        """Verify that transitive verbs in Series III (Perfect/Pluperfect) take Dative subjects."""
        pairs = [
            ("ავტორმა დაუწერია", "ავტორს დაუწერია"),
            ("ოსტატმა აუშენებია", "ოსტატს აუშენებია"),
            ("მეფემ უბრძანებია", "მეფეს უბრძანებია"),
            ("მეცნიერმა შეუმჩნევია", "მეცნიერს შეუმჩნევია"),
            ("მხედარმა გაუგია", "მხედარს გაუგია"),
            ("დედამ დაუბარებია", "დედას დაუბარებია"),
            ("მან დაუწერია", "მას დაუწერია"),
            ("მან დაეწერა", "მას დაეწერა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Series III inversion failed for '{raw}': got '{polished}'")

    def test_15_participial_clauses_and_preverbs(self):
        """Verify participial clause synthesis and directional preverb deictics."""
        pairs = [
            ("წიგნი, რომელიც დაიწერა", "დაწერილი წიგნი"),
            ("ხელნაწერი, რომელიც დაიწერა", "დაწერილი ხელნაწერი"),
            ("ტაძარი, რომელიც აშენდა", "აშენებული ტაძარი"),
            ("თაობა, რომელიც მოდის", "მომავალი თაობა"),
            ("სიტყვა, რომელიც უნდა ითქვას", "სათქმელი სიტყვა"),
            ("საქმე, რომელიც უნდა გაკეთდეს", "საკეთებელი საქმე"),
            ("აქ წავიდა", "აქ მოვიდა"),
            ("აქ წაიღო", "აქ მოიტანა"),
            ("იქ მოვიდა", "იქ წავიდა"),
            ("იქ მოიტანა", "იქ წაიღო"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Participial/preverb synthesis failed for '{raw}': got '{polished}'")

    def test_16_dialogue_quotative_enclitics_and_idioms(self):
        """Verify dialogue quotative bound enclitic attachment and literary idioms."""
        pairs = [
            ("მოვალ - ო", "მოვალ-ო"),
            ("გითხარი მეთქი", "გითხარი-მეთქი"),
            ("დაბრუნდეს თქო", "დაბრუნდეს-თქო"),
            ("მისცა ადგილი", "ადგილი დაუთმო"),
            ("მიიღო მონაწილეობა", "მონაწილეობა მიიღო"),
            ("ჰქონდა ადგილი", "მოხდა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Quotative/idiom synthesis failed for '{raw}': got '{polished}'")

    def test_17_numeral_noun_singular_concord(self):
        """Verify that nouns modified by numerals or quantifiers remain strictly singular."""
        pairs = [
            ("სამი წიგნები", "სამი წიგნი"),
            ("ათი დღეები", "ათი დღე"),
            ("მრავალი წლები", "მრავალი წელი"),
            ("რამდენიმე კითხვები", "რამდენიმე კითხვა"),
            ("ბევრი ადამიანები", "ბევრი ადამიანი"),
            ("რამდენიმე სიტყვები", "რამდენიმე სიტყვა"),
            ("ორი მეგობრები", "ორი მეგობარი"),
            ("სამი დღე გავიდნენ", "სამი დღე გავიდა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Numeral-noun concord failed for '{raw}': got '{polished}'")

    def test_18_caritive_privative_adverbs(self):
        """Verify synthetic caritive adverbs (უ-...-ოდ) replace mechanical 'გარეშე + Genitive' calques."""
        pairs = [
            ("გარეშე ეჭვის", "უეჭველად"),
            ("გარეშე შიშის", "უშიშრად"),
            ("გარეშე იმედის", "უიმედოდ"),
            ("გარეშე ხმის", "უხმოდ"),
            ("გარეშე მიზეზის", "უმიზეზოდ"),
            ("გარეშე აზრის", "უაზროდ"),
            ("გარეშე შეცდომის", "უშეცდომოდ"),
            ("გარეშე დაღლის", "დაუღალავად"),
            ("გარეშე დასასრულის", "დაუსრულებლად"),
            ("გარეშე ყოყმანის", "დაუყოვნებლივ"),
            ("გარეშე დაფიქრების", "დაუფიქრებლად"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Caritive adverb failed for '{raw}': got '{polished}'")

    def test_19_collocational_light_verb_decalquing(self):
        """Verify replacement of generic 'გაკეთება' with specific Kartvelian verbal roots."""
        pairs = [
            ("შეცდომის გაკეთება", "შეცდომის დაშვება"),
            ("შეცდომა გააკეთა", "შეცდომა დაუშვა"),
            ("გავლენის გაკეთება", "გავლენის მოხდენა"),
            ("გავლენა გააკეთა", "გავლენა მოახდინა"),
            ("შთაბეჭდილების გაკეთება", "შთაბეჭდილების მოხდენა"),
            ("შთაბეჭდილება გააკეთა", "შთაბეჭდილება მოახდინა"),
            ("ყურადღების გაკეთება", "ყურადღების მიქცევა"),
            ("ყურადღება გააკეთა", "ყურადღება მიაქცია"),
            ("წარმოდგენის გაკეთება", "წარმოდგენის შექმნა"),
            ("საჩივრის გაკეთება", "საჩივრის შეტანა"),
            ("სარგებლის გაკეთება", "სარგებლის მიღება"),
            ("წინსვლის გაკეთება", "წინსვლის მიღწევა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Collocational decalquing failed for '{raw}': got '{polished}'")

    def test_20_version_markers_and_agentive_passives(self):
        """Verify verbal version markers (ქცევა) and natural agentive passives (-გან)."""
        pairs = [
            ("დაწერა წერილი თავისთვის", "დაიწერა წერილი"),
            ("ააშენა სახლი თავისთვის", "აიშენა სახლი"),
            ("მოამზადა სადილი თავისთვის", "მოიმზადა სადილი"),
            ("დაწერა წერილი შვილისთვის", "შვილს წერილი დაუწერა"),
            ("ააშენა სახლი მეგობრისთვის", "მეგობარს სახლი აუშენა"),
            ("მოამზადა საჭმელი დედისთვის", "დედას საჭმელი მოუმზადა"),
            ("გააკეთა თავისთვის", "გაიკეთა"),
            ("ღვთის მიერ ბოძებული", "ღვთისგან ბოძებული"),
            ("ბუნების მიერ შექმნილი", "ბუნებისგან შექმნილი"),
            ("მტრის მიერ განადგურებული", "მტრისგან განადგურებული"),
            ("ხალხის მიერ არჩეული", "ხალხისგან არჩეული"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Version/passive failed for '{raw}': got '{polished}'")

    def test_21_reflexive_anaphora_and_coreference(self):
        """Verify that 3rd-person co-referent possessives strictly resolve to თავისი and reflexives to თავ- stem."""
        pairs = [
            ("მან დაინახა ის", "მან საკუთარი თავი დაინახა"),
            ("ჰკითხა მის თავს", "თავის თავს ჰკითხა"),
            ("დარწმუნებული იყო მის თავში", "თავის თავში იყო დარწმუნებული"),
            ("უთხრა მის თავს", "თავის თავს უთხრა"),
            ("დაინახა მისი თავი", "საკუთარი თავი დაინახა"),
            ("მან აიღო მისი წიგნი", "მან თავისი წიგნი აიღო"),
            ("მან დახუჭა მისი თვალები", "მან თავისი თვალები დახუჭა"),
            ("მან გახსნა მისი გული", "მან თავისი გული გახსნა"),
            ("მან დატოვა მისი სახლი", "მან თავისი სახლი დატოვა"),
            ("მან იპოვა მისი გზა", "მან თავისი გზა იპოვა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Reflexive synthesis failed for '{raw}': got '{polished}'")

    def test_22_postpositional_syntax_and_temporal_enclitics(self):
        """Verify postpositional word order and instantaneous temporal clitics (-თანავე, -მდე)."""
        pairs = [
            ("შესახებ ამის", "ამის შესახებ"),
            ("შესახებ წიგნის", "წიგნის შესახებ"),
            ("შესახებ ცხოვრების", "ცხოვრების შესახებ"),
            ("შესახებ ადამიანის", "ადამიანის შესახებ"),
            ("შესახებ სამყაროს", "სამყაროს შესახებ"),
            ("შიგნით ოთახში", "ოთახში"),
            ("როგორც კი დაინახა", "დანახვისთანავე"),
            ("როგორც კი მოვიდა", "მოსვლისთანავე"),
            ("როგორც კი გაიგო", "გაგებისთანავე"),
            ("როგორც კი გაიღვიძა", "გაღვიძებისთანავე"),
            ("როგორც კი შეიტყო", "შეტყობისთანავე"),
            ("სანამ დილა მოვიდოდა", "დილამდე"),
            ("სანამ ბოლო მოვიდოდა", "ბოლომდე"),
            ("სანამ სიკვდილი მოვიდოდა", "სიკვდილამდე"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Postpositional synthesis failed for '{raw}': got '{polished}'")

    def test_23_prohibitive_and_inability_negative_concord(self):
        """Verify distinct prohibitive (ნუ) and modal inability (ვერ) negative concord."""
        pairs = [
            ("არავინ არ შეძლო", "ვერავინ შეძლო"),
            ("არავინ შეძლო", "ვერავინ შეძლო"),
            ("არაფერი არ შევძელი", "ვერაფერი შევძელი"),
            ("არაფერი შევძელი", "ვერაფერი შევძელი"),
            ("არსად არ შეეძლო წასვლა", "ვერსად წავიდოდა"),
            ("არაფერი არ გააკეთო", "ნურაფერს ნუ გააკეთებ"),
            ("არაფერს არ შეეხო", "ნურაფერს ნუ შეეხები"),
            ("არავის არ უთხრა", "ნურავის ნუ ეტყვი"),
            ("არასოდეს არ დაივიწყო", "ნურასოდეს ნუ დაივიწყებ"),
            ("არასდროს არ დაბრუნდე", "ნურასდროს ნუ დაბრუნდები"),
            ("არსად არ წახვიდე", "ნურსად ნუ წახვალ"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Negative concord failed for '{raw}': got '{polished}'")

    def test_24_purposive_supine_and_mirative_particles(self):
        """Verify synthetic purposive supines (სა-...-ოდ) and mirative evidentials (თურმე)."""
        pairs = [
            ("იმისთვის, რომ გაიგოს", "გასაგებად"),
            ("იმისთვის, რომ ნახოს", "სანახავად"),
            ("იმისთვის, რომ ისწავლოს", "სასწავლად"),
            ("იმისთვის, რომ თქვას", "სათქმელად"),
            ("იმისთვის, რომ გადარჩეს", "გადასარჩენად"),
            ("იმისთვის, რომ იპოვოს", "საპოვნელად"),
            ("იმისთვის, რომ იცხოვროს", "საცხოვრებლად"),
            ("იმისთვის, რომ დაინახოს", "დასანახად"),
            ("როგორც ჩანს, მას დავიწყებია", "თურმე დავიწყებია"),
            ("აღმოჩნდა, რომ მოვიდა", "თურმე მოსულა"),
            ("აღმოჩნდა, რომ წავიდა", "თურმე წასულა"),
            ("აღმოჩნდა, რომ სიმართლეა", "თურმე სიმართლე ყოფილა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Supine/mirative failed for '{raw}': got '{polished}'")

    def test_25_synthetic_passive_vs_analytical_ikna(self):
        """Verify synthetic root-passives and active plurals replace bureaucratic '*იქნა' calques."""
        pairs = [
            ("იქნა მიღებული", "მიიღეს"),
            ("მიღებულ იქნა", "მიიღეს"),
            ("იქნა გადაწყვეტილი", "გადაწყდა"),
            ("გადაწყვეტილ იქნა", "გადაწყდა"),
            ("იქნა აშენებული", "აშენდა"),
            ("აშენებულ იქნა", "აშენდა"),
            ("იქნა დაწერილი", "დაიწერა"),
            ("დაწერილ იქნა", "დაიწერა"),
            ("იქნა ნათქვამი", "ითქვა"),
            ("ნათქვამ იქნა", "ითქვა"),
            ("იქნა გამოცხადებული", "გამოცხადდა"),
            ("იქნა აღმოჩენილი", "აღმოაჩინეს"),
            ("იქნა შექმნილი", "შეიქმნა"),
            ("იქნა გადარჩენილი", "გადარჩა"),
            ("იქნა დანგრეული", "დაინგრა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Synthetic passive failed for '{raw}': got '{polished}'")

    def test_26_version_vowel_and_causative_synthesis(self):
        """Verify synthetic version vowels (სათავისო/სასხვისო) and synthetic causatives."""
        pairs = [
            ("მან გააკეთა მისთვის", "მან გაუკეთა მას"),
            ("მან დაწერა მისთვის", "მან დაუწერა მას"),
            ("მან მოამზადა მისთვის", "მან მოუმზადა მას"),
            ("მან შექმნა მისთვის", "მან შეუქმნა მას"),
            ("მან აიძულა გაეკეთებინა", "გააკეთებინა"),
            ("მან აიძულა რომ გაეკეთებინა", "გააკეთებინა"),
            ("მან აიძულა დაეწერა", "დააწერინა"),
            ("მან აიძულა ეთქვა", "ათქმევინა"),
            ("მან აიძულა წაეკითხა", "წააკითხა"),
            ("მან აიძულა აეშენებინა", "ააშენებინა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Version/causative synthesis failed for '{raw}': got '{polished}'")

    def test_27_numeral_and_quantifier_singular_concord(self):
        """Verify extended partitive & quantitative singular concord after numerals and quantifiers."""
        pairs = [
            ("ხუთი წუთები", "ხუთი წუთი"),
            ("ათი საათები", "ათი საათი"),
            ("სამი წლები", "სამი წელი"),
            ("ოცი დღეები", "ოცი დღე"),
            ("უამრავი ადამიანები", "უამრავი ადამიანი"),
            ("ბევრი წიგნები", "ბევრი წიგნი"),
            ("რამდენიმე პრობლემები", "რამდენიმე პრობლემა"),
            ("ასი კაცები", "ასი კაცი"),
            ("ათასი ქალები", "ათასი ქალი"),
            ("ცოტა ბავშვები", "ცოტა ბავშვი"),
            ("ასობით ადამიანები", "ასობით ადამიანი"),
            ("ათასობით ადამიანები", "ათასობით ადამიანი"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Quantifier concord failed for '{raw}': got '{polished}'")

    def test_28_habitual_aspect_and_conditional_decalquing(self):
        """Verify frequentative habitual aspect with -ხოლმე and concise conditional/modal syntax."""
        pairs = [
            ("ჰქონდა ჩვევა, რომ ეთქვა", "ამბობდა ხოლმე"),
            ("ჩვევად ჰქონდა ეთქვა", "ამბობდა ხოლმე"),
            ("ჰქონდა ჩვევა, რომ გაეკეთებინა", "აკეთებდა ხოლმე"),
            ("ჩვევად ჰქონდა გაეკეთებინა", "აკეთებდა ხოლმე"),
            ("ჰქონდა ჩვევა, რომ ეფიქრა", "ფიქრობდა ხოლმე"),
            ("ჩვევად ჰქონდა ეფიქრა", "ფიქრობდა ხოლმე"),
            ("ადრე აკეთებდა ხოლმე", "აკეთებდა ხოლმე"),
            ("ყოველთვის ამბობდა ხოლმე", "ამბობდა ხოლმე"),
            ("ჩვეულებრივ ამბობდა ხოლმე", "ამბობდა ხოლმე"),
            ("იმ შემთხვევაში, თუკი", "თუკი"),
            ("იმ შემთხვევაში, თუ", "თუ"),
            ("იმ შემთხვევაში, როდესაც", "როდესაც"),
            ("ეს არის შესაძლებელი, რომ", "შესაძლებელია, რომ"),
            ("ეს შესაძლებელია, რომ", "შესაძლებელია, რომ"),
            ("არ არის შესაძლებელი, რომ", "შეუძლებელია, რომ"),
            ("შეიძლება ითქვას ის, რომ", "შეიძლება ითქვას, რომ"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Habitual/conditional failed for '{raw}': got '{polished}'")

    def test_29_reciprocal_pronoun_concord(self):
        """Verify that reciprocal pronouns ერთმანეთ- / ერთიმეორე- reject Ergative marker."""
        pairs = [
            ("ერთმანეთმა დაინახეს", "ერთმანეთი დაინახეს"),
            ("ერთმანეთმა შეხედეს", "ერთმანეთს შეხედეს"),
            ("ერთმანეთმა უთხრეს", "ერთმანეთს უთხრეს"),
            ("ერთმანეთმა გაუგეს", "ერთმანეთს გაუგეს"),
            ("ერთმანეთმა იპოვეს", "ერთმანეთი იპოვეს"),
            ("ერთმანეთმა გააკეთეს", "ერთმანეთს დაეხმარნენ"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Reciprocal concord failed for '{raw}': got '{polished}'")

    def test_30_optative_and_permissive_mood(self):
        """Verify synthetic optative and permissive mood particles დაე, ნეტავ, იქნებ."""
        pairs = [
            ("ნება მიეცით წავიდეს", "დაე წავიდეს"),
            ("ნება მიეცით მას წავიდეს", "დაე წავიდეს"),
            ("ნება მიეცით იყოს", "დაე იყოს"),
            ("მინდა, რომ ვიცოდე", "ნეტავ ვიცოდე"),
            ("მინდა, რომ შემეძლოს", "ნეტავ შემეძლოს"),
            ("შესაძლოა მოვიდეს", "იქნებ მოვიდეს"),
            ("შესაძლოა გაიგოს", "იქნებ გაიგოს"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Optative/permissive failed for '{raw}': got '{polished}'")

    def test_31_dynamic_action_inchoatives(self):
        """Verify dynamic synthetic root inchoatives replacing analytical დაიწყო + masdar."""
        pairs = [
            ("დაიწყო სიმღერა", "ამღერდა"),
            ("დაიწყო ტირილი", "ატირდა"),
            ("დაიწყო ლაპარაკი", "ალაპარაკდა"),
            ("დაიწყო ნათება", "აენთო"),
            ("დაიწყო ფიქრი", "დაფიქრდა"),
            ("დაიწყო კანკალი", "აკანკალდა"),
            ("დაიწყო ყვირილი", "აყვირდა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Inchoative synthesis failed for '{raw}': got '{polished}'")

    def test_32_correlative_proportional_degree(self):
        """Verify deictic coordinate binominals and proportional correlative degree."""
        pairs = [
            ("აქ და იქ", "აქა-იქ"),
            ("აქ და იქით", "აქეთ-იქით"),
            ("უფრო და უფრო მეტი", "სულ უფრო მეტი"),
            ("უფრო და უფრო ნაკლები", "სულ უფრო ნაკლები"),
            ("უფრო და უფრო რთული", "სულ უფრო რთული"),
            ("უფრო და უფრო კარგი", "სულ უფრო კარგი"),
            ("რაც მეტად, მით მეტად", "რაც უფრო, მით უფრო"),
            ("რაც უფრო, უფრო", "რაც უფრო, მით უფრო"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Correlative/proportional degree failed for '{raw}': got '{polished}'")

    def test_33_iterative_reduplication_morphology(self):
        """Verify iterative and hyphenated reduplicative morphology replacing analytical conjunctions."""
        pairs = [
            ("ნელა და ნელა", "ნელ-ნელა"),
            ("ცოტა და ცოტა", "ცოტ-ცოტა"),
            ("სწრაფად და სწრაფად", "სწრაფ-სწრაფად"),
            ("ბევრჯერ და ბევრჯერ", "მრავალგზის"),
            ("ის ნელა და ნელა მიიწევდა წინ.", "ის ნელ-ნელა მიიწევდა წინ."),
            ("მან ბევრჯერ და ბევრჯერ სცადა გამარჯვება.", "მან მრავალგზის სცადა გამარჯვება."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Iterative morphology failed for '{raw}': got '{polished}'")

    def test_34_double_postposition_syncretism(self):
        """Verify double postposition decalquing and synthetic case governance."""
        pairs = [
            ("ამ საკითხის შესახებ საუბრის დროს", "ამ საკითხზე მსჯელობისას"),
            ("იმასთან დაკავშირებით, რომ", "იმის გამო, რომ"),
            ("იმ მიზეზით, რომ", "რადგან"),
            ("იმის გამოისობით, რომ", "ვინაიდან"),
            ("რაც შეეხება იმას, რომ", "რაც შეეხება"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Postposition syncretism failed for '{raw}': got '{polished}'")

    def test_35_synthetic_temporal_converbs(self):
        """Verify synthetic temporal and instantaneous converbs (-ას / -ისას / -თანავე)."""
        pairs = [
            ("კითხვის დროს", "კითხვისას"),
            ("საუბრის დროს", "საუბრისას"),
            ("წერის დროს", "წერისას"),
            ("ფიქრის დროს", "ფიქრისას"),
            ("დანახვის მომენტში", "დანახვისთანავე"),
            ("მოსვლის მომენტში", "მოსვლისთანავე"),
            ("გასვლის მომენტში", "გასვლისთანავე"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Temporal converb failed for '{raw}': got '{polished}'")

    def test_36_appositive_concord_and_concessive_synthesis(self):
        """Verify appositive case concord and synthetic concessive subordination."""
        pairs = [
            ("გიორგიმ, თავდადებული მეომარი, დაამარცხა მტერი.", "გიორგიმ, თავდადებულმა მეომარმა, დაამარცხა მტერი."),
            ("მეფემ, ბრძენი მმართველი, გამოსცა ბრძანება.", "მეფემ, ბრძენმა მმართველმა, გამოსცა ბრძანება."),
            ("ავტორმა, ცნობილი მეცნიერი, დაწერა ახალი წიგნი.", "ავტორმა, ცნობილმა მეცნიერმა, დაწერა ახალი წიგნი."),
            ("შოთამ, დიდებული პოეტი, შექმნა პოემა.", "შოთამ, დიდებულმა პოეტმა, შექმნა პოემა."),
            ("მიუხედავად იმისა, რომ გვიან იყო, წავედით.", "თუმცა გვიან იყო, წავედით."),
            ("მიუხედავად იმისა, რომ რთული იყო, შევძელით.", "თუმცა რთული იყო, შევძელით."),
            ("იმის მიუხედავად, რომ", "თუმცა"),
            ("თუნდაც რომ მოვიდეს", "თუნდაც მოვიდეს"),
            ("თუნდაც რომ გააკეთოს", "თუნდაც გააკეთოს"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Appositive/concessive failed for '{raw}': got '{polished}'")

    def test_37_spatial_deictic_preverbs_and_pleonasm_elimination(self):
        """Verify spatial/directional deictic preverbs and pleonasm elimination."""
        pairs = [
            ("ზემოთ ავიდა", "ავიდა"),
            ("ქვემოთ ჩავიდა", "ჩავიდა"),
            ("ზემოთ ამოვიდა", "ამოვიდა"),
            ("ქვემოთ ჩამოვიდა", "ჩამოვიდა"),
            ("შიგნით შევიდა", "შევიდა"),
            ("გარეთ გამოვიდა", "გამოვიდა"),
            ("გარეთ გავიდა", "გავიდა"),
            ("უკან დაბრუნდა", "დაბრუნდა"),
            ("აქეთ მოვიდა", "მოვიდა"),
            ("იქით წავიდა", "წავიდა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Spatial deictic preverbs failed for '{raw}': got '{polished}'")

    def test_38_sensory_involuntary_experiencer_dative_concord(self):
        """Verify Dative subject concord for sensory and psychological involuntary experiencer verbs."""
        pairs = [
            ("ის ესმის", "მას ესმის"),
            ("ის ჩაესმა", "მას ჩაესმა"),
            ("ის ეჩვენა", "მას ეჩვენა"),
            ("ის მოეჩვენა", "მას მოეჩვენა"),
            ("ის მოაგონდა", "მას მოაგონდა"),
            ("ის გაახსენდა", "მას გაახსენდა"),
            ("ის ეუცხოვა", "მას ეუცხოვა"),
            ("ის მოეწონა", "მას მოეწონა"),
            ("ის ეამა", "მას ეამა"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Sensory experiencer concord failed for '{raw}': got '{polished}'")

    def test_39_restrictive_and_temporal_bound_enclitics(self):
        """Verify restrictive, temporal, and contrastive bound enclitics (-ღა, -ვე, -კი)."""
        pairs = [
            ("მხოლოდ ის დარჩა", "ისიღა დარჩა"),
            ("მხოლოდ ეს ვიცი", "ესღა ვიცი"),
            ("მხოლოდ ერთი დარჩა", "ერთიღა დარჩა"),
            ("იმავე დღეს", "იმ დღესვე"),
            ("იმავე წამს", "იმწამსვე"),
            ("იმავე წუთს", "იმ წუთსვე"),
            ("მაგრამ ის კი", "ის კი"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Bound enclitics failed for '{raw}': got '{polished}'")

    def test_40_circumstantial_synthetic_compounds(self):
        """Verify circumstantial privative and instrumental synthetic compounds."""
        pairs = [
            ("თვალის დახამხამების გარეშე", "დაუხამხამებლად"),
            ("გულის ფანცქალით", "გულფანცქალით"),
            ("ხმის ამოუღებლად", "ხმაამოუღებლად"),
            ("სუნთქვის შეკვრით", "სუნთქვაშეკრული"),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Circumstantial compounds failed for '{raw}': got '{polished}'")

    def test_41_synthetic_stative_pluperfect_copula(self):
        """Verify synthetic stative pluperfect and copular cliticization (-იყო fusion)."""
        pairs = [
            ("საქმე იყო გაკეთებული დიდი ხნის წინ.", "საქმე გაკეთებულიყო დიდი ხნის წინ."),
            ("წიგნი იყო დაწერილი ოქროს ასოებით.", "წიგნი დაწერილიყო ოქროს ასოებით."),
            ("ციხესიმაგრე იყო აშენებული კლდეზე მტკიცედ.", "ციხესიმაგრე აშენებულიყო კლდეზე მტკიცედ."),
            ("კარიბჭე იყო გახსნილი სტუმრებისთვის.", "კარიბჭე გახსნილიყო სტუმრებისთვის."),
            ("ოთახი იყო დაკეტილი გასაღებით.", "ოთახი დაკეტილიყო გასაღებით."),
            ("ძველი მტრობა იყო დავიწყებული სამუდამოდ.", "ძველი მტრობა დავიწყებულიყო სამუდამოდ."),
            ("მთავარი საკითხი იყო გადაწყვეტილი საბჭოზე.", "მთავარი საკითხი გადაწყვეტილიყო საბჭოზე."),
            ("დიდებული ნაწარმოები იყო შექმნილი ოსტატის მიერ.", "დიდებული ნაწარმოები შექმნილიყო ოსტატის მიერ."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Stative pluperfect failed for '{raw}': got '{polished}'")

    def test_42_synthetic_superlative_circumfix(self):
        """Verify synthetic superlative circumfixation (უ-...-ეს-ი / საუკეთესო)."""
        pairs = [
            ("ეს იყო ყველაზე მეტად დიდი ტაძარი ქვეყანაში.", "ეს იყო უდიდესი ტაძარი ქვეყანაში."),
            ("მან მიიღო ყველაზე კარგი რჩევა ბრძენისგან.", "მან მიიღო საუკეთესო რჩევა ბრძენისგან."),
            ("ეს იყო ყველაზე ცუდი განსაცდელი მათ ცხოვრებაში.", "ეს იყო უარესი განსაცდელი მათ ცხოვრებაში."),
            ("ეს არის ყველაზე მეტად მნიშვნელოვანი გადაწყვეტილება.", "ეს არის უმნიშვნელოვანესი გადაწყვეტილება."),
            ("მხედარს ჰყავდა ყველაზე ძლიერი რაში სამეფოში.", "მხედარს ჰყავდა უძლიერესი რაში სამეფოში."),
            ("ხელნაწერი ინახავდა ყველაზე ძველი ეპოქის საიდუმლოს.", "ხელნაწერი ინახავდა უძველესი ეპოქის საიდუმლოს."),
            ("ის ავიდა ყველაზე მაღალი მწვერვალის თავზე.", "ის ავიდა უმაღლესი მწვერვალის თავზე."),
            ("ეს იყო ყველაზე ღრმა ხეობა.", "ეს იყო უღრმესი ხეობა."),
            ("ბაღში ყვაოდა ყველაზე მეტად ლამაზი ვარდი.", "ბაღში ყვაოდა ულამაზესი ვარდი."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Superlative circumfix failed for '{raw}': got '{polished}'")

    def test_43_partitive_genitive_measure_concord(self):
        """Verify partitive and collective Genitive case concord with measure nouns."""
        pairs = [
            ("მოედანზე შეიკრიბა ჯგუფი ადამიანები დილით.", "მოედანზე შეიკრიბა ადამიანთა ჯგუფი დილით."),
            ("ნაწილი ხალხი გაჰყვა წინამძღოლს მთაში.", "ხალხის ნაწილი გაჰყვა წინამძღოლს მთაში."),
            ("ბიბლიოთეკაში ინახებოდა დიდი რაოდენობა წიგნები.", "ბიბლიოთეკაში ინახებოდა დიდი წიგნების რაოდენობა."),
            ("უმრავლესობა ხალხი ემხრობოდა მშვიდობას.", "ხალხის უმრავლესობა ემხრობოდა მშვიდობას."),
            ("ღამის ცაზე ბრწყინავდა სიმრავლე ვარსკვლავები.", "ღამის ცაზე ბრწყინავდა ვარსკვლავთა სიმრავლე."),
            ("საბჭოზე განიხილეს რიგი საკითხები დეტალურად.", "საბჭოზე განიხილეს საკითხთა რიგი დეტალურად."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Partitive measure concord failed for '{raw}': got '{polished}'")

    def test_44_frequentative_aspect_and_light_motion(self):
        """Verify synthetic frequentative verbs and aspectual motion."""
        pairs = [
            ("დარაჯი ფრთხილად აქეთ-იქით იყურებოდა ბნელ ღამეში.", "დარაჯი ფრთხილად მიმოიხედავდა ბნელ ღამეში."),
            ("მოხუცი ნელა მოძრაობდა ქუჩაში ჯოხით.", "მოხუცი მიაბიჯებდა ქუჩაში ჯოხით."),
            ("მასწავლებელი ხშირად იმეორებდა ამ ბრძნულ დარიგებას.", "მასწავლებელი იმეორებდა ხოლმე ამ ბრძნულ დარიგებას."),
            ("ოსტატმა ბოლომდე მიიყვანა საქმე ერთგულად.", "ოსტატმა სისრულეში მოიყვანა საქმე ერთგულად."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Frequentative motion failed for '{raw}': got '{polished}'")

    def test_45_somatic_bodily_idioms(self):
        """Verify natural Georgian somatic and bodily reaction idioms."""
        pairs = [
            ("მან მისი სუნთქვა დაიჭირა წამით.", "მან სული მოითქვა წამით."),
            ("მოულოდნელობისგან დაკარგა სუნთქვა.", "მოულოდნელობისგან სუნთქვა შეეკრა."),
            ("მან მხრები შეანჯღრია უდარდელად.", "მან მხრები აიჩეჩა უდარდელად."),
            ("მან თავი შეანჯღრია უარის ნიშნად.", "მან თავი გააქნია უარის ნიშნად."),
            ("დარბაზი სიცილში აფეთქდა უცებ.", "დარბაზი სიცილი წასკდა უცებ."),
            ("მგზავრი ცრემლებში აფეთქდა დარდით.", "მგზავრი ცრემლები წასკდა დარდით."),
            ("მან ყელი გაიწმინდა და დაიწყო.", "მან ჩაახველა და დაიწყო."),
            ("შიშისგან გული ჩაუვარდა მას.", "შიშისგან გული გადაუქანდა მას."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Somatic idiom failed for '{raw}': got '{polished}'")

    def test_46_sci_fi_speculative_collocations(self):
        """Verify literary sci-fi and speculative prose lexicon."""
        pairs = [
            ("ხომალდი გაფრინდა გარე სივრცეში შორს.", "ხომალდი გაფრინდა ღია კოსმოსში შორს."),
            ("გარშემო იყო მხოლოდ ცარიელი სიცარიელე.", "გარშემო იყო მხოლოდ უკიდეგანო სიცარიელე."),
            ("ისინი თხელი ჰაერიდან გამოჩნდნენ უცებ.", "ისინი პირდაპირ ჰაერში გაჩნდნენ უცებ."),
            ("გზა გრძელდებოდა ათასი სინათლის წლები.", "გზა გრძელდებოდა ათასი სინათლის წელი."),
            ("ორბიტაზე გამოჩნდა სამი კოსმოსური გემები.", "ორბიტაზე გამოჩნდა სამი კოსმოსური გემი."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Sci-fi collocation failed for '{raw}': got '{polished}'")

    def test_47_polypersonal_possession_animacy(self):
        """Verify animacy distinction in possession (ჰყავს animate vs აქვს inanimate)."""
        pairs = [
            ("მას აქვს ძაღლი ერთგული.", "მას ჰყავს ძაღლი ერთგული."),
            ("მას აქვს შვილი საყვარელი.", "მას ჰყავს შვილი საყვარელი."),
            ("მას არ აქვს მეგობარი ამ ქალაქში.", "მას არ ჰყავს მეგობარი ამ ქალაქში."),
            ("მას ჰყავს მანქანა სწრაფი.", "მას აქვს მანქანა სწრაფი."),
            ("მას ჰყავს სახლი მთაში.", "მას აქვს სახლი მთაში."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Animacy possession failed for '{raw}': got '{polished}'")

    def test_48_temporal_adverbial_compacting(self):
        """Verify compact synthetic temporal duration adverbs."""
        pairs = [
            ("ისინი საუბრობდნენ საათების განმავლობაში.", "ისინი საუბრობდნენ საათობით."),
            ("ის ფიქრობდა დიდი დროის განმავლობაში.", "ის ფიქრობდა დიდხანს."),
            ("წვიმდა დღეების განმავლობაში შეუსვენებლად.", "წვიმდა დღეობით შეუსვენებლად."),
            ("ისინი შრომობდნენ წლების განმავლობაში ერთად.", "ისინი შრომობდნენ წლობით ერთად."),
            ("ის გაჩერდა ერთი მომენტისთვის კარებთან.", "ის გაჩერდა წამით კარებთან."),
            ("მისი ძალა დღიდან დღემდე იზრდებოდა.", "მისი ძალა დღითი დღე იზრდებოდა."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Temporal compacting failed for '{raw}': got '{polished}'")

    def test_49_indirect_object_and_dialogue_framing(self):
        """Verify indirect object markers and light-verb decalquing."""
        pairs = [
            ("ამ ნაბიჯმა გააკეთა აზრი ბოლოს.", "ამ ნაბიჯმა აზრი შეიძინა ბოლოს."),
            ("მან ყურადღება გადაიხადა ამ დეტალზე.", "მან ყურადღება მიაქცია ამ დეტალზე."),
            ("შეხვედრამ ადგილი აიღო ქალაქში.", "შეხვედრამ ჩატარდა ქალაქში."),
            ("— სად მიდიხარ? — კითხა მან.", "— სად მიდიხარ? — ჰკითხა მან."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Indirect object / light-verb failed for '{raw}': got '{polished}'")

    def test_50_psychological_mind_idioms(self):
        """Verify psychological and mental state collocations."""
        pairs = [
            ("მან დაკარგა თავისი გონება დარდისგან.", "მან ჭკუიდან შეიშალა დარდისგან."),
            ("მოგზაურმა გააკეთა თავისი გონება საბოლოოდ.", "მოგზაურმა გადაწყვიტა საბოლოოდ."),
            ("მან შეცვალა თავისი გონება და დარჩა.", "მან გადაიფიქრა და დარჩა."),
            ("ეს რჩევა შეინახეთ გონებაში მუდამ.", "ეს რჩევა გაითვალისწინეთ მუდამ."),
            ("უეცარმა აზრმა გადაკვეთა მისი გონება წამით.", "უეცარმა აზრმა აზრად მოუვიდა წამით."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Mental idiom failed for '{raw}': got '{polished}'")

    def test_51_gaze_sensory_collocations(self):
        """Verify sensory, visual, and gaze collocations."""
        pairs = [
            ("მან დაიჭირა მისი თვალი ბრბოში.", "მან თვალი მოჰკრა ბრბოში."),
            ("მან დაადო თვალი მას მაშინვე.", "მან თვალი შეავლო მას მაშინვე."),
            ("დარაჯმა შეინახა თვალი მასზე ფრთხილად.", "დარაჯმა თვალყური ადევნა მასზე ფრთხილად."),
            ("ეს მოხდა ერთი თვალის დახამხამებაში.", "ეს მოხდა თვალის დახამხამებაში."),
            ("მან თვალები დახუჭა ამაზე სრულიად.", "მან თვალი დახუჭა ამაზე სრულიად."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Gaze sensory collocation failed for '{raw}': got '{polished}'")

    def test_52_paired_organ_instrumental_singular(self):
        """Verify instrumental paired organ singular concord."""
        pairs = [
            ("მან საკუთარი თვალებით დაინახა სასწაული.", "მან საკუთარი თვალით დაინახა სასწაული."),
            ("მან საკუთარი ყურებით მოისმინა სიმართლე.", "მან საკუთარი ყურით მოისმინა სიმართლე."),
            ("მან შიშველი ხელებით დაიჭირა ჩიტი.", "მან შიშველი ხელით დაიჭირა ჩიტი."),
            ("მან ფეხებზე იარა მთელი გზა.", "მან ფეხით იარა მთელი გზა."),
            ("ოსტატმა თავისი ხელებით გააკეთა ეს.", "ოსტატმა საკუთარი ხელით გააკეთა ეს."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Organ instrumental concord failed for '{raw}': got '{polished}'")

    def test_53_spatial_binomial_adverbials(self):
        """Verify spatial dynamics and binomial motion synthesis."""
        pairs = [
            ("ისინი იდგნენ გვერდი გვერდით მთაზე.", "ისინი იდგნენ მხარდამხარ მთაზე."),
            ("მცველი უკან და წინ დადიოდა ეზოში.", "მცველი წინ და უკან დადიოდა ეზოში."),
            ("მოწინააღმდეგეები სახე სახესთან შეხვდნენ.", "მოწინააღმდეგეები პირისპირ შეხვდნენ."),
            ("ისინი აღმოჩნდნენ არსად შუაში უეცრად.", "ისინი აღმოჩნდნენ უკაცრიელ ადგილას უეცრად."),
            ("საქმე წინ მიდიოდა ნაბიჯი ნაბიჯით.", "საქმე წინ მიდიოდა ნაბიჯ-ნაბიჯ."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Spatial binomial failed for '{raw}': got '{polished}'")

    def test_54_discourse_transitions_and_idioms(self):
        """Verify narrative discourse connectors and transitional markers."""
        pairs = [
            ("პირველ შეხედვაზე ამოცანა მარტივი ჩანდა.", "ერთი შეხედვით ამოცანა მარტივი ჩანდა."),
            ("როგორც ფაქტის საკითხი, ეს ასე იყო.", "სინამდვილეში, ეს ასე იყო."),
            ("ყველა მოულოდნელად ცა დაბნელდა.", "უეცრად ცა დაბნელდა."),
            ("უფრო ადრე თუ უფრო გვიან ყველაფერი გაირკვევა.", "ადრე თუ გვიან ყველაფერი გაირკვევა."),
            ("მგზავრი თავიდან ფეხის თითამდე დასველდა.", "მგზავრი თავით ფეხამდე დასველდა."),
            ("ეს წესი დროის დასაწყისიდან მოქმედებს.", "ეს წესი ოდითგანვე მოქმედებს."),
        ]
        for raw, expected in pairs:
            polished = synthesize_georgian_morphology(raw)
            self.assertEqual(polished, expected, f"Discourse transition failed for '{raw}': got '{polished}'")


if __name__ == "__main__":
    unittest.main(verbosity=2)
