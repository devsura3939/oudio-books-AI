import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/integrations/external-supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirming your account | EngBot" },
      {
        name: "description",
        content: "Finishing email confirmation for your EngBot account.",
      },
      { property: "og:title", content: "Confirming your account | EngBot" },
      {
        property: "og:description",
        content: "Finishing email confirmation for your EngBot account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Confirming your account...");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      // Check for errors first
      const linkError =
        url.searchParams.get("error_description") ?? hash.get("error_description");
      if (linkError) {
        if (!cancelled) setError(decodeURIComponent(linkError));
        return;
      }

      // Detect the type of link - recovery means password reset
      const linkType =
        url.searchParams.get("type") ?? hash.get("type");

      // PKCE / code flow (Supabase default)
      const code = url.searchParams.get("code");
      if (code) {
        if (!cancelled) setStatus("Exchanging confirmation code...");
        const { error: exchangeError } = await db.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setError(exchangeError.message);
          return;
        }
      }

      // Older implicit flow: tokens arrive in the URL hash
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        if (!cancelled) setStatus("Setting up your session...");
        const { error: sessionError } = await db.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError && !cancelled) {
          setError(sessionError.message);
          return;
        }
      }

      // Verify the session was established
      const { data } = await db.auth.getUser();
      if (cancelled) return;

      if (data.user) {
        // Password recovery link - go to auth page to set new password
        if (linkType === "recovery") {
          setStatus("Redirecting to set your new password...");
          navigate({ to: "/auth", search: { type: "recovery" }, replace: true });
          return;
        }
        // Email confirmation or magic link - go straight to studio
        setStatus("Account confirmed! Redirecting to your studio...");
        navigate({ to: "/studio", replace: true });
      } else {
        setError("This link is invalid or has already been used. Please request a new one.");
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      {!error && (
        <div className="flex flex-col items-center gap-4">
          <span
            className="material-symbols-outlined animate-spin text-[48px] text-primary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            progress_activity
          </span>
          <h1 className="text-2xl font-semibold">{status}</h1>
          <p className="text-sm text-muted-foreground">One moment please...</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center gap-4">
          <span
            className="material-symbols-outlined text-[48px] text-destructive"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          <h1 className="text-2xl font-semibold">Link error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => navigate({ to: "/auth" })}>Back to sign in</Button>
        </div>
      )}
    </main>
  );
}
