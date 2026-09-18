# -*- coding: utf-8 -*-
import json
import urllib.request

payload = {
    "text": "The fortress was built on the high rock.",
    "source_lang": "en",
    "target_lang": "ka"
}

req = urllib.request.Request(
    "http://127.0.0.1:8001/api/server-translate",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("STATUS:", resp.status)
        print("TRANSLATION:", data.get("translation"))
        print("ENGINE:", data.get("engine"))
except Exception as e:
    print("ERROR:", e)
