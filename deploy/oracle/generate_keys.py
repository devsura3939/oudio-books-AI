import hmac, hashlib, base64, json, secrets, time, sys, os

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def make_jwt(payload: dict, secret: str) -> str:
    header = {'typ': 'JWT', 'alg': 'HS256'}
    h_b64 = b64url(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    p_b64 = b64url(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    message = f'{h_b64}.{p_b64}'.encode('utf-8')
    sig = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).digest()
    s_b64 = b64url(sig)
    return f'{h_b64}.{p_b64}.{s_b64}'

def main():
    external_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost'
    
    postgres_password = secrets.token_hex(24)
    jwt_secret = secrets.token_hex(32)
    
    iat = int(time.time())
    exp = iat + 10 * 365 * 24 * 3600  # 10 years
    
    anon_token = make_jwt({'role': 'anon', 'iss': 'supabase', 'iat': iat, 'exp': exp}, jwt_secret)
    service_role_token = make_jwt({'role': 'service_role', 'iss': 'supabase', 'iat': iat, 'exp': exp}, jwt_secret)
    
    env_content = f"""# Auto-generated Supabase & Backend Environment
POSTGRES_PASSWORD={postgres_password}
JWT_SECRET={jwt_secret}
ANON_KEY={anon_token}
SERVICE_ROLE_KEY={service_role_token}
API_EXTERNAL_URL={external_url}
SITE_URL={external_url}

# Supabase Client connection for FastAPI and Frontend
SUPABASE_URL={external_url}
SUPABASE_PUBLISHABLE_KEY={anon_token}
SUPABASE_SECRET_KEY={service_role_token}
DATABASE_URL=postgresql://postgres:{postgres_password}@127.0.0.1:5432/postgres
"""
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("Generated credentials successfully!")
    print(f"Supabase URL: {external_url}")
    print(f"Anon Key: {anon_token}")
    print(f"Service Role Key: {service_role_token}")

if __name__ == '__main__':
    main()
