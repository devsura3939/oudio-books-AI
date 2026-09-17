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


if __name__ == "__main__":
    unittest.main(verbosity=2)
