# -*- coding: utf-8 -*-
import os
import json
import urllib.request
from typing import Dict, Any, Optional, List

def _load_env():
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

_load_env()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://oakikavdnnvxzlcvsovq.supabase.co")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_oTAYwkdt1yebGkrlKOoijw_9fE4OUBd")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
ADMIN_EMAIL = "ananiadevsurashvili@gmail.com"
ADMIN_USER_ID = "2b4b9033-8527-4e51-b2c8-9a72f5a47412"

def check_supabase_health() -> Dict[str, Any]:
    try:
        headers = {
            "apikey": SUPABASE_SECRET_KEY,
            "Authorization": f"Bearer {SUPABASE_SECRET_KEY}"
        }
        r = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/books?select=id&limit=1", headers=headers)
        with urllib.request.urlopen(r, timeout=8) as resp:
            return {"status": "connected", "project": "oakikavdnnvxzlcvsovq", "http_code": resp.status}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

def get_admin_session() -> Dict[str, Any]:
    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json"
    }
    body = json.dumps({"type": "magiclink", "email": ADMIN_EMAIL}).encode("utf-8")
    r1 = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/admin/generate_link", data=body, headers=headers, method="POST")
    with urllib.request.urlopen(r1, timeout=10) as resp1:
        h = json.loads(resp1.read().decode("utf-8")).get("hashed_token")

    vbody = json.dumps({"type": "magiclink", "token_hash": h}).encode("utf-8")
    vheaders = {"apikey": SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json"}
    r2 = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/verify", data=vbody, headers=vheaders, method="POST")
    with urllib.request.urlopen(r2, timeout=10) as resp2:
        return json.loads(resp2.read().decode("utf-8"))

def fetch_supabase_books() -> List[Dict[str, Any]]:
    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}"
    }
    url = f"{SUPABASE_URL}/rest/v1/books?select=*,chapters(*)&user_id=eq.{ADMIN_USER_ID}&order=created_at.desc"
    r = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(r, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))
