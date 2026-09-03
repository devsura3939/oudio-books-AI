import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/integrations/external-supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Lumina Audio Studio" },
      { name: "description", content: "Sign in or create an account to build your audiobook library." },
      { property: "og:title", content: "Sign in — Lumina Audio Studio" },
      { property: "og:description", content: "Access your private audiobook library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    void db.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/library", replace: true });
    });
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/library", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-radial-gradient px-5 text-on-surface">
      <div className="pointer-events-none absolute -top-[20%] -left-[10%] size-[50vw] rounded-full bg-primary-container/5 blur-[120px] mix-blend-screen" />
      <div className="pointer-events-none absolute -right-[10%] -bottom-[20%] size-[60vw] rounded-full bg-secondary/5 blur-[150px] mix-blend-screen" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel flex w-full flex-col gap-8 rounded-xl p-8 md:p-10">
          <Link to="/" className="flex flex-col items-center gap-3 text-center">
            <span
              className="material-symbols-outlined text-[48px] text-primary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              graphic_eq
            </span>
            <span>
              <span className="block text-[32px] leading-10 font-bold tracking-[-0.02em]">
                Lumina Audio
              </span>
              <span className="mt-1 block text-on-surface-variant">Premium AI Listening</span>
            </span>
          </Link>

          {sentConfirmation ? (
            <div className="text-center text-sm text-on-surface-variant">
              <span
                className="material-symbols-outlined mb-2 block text-[36px] text-primary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mark_email_read
              </span>
              We sent a confirmation link to{" "}
              <span className="text-on-surface">{email}</span>. Confirm it, then sign in.
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <span className="material-symbols-outlined text-on-surface-variant transition-colors group-focus-within:text-primary-container">
                      mail
                    </span>
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glass w-full rounded-lg py-3 pr-4 pl-12 text-on-surface transition-all placeholder:text-on-surface-variant/50"
                  />
                </div>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <span className="material-symbols-outlined text-on-surface-variant transition-colors group-focus-within:text-primary-container">
                      lock
                    </span>
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-glass w-full rounded-lg py-3 pr-4 pl-12 text-on-surface transition-all placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-glow mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-3 font-bold text-on-primary-container disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                )}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>
          )}

          {!sentConfirmation ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="label-caps text-primary-fixed-dim transition-colors hover:text-primary-container"
              >
                {mode === "signin" ? "Create an account" : "I already have an account"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
