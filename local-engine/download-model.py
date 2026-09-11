"""Explicit, resumable-file setup; no model downloads during translation."""
import hashlib
import json
import os
import urllib.request
from pathlib import Path

MODEL = 'Helsinki-NLP/opus-mt-synthetic-en-ka'
REVISION = 'a6ce8b81bfb8ada72c208493ecc1bce50650cd47'
FILES = ['config.json','generation_config.json','pytorch_model.bin','source.spm','target.spm','vocab.json',
         'tokenizer_config.json','special_tokens_map.json','added_tokens.json','README.md']
destination = Path(os.environ.get('ENGBOT_LOCAL_MODEL_DIR',str(Path(__file__).resolve().parent/'model-cache/opus-en-ka')))

def download():
    destination.mkdir(parents=True,exist_ok=True)
    with urllib.request.urlopen(f'https://huggingface.co/api/models/{MODEL}/revision/{REVISION}?blobs=true',timeout=30) as response:
        metadata=json.load(response)
    if metadata['sha'] != REVISION:
        raise RuntimeError('Unexpected model revision')
    records={item['rfilename']:item for item in metadata['siblings']}
    for name in FILES:
        record=records[name]
        expected_hash=record.get('lfs',{}).get('sha256')
        target=destination/name
        if target.is_file() and target.stat().st_size==record['size']:
            if not expected_hash or hashlib.sha256(target.read_bytes()).hexdigest()==expected_hash:
                continue
        temporary=destination/(name+'.download')
        digest=hashlib.sha256()
        with urllib.request.urlopen(f'https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}?download=true',timeout=120) as response, temporary.open('wb') as output:
            while chunk:=response.read(1024*1024):
                output.write(chunk);digest.update(chunk)
        if temporary.stat().st_size!=record['size'] or expected_hash and digest.hexdigest()!=expected_hash:
            raise RuntimeError('Model file verification failed: '+name)
        temporary.replace(target)
        print('Installed',name,flush=True)
    print('English-to-Georgian model ready at',destination)

if __name__=='__main__':
    download()
