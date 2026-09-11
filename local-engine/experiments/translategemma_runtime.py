"""Local TranslateGemma via LM Studio/llama.cpp; no paid provider or implicit downloads."""
import os
import re
import threading
import httpx
from app.text_integrity import translation_is_valid

_lock = threading.Lock()
LANGUAGES = {'en': 'English', 'ka': 'Georgian'}

def endpoint():
    return os.environ.get('ENGBOT_LOCAL_COMPLETIONS', 'http://127.0.0.1:1234/v1').rstrip('/')

def model_id():
    return os.environ.get('ENGBOT_LOCAL_MODEL', 'engbot-translategemma')

def available():
    try:
        r = httpx.get(endpoint() + '/models', timeout=3)
        r.raise_for_status()
        return any(model.get('id') == model_id() for model in r.json().get('data', []))
    except (httpx.HTTPError, ValueError):
        return False

def token_parts(text, encode, limit=650):
    """Exact partitions; budget UTF-8 bytes conservatively, never truncate text."""
    if len(encode(text)) <= limit:
        return [text]
    boundaries = [m.end() for m in re.finditer(r'\s+', text) if m.end() < len(text)]
    if not boundaries:
        raise ValueError('An unbroken OCR token exceeds the model input limit. Review the source.')
    middle = len(text) // 2
    sentences = [m.end() for m in re.finditer(r'(?<=[.!?;…])\s+', text) if len(text)//4 < m.end() < 3*len(text)//4]
    cut = min(sentences or boundaries, key=lambda n: abs(n-middle))
    return token_parts(text[:cut], encode, limit) + token_parts(text[cut:], encode, limit)

def translation_prompt(text, source_lang, target_lang):
    source, target = LANGUAGES[source_lang], LANGUAGES[target_lang]
    # Text-only prompt reproduced from the model's embedded official chat template.
    return (f'<bos><start_of_turn>user\nYou are a professional {source} ({source_lang}) to '
            f'{target} ({target_lang}) translator. Your goal is to accurately convey the meaning and '
            f'nuances of the original {source} text while adhering to {target} grammar, '
            f'vocabulary, and cultural sensitivities.\n'
            f'Produce only the {target} translation, without any additional explanations or '
            f'commentary. Please translate the following {source} text into {target}:\n\n\n'
            f'{text.strip()}<end_of_turn>\n<start_of_turn>model\n')

def translate_local(text, source_lang, target_lang):
    if source_lang not in LANGUAGES or target_lang not in LANGUAGES:
        raise ValueError('The local engine currently supports English and Georgian.')
    if len(text) > 6000:
        raise ValueError('Translate at most 6000 characters per request.')
    if source_lang == target_lang:
        return text
    if not available():
        raise RuntimeError('Local model is not loaded. Start the TranslateGemma model first.')
    if not _lock.acquire(blocking=False):
        raise BlockingIOError('The local model is busy. Retry after the current segment.')
    try:
        output = []
        with httpx.Client(timeout=120) as client:
            for paragraph in re.split(r'(\n\s*\n)', text):
                if not paragraph.strip():
                    output.append(paragraph)
                    continue
                translated = []
                for part in token_parts(paragraph, lambda value: value.encode('utf-8')):
                    prompt = translation_prompt(part, source_lang, target_lang)
                    response = client.post(endpoint() + '/completions', json={
                        'model':model_id(), 'prompt':prompt, 'temperature':0,
                        'max_tokens':768, 'stream':False, 'stop':['<end_of_turn>','<eos>'],
                    })
                    response.raise_for_status()
                    data = response.json()
                    choice = (data.get('choices') or [{}])[0]
                    if choice.get('finish_reason') != 'stop':
                        raise ValueError('Local model output was cut short; no partial translation was accepted.')
                    candidate = choice.get('text', '').strip()
                    if not translation_is_valid(part, candidate, target_lang):
                        raise ValueError('Local model output failed text integrity checks.')
                    translated.append(candidate)
                output.append(' '.join(translated))
        return ''.join(output)
    except httpx.HTTPError as error:
        raise RuntimeError('Local translation runtime did not complete the request.') from error
    finally:
        _lock.release()
