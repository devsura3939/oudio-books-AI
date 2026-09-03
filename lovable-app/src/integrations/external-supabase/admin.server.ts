// Server-only client for the external Supabase project (secret key, bypasses RLS).
// Never import this from a component or from module scope of a client-reachable file.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createExternalAdminClient(): SupabaseClient {
  const url = process.env["EXTERNAL_SUPABASE_URL"] ?? "https://oakikavdnnvxzlcvsovq.supabase.co";
  const key = process.env["EXTERNAL_SUPABASE_SECRET_KEY"];
  if (!key) throw new Error("EXTERNAL_SUPABASE_SECRET_KEY is not configured");

  // Opaque sb_secret_* keys are not JWTs: send them as `apikey` only.
  const fetchShim: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, n) => headers.set(n, v));
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchShim },
  });
}
