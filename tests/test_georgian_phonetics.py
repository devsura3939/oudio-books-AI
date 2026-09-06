# -*- coding: utf-8 -*-
"""
Unit & Integration Tests for Georgian Phonetics and TTS Verbalizer.
Ensures numbers, ordinals, dates, currencies, fractions, abbreviations,
Latin transliteration, and prosodic breathing pauses are correctly processed.
"""

import sys
import unittest
import asyncio
from pathlib import Path

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')
REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR))

from app.georgian_phonetics import (
    georgian_number_to_words,
    georgian_ordinal_to_words,
    verbalize_georgian_for_tts,
    transliterate_latin_word_to_ka,
    transliterate_latin_in_georgian
)
from app.tts_engine import generate_voice_preview


class TestGeorgianPhonetics(unittest.TestCase):

    def test_georgian_number_to_words_vigesimal(self):
        self.assertEqual(georgian_number_to_words(0), "ნული")
        self.assertEqual(georgian_number_to_words(1), "ერთი")
        self.assertEqual(georgian_number_to_words(10), "ათი")
        self.assertEqual(georgian_number_to_words(11), "თერთმეტი")
        self.assertEqual(georgian_number_to_words(19), "ცხრამეტი")
        self.assertEqual(georgian_number_to_words(20), "ოცი")
        self.assertEqual(georgian_number_to_words(21), "ოცდაერთი")
        self.assertEqual(georgian_number_to_words(40), "ორმოცი")
        self.assertEqual(georgian_number_to_words(55), "ორმოცდათხუთმეტი")
        self.assertEqual(georgian_number_to_words(60), "სამოცი")
        self.assertEqual(georgian_number_to_words(80), "ოთხმოცი")
        self.assertEqual(georgian_number_to_words(99), "ოთხმოცდაცხრამეტი")
        self.assertEqual(georgian_number_to_words(100), "ასი")
        self.assertEqual(georgian_number_to_words(105), "ას ხუთი")
        self.assertEqual(georgian_number_to_words(200), "ორასი")
        self.assertEqual(georgian_number_to_words(1000), "ათასი")
        self.assertEqual(georgian_number_to_words(1921), "ათას ცხრაას ოცდაერთი")
        self.assertEqual(georgian_number_to_words(2024), "ორი ათას ოცდაოთხი")
        self.assertEqual(georgian_number_to_words(1_000_000), "მილიონი")
        self.assertEqual(georgian_number_to_words(1_000_000_000), "მილიარდი")

    def test_georgian_ordinal_to_words(self):
        self.assertEqual(georgian_ordinal_to_words(1), "პირველი")
        self.assertEqual(georgian_ordinal_to_words(2), "მეორე")
        self.assertEqual(georgian_ordinal_to_words(3), "მესამე")
        self.assertEqual(georgian_ordinal_to_words(5), "მეხუთე")
        self.assertEqual(georgian_ordinal_to_words(10), "მეათე")
        self.assertEqual(georgian_ordinal_to_words(11), "მეთერთმეტე")
        self.assertEqual(georgian_ordinal_to_words(20), "მეოცე")
        self.assertEqual(georgian_ordinal_to_words(21), "ოცდაპირველი")

    def test_verbalize_georgian_ordinals(self):
        res1 = verbalize_georgian_for_tts("1-ლი თავი")
        self.assertIn("პირველი თავი", res1)

        res2 = verbalize_georgian_for_tts("2-ე ნაწილი")
        self.assertIn("მეორე ნაწილი", res2)

        res3 = verbalize_georgian_for_tts("მე-5 გვერდი")
        self.assertIn("მეხუთე გვერდი", res3)

    def test_verbalize_georgian_years_and_dates(self):
        res = verbalize_georgian_for_tts("1921 წელს საქართველომ გამოაცხადა დამოუკიდებლობა")
        self.assertIn("ათას ცხრაას ოცდაერთ წელს", res)

        res2 = verbalize_georgian_for_tts("1939-1945 წლებში")
        self.assertTrue("წლამდე" in res2 or "წლებში" in res2)

    def test_verbalize_currencies_and_percentages(self):
        res_curr = verbalize_georgian_for_tts("წიგნი ღირს 50 ₾ და $100")
        self.assertIn("ორმოცდაათი ლარი", res_curr)
        self.assertIn("ასი დოლარი", res_curr)

        res_pct = verbalize_georgian_for_tts("მოსახლეობის 80% ეთანხმება")
        self.assertIn("ოთხმოცი პროცენტი", res_pct)

    def test_verbalize_fractions_and_measurements(self):
        res = verbalize_georgian_for_tts("დარჩა 1/2 ნაწილი და 10 კმ")
        self.assertIn("ნახევარი", res)
        self.assertIn("ათი კილომეტრი", res)

    def test_verbalize_roman_numerals(self):
        res_head = verbalize_georgian_for_tts("თავი IV მოგვითხრობს")
        self.assertIn("თავი მეოთხე", res_head)

        res_cent = verbalize_georgian_for_tts("XX საუკუნე იყო რთული")
        self.assertIn("მეოცე საუკუნე", res_cent)

        res_king = verbalize_georgian_for_tts("ერეკლე II მეფობდა")
        self.assertIn("ერეკლე მეორე", res_king)

    def test_verbalize_common_abbreviations(self):
        res = verbalize_georgian_for_tts("წიგნები, რვეულები და ა.შ.")
        self.assertIn("და ასე შემდეგ", res)

        res2 = verbalize_georgian_for_tts("ე.ი. ყველაფერი მზადაა")
        self.assertIn("ესე იგი", res2)

        res3 = verbalize_georgian_for_tts("ბ-ნი გიორგი და ქ-ნი ეკა")
        self.assertIn("ბატონი გიორგი", res3)
        self.assertIn("ქალბატონი ეკა", res3)

    def test_transliterate_latin_in_georgian(self):
        res = verbalize_georgian_for_tts("ავტორი Marcus Aurelius წერდა")
        self.assertIn("მარკუს", res)
        self.assertIn("ავრელიუსი", res)

        res_acronym = verbalize_georgian_for_tts("ახალი AI ტექნოლოგია")
        self.assertTrue("ეი-აი" in res_acronym or "ეი აი" in res_acronym)

    def test_prosodic_breathing_pauses(self):
        # Conjunction breathing pauses
        res = verbalize_georgian_for_tts("ჩვენ გვინდოდა წასვლა მაგრამ წვიმდა")
        self.assertIn(", მაგრამ", res)

        # Dialogue dash click removal
        res2 = verbalize_georgian_for_tts("— გამარჯობა, როგორ ხარ?")
        self.assertFalse(res2.startswith("—"))
        self.assertIn("გამარჯობა", res2)

    def test_verbalize_compound_fractions(self):
        res1 = verbalize_georgian_for_tts("დარჩა 1.5 საათი")
        self.assertTrue("ერთ-ნახევარი საათი" in res1 or "ერთ ნახევარი საათი" in res1)

        res2 = verbalize_georgian_for_tts("მან იყიდა 2.5 კგ")
        self.assertTrue("ორ-ნახევარი კილოგრამი" in res2 or "ორ ნახევარი კილოგრამი" in res2)

        res3 = verbalize_georgian_for_tts("დალია 0.5")
        self.assertIn("ნახევარი", res3)

    def test_verbalize_vigesimal_stem_elision(self):
        res1 = verbalize_georgian_for_tts("ეს ეხება 20 კაცს")
        self.assertIn("ოც კაცს", res1)

        res2 = verbalize_georgian_for_tts("იმუშავა 40 დღეს")
        self.assertIn("ორმოც დღეს", res2)

        res3 = verbalize_georgian_for_tts("გაყიდა 60 ლარად")
        self.assertIn("სამოც ლარად", res3)

        res4 = verbalize_georgian_for_tts("იცოცხლა 100 წლამდე")
        self.assertIn("ას წლამდე", res4)

    def test_transliterate_classical_authors(self):
        res1 = verbalize_georgian_for_tts("ავტორი Shota Rustaveli წერდა")
        self.assertIn("შოთა", res1)
        self.assertIn("რუსთაველი", res1)

        res2 = verbalize_georgian_for_tts("ფილოსოფოსი Descartes და Spinoza")
        self.assertIn("დეკარტი", res2)
        self.assertIn("სპინოზა", res2)

        res3 = verbalize_georgian_for_tts("მოაზროვნეები Cicero, Seneca, Epictetus, Machiavelli, Kierkegaard")
        self.assertIn("ციცერონი", res3)
        self.assertIn("სენეკა", res3)
        self.assertIn("ეპიქტეტე", res3)
        self.assertIn("მაკიაველი", res3)
        self.assertIn("კირკეგორი", res3)

    def test_cardinal_and_oblique_stem_concord(self):
        res1 = verbalize_georgian_for_tts("მოვიდა 15 წუთში")
        self.assertIn("თხუთმეტ წუთში", res1)

        res2 = verbalize_georgian_for_tts("შეხვდა 10 კაცს")
        self.assertIn("ათ კაცს", res2)

        res3 = verbalize_georgian_for_tts("გავიდა 25 წელს")
        self.assertIn("ოცდახუთ წელს", res3)

        res4 = verbalize_georgian_for_tts("იყიდა 50 ლარად")
        self.assertIn("ორმოცდაათ ლარად", res4)

    def test_relative_clause_breath_pause(self):
        res1 = verbalize_georgian_for_tts("სახლი რომელშიც ის ცხოვრობდა")
        self.assertIn(", რომელშიც", res1)

        res2 = verbalize_georgian_for_tts("წიგნი რომელსაც ვკითხულობდით")
        self.assertIn(", რომელსაც", res2)

    def test_multiplicative_adverbs(self):
        res1 = verbalize_georgian_for_tts("მან 1-ჯერ სცადა")
        self.assertIn("ერთხელ", res1)

        res2 = verbalize_georgian_for_tts("2-ჯერ გაიმეორა")
        self.assertIn("ორჯერ", res2)

        res3 = verbalize_georgian_for_tts("3-ჯერ მეტი გადაიხადა")
        self.assertIn("სამჯერ მეტი", res3)

        res4 = verbalize_georgian_for_tts("10-ჯერ გაზარდა")
        self.assertIn("ათჯერ", res4)

    def test_clock_time_verbalization(self):
        res1 = verbalize_georgian_for_tts("შეხვედრა დაიწყება 14:30 საათზე")
        self.assertIn("თოთხმეტ საათსა და ნახევარზე", res1)

        res2 = verbalize_georgian_for_tts("მატარებელი გადის 15:00 საათზე")
        self.assertIn("თხუთმეტ საათზე", res2)

    def test_georgian_and_classical_poets(self):
        res1 = verbalize_georgian_for_tts("პოეტი Baratashvili და Chavchavadze")
        self.assertIn("ბარათაშვილი", res1)
        self.assertIn("ჭავჭავაძე", res1)

        res2 = verbalize_georgian_for_tts("ავტორი Dante Alighieri")
        self.assertIn("დანტე", res2)
        self.assertIn("ალიგიერი", res2)

        res3 = verbalize_georgian_for_tts("მთარგმნელი Machabeli და ავტორი Shakespeare")
        self.assertIn("მაჩაბელი", res3)
        self.assertIn("შექსპირი", res3)

        res4 = verbalize_georgian_for_tts("გმირი Achilles ძე Peleus")
        self.assertIn("აქილევსი", res4)
        self.assertIn("პელევსი", res4)

        res5 = verbalize_georgian_for_tts("იგავთმწერალი Sulkhan Saba Orbeliani")
        self.assertIn("სულხან", res5)
        self.assertIn("საბა", res5)
        self.assertIn("ორბელიანი", res5)

        res6 = verbalize_georgian_for_tts("პოეტი Vazha Pshavela და პერსონაჟი Aluda Ketelauri")
        self.assertIn("ვაჟა", res6)
        self.assertIn("ფშაველა", res6)
        self.assertIn("ალუდა", res6)
        self.assertIn("ქეთელაური", res6)

        res7 = verbalize_georgian_for_tts("ფილოსოფოსი Ioane Petritsi და პოემა Merani")
        self.assertIn("იოანე", res7)
        self.assertIn("პეტრიწი", res7)
        self.assertIn("მერანი", res7)

    def test_expanded_relative_clause_breath_pauses(self):
        res1 = verbalize_georgian_for_tts("საქმე რადგანაც მნიშვნელოვანი იყო")
        self.assertIn(", რადგანაც", res1)

        res2 = verbalize_georgian_for_tts("მოვიდა როგორც კი გათენდა")
        self.assertIn(", როგორც კი", res2)

        res3 = verbalize_georgian_for_tts("ხელნაწერი რომლის ავტორიც ცნობილია")
        self.assertIn(", რომლის", res3)

        res4 = verbalize_georgian_for_tts("სტუმარია თუნდ ზღვა ემართოს")
        self.assertIn(", თუნდ", res4)

        res5 = verbalize_georgian_for_tts("მეგობარია თუნდაც შორს იყოს")
        self.assertIn(", თუნდაც", res5)

        res6 = verbalize_georgian_for_tts("ირყევიან ვითარცა ლერწამნი")
        self.assertIn(", ვითარცა", res6)

        res7 = verbalize_georgian_for_tts("ისაუბრეს მხოლოდოდენ სიმართლეზე")
        self.assertIn(", მხოლოდოდენ", res7)

    def test_phase6_historical_and_hagiographical_names(self):
        res1 = verbalize_georgian_for_tts("რომანისტი Gamsakhurdia და Javakhishvili")
        self.assertIn("გამსახურდია", res1)
        self.assertIn("ჯავახიშვილი", res1)

        res2 = verbalize_georgian_for_tts("ხუროთმოძღვარი Konstantine Arsakidze და ტაძარი Svetitskhoveli")
        self.assertIn("კონსტანტინე", res2)
        self.assertIn("არსაკიძე", res2)
        self.assertIn("სვეტიცხოველი", res2)

        res3 = verbalize_georgian_for_tts("პოეტი Davit Guramishvili")
        self.assertIn("დავით", res3)
        self.assertIn("გურამიშვილი", res3)

        res4 = verbalize_georgian_for_tts("ჰაგიოგრაფი Iakob Tsurtaveli და წამება Shushanik")
        self.assertIn("ცურტაველი", res4)
        self.assertIn("შუშანიკი", res4)

        res5 = verbalize_georgian_for_tts("ავტორი Ioane Sabanisdze და მოწამე Abo Tbileli")
        self.assertIn("იოანე", res5)
        self.assertIn("საბანისძე", res5)
        self.assertIn("აბო", res5)
        self.assertIn("თბილელი", res5)

    def test_phase7_modern_classics_and_mountaineer_law(self):
        res1 = verbalize_georgian_for_tts("მწერალი Chabua Amirejibi და გმირი Data Tutashkhia")
        self.assertIn("ამირეჯიბი", res1)
        self.assertIn("თუთაშხია", res1)

        res2 = verbalize_georgian_for_tts("ოფიცერი Mushni Zarandia და მწერალი Nodar Dumbadze")
        self.assertIn("მუშნი", res2)
        self.assertIn("ზარანდია", res2)
        self.assertIn("დუმბაძე", res2)

        res3 = verbalize_georgian_for_tts("ავტორი Alexander Kazbegi და პერსონაჟი Khevisberi Gocha")
        self.assertIn("ყაზბეგი", res3)
        self.assertIn("ხევისბერი", res3)
        self.assertIn("გოჩა", res3)

        res4 = verbalize_georgian_for_tts("მიზეზი რამეთუ სიმართლე გაირკვა")
        self.assertIn(", რამეთუ", res4)

    def test_preview_generation_georgian(self):
        async def _run():
            url = await generate_voice_preview(voice="ka-GE-GiorgiNeural")
            return url
        url = asyncio.run(_run())
        self.assertTrue(url.startswith("/api/audio/preview/"))
        self.assertTrue(url.endswith(".mp3"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
