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
            ("რუმფორდთან საუბრის დროს", "რამფორდთან საუბრის დროს")
        ]
        for raw, expected in variants:
            polished = synthesize_georgian_morphology(raw)
            self.assertIn(expected, polished, f"Failed for '{raw}': got '{polished}'")

    def test_08_constant_sirens_corpus_cases(self):
        """Verify real corpus cases from Sirens of Titan for Malachi Constant."""
        cases = [
            ("— მალაქჩის მუდმივი", "— მალაქი კონსტანტი"),
            ("მუდმივი Constant-ის მიერ", "კონსტანტის მიერ"),
            ("მუდმივთან საუბრის დროს", "კონსტანტთან საუბრის დროს"),
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
        """Verify that the active rule pack scores 100% with zero regressions across all 280+ benchmark cases."""
        from app.training_engine import load_active_pack, load_benchmark_cases, evaluate_pack
        pack = load_active_pack("ka")
        cases = load_benchmark_cases("ka")
        self.assertGreaterEqual(len(cases), 280, "Expected at least 280 benchmark cases")
        self.assertGreaterEqual(len(pack.get("items", [])), 275, "Expected at least 275 rule pack items")
        self.assertGreaterEqual(int(pack.get("version", 0)), 29, "Active pack version must be at least 29")
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
