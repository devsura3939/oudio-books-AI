import { useState } from "react";
import {
  BookOpen,
  Cpu,
  Layers,
  Terminal,
  Copy,
  Check,
  FileText,
  Sparkles,
  AlertTriangle,
  Code,
  Download,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import {
  ENGINE_ARCHITECTURE_AND_TRAINING_GUIDE_MD,
  TRAINING_CORPORA,
  ARCHITECTURE_TIERS,
  RULE_TEMPLATES,
} from "@/lib/training-guide";

type GuideTab = "architecture" | "corpora" | "training_loop" | "rules" | "raw_md";

export function EngineArchitectureGuide() {
  const [activeTab, setActiveTab] = useState<GuideTab>("architecture");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<keyof typeof RULE_TEMPLATES>("glossary");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const downloadGuideMd = () => {
    const blob = new Blob([ENGINE_ARCHITECTURE_AND_TRAINING_GUIDE_MD], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "EngBot_Engine_Architecture_and_LLM_Training_Guide.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded Training Guide Markdown");
  };

  return (
    <section className="glass-panel rounded-xl p-6 transition-all border border-white/10 bg-surface-container-low/40">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-container/20 p-2 text-primary-fixed">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-on-surface">
              Engine Architecture & Autonomous Training Guide
            </h2>
            <p className="text-xs text-on-surface-variant">
              Full documentation on engine corpora, 3-tier hybrid pipeline, and autonomous training protocol for LLMs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/public/train/guide"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-colors"
          >
            <ExternalLink className="size-3.5" />
            API Markdown Guide
          </a>
          <button
            type="button"
            onClick={downloadGuideMd}
            className="flex items-center gap-1.5 rounded-lg bg-primary-container/20 px-3 py-1.5 text-xs font-semibold text-primary-fixed hover:bg-primary-container/30 transition-colors"
          >
            <Download className="size-3.5" />
            Download .md
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-white/5 pb-3">
        {[
          { id: "architecture", label: "3-Tier Architecture", icon: Layers },
          { id: "corpora", label: "What It's Trained On", icon: BookOpen },
          { id: "training_loop", label: "LLM Training Protocol", icon: Terminal },
          { id: "rules", label: "Rule Item Formats", icon: Code },
          { id: "raw_md", label: "Raw Markdown Guide", icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as GuideTab)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === id
                ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                : "bg-white/5 text-on-surface-variant hover:bg-white/10 hover:text-on-surface"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: 3-Tier Architecture */}
      {activeTab === "architecture" && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            The EngBot engine bridges generative fluency with rigorous linguistic determinism using a{" "}
            <strong className="text-on-surface">3-Tier Hybrid Architecture</strong>. The neural core produces natural literary flow,
            the deterministic layer enforces 100% mathematical and grammatical precision, and the trainable rule pack applies hot-swappable
            calibrations without changing a single line of backend code.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {ARCHITECTURE_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-hover hover:border-white/15"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-primary-container/20 px-2 py-0.5 text-[11px] font-bold text-primary-fixed">
                    {tier.tier}
                  </span>
                  <Cpu className="size-4 text-on-surface-variant" />
                </div>
                <h3 className="mt-2 text-sm font-semibold text-on-surface">{tier.name}</h3>
                <p className="mt-0.5 font-mono text-[11px] text-primary-fixed-dim">{tier.tech}</p>
                <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">{tier.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs text-on-surface-variant overflow-x-auto">
            <div className="text-primary-fixed-dim font-bold mb-1"># High-Speed Pipeline Flow:</div>
            <div>[ Raw Text / Audio / Scanned Book ]</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;│</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
            <div>┌── Tier A: Frontier LLM Core (Gemini 2.5 Pro / Flash, Claude, GPT-4o with Systemic Prompts)</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;│</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
            <div>├── Tier B: Deterministic Linguistic Engine (8,400+ lines Python: vigesimal numbers, cases, pauses)</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;│</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
            <div>└── Tier C: Versioned Autonomous Rule Pack (Trainable layer: glossary, autofix, QA, OCR repairs)</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;│</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
            <div>[ Studio-Quality Audiobook Audio / High-Fidelity Translated Publication ]</div>
          </div>
        </div>
      )}

      {/* Tab 2: Corpora & Training Data */}
      {activeTab === "corpora" && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            EngBot is grounded in specialized literary, morphosyntactic, and computer vision corpora designed to
            deliver flawless translation and natural, human-sounding Georgian narration.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {TRAINING_CORPORA.map((corpus) => (
              <div
                key={corpus.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between"
              >
                <div>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-primary-fixed-dim">
                    {corpus.badge}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-on-surface">{corpus.title}</h3>
                  <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">{corpus.description}</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
                    {corpus.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="size-3.5 shrink-0 text-primary-fixed mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: LLM Training Protocol */}
      {activeTab === "training_loop" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Critical Safety Directive for Training Models
                </h4>
                <p className="mt-1 text-xs text-amber-200/90 leading-relaxed">
                  <strong>NEVER USE ASCII <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">\b</code> NEXT TO GEORGIAN CHARACTERS!</strong>
                  <br />
                  In standard regex engines, <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">\b</code> only considers ASCII <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">[a-zA-Z0-9_]</code> as word characters.
                  Because Georgian Unicode (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">\u10A0-\u10FF</code>) is outside ASCII, <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">\b</code> fails silently.
                  <br />
                  <strong>Always use:</strong>{" "}
                  <code className="bg-black/60 px-1.5 py-0.5 rounded text-primary-fixed font-mono">
                    (?&lt;![\\w\\u10A0-\\u10FF])word(?![\\w\\u10A0-\\u10FF])
                  </code>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { step: "1. /session", title: "Open Session", desc: "POST key to receive session ID and baseline benchmark score." },
              { step: "2. /context", title: "Inspect Errors", desc: "Fetch active pack rules and failing benchmark test cases." },
              { step: "3. Diagnose", title: "Formulate Rules", desc: "Select safe rule type: glossary, autofix, qa_rule, prompt_block, ocr_fix." },
              { step: "4. /propose", title: "Auto-Benchmark", desc: "Server replays test suite. Auto-promoted if score improves with 0 regressions!" },
              { step: "5. /finish", title: "Close & Record", desc: "Record session summary and commit performance analytics." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                <span className="font-mono font-bold text-primary-fixed">{s.step}</span>
                <h4 className="mt-1 font-semibold text-on-surface">{s.title}</h4>
                <p className="mt-1 text-on-surface-variant text-[11px] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Copyable Quickstart Command */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <Terminal className="size-3.5 text-primary-fixed" />
                Quickstart Training Propose Command
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `curl -X POST https://your-domain.com/api/public/train/propose \\\n  -H "Content-Type: application/json" \\\n  -H "X-Training-Key: engbot_tk_dev_training_key_ka_2026" \\\n  -d '{\n    "session_id": "<SESSION_ID>",\n    "items": [\n      {\n        "type": "glossary",\n        "pattern": "vital importance",\n        "replacement": "სასიცოცხლო მნიშვნელობა",\n        "note": "Calibrate classical vocabulary"\n      }\n    ],\n    "model": "gpt-4o"\n  }'`,
                    "curl command"
                  )
                }
                className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[11px] text-on-surface-variant hover:bg-white/10 hover:text-on-surface"
              >
                {copiedType === "curl command" ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                {copiedType === "curl command" ? "Copied" : "Copy cURL"}
              </button>
            </div>
            <pre className="font-mono text-xs text-on-surface-variant overflow-x-auto p-2 bg-black/60 rounded-lg">
{`curl -X POST https://your-domain.com/api/public/train/propose \\
  -H "Content-Type: application/json" \\
  -H "X-Training-Key: engbot_tk_dev_training_key_ka_2026" \\
  -d '{
    "session_id": "<SESSION_ID>",
    "items": [
      {
        "type": "glossary",
        "pattern": "vital importance",
        "replacement": "სასიცოცხლო მნიშვნელობა",
        "note": "Calibrate classical vocabulary"
      }
    ],
    "model": "gpt-4o"
  }'`}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 4: Rule Item Formats */}
      {activeTab === "rules" && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            The training engine is strictly non-executable. Proposals only accept 5 data-only item types:
          </p>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(RULE_TEMPLATES) as Array<keyof typeof RULE_TEMPLATES>).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedRule(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${
                  selectedRule === t
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "bg-white/5 text-on-surface-variant hover:bg-white/10"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-primary-fixed">{selectedRule} template</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(JSON.stringify(RULE_TEMPLATES[selectedRule], null, 2), `${selectedRule} JSON`)
                }
                className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[11px] text-on-surface-variant hover:bg-white/10"
              >
                {copiedType === `${selectedRule} JSON` ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                {copiedType === `${selectedRule} JSON` ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <pre className="font-mono text-xs text-on-surface-variant overflow-x-auto p-3 bg-black/60 rounded-lg">
              {JSON.stringify(RULE_TEMPLATES[selectedRule], null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 5: Raw Markdown Guide */}
      {activeTab === "raw_md" && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface">
              Complete LLM Training Guide Markdown
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(ENGINE_ARCHITECTURE_AND_TRAINING_GUIDE_MD, "Complete Guide Markdown")}
              className="flex items-center gap-1 rounded bg-white/5 px-2.5 py-1 text-xs text-on-surface-variant hover:bg-white/10"
            >
              {copiedType === "Complete Guide Markdown" ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
              {copiedType === "Complete Guide Markdown" ? "Copied" : "Copy Markdown"}
            </button>
          </div>
          <pre className="font-mono text-xs text-on-surface-variant max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-white/5 bg-black/50 p-4 leading-relaxed">
            {ENGINE_ARCHITECTURE_AND_TRAINING_GUIDE_MD}
          </pre>
        </div>
      )}
    </section>
  );
}
