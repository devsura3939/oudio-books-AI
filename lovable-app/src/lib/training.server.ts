// Server-only helpers for the Training Lab (admin-only trainable engine).
import type { SupabaseClient } from "@supabase/supabase-js";

import { createExternalAdminClient } from "@/integrations/external-supabase/admin.server";
import {
  PACK_LIMITS,
  evaluatePack,
  isImprovement,
  normaliseItem,
  validateItem,
  type BenchmarkCase,
  type EvalResult,
  type PackItem,
} from "@/lib/engine-pack";

export const ADMIN_EMAIL = "ananiadevsurashvili@gmail.com";
export const TRAINABLE_LANGUAGES = ["ka", "en"] as const;
export type TrainableLanguage = (typeof TRAINABLE_LANGUAGES)[number];

export function admin(): SupabaseClient {
  return createExternalAdminClient();
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function bearer(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/** Verify the caller is the signed-in admin. Returns the user id, or null. */
export async function requireAdmin(request: Request): Promise<{ userId: string; email: string } | null> {
  const token = bearer(request);
  if (!token) return null;
  const sb = admin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: role } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return null;
  return { userId: data.user.id, email: data.user.email ?? "" };
}

export interface TrainingKeyRow {
  id: string;
  language: string;
  scope: string;
  label: string | null;
  revoked_at: string | null;
}

/** Verify an `engbot_tk_*` training key. */
export async function verifyTrainingKey(rawKey: string): Promise<TrainingKeyRow | null> {
  if (!rawKey || rawKey.length < 20) return null;
  const sb = admin();
  const hash = await sha256Hex(rawKey);
  const { data } = await sb
    .from("training_keys")
    .select("id, language, scope, label, revoked_at, uses")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  await sb
    .from("training_keys")
    .update({ last_used_at: new Date().toISOString(), uses: Number(data.uses ?? 0) + 1 })
    .eq("id", data.id);
  return data as TrainingKeyRow;
}

export interface ActivePack {
  versionId: string | null;
  version: number;
  items: PackItem[];
  score: number | null;
  enabled: boolean;
}

export async function loadActivePack(language: string): Promise<ActivePack> {
  const sb = admin();
  const { data: active } = await sb
    .from("engine_active")
    .select("version_id, enabled")
    .eq("language", language)
    .maybeSingle();
  if (!active?.version_id) return { versionId: null, version: 0, items: [], score: null, enabled: true };
  const { data: version } = await sb
    .from("engine_versions")
    .select("id, version, items, score")
    .eq("id", active.version_id)
    .maybeSingle();
  return {
    versionId: version?.id ?? null,
    version: version?.version ?? 0,
    items: Array.isArray(version?.items) ? (version!.items as PackItem[]) : [],
    score: version?.score ?? null,
    enabled: active.enabled !== false,
  };
}

export async function loadBenchmark(language: string): Promise<BenchmarkCase[]> {
  const sb = admin();
  const { data } = await sb
    .from("engine_benchmark_cases")
    .select("id, language, kind, source, expected, weight")
    .eq("language", language)
    .limit(2000);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    language: row.language as string,
    kind: (row.kind === "transcribe" ? "transcribe" : "translate") as "translate" | "transcribe",
    source: row.source as string,
    expected: row.expected as string,
    weight: Number(row.weight ?? 1),
  }));
}

export interface ProposalOutcome {
  accepted: boolean;
  reason: string;
  before: EvalResult;
  after: EvalResult;
  rejectedItems: { index: number; reason: string }[];
  versionId: string | null;
  version: number;
  itemCount: number;
}

/**
 * Validate a proposal, replay the benchmark with and without it and, when it is a
 * strict improvement with no regression, publish it as a new engine version.
 */
export async function applyProposal(opts: {
  language: string;
  items: unknown[];
  sessionId?: string | null;
  model?: string | null;
  note?: string | null;
  createdBy?: string | null;
  source?: string;
}): Promise<ProposalOutcome> {
  const sb = admin();
  const language = opts.language;
  const pack = await loadActivePack(language);
  const cases = await loadBenchmark(language);

  const rejectedItems: { index: number; reason: string }[] = [];
  const accepted: PackItem[] = [];
  const raw = Array.isArray(opts.items) ? opts.items.slice(0, PACK_LIMITS.maxItemsPerProposal) : [];
  raw.forEach((item, index) => {
    const result = validateItem(item, language);
    if (!result.ok) {
      rejectedItems.push({ index, reason: result.reason ?? "invalid item" });
      return;
    }
    accepted.push(
      normaliseItem(item as Record<string, unknown>, language, {
        session_id: opts.sessionId ?? null,
        model: opts.model ?? null,
      }),
    );
  });

  const before = evaluatePack(pack.items, cases);
  if (!accepted.length) {
    return {
      accepted: false,
      reason: "rejected: no valid items in proposal",
      before,
      after: before,
      rejectedItems,
      versionId: pack.versionId,
      version: pack.version,
      itemCount: pack.items.length,
    };
  }

  // Dedupe against the live pack.
  const seen = new Set(pack.items.map((i) => `${i.type}::${i.pattern}::${i.text ?? ""}`));
  const fresh = accepted.filter((i) => !seen.has(`${i.type}::${i.pattern}::${i.text ?? ""}`));
  if (!fresh.length) {
    return {
      accepted: false,
      reason: "rejected: every item already exists in the active pack",
      before,
      after: before,
      rejectedItems,
      versionId: pack.versionId,
      version: pack.version,
      itemCount: pack.items.length,
    };
  }

  const candidate = [...pack.items, ...fresh].slice(-PACK_LIMITS.maxItems);
  const after = evaluatePack(candidate, cases);
  const verdict = cases.length
    ? isImprovement(before, after)
    : { ok: false, reason: "rejected: benchmark is empty — add benchmark cases before training" };

  if (!verdict.ok) {
    return {
      accepted: false,
      reason: verdict.reason,
      before,
      after,
      rejectedItems,
      versionId: pack.versionId,
      version: pack.version,
      itemCount: pack.items.length,
    };
  }

  const nextVersion = pack.version + 1;
  const { data: inserted, error } = await sb
    .from("engine_versions")
    .insert({
      language,
      version: nextVersion,
      items: candidate,
      score: after.score,
      note: opts.note ?? verdict.reason,
      source: opts.source ?? "training",
      model: opts.model ?? null,
      session_id: opts.sessionId ?? null,
      created_by: opts.createdBy ?? null,
    })
    .select("id, version")
    .single();
  if (error) throw new Error(error.message);

  await sb
    .from("engine_active")
    .upsert({ language, version_id: inserted.id, enabled: true }, { onConflict: "language" });

  return {
    accepted: true,
    reason: verdict.reason,
    before,
    after,
    rejectedItems,
    versionId: inserted.id as string,
    version: inserted.version as number,
    itemCount: candidate.length,
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
