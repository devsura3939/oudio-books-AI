import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EngBot — Premium AI Audiobook Studio & Moon Reader" },
      {
        name: "description",
        content:
          "EngBot turns any PDF into a chaptered audiobook with AI narration, Georgian translation, camera book scanner and a Moon+ style reader.",
      },
      { property: "og:title", content: "EngBot — Premium AI Audiobook Studio & Moon Reader" },
      {
        property: "og:description",
        content: "AI chaptering, neural narration, Georgian translation and a futuristic glass reader.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioLanding,
});

function StudioLanding() {
  return (
    <main className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#0c1017]">
      <iframe
        src="/studio/index.html"
        title="EngBot Audiobook Studio"
        className="h-full w-full border-0"
        allow="autoplay; clipboard-write; fullscreen; camera; microphone"
      />
    </main>
  );
}

