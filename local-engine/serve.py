"""Run from the repository: python local-engine/serve.py. Loopback by default."""
import os
import secrets
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from app.local_neural import available, translate_local

app = FastAPI(title='EngBot local translation')
token = os.environ.get('ENGBOT_LOCAL_TOKEN') or secrets.token_urlsafe(32)
origins = os.environ.get('ENGBOT_LOCAL_ORIGINS', 'https://devsura3939.github.io,http://127.0.0.1:8765,http://localhost:8765').split(',')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET','POST'], allow_headers=['Authorization','Content-Type'])

def authorized(authorization: str = Header(default='')):
    if not secrets.compare_digest(authorization, 'Bearer ' + token):
        raise HTTPException(401, 'Connect using the local engine token.')

class Translation(BaseModel):
    text: str = Field(min_length=1, max_length=6000)
    source_lang: str
    target_lang: str

@app.get('/health', dependencies=[Depends(authorized)])
def health():
    return {'ready': available(), 'engine': 'opus-en-ka', 'languages': ['en','ka'], 'directions':['en:ka']}

@app.post('/translate', dependencies=[Depends(authorized)])
async def translate(body: Translation):
    try:
        result = await run_in_threadpool(translate_local, body.text, body.source_lang, body.target_lang)
        return {'success':True, 'translated':result, 'engine':'opus-en-ka'}
    except BlockingIOError as error:
        raise HTTPException(429, str(error))
    except ValueError as error:
        raise HTTPException(422, str(error))
    except RuntimeError as error:
        raise HTTPException(503, str(error))

if __name__ == '__main__':
    import uvicorn
    # Shown only in the operator's terminal, never returned by the API or logged per request.
    print('EngBot local engine at http://127.0.0.1:8766')
    print('Connection token:', token, flush=True) if not os.environ.get('ENGBOT_LOCAL_TOKEN') else print('Using the configured connection token.',flush=True)
    uvicorn.run(app, host='127.0.0.1', port=8766, access_log=False)
