import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Tier 0 OCR for the studio book scanner.
 *
 * Takes ONE preprocessed page image (base64 data URL) and returns a faithful
 * plain-text transcription through the Lovable AI Gateway vision model. It is
 * deliberately transcription-only: never translate, never summarise, never
 * "improve" the text — the studio's Georgian translation engine owns that.
 *
 * When this endpoint is unavailable (static hosting, missing key, blocked
 * workspace) the client falls back to tesseract.js in the browser.
 */
const schema = z.object({
  // ~2000px JPEG at q0.82 lands well under this; the cap only stops abuse.
  image: z.string().min(64).max(12_000_000),
  lang: z.enum(["eng", "kat", "auto"]).default("auto"),
  hint: z.string().max(2_000).optional(),
});

const BASE_RULES = `Transcribe the visible page verbatim in its printed language. Do not assume the language when automatic detection is selected.
Preserve exact wording, numbers, punctuation, mathematical operators and paragraph order.
Do not translate, modernize, summarize, paraphrase or reconstruct missing words from context.
Mark unreadable spans [[UNCLEAR]] for review. Return plain text only, or [[NO_TEXT]] if the page is empty.`;
const KA_RULES = `Language: Georgian. Preserve Mkhedruli, Mtavruli capitals and historical letters as printed. Do not rewrite grammar or remove meaningful symbols.`;
const EN_RULES = `Language: English. Preserve original spelling, punctuation, names and compound words.`;

export const Route = createFileRoute("/api/ocr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof schema>;
        try {
          input = schema.parse(await request.json());
        } catch {
          return json({ error: "Invalid request" }, 400);
        }

        if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(input.image)) {
          return json({ error: "image must be a base64 image data URL" }, 400);
        }

        const customGeminiKey = request.headers.get("x-gemini-key")?.trim() || "";
        const customOpenRouterKey = request.headers.get("x-openrouter-key")?.trim() || "";

        const rules = [
          BASE_RULES,
          input.lang === "kat" ? KA_RULES : input.lang === "eng" ? EN_RULES : "",
          input.hint ? `Context from the previous page (do not repeat it): ${input.hint}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const env = (request as unknown as { env?: Record<string, string> }).env || {};
        const lovableKey = env["LOVABLE_API_KEY"] || process.env["LOVABLE_API_KEY"] || "";
        const geminiKey = customGeminiKey || env["GEMINI_API_KEY"] || process.env["GEMINI_API_KEY"] || "";
        const openRouterKey = customOpenRouterKey || env["OPENROUTER_API_KEY"] || process.env["OPENROUTER_API_KEY"] || "";

        // Tier 0A: Try Lovable AI Gateway if key exists
        if (lovableKey) {
          try {
            const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                temperature: 0,
                max_tokens: 8192,
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: rules },
                      { type: "image_url", image_url: { url: input.image } },
                    ],
                  },
                ],
              }),
            });

            if (upstream.ok) {
              const data = (await upstream.json()) as {
                choices?: { message?: { content?: string }; finish_reason?: string }[];
              };
              if (data.choices?.[0]?.finish_reason !== "stop") throw new Error("Incomplete OCR output");
              let text = (data.choices?.[0]?.message?.content ?? "").trim();
              if (text === "[[NO_TEXT]]") text = "";
              text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
              return json({ text, engine: "gateway-vision" }, 200);
            } else {
              console.warn(`[ocr] gateway returned ${upstream.status}, attempting fallback`);
            }
          } catch (err) {
            console.warn("[ocr] gateway error, attempting fallback", err);
          }
        }

        // Tier 0B: Direct Google Gemini 2.5 Frontier Vision (Gemini 2.5 Flash / Pro)
        if (geminiKey) {
          try {
            const match = input.image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
            const mimeType = match ? match[1] : "image/jpeg";
            const base64Data = match ? match[2] : input.image;
            let geminiModel = request.headers.get("x-gemini-model")?.trim() || "gemini-2.5-flash";
            if (geminiModel.includes("2.0")) geminiModel = "gemini-2.5-flash";

            const gRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
              signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: rules },
                        { inlineData: { mimeType, data: base64Data } },
                      ],
                    },
                  ],
                  generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 8192,
                  },
                }),
              },
            );

            if (gRes.ok) {
              const gData = (await gRes.json()) as {
                candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
              };
              if (gData.candidates?.[0]?.finishReason !== "STOP") throw new Error("Incomplete OCR output");
              let text = (gData.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
              if (text === "[[NO_TEXT]]") text = "";
              text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
              return json({ text, engine: geminiModel }, 200);
            } else {
              const gErr = await gRes.text().catch(() => "");
              console.warn(`[ocr] direct gemini error ${gRes.status}: ${gErr.slice(0, 200)}`);
            }
          } catch (err) {
            console.warn("[ocr] direct gemini call failed", err);
          }
        }

        // Tier 0C: OpenRouter Vision
        if (openRouterKey) {
          try {
            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
              headers: {
                Authorization: `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: rules },
                      { type: "image_url", image_url: { url: input.image } },
                    ],
                  },
                ],
              }),
            });

            if (orRes.ok) {
              const orData = (await orRes.json()) as {
                choices?: { message?: { content?: string }; finish_reason?: string }[];
              };
              if (orData.choices?.[0]?.finish_reason !== "stop") throw new Error("Incomplete OCR output");
              let text = (orData.choices?.[0]?.message?.content ?? "").trim();
              if (text === "[[NO_TEXT]]") text = "";
              text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
              return json({ text, engine: "openrouter-vision" }, 200);
            }
          } catch (err) {
            console.warn("[ocr] openrouter vision failed", err);
          }
        }

        return json(
          {
            error: "Neural OCR is unavailable. Please configure a free Gemini API key in settings.",
            code: "NO_VISION_KEY",
          },
          503,
        );
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
