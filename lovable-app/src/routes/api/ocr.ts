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

const BASE_RULES = `You are a high-accuracy publication-grade OCR and neural document reconstruction engine.
Your mission is to produce a 100% faithful, verbatim plain-text transcription of the printed book page.

CRITICAL DIRECTIVES:
1. Verbatim Accuracy: Transcribe every word and sentence exactly as written. Never translate, never paraphrase, never summarize, never add commentary or notes.
2. Contextual Deduction ("Intelligent Guessing"):
   - Book pages frequently have spine curvature, perspective skew, faint ink, lens softness, or cast shadows.
   - When character glyphs are faint, partially obscured, curved towards the gutter, or degraded: NEVER drop words, NEVER leave blanks, and NEVER output fragmented single letters (such as "ა ა ა", "ს ს ს", "_ ბავ ს").
   - Instead, inspect the visible character stems and combine them with grammatical syntax, morphological case harmony, vocabulary, and literary sentence context to deduce with certainty the exact intended words.
   - The reconstructed text must form syntactically perfect, natural literary prose matching the printed book.
3. Hyphenation & Compounds:
   - Join words split across line breaks by a hyphen into a single word (e.g., "მო-ხერხებულ" -> "მოხერხებულ", "trans-cription" -> "transcription").
   - Preserve genuine hyphenated compound words (e.g., "სამხრეთ-აღმოსავლეთი", "well-known", "twenty-five").
4. Structure & Cleanliness:
   - Merge line wraps within the same paragraph into clean continuous prose.
   - Preserve real paragraph breaks with a single blank line.
   - Skip running page headers, running footers, page numbers, and library stamps.
   - Strip all non-book OCR noise, math symbols, stray dashes, and gibberish loops (=, +, _, |, #, IIII).
   - If the page contains no readable body text, return exactly: [[NO_TEXT]]
Output: Return ONLY the clean verbatim transcription text. No markdown fences, no labels.`;

const KA_RULES = `LANGUAGE: Georgian (ქართული, მხედრული).
- Use ONLY standard Georgian Mkhedruli alphabet letters (ა-ჰ). Never substitute Latin or Cyrillic characters.
- Georgian has NO capital letters.
- Strict Character Discrimination (differentiate visually similar characters using grammatical and root-word context):
  - ვ (v) vs პ (p) vs კ (k)
  - შ (sh) vs წ (ts) vs ჭ (ch')
  - რ (r) vs უ (u) vs ყ (q')
  - ქ (k') vs ფ (p')
  - თ (t) vs ძ (dz) vs ხ (kh)
  - ჩ (ch) vs ხ (kh)
  - ლ (l) vs დ (d) vs ო (o)
- Grammatical Harmony: Every Georgian word must obey standard Georgian nominal and verbal morphology (proper case markers: -მა, -ს, -ით, -ად; postpositions: -ში, -ზე, -თან, -დან, -კენ).
- Preserve authentic Georgian quotation marks („...“ or «...») and em dashes (—).
- Preserve historical/archaic letters (ჱ, ჲ, ჳ, ჴ, ჵ, ჶ, ჷ, ჸ) if present in classical texts.`;

const EN_RULES = `LANGUAGE: English.
- Transcribe verbatim preserving original spelling (including British or archaic forms) and punctuation exactly.
- Strict Character Discrimination:
  - Distinguish rn vs m, cl vs d, vv vs w, fi vs fl, 1 vs l vs I, 0 vs O.
  - Fix broken apostrophes and contractions (e.g. don't, it's, wouldn't).
- Hyphenation across line breaks must be cleanly joined into complete words.`;

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
                choices?: { message?: { content?: string } }[];
              };
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
                candidates?: { content?: { parts?: { text?: string }[] } }[];
              };
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
                choices?: { message?: { content?: string } }[];
              };
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
