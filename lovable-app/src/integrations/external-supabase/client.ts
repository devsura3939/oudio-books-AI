// Browser client for the EXTERNAL (self-owned) Supabase project.
// The publishable key is safe to ship to the browser; the secret key lives only
// in server secrets (EXTERNAL_SUPABASE_SECRET_KEY) and is never imported here.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const EXTERNAL_SUPABASE_URL =
  (typeof window !== "undefined" && ((window as any).LUMINA_RUNTIME_CONFIG?.SUPABASE_URL || localStorage.getItem("lumina_supabase_url"))) ||
  (typeof process !== "undefined" && process.env?.EXTERNAL_SUPABASE_URL) ||
  "https://92.5.71.162.sslip.io";

export const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  (typeof window !== "undefined" && ((window as any).LUMINA_RUNTIME_CONFIG?.SUPABASE_ANON_KEY || localStorage.getItem("lumina_supabase_anon_key"))) ||
  (typeof process !== "undefined" && process.env?.EXTERNAL_SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_qYeXVnqCOngD3NkLzWChmk_wCsIHevt";

function isNewApiKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// New-format sb_* keys are opaque strings, not JWTs: send them as `apikey` only.
function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    if (isNewApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function create(): SupabaseClient {
  const browser = typeof window !== "undefined";
  return createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: supabaseFetch(EXTERNAL_SUPABASE_PUBLISHABLE_KEY) },
    auth: {
      storage: browser ? window.localStorage : undefined,
      persistSession: browser,
      autoRefreshToken: browser,
      // The callback route owns its code/token exchange; avoid competing SDK exchanges.
      detectSessionInUrl: browser && window.location.pathname !== "/auth/callback",
    },
  });
}

let _client: SupabaseClient | undefined;

/** Supabase client for the project's own database/auth/storage. */
export const db = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) {
    if (!_client) _client = create();
    return Reflect.get(_client, prop, receiver);
  },
});

export const BUCKET_PDF = "book-pdfs";
export const BUCKET_AUDIO = "book-audio";
