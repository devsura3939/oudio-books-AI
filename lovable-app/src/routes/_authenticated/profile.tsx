import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { db } from "@/integrations/external-supabase/client";
import type { Book, Profile } from "@/integrations/external-supabase/types";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Lumina Audio" },
      { name: "description", content: "Manage your Lumina Audio account, plan and listening stats." },
      { property: "og:title", content: "Your profile — Lumina Audio" },
      {
        property: "og:description",
        content: "Manage your Lumina Audio account, plan and listening stats.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<{ profile: Profile | null; email: string | null }> => {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return { profile: null, email: null };
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return { profile: (data as Profile | null) ?? null, email: user.email ?? null };
    },
  });

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await db.from("books").select("*");
      if (error) throw error;
      return (data ?? []) as Book[];
    },
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setDisplayName(profileQuery.data.profile.display_name ?? "");
    }
  }, [profileQuery.data?.profile]);

  const saveName = useMutation({
    mutationFn: async (name: string) => {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await db
        .from("profiles")
        .update({ display_name: name.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const profile = profileQuery.data?.profile ?? null;
  const email = profileQuery.data?.email ?? null;
  const books = booksQuery.data ?? [];
  const chapters = books.reduce((sum, book) => sum + (book.total_chapters ?? 0), 0);
  const initial = (profile?.display_name || email || "L").charAt(0).toUpperCase();

  return (
    <main className="mx-auto max-w-4xl px-5 md:px-10">
      <p className="label-caps text-primary-fixed-dim">Account</p>
      <h1 className="mt-2 text-[32px] leading-10 font-bold tracking-[-0.02em]">Your profile</h1>

      <section className="glass-panel mt-8 rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary-container/15 text-3xl font-bold text-primary-container shadow-[0_0_30px_rgba(0,240,255,0.25)]">
            {initial}
          </span>
          <div className="min-w-48 flex-1">
            <h2 className="text-xl font-semibold">
              {profile?.display_name || "Unnamed listener"}
            </h2>
            <p className="text-sm text-on-surface-variant">{email ?? "—"}</p>
            <span className="label-caps mt-2 inline-block rounded-full bg-primary-container/10 px-3 py-1 text-primary-fixed-dim">
              {profile?.plan ?? "free"} plan
            </span>
          </div>
        </div>

        <div className="mt-8">
          <label htmlFor="displayName" className="label-caps text-on-surface-variant">
            Display name
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How should we greet you?"
              className="input-glass min-w-56 flex-1 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/60"
            />
            <button
              type="button"
              onClick={() => saveName.mutate(displayName)}
              disabled={saveName.isPending}
              className="btn-glow rounded-lg bg-primary-container px-6 py-3 font-bold text-on-primary-container disabled:opacity-60"
            >
              {saveName.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: "library_books", label: "Books", value: String(books.length) },
          { icon: "menu_book", label: "Chapters", value: String(chapters) },
          {
            icon: "calendar_month",
            label: "Member since",
            value: profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })
              : "—",
          },
          { icon: "cloud_done", label: "Storage", value: "Supabase" },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-xl p-5">
            <span className="material-symbols-outlined text-primary-container">{stat.icon}</span>
            <p className="mt-3 text-lg font-bold">{stat.value}</p>
            <p className="label-caps mt-1 text-on-surface-variant">{stat.label}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
