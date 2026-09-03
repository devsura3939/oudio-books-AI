/**
 * Neural TTS voice catalogue served through the Lovable AI Gateway.
 * These produce real audio files (mp3/wav) that play reliably on mobile,
 * unlike the browser's speechSynthesis engine.
 */
export type TtsProvider = "openai" | "gemini";

export interface VoicePreset {
  id: string;
  label: string;
  group: string;
  provider: TtsProvider;
  /** OpenAI voice name, or Gemini prebuilt voice name. */
  voice: string;
  /** Delivery steering (accent, tone, pacing). */
  instructions?: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  // English — British
  {
    id: "en-gb-male",
    label: "British · Male (Oliver)",
    group: "English — British",
    provider: "openai",
    voice: "onyx",
    instructions:
      "Speak with a refined British RP accent. Warm, measured audiobook narration.",
  },
  {
    id: "en-gb-female",
    label: "British · Female (Amelia)",
    group: "English — British",
    provider: "openai",
    voice: "shimmer",
    instructions:
      "Speak with a clear British RP accent. Elegant, calm audiobook narration.",
  },
  // English — American
  {
    id: "en-us-male",
    label: "American · Male (Ethan)",
    group: "English — American",
    provider: "openai",
    voice: "ash",
    instructions: "Speak with a neutral American accent, confident and engaging.",
  },
  {
    id: "en-us-female",
    label: "American · Female (Nova)",
    group: "English — American",
    provider: "openai",
    voice: "nova",
    instructions: "Speak with a neutral American accent, bright and friendly.",
  },
  {
    id: "en-us-storyteller",
    label: "American · Storyteller (Fable)",
    group: "English — American",
    provider: "openai",
    voice: "fable",
    instructions: "Expressive storyteller delivery with dramatic pacing.",
  },
  {
    id: "en-neutral",
    label: "Neutral · Alloy",
    group: "English — American",
    provider: "openai",
    voice: "alloy",
    instructions: "Neutral, even-toned narration.",
  },
  // Georgian
  {
    id: "ka-male",
    label: "ქართული · მამრობითი (Giorgi)",
    group: "Georgian — ქართული",
    provider: "gemini",
    voice: "Charon",
  },
  {
    id: "ka-female",
    label: "ქართული · მდედრობითი (Eka)",
    group: "Georgian — ქართული",
    provider: "gemini",
    voice: "Kore",
  },
  {
    id: "ka-soft",
    label: "ქართული · რბილი ტონი (Aoede)",
    group: "Georgian — ქართული",
    provider: "gemini",
    voice: "Aoede",
  },
  // Multilingual / other languages
  {
    id: "multi-puck",
    label: "Multilingual · Puck",
    group: "Other languages",
    provider: "gemini",
    voice: "Puck",
  },
  {
    id: "multi-fenrir",
    label: "Multilingual · Fenrir",
    group: "Other languages",
    provider: "gemini",
    voice: "Fenrir",
  },
  // Custom
  {
    id: "custom",
    label: "Custom — describe the voice yourself",
    group: "Custom",
    provider: "openai",
    voice: "sage",
  },
];

export const VOICE_GROUPS = Array.from(new Set(VOICE_PRESETS.map((v) => v.group)));

export function findPreset(id: string): VoicePreset {
  return VOICE_PRESETS.find((v) => v.id === id) ?? VOICE_PRESETS[0]!;
}
