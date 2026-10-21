import unittest
from app.tts_engine import trim_speech_silence, synthesize_single_speech


class TestSilenceTrimming(unittest.TestCase):
    def test_trim_speech_silence_short_or_empty(self):
        # Empty or tiny byte payload should return as-is without raising
        self.assertEqual(trim_speech_silence(b""), b"")
        self.assertEqual(trim_speech_silence(b"123"), b"123")
        dummy = b"x" * 250
        self.assertEqual(trim_speech_silence(dummy), dummy)

    def test_trim_speech_silence_invalid_audio_fallback(self):
        # Invalid MP3 bytes should safely fallback to unmodified input
        corrupted = b"RIFF" + b"\x00" * 500
        result = trim_speech_silence(corrupted)
        self.assertEqual(result, corrupted)

    def test_cache_key_v3_bump(self):
        # Verify synthesize_single_speech uses v3_ cache key
        import inspect
        source = inspect.getsource(synthesize_single_speech)
        self.assertIn('v3_', source, "synthesize_single_speech should use v3_ cache key prefix")
        self.assertIn('trim_speech_silence', source, "synthesize_single_speech should apply trim_speech_silence")


if __name__ == '__main__':
    unittest.main()
