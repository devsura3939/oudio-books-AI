import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  title: z.string().max(300),
  text: z.string().min(40).max(24000),
  mode: z.enum(["brief", "detailed", "bullets", "takeaways"]).default("brief"),
  language: z.enum(["en", "ka"]).default("en"),
});

const PROMPTS: Record<string, string> = {
  brief: "Write a tight 2-paragraph summary that captures the narrative or argument.",
  detailed:
    "Write a detailed summary of roughly 400 words covering structure, key events or arguments, and tone.",
  bullets: "Write 6-10 concise bullet points covering the most important content.",
  takeaways: "Write the 5 most important takeaways, each one sentence, numbered.",
};

/**
 * Chapter summarisation via the Lovable AI Gateway (no user API key needed).
 * The vendored studio keeps its own bring-your-own-key providers untouched.
 */
export const summarizeChapter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI gateway is not configured");

    const languageRule =
      data.language === "ka"
        ? "Respond entirely in Georgian (ქართული), using natural literary Georgian."
        : "Respond in English.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You summarise book chapters for an audiobook studio. ${PROMPTS[data.mode]} ${languageRule} Never invent content that is not in the source text.`,
          },
          {
            role: "user",
            content: `Chapter: ${data.title}\n\n${data.text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Rate limit reached — try again shortly.");
      if (response.status === 402) throw new Error("AI credits exhausted for this workspace.");
      throw new Error(`AI gateway error (${response.status})`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = payload.choices?.[0]?.message?.content?.trim();
    if (!summary) throw new Error("The model returned an empty summary");
    return { summary };
  });
