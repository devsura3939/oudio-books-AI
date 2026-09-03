import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { db, BUCKET_PDF } from "@/integrations/external-supabase/client";
import type { Book } from "@/integrations/external-supabase/types";
import { parsePdf } from "@/lib/pdf-chapters";

export const MAX_IMPORT_BYTES = 40 * 1024 * 1024;

/**
 * Shared PDF import pipeline (parse -> books row -> chapters rows -> storage).
 * Used by both the Library screen and the dedicated Upload screen so the
 * behaviour stays identical no matter where the user starts from.
 */
export function useImportPdf(options?: { onImported?: (book: Book) => void }) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("PDF is larger than 40 MB");
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("Not signed in");

      setStage("Reading PDF…");
      setPct(15);
      const parsed = await parsePdf(file);
      if (!parsed.chapters.length) throw new Error("No readable text found in this PDF");

      setStage("Detecting chapters…");
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

      setStage("Ready");
      setPct(100);
      return book as Book;
    },
    onSuccess: (book) => {
      toast.success(`Imported “${book.title}”`);
      void queryClient.invalidateQueries({ queryKey: ["books"] });
      options?.onImported?.(book);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Import failed"),
  });

  function reset() {
    setStage(null);
    setPct(0);
    mutation.reset();
  }

  return { ...mutation, stage, pct, reset };
}
