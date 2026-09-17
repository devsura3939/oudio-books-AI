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

SUPABASE_URL = os.getenv("EXTERNAL_SUPABASE_URL") or os.getenv("SUPABASE_URL", "http://127.0.0.1:8000")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_qYeXVnqCOngD3NkLzWChmk_wCsIHevt")
SUPABASE_SECRET_KEY = os.getenv("EXTERNAL_SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SECRET_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODk0NzE5NjksImV4cCI6MTk0NzE1MTk2OX0.S7Lc0540LcbGriJ982VSAtN81Ht-oBw9L9fbZdvLLH0")
ADMIN_EMAIL = "ananiadevsurashvili@gmail.com"
ADMIN_USER_ID = "2b4b9033-8527-4e51-b2c8-9a72f5a47412"

def check_supabase_health() -> Dict[str, Any]:
    if not SUPABASE_SECRET_KEY:
        return {"status": "unconfigured"}
    try:
        headers = _admin_headers()
        r = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/books?select=id&limit=1", headers=headers)
        with urllib.request.urlopen(r, timeout=8) as resp:
            return {"status": "connected", "project": "oudio-books-oci", "http_code": resp.status}
    except Exception as e:
        return {"status": "offline", "detail": str(e)}

def _admin_headers():
    headers = {"apikey": SUPABASE_SECRET_KEY, "Content-Type": "application/json"}
    if SUPABASE_SECRET_KEY.count(".") == 2:
        headers["Authorization"] = f"Bearer {SUPABASE_SECRET_KEY}"
    return headers

def get_admin_session() -> Dict[str, Any]:
    if not SUPABASE_SECRET_KEY:
        raise RuntimeError("Supabase admin access is not configured")
    headers = _admin_headers()
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
    headers = _admin_headers()
    url = f"{SUPABASE_URL}/rest/v1/books?select=*,chapters(*)&user_id=eq.{ADMIN_USER_ID}&order=created_at.desc"
    r = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(r, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def generate_recovery_link(email: str) -> Dict[str, Any]:
    # Triggers recovery email through GoTrue mailer so email is delivered directly to user's inbox
    body = json.dumps({"email": email.strip().lower()}).encode("utf-8")
    headers = {"apikey": SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json"}
    r = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/recover", data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return {
                "success": True,
                "message": "Password reset link has been sent to your email.",
                "email": email.strip().lower()
            }
    except urllib.error.HTTPError as e:
        err_msg = "Could not send password reset email."
        try:
            err_data = json.loads(e.read().decode("utf-8"))
            err_msg = err_data.get("msg") or err_data.get("message") or err_msg
        except Exception:
            pass
        return {
            "success": False,
            "error": {"message": err_msg},
            "email": email.strip().lower()
        }
