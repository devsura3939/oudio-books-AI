import asyncio
from unittest.mock import patch

import pytest

from app.georgian_phonetics import verbalize_georgian_for_tts
from app.training_engine import apply_pack, character_similarity
from app.tts_engine import synthesize_text_to_file, get_available_voices


def test_georgian_native_voice_keeps_author_punctuation():
    for text in [
        'დედ-მამა მოვიდა; მან თქვა: „ხვალ დავბრუნდები.“',
        'როგორ მოხდა ეს, არ ვიცი.',
        'მან იცოდა რომ მოვიდოდი.',
        '„სად მიდიხარ?“',
    ]:
        assert verbalize_georgian_for_tts(text) == text


def test_empty_speech_does_not_replace_existing_audio(tmp_path):
    class EmptyVoice:
        def __init__(self, **kwargs):
            pass

        async def stream(self):
            yield {'type': 'WordBoundary', 'text': 'placeholder'}

    output = tmp_path / 'chapter.mp3'
    output.write_bytes(b'existing verified recording')
    with patch('app.tts_engine.edge_tts.Communicate', EmptyVoice):
        with pytest.raises(RuntimeError, match='no audio'):
            asyncio.run(synthesize_text_to_file('ქართული ტექსტი.', output, voice='ka-GE-GiorgiNeural'))
    assert output.read_bytes() == b'existing verified recording'
    assert not output.with_suffix('.tmp.mp3').exists()


def test_ordered_training_metric_and_literal_replacements():
    assert character_similarity('one two three', 'three two one') < 0.5
    assert character_similarity('ქართული ტექსტი', 'ქართული ტექსტი') == 1
    assert apply_pack('typo', [{'type': 'ocr_fix', 'pattern': 'typo', 'replacement': r'literal\1'}], 'transcribe') == r'literal\1'


def test_offline_voice_list_identifies_georgian_voices():
    async def offline():
        raise ConnectionError('offline')
    with patch('app.tts_engine.edge_tts.list_voices', offline):
        voices = asyncio.run(get_available_voices())
    georgian = [v for v in voices if v.short_name.startswith('ka-')]
    assert georgian
    assert all(v.language == 'ka' for v in georgian)
