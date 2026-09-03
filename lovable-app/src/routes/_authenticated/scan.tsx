import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/scan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scanner — EngBot" },
      {
        name: "description",
        content:
          "Scan book pages with your camera, then read, listen, translate or export the scanned book.",
      },
      { property: "og:title", content: "Scanner — EngBot" },
      {
        property: "og:description",
        content: "Scan pages into a book, then read in Moon Reader, narrate, translate or export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScanPage,
});

/**
 * The scanner lives inside the persistent studio frame (`StudioHost`) so it
 * shares one engine with everything else — same OCR, reader, TTS, translation
 * and exports. This route only reserves the space while the frame boots.
 */
function ScanPage() {
  return (
    <div className="flex h-[calc(100dvh-65px-64px)] w-full items-center justify-center text-sm text-muted-foreground md:h-[calc(100dvh-65px)]">
      Opening scanner…
    </div>
  );
}
