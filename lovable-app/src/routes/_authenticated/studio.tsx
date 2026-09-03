import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/studio")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Studio — EngBot" },
      {
        name: "description",
        content:
          "Full audiobook studio: paged reader, neural narration, book scanning, and the Georgian translation engine.",
      },
      { property: "og:title", content: "Studio — EngBot" },
      {
        property: "og:description",
        content:
          "Paged reader, neural narration, page scanning, and the hybrid Georgian translation engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudioPage,
});

/**
 * The studio itself lives in `StudioHost` (mounted once in the app shell) so its
 * long-running jobs survive navigation. This route only reserves the space and
 * shows a hint while the frame boots.
 */
function StudioPage() {
  return (
    <div className="flex h-[calc(100dvh-65px-64px)] w-full items-center justify-center text-sm text-muted-foreground md:h-[calc(100dvh-65px)]">
      Opening studio…
    </div>
  );
}
