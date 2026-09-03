import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { BookOpen, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { db, BUCKET_PDF } from "@/integrations/external-supabase/client";
import type { Book } from "@/integrations/external-supabase/types";
import { useImportPdf } from "@/lib/use-import-pdf";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Your library — Lumina Audio Studio" },
      { name: "description", content: "Upload PDFs and manage your personal audiobook library." },
      { property: "og:title", content: "Your library — Lumina Audio Studio" },
      { property: "og:description", content: "Upload PDFs and manage your audiobook library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Library,
});

function Library() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

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

  // Shared pipeline with the dedicated /upload screen.
  const importPdf = useImportPdf({
    onImported: () => {
      if (fileInput.current) fileInput.current.value = "";
    },
  });
  const { stage, pct } = importPdf;

  const removeBook = useMutation({
    mutationFn: async (book: Book) => {
      if (book.pdf_path) await db.storage.from(BUCKET_PDF).remove([book.pdf_path]);
      const { error } = await db.from("books").delete().eq("id", book.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book deleted");
      void queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-radial-gradient px-5 py-10 text-on-surface md:px-10">
      <div className="pointer-events-none absolute -top-[25%] -right-[10%] size-[50vw] rounded-full bg-primary-container/5 blur-[130px] mix-blend-screen" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-primary-fixed-dim">Your shelf</p>
            <h1 className="mt-2 text-[32px] leading-10 font-bold tracking-[-0.02em]">Library</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Import a PDF and Lumina turns it into listenable chapters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/studio"
              className="label-caps flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-on-surface transition-all hover:border-primary-container/50 hover:bg-white/5"
            >
              <Sparkles className="size-4 text-primary-container" /> Open Studio
            </Link>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importPdf.mutate(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={importPdf.isPending}
              className="btn-glow flex items-center gap-2 rounded-lg bg-primary-container px-5 py-3 font-bold text-on-primary-container disabled:opacity-60"
            >
              {importPdf.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Import PDF
            </button>
          </div>
        </div>

        {stage ? (
          <div className="glass-panel mt-8 rounded-xl p-5">
            <p className="label-caps text-primary-fixed-dim">{stage}</p>
            <Progress value={pct} className="mt-3" />
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {booksQuery.isLoading ? (
            <p className="text-sm text-on-surface-variant">Loading…</p>
          ) : booksQuery.data?.length ? (
            booksQuery.data.map((book) => (
              <article
                key={book.id}
                className="glass-panel group flex flex-col rounded-xl p-6 transition-all hover:border-primary-container/40"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary-container/10 text-primary-container">
                  <BookOpen className="size-5" />
                </span>
                <h2 className="mt-4 line-clamp-2 text-[18px] font-semibold">{book.title}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {book.author ?? "Unknown author"} · {book.total_chapters} chapters
                  {book.page_count ? ` · ${book.page_count} pages` : ""}
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <Link
                    to="/books/$bookId"
                    params={{ bookId: book.id }}
                    className="flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.35)]"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    Listen
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeBook.mutate(book)}
                    aria-label={`Delete ${book.title}`}
                    className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">
              Nothing here yet — import your first PDF above.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
