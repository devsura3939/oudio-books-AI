import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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
  const onScan = pathname.startsWith("/scan");
  const onStudio = pathname.startsWith("/studio") || onScan;
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // Tell the studio which of its views to show (library vs. scanner shelf).
  useEffect(() => {
    if (!ready || !onStudio) return;
    const view = onScan ? "scanner" : "library";
    const send = () => frame.current?.contentWindow?.postMessage({ type: "engbot-navigate", view }, "*");
    send();
    const id = window.setTimeout(send, 900);
    return () => window.clearTimeout(id);
  }, [ready, onStudio, onScan]);


  useEffect(() => {
    if (onStudio) setActivated(true);
  }, [onStudio]);

  useEffect(() => {
    if (!activated || ready) return;
    let cancelled = false;

    // If user explicitly signed out, do not auto-seed session
    if (window.localStorage.getItem("lumina_explicitly_logged_out") === "true") {
      setReady(true);
      return;
    }

    void db.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (window.localStorage.getItem("lumina_explicitly_logged_out") === "true") {
        setReady(true);
        return;
      }
      const user = data.user;
      if (user) {
        const isAdmin = user.email?.toLowerCase() === "ananiadevsurashvili@gmail.com";
        const payload = {
          email: user.email ?? "",
          id: user.id,
          pro: true,
          role: isAdmin ? "admin" : "user",
          supabaseAuth: true,
        };
        window.localStorage.setItem("lumina_auth_user", JSON.stringify(payload));
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activated, ready]);

  // Listen for logout or login messages from the vendored studio frame
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "engbot-logout") {
        window.localStorage.removeItem("lumina_auth_user");
        window.localStorage.setItem("lumina_explicitly_logged_out", "true");
        void db.auth.signOut();
      } else if (event.data?.type === "engbot-login-success") {
        window.localStorage.removeItem("lumina_explicitly_logged_out");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const sendSync = () => {
    if (window.localStorage.getItem("lumina_explicitly_logged_out") === "true") {
      return;
    }
    void db.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        const isAdmin = user.email?.toLowerCase() === "ananiadevsurashvili@gmail.com";
        const payload = {
          email: user.email ?? "",
          id: user.id,
          pro: true,
          role: isAdmin ? "admin" : "user",
          supabaseAuth: true,
        };
        frame.current?.contentWindow?.postMessage(
          { type: "engbot-auth-sync", user: payload },
          "*"
        );
      }
    });
  };

  if (!activated || !ready) return null;

  return (
    <div
      aria-hidden={!onStudio}
      className={
        onStudio
          ? "fixed inset-0 z-50 h-full w-full overflow-hidden bg-[#0c1017]"
          : "pointer-events-none fixed top-0 left-0 -z-50 h-px w-px overflow-hidden opacity-0"
      }
    >
      <iframe
        ref={frame}
        src={STUDIO_URL}
        title="EngBot Studio"
        className="h-full w-full border-0"
        allow="autoplay; clipboard-write; fullscreen; camera"
        onLoad={sendSync}
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
