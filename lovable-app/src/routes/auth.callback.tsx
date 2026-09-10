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

// React can remount effects while a one-time email code is being consumed.
const callbackExchanges = new Map<string, Promise<string | null>>();
function exchangeEmailLink(href: string): Promise<string | null> {
  const existing = callbackExchanges.get(href);
  if (existing) return existing;
  const exchange = (async () => {
    const url = new URL(href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const param = (key: string) => url.searchParams.get(key) ?? hash.get(key);
    if (param("error") || param("error_description")) throw new Error("This email link expired or was already used. Request a new link.");
    const type = param("type");
    let error;
    if (param("code")) {
      ({ error } = await db.auth.exchangeCodeForSession(param("code")!));
    } else if (param("access_token") && param("refresh_token")) {
      ({ error } = await db.auth.setSession({ access_token: param("access_token")!, refresh_token: param("refresh_token")! }));
    } else if (param("token_hash") && (type === "signup" || type === "email" || type === "recovery" || type === "invite" || type === "email_change")) {
      ({ error } = await db.auth.verifyOtp({ token_hash: param("token_hash")!, type }));
    } else {
      throw new Error("This email link is incomplete. Request a new link.");
    }
    if (error) throw error;
    const { data, error: userError } = await db.auth.getUser();
    if (userError || !data.user) throw new Error("This link is invalid or expired. Request a new link.");
    return type;
  })();
  callbackExchanges.set(href, exchange);
  return exchange;
}

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Confirming your account...");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const type = await exchangeEmailLink(window.location.href);
        if (cancelled) return;
        window.history.replaceState(null, "", window.location.pathname);
        if (type === "recovery") {
          setStatus("Opening password recovery...");
          navigate({ to: "/auth", search: { type: "recovery" }, replace: true });
        } else {
          setStatus("Email confirmed. Opening sign in...");
          navigate({ to: "/auth", search: { confirmed: "true" }, replace: true });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not verify this email link.");
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
