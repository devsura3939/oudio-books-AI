import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/integrations/external-supabase/client";

// Canonical redirect URL - must be whitelisted in Supabase Dashboard
// We hardcode this so email links always land on the real app, not localhost:3000
const APP_ORIGIN = "https://audible-architect.lovable.app";
const CALLBACK_URL = `${APP_ORIGIN}/auth/callback`;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in - EngBot" },
      { name: "description", content: "Sign in or create an account to build your audiobook library." },
      { property: "og:title", content: "Sign in - EngBot" },
      { property: "og:description", content: "Access your private audiobook library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const isRecoveryInitial = typeof window !== "undefined" && (
    new URLSearchParams(window.location.search).get("type") === "recovery" ||
    new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery"
  );
  const [mode, setMode] = useState<Mode>(isRecoveryInitial ? "reset" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const [sentReset, setSentReset] = useState(false);

  // Detect if this is a password-reset redirect (type=recovery in URL or hash)
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type =
      new URLSearchParams(window.location.search).get("type") ??
      hash.get("type");
    if (type === "recovery") {
      setMode("reset");
    }
  }, []);

  // Detect if redirected from successful email confirmation
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("confirmed") === "true") {
      toast.success("Account confirmed successfully! Please sign in with your password.");
      setMode("signin");
    }
  }, []);

  // If already signed in, skip to studio (but NOT during password reset or after confirmation)
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    const isRecovery =
      search.get("type") === "recovery" ||
      hash.get("type") === "recovery" ||
      mode === "reset" ||
      isRecoveryInitial;

    if (isRecovery) {
      setMode("reset");
      return;
    }
    if (search.get("confirmed") === "true") return;

    void db.auth.getSession().then(({ data }) => {
      if (data.session && !isRecovery) navigate({ to: "/studio", replace: true });
    });
  }, [navigate, mode, isRecoveryInitial]);

  function friendly(message: string) {
    const m = message.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered"))
      return "That email already has an account - sign in instead.";
    if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
      return "Wrong email or password.";
    if (m.includes("email not confirmed"))
      return "Confirm your email first - check your inbox.";
    if (m.includes("rate limit") || m.includes("too many"))
      return "Too many attempts. Wait a minute and try again.";
    if (m.includes("password"))
      return "Password must be at least 8 characters with a letter and a number.";
    return message;
  }

  async function resendConfirmation() {
    setBusy(true);
    try {
      const { error } = await db.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: CALLBACK_URL },
      });
      if (error) throw error;
      toast.success("Confirmation link sent again - check your inbox.");
    } catch (error) {
      toast.error(friendly(error instanceof Error ? error.message : "Could not resend the link"));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // ---- SET NEW PASSWORD (recovery flow) ----
    if (mode === "reset") {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (!(password.length >= 8 && /[a-z]/i.test(password) && /\d/.test(password))) {
        toast.error("Password must be at least 8 characters with a letter and a number.");
        return;
      }
      setBusy(true);
      try {
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated successfully! Signing you in...");
        navigate({ to: "/studio", replace: true });
      } catch (err) {
        toast.error(friendly(err instanceof Error ? err.message : "Could not update password"));
      } finally {
        setBusy(false);
      }
      return;
    }

    // ---- SEND RESET EMAIL ----
    if (mode === "forgot") {
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
        toast.error("Enter your email address above, then click Send reset link.");
        return;
      }
      setBusy(true);
      try {
        // Verify user exists in database first
        try {
          const checkRes = await fetch("/api/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail }),
          });
          if (checkRes.ok) {
            const checkData = (await checkRes.json()) as { exists: boolean };
            if (!checkData.exists) {
              setBusy(false);
              toast.error(`No registered account found with email ${cleanEmail}. Please check spelling or create an account.`);
              return;
            }
          }
        } catch (checkErr) {
          console.warn("[auth] /api/check-email unavailable:", checkErr);
        }

        const { error } = await db.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: CALLBACK_URL,
        });
        if (error) throw error;
        setSentReset(true);
        toast.success("Password reset link sent - check your inbox.");
      } catch (err) {
        toast.error(friendly(err instanceof Error ? err.message : "Could not send reset link. Try again."));
      } finally {
        setBusy(false);
      }
      return;
    }

    // ---- SIGN IN / SIGN UP ----
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (mode === "signup" && !(password.length >= 8 && /[a-z]/i.test(password) && /\d/.test(password))) {
      toast.error("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    setEmail(cleanEmail);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await db.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: CALLBACK_URL },
        });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setMode("signin");
          toast.error("That email already has an account - sign in instead.");
          return;
        }
        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Check your email to confirm your account, then come back to sign in.");
          return;
        }
      } else {
        const { error } = await db.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
      navigate({ to: "/studio", replace: true });
    } catch (error) {
      toast.error(friendly(error instanceof Error ? error.message : "Authentication failed"));
    } finally {
      setBusy(false);
    }
  }

  const headingIcon =
    mode === "reset" ? "lock_reset" : mode === "forgot" ? "lock_open" : "graphic_eq";
  const headingText =
    mode === "reset"
      ? "Set a new password"
      : mode === "forgot"
      ? "Reset your password"
      : "EngBot";
  const subText =
    mode === "reset"
      ? "Choose a strong password (8+ chars, letter + number)."
      : mode === "forgot"
      ? "Enter your email and we will send a recovery link."
      : "Premium AI Listening";

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
              {headingIcon}
            </span>
            <span>
              <span className="block text-[32px] leading-10 font-bold tracking-[-0.02em]">
                {headingText}
              </span>
              <span className="mt-1 block text-on-surface-variant">{subText}</span>
            </span>
          </Link>

          {/* Confirmation sent state */}
          {sentConfirmation ? (
            <div className="text-center text-sm text-on-surface-variant">
              <span
                className="material-symbols-outlined mb-2 block text-[36px] text-primary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mark_email_read
              </span>
              We sent a confirmation link to{" "}
              <span className="text-on-surface">{email}</span>.
              <br />
              Click it, then come back here to sign in.
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={busy}
                  className="label-caps text-primary-fixed-dim hover:text-primary-container disabled:opacity-60"
                >
                  Resend confirmation link
                </button>
                <button
                  type="button"
                  onClick={() => { setSentConfirmation(false); setMode("signin"); }}
                  className="label-caps text-on-surface-variant hover:text-primary-container"
                >
                  Back to sign in
                </button>
              </div>
            </div>

          ) : sentReset ? (
            /* Reset email sent state */
            <div className="text-center text-sm text-on-surface-variant">
              <span
                className="material-symbols-outlined mb-2 block text-[36px] text-primary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mark_email_read
              </span>
              Password reset link sent to{" "}
              <span className="text-on-surface">{email}</span>.
              <br />
              Click the link in the email to set your new password.
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => { setSentReset(false); setMode("signin"); }}
                  className="label-caps text-primary-fixed-dim hover:text-primary-container"
                >
                  Back to sign in
                </button>
              </div>
            </div>

          ) : (
            /* Main form */
            <form onSubmit={submit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">

                {/* Email — hidden only during password reset */}
                {mode !== "reset" && (
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
                )}

                {/* Password — not on forgot screen */}
                {mode !== "forgot" && (
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
                      minLength={mode === "signin" ? 1 : 8}
                      placeholder={mode === "reset" ? "New password" : "Password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-glass w-full rounded-lg py-3 pr-4 pl-12 text-on-surface transition-all placeholder:text-on-surface-variant/50"
                    />
                  </div>
                )}

                {/* Confirm password — only on reset */}
                {mode === "reset" && (
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <span className="material-symbols-outlined text-on-surface-variant transition-colors group-focus-within:text-primary-container">
                        lock_check
                      </span>
                    </div>
                    <input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-glass w-full rounded-lg py-3 pr-4 pl-12 text-on-surface transition-all placeholder:text-on-surface-variant/50"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-glow mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-3 font-bold text-on-primary-container disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[20px]">
                    {mode === "forgot" ? "send" : mode === "reset" ? "lock_reset" : "arrow_forward"}
                  </span>
                )}
                {mode === "forgot"
                  ? "Send reset link"
                  : mode === "reset"
                  ? "Set new password"
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          )}

          {/* Footer links */}
          {!sentConfirmation && !sentReset && mode !== "reset" && (
            <div className="flex flex-col items-center gap-3 text-center">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="label-caps text-primary-fixed-dim transition-colors hover:text-primary-container"
                >
                  Back to sign in
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setPassword("");
                    }}
                    className="label-caps text-primary-fixed-dim transition-colors hover:text-primary-container"
                  >
                    {mode === "signin" ? "Create an account" : "I already have an account"}
                  </button>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setSentReset(false); setMode("forgot"); }}
                      className="label-caps text-on-surface-variant/60 transition-colors hover:text-primary-container"
                    >
                      Forgot password?
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
