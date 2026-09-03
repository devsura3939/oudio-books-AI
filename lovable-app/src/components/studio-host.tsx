import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { db } from "@/integrations/external-supabase/client";

const STUDIO_URL = "/studio/index.html";

/**
 * Persistent EngBot Studio frame.
 *
 * The studio runs long jobs (whole-book Georgian translation, TTS prefetch), so
 * its iframe is mounted once — at the app-shell level — and simply hidden when
 * you navigate to another page. Navigating away no longer tears the frame down,
 * so a translation keeps running; and because every chunk is checkpointed, even
 * closing the tab resumes where it stopped on the next visit.
 */
export function StudioHost() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onStudio = pathname.startsWith("/studio");
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (onStudio) setActivated(true);
  }, [onStudio]);

  // The studio reads its signed-in user from `lumina_auth_user` on the same
  // origin; seed it from the real Supabase session before the frame loads.
  useEffect(() => {
    if (!activated || ready) return;
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
  }, [activated, ready]);

  if (!activated || !ready) return null;

  return (
    <div
      aria-hidden={!onStudio}
      className={
        onStudio
          ? "fixed top-[65px] right-0 bottom-16 left-0 z-30 md:bottom-0 md:left-64"
          : "pointer-events-none fixed top-0 left-0 -z-50 h-px w-px overflow-hidden opacity-0"
      }
    >
      <iframe
        src={STUDIO_URL}
        title="EngBot Studio"
        className="h-full w-full border-0"
        allow="autoplay; clipboard-write; fullscreen; camera"
      />
    </div>
  );
}

/** Small pill showing an in-flight Georgian translation from anywhere in the app. */
export function TranslationProgressPill() {
  const [job, setJob] = useState<{ title: string; chapterIdx: number; total: number } | null>(null);

  useEffect(() => {
    const read = () => {
      let found: { title: string; chapterIdx: number; total: number } | null = null;
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith("lumina_tjob_")) continue;
        try {
          const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null");
          if (parsed && parsed.status === "running") {
            found = {
              title: String(parsed.title ?? "Book"),
              chapterIdx: Number(parsed.chapterIdx ?? 0),
              total: Number(parsed.totalChapters ?? 0),
            };
            break;
          }
        } catch {
          /* ignore malformed entries */
        }
      }
      setJob(found);
    };
    read();
    const id = window.setInterval(read, 2000);
    return () => window.clearInterval(id);
  }, []);

  if (!job) return null;

  return (
    <div className="fixed right-4 bottom-20 z-40 rounded-full border border-primary-fixed-dim/40 bg-surface-container/90 px-4 py-2 text-xs text-on-surface backdrop-blur-md md:bottom-6">
      <span className="material-symbols-outlined mr-1 animate-spin align-middle text-[16px]">
        progress_activity
      </span>
      Translating “{job.title}” — chapter {Math.min(job.chapterIdx + 1, Math.max(job.total, 1))}
      {job.total ? ` / ${job.total}` : ""}
    </div>
  );
}
