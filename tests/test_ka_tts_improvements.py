# -*- coding: utf-8 -*-
import sys
import unittest
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR))

from app.georgian_phonetics import (
    normalize_mtavruli_to_mkhedruli,
    prepare_ka_tts_utterance,
    transliterate_latin_word_to_ka,
    verbalize_georgian_for_tts,
)
from app.tts_engine import (
    PRESET_DEFAULT_PROSODY,
    format_tts_pitch,
    format_tts_rate,
    resolve_tts_voice,
)


class TestGeorgianTTSImprovements(unittest.TestCase):
    def test_mtavruli_normalization_and_voice_routing(self):
        self.assertEqual(normalize_mtavruli_to_mkhedruli("ᲐᲮᲐᲚᲘ ᲗᲐᲕᲘ"), "ახალი თავი")
        self.assertEqual(resolve_tts_voice(text="ᲐᲮᲐᲚᲘ ᲗᲐᲕᲘ"), "ka-GE-GiorgiNeural")

    def test_dates_decades_cases_and_acronyms(self):
        self.assertIn("თორმეტი მაისი, ორ ათას ოცდაოთხი წელი", verbalize_georgian_for_tts("12.05.2024"))
        self.assertIn("ოცდამეერთე", verbalize_georgian_for_tts("XXI-ე საუკუნე"))
        self.assertIn("ოთხმოცდაათიან წლებში", verbalize_georgian_for_tts("1990-იან წლებში"))
        self.assertIn("ათიდან თხუთმეტამდე", verbalize_georgian_for_tts("10-დან 15-მდე"))
        self.assertIn("ერთ-ნახევარი", verbalize_georgian_for_tts("1,5"))
        self.assertIn("ათი ათასი", verbalize_georgian_for_tts("10 000"))
        self.assertIn("ნომერი ხუთი", verbalize_georgian_for_tts("№ 5"))
        self.assertIn("შე-პე-სე", verbalize_georgian_for_tts("შპს"))
        self.assertIn("დე-ღე-გე", verbalize_georgian_for_tts("დღგ"))
        self.assertIn("ძველი წელთაღრიცხვით", verbalize_georgian_for_tts("ძვ.წ."))
        self.assertIn("ოცდამეერთე საუკუნის", verbalize_georgian_for_tts("XXI საუკუნის"))
        self.assertIn("გუგლმა", verbalize_georgian_for_tts("Google-მა"))
        self.assertIn("ას ოცი კილომეტრი საათში", verbalize_georgian_for_tts("120 კმ/სთ"))
        self.assertIn("წმინდა გიორგი", verbalize_georgian_for_tts("წმ. გიორგი"))
        self.assertEqual(verbalize_georgian_for_tts("3.05"), "სამი მთელი ნული ხუთი")
        self.assertEqual(verbalize_georgian_for_tts("90 კვ.მ"), "ოთხმოცდაათი კვადრატული მეტრი")
        self.assertEqual(transliterate_latin_word_to_ka("Cambridge"), "ქემბრიჯი")
        self.assertEqual(transliterate_latin_word_to_ka("Tom"), "თომი")

    def test_latin_loanwords_and_acronyms(self):
        self.assertEqual(transliterate_latin_word_to_ka("Tbilisi"), "თბილისი")
        self.assertEqual(transliterate_latin_word_to_ka("Batumi"), "ბათუმი")
        self.assertEqual(transliterate_latin_word_to_ka("Google"), "გუგლი")
        self.assertEqual(transliterate_latin_word_to_ka("Oracle"), "ორაკლი")
        self.assertEqual(transliterate_latin_word_to_ka("Steve"), "სტივ")
        self.assertEqual(transliterate_latin_word_to_ka("Russell"), "რუსელ")
        self.assertEqual(transliterate_latin_word_to_ka("PDF"), "პი-დი-ეფ")

    def test_prepare_ka_tts_utterance_cleans_quotes_and_dashes(self):
        cleaned = prepare_ka_tts_utterance("„გამარჯობა!“ — თქვა გიორგიმ[1].")
        self.assertEqual(cleaned, "გამარჯობა! თქვა გიორგიმ.")
        self.assertEqual(prepare_ka_tts_utterance("მე ვთქვი — გაჩერდი"), "მე ვთქვი, გაჩერდი")
        self.assertEqual(prepare_ka_tts_utterance("ᲐᲮᲐᲚᲘ ᲬᲔᲚᲘ჻"), "ახალი წელი.")
        self.assertEqual(prepare_ka_tts_utterance("სადგური (ძველი შენობა) გაიხსნა."), "სადგური, ძველი შენობა, გაიხსნა.")

    def test_prosody_formatting_and_preset_defaults(self):
        # Legacy float pitch 1.0 multiplier must map to +0Hz (not +1Hz bug)
        self.assertEqual(format_tts_pitch(1.0), "+0Hz")
        self.assertEqual(format_tts_pitch("-2Hz"), "-2Hz")
        self.assertEqual(format_tts_rate("-5%"), "-5%")
        self.assertEqual(format_tts_rate(2), "+2%")
        self.assertEqual(format_tts_rate(1.25), "+25%")
        self.assertIn("ka-male", PRESET_DEFAULT_PROSODY)
        self.assertEqual(PRESET_DEFAULT_PROSODY["ka-male"], ("-5%", "-2Hz"))
        self.assertIn("ka-classic", PRESET_DEFAULT_PROSODY)
        self.assertIn("ka-modern", PRESET_DEFAULT_PROSODY)


if __name__ == "__main__":
    unittest.main()
