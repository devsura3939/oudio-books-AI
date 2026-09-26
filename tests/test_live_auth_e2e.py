import urllib.request
import json
import time
import re
import sys
import html

email = f"test_user_{int(time.time())}@example.com"
password = "TestPassword123!"
username = "test_user_hero"

import os
try:
    import pytest
except ImportError:
    pytest = None

if not os.path.exists("/home/ubuntu/supabase-project/.env"):
    if pytest:
        pytest.skip("Skipping live auth E2E test: /home/ubuntu/supabase-project/.env not present", allow_module_level=True)
    else:
        sys.exit(0)

# Load anon key
anon_key = ""
with open("/home/ubuntu/supabase-project/.env") as f:
    for line in f:
        if line.startswith("ANON_KEY="):
            anon_key = line.strip().split("=", 1)[1]
            break

if not anon_key:
    print("Failed to find ANON_KEY")
    sys.exit(1)

print("Testing Registration with Email Approval & Password Verification...")
print(f"Target Email: {email}")
print(f"Target Username: {username}")

# 1. Sign Up
signup_url = "http://127.0.0.1:8000/auth/v1/signup"
req = urllib.request.Request(
    signup_url,
    data=json.dumps({
        "email": email,
        "password": password,
        "data": {"username": username}
    }).encode(),
    headers={
        "Content-Type": "application/json",
        "apikey": anon_key
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        signup_res = json.loads(resp.read().decode())
        print("1. Sign Up Successful:")
        print("   User ID:", signup_res.get("id"))
        print("   Confirmed At:", signup_res.get("confirmed_at"))
        print("   Session:", signup_res.get("session"))
        print("   Metadata:", signup_res.get("user_metadata"))
        assert signup_res.get("confirmed_at") is None, "Error: user was autoconfirmed!"
        assert signup_res.get("session") is None, "Error: session was issued before confirmation!"
        print("   [PASS] User created with UNCONFIRMED status and NO session issued.")
except urllib.error.HTTPError as e:
    print("Sign up error:", e.code, e.read().decode())
    sys.exit(1)

# 2. Test Sign In BEFORE confirmation (Must be rejected with 400 Email not confirmed)
signin_url = "http://127.0.0.1:8000/auth/v1/token?grant_type=password"
req_signin = urllib.request.Request(
    signin_url,
    data=json.dumps({"email": email, "password": password}).encode(),
    headers={"Content-Type": "application/json", "apikey": anon_key}
)

try:
    with urllib.request.urlopen(req_signin) as resp:
        print("ERROR: Sign in succeeded without email confirmation!")
        sys.exit(1)
except urllib.error.HTTPError as e:
    err_body = json.loads(e.read().decode())
    err_msg = err_body.get("error_description") or err_body.get("msg") or ""
    print("2. Sign In Before Confirmation Attempt:")
    print("   HTTP Status:", e.code)
    print("   Error Description:", err_msg)
    assert "email not confirmed" in err_msg.lower(), f"Unexpected error: {err_msg}"
    print("   [PASS] Unconfirmed user strictly blocked from signing in!")

# 3. Check Inbucket Mailbox
time.sleep(1)
inbucket_user = email.split("@")[0]
inbucket_url = f"http://127.0.0.1:9000/api/v1/mailbox/{inbucket_user}"
with urllib.request.urlopen(inbucket_url) as resp:
    messages = json.loads(resp.read().decode())
    print("3. Inbucket Mailbox Check:")
    print(f"   Found {len(messages)} message(s) for {inbucket_user}")
    assert len(messages) > 0, "No confirmation email found in Inbucket!"
    msg_id = messages[0]["id"]
    print("   [PASS] Confirmation email delivered to mailbox.")

# 4. Read Message and Extract Confirmation Link
msg_url = f"http://127.0.0.1:9000/api/v1/mailbox/{inbucket_user}/{msg_id}"
with urllib.request.urlopen(msg_url) as resp:
    msg_data = json.loads(resp.read().decode())
    body = msg_data.get("body", {}).get("html", "") or msg_data.get("body", {}).get("text", "")
    print("4. Confirmation Email Details:")
    print("   Subject:", msg_data.get("subject"))
    links = re.findall(r'href=[\"\'](https?://[^\"\']+)[\"\']', body)
    if not links:
        links = re.findall(r'(https?://[^\s]+)', body)
    assert len(links) > 0, "No verification link in email body!"
    verify_link = html.unescape(links[0])
    print("   Extracted Link:", verify_link)
    print("   [PASS] Verification link present in email.")

# 5. Confirm Email via GET to verify link (replace public domain with localhost for test runner)
local_verify_link = verify_link.replace("https://92.5.71.162.sslip.io", "http://127.0.0.1:8000")
# Custom redirect handler that doesn't follow to github.io
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect)
req_v = urllib.request.Request(local_verify_link, headers={"apikey": anon_key})
try:
    with opener.open(req_v) as resp:
        print("5. Verification Execution Status:", resp.status)
except urllib.error.HTTPError as e:
    # 302 or 303 Redirect to frontend with tokens is expected
    if e.code in (302, 303, 307):
        redirect_target = e.headers.get("Location")
        print("5. Verification Execution:")
        print("   Redirect Status:", e.code)
        print("   Target Redirect:", redirect_target)
        print("   [PASS] Email confirmed and redirected to app!")
    else:
        print("Verification error:", e.code, e.read().decode())
        sys.exit(1)

# 6. Test Sign In AFTER confirmation (Must succeed and return access token)
req_signin2 = urllib.request.Request(
    signin_url,
    data=json.dumps({"email": email, "password": password}).encode(),
    headers={"Content-Type": "application/json", "apikey": anon_key}
)
with urllib.request.urlopen(req_signin2) as resp:
    signin_res = json.loads(resp.read().decode())
    print("6. Sign In After Confirmation:")
    print("   Access Token Acquired:", bool(signin_res.get("access_token")))
    print("   User Email:", signin_res.get("user", {}).get("email"))
    print("   Username in Metadata:", signin_res.get("user", {}).get("user_metadata", {}).get("username"))
    assert signin_res.get("user", {}).get("user_metadata", {}).get("username") == username
    print("   [PASS] Authentication successful with verified session and user metadata!")

# 7. Password Recovery Test
print("\n7. Testing Password Recovery Flow...")
reset_url = "http://127.0.0.1:8000/auth/v1/recover"
req_reset = urllib.request.Request(
    reset_url,
    data=json.dumps({"email": email}).encode(),
    headers={"Content-Type": "application/json", "apikey": anon_key}
)
with urllib.request.urlopen(req_reset) as resp:
    print("   [PASS] Password recovery requested successfully.")

time.sleep(1)
with urllib.request.urlopen(inbucket_url) as resp:
    messages = json.loads(resp.read().decode())
    print(f"   Found {len(messages)} message(s) in mailbox.")
    recovery_msg = [m for m in messages if "recovery" in m.get("subject", "").lower() or "reset" in m.get("subject", "").lower()]
    assert len(recovery_msg) > 0, "No recovery email found!"
    print("   [PASS] Password recovery email delivered with link.")

print("\n=======================================================")
print(">>> ALL AUTHENTICATION LIFECYCLE TESTS PASSED 100% <<<")
print("=======================================================")
