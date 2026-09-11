import os, ssl, httpx
os.environ['HF_HUB_DISABLE_XET']='1'
from huggingface_hub import snapshot_download, set_client_factory
set_client_factory(lambda: httpx.Client(verify=ssl.create_default_context(), timeout=120, follow_redirects=True))
snapshot_download('zenoverflow/madlad400-3b-mt-int8-float32', revision='1fc4bdce0fd3e9c169cfaecfd1bf17a3f9f1a3a1',local_dir='local-engine/model-cache/madlad400',allow_patterns=['model.bin','config.json','shared_vocabulary.json','spiece.model','tokenizer_config.json','added_tokens.json','special_tokens_map.json'])
print('Model ready',flush=True)
