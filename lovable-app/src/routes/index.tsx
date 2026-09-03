import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Headphones, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumina Audio Studio — Turn PDFs into audiobooks" },
      {
        name: "description",
        content:
          "Upload a PDF, get clean chapters and listen to them as narrated audio. Your library is private, stored in your own database.",
      },
      { property: "og:title", content: "Lumina Audio Studio — Turn PDFs into audiobooks" },
      {
        property: "og:description",
        content: "Upload a PDF, split it into chapters, and listen chapter by chapter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Headphones className="size-5 text-primary" /> Lumina Audio Studio
        </span>
        <Link
          to="/auth"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your PDFs, read out loud — chapter by chapter
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Lumina parses a PDF into real chapters, keeps them in your private library, and narrates
          them in the browser. Everything is scoped to your account.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Sparkles className="size-4" /> Start listening
        </Link>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-3">
        {[
          {
            icon: BookOpen,
            title: "Real chapter detection",
            body: "Headings first, page buckets as fallback, long chapters split into parts.",
          },
          {
            icon: Headphones,
            title: "Listen anywhere",
            body: "Browser narration with adjustable voice and speed, resumable per chapter.",
          },
          {
            icon: ShieldCheck,
            title: "Private by default",
            body: "Row level security means only you can read your books, chapters and files.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-lg border border-border bg-card p-5">
            <Icon className="size-5 text-primary" />
            <h2 className="mt-3 font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
