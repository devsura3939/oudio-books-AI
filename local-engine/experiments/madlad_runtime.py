"""Optional, CPU-only MADLAD translation. No downloads during book processing."""
import os
import re
import threading
from pathlib import Path
from app.text_integrity import translation_is_valid

_lock = threading.Lock()
_model = None
_tokenizer = None
_model_path = None


def model_directory():
    return Path(os.environ.get('ENGBOT_LOCAL_MODEL_DIR', 'local-engine/model-cache/madlad400')).resolve()


def available():
    return all((model_directory() / name).is_file() for name in ('model.bin', 'spiece.model', 'config.json'))


def token_parts(text, encode, limit=160):
    """Exact input partitions, never tokenizer truncation or character estimates."""
    if len(encode(text)) <= limit:
        return [text]
    boundaries = [m.end() for m in re.finditer(r'\s+', text) if m.end() < len(text)]
    if not boundaries:
        raise ValueError('An unbroken OCR token exceeds the model input limit. Review the source.')
    middle = len(text) // 2
    sentence_boundaries = [m.end() for m in re.finditer(r'(?<=[.!?;…])\s+', text) if len(text)//4 < m.end() < 3*len(text)//4]
    cut = min(sentence_boundaries or boundaries, key=lambda n: abs(n-middle))
    return token_parts(text[:cut], encode, limit) + token_parts(text[cut:], encode, limit)


def translate_local(text, source_lang, target_lang):
    global _model, _tokenizer, _model_path
    if source_lang not in ('en', 'ka') or target_lang not in ('en', 'ka'):
        raise ValueError('The local engine currently supports English and Georgian.')
    if len(text) > 6000:
        raise ValueError('Translate at most 6000 characters per request.')
    if source_lang == target_lang:
        return text
    if not available():
        raise RuntimeError('Local model is not installed. Run local-engine/download-model.py first.')
    if not _lock.acquire(blocking=False):
        raise BlockingIOError('The local model is busy. Retry after the current segment.')
    try:
        path = model_directory()
        if _model is None or _model_path != path:
            import ctranslate2
            import sentencepiece
            tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(path / 'spiece.model'))
            model = ctranslate2.Translator(str(path), device='cpu', compute_type='int8', inter_threads=1, intra_threads=4)
            _model, _tokenizer, _model_path = model, tokenizer, path
        encode = lambda value: _tokenizer.encode(f'<2{target_lang}> {value}', out_type=str) + ['</s>']
        output = []
        for paragraph in re.split(r'(\n\s*\n)', text):
            if not paragraph.strip():
                output.append(paragraph)
                continue
            translated = []
            for part in token_parts(paragraph, encode):
                result = _model.translate_batch([encode(part.strip())], beam_size=4,
                    max_input_length=0, max_decoding_length=384, return_end_token=True)[0]
                tokens = result.hypotheses[0]
                if not tokens or tokens[-1] != '</s>' or len(tokens) >= 384:
                    raise ValueError('Local model output was cut short; no partial translation was accepted.')
                candidate = _tokenizer.decode(tokens[:-1]).strip()
                if not translation_is_valid(part, candidate, target_lang):
                    raise ValueError('Local model output failed text integrity checks.')
                translated.append(candidate)
            output.append(' '.join(translated))
        return ''.join(output)
    finally:
        _lock.release()
