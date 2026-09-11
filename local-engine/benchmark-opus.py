import os,json,time,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
import torch
from transformers import MarianMTModel, MarianTokenizer
torch.set_num_threads(4)
p='local-engine/model-cache/opus-en-ka'
tok=MarianTokenizer.from_pretrained(p,local_files_only=True)
model=MarianMTModel.from_pretrained(p,local_files_only=True).eval()
results=[]
for s in ['The only entrance to the estate was a small door in the west wall.','Her report never exceeded one hundred words.','He did not open the door because he was afraid.','She put her book on the table and waited for her brother.','David bought three books, but he did not read the second one.']:
 start=time.time()
 with torch.inference_mode(): out=model.generate(**tok(s,return_tensors='pt',truncation=False),max_new_tokens=256,num_beams=4)
 row={'source':s,'translation':tok.decode(out[0],skip_special_tokens=True),'seconds':round(time.time()-start,2)}
 results.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
Path('local-engine/opus-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
