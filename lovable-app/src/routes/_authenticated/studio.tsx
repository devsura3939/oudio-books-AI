import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { db } from "@/integrations/external-supabase/client";

export const Route = createFileRoute("/_authenticated/studio")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Studio — Lumina Audio Studio" },
      {
        name: "description",
        content:
          "Full audiobook studio: paged reader, neural narration, and the Georgian translation engine.",
      },
      { property: "og:title", content: "Studio — Lumina Audio Studio" },
      {
        property: "og:description",
        content: "Paged reader, neural narration, and AI-assisted Georgian translation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudioPage,
});

const STUDIO_URL = "/studio/index.html";

function StudioPage() {
  const [ready, setReady] = useState(false);

  // The vendored studio app reads its signed-in user from `lumina_auth_user`
  // on the same origin. Seed it from the real Supabase session so the studio
  // never has to run its own (previously fake) login form.
  useEffect(() => {
    let cancelled = false;
    void db.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const user = data.user;
      if (user) {
        window.localStorage.setItem(
          "lumina_auth_user",
          JSON.stringify({ email: user.email ?? "", id: user.id, pro: true }),
        );
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-[calc(100vh-65px)] w-full">
      {ready ? (
        <iframe
          src={STUDIO_URL}
          title="Lumina Audio Studio"
          className="h-full w-full border-0"
          allow="autoplay; clipboard-write; fullscreen"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Opening studio…
        </div>
      )}
    </div>
  );
}
