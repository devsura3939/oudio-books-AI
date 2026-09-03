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

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      const linkError = url.searchParams.get("error_description") ?? hash.get("error_description");
      if (linkError) {
        if (!cancelled) setError(linkError);
        return;
      }

      // PKCE / code flow
      const code = url.searchParams.get("code");
      if (code) {
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
        const { error: sessionError } = await db.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError && !cancelled) {
          setError(sessionError.message);
          return;
        }
      }

      const { data } = await db.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        navigate({ to: "/studio", replace: true });
      } else {
        setError("This confirmation link is invalid or has already been used.");
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">
        {error ? "Confirmation failed" : "Confirming your account…"}
      </h1>
      <p className="text-muted-foreground text-sm">
        {error ?? "One moment while we finish signing you in."}
      </p>
      {error ? (
        <Button onClick={() => navigate({ to: "/auth" })}>Back to sign in</Button>
      ) : null}
    </main>
  );
}
