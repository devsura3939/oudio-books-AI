import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PACK_LIMITS, evaluatePack } from "@/lib/engine-pack";
import {
  admin,
  applyProposal,
  jsonResponse,
  loadActivePack,
  loadBenchmark,
  verifyTrainingKey,
} from "@/lib/training.server";

/**
 * External training API. An LLM (driven by any harness holding a training key) can:
 *   POST /api/public/train/session   → open a scoped training session
 *   POST /api/public/train/context   → read the active pack + failing benchmark cases
 *   POST /api/public/train/propose   → propose data-only rules (server validates + benchmarks)
 *   POST /api/public/train/finish    → close the session
 *
 * Keys are hashed, scoped to a language and task, and revocable. Proposals can only
 * contain glossary / autofix / qa_rule / prompt_block / ocr_fix items: no code, no
 * schema, no infrastructure. A proposal is published only when the benchmark score
 * improves and no passing case regresses.
 */

const base = z.object({ key: z.string().min(20).optional(), session_id: z.string().uuid().optional() });

const proposeSchema = base.extend({
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(PACK_LIMITS.maxItemsPerProposal),
  model: z.string().max(120).optional(),
  note: z.string().max(600).optional(),
});

export const Route = createFileRoute("/api/public/train/$")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const step = String((params as { _splat?: string })._splat ?? "").replace(/^\/+|\/+$/g, "");
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return jsonResponse({ error: "invalid JSON body" }, 400);
        }

        const rawKey =
          request.headers.get("X-Training-Key") ??
          (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "") ??
          String(body["key"] ?? "");
        const key = await verifyTrainingKey(String(rawKey || body["key"] || ""));
        if (!key) return jsonResponse({ error: "invalid or revoked training key" }, 401);

        const sb = admin();
        const language = key.language;

        if (step === "session") {
          const pack = await loadActivePack(language);
          const cases = await loadBenchmark(language);
          const evaluated = evaluatePack(pack.items, cases);
          const { data, error } = await sb
            .from("training_sessions")
            .insert({
              key_id: key.id,
              language,
              scope: key.scope,
              driver: "external",
              model: typeof body["model"] === "string" ? body["model"] : null,
              start_score: evaluated.score,
              current_score: evaluated.score,
            })
            .select("id")
            .single();
          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({
            session_id: data.id,
            language,
            scope: key.scope,
            pack_version: pack.version,
            pack_items: pack.items.length,
            benchmark: { cases: cases.length, score: evaluated.score, exact: evaluated.passed },
            allowed_item_types: ["glossary", "autofix", "qa_rule", "prompt_block", "ocr_fix"],
            limits: PACK_LIMITS,
            instructions:
              "Read /context, then POST /propose with up to 40 data-only rule items. Rules are post-editing " +
              "layers on top of the built-in engine (never replacements for it). Proposals are auto-benchmarked: " +
              "only strict improvements with zero regressions are published. Close with /finish.",
          });
        }

        const parsedSession = z.string().uuid().safeParse(body["session_id"]);
        if (!parsedSession.success) return jsonResponse({ error: "session_id is required" }, 400);
        const sessionId = parsedSession.data;
        const { data: session } = await sb
          .from("training_sessions")
          .select("id, key_id, language, status, iterations, accepted, start_score")
          .eq("id", sessionId)
          .maybeSingle();
        if (!session || session.key_id !== key.id) return jsonResponse({ error: "unknown session" }, 404);
        if (session.status !== "running") return jsonResponse({ error: `session is ${session.status}` }, 409);
        await sb.from("training_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", sessionId);

        if (step === "context") {
          const pack = await loadActivePack(language);
          const cases = await loadBenchmark(language);
          const evaluated = evaluatePack(pack.items, cases);
          return jsonResponse({
            language,
            scope: key.scope,
            pack_version: pack.version,
            pack: pack.items.slice(-400),
            benchmark: {
              cases: cases.length,
              score: evaluated.score,
              exact: evaluated.passed,
              failing: evaluated.failures,
            },
            samples: cases.slice(0, 40).map((c) => ({ id: c.id, kind: c.kind, source: c.source, expected: c.expected })),
          });
        }

        if (step === "propose") {
          const parsed = proposeSchema.safeParse(body);
          if (!parsed.success) return jsonResponse({ error: "invalid proposal", detail: parsed.error.message }, 400);
          let outcome;
          try {
            outcome = await applyProposal({
              language,
              items: parsed.data.items,
              sessionId,
              model: parsed.data.model ?? null,
              note: parsed.data.note ?? null,
              source: "training",
            });
          } catch (error) {
            return jsonResponse({ error: (error as Error).message }, 500);
          }
          const idx = (session.iterations ?? 0) + 1;
          await sb.from("training_iterations").insert({
            session_id: sessionId,
            language,
            idx,
            model: parsed.data.model ?? null,
            proposal: { items: parsed.data.items, note: parsed.data.note ?? null },
            accepted: outcome.accepted,
            reason: outcome.reason,
            score_before: outcome.before.score,
            score_after: outcome.after.score,
            version_id: outcome.accepted ? outcome.versionId : null,
          });
          await sb
            .from("training_sessions")
            .update({
              iterations: idx,
              accepted: (session.accepted ?? 0) + (outcome.accepted ? 1 : 0),
              current_score: outcome.accepted ? outcome.after.score : outcome.before.score,
            })
            .eq("id", sessionId);
          return jsonResponse({
            iteration: idx,
            accepted: outcome.accepted,
            reason: outcome.reason,
            rejected_items: outcome.rejectedItems,
            score_before: outcome.before.score,
            score_after: outcome.after.score,
            exact_before: outcome.before.passed,
            exact_after: outcome.after.passed,
            failing: outcome.after.failures,
            pack_version: outcome.version,
            pack_items: outcome.itemCount,
          });
        }

        if (step === "finish") {
          const summary = typeof body["summary"] === "string" ? body["summary"].slice(0, 2000) : null;
          await sb
            .from("training_sessions")
            .update({ status: "finished", finished_at: new Date().toISOString(), summary })
            .eq("id", sessionId);
          const pack = await loadActivePack(language);
          return jsonResponse({ ok: true, pack_version: pack.version, pack_items: pack.items.length });
        }

        return jsonResponse({ error: `unknown training step "${step}"` }, 404);
      },
    },
  },
});
