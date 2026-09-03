import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { adminApi, useIsAdmin } from "@/lib/use-admin";

export const Route = createFileRoute("/_authenticated/training")({
  head: () => ({
    meta: [
      { title: "Training Lab — EngBot" },
      {
        name: "description",
        content: "Admin-only lab for training the EngBot Georgian and English translation and transcription engine.",
      },
      { property: "og:title", content: "Training Lab — EngBot" },
      { property: "og:description", content: "Train, benchmark and roll back the EngBot language engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingLab,
});

type Language = "ka" | "en";

interface Overview {
  pack: { version: number; items: number; enabled: boolean; counts: Record<string, number> };
  benchmark: { cases: number; score: number; exact: number; failures: { id: string; got: string; expected: string }[] };
  versions: { id: string; version: number; score: number | null; note: string | null; source: string; model: string | null; created_at: string }[];
  keys: { id: string; key_prefix: string; label: string | null; language: string; scope: string; uses: number; last_used_at: string | null; revoked_at: string | null }[];
  sessions: { id: string; driver: string; model: string | null; status: string; iterations: number; accepted: number; start_score: number | null; current_score: number | null; started_at: string; summary: string | null }[];
  cases: { id: string; kind: string; source: string; expected: string; origin: string; note: string | null }[];
}

function TrainingLab() {
  const { isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<Language>("ka");
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, isLoading, navigate]);

  const overview = useQuery({
    queryKey: ["training-overview", language],
    enabled: isAdmin,
    queryFn: () => adminApi<Overview>({ action: "overview", language }),
  });

  const act = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi<Record<string, unknown>>(body),
    onSuccess: (data) => {
      if (typeof data["key"] === "string") setNewKey(data["key"]);
      void queryClient.invalidateQueries({ queryKey: ["training-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const run = useMutation({
    mutationFn: (iterations: number) => adminApi<{ log: unknown[]; score: number }>({ action: "run", language, iterations }),
    onSuccess: (data) => {
      toast.success(`Training run finished — benchmark score ${data.score}`);
      void queryClient.invalidateQueries({ queryKey: ["training-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [caseSource, setCaseSource] = useState("");
  const [caseExpected, setCaseExpected] = useState("");
  const [caseKind, setCaseKind] = useState<"translate" | "transcribe">("translate");
  const [keyLabel, setKeyLabel] = useState("");
  const [keyScope, setKeyScope] = useState<"translate" | "transcribe" | "both">("both");

  if (isLoading || !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary-container" />
      </div>
    );
  }

  const data = overview.data;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 md:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-primary-fixed-dim">Admin</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Training Lab</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Teach the EngBot engine. Training only adds data-only rules on top of the built-in engine —
            never code, schema or infrastructure.
          </p>
        </div>
        <div className="flex gap-2">
          {(["ka", "en"] as Language[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                language === code
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-white/5 text-on-surface-variant hover:bg-white/10"
              }`}
            >
              {code === "ka" ? "ქართული (Georgian)" : "English"}
            </button>
          ))}
        </div>
      </header>

      {overview.isLoading ? (
        <Loader2 className="size-5 animate-spin text-primary-container" />
      ) : !data ? (
        <p className="text-sm text-on-surface-variant">Could not load the lab.</p>
      ) : (
        <div className="space-y-6">
          {/* Status */}
          <section className="glass-panel grid gap-4 rounded-xl p-6 sm:grid-cols-4">
            <Stat label="Pack version" value={`v${data.pack.version}`} />
            <Stat label="Trained rules" value={String(data.pack.items)} />
            <Stat label="Benchmark score" value={`${data.benchmark.score}`} />
            <Stat label="Exact matches" value={`${data.benchmark.exact}/${data.benchmark.cases}`} />
            <div className="sm:col-span-4 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
              {Object.entries(data.pack.counts).map(([type, count]) => (
                <span key={type} className="rounded-full bg-white/5 px-3 py-1">
                  {type}: {count}
                </span>
              ))}
              <button
                type="button"
                onClick={() => act.mutate({ action: "set_enabled", language, enabled: !data.pack.enabled })}
                className="ml-auto rounded-full bg-white/5 px-3 py-1 hover:bg-white/10"
              >
                {data.pack.enabled ? "Pack active — click to disable" : "Pack disabled — click to enable"}
              </button>
            </div>
          </section>

          {/* Run training in-app */}
          <section className="glass-panel rounded-xl p-6">
            <h2 className="mb-2 text-lg font-semibold">Train now</h2>
            <p className="mb-4 text-sm text-on-surface-variant">
              Runs the strongest available model against the failing benchmark cases. Each iteration is
              validated and benchmarked; only strict improvements with zero regressions are published.
            </p>
            <div className="flex flex-wrap gap-3">
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={run.isPending}
                  onClick={() => run.mutate(n)}
                  className="btn-glow rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container disabled:opacity-60"
                >
                  {run.isPending ? <Loader2 className="inline size-4 animate-spin" /> : `Run ${n} iteration${n > 1 ? "s" : ""}`}
                </button>
              ))}
            </div>
            {run.data ? (
              <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-black/30 p-4 text-xs text-on-surface-variant">
                {JSON.stringify(run.data.log, null, 2)}
              </pre>
            ) : null}
          </section>

          {/* Keys */}
          <section className="glass-panel rounded-xl p-6">
            <h2 className="mb-2 text-lg font-semibold">Training keys (external LLMs)</h2>
            <p className="mb-4 text-sm text-on-surface-variant">
              A key lets any external model train this engine through{" "}
              <code className="text-primary-fixed-dim">POST /api/public/train/session · /context · /propose · /finish</code>.
              Keys are hashed, scoped to one language and task, and revocable.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                value={keyLabel}
                onChange={(e) => setKeyLabel(e.target.value)}
                placeholder="Label (e.g. Claude · Georgian glossary)"
                className="input-glass min-w-[16rem] flex-1 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={keyScope}
                onChange={(e) => setKeyScope(e.target.value as typeof keyScope)}
                className="input-glass rounded-lg px-3 py-2 text-sm"
              >
                <option value="both">translate + transcribe</option>
                <option value="translate">translate</option>
                <option value="transcribe">transcribe</option>
              </select>
              <button
                type="button"
                onClick={() => act.mutate({ action: "create_key", language, scope: keyScope, label: keyLabel || undefined })}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Generate key
              </button>
            </div>
            {newKey ? (
              <div className="mb-4 rounded-lg border border-primary-container/40 bg-primary-container/10 p-3 text-sm">
                <p className="mb-1 font-semibold">Copy this key now — it is shown only once.</p>
                <code className="break-all text-primary-fixed-dim">{newKey}</code>
              </div>
            ) : null}
            <div className="space-y-2 text-sm">
              {data.keys.map((key) => (
                <div key={key.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <code className="text-primary-fixed-dim">{key.key_prefix}…</code>
                  <span>{key.label ?? "—"}</span>
                  <span className="text-on-surface-variant">
                    {key.language} · {key.scope} · {key.uses} uses
                  </span>
                  {key.revoked_at ? (
                    <span className="ml-auto text-red-300">revoked</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => act.mutate({ action: "revoke_key", id: key.id })}
                      className="ml-auto rounded-full bg-white/5 px-3 py-1 hover:bg-white/10"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
              {!data.keys.length ? <p className="text-on-surface-variant">No keys yet.</p> : null}
            </div>
          </section>

          {/* Benchmark */}
          <section className="glass-panel rounded-xl p-6">
            <h2 className="mb-2 text-lg font-semibold">Benchmark ({data.benchmark.cases} cases)</h2>
            <p className="mb-4 text-sm text-on-surface-variant">
              Every case is “raw engine output → the correct text”. Training is measured only against these,
              so quality can never silently regress.
            </p>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <textarea
                value={caseSource}
                onChange={(e) => setCaseSource(e.target.value)}
                placeholder="Bad / raw text"
                className="input-glass min-h-24 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={caseExpected}
                onChange={(e) => setCaseExpected(e.target.value)}
                placeholder="Correct text"
                className="input-glass min-h-24 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <select
                value={caseKind}
                onChange={(e) => setCaseKind(e.target.value as typeof caseKind)}
                className="input-glass rounded-lg px-3 py-2 text-sm"
              >
                <option value="translate">translate</option>
                <option value="transcribe">transcribe (OCR)</option>
              </select>
              <button
                type="button"
                disabled={!caseSource.trim() || !caseExpected.trim()}
                onClick={() => {
                  act.mutate({
                    action: "add_cases",
                    language,
                    cases: [{ kind: caseKind, source: caseSource, expected: caseExpected }],
                  });
                  setCaseSource("");
                  setCaseExpected("");
                }}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
              >
                Add case
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {data.cases.slice(0, 40).map((row) => (
                <div key={row.id} className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span>{row.kind}</span>
                    <span>· {row.origin}</span>
                    <button
                      type="button"
                      onClick={() => act.mutate({ action: "delete_case", id: row.id })}
                      className="ml-auto hover:text-red-300"
                    >
                      delete
                    </button>
                  </div>
                  <p className="mt-1 text-on-surface-variant line-clamp-2">{row.source}</p>
                  <p className="text-on-surface line-clamp-2">→ {row.expected}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Versions / rollback */}
          <section className="glass-panel rounded-xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Versions & rollback</h2>
            <div className="space-y-2 text-sm">
              {data.versions.map((version) => (
                <div key={version.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <span className="font-semibold">v{version.version}</span>
                  <span className="text-on-surface-variant">score {version.score ?? "—"}</span>
                  <span className="text-on-surface-variant">{version.source}</span>
                  <span className="text-xs text-on-surface-variant">{version.note ?? ""}</span>
                  <button
                    type="button"
                    onClick={() => act.mutate({ action: "rewind", language, version_id: version.id })}
                    className="ml-auto rounded-full bg-white/5 px-3 py-1 hover:bg-white/10"
                  >
                    Rewind to this
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* History */}
          <section className="glass-panel rounded-xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Training history</h2>
            <div className="space-y-2 text-sm">
              {data.sessions.map((session) => (
                <div key={session.id} className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">{session.driver}</span>
                    <span className="text-on-surface-variant">{session.model ?? "—"}</span>
                    <span className="text-on-surface-variant">{session.status}</span>
                    <span className="text-on-surface-variant">
                      {session.iterations} iterations · {session.accepted} accepted
                    </span>
                    <span className="ml-auto text-xs text-on-surface-variant">
                      {session.start_score ?? "—"} → {session.current_score ?? "—"}
                    </span>
                  </div>
                  {session.summary ? <p className="mt-1 text-xs text-on-surface-variant">{session.summary}</p> : null}
                </div>
              ))}
              {!data.sessions.length ? <p className="text-on-surface-variant">No training runs yet.</p> : null}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps text-on-surface-variant">{label}</p>
      <p className="text-2xl font-bold text-primary-fixed">{value}</p>
    </div>
  );
}
