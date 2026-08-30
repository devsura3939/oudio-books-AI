from fastapi.testclient import TestClient

from app.main import app
from test_fixtures import create_sample_pdf, SAMPLE_PDF_PATH

# Build the fixture if missing so a fresh clone can run this file directly.
if not SAMPLE_PDF_PATH.exists():
    create_sample_pdf()

client = TestClient(app)

# 1. Test index
r = client.get('/')
print('GET / Status:', r.status_code)
assert r.status_code == 200

# 2. Test voices API
r = client.get('/api/voices')
print('GET /api/voices Status:', r.status_code)
voices = r.json()
print(f'Retrieved {len(voices)} neural voices.')
assert len(voices) > 0
print('Top voice:', voices[0]['friendly_name'])

# 3. Test preview API
r = client.post('/api/voices/preview', json={'voice': 'en-US-ChristopherNeural', 'text': 'Testing audio.'})
print('POST /api/voices/preview Status:', r.status_code)
assert r.status_code == 200
print('Preview URL:', r.json()['preview_url'])

# 4. Test PDF upload endpoint
with open(SAMPLE_PDF_PATH, 'rb') as f:
    r = client.post('/api/upload', files={'file': ('sample_story.pdf', f, 'application/pdf')})
print('POST /api/upload Status:', r.status_code)
assert r.status_code == 200
book = r.json()
print(f'Uploaded & parsed book: "{book["title"]}", {len(book["chapters"])} chapters.')
assert len(book["chapters"]) > 0
assert any("lighthouse" in c["text"].lower() for c in book["chapters"]), \
    "chapter text should be extracted from the PDF"

# 5. Test book retrieval
r = client.get(f'/api/book/{book["id"]}')
print(f'GET /api/book/{book["id"]} Status:', r.status_code)
assert r.status_code == 200

print('ALL API ENDPOINTS TESTED AND WORKING PERFECTLY!')
