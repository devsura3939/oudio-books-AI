import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { db } from "@/integrations/external-supabase/client";
import type { Book, Chapter } from "@/integrations/external-supabase/types";
import { summarizeChapter } from "@/lib/summarize.functions";

export const Route = createFileRoute("/_authenticated/books/$bookId/summary")({
  head: () => ({
    meta: [
      { title: "AI summarization — EngBot" },
      {
        name: "description",
        content: "Generate chapter summaries, bullet points and key takeaways with AI.",
      },
      { property: "og:title", content: "AI summarization — EngBot" },
      {
        property: "og:description",
        content: "Generate chapter summaries, bullet points and key takeaways with AI.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SummaryScreen,
});

const MODES = [
  { id: "brief", label: "Brief", icon: "short_text" },
  { id: "detailed", label: "Detailed", icon: "subject" },
  { id: "bullets", label: "Bullets", icon: "format_list_bulleted" },
  { id: "takeaways", label: "Takeaways", icon: "lightbulb" },
] as const;

type Mode = (typeof MODES)[number]["id"];

function SummaryScreen() {
  const { bookId } = Route.useParams();
  const summarize = useServerFn(summarizeChapter);
  const [chapterId, setChapterId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("brief");
  const [language, setLanguage] = useState<"en" | "ka">("en");
  const [summary, setSummary] = useState<string>("");
  const [busy, setBusy] = useState(false);

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
  const chapter = chapters.find((item) => item.id === chapterId) ?? chapters[0] ?? null;

  async function run() {
    if (!chapter) return;
    setBusy(true);
    setSummary("");
    try {
      const result = await summarize({
        data: {
          title: chapter.title,
          text: chapter.text_content.slice(0, 24000),
          mode,
          language,
        },
      });
      setSummary(result.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Summarization failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 md:px-10">
      <Link
        to="/books/$bookId"
        params={{ bookId }}
        className="inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary-fixed-dim"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span> Chapters
      </Link>

      <p className="label-caps mt-5 text-primary-fixed-dim">AI summarization</p>
      <h1 className="mt-2 text-[32px] leading-10 font-bold tracking-[-0.02em]">
        {bookQuery.data?.title ?? "Loading…"}
      </h1>

      <section className="glass-panel mt-8 rounded-2xl p-6 md:p-8">
        <label htmlFor="chapter" className="label-caps text-on-surface-variant">
          Chapter
        </label>
        <select
          id="chapter"
          value={chapter?.id ?? ""}
          onChange={(event) => {
            setChapterId(event.target.value);
            setSummary("");
          }}
          className="input-glass mt-2 w-full rounded-lg px-4 py-3 text-on-surface"
        >
          {chapters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.chapter_index + 1}. {item.title}
            </option>
          ))}
        </select>

        <p className="label-caps mt-6 text-on-surface-variant">Style</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                mode === option.id
                  ? "border-primary-container bg-primary-container/10 text-primary-fixed-dim"
                  : "border-white/15 text-on-surface-variant hover:border-primary-container/50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        <p className="label-caps mt-6 text-on-surface-variant">Language</p>
        <div className="mt-2 flex gap-2">
          {(
            [
              { id: "en", label: "English" },
              { id: "ka", label: "ქართული" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setLanguage(option.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-all ${
                language === option.id
                  ? "border-primary-container bg-primary-container/10 text-primary-fixed-dim"
                  : "border-white/15 text-on-surface-variant hover:border-primary-container/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={run}
          disabled={busy || !chapter}
          className="btn-glow mt-8 flex items-center gap-2 rounded-full bg-primary-container px-6 py-3 font-bold text-on-primary-container disabled:opacity-60"
        >
          <span className={`material-symbols-outlined ${busy ? "animate-spin" : ""}`}>
            {busy ? "progress_activity" : "auto_awesome"}
          </span>
          {busy ? "Summarizing…" : "Generate summary"}
        </button>
      </section>

      {busy ? (
        <section className="glass-panel mt-6 space-y-3 rounded-2xl p-6 md:p-8">
          {[100, 92, 96, 70].map((width, index) => (
            <div
              key={index}
              className="h-4 animate-pulse rounded bg-white/10"
              style={{ width: `${width}%`, animationDelay: `${index * 120}ms` }}
            />
          ))}
        </section>
      ) : summary ? (
        <section className="glass-panel mt-6 rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <span className="material-symbols-outlined text-primary-container">summarize</span>
              Summary
            </h2>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(summary);
                toast.success("Copied");
              }}
              className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-on-surface-variant transition-all hover:border-primary-container/60 hover:text-primary-fixed-dim"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span> Copy
            </button>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-[17px] leading-8 text-on-surface-variant">
            {summary}
          </p>
        </section>
      ) : null}
    </main>
  );
}
