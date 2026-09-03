import { useQuery } from "@tanstack/react-query";

import { db } from "@/integrations/external-supabase/client";

/** True when the signed-in user holds the `admin` role (owner account). */
export function useIsAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["is-admin"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: userData } = await db.auth.getUser();
      const user = userData.user;
      if (!user) return false;
      const { data: role } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(role);
    },
  });
  return { isAdmin: data === true, isLoading };
}

/** Authenticated POST to the admin Training Lab API. */
export async function adminApi<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/admin/training", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(json["error"] ?? `Request failed (${res.status})`));
  return json as T;
}
