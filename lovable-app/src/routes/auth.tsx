import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Headphones, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/integrations/external-supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <Headphones className="size-5 text-primary" /> Lumina Audio Studio
        </Link>

        {sentConfirmation ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm
            it, then sign in.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h1 className="text-lg font-semibold">
              {mode === "signin" ? "Sign in" : "Create your account"}
            </h1>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Sign up"}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
