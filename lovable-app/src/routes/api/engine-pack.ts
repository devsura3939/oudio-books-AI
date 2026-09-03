import { createFileRoute } from "@tanstack/react-router";

import { promptAddendum } from "@/lib/engine-pack";
import { jsonResponse, loadActivePack } from "@/lib/training.server";

/**
 * Read-only endpoint the studio (and the scanner) calls to layer the trained rule
 * pack on top of the built-in engine. Data only — the built-in engine stays
 * authoritative; the pack is post-editing rules plus prompt guidance.
 */
export const Route = createFileRoute("/api/engine-pack")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const language = new URL(request.url).searchParams.get("language") ?? "ka";
        if (!["ka", "en"].includes(language)) return jsonResponse({ error: "unsupported language" }, 400);
        try {
          const pack = await loadActivePack(language);
          if (!pack.enabled) {
            return jsonResponse({ language, version: pack.version, items: [], prompt: "", enabled: false });
          }
          return jsonResponse({
            language,
            version: pack.version,
            score: pack.score,
            enabled: true,
            items: pack.items,
            prompt: promptAddendum(pack.items),
          });
        } catch (error) {
          console.error("[engine-pack]", error);
          return jsonResponse({ language, version: 0, items: [], prompt: "", enabled: false });
        }
      },
    },
  },
});
