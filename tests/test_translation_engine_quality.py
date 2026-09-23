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

