/**
 * EngBot trainable engine — "rule pack" layer.
 *
 * The built-in engine (public/studio/static/georgian-linguistics.js v1.45.0 and the
 * OCR/translation prompts) is never modified by training. Training only produces a
 * *pack*: a list of small, typed, data-only rules that are layered on top of the
 * built-in engine at runtime.
 *
 * Nothing in a pack is executable code. The five item types below are the whole
 * surface an LLM can touch, which is what makes autonomous training safe.
 */

export type PackItemType = "glossary" | "autofix" | "qa_rule" | "prompt_block" | "ocr_fix";

export interface PackItem {
  id: string;
  type: PackItemType;
  language: string;
  /** glossary/ocr_fix: literal source phrase. autofix/qa_rule: regex source. */
  pattern: string;
  /** glossary/autofix/ocr_fix: replacement. qa_rule: warning message. */
  replacement: string;
  note?: string | undefined;
  severity?: "info" | "warn" | "error" | undefined;
  /** prompt_block: extra guidance appended to the language prompt. */
  text?: string | undefined;
  created_at?: string | undefined;
  session_id?: string | null | undefined;
  model?: string | null | undefined;
}

export const PACK_LIMITS = {
  maxItems: 4000,
  maxPatternLength: 240,
  maxReplacementLength: 400,
  maxPromptBlockLength: 4000,
  maxPromptBlocks: 60,
  maxItemsPerProposal: 40,
  maxTextForRules: 200_000,
};

const ALLOWED_LANGUAGES = new Set(["ka", "en"]);

/** Regex sources that are cheap to reject and expensive to run. */
function regexIsRisky(source: string): string | null {
  if (/\((?:[^()]*[+*])\)\s*[+*]/.test(source)) return "nested unbounded quantifier";
  if (/\{\s*\d{3,}\s*,?\s*\d*\s*\}/.test(source)) return "quantifier bound too large";
  if (/(\.\*){2,}/.test(source)) return "multiple .* wildcards";
  if (/\\[0-9]/.test(source)) return "backreferences are not allowed";
  if (source.includes("(?<")) return "lookbehind is not allowed";
  return null;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/** Validate a single proposed pack item. Rejects anything unusual by default. */
export function validateItem(raw: unknown, language: string): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "item must be an object" };
  const item = raw as Record<string, unknown>;
  const type = String(item["type"] ?? "");
  if (!["glossary", "autofix", "qa_rule", "prompt_block", "ocr_fix"].includes(type)) {
    return { ok: false, reason: `unsupported item type "${type}"` };
  }
  if (!ALLOWED_LANGUAGES.has(language)) return { ok: false, reason: `unsupported language "${language}"` };

  if (type === "prompt_block") {
    const text = String(item["text"] ?? item["replacement"] ?? "").trim();
    if (text.length < 8) return { ok: false, reason: "prompt_block text is too short" };
    if (text.length > PACK_LIMITS.maxPromptBlockLength) return { ok: false, reason: "prompt_block text is too long" };
    if (/<script|javascript:|function\s*\(|=>|process\.env|import\s|require\(/i.test(text)) {
      return { ok: false, reason: "prompt_block may not contain code" };
    }
    return { ok: true };
  }

  const pattern = String(item["pattern"] ?? "").trim();
  const replacement = String(item["replacement"] ?? "");
  if (!pattern) return { ok: false, reason: "pattern is required" };
  if (pattern.length > PACK_LIMITS.maxPatternLength) return { ok: false, reason: "pattern is too long" };
  if (replacement.length > PACK_LIMITS.maxReplacementLength) return { ok: false, reason: "replacement is too long" };

  if (type === "qa_rule" && replacement.trim().length < 3) {
    return { ok: false, reason: "qa_rule needs a warning message in `replacement`" };
  }
  if ((type === "glossary" || type === "ocr_fix") && !replacement.trim()) {
    return { ok: false, reason: "replacement is required" };
  }

  if (type === "autofix" || type === "qa_rule") {
    const risk = regexIsRisky(pattern);
    if (risk) return { ok: false, reason: `unsafe pattern: ${risk}` };
    try {
      new RegExp(pattern, "gu");
    } catch {
      try {
        new RegExp(pattern, "g");
      } catch (error) {
        return { ok: false, reason: `invalid regex: ${(error as Error).message}` };
      }
    }
  }
  return { ok: true };
}

export function normaliseItem(raw: Record<string, unknown>, language: string, meta: { session_id?: string | null; model?: string | null } = {}): PackItem {
  const type = String(raw["type"]) as PackItemType;
  return {
    id: crypto.randomUUID(),
    type,
    language,
    pattern: String(raw["pattern"] ?? "").trim(),
    replacement: String(raw["replacement"] ?? "").trim(),
    text: type === "prompt_block" ? String(raw["text"] ?? raw["replacement"] ?? "").trim() : undefined,
    note: raw["note"] ? String(raw["note"]).slice(0, 400) : undefined,
    severity: raw["severity"] === "error" || raw["severity"] === "info" ? (raw["severity"] as "error" | "info") : "warn",
    created_at: new Date().toISOString(),
    session_id: meta.session_id ?? null,
    model: meta.model ?? null,
  };
}

function safeRegex(source: string): RegExp | null {
  try {
    return new RegExp(source, "gu");
  } catch {
    try {
      return new RegExp(source, "g");
    } catch {
      return null;
    }
  }
}

function escapeLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply a pack's deterministic rules to text. `kind` selects which item types run:
 * translation post-editing (glossary + autofix) or OCR/transcription (ocr_fix + autofix).
 */
export function applyPack(text: string, items: PackItem[], kind: "translate" | "transcribe" = "translate"): string {
  if (!text || !items.length) return text;
  if (text.length > PACK_LIMITS.maxTextForRules) return text;
  let out = text;

  const literal = items.filter((i) => (kind === "transcribe" ? i.type === "ocr_fix" : i.type === "glossary"));
  for (const item of literal) {
    const re = safeRegex(`(?<![\\p{L}\\p{N}])${escapeLiteral(item.pattern)}(?![\\p{L}\\p{N}])`) ?? safeRegex(escapeLiteral(item.pattern));
    if (re) out = out.replace(re, item.replacement);
  }
  for (const item of items.filter((i) => i.type === "autofix")) {
    const re = safeRegex(item.pattern);
    if (re) out = out.replace(re, item.replacement);
  }
  return out;
}

export interface QaFinding {
  itemId: string;
  message: string;
  severity: string;
  match: string;
}

export function runQaRules(text: string, items: PackItem[]): QaFinding[] {
  const findings: QaFinding[] = [];
  if (!text || text.length > PACK_LIMITS.maxTextForRules) return findings;
  for (const item of items.filter((i) => i.type === "qa_rule")) {
    const re = safeRegex(item.pattern);
    if (!re) continue;
    const match = re.exec(text);
    if (match) {
      findings.push({
        itemId: item.id,
        message: item.replacement,
        severity: item.severity ?? "warn",
        match: match[0].slice(0, 80),
      });
    }
  }
  return findings;
}

export function promptAddendum(items: PackItem[]): string {
  const blocks = items.filter((i) => i.type === "prompt_block" && i.text).map((i) => i.text!.trim());
  const glossary = items.filter((i) => i.type === "glossary");
  const parts: string[] = [];
  if (glossary.length) {
    parts.push(
      "TRAINED GLOSSARY (always prefer these renderings):\n" +
        glossary.slice(0, 800).map((g) => `- ${g.pattern} → ${g.replacement}${g.note ? ` (${g.note})` : ""}`).join("\n"),
    );
  }
  if (blocks.length) parts.push("TRAINED GUIDANCE:\n" + blocks.slice(0, PACK_LIMITS.maxPromptBlocks).join("\n\n"));
  return parts.join("\n\n");
}

// ── Evaluation ──────────────────────────────────────────────────────────────
export interface BenchmarkCase {
  id: string;
  language: string;
  kind: "translate" | "transcribe";
  source: string;
  expected: string;
  weight: number;
}

export interface EvalResult {
  score: number; // 0..100
  passed: number;
  total: number;
  failures: { id: string; got: string; expected: string }[];
  qaFalsePositives: number;
}

function normalise(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Character-level similarity (0..1) — cheap, deterministic, no model needed. */
function similarity(a: string, b: string) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const max = Math.max(a.length, b.length);
  let same = 0;
  const bChars = new Map<string, number>();
  for (const ch of b) bChars.set(ch, (bChars.get(ch) ?? 0) + 1);
  for (const ch of a) {
    const left = bChars.get(ch) ?? 0;
    if (left > 0) {
      same += 1;
      bChars.set(ch, left - 1);
    }
  }
  const bag = same / max;
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  return Math.min(1, bag * 0.7 + (prefix / max) * 0.3);
}

/** Replay the whole benchmark with a pack applied. Pure, deterministic, no LLM. */
export function evaluatePack(items: PackItem[], cases: BenchmarkCase[]): EvalResult {
  let weighted = 0;
  let weight = 0;
  let passed = 0;
  const failures: EvalResult["failures"] = [];

  for (const testCase of cases) {
    const got = normalise(applyPack(testCase.source, items, testCase.kind));
    const expected = normalise(testCase.expected);
    const sim = similarity(got, expected);
    const w = testCase.weight || 1;
    weighted += sim * w;
    weight += w;
    if (got === expected) passed += 1;
    else failures.push({ id: testCase.id, got: got.slice(0, 300), expected: expected.slice(0, 300) });
  }

  // A QA rule that fires on a known-good expected output is a false positive.
  let qaFalsePositives = 0;
  for (const testCase of cases) {
    qaFalsePositives += runQaRules(testCase.expected, items).length;
  }

  const base = weight ? (weighted / weight) * 100 : 0;
  const penalty = Math.min(20, qaFalsePositives * 2);
  return {
    score: Math.max(0, Number((base - penalty).toFixed(3))),
    passed,
    total: cases.length,
    failures: failures.slice(0, 25),
    qaFalsePositives,
  };
}

/** Was the candidate an improvement with no regression? */
export function isImprovement(before: EvalResult, after: EvalResult): { ok: boolean; reason: string } {
  if (after.qaFalsePositives > before.qaFalsePositives) {
    return { ok: false, reason: "rejected: a QA rule fires on known-good text (false positive)" };
  }
  if (after.passed < before.passed) {
    return { ok: false, reason: `rejected: ${before.passed - after.passed} benchmark case(s) that passed now fail` };
  }
  if (after.score < before.score - 0.0001) {
    return { ok: false, reason: `rejected: benchmark score dropped (${before.score} → ${after.score})` };
  }
  if (after.score <= before.score + 0.0001 && after.passed === before.passed) {
    return { ok: false, reason: "rejected: no measurable improvement on the benchmark" };
  }
  return { ok: true, reason: `accepted: score ${before.score} → ${after.score}, ${before.passed}/${before.total} → ${after.passed}/${after.total} exact` };
}
