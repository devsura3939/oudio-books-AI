import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { db } from "@/integrations/external-supabase/client";
import type { Book, Chapter } from "@/integrations/external-supabase/types";

export const Route = createFileRoute("/_authenticated/books/$bookId/")({
  head: () => ({
    meta: [
      { title: "Chapter selection — Lumina Audio" },
      {
        name: "description",
        content: "Pick a chapter to listen to, or summarize it with AI.",
      },
      { property: "og:title", content: "Chapter selection — Lumina Audio" },
      { property: "og:description", content: "Pick a chapter to listen to, or summarize it with AI." },
      { property: "og:type", content: "book" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChapterSelection,
});

function ChapterSelection() {
  const { bookId } = Route.useParams();

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
  const totalWords = chapters.reduce((sum, chapter) => sum + (chapter.word_count ?? 0), 0);
  const estMinutes = Math.round(totalWords / 150);

  return (
    <main className="mx-auto max-w-5xl px-5 md:px-10">
      <Link
        to="/library"
        className="inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary-fixed-dim"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span> Library
      </Link>

      <section className="glass-panel mt-5 rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <span className="flex size-20 items-center justify-center rounded-xl bg-primary-container/10 text-primary-container">
            <span className="material-symbols-outlined text-4xl">auto_stories</span>
          </span>
          <div className="min-w-56 flex-1">
            <p className="label-caps text-primary-fixed-dim">Chapter selection</p>
            <h1 className="mt-2 text-[28px] leading-9 font-bold tracking-[-0.02em]">
              {bookQuery.data?.title ?? "Loading…"}
            </h1>
            <p className="mt-1 text-on-surface-variant">
              {bookQuery.data?.author ?? "Unknown author"} · {chapters.length} chapters ·{" "}
              {estMinutes} min est.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/books/$bookId/play"
              params={{ bookId }}
              className="btn-glow flex items-center gap-2 rounded-full bg-primary-container px-6 py-3 font-bold text-on-primary-container"
            >
              <span className="material-symbols-outlined">play_arrow</span> Play
            </Link>
            <Link
              to="/books/$bookId/summary"
              params={{ bookId }}
              className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 transition-all hover:border-primary-container/60 hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span> Summarize
            </Link>
          </div>
        </div>
      </section>

      <ul className="mt-6 space-y-3">
        {chaptersQuery.isLoading ? (
          <li className="text-sm text-on-surface-variant">Loading chapters…</li>
        ) : chapters.length ? (
          chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link
                to="/books/$bookId/play"
                params={{ bookId }}
                className="glass-panel group flex items-center gap-4 rounded-xl p-4 transition-all hover:border-primary-container/40"
              >
                <span className="label-caps flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-on-surface-variant group-hover:text-primary-fixed-dim">
                  {String(chapter.chapter_index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{chapter.title}</span>
                  <span className="block text-sm text-on-surface-variant">
                    {chapter.word_count} words · ~{Math.max(1, Math.round(chapter.word_count / 150))}{" "}
                    min
                  </span>
                </span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-container">
                  play_circle
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li className="text-sm text-on-surface-variant">No chapters found for this book.</li>
        )}
      </ul>
    </main>
  );
}
