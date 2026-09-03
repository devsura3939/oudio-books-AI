import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { BookOpen, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { db, BUCKET_PDF } from "@/integrations/external-supabase/client";
import type { Book } from "@/integrations/external-supabase/types";
import { parsePdf } from "@/lib/pdf-chapters";
import { Button } from "@/components/ui/button";
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

const MAX_BYTES = 40 * 1024 * 1024;

function Library() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

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

  const importPdf = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_BYTES) throw new Error("PDF is larger than 40 MB");
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("Not signed in");

      setStage("Reading PDF…");
      setPct(15);
      const parsed = await parsePdf(file);
      if (!parsed.chapters.length) throw new Error("No readable text found in this PDF");

      setStage("Creating book…");
      setPct(45);
      const { data: book, error: bookError } = await db
        .from("books")
        .insert({
          user_id: user.id,
          title: parsed.title?.trim() || file.name.replace(/\.pdf$/i, ""),
          author: parsed.author?.trim() || null,
          source_filename: file.name,
          page_count: parsed.pageCount,
          total_chapters: parsed.chapters.length,
          status: "parsing",
        })
        .select("*")
        .single();
      if (bookError) throw bookError;

      setStage("Saving chapters…");
      setPct(65);
      const rows = parsed.chapters.map((chapter, index) => ({
        book_id: (book as Book).id,
        user_id: user.id,
        chapter_index: index,
        title: chapter.title.slice(0, 200),
        text_content: chapter.text,
        word_count: chapter.wordCount,
      }));
      const { error: chapterError } = await db.from("chapters").insert(rows);
      if (chapterError) throw chapterError;

      setStage("Uploading source file…");
      setPct(85);
      const pdfPath = `${user.id}/${(book as Book).id}.pdf`;
      const { error: uploadError } = await db.storage
        .from(BUCKET_PDF)
        .upload(pdfPath, file, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await db
        .from("books")
        .update({ pdf_path: pdfPath, status: "ready" })
        .eq("id", (book as Book).id);
      if (updateError) throw updateError;

      setPct(100);
      return book as Book;
    },
    onSuccess: (book) => {
      toast.success(`Imported “${book.title}”`);
      void queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Import failed"),
    onSettled: () => {
      setStage(null);
      setPct(0);
      if (fileInput.current) fileInput.current.value = "";
    },
  });

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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a PDF and Lumina turns it into listenable chapters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link to="/studio">
              <Sparkles className="size-4" /> Open Studio
            </Link>
          </Button>
        </div>
        <div>

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
          <Button onClick={() => fileInput.current?.click()} disabled={importPdf.isPending}>
            {importPdf.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Import PDF
          </Button>
        </div>
      </div>

      {stage ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{stage}</p>
          <Progress value={pct} className="mt-2" />
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {booksQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : booksQuery.data?.length ? (
          booksQuery.data.map((book) => (
            <article key={book.id} className="rounded-lg border border-border bg-card p-5">
              <BookOpen className="size-5 text-primary" />
              <h2 className="mt-3 line-clamp-2 font-medium">{book.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {book.author ?? "Unknown author"} · {book.total_chapters} chapters
                {book.page_count ? ` · ${book.page_count} pages` : ""}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button asChild size="sm">
                  <Link to="/books/$bookId" params={{ bookId: book.id }}>
                    Listen
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBook.mutate(book)}
                  aria-label={`Delete ${book.title}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing here yet — import your first PDF above.
          </p>
        )}
      </div>
    </main>
  );
}
