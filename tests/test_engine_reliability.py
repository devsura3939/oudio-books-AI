"""Behavioral regression tests; providers are mocked, no customer data or API charges."""
import io
from types import SimpleNamespace as NS
from unittest.mock import patch

from PIL import Image
from app.text_integrity import clean_verbatim, detect_language, normalize_language, split_bounded, vision_prompt
from app.training_engine import evaluate_pack, is_improvement
from app.transcription_engine import transcribe_audio_bytes, transcribe_image_bytes
from app.tts_engine import split_text_into_chunks
from app.translation_engine import translate_text


def test_exact_text_and_language():
    text = 'ᲥᲐᲠᲗᲣᲚᲘ წარმოადგენს ჳ ჴ ჵ. 5 + 3 = 8.'
    assert clean_verbatim(text) == text
    assert detect_language(text) == 'ka'
    assert normalize_language('ka-GE') == 'ka'
    assert normalize_language('en-US') == 'en'


def test_hard_tts_cap_and_coverage():
    for text in ['x' * 30001, 'Ა' * 20001, 'One long sentence ' * 900]:
        chunks = split_text_into_chunks(text, 300)
        assert max(map(len, chunks)) <= 300
        assert ''.join(chunks) == text.strip()
    assert split_bounded('a', 1) == ['a']


def response(text, reason='STOP'):
    return NS(text=text, candidates=[NS(finish_reason=reason)])


def test_translation_outage_never_returns_original_as_success():
    source = 'მხოლოდ გულით შეიძლება სწორად დანახვა.'
    with patch('app.translation_engine.genai', None), patch('app.translation_engine.GoogleTranslator', None), patch('httpx.get', side_effect=TimeoutError):
        result = translate_text(source, 'ka-GE', 'en-US')
    assert not result['success']
    assert result['translated'] == ''
    assert result['failed_chunk'] == 0


def test_translation_rejects_truncated_gemini_and_wrong_script():
    generate = NS(generate_content=lambda **kw: response('Partial output', 'MAX_TOKENS'))
    with patch('app.translation_engine.genai', NS(Client=lambda **kw: NS(models=generate))), patch('app.translation_engine.GoogleTranslator', None), patch('httpx.get', return_value=NS(status_code=200, json=lambda: [[['ქართული ტექსტი']]])):
        result = translate_text('ქართული ტექსტი', 'ka', 'en', api_key='fixture-only')
    assert not result['success']
    assert result['translated'] == ''


def test_middle_chunk_failure_retains_partial_outputs_without_publishing_them():
    responses = iter([NS(status_code=200, json=lambda: [[['This is a complete first paragraph.']]]), NS(status_code=503)])
    with patch('app.translation_engine.genai', None), patch('app.translation_engine.GoogleTranslator', None), patch('app.translation_engine.load_active_pack', None), patch('httpx.get', side_effect=lambda *a, **kw: next(responses)):
        result = translate_text('ეს არის სრული პირველი წინადადება.\n\nეს არის მეორე წინადადება.', 'ka', 'en')
    assert not result['success']
    assert result['translated'] == ''
    assert result['failed_chunk'] == 1
    assert result['accepted_chunks'] == ['This is a complete first paragraph.']


def test_same_language_translation_preserves_original_verbatim():
    text = 'ᲥᲐᲠᲗᲣᲚᲘ წარმოადგენს ჳ ჴ ჵ.'
    assert translate_text(text, 'ka-GE', 'geo')['translated'] == text


def test_translation_chunks_are_bounded_without_creating_extra_paragraphs():
    from urllib.parse import urlparse, parse_qs
    sizes = []
    def translated(url, **kwargs):
        chunk = parse_qs(urlparse(url).query)['q'][0]
        sizes.append(len(chunk))
        return NS(status_code=200, json=lambda: [[['English text. ' * max(1, len(chunk) // 14)]]])
    with patch('app.translation_engine.genai', None), patch('app.translation_engine.GoogleTranslator', None), patch('app.translation_engine.load_active_pack', None), patch('httpx.get', side_effect=translated):
        result = translate_text('ქართულიტექსტი' * 900 + '\n\n' + 'ქართულიტექსტი' * 500, 'ka', 'en')
    assert result['success']
    assert len(sizes) > 2 and max(sizes) <= 4000
    assert result['translated'].count('\n\n') == 1


def test_audio_verbatim_preserves_georgian_verb():
    original = 'ᲔᲡ წარმოადგენს ჳ ჴ ჵ.'
    generate = NS(generate_content=lambda **kw: response(original))
    with patch('app.transcription_engine.genai', NS(Client=lambda **kw: NS(models=generate))), patch('app.transcription_engine.types', NS(Part=NS(from_bytes=lambda **kw: kw))):
        result = transcribe_audio_bytes(b'audio fixture', language='ka-GE', api_key='fixture-only')
    assert result['text'] == original
    assert result['language'] == 'ka'


def test_audio_does_not_use_english_fallback_for_auto():
    with patch('app.transcription_engine.genai', None), patch('app.transcription_engine.sr') as speech:
        result = transcribe_audio_bytes(b'RIFF fixture', language='auto')
        assert not result['success']
        speech.Recognizer.assert_not_called()


def test_image_preserves_verbatim_and_proposes_trained_correction():
    original = 'ეს წარმოადგენს ქართულ ტექსტს. 5 + 3 = 8.'
    buf = io.BytesIO(); Image.new('RGB', (10,10), 'white').save(buf, format='PNG')
    generate = NS(generate_content=lambda **kw: response(original))
    with patch('app.transcription_engine.genai', NS(Client=lambda **kw: NS(models=generate))), patch('app.transcription_engine.types', NS(Part=NS(from_bytes=lambda **kw: kw))), patch('app.transcription_engine.enhance_page_image', side_effect=lambda im: im), patch('app.transcription_engine.load_active_pack',return_value={'items':[]}), patch('app.transcription_engine.apply_pack',return_value='Suggested correction'):
        result = transcribe_image_bytes(buf.getvalue(), mime_type='image/png',language='auto', api_key='fixture-only')
    assert result['text'] == original
    assert result['repair_proposal']['source'] == original
    assert result['needs_review']
    assert 'do not assume' in vision_prompt('auto')


def test_training_rejects_equal_pass_count_regression_swap():
    cases = [dict(id='protected',source='correct',expected='correct',kind='transcribe',weight=1),dict(id='broken',source='typo',expected='fixed',kind='transcribe',weight=3)]
    before = evaluate_pack([],cases)
    rules = [dict(id='a',type='ocr_fix',pattern='correct',replacement='wrong'),dict(id='b',type='ocr_fix',pattern='typo',replacement='fixed')]
    after = evaluate_pack(rules,cases)
    assert after['passed'] == before['passed']
    assert after['score'] > before['score']
    ok, reason = is_improvement(before, after)
    assert not ok and 'protected' in reason
    better = evaluate_pack(rules[1:],cases)
    assert is_improvement(before,better)[0]


def test_training_keeps_all_case_results_beyond_failure_display_limit():
    cases = [dict(id=str(i),source='a',expected='b',kind='transcribe',weight=1) for i in range(40)]
    result = evaluate_pack([],cases)
    assert len(result['failures']) == 25
    assert len(result['case_results']) == 40
    assert not is_improvement({'total':1},{'total':1})[0]
