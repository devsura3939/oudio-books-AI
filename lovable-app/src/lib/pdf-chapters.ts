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
  chapters: ParsedChapter[];
}

const MAX_WORDS_PER_PART = 1800;
const SPLIT_THRESHOLD = 2500;
const CHAPTER_RE = /^\s*(chapter|part|book)\s+([0-9]+|[ivxlcdm]+)\b.*$/i;

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
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  let info: Record<string, unknown> = {};
  try {
    const meta = (await doc.getMetadata()) as unknown as { info?: Record<string, unknown> };
    info = meta.info ?? {};
  } catch {
    info = {};
  }


  return {
    pageCount: doc.numPages,
    title: (info["Title"] as string) || null,
    author: (info["Author"] as string) || null,
    chapters: splitIntoChapters(pages),
  };
}

/** Heading-based split with a page-bucket fallback, then long-chapter parting. */
export function splitIntoChapters(pages: string[]): ParsedChapter[] {
  const lines = pages.join("\n").split(/(?<=[.!?])\s+(?=[A-Z])|\n/);
  const found: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;

  for (const line of lines) {
    if (CHAPTER_RE.test(line) && line.trim().length < 90) {
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
