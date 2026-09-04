import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { db } from "@/integrations/external-supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/studio") || location.pathname.startsWith("/scan")) {
      const { data } = await db.auth.getUser();
      return { user: data?.user ?? null };
    }
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
