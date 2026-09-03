import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { db } from "@/integrations/external-supabase/client";
import type { Book } from "@/integrations/external-supabase/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Listening dashboard — EngBot" },
      {
        name: "description",
        content: "Continue listening, track chapters and jump back into your audiobooks.",
      },
      { property: "og:title", content: "Listening dashboard — EngBot" },
      {
        property: "og:description",
        content: "Continue listening, track chapters and jump back into your audiobooks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await db
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Book[];
    },
  });

  const books = booksQuery.data ?? [];
  const latest = books[0] ?? null;
  const totalChapters = books.reduce((sum, book) => sum + (book.total_chapters ?? 0), 0);
  const totalPages = books.reduce((sum, book) => sum + (book.page_count ?? 0), 0);
  const estMinutes = Math.round((totalChapters * 12 * 60) / 60);

  const stats = [
    { icon: "library_books", label: "Books", value: String(books.length) },
    { icon: "menu_book", label: "Chapters", value: String(totalChapters) },
    { icon: "description", label: "Pages", value: String(totalPages) },
    {
      icon: "schedule",
      label: "Est. listening",
      value: estMinutes >= 60 ? `${Math.round(estMinutes / 60)} h` : `${estMinutes} m`,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 md:px-10">
      <p className="label-caps text-primary-fixed-dim">Welcome back</p>
      <h1 className="mt-2 text-[32px] leading-10 font-bold tracking-[-0.02em] md:text-5xl md:leading-14">
        Listening dashboard
      </h1>

      {/* Continue listening */}
      <section className="glass-panel mt-8 overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative size-28 shrink-0 rounded-full border-4 border-surface-container-high shadow-[0_0_50px_rgba(0,240,255,0.2)] md:size-36">
            <div className="size-full rounded-full bg-[conic-gradient(from_0deg,rgba(0,240,255,0.35),rgba(220,184,255,0.35),rgba(0,240,255,0.35))]" />
            <div className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-outline-variant bg-surface" />
          </div>

          <div className="min-w-56 flex-1">
            <p className="label-caps text-primary-fixed-dim">Continue listening</p>
            {latest ? (
              <>
                <h2 className="mt-2 text-2xl leading-8 font-semibold">{latest.title}</h2>
                <p className="mt-1 text-on-surface-variant">
                  {latest.author ?? "Unknown author"} · {latest.total_chapters} chapters
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    to="/books/$bookId/play"
                    params={{ bookId: latest.id }}
                    className="btn-glow flex items-center gap-2 rounded-full bg-primary-container px-6 py-3 font-bold text-on-primary-container"
                  >
                    <span className="material-symbols-outlined">play_arrow</span> Play
                  </Link>
                  <Link
                    to="/books/$bookId"
                    params={{ bookId: latest.id }}
                    className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-on-surface transition-all hover:border-primary-container/60 hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-[20px]">list</span> Chapters
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl leading-8 font-semibold">Nothing queued yet</h2>
                <p className="mt-1 text-on-surface-variant">
                  Upload a PDF and EngBot will split it into listenable chapters.
                </p>
                <Link
                  to="/upload"
                  className="btn-glow mt-5 inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-3 font-bold text-on-primary-container"
                >
                  <span className="material-symbols-outlined">upload_file</span> Upload PDF
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-panel rounded-xl p-5">
            <span className="material-symbols-outlined text-primary-container">{stat.icon}</span>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            <p className="label-caps mt-1 text-on-surface-variant">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Recent */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Your shelf</h2>
          <Link to="/library" className="text-sm text-primary-fixed-dim hover:underline">
            View library
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {booksQuery.isLoading ? (
            <p className="text-sm text-on-surface-variant">Loading…</p>
          ) : books.length ? (
            books.slice(0, 6).map((book) => (
              <Link
                key={book.id}
                to="/books/$bookId"
                params={{ bookId: book.id }}
                className="glass-panel rounded-xl p-5 transition-all hover:border-primary-container/40"
              >
                <span className="material-symbols-outlined text-primary-container">
                  auto_stories
                </span>
                <h3 className="mt-3 line-clamp-2 font-semibold">{book.title}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {book.author ?? "Unknown author"} · {book.total_chapters} ch.
                </p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">No books yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
