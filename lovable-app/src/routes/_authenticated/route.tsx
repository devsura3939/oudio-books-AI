import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { Headphones, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { db } from "@/integrations/external-supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await db.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/library" className="flex items-center gap-2 font-semibold">
            <Headphones className="size-5 text-primary" /> Lumina Audio Studio
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
