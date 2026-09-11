import json,time,sys
from pathlib import Path
import ctranslate2,sentencepiece as spm
sys.stdout.reconfigure(encoding='utf-8')
p=Path('local-engine/model-cache/madlad400')
sp=spm.SentencePieceProcessor(model_file=str(p/'spiece.model'))
tr=ctranslate2.Translator(str(p),device='cpu',compute_type='int8',inter_threads=1,intra_threads=4)
for s in ['The only entrance to the estate was a small door in the west wall.','Her report never exceeded one hundred words.','He did not open the door because he was afraid.','She put her book on the table and waited for her brother.']:
 start=time.time()
 tokens=sp.encode('<2ka> '+s,out_type=str)+['</s>']
 result=tr.translate_batch([tokens],beam_size=4,max_decoding_length=256,max_input_length=0,return_end_token=True)[0]
 out=sp.decode([t for t in result.hypotheses[0] if t!='</s>'])
 print(json.dumps({'source':s,'translation':out,'seconds':round(time.time()-start,2)},ensure_ascii=False),flush=True)
