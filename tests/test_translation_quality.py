from unittest.mock import patch
import pytest
from app.text_integrity import translation_is_valid
from app.local_neural import token_parts, translate_local


def test_phonetic_english_and_repetition_are_rejected():
    source = 'The only entrance to the estate was a small door in the west wall.'
    assert not translation_is_valid(source, 'თე ონე ენტრანსე ტო თე ესტატე ვას ა სმოლ დორ ინ თე ვესტ ვოლ.', 'ka')
    assert not translation_is_valid('Her report never exceeded one hundred words.', 'არასოდეს არასოდეს არასოდეს არასოდეს არასოდეს', 'ka')
    assert translation_is_valid(source, 'მამულში შესასვლელი ერთადერთი კარი დასავლეთის კედელში იყო.', 'ka')
    assert translation_is_valid('No, no, no, no!', 'არა, არა, არა, არა!', 'ka')


def test_model_splitting_preserves_all_input_and_never_truncates():
    for source in ['word ' * 450, 'ქართული ტექსტი.\n\n' * 120]:
        parts = token_parts(source, lambda t: list(t), limit=160)
        assert ''.join(parts) == source
        assert all(len(p) <= 160 for p in parts)
    with pytest.raises(ValueError, match='unbroken'):
        token_parts('x' * 180, lambda t: list(t), limit=160)


def test_missing_model_does_not_start_an_implicit_download():
    with patch('app.local_neural.available', return_value=False):
        with pytest.raises(RuntimeError, match='not installed'):
            translate_local('Hello there.', 'en', 'ka')


def test_local_model_rejects_invalid_generation():
    from types import SimpleNamespace as NS
    from app.local_neural import model_directory
    tokenizer=NS(encode=lambda value:list(value.split()))
    with patch('app.local_neural.available',return_value=True), patch('app.local_neural._model',object()), patch('app.local_neural._tokenizer',tokenizer), patch('app.local_neural._loaded_path',model_directory()), patch('app.local_neural._generate',return_value='არასოდეს '*5):
        with pytest.raises(ValueError):
            translate_local('Her report never exceeded one hundred words.','en','ka')


def test_local_translation_preserves_paragraphs_and_rejects_unsupported_direction():
    from types import SimpleNamespace as NS
    from app.local_neural import model_directory
    tokenizer=NS(encode=lambda value:list(value.split()))
    with patch('app.local_neural.available',return_value=True), patch('app.local_neural._model',object()), patch('app.local_neural._tokenizer',tokenizer), patch('app.local_neural._loaded_path',model_directory()), patch('app.local_neural._generate',return_value='მან კარი გააღო.'):
        result=translate_local('He opened the door.\n\nHe opened the door.','en','ka')
    assert result=='მან კარი გააღო.\n\nმან კარი გააღო.'
    with pytest.raises(ValueError,match='English to Georgian'):
        translate_local('ქართული','ka','en')
