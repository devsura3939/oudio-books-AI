"""Optional English-to-Georgian Marian model. No downloads or paid providers at inference."""
import importlib.util
import os
import re
import threading
from pathlib import Path
from app.text_integrity import translation_is_valid

_lock = threading.Lock()
_model = None
_tokenizer = None
_loaded_path = None
MODEL_ID = 'Helsinki-NLP/opus-mt-synthetic-en-ka'
REVISION = 'a6ce8b81bfb8ada72c208493ecc1bce50650cd47'

def model_directory():
    return Path(os.environ.get('ENGBOT_LOCAL_MODEL_DIR',str(Path(__file__).resolve().parents[1]/'local-engine/model-cache/opus-en-ka'))).resolve()

def model_id():
    return MODEL_ID

def available():
    return all((model_directory()/name).is_file() for name in ['pytorch_model.bin','config.json','source.spm','target.spm','vocab.json']) and all(importlib.util.find_spec(name) is not None for name in ['torch','transformers','sentencepiece'])

def token_parts(text, encode, limit=192):
    """Exact partitions, measured with the actual tokenizer; no truncation."""
    if len(encode(text)) <= limit:
        return [text]
    boundaries = [m.end() for m in re.finditer(r'\s+', text) if m.end() < len(text)]
    if not boundaries:
        raise ValueError('An unbroken OCR token exceeds the model input limit. Review the source.')
    middle = len(text) // 2
    sentences = [m.end() for m in re.finditer(r'(?<=[.!?;…])\s+', text) if len(text)//4 < m.end() < 3*len(text)//4]
    cut = min(sentences or boundaries, key=lambda n: abs(n-middle))
    return token_parts(text[:cut], encode, limit) + token_parts(text[cut:], encode, limit)

def _generate(part):
    import torch
    inputs = _tokenizer(part,return_tensors='pt',truncation=False)
    with torch.inference_mode():
        outputs = _model.generate(**inputs,max_new_tokens=384,num_beams=4,do_sample=False)
    tokens = outputs[0].tolist()
    if not tokens or tokens[-1] != _model.config.eos_token_id or len(tokens) >= 385:
        raise ValueError('Local model output was cut short; no partial translation was accepted.')
    return _tokenizer.decode(tokens,skip_special_tokens=True).strip()

def translate_local(text, source_lang, target_lang):
    global _model, _tokenizer, _loaded_path
    if (source_lang,target_lang) != ('en','ka'):
        raise ValueError('This local model supports English to Georgian. Other directions use the online engines.')
    if len(text)>6000:
        raise ValueError('Translate at most 6000 characters per request.')
    if not available():
        raise RuntimeError('Local model is not installed. Run local-engine/download-model.py and install local requirements.')
    if not _lock.acquire(blocking=False):
        raise BlockingIOError('The local model is busy. Retry after the current segment.')
    try:
        path = model_directory()
        if _model is None or _loaded_path != path:
            import torch
            from transformers import MarianMTModel, MarianTokenizer
            torch.set_num_threads(4)
            tokenizer = MarianTokenizer.from_pretrained(str(path),local_files_only=True)
            model = MarianMTModel.from_pretrained(str(path),local_files_only=True).eval()
            _model, _tokenizer, _loaded_path = model, tokenizer, path
        output=[]
        for paragraph in re.split(r'(\n\s*\n)',text):
            if not paragraph.strip():
                output.append(paragraph)
                continue
            translated=[]
            for part in token_parts(paragraph,lambda value:_tokenizer.encode(value)):
                candidate=_generate(part.strip())
                if not translation_is_valid(part,candidate,target_lang):
                    raise ValueError('Local model output failed text integrity checks.')
                translated.append(candidate)
            output.append(' '.join(translated))
        return ''.join(output)
    finally:
        _lock.release()
