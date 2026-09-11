"""Real inference smoke test. This is not a literary-quality certification."""
import json
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.local_neural import translate_local, model_id
sys.stdout.reconfigure(encoding='utf-8')
cases = [
    ('en','ka','The only entrance to the estate was a small door in the west wall.'),
    ('en','ka','Her report never exceeded one hundred words.'),
    ('en','ka','He did not open the door because he was afraid.'),
    ('en','ka','She put her book on the table and waited for her brother.'),
    ('en','ka','David bought three books, but he did not read the second one.'),
]
results=[]
for source_lang, target_lang, source in cases:
    start=time.monotonic()
    try:
        result=translate_local(source,source_lang,target_lang)
        row={'source':source,'sourceLanguage':source_lang,'targetLanguage':target_lang,'translation':result,'seconds':round(time.monotonic()-start,2)}
    except Exception as error:
        row={'source':source,'error':str(error)}
    results.append(row)
    print(json.dumps(row,ensure_ascii=False),flush=True)
    Path(__file__).with_name('benchmark-results.json').write_text(json.dumps({'model':model_id(),'cases':results},ensure_ascii=False,indent=2),encoding='utf-8')
if any('error' in row for row in results):
    sys.exit(1)
