import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { createExternalAdminClient } from "@/integrations/external-supabase/admin.server";

const schema = z.object({
  email: z.string().email(),
});

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/check-email")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },
      POST: async ({ request }) => {
        let input: z.infer<typeof schema>;
        try {
          input = schema.parse(await request.json());
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid email address format", exists: false }),
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const cleanEmail = input.email.trim().toLowerCase();

        try {
          const sb = createExternalAdminClient();

          // 1. Check public.profiles table (fast)
          const { data: profile } = await sb
            .from("profiles")
            .select("id, email")
            .ilike("email", cleanEmail)
            .maybeSingle();

          if (profile && profile.id) {
            return new Response(JSON.stringify({ exists: true, email: cleanEmail }), {
              status: 200,
              headers: CORS_HEADERS,
            });
          }

          // 2. Check auth.users via admin API
          const { data: authData, error: authErr } = await sb.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

          if (!authErr && authData?.users) {
            const match = authData.users.find(
              (u) => (u.email || "").trim().toLowerCase() === cleanEmail
            );
            if (match) {
              return new Response(JSON.stringify({ exists: true, email: cleanEmail }), {
                status: 200,
                headers: CORS_HEADERS,
              });
            }
          }

          return new Response(JSON.stringify({ exists: false, email: cleanEmail }), {
            status: 200,
            headers: CORS_HEADERS,
          });
        } catch (err) {
          console.error("[api/check-email] error:", err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Failed to verify email",
              exists: false,
            }),
            { status: 500, headers: CORS_HEADERS }
          );
        }
      },
    },
  },
});
