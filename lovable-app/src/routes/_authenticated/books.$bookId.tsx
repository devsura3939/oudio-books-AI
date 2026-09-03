import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, Square } from "lucide-react";

import { db } from "@/integrations/external-supabase/client";
import type { Book, Chapter } from "@/integrations/external-supabase/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/books/$bookId")({
  head: () => ({
    meta: [
      { title: "Listen — Lumina Audio Studio" },
      { name: "description", content: "Read and listen to a book chapter by chapter." },
      { property: "og:title", content: "Listen — Lumina Audio Studio" },
      { property: "og:description", content: "Read and listen to a book chapter by chapter." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { bookId } = Route.useParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(1);
  rateRef.current = rate;

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
  const active = useMemo(
    () => chapters.find((c) => c.id === activeId) ?? chapters[0] ?? null,
    [chapters, activeId],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speak(chapter: Chapter) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(chapter.text_content.slice(0, 30000));
    utterance.rate = rateRef.current;
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    window.speechSynthesis.speak(utterance);
    setActiveId(chapter.id);
    setSpeaking(true);
    setPaused(false);
  }

  function togglePause() {
    if (!("speechSynthesis" in window)) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }

  function stop() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        to="/library"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Library
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {bookQuery.data?.title ?? "Loading…"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {bookQuery.data?.author ?? "Unknown author"} · {chapters.length} chapters
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav className="space-y-1">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => setActiveId(chapter.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                active?.id === chapter.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              <span className="line-clamp-1">{chapter.title}</span>
              <span className="text-xs opacity-70">{chapter.word_count} words</span>
            </button>
          ))}
        </nav>

        <section className="rounded-lg border border-border bg-card p-6">
          {active ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => speak(active)}>
                  <Play className="size-4" /> {speaking ? "Restart" : "Play"}
                </Button>
                <Button variant="secondary" onClick={togglePause} disabled={!speaking}>
                  <Pause className="size-4" /> {paused ? "Resume" : "Pause"}
                </Button>
                <Button variant="ghost" onClick={stop} disabled={!speaking}>
                  <Square className="size-4" /> Stop
                </Button>
                <div className="flex min-w-40 items-center gap-2 text-sm text-muted-foreground">
                  Speed
                  <Slider
                    value={[rate]}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) => setRate(value ?? 1)}
                  />
                  <span className="tabular-nums">{rate.toFixed(1)}x</span>
                </div>
              </div>

              <h2 className="mt-6 font-medium">{active.title}</h2>
              <p className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {active.text_content}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {chaptersQuery.isLoading ? "Loading chapters…" : "No chapters found for this book."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
