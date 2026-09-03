import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { useImportPdf, MAX_IMPORT_BYTES } from "@/lib/use-import-pdf";
import type { Book } from "@/integrations/external-supabase/types";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a PDF — Lumina Audio" },
      {
        name: "description",
        content: "Drop in a PDF and Lumina detects chapters, then narrates them.",
      },
      { property: "og:title", content: "Upload a PDF — Lumina Audio" },
      {
        property: "og:description",
        content: "Drop in a PDF and Lumina detects chapters, then narrates them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UploadScreen,
});

const STEPS = [
  { icon: "picture_as_pdf", label: "Reading PDF" },
  { icon: "auto_stories", label: "Detecting chapters" },
  { icon: "cloud_upload", label: "Saving to your shelf" },
];

function UploadScreen() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<Book | null>(null);

  const importPdf = useImportPdf({ onImported: (book) => setDone(book) });

  function pick(file: File | undefined | null) {
    if (!file) return;
    setDone(null);
    importPdf.mutate(file);
  }

  // Processing Complete screen
  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-5 md:px-10">
        <div className="glass-panel rounded-2xl p-8 text-center md:p-12">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary-container/15 text-primary-container shadow-[0_0_40px_rgba(0,240,255,0.25)]">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
          </span>
          <p className="label-caps mt-6 text-primary-fixed-dim">Processing complete</p>
          <h1 className="mt-2 text-3xl leading-10 font-bold tracking-[-0.02em]">{done.title}</h1>
          <p className="mt-2 text-on-surface-variant">
            {done.total_chapters} chapters detected
            {done.page_count ? ` from ${done.page_count} pages` : ""} — ready to listen.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/books/$bookId/play"
              params={{ bookId: done.id }}
              className="btn-glow flex items-center gap-2 rounded-full bg-primary-container px-6 py-3 font-bold text-on-primary-container"
            >
              <span className="material-symbols-outlined">play_arrow</span> Start listening
            </Link>
            <Link
              to="/books/$bookId"
              params={{ bookId: done.id }}
              className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 transition-all hover:border-primary-container/60 hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-[20px]">list</span> Chapters
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(null);
                importPdf.reset();
                if (fileInput.current) fileInput.current.value = "";
              }}
              className="flex items-center gap-2 rounded-full px-6 py-3 text-on-surface-variant transition-colors hover:text-primary-fixed-dim"
            >
              <span className="material-symbols-outlined text-[20px]">add</span> Upload another
            </button>
          </div>
        </div>
      </main>
    );
  }

  // AI Processing screen
  if (importPdf.isPending) {
    const activeStep = importPdf.pct < 45 ? 0 : importPdf.pct < 85 ? 1 : 2;
    return (
      <main className="mx-auto max-w-2xl px-5 md:px-10">
        <div className="glass-panel rounded-2xl p-8 md:p-12">
          <div className="flex items-center justify-center gap-1.5" aria-hidden>
            {Array.from({ length: 14 }).map((_, index) => (
              <span
                key={index}
                className="w-1 animate-pulse rounded-full bg-primary-fixed-dim"
                style={{
                  height: `${12 + ((index * 37) % 56)}px`,
                  animationDelay: `${index * 90}ms`,
                }}
              />
            ))}
          </div>

          <p className="label-caps mt-8 text-center text-primary-fixed-dim">AI processing</p>
          <h1 className="mt-2 text-center text-2xl font-bold">{importPdf.stage ?? "Working…"}</h1>

          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-container to-secondary transition-all duration-500"
              style={{ width: `${importPdf.pct}%` }}
            />
          </div>

          <ul className="mt-8 space-y-3">
            {STEPS.map((step, index) => (
              <li
                key={step.label}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                  index <= activeStep
                    ? "bg-white/5 text-on-surface"
                    : "text-on-surface-variant opacity-60"
                }`}
              >
                <span className="material-symbols-outlined text-primary-container">
                  {index < activeStep ? "check_circle" : step.icon}
                </span>
                {step.label}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  // Upload screen
  return (
    <main className="mx-auto max-w-3xl px-5 md:px-10">
      <p className="label-caps text-primary-fixed-dim">Import</p>
      <h1 className="mt-2 text-[32px] leading-10 font-bold tracking-[-0.02em]">Upload a PDF</h1>
      <p className="mt-2 text-on-surface-variant">
        Lumina detects chapters, then narrates them with high-quality voices. Up to 40 MB.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => pick(event.target.files?.[0])}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files?.[0]);
        }}
        className={`glass-panel mt-8 rounded-2xl border-dashed p-10 text-center transition-all md:p-16 ${
          dragging ? "border-primary-container shadow-[0_0_30px_rgba(0,240,255,0.25)]" : ""
        }`}
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-container/10 text-primary-container">
          <span className="material-symbols-outlined text-4xl">upload_file</span>
        </span>
        <h2 className="mt-5 text-xl font-semibold">Drag &amp; drop your PDF</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          or pick a file from your device — max {Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB
        </p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="btn-glow mt-6 rounded-full bg-primary-container px-7 py-3 font-bold text-on-primary-container"
        >
          Choose file
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: "auto_awesome", title: "Smart chaptering", body: "Outline, TOC and heading detection." },
          { icon: "record_voice_over", title: "Neural voices", body: "Multilingual narration, incl. Georgian." },
          { icon: "lock", title: "Private", body: "Files stay in your own account storage." },
        ].map((card) => (
          <div key={card.title} className="glass-panel rounded-xl p-5">
            <span className="material-symbols-outlined text-primary-container">{card.icon}</span>
            <h3 className="mt-3 font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{card.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
