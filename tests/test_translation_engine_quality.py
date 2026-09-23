# -*- coding: utf-8 -*-
import pytest
from app.text_integrity import translation_is_valid
from app.translation_engine import clean_georgian_morphology, synthesize_georgian_morphology


def test_raw_machine_calques_rejected_by_validator():
    """Verify that blatant raw Google Translate calques are rejected by translation_is_valid."""
    source = "Mankind flung its advance agents outward, ever outward. Finally it flung them into space."
    # Raw MT containing ergative pronoun with intransitive verb "მან ისინი გაფრინდა"
    bad_cand_1 = "კაცობრიობა თავის მოწინავე აგენტებს ყოველთვის გარედან აფრენდა. საბოლოოდ მან ისინი გაფრინდა კოსმოსში."
    assert not translation_is_valid(source, bad_cand_1, "ka"), "Should reject 'მან ისინი გაფრინდა'"

    # Raw MT containing nominative plural with 3rd-person plural transitive aorist "აგენტები იპოვეს"
    bad_cand_2 = "ეს უბედური აგენტები იპოვეს ის, რაც დედამიწაზე უკვე საკმარისად იყო ნაპოვნი."
    assert not translation_is_valid(source, bad_cand_2, "ka"), "Should reject 'აგენტები იპოვეს'"

    # Raw MT containing literal calque "გამოიყურებოდა გარეგნულად"
    bad_cand_3 = "კაცობრიობა გამოიყურებოდა გარეგნულად ყოველთვის გარედან."
    assert not translation_is_valid(source, bad_cand_3, "ka"), "Should reject 'გამოიყურებოდა გარეგნულად'"

    # High quality authentic literary translation MUST pass
    good_cand = "კაცობრიობა თავის მოწინავე დესპანებს მუდამ გარეთ გზავნიდა. ბოლოს და ბოლოს, კოსმოსში გატყორცნა ისინი."
    assert translation_is_valid(source, good_cand, "ka"), "Authentic literary translation must pass"


def test_morphology_cleaner_fixes_calques():
    """Verify clean_georgian_morphology cleans calqued patterns."""
    raw = "კაცობრიობა გამოიყურებოდა გარეგნულად. მან ისინი გაფრინდა კოსმოსში. ეს უბედური აგენტები იპოვეს სიმართლე. გიმკრეკის რელიგიები და თავსატეხების ყუთები."
    cleaned = clean_georgian_morphology(raw)
    assert "მზერას გარეთ მიაპყრობდა" in cleaned
    assert "კოსმოსში გატყორცნა ისინი" in cleaned
    assert "ამ უბედურმა აგენტებმა იპოვეს" in cleaned
    assert "იაფფასიანი რელიგიები" in cleaned
    assert "შინაგან საიდუმლოებებში" in cleaned


def test_ai_settings_endpoint():
    """Verify that /api/settings/ai-status reports configuration."""
    from starlette.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    res = client.get("/api/settings/ai-status")
    assert res.status_code == 200
    data = res.json()
    assert "gemini_configured" in data
    assert "gemini_model" in data


def test_server_ai_gateway_endpoint():
    """Verify that /api/ai gateway endpoint is registered and responds appropriately."""
    from starlette.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    # Test without API key or server model should return 503 rather than 404
    res = client.post("/api/ai", json={"prompt": "Hello", "temperature": 0.1})
    assert res.status_code in (200, 503), f"Expected 200 or 503 from gateway, got {res.status_code}"


def test_expanded_literary_anti_calques():
    """Verify that newly identified Vonnegut/sci-fi calques are rejected and cleaned."""
    source = "Mankind, ignorant of the truths that lie within every human being, looked outward—pushed ever outward."
    calque_sample = "კაცობრიობა, უცოდინარი ჭეშმარიტებების, უბიძგებდა მუდამ გარეგნულად უგემოვნო ზღვაში."
    assert not translation_is_valid(source, calque_sample, "ka")

    cleaned = clean_georgian_morphology(calque_sample)
    assert "ჭეშმარიტების უცოდინარი" in cleaned
    assert "გამუდმებით გარეთ მიილტვოდა" in cleaned
    assert "უგემურ ოკეანეში" in cleaned


def test_subordinate_clause_commas_and_chapter1_calques():
    """Verify that verbs of perception/cognition insert commas before subordinate markers and fix Chapter 1 calques."""
    raw = "ყველამ უკვე იცის როგორ იპოვნოს ცხოვრების აზრი. კაცებსა და ქალებს არ ჰქონდათ მარტივი წვდომა მათში არსებულ საიდუმლოზე. მათ გარეთ გაიხედეს და ისეთივე არსებითი გახდნენ."
    cleaned = clean_georgian_morphology(raw)
    assert "ყველამ უკვე იცის, როგორ" in cleaned
    assert "ადამიანებს ხელი არ მიუწვდებოდათ" in cleaned
    assert "მზერა გარეთ მიაპყრეს" in cleaned
    assert "ისეთივე ხელშესახები" in cleaned


def test_somatic_calques_rejected_and_cleaned():
    """Verify somatic bodily idiom calques are rejected by validator and cleaned."""
    source = "He caught his breath and shrugged his shoulders before bursting into laughter."
    bad_cand = "მან მისი სუნთქვა დაიჭირა და მხრები შეანჯღრია, სანამ სიცილში აფეთქდა."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject somatic calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "სული მოითქვა" in cleaned
    assert "მხრები აიჩეჩა" in cleaned
    assert "სიცილი წასკდა" in cleaned


def test_scifi_cosmic_lexicon_and_temporal():
    """Verify sci-fi terminology and temporal compacting."""
    source = "They traveled in outer space for hours through the empty void."
    bad_cand = "ისინი მოგზაურობდნენ გარე სივრცეში საათების განმავლობაში ცარიელი სიცარიელეში."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject raw sci-fi calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "ღია კოსმოსში" in cleaned
    assert "საათობით" in cleaned
    assert "უკიდეგანო სიცარიელე" in cleaned


def test_animacy_possession_concord():
    """Verify animacy possession concord (ჰყავს vs აქვს)."""
    source = "He has a loyal dog and three children, but he does not have a car."
    bad_cand = "მას აქვს ძაღლი და სამი შვილი, მაგრამ მას ჰყავს მანქანა."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject 'მას აქვს ძაღლი'"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "მას ჰყავს ძაღლი" in cleaned
    assert "მას აქვს მანქანა" in cleaned


def test_mental_and_sensory_calques_rejected_and_cleaned():
    """Verify psychological and sensory gaze calques are rejected and repaired."""
    source = "He lost his mind when he caught her eye and laid eyes on the treasure."
    bad_cand = "მან დაკარგა თავისი გონება, როდესაც დაიჭირა მისი თვალი და დაადო თვალი მას."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject mental and gaze calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "ჭკუიდან შეიშალა" in cleaned
    assert "თვალი მოჰკრა" in cleaned
    assert "თვალი შეავლო" in cleaned


def test_spatial_and_discourse_calques_rejected_and_cleaned():
    """Verify paired organ concord, spatial binomials, and discourse transitions."""
    source = "At first glance, they stood side by side in the middle of nowhere and saw it with their own eyes."
    bad_cand = "პირველ შეხედვაზე, ისინი იდგნენ გვერდი გვერდით არსად შუაში და საკუთარი თვალებით ნახეს."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject raw calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "ერთი შეხედვით" in cleaned
    assert "მხარდამხარ" in cleaned
    assert "უკაცრიელ ადგილას" in cleaned
    assert "საკუთარი თვალით" in cleaned


def test_verba_dicendi_and_somatic_calques_rejected_and_cleaned():
    """Verify inquit speech verbs and involuntary somatic calques are rejected and repaired."""
    source = "He whispered the answer, shouted the command, and heaved a sigh as his heart sank."
    bad_cand = "მან ჩურჩულით თქვა პასუხი, ყვირილით თქვა ბრძანება და გამოუშვა ოხვრა, როცა მისი გული ჩაიძირა."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject speech and somatic calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "ჩაიჩურჩულა" in cleaned
    assert "დაიყვირა" in cleaned
    assert "ამოიოხრა" in cleaned
    assert "გული გადაუქანდა" in cleaned


def test_epistemic_temporal_and_adversative_calques_rejected_and_cleaned():
    """Verify epistemic, durative, and adversative calques are rejected and repaired."""
    source = "It goes without saying that all day long, on the one hand he worked, but on the other hand, far from it."
    bad_cand = "მიდის უთქმელად, რომ მთელი დღე გრძელი, ერთ ხელზე მუშაობდა, მაგრამ მეორე ხელზე, შორს მისგან."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject epistemic, temporal, and adversative calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "თავისთავად ცხადია" in cleaned
    assert "მთელი დღის განმავლობაში" in cleaned
    assert "ერთი მხრივ" in cleaned
    assert "მეორე მხრივ" in cleaned
    assert "სრულებითაც არა" in cleaned


def test_auditory_posture_motion_and_idiom_calques_rejected_and_cleaned():
    """Verify Rule Groups 61-65: auditory verbs, posture, motion directionals, degree, and idioms."""
    source = "The door slammed shut, the floor groaned, he lost his temper, sat cross-legged, and turned away once in a blue moon."
    bad_cand = "კარი დაეჯახა დახურულად, იატაკი ყვიროდა, მან დაკარგა ტემპერამენტი, იჯდა გადაჯვარედინებული ფეხებით, მოშორებით შებრუნდა ერთხელ ლურჯ მთვარეზე."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject auditory, posture, emotion, motion calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "კარი გაჯახუნდა" in cleaned
    assert "იატაკი აჭრაჭუნდა" in cleaned
    assert "მოთმინება დაკარგა" in cleaned
    assert "ფეხმორთხმით იჯდა" in cleaned
    assert "ზურგი შეაქცია" in cleaned
    assert "ძალზე იშვიათად" in cleaned


def test_weather_resultative_and_cognitive_calques_rejected_and_cleaned():
    """Verify Rule Groups 66-70: meteorological verbs, resultatives, volition, cognition, and intensifiers."""
    source = "The rain poured down heavily, the fire burned itself out, he was at a loss for words, it dawned on him, and he sat deep in thought."
    bad_cand = "წვიმამ დაიწყო მძიმედ წვიმა, ცეცხლმა თავი დაწვა, ის იყო სიტყვების დანაკარგში, ეს გათენდა მასზე, რომ დაჯდა ღრმად ფიქრში."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject meteorological, resultative, and cognitive calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "კოკისპირულად გაწვიმდა" in cleaned
    assert "ცეცხლი ჩაქრა" in cleaned
    assert "სიტყვა ვეღარ მოეძებნა" in cleaned
    assert "უეცრად მიხვდა, რომ" in cleaned
    assert "ფიქრებში ჩაძირული" in cleaned


def test_sensory_transit_dialogue_temporal_calques_rejected_and_cleaned():
    """Verify Rule Groups 71-75: sensory, epistemic, motion, dialogue, and temporal calques."""
    source = "A pungent smell hung in the air, he ran without looking back, interrupted his speech, and throughout the day froze in place."
    bad_cand = "მძაფრი სუნი ეკიდა ჰაერში, გაიქცა უკან ყურების გარეშე, გაჭრა მისი სიტყვა, და დღის გავლით გაიყინა ადგილზე ერთ წამში."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject sensory, transit, dialogue, and temporal calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "მძაფრი სუნი იდგა" in cleaned
    assert "უკანმოუხედავად გაიქცა" in cleaned
    assert "სიტყვა შეაწყვეტინა" in cleaned
    assert "მთელი დღის განმავლობაში" in cleaned
    assert "წამიერად გაქვავდა" in cleaned


def test_light_inchoative_directional_intensifier_calques_rejected_and_cleaned():
    """Verify Rule Groups 76-80: environmental light, inchoatives, directional preverbs, intensifiers, and narrative connectives."""
    source = "The sun was setting on the horizon, the door opened of itself, he came inside the room, it was completely obvious, and then he said."
    bad_cand = "მზე ჩადიოდა ჰორიზონტზე, კარი თავისით გაიღო, მოვიდა შიგნით ოთახში, იყო სრულიად აშკარად, და მერე მან თქვა."
    assert not translation_is_valid(source, bad_cand, "ka"), "Should reject light, inchoative, directional, and connective calques"

    cleaned = clean_georgian_morphology(bad_cand)
    assert "მზე ჰორიზონტს ეფარებოდა" in cleaned
    assert "კარი გაიღო" in cleaned
    assert "ოთახში შემოვიდა" in cleaned
    assert "ცხადლივ" in cleaned
    assert "შემდეგ კი თქვა" in cleaned
