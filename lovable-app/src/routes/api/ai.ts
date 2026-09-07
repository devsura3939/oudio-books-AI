import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * JSON-mode LLM endpoint used by the vendored studio's translation engine.
 * It lets the Georgian translation pipeline run at full AI quality with no
 * user-supplied provider key (previously the engine silently degraded to
 * machine translation whenever no OpenRouter/Groq/Gemini key was entered).
 */
const schema = z.object({
  // The Georgian mastery prompt ships linguistic knowledge base and instructions,
  // so the limit must accommodate prompt caching and context.
  prompt: z.string().min(1).max(600_000),
  systemPrompt: z.string().max(200_000).optional(),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().min(256).max(32_000).default(8192),
});

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return json({ status: "unconfigured", error: "LOVABLE_API_KEY not set" }, 200);
        }
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 6000);
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: ctrl.signal,
          });
          clearTimeout(tid);
          if (upstream.status === 402) {
            return json({ status: "depleted", code: 402, error: "AI gateway out of credits" }, 200);
          }
          if (upstream.ok) {
            return json({ status: "healthy", code: 200 }, 200);
          }
          return json({ status: "degraded", code: upstream.status }, 200);
        } catch (e: any) {
          return json({ status: "unreachable", error: e?.message || "timeout" }, 200);
        }
      },
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return json({ error: "AI gateway is not configured" }, 500);
        }

        let input: z.infer<typeof schema>;
        try {
          input = schema.parse(await request.json());
        } catch {
          return json({ error: "Invalid request" }, 400);
        }

        const messages = input.systemPrompt
          ? [
              { role: "system", content: input.systemPrompt },
              { role: "user", content: input.prompt },
            ]
          : [{ role: "user", content: input.prompt }];

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.7-flash",
            messages,
            temperature: input.temperature,
            max_tokens: input.maxTokens,
            response_format: { type: "json_object" },
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          console.error(`[ai] gateway ${upstream.status}: ${detail.slice(0, 400)}`);
          return json({ error: detail || `AI request failed (${upstream.status})` }, upstream.status);
        }

        const data = (await upstream.json()) as {
          choices?: { message?: { content?: string }; finish_reason?: string }[];
        };
        const choice = data.choices?.[0];
        const text = choice?.message?.content ?? "";
        const finishReason = choice?.finish_reason;
        if (!text) return json({ error: "Empty AI response" }, 502);
        if (finishReason === "length") {
          return json({ error: "Response truncated by token limit", text, finish_reason: finishReason, truncated: true }, 422);
        }
        return json({ text, finish_reason: finishReason }, 200);
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
