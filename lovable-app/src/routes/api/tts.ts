import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { findPreset } from "@/lib/tts-voices";

const schema = z.object({
  text: z.string().min(1).max(4000),
  preset: z.string().default("en-us-female"),
  instructions: z.string().max(500).optional(),
  rate: z.number().min(0.5).max(2).default(1),
});

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI gateway is not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let input: z.infer<typeof schema>;
        try {
          input = schema.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Invalid request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const preset = findPreset(input.preset);
        const steer = input.instructions?.trim() || preset.instructions;

        const body =
          preset.provider === "gemini"
            ? {
                model: "google/gemini-2.5-flash-tts",
                ...(steer ? { systemInstruction: { parts: [{ text: steer }] } } : {}),
                contents: [
                  {
                    role: "user",
                    parts: [{ text: input.text }],
                  },
                ],
                generationConfig: {
                  responseModalities: ["AUDIO"],
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: preset.voice } },
                  },
                },
              }
            : {
                model: "openai/gpt-4o-mini-tts",
                input: input.text,
                voice: preset.voice,
                ...(steer ? { instructions: steer } : {}),
                speed: input.rate,
                response_format: "mp3",
              };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          console.error(`[tts] gateway ${upstream.status}: ${detail}`);
          return new Response(
            JSON.stringify({ error: detail || `Speech generation failed (${upstream.status})` }),
            { status: upstream.status, headers: { "Content-Type": "application/json" } },
          );
        }

        const bytes = await upstream.arrayBuffer();
        const contentType =
          preset.provider === "gemini"
            ? (upstream.headers.get("content-type") ?? "audio/wav")
            : "audio/mpeg";

        return new Response(bytes, {
          headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
