// Browser-only PDF text extraction + chapter splitting.
// pdfjs is imported dynamically so it never evaluates during SSR.

export interface ParsedChapter {
  title: string;
  text: string;
  wordCount: number;
}

export interface ParsedBook {
  pageCount: number;
  title: string | null;
  author: string | null;
  /** JPEG data URL of the detected cover page, when the PDF has one. */
  coverImage: string | null;
  coverPage: number | null;
  chapters: ParsedChapter[];
}

const MAX_WORDS_PER_PART = 1800;
const SPLIT_THRESHOLD = 2500;
const CHAPTER_RE = /^\s*(chapter|part|book|section|volume)\s+([0-9]{1,3}|[ivxlcdm]{1,7})\b.*$/i;
const NAMED_SECTION_RE =
  /^\s*(prologue|epilogue|introduction|preface|foreword|afterword|appendix|conclusion|contents|table of contents|dedication|acknowledg(?:e)?ments?|about the author)\b.*$/i;
const KA_SECTION_RE = /^\s*(თავი|ნაწილი|წიგნი|შესავალი|წინასიტყვაობა|დასკვნა|დანართი|სარჩევი|პროლოგი|ეპილოგი)\b.*$/;

function isHeading(line: string) {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  return CHAPTER_RE.test(t) || NAMED_SECTION_RE.test(t) || KA_SECTION_RE.test(t);
}

/** A sparse page of short display lines at the very front is the cover. */
function isCoverPage(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const count = words(text);
  if (!lines.length || count > 120) return false;
  if (lines.some(isHeading)) return false;
  return lines.length <= 12 && !lines.some((l) => l.length > 90);
}

function detectTitleAuthor(text: string): { title: string | null; author: string | null } {
  const lines = text
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter((l) => l.length > 1 && l.length < 90 && !/^\d+$/.test(l));
  if (!lines.length) return { title: null, author: null };

  const byIdx = lines.findIndex((l) => /^(by|written by)\s+/i.test(l));
  let author = byIdx >= 0 ? (lines[byIdx] ?? "").replace(/^(by|written by)\s+/i, "").trim() : null;
  const candidates = lines.filter((l, i) => i !== byIdx && !/^(a novel|novel)$/i.test(l));
  const title = [...candidates.slice(0, 6)].sort((a, b) => b.length - a.length)[0] ?? null;

  if (!author && title) {
    const next = candidates[candidates.indexOf(title) + 1];
    if (next && next.length <= 40 && /^[A-Z]/.test(next) && next.split(" ").length <= 5) author = next;
  }
  return {
    title: title ? title.replace(/[.,:;]+$/, "") : null,
    author: author ? author.replace(/[.,:;]+$/, "") : null,
  };
}

function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function parsePdf(file: File): Promise<ParsedBook> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(pageLines(content.items as PdfTextItem[]));
  }

  let info: Record<string, unknown> = {};
  try {
    const meta = (await doc.getMetadata()) as unknown as { info?: Record<string, unknown> };
    info = meta.info ?? {};
  } catch {
    info = {};
  }


  const coverPage = pages.findIndex(isCoverPage) >= 0 && pages.findIndex(isCoverPage) < 2
    ? pages.findIndex(isCoverPage) + 1
    : null;
  const detected = detectTitleAuthor(pages[(coverPage ?? 1) - 1] ?? "");
  const coverImage = await renderPageAsImage(doc, coverPage ?? 1);
  const body = coverPage ? pages.filter((_, i) => i !== coverPage - 1) : pages;

  return {
    pageCount: doc.numPages,
    title: usableMeta(info["Title"]) ?? detected.title,
    author: usableMeta(info["Author"]) ?? detected.author,
    coverImage,
    coverPage,
    chapters: splitIntoChapters(body),
  };
}

/** Producer tools stamp junk metadata ("(anonymous)", "untitled"); ignore it. */
function usableMeta(value: unknown): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  if (t.length < 2) return null;
  return /^\(?(anonymous|unknown|untitled|none|n\/a|microsoft word.*)\)?$/i.test(t) ? null : t;
}

interface PdfTextItem {
  str?: string;
  transform?: number[];
}

/** Rebuild visual lines from pdf.js text items so headings stay detectable. */
function pageLines(items: PdfTextItem[]): string {
  const rows: { y: number; parts: string[] }[] = [];
  for (const item of items) {
    if (typeof item?.str !== "string") continue;
    const y = Math.round(item.transform?.[5] ?? 0);
    const row = rows.find((r) => Math.abs(r.y - y) <= 3);
    if (row) row.parts.push(item.str);
    else rows.push({ y, parts: [item.str] });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => r.parts.join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Renders one PDF page to a compact JPEG data URL for use as the book cover. */
async function renderPageAsImage(
  doc: { numPages: number; getPage: (n: number) => Promise<unknown> },
  pageNumber: number,
): Promise<string | null> {
  try {
    const page = (await doc.getPage(Math.max(1, Math.min(pageNumber, doc.numPages)))) as {
      getViewport: (o: { scale: number }) => { width: number; height: number };
      render: (o: unknown) => { promise: Promise<void> };
    };
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, 500 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return null;
  }
}

/** Heading-based split with a page-bucket fallback, then long-chapter parting. */
export function splitIntoChapters(pages: string[]): ParsedChapter[] {
  const lines = pages.join("\n").split("\n");
  const found: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;

  for (const line of lines) {
    if (isHeading(line)) {
      if (current && current.text.trim()) found.push(current);
      current = { title: line.trim(), text: "", wordCount: 0 };
      continue;
    }
    if (!current) current = { title: "Opening", text: "", wordCount: 0 };
    current.text += (current.text ? " " : "") + line.trim();
  }
  if (current && current.text.trim()) found.push(current);

  const chapters =
    found.length > 1
      ? found
      : bucketByPages(pages);

  return chapters.flatMap(splitLongChapter).map((c) => ({ ...c, wordCount: words(c.text) }));
}

function bucketByPages(pages: string[]): ParsedChapter[] {
  const perBucket = 10;
  const out: ParsedChapter[] = [];
  for (let i = 0; i < pages.length; i += perBucket) {
    const text = pages.slice(i, i + perBucket).join(" ").trim();
    if (!text) continue;
    out.push({
      title: `Pages ${i + 1}–${Math.min(i + perBucket, pages.length)}`,
      text,
      wordCount: words(text),
    });
  }
  return out;
}

function splitLongChapter(chapter: ParsedChapter): ParsedChapter[] {
  const all = chapter.text.trim().split(/\s+/).filter(Boolean);
  if (all.length <= SPLIT_THRESHOLD) return [chapter];
  const parts: ParsedChapter[] = [];
  for (let i = 0, p = 1; i < all.length; i += MAX_WORDS_PER_PART, p++) {
    const slice = all.slice(i, i + MAX_WORDS_PER_PART);
    parts.push({
      title: `${chapter.title} (part ${p})`,
      text: slice.join(" "),
      wordCount: slice.length,
    });
  }
  return parts;
}
