import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { evaluatePack } from "@/lib/engine-pack";
import {
  admin,
  applyProposal,
  jsonResponse,
  loadActivePack,
  loadBenchmark,
  requireAdmin,
  sha256Hex,
  TRAINABLE_LANGUAGES,
} from "@/lib/training.server";

/**
 * Admin-only Training Lab API. Every action requires the caller to be signed in
 * AND to hold the `admin` role in `user_roles` (the hardcoded owner account gets
 * it automatically on sign-up).
 */
const language = z.enum(TRAINABLE_LANGUAGES);

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("overview"), language }),
  z.object({ action: z.literal("create_key"), language, scope: z.enum(["translate", "transcribe", "both"]), label: z.string().max(120).optional() }),
  z.object({ action: z.literal("revoke_key"), id: z.string().uuid() }),
  z.object({ action: z.literal("set_enabled"), language, enabled: z.boolean() }),
  z.object({ action: z.literal("rewind"), language, version_id: z.string().uuid() }),
  z.object({
    action: z.literal("add_cases"),
    language,
    cases: z
      .array(
        z.object({
          kind: z.enum(["translate", "transcribe"]).default("translate"),
          source: z.string().min(1).max(4000),
          expected: z.string().min(1).max(4000),
          note: z.string().max(300).optional(),
        }),
      )
      .min(1)
      .max(200),
  }),
  z.object({ action: z.literal("delete_case"), id: z.string().uuid() }),
  z.object({ action: z.literal("session"), id: z.string().uuid() }),
  z.object({ action: z.literal("run"), language, iterations: z.number().int().min(1).max(10).default(3) }),
]);

const MODEL = "openai/gpt-5.6-sol";

export const Route = createFileRoute("/api/admin/training")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const caller = await requireAdmin(request);
        if (!caller) return jsonResponse({ error: "Admin access required" }, 403);

        let input: z.infer<typeof schema>;
        try {
          input = schema.parse(await request.json());
        } catch (error) {
          return jsonResponse({ error: "Invalid request", detail: (error as Error).message }, 400);
        }
        const sb = admin();

        if (input.action === "overview") {
          const [pack, cases] = await Promise.all([loadActivePack(input.language), loadBenchmark(input.language)]);
          const evaluated = evaluatePack(pack.items, cases);
          const [{ data: versions }, { data: keys }, { data: sessions }, { data: caseRows }] = await Promise.all([
            sb.from("engine_versions").select("id, version, score, note, source, model, created_at").eq("language", input.language).order("version", { ascending: false }).limit(40),
            sb.from("training_keys").select("id, key_prefix, label, language, scope, uses, last_used_at, revoked_at, created_at").order("created_at", { ascending: false }).limit(50),
            sb.from("training_sessions").select("id, language, driver, model, status, iterations, accepted, start_score, current_score, started_at, finished_at, summary").eq("language", input.language).order("started_at", { ascending: false }).limit(25),
            sb.from("engine_benchmark_cases").select("id, kind, source, expected, origin, note, created_at").eq("language", input.language).order("created_at", { ascending: false }).limit(200),
          ]);
          const counts: Record<string, number> = {};
          for (const item of pack.items) counts[item.type] = (counts[item.type] ?? 0) + 1;
          return jsonResponse({
            language: input.language,
            pack: { version: pack.version, version_id: pack.versionId, items: pack.items.length, enabled: pack.enabled, counts },
            benchmark: { cases: cases.length, score: evaluated.score, exact: evaluated.passed, failures: evaluated.failures },
            versions: versions ?? [],
            keys: keys ?? [],
            sessions: sessions ?? [],
            cases: caseRows ?? [],
          });
        }

        if (input.action === "create_key") {
          const raw = `engbot_tk_${input.language}_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().slice(0, 8)}`;
          const { data, error } = await sb
            .from("training_keys")
            .insert({
              key_hash: await sha256Hex(raw),
              key_prefix: raw.slice(0, 22),
              label: input.label ?? null,
              language: input.language,
              scope: input.scope,
              created_by: caller.userId,
            })
            .select("id, key_prefix")
            .single();
          if (error) return jsonResponse({ error: error.message }, 500);
          // The raw key is shown exactly once; only its hash is stored.
          return jsonResponse({ id: data.id, key: raw, prefix: data.key_prefix });
        }

        if (input.action === "revoke_key") {
          const { error } = await sb.from("training_keys").update({ revoked_at: new Date().toISOString() }).eq("id", input.id);
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true });
        }

        if (input.action === "set_enabled") {
          const { error } = await sb.from("engine_active").update({ enabled: input.enabled }).eq("language", input.language);
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true });
        }

        if (input.action === "rewind") {
          const { data: target } = await sb
            .from("engine_versions")
            .select("id, version, items, score")
            .eq("id", input.version_id)
            .eq("language", input.language)
            .maybeSingle();
          if (!target) return jsonResponse({ error: "version not found" }, 404);
          const { error } = await sb
            .from("engine_active")
            .upsert({ language: input.language, version_id: target.id, enabled: true }, { onConflict: "language" });
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true, version: target.version });
        }

        if (input.action === "add_cases") {
          const rows = input.cases.map((c) => ({
            language: input.language,
            kind: c.kind,
            source: c.source,
            expected: c.expected,
            note: c.note ?? null,
            origin: "user",
          }));
          const { error } = await sb.from("engine_benchmark_cases").insert(rows);
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true, added: rows.length });
        }

        if (input.action === "delete_case") {
          const { error } = await sb.from("engine_benchmark_cases").delete().eq("id", input.id);
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true });
        }

        if (input.action === "session") {
          const { data: session } = await sb.from("training_sessions").select("*").eq("id", input.id).maybeSingle();
          const { data: iterations } = await sb
            .from("training_iterations")
            .select("id, idx, model, accepted, reason, score_before, score_after, proposal, created_at")
            .eq("session_id", input.id)
            .order("idx", { ascending: true });
          return jsonResponse({ session, iterations: iterations ?? [] });
        }

        // ── In-app training run: no external key needed, uses the platform gateway.
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonResponse({ error: "AI gateway is not configured" }, 500);
        const cases = await loadBenchmark(input.language);
        if (!cases.length) return jsonResponse({ error: "Add benchmark cases before training" }, 400);

        const { data: session, error: sessionError } = await sb
          .from("training_sessions")
          .insert({
            language: input.language,
            scope: "both",
            driver: "in-app",
            model: MODEL,
            start_score: evaluatePack((await loadActivePack(input.language)).items, cases).score,
          })
          .select("id, start_score")
          .single();
        if (sessionError) return jsonResponse({ error: sessionError.message }, 500);

        const log: unknown[] = [];
        for (let i = 1; i <= input.iterations; i += 1) {
          const pack = await loadActivePack(input.language);
          const evaluated = evaluatePack(pack.items, cases);
          const prompt = buildTrainerPrompt(input.language, pack.items.length, evaluated, cases);
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODEL,
              reasoning_effort: "none",
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
              max_completion_tokens: 8000,
            }),
          });
          if (!upstream.ok) {
            const detail = await upstream.text().catch(() => "");
            await sb.from("training_sessions").update({ status: "failed", finished_at: new Date().toISOString(), summary: detail.slice(0, 500) }).eq("id", session.id);
            return jsonResponse({ error: detail || `AI request failed (${upstream.status})`, session_id: session.id, log }, upstream.status);
          }
          const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
          let items: unknown[] = [];
          try {
            const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { items?: unknown[] };
            items = Array.isArray(parsed.items) ? parsed.items : [];
          } catch {
            items = [];
          }
          const outcome = await applyProposal({
            language: input.language,
            items,
            sessionId: session.id,
            model: MODEL,
            createdBy: caller.userId,
            source: "training",
          });
          await sb.from("training_iterations").insert({
            session_id: session.id,
            language: input.language,
            idx: i,
            model: MODEL,
            proposal: { items },
            accepted: outcome.accepted,
            reason: outcome.reason,
            score_before: outcome.before.score,
            score_after: outcome.after.score,
            version_id: outcome.accepted ? outcome.versionId : null,
          });
          log.push({
            iteration: i,
            accepted: outcome.accepted,
            reason: outcome.reason,
            score_before: outcome.before.score,
            score_after: outcome.after.score,
            proposed: items.length,
            rejected_items: outcome.rejectedItems,
          });
          await sb
            .from("training_sessions")
            .update({ iterations: i, current_score: outcome.accepted ? outcome.after.score : outcome.before.score })
            .eq("id", session.id);
        }

        const finalPack = await loadActivePack(input.language);
        const finalScore = evaluatePack(finalPack.items, cases);
        await sb
          .from("training_sessions")
          .update({ status: "finished", finished_at: new Date().toISOString(), current_score: finalScore.score })
          .eq("id", session.id);
        return jsonResponse({ session_id: session.id, log, score: finalScore.score, pack_version: finalPack.version });
      },
    },
  },
});

function buildTrainerPrompt(
  lang: string,
  packSize: number,
  evaluated: ReturnType<typeof evaluatePack>,
  cases: Awaited<ReturnType<typeof loadBenchmark>>,
) {
  const langName = lang === "ka" ? "Georgian" : "English";
  return `You are improving the EngBot ${langName} translation & transcription engine.

The engine itself (a large hand-built rule base) must NOT be changed. You may only propose
DATA-ONLY rules that are layered on top of it as post-editing:
  - "glossary"    : { type, pattern (literal phrase), replacement, note? }
  - "autofix"     : { type, pattern (JS regex source, no lookbehind/backrefs), replacement }
  - "qa_rule"     : { type, pattern (regex that matches BAD text), replacement (warning message) }
  - "prompt_block": { type, text (extra guidance for the LLM prompt) }
  - "ocr_fix"     : { type, pattern (literal mis-scan), replacement }

You must never propose code, file paths, SQL, schemas, infrastructure or engine replacement.

Current pack: ${packSize} items. Benchmark: ${evaluated.passed}/${evaluated.total} exact, score ${evaluated.score}.

Failing benchmark cases (fix these; a rule must not break passing cases):
${JSON.stringify(evaluated.failures.slice(0, 12), null, 1)}

Reference cases (input → expected corrected output):
${JSON.stringify(cases.slice(0, 12).map((c) => ({ kind: c.kind, source: c.source, expected: c.expected })), null, 1)}

Return JSON exactly as: { "items": [ ...at most 12 rules... ], "note": "one sentence" }
Rules must be general (not case-id specific hacks) and safe for arbitrary ${langName} text.`;
}
