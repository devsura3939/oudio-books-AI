import "../../../static/book-structure.js";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface ParsedChapter { title: string; text: string; wordCount: number; firstPage: number; lastPage: number; }
export interface ParsedBook {
  pageCount: number; title: string | null; author: string | null;
  coverImage: string | null; coverPage: number | null; chapters: ParsedChapter[]; language: "en" | "ka";
}
interface Section { title: string; text: string; word_count: number; firstPage: number; lastPage: number; }
interface Outline { page: number; title: string; depth: number; }
const engine = (globalThis as unknown as { EngbotBookStructure: {
  pageLines(content: unknown): string; outline(doc: PDFDocumentProxy): Promise<Outline[]>;
  needsOcr(text: string): boolean; structure(pages: { index: number; text: string }[], options?: { outline?: Outline[]; isKa?: boolean }): { chapters: Section[] };
} }).EngbotBookStructure;
const mapChapters = (sections: Section[]): ParsedChapter[] => sections.map(c => ({ title: c.title, text: c.text, wordCount: c.word_count, firstPage: c.firstPage, lastPage: c.lastPage }));
export function splitIntoChapters(pages: string[]): ParsedChapter[] {
  return mapChapters(engine.structure(pages.map((text, i) => ({ index: i + 1, text }))).chapters);
}
function usableMeta(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 1 && !/^\(?(anonymous|unknown|untitled|none|n\/a|microsoft word.*)\)?$/i.test(text) ? text : null;
}
function coverMetadata(pages: { index: number; text: string }[]) {
  const page = pages.slice(0, 2).find(p => {
    const lines = p.text.split("\n").map(l => l.trim()).filter(Boolean);
    return lines.length > 0 && lines.length <= 12 && p.text.split(/\s+/).length <= 120
      && lines.every(l => l.length <= 90) && !/^(chapter|თავი|foreword|contents|სარჩევი)\s/im.test(p.text);
  });
  const lines = (page?.text || "").split("\n").map(l => l.trim()).filter(l => l.length > 1 && !/^\d+$/.test(l));
  const byIndex = lines.findIndex(l => /^(by|written by|ავტორი:?)\s+/i.test(l));
  let author = byIndex >= 0 ? lines[byIndex].replace(/^(by|written by|ავტორი:?)\s+/i, "") : null;
  const candidates = lines.filter((l, i) => i !== byIndex && !/^(a novel|novel|რომანი)$/i.test(l));
  const title = [...candidates.slice(0, 6)].sort((a, b) => b.length - a.length)[0] || null;
  const next = title ? candidates[candidates.indexOf(title) + 1] : null;
  if (!author && next && next.length <= 40 && /^[A-Zა-ჰ]/.test(next) && next.split(" ").length <= 5) author = next;
  return { title, author, page: page?.index || null };
}
async function recognize(blob: Blob, rawText: string = "", pageNumber: number = 1): Promise<string> {
  // Tier 1: Try server-side AI parsing first (/api/parse-page)
  try {
    const reader = new FileReader();
    const b64Promise = new Promise<string | null>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    const b64 = await b64Promise;
    if (b64) {
      const resp = await fetch("/api/parse-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          image_base64: b64,
          lang: "auto",
          page_number: pageNumber
        }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.text?.trim()) return data.text.trim();
      }
    }
  } catch (_) {
    // Server offline or timed out; continue to Studio OCR
  }

  // Tier 2: StudioHost keeps the same OCR engine alive across native routes.
  const frame = document.querySelector<HTMLIFrameElement>('iframe[title="EngBot Studio"]');
  const studio = frame?.contentWindow as (Window & {
    LuminaScanner?: { transcribeBlob(blob: Blob, lang: string): Promise<{ text: string }> };
    EngbotEnglishLinguistics?: { cleanEnglishOcr(t: string): string };
  }) | null;
  for (let attempt = 0; attempt < 40 && !studio?.LuminaScanner; attempt++) await new Promise(resolve => setTimeout(resolve, 250));
  if (!studio?.LuminaScanner) return rawText;
  const result = await studio.LuminaScanner.transcribeBlob(blob, "auto");
  let recognized = result?.text || "";
  if (studio?.EngbotEnglishLinguistics && recognized && !/[\u10A0-\u10FF]/.test(recognized)) {
    recognized = studio.EngbotEnglishLinguistics.cleanEnglishOcr(recognized);
  }
  return recognized;
}
async function image(doc: PDFDocumentProxy, pageNumber: number, edge: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber), base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(3, edge / Math.max(base.width, base.height)) });
  const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas is unavailable.");
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;
  page.cleanup(); return canvas;
}
export async function parsePdf(file: File): Promise<ParsedBook> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const pages: { index: number; text: string }[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      let text = engine.pageLines(await page.getTextContent()); page.cleanup();
      if (engine.needsOcr(text)) {
        const canvas = await image(doc, i, 2400);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) {
          console.warn("Could not render page " + i);
        } else {
          try {
            const recognized = await recognize(blob, text, i);
            if (recognized && recognized.trim()) text = recognized;
          } catch (error) {
            console.warn("Page " + i + " OCR warning:", error);
          } finally {
            canvas.width = canvas.height = 0;
          }
        }
      }
      pages.push({ index: i, text });
    }
    let info: Record<string, unknown> = {};
    try { info = ((await doc.getMetadata()).info || {}) as Record<string, unknown>; } catch { /* Metadata is optional. */ }
    const sample = pages.slice(0, 30).map(p => p.text).join(" ");
    const ka = (sample.match(/\p{Script=Georgian}/gu) || []).length;
    const en = (sample.match(/[A-Za-z]/g) || []).length;
    const language = ka > en ? "ka" : "en";
    const outline = await engine.outline(doc);
    const chapters = mapChapters(engine.structure(pages, { outline, isKa: language === "ka" }).chapters);
    const detected = coverMetadata(pages);
    let coverImage: string | null = null;
    try { const cover = await image(doc, detected.page || 1, 700); coverImage = cover.toDataURL("image/jpeg", 0.8); cover.width = cover.height = 0; } catch { /* Cover is optional. */ }
    return { pageCount: doc.numPages, title: usableMeta(info["Title"]) || detected.title, author: usableMeta(info["Author"]) || detected.author, coverImage, coverPage: detected.page, chapters, language };
  } finally { await doc.destroy(); }
}
