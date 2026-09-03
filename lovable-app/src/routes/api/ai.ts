import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * JSON-mode LLM endpoint used by the vendored studio's translation engine.
 * It lets the Georgian translation pipeline run at full AI quality with no
 * user-supplied provider key (previously the engine silently degraded to
 * machine translation whenever no OpenRouter/Groq/Gemini key was entered).
 */
const schema = z.object({
  prompt: z.string().min(1).max(120_000),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().min(256).max(32_000).default(8192),
});

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
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

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.7-flash",
            messages: [{ role: "user", content: input.prompt }],
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
          choices?: { message?: { content?: string } }[];
        };
        const text = data.choices?.[0]?.message?.content ?? "";
        if (!text) return json({ error: "Empty AI response" }, 502);
        return json({ text }, 200);
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
