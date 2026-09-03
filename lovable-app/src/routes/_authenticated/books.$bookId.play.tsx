import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { db } from "@/integrations/external-supabase/client";
import type { Book, Chapter } from "@/integrations/external-supabase/types";
import { VOICE_GROUPS, VOICE_PRESETS, findPreset } from "@/lib/tts-voices";

export const Route = createFileRoute("/_authenticated/books/$bookId/play")({
  head: () => ({
    meta: [
      { title: "Now playing — Lumina Audio" },
      {
        name: "description",
        content: "Listen to your book with a live, sentence-synced transcript.",
      },
      { property: "og:title", content: "Now playing — Lumina Audio" },
      {
        property: "og:description",
        content: "Listen to your book with a live, sentence-synced transcript.",
      },
      { property: "og:type", content: "music.song" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NowPlaying,
});

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…:;])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Group sentences into ~600 char utterances so requests stay few and playback is smooth. */
function groupSentences(sentences: string[], maxChars = 600): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const RATES = [0.75, 1, 1.2, 1.5, 1.75, 2];
const PRESET_STORAGE_KEY = "lumina_voice_preset";

function NowPlaying() {
  const { bookId } = Route.useParams();
  const [chapterIndex, setChapterIndex] = useState(0);
  const [blockIndex, setBlockIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [rate, setRate] = useState(1);
  const [presetId, setPresetId] = useState("en-us-female");
  const [customInstructions, setCustomInstructions] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);
  const cacheRef = useRef(new Map<string, string>());
  const tokenRef = useRef(0);

  const bookQuery = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data, error } = await db.from("books").select("*").eq("id", bookId).maybeSingle();
      if (error) throw error;
      return data as Book | null;
    },
  });

  const chaptersQuery = useQuery({
    queryKey: ["chapters", bookId],
    queryFn: async (): Promise<Chapter[]> => {
      const { data, error } = await db
        .from("chapters")
        .select("*")
        .eq("book_id", bookId)
        .order("chapter_index");
      if (error) throw error;
      return (data ?? []) as Chapter[];
    },
  });

  const chapters = chaptersQuery.data ?? [];
  const chapter = chapters[chapterIndex] ?? null;
  const blocks = useMemo(
    () => (chapter ? groupSentences(splitSentences(chapter.text_content)) : []),
    [chapter],
  );

  // Restore the saved voice, and default Georgian books to a Georgian voice.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(PRESET_STORAGE_KEY) : null;
    if (saved && VOICE_PRESETS.some((v) => v.id === saved)) {
      setPresetId(saved);
      return;
    }
    const lang = bookQuery.data?.language;
    if (lang && lang.toLowerCase().startsWith("ka")) setPresetId("ka-male");
  }, [bookQuery.data?.language]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [blockIndex]);

  // Speed is applied on the audio element (playbackRate) rather than baked
  // into the generated file, so changing it takes effect instantly and the
  // cached audio stays reusable across speeds.
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const fetchAudioUrl = useCallback(
    async (text: string) => {
      const key = `${presetId}|${customInstructions}|${text}`;
      const cached = cacheRef.current.get(key);
      if (cached) return cached;

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          preset: presetId,
          ...(presetId === "custom" && customInstructions
            ? { instructions: customInstructions }
            : {}),
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || `Speech failed (${response.status})`);
      }
      const url = URL.createObjectURL(await response.blob());
      cacheRef.current.set(key, url);
      return url;
    },
    [presetId, customInstructions],
  );

  const stopAudio = useCallback(() => {
    tokenRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    setPlaying(false);
    setPaused(false);
    setLoadingAudio(false);
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  /**
   * Plays a block. The <audio> element is created inside the first user gesture
   * and then reused, which is what keeps programmatic playback allowed on mobile.
   */
  const playBlock = useCallback(
    async (index: number) => {
      if (!blocks.length || index < 0 || index >= blocks.length) {
        setPlaying(false);
        return;
      }
      const token = ++tokenRef.current;

      if (!audioRef.current) {
        const audio = new Audio();
        audio.preload = "auto";
        audioRef.current = audio;
      }
      const audio = audioRef.current;

      setBlockIndex(index);
      setPlaying(true);
      setPaused(false);
      setLoadingAudio(true);

      try {
        const url = await fetchAudioUrl(blocks[index]!);
        if (tokenRef.current !== token) return;
        audio.src = url;
        audio.playbackRate = rateRef.current;
        audio.onended = () => {
          if (tokenRef.current !== token) return;
          if (index + 1 < blocks.length) void playBlock(index + 1);
          else setPlaying(false);
        };
        await audio.play();
        setLoadingAudio(false);
        // Warm the next block while this one plays.
        const next = blocks[index + 1];
        if (next) void fetchAudioUrl(next).catch(() => {});
      } catch (error) {
        if (tokenRef.current !== token) return;
        setLoadingAudio(false);
        setPlaying(false);
        toast.error(
          error instanceof Error && error.message ? error.message : "Could not generate audio",
        );
      }
    },
    [blocks, fetchAudioUrl],
  );

  function toggle() {
    const audio = audioRef.current;
    if (!playing) {
      void playBlock(blockIndex);
      return;
    }
    if (paused) {
      void audio?.play();
      setPaused(false);
    } else {
      audio?.pause();
      setPaused(true);
    }
  }

  function goToChapter(index: number) {
    if (index < 0 || index >= chapters.length) return;
    stopAudio();
    setChapterIndex(index);
    setBlockIndex(0);
  }

  function changePreset(id: string) {
    setPresetId(id);
    if (typeof window !== "undefined") localStorage.setItem(PRESET_STORAGE_KEY, id);
    cacheRef.current.clear();
    if (playing) {
      stopAudio();
      setTimeout(() => void playBlock(blockIndex), 0);
    }
  }

  const progress = blocks.length ? ((blockIndex + 1) / blocks.length) * 100 : 0;
  const estTotalSec = blocks.length * 26;
  const estDoneSec = (blockIndex + 1) * 26;
  const preset = findPreset(presetId);

  return (
    <main className="mx-auto max-w-7xl px-5 md:px-10">
      <Link
        to="/books/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary-fixed-dim"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span> Chapters
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: record + controls */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="glass-panel relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl p-8">
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center gap-1 px-12 pb-16 opacity-20">
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className={`w-1 rounded-full bg-primary-fixed-dim ${playing && !paused ? "animate-pulse" : ""}`}
                  style={{
                    height: `${20 + ((index * 29) % 70)}%`,
                    animationDelay: `${index * 110}ms`,
                  }}
                />
              ))}
            </div>

            <div
              className={`relative size-52 rounded-full shadow-[0_0_50px_rgba(0,240,255,0.2)] md:size-64 ${
                playing && !paused ? "animate-[spin_10s_linear_infinite]" : ""
              }`}
            >
              <div className="size-full rounded-full border-4 border-surface-container-high bg-[conic-gradient(from_0deg,#0b0e14,rgba(0,240,255,0.35),rgba(119,1,208,0.4),#0b0e14)]" />
              <div className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-outline-variant bg-surface" />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl leading-8 font-semibold text-primary-fixed-dim">
                {chapter?.title ?? (chaptersQuery.isLoading ? "Loading…" : "No chapters")}
              </h1>
              <p className="mt-1 text-on-surface-variant">
                {bookQuery.data?.title ?? ""}
                {bookQuery.data?.author ? ` · ${bookQuery.data.author}` : ""}
              </p>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(blocks.length - 1, 0)}
              value={blockIndex}
              aria-label="Playback position"
              onChange={(event) => {
                const next = Number(event.target.value);
                setBlockIndex(next);
                if (playing) void playBlock(next);
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary-container"
              style={{
                background: `linear-gradient(90deg, var(--primary-container) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
              }}
            />
            <div className="label-caps mt-2 flex justify-between text-on-surface-variant">
              <span>{formatTime(estDoneSec)}</span>
              <span>{formatTime(estTotalSec)}</span>
            </div>

            <div className="mt-6 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => void playBlock(Math.max(blockIndex - 1, 0))}
                aria-label="Rewind"
                className="text-on-surface-variant transition-colors hover:text-primary-container"
              >
                <span className="material-symbols-outlined text-2xl">replay_10</span>
              </button>
              <button
                type="button"
                onClick={() => goToChapter(chapterIndex - 1)}
                disabled={chapterIndex === 0}
                aria-label="Previous chapter"
                className="text-on-surface-variant transition-colors hover:text-primary-container disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-3xl">skip_previous</span>
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={playing && !paused ? "Pause" : "Play"}
                className="btn-glow flex size-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
              >
                <span className="material-symbols-outlined text-4xl">
                  {loadingAudio
                    ? "progress_activity"
                    : playing && !paused
                      ? "pause"
                      : "play_arrow"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => goToChapter(chapterIndex + 1)}
                disabled={chapterIndex >= chapters.length - 1}
                aria-label="Next chapter"
                className="text-on-surface-variant transition-colors hover:text-primary-container disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-3xl">skip_next</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1;
                  setRate(next);
                  // Applies immediately to the audio already playing.
                  if (audioRef.current) audioRef.current.playbackRate = next;
                }}
                className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary-container"
              >
                {rate}x
              </button>
            </div>

            <div className="mt-6">
              <label htmlFor="voice" className="label-caps text-on-surface-variant">
                Voice / TTS engine
              </label>
              <select
                id="voice"
                value={presetId}
                onChange={(event) => changePreset(event.target.value)}
                className="input-glass mt-2 w-full rounded-lg px-3 py-2.5 text-sm text-on-surface"
              >
                {VOICE_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {VOICE_PRESETS.filter((v) => v.group === group).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {presetId === "custom" ? (
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(event) => setCustomInstructions(event.target.value)}
                  onBlur={() => cacheRef.current.clear()}
                  placeholder="e.g. deep Irish male voice, slow and dramatic"
                  className="input-glass mt-2 w-full rounded-lg px-3 py-2.5 text-sm text-on-surface"
                />
              ) : (
                <p className="mt-2 text-xs text-on-surface-variant">
                  {preset.instructions ?? "Neural cloud voice — plays as real audio on mobile."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: live transcript */}
        <div className="lg:col-span-7">
          <div className="glass-panel flex h-full flex-col rounded-2xl p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-semibold">
                <span className="material-symbols-outlined text-primary-container">
                  closed_caption
                </span>
                Live transcript
              </h2>
              <Link
                to="/books/$bookId/summary"
                params={{ bookId }}
                className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-on-surface-variant transition-all hover:border-primary-container/60 hover:text-primary-fixed-dim"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Summarize
              </Link>
            </div>

            <div className="h-[420px] space-y-4 overflow-y-auto pr-3 text-lg leading-relaxed text-on-surface-variant lg:h-[560px]">
              {blocks.length ? (
                blocks.map((block, index) => (
                  <p
                    key={index}
                    ref={index === blockIndex ? activeRef : undefined}
                    onClick={() => void playBlock(index)}
                    className={`cursor-pointer transition-all duration-300 ${
                      index === blockIndex
                        ? "origin-left scale-[1.02] font-semibold text-primary-fixed [text-shadow:0_0_8px_rgba(0,240,255,0.4)]"
                        : "hover:text-on-surface"
                    }`}
                  >
                    {block}
                  </p>
                ))
              ) : (
                <p>{chaptersQuery.isLoading ? "Loading transcript…" : "No text in this chapter."}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
