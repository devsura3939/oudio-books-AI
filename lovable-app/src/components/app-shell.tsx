import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { StudioHost, TranslationProgressPill } from "@/components/studio-host";
import { db } from "@/integrations/external-supabase/client";
import { useIsAdmin } from "@/lib/use-admin";

type NavItem = { to: string; icon: string; label: string };

const NAV: NavItem[] = [
  { to: "/dashboard", icon: "home", label: "Home" },
  { to: "/scan", icon: "document_scanner", label: "Scanner" },
  { to: "/studio", icon: "graphic_eq", label: "EngBot" },
  { to: "/profile", icon: "account_circle", label: "Profile" },
];

/**
 * Stitch "EngBot" chrome: frosted side rail + top bar, radial glow.
 * Shared by every authenticated screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, userEmail } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStudio = pathname.startsWith("/studio") || pathname.startsWith("/scan");

  // Admin-only Training Lab entry (owner account).
  const nav = isAdmin ? [...NAV, { to: "/training", icon: "model_training", label: "Training" }] : NAV;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await db.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // When on Studio view, render the studio 100% full-screen without outer chrome
  // to perfectly match GitHub Pages and avoid double headers / footers on mobile.
  if (isStudio) {
    return (
      <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#0c1017]">
        <StudioHost />
        <TranslationProgressPill />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-on-surface">
      <div className="pointer-events-none fixed top-1/2 left-1/2 -z-10 h-[150vh] w-[150vw] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.08)_0%,rgba(119,1,208,0.05)_40%,rgba(16,19,26,0)_70%)]" />

      {/* Side rail */}
      <aside className="fixed top-0 left-0 z-50 hidden h-full w-64 flex-col border-r border-white/15 bg-surface-container/60 px-4 py-8 shadow-[0_0_40px_rgba(0,240,255,0.1)] backdrop-blur-[32px] md:flex">
        <Link to="/dashboard" className="text-2xl font-bold text-primary-container">
          EngBot
        </Link>
        <p className="mt-1 mb-6 text-sm text-on-surface-variant">Premium AI Listening</p>

        {isAdmin && (
          <div className="mb-6 rounded-xl border border-primary-container/30 bg-primary-container/10 p-3 text-[11px] font-mono text-primary-fixed shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <div className="flex items-center justify-between font-bold">
              <span>👑 Owner Admin</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-container/20 text-primary-fixed">PRO</span>
            </div>
            <p className="mt-1 truncate text-[10px] text-on-surface-variant">{userEmail || "ananiadevsurashvili@gmail.com"}</p>
            <div className="mt-2 border-t border-white/10 pt-1.5 space-y-0.5 text-[10px]">
              <p><span className="text-on-surface-variant">App:</span> <span className="text-white font-bold">v1.46.8</span></p>
              <p><span className="text-on-surface-variant">Engine:</span> <span className="text-white font-bold">v1.46.8 (Lumina-MultiBurst+ServerAI+SupabaseJobs+Storage)</span></p>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-2">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{
                className:
                  "bg-white/10 text-primary-fixed-dim border-r-2 border-primary-fixed-dim",
              }}
              inactiveProps={{ className: "text-on-surface-variant" }}
              className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all hover:bg-white/10 hover:text-primary-fixed-dim active:scale-95"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <Link
          to="/upload"
          className="btn-glow mb-6 block rounded-lg bg-primary-container px-4 py-3 text-center font-semibold text-on-primary-container"
        >
          Upload PDF
        </Link>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-on-surface-variant transition-all hover:bg-white/10 hover:text-primary-fixed-dim"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <nav className="fixed top-0 right-0 z-40 flex w-full items-center justify-between border-b border-white/15 bg-surface/40 px-5 py-4 backdrop-blur-[24px] md:w-[calc(100%-16rem)] md:px-10">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-primary-fixed md:text-lg">EngBot</span>
          {isAdmin && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary-container/40 bg-primary-container/15 px-3 py-1 text-[11px] font-mono font-bold text-primary-fixed shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <span>👑 Admin</span>
              <span className="opacity-40">•</span>
              <span>App v1.46.8</span>
              <span className="opacity-40">•</span>
              <span>Engine v1.46.8</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="sm:hidden flex items-center gap-1.5 rounded-full border border-primary-container/40 bg-primary-container/15 px-2 py-0.5 text-[10px] font-mono font-bold text-primary-fixed">
              <span>👑</span>
              <span>v1.46.8</span>
            </div>
          )}
          <Link
            to="/upload"
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:text-primary-container md:hidden"
            aria-label="Upload PDF"
          >
            <span className="material-symbols-outlined">upload_file</span>
          </Link>
          <Link
            to="/profile"
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:text-primary-container"
            aria-label="Profile"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </Link>
        </div>
      </nav>

      <div className="pt-20 pb-24 md:ml-64 md:pt-24">{children}</div>

      {/* Studio frame stays mounted so translations keep running across pages */}
      <StudioHost />
      <TranslationProgressPill />

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-white/15 bg-surface-container/80 py-2 backdrop-blur-[24px] md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "text-primary-fixed-dim" }}
            inactiveProps={{ className: "text-on-surface-variant" }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[11px]"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
