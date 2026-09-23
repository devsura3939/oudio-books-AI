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




