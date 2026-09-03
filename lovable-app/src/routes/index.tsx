import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumina Audio — Premium AI listening for your PDFs" },
      {
        name: "description",
        content:
          "Lumina Audio turns any PDF into a chaptered audiobook with AI narration, Georgian translation and a Moon+ style reader. Your library stays private.",
      },
      { property: "og:title", content: "Lumina Audio — Premium AI listening for your PDFs" },
      {
        property: "og:description",
        content: "AI chaptering, high quality narration and a futuristic glass reader.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: "auto_stories",
    title: "AI chapter detection",
    body: "Outlines first, heading heuristics next, long chapters split into readable parts.",
  },
  {
    icon: "graphic_eq",
    title: "Premium narration",
    body: "Neural voices, browser speech or ElevenLabs — resumable sentence by sentence.",
  },
  {
    icon: "translate",
    title: "Georgian engine",
    body: "A 1.45.0 knowledge base with 128 prompt blocks and 112 auto-fixes for literary KA.",
  },
  {
    icon: "shield_lock",
    title: "Private by design",
    body: "Row level security keeps every book, chapter and audio file scoped to you.",
  },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-radial-gradient text-on-surface">
      <div className="pointer-events-none absolute -top-[20%] -left-[10%] size-[50vw] rounded-full bg-primary-container/5 blur-[120px] mix-blend-screen" />
      <div className="pointer-events-none absolute -right-[10%] -bottom-[20%] size-[60vw] rounded-full bg-secondary/5 blur-[150px] mix-blend-screen" />

      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-10">
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-[32px] text-primary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              graphic_eq
            </span>
            <div>
              <p className="text-[18px] leading-5 font-bold text-primary-container">Lumina Audio</p>
              <p className="text-[12px] text-on-surface-variant">Premium AI Listening</p>
            </div>
          </div>
          <Link
            to="/auth"
            className="label-caps rounded-lg border border-white/10 px-4 py-2.5 text-on-surface transition-all hover:border-primary-container/50 hover:bg-white/5"
          >
            Sign in
          </Link>
        </header>

        <section className="mx-auto max-w-3xl px-5 pt-16 pb-12 text-center md:px-10">
          <p className="label-caps text-primary-fixed-dim">AI audiobook studio</p>
          <h1 className="mt-4 text-[32px] leading-10 font-bold tracking-[-0.02em] md:text-[48px] md:leading-14">
            Every PDF you own, narrated like a studio audiobook
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-on-surface-variant">
            Upload a book, let Lumina cut it into real chapters, then read along in the glass reader
            or listen hands-free with high quality voices and Georgian translation.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="btn-glow flex items-center gap-2 rounded-lg bg-primary-container px-6 py-3 font-bold text-on-primary-container"
            >
              Start listening
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <Link
              to="/library"
              className="label-caps rounded-lg border border-white/10 px-6 py-3.5 text-on-surface transition-all hover:border-primary-container/50 hover:bg-white/5"
            >
              Open my library
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-24 md:grid-cols-2 md:px-10 lg:grid-cols-4">
          {features.map(({ icon, title, body }) => (
            <article key={title} className="glass-panel rounded-xl p-6">
              <span className="material-symbols-outlined text-[28px] text-primary-container">
                {icon}
              </span>
              <h2 className="mt-4 text-[18px] font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
