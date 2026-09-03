// Browser client for the EXTERNAL (self-owned) Supabase project.
// The publishable key is safe to ship to the browser; the secret key lives only
// in server secrets (EXTERNAL_SUPABASE_SECRET_KEY) and is never imported here.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const EXTERNAL_SUPABASE_URL = "https://oakikavdnnvxzlcvsovq.supabase.co";
export const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_oTAYwkdt1yebGkrlKOoijw_9fE4OUBd";

// New-format sb_publishable_* keys must be sent as `apikey`, NOT as Authorization Bearer.
// When the SDK auto-sets Authorization: Bearer <api_key> (not a user JWT), we replace it
// with apikey only. User JWTs (which start with "eyJ") are preserved untouched.
function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers as HeadersInit).forEach((value, name) => headers.set(name, value));
    }
    // Only strip Authorization when it equals the api key itself (not a user JWT).
    // Real user JWTs start with "eyJ" — always keep those for authenticated calls.
    const authHeader = headers.get("Authorization");
    if (authHeader === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    // Always set apikey for Supabase routing.
    headers.set("apikey", key);
    return fetch(input instanceof Request ? input.url : input, { ...init, headers });
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
      detectSessionInUrl: browser,
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
