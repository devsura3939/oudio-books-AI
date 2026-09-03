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

const BASE_RULES = `You are a high-accuracy OCR and document reconstruction engine for scanned and photographed book pages.
Return ONLY the text that is printed on the page, as plain text.
Rules:
- Transcribe verbatim and completely. Never translate, never paraphrase, never summarise, never add commentary.
- Blurry & Degraded Photo Recovery: When ink is faint, blurry, low-contrast, or partially obscured by shadows or spine curvature, use visual letter stems and linguistic context to deduce and reconstruct the full words faithfully. Never skip lines or drop words.
- Hyphenation & Compounds: Join words split across line breaks by a soft hyphen, but preserve legitimate hyphenated compound words (e.g., well-known, state-of-the-art, twenty-five).
- Preserve paragraph breaks with a blank line. Merge lines inside the same paragraph into flowing text (single spaces, no hard line breaks).
- Skip running headers, running footers, page numbers, and library stamps.
- Keep italic/bold text as plain text. Keep quotation marks and dashes as printed.
- Keep chapter/section headings on their own line.
- If the page has no readable body text, return exactly: [[NO_TEXT]]
Output: the transcription only. No markdown fences, no labels, no explanations.`;

const KA_RULES = `The page is in Georgian (ქართული).
- Use ONLY Georgian Mkhedruli letters (ა-ჰ). Never substitute Latin or Cyrillic look-alikes.
- Carefully distinguish visually similar Georgian characters even when slightly blurry:
  - ვ vs პ vs კ
  - შ vs წ vs ჭ
  - რ vs უ vs ყ
  - ქ vs ფ vs ქ
  - თ vs ძ vs ხ
- Georgian has no letter case: never capitalise.
- Punctuation must be standard Georgian/Latin punctuation: . , ? ! : ; « » " ' – — „ “
- NEVER output the Devanagari danda (।), the Armenian or Arabic full stops, or any other foreign sentence terminator. A sentence ends with a normal period (.).
- Preserve Georgian quotation marks („...“ or «...») and em dashes (—) as printed, and keep archaic letters (ჱ ჲ ჳ ჴ ჵ ჶ ჷ ჸ) if printed.
- Do not "modernise" spelling; transcribe what is printed.`;

const EN_RULES = `The page is in English. Preserve original spelling (including British/archaic forms) and punctuation exactly.`;

export const Route = createFileRoute("/api/ocr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "OCR gateway is not configured" }, 500);

        let input: z.infer<typeof schema>;
        try {
          input = schema.parse(await request.json());
        } catch {
          return json({ error: "Invalid request" }, 400);
        }

        if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(input.image)) {
          return json({ error: "image must be a base64 image data URL" }, 400);
        }

        const rules = [
          BASE_RULES,
          input.lang === "kat" ? KA_RULES : input.lang === "eng" ? EN_RULES : "",
          input.hint ? `Context from the previous page (do not repeat it): ${input.hint}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.7-flash",
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
        } catch (err) {
          console.error("[ocr] gateway unreachable", err);
          return json({ error: "OCR gateway unreachable" }, 502);
        }

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          console.error(`[ocr] gateway ${upstream.status}: ${detail.slice(0, 400)}`);
          return json(
            { error: detail || `OCR request failed (${upstream.status})` },
            upstream.status,
          );
        }

        const data = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        let text = (data.choices?.[0]?.message?.content ?? "").trim();
        if (text === "[[NO_TEXT]]") text = "";
        // Strip a stray markdown fence if the model wraps the page.
        text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();

        return json({ text, engine: "gateway-vision" }, 200);
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
