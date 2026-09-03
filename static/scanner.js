/* ════════════════════════════════════════════════════════════════════════════
   EngBot — Book Scanner (photos → real book)

   Turns photographs of book pages into a book on the same studio shelf a PDF
   import lands on: same chapters, same Moon Reader, same TTS, same Georgian
   translation engine. Nothing else in the studio is touched.

   Recognition tiers (auto, with fallback):
     Tier 0  POST /api/ocr        → Lovable AI Gateway vision (highest quality,
                                    Georgian-aware, transcription only)
     Tier 1  tesseract.js (eng|kat, tessdata_best) fully in the browser — used
             when Tier 0 is unavailable (static hosting / 404 / 401-403) or a
             page fails there.

   Public API:  window.LuminaScanner.open()
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js";
  const TESS_WORKER = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/worker.min.js";
  const TESS_CORE = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/tesseract-core-simd.wasm.js";
  const TESS_LANGS = "https://tessdata.projectnaptha.com/4.0.0_best";

  const MAX_EDGE = 2000; // long-edge px fed to OCR — the sweet spot for accuracy/size
  const CONCURRENCY = 2;

  const state = {
    pages: [], // { id, blob, url, rotation, text, status, error }
    lang: "auto",
    stream: null,
    running: false,
    cancel: false,
    tier0: null, // null = unknown, true/false once probed
    structure: null, // detected cover / title / author after a scan
    appendTo: null,  // book id when adding pages to an existing scanned book
    orderNote: null, // set when pages were re-ordered from printed page numbers
    tessWorker: null,
    tessLang: null,
  };

  // ── DOM ────────────────────────────────────────────────────────────────────
  const shell = () => document.getElementById("scanShell");

  function open(opts) {
    state.appendTo = (opts && opts.appendTo) || null;
    state.appendTitle = (opts && opts.title) || "";
    if (opts && opts.appendTo) {
      // Adding to an existing book starts from an empty queue.
      state.pages.forEach((p) => URL.revokeObjectURL(p.url));
      state.pages = [];
      state.structure = null;
      state.orderNote = null;
    }
    render("chooser");
    if (typeof openModal === "function") openModal("scanModal");
    else document.getElementById("scanModal").classList.add("active");
  }

  function close() {
    stopCamera();
    state.cancel = true;
    if (typeof closeModal === "function") closeModal("scanModal");
    else document.getElementById("scanModal").classList.remove("active");
  }

  function header(title, subtitle) {
    return `
      <div class="flex justify-between items-start mb-5">
        <div>
          <h2 class="text-2xl font-bold text-white">${title}</h2>
          <p class="text-xs text-on-surface-variant mt-0.5">${subtitle}</p>
        </div>
        <button onclick="LuminaScanner.close()" class="p-2 rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition" aria-label="Close">
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>`;
  }

  function langPicker() {
    const opt = (v, label) => `
      <button onclick="LuminaScanner.setLang('${v}')" class="flex-1 py-2 rounded-lg text-xs font-bold border transition ${
        state.lang === v
          ? "bg-primary-container text-on-primary-container border-transparent"
          : "bg-white/5 text-on-surface-variant border-white/10 hover:text-white"
      }">${label}</button>`;
    return `
      <div>
        <p class="font-label-caps text-[10px] tracking-[0.1em] uppercase text-on-surface-variant mb-2">Page language</p>
        <div class="flex gap-2">${opt("eng", "English")}${opt("kat", "🇬🇪 ქართული")}${opt("auto", "Auto")}</div>
      </div>`;
  }

  function render(view) {
    const el = shell();
    if (!el) return;
    if (view === "chooser") {
      stopCamera();
      el.innerHTML =
        header("Scan a book", "Photograph pages or pick pictures you already took") +
        `<div class="space-y-3">
          <button onclick="LuminaScanner.startCamera()" class="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-white/10 hover:border-primary-container/60 transition text-left">
            <span class="w-12 h-12 rounded-xl bg-primary-container/15 border border-primary-fixed/30 text-primary-fixed flex items-center justify-center"><span class="material-symbols-outlined">photo_camera</span></span>
            <span><span class="block text-white font-semibold text-sm">Take photos with camera</span><span class="block text-on-surface-variant text-xs">Page frame guide, one shot per page</span></span>
          </button>
          <button onclick="LuminaScanner.pickFiles()" class="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-white/10 hover:border-primary-container/60 transition text-left">
            <span class="w-12 h-12 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary flex items-center justify-center"><span class="material-symbols-outlined">photo_library</span></span>
            <span><span class="block text-white font-semibold text-sm">Pick from gallery or files</span><span class="block text-on-surface-variant text-xs">Select many page pictures at once</span></span>
          </button>
          <div class="pt-2">${langPicker()}</div>
          <p class="text-[11px] text-on-surface-variant leading-relaxed pt-1">Recognition runs on the neural EngBot engine and falls back to the offline engine when the server is unreachable.</p>
        </div>`;
    } else if (view === "camera") {
      el.innerHTML =
        header("Camera", "Fill the frame with one page, then tap the shutter") +
        `<div class="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[52vh] mx-auto">
          <video id="scanVideo" playsinline autoplay muted class="absolute inset-0 w-full h-full object-cover"></video>
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div class="border-2 border-primary-fixed/80 rounded-lg" style="width:78%;height:88%;box-shadow:0 0 0 9999px rgba(0,0,0,0.35)"></div>
          </div>
          <div class="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 text-[11px] font-bold text-primary-fixed" id="scanShotCount">Page ${state.pages.length + 1}</div>
        </div>
        <div class="flex items-center justify-between mt-4">
          <button onclick="LuminaScanner.render('chooser')" class="px-3 py-2 rounded-xl bg-white/5 text-on-surface-variant text-xs font-bold border border-white/10">Back</button>
          <button onclick="LuminaScanner.shoot()" class="w-16 h-16 rounded-full bg-primary-container text-on-primary-container shadow-[0_0_25px_rgba(0,240,255,0.45)] flex items-center justify-center active:scale-95 transition" aria-label="Capture page">
            <span class="material-symbols-outlined text-3xl">radio_button_checked</span>
          </button>
          <button onclick="LuminaScanner.render('pages')" class="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/10">Done</button>
        </div>
        <div id="scanStrip" class="flex gap-2 overflow-x-auto mt-4 pb-1"></div>`;
      startVideo();
      renderStrip();
    } else if (view === "pages") {
      stopCamera();
      el.innerHTML =
        header(`${state.pages.length} page${state.pages.length === 1 ? "" : "s"}`, "Reorder, rotate or remove, then scan") +
        `<div class="space-y-4">
          ${langPicker()}
          <div id="scanGrid" class="grid grid-cols-3 gap-2 max-h-[38vh] overflow-y-auto"></div>
          <div class="flex flex-wrap gap-2">
            <button onclick="LuminaScanner.startCamera()" class="px-3 py-2 rounded-xl bg-white/5 text-white text-xs font-bold border border-white/10 flex items-center gap-1.5"><span class="material-symbols-outlined text-base">photo_camera</span>Add photos</button>
            <button onclick="LuminaScanner.pickFiles()" class="px-3 py-2 rounded-xl bg-white/5 text-white text-xs font-bold border border-white/10 flex items-center gap-1.5"><span class="material-symbols-outlined text-base">photo_library</span>Add files</button>
          </div>
          <button onclick="LuminaScanner.runScan()" id="scanRunBtn" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-container to-primary-fixed-dim text-on-primary-container font-bold text-sm shadow-[0_0_25px_rgba(0,240,255,0.35)] disabled:opacity-40 flex items-center justify-center gap-2">
            <span class="material-symbols-outlined">document_scanner</span> Scan ${state.pages.length} page${state.pages.length === 1 ? "" : "s"}
          </button>
        </div>`;
      renderGrid();
    } else if (view === "progress") {
      el.innerHTML =
        header("Recognising pages", "High-accuracy transcription, page by page") +
        `<div class="space-y-3">
          <div class="flex justify-between text-xs font-medium">
            <span id="scanStatus" class="text-primary-fixed">Preparing…</span>
            <span id="scanPct" class="text-white">0%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div id="scanBar" class="h-full bg-gradient-to-r from-primary-container to-secondary w-0 transition-all duration-300"></div>
          </div>
          <div id="scanLog" class="max-h-[34vh] overflow-y-auto space-y-1 text-[11px] font-mono text-on-surface-variant"></div>
          <button onclick="LuminaScanner.stopScan()" class="w-full py-2.5 rounded-xl bg-white/5 text-white text-xs font-bold border border-white/10">Cancel</button>
        </div>`;
    } else if (view === "review") {
      const words = state.pages.reduce((n, p) => n + countWords(p.text), 0);
      const appending = !!state.appendTo;
      el.innerHTML =
        header(appending ? "Review & add pages" : "Review & save", `${state.pages.length} pages · ${words.toLocaleString()} words · ${
          state.structure
            ? (state.structure.coverIndex ? `cover detected on page ${state.structure.coverIndex}, ` : "") +
              `${state.structure.chapters.length} section${state.structure.chapters.length === 1 ? "" : "s"} detected`
            : "structure detected"
        }`) +
        `<div class="space-y-3">
          <button onclick="LuminaScanner.reorderByPageNumbers()" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-on-surface-variant flex items-center justify-center gap-1"><span class="material-symbols-outlined text-[14px]">sort</span>Re-order by printed page numbers</button>
          ${state.orderNote ? `<p class="rounded-xl bg-primary-container/10 border border-primary-container/30 px-3 py-2 text-[11px] text-primary-fixed-dim">${escapeHtml(state.orderNote)}</p>` : ""}
          ${
            appending
              ? `<p class="rounded-xl bg-surface/40 border border-white/10 px-3 py-2 text-xs text-on-surface-variant">Adding to <b class="text-white">${escapeHtml(state.appendTitle || "this book")}</b> — the new pages are appended after the existing ones.</p>`
              : `<input id="scanTitle" value="${escapeAttr(suggestTitle())}" placeholder="Book title" class="w-full glass-input rounded-xl p-3 text-sm text-white outline-none">
          <input id="scanAuthor" value="${escapeAttr(suggestAuthor())}" placeholder="Author (optional)" class="w-full glass-input rounded-xl p-3 text-sm text-white outline-none">`
          }
          <div id="scanReview" class="max-h-[34vh] overflow-y-auto space-y-2"></div>
          <button onclick="LuminaScanner.saveBook()" id="scanSaveBtn" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-container to-primary-fixed-dim text-on-primary-container font-bold text-sm shadow-[0_0_25px_rgba(0,240,255,0.35)] flex items-center justify-center gap-2">
            <span class="material-symbols-outlined">library_add</span> ${appending ? "Add pages to this book" : "Save to my library"}
          </button>
        </div>`;
      renderReview();
    }
  }

  // ── Input: camera ──────────────────────────────────────────────────────────
  async function startCamera() {
    // In-app webviews and iOS often refuse getUserMedia inside an iframe; the
    // capture input is the reliable fallback and still opens the camera.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return pickFiles(true);
    }
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1920 } },
        audio: false,
      });
      render("camera");
    } catch (err) {
      console.warn("[scanner] getUserMedia failed, using capture input:", err);
      pickFiles(true);
    }
  }

  function startVideo() {
    const v = document.getElementById("scanVideo");
    if (v && state.stream) {
      v.srcObject = state.stream;
      v.play().catch(() => {});
    }
  }

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }
  }

  async function shoot() {
    const v = document.getElementById("scanVideo");
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.94));
    addPage(blob);
    const badge = document.getElementById("scanShotCount");
    if (badge) badge.textContent = `Page ${state.pages.length + 1}`;
    renderStrip();
  }

  // ── Input: files / gallery ─────────────────────────────────────────────────
  function pickFiles(useCapture) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = !useCapture;
    if (useCapture) input.setAttribute("capture", "environment");
    input.addEventListener("change", () => {
      // Photos picked from a gallery arrive in arbitrary order; sort them the way
      // a human would (IMG_2 before IMG_10), then by capture time as a tiebreak.
      const files = Array.from(input.files || []).sort(compareFiles);
      files.forEach((f) => addPage(f));
      if (files.length) render("pages");
    });
    input.click();
  }

  const collator = window.Intl ? new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }) : null;

  function compareFiles(a, b) {
    const byName = collator ? collator.compare(a.name || "", b.name || "") : String(a.name).localeCompare(b.name);
    if (byName !== 0) return byName;
    return (a.lastModified || 0) - (b.lastModified || 0);
  }

  // ── Page order ─────────────────────────────────────────────────────────────
  // Books print their own page numbers, so after recognition we can put photos
  // back in the right order even when they were shot or picked out of sequence.
  function printedPageNumber(text) {
    const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    const edges = [lines[lines.length - 1], lines[lines.length - 2], lines[0], lines[1]].filter(Boolean);
    for (const line of edges) {
      if (line.length > 24) continue;
      const m = line.match(/^[^0-9]{0,6}?(\d{1,4})[^0-9]{0,6}$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > 0 && n < 3000) return n;
      }
    }
    return null;
  }

  function autoOrderPages() {
    state.orderNote = null;
    const numbers = state.pages.map((p) => printedPageNumber(p.text));
    const known = numbers.filter((n) => typeof n === "number");
    const unique = new Set(known);
    // Only trust the reordering when most pages carry a distinct printed number.
    if (known.length < Math.max(2, Math.ceil(state.pages.length * 0.6)) || unique.size !== known.length) return;

    const before = state.pages.map((p) => p.id).join("|");
    const decorated = state.pages.map((p, i) => ({ p, n: numbers[i], i }));
    // Unnumbered pages (covers, plates) keep their place relative to neighbours.
    let last = -Infinity;
    decorated.forEach((d) => {
      if (typeof d.n === "number") last = d.n;
      else d.n = last === -Infinity ? -1 : last + 0.5;
    });
    decorated.sort((a, b) => a.n - b.n || a.i - b.i);
    state.pages = decorated.map((d) => d.p);
    if (state.pages.map((p) => p.id).join("|") !== before) {
      state.orderNote = "pages re-ordered from their printed page numbers";
    }
  }

  function addPage(blob) {
    if (!blob) return;
    state.pages.push({
      id: "p" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      blob,
      url: URL.createObjectURL(blob),
      rotation: 0,
      text: "",
      status: "queued",
      error: null,
    });
  }

  function removePage(id) {
    const i = state.pages.findIndex((p) => p.id === id);
    if (i < 0) return;
    URL.revokeObjectURL(state.pages[i].url);
    state.pages.splice(i, 1);
    render("pages");
  }

  function rotatePage(id) {
    const p = state.pages.find((x) => x.id === id);
    if (p) p.rotation = (p.rotation + 90) % 360;
    renderGrid();
  }

  function movePage(id, delta) {
    const i = state.pages.findIndex((p) => p.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= state.pages.length) return;
    const [p] = state.pages.splice(i, 1);
    state.pages.splice(j, 0, p);
    renderGrid();
  }

  function renderStrip() {
    const strip = document.getElementById("scanStrip");
    if (!strip) return;
    strip.innerHTML = state.pages
      .map(
        (p, i) => `<div class="relative flex-shrink-0">
          <img src="${p.url}" class="w-14 h-20 object-cover rounded-lg border border-white/15" alt="Page ${i + 1}">
          <button onclick="LuminaScanner.removePage('${p.id}')" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/80 text-white text-[11px] leading-none border border-white/20" aria-label="Remove page ${i + 1}">×</button>
        </div>`,
      )
      .join("");
  }

  function renderGrid() {
    const grid = document.getElementById("scanGrid");
    if (!grid) return;
    grid.innerHTML = state.pages
      .map(
        (p, i) => `<div class="relative rounded-xl overflow-hidden border border-white/10 bg-black/40">
          <img src="${p.url}" style="transform:rotate(${p.rotation}deg)" class="w-full h-28 object-cover transition-transform" alt="Page ${i + 1}">
          <span class="absolute top-1 left-1 px-1.5 rounded bg-black/70 text-[10px] font-bold text-primary-fixed">${i + 1}</span>
          <div class="absolute bottom-0 inset-x-0 flex justify-between bg-black/60 px-1 py-0.5">
            <button onclick="LuminaScanner.movePage('${p.id}',-1)" class="text-white/80 text-xs px-1" aria-label="Move earlier">‹</button>
            <button onclick="LuminaScanner.rotatePage('${p.id}')" class="text-white/80 px-1" aria-label="Rotate"><span class="material-symbols-outlined text-[14px] align-middle">rotate_right</span></button>
            <button onclick="LuminaScanner.removePage('${p.id}')" class="text-white/80 px-1" aria-label="Remove"><span class="material-symbols-outlined text-[14px] align-middle">delete</span></button>
            <button onclick="LuminaScanner.movePage('${p.id}',1)" class="text-white/80 text-xs px-1" aria-label="Move later">›</button>
          </div>
        </div>`,
      )
      .join("");
    const btn = document.getElementById("scanRunBtn");
    if (btn) btn.disabled = state.pages.length === 0;
  }

  function renderReview() {
    const box = document.getElementById("scanReview");
    if (!box) return;
    box.innerHTML = state.pages
      .map(
        (p, i) => `<details class="rounded-xl border border-white/10 bg-surface/40 p-2">
          <summary class="text-xs font-bold text-white cursor-pointer flex items-center justify-between">
            <span>${state.structure && state.structure.coverIndex === i + 1 ? "Cover · " : ""}Page ${i + 1} · ${countWords(p.text)} words ${p.status === "error" ? '<span class="text-error">failed</span>' : ""}</span>
            <span class="text-[10px] text-on-surface-variant">${p.engine || ""}${typeof p.quality === "number" ? " · " + p.quality + "%" : ""}</span>
          </summary>
          ${p.warning ? `<p class="mt-1 text-[10px] text-error">${escapeHtml(p.warning)}</p>` : ""}
          <textarea data-page="${p.id}" oninput="LuminaScanner.editPage('${p.id}', this.value)" class="mt-2 w-full h-32 glass-input rounded-lg p-2 text-[12px] text-white outline-none leading-relaxed">${escapeHtml(p.text)}</textarea>
          <button onclick="LuminaScanner.retryPage('${p.id}')" class="mt-1 text-[11px] text-primary-fixed font-bold">Re-scan this page</button>

        </details>`,
      )
      .join("");
  }

  // ── Preprocessing (canvas only, no dependencies) ───────────────────────────
  // A phone photo of a book page is skewed, unevenly lit, slightly soft and
  // often too small for OCR. We fix all four deterministically and produce two
  // variants of every page; OCR runs on the better-scoring one, and on the
  // other as a second opinion when the first result looks weak.
  //   "enhanced" — deskewed, illumination-flattened, unsharp-masked greyscale
  //   "binary"   — Sauvola-style adaptive threshold (best for faint/blurry ink)
  async function preprocess(page, variant) {
    const base = page._base || (page._base = await renderBase(page));
    const { w, h } = base;
    const gray = Uint8ClampedArray.from(base.gray); // work on a copy

    flattenIllumination(gray, w, h);
    stretchContrast(gray);
    if (variant === "binary") {
      adaptiveThreshold(gray, w, h);
    } else {
      unsharpMask(gray, w, h, 1.1);
    }

    const canvas = grayToCanvas(gray, w, h, base.upscale);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      blob: await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9)),
    };
  }

  // Rotation + deskew + optional upscale, cached once per page.
  async function renderBase(page) {
    const bitmap = await blobToBitmap(page.blob);
    const rot = page.rotation % 360;
    const swap = rot === 90 || rot === 270;
    const srcW = swap ? bitmap.height : bitmap.width;
    const srcH = swap ? bitmap.width : bitmap.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
    let w = Math.max(1, Math.round(srcW * scale));
    let h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    const dw = swap ? h : w;
    const dh = swap ? w : h;
    ctx.drawImage(bitmap, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    if (bitmap.close) bitmap.close();

    let gray = toGray(ctx.getImageData(0, 0, w, h), w, h);

    // Deskew: text lines are horizontal in a good scan. We score candidate
    // angles by the variance of the horizontal ink projection — the sharpest
    // profile is the upright one — then rotate the image back by that angle.
    const angle = estimateSkew(gray, w, h);
    if (Math.abs(angle) > 0.25) {
      const rc = document.createElement("canvas");
      rc.width = w;
      rc.height = h;
      const rctx = rc.getContext("2d", { willReadFrequently: true });
      rctx.fillStyle = "#fff";
      rctx.fillRect(0, 0, w, h);
      rctx.imageSmoothingQuality = "high";
      rctx.translate(w / 2, h / 2);
      rctx.rotate((-angle * Math.PI) / 180);
      rctx.drawImage(canvas, -w / 2, -h / 2);
      gray = toGray(rctx.getImageData(0, 0, w, h), w, h);
    }

    // Small photos (older phones, cropped shots) OCR far better upscaled.
    const upscale = Math.max(w, h) < 1400 ? 2 : 1;
    page._sharpness = laplacianVariance(gray, w, h);
    page._exposure = meanOf(gray);
    return { gray, w, h, upscale };
  }

  function toGray(img, w, h) {
    const d = img.data;
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, g = 0; i < d.length; i += 4, g++) {
      gray[g] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    }
    return gray;
  }

  function meanOf(gray) {
    let sum = 0;
    for (let i = 0; i < gray.length; i++) sum += gray[i];
    return sum / gray.length;
  }

  // Blur detector: variance of the Laplacian. Low value = soft//out-of-focus.
  function laplacianVariance(gray, w, h) {
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y += 2) {
      for (let x = 1; x < w - 1; x += 2) {
        const i = y * w + x;
        const v =
          4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
        sum += v;
        sumSq += v * v;
        n++;
      }
    }
    if (!n) return 0;
    const mean = sum / n;
    return sumSq / n - mean * mean;
  }

  function estimateSkew(gray, w, h) {
    // Downscale to a coarse binary mask for speed.
    const step = Math.max(1, Math.floor(Math.max(w, h) / 500));
    const sw = Math.floor(w / step);
    const sh = Math.floor(h / step);
    if (sw < 20 || sh < 20) return 0;
    const mask = new Uint8Array(sw * sh);
    const mean = meanOf(gray);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        mask[y * sw + x] = gray[y * step * w + x * step] < mean - 12 ? 1 : 0;
      }
    }
    let best = 0;
    let bestScore = -1;
    for (let a = -6; a <= 6; a += 0.5) {
      const t = Math.tan((a * Math.PI) / 180);
      const rows = new Float64Array(sh);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          if (!mask[y * sw + x]) continue;
          const ry = y - Math.round((x - sw / 2) * t);
          if (ry >= 0 && ry < sh) rows[ry]++;
        }
      }
      let m = 0;
      for (let y = 0; y < sh; y++) m += rows[y];
      m /= sh;
      let v = 0;
      for (let y = 0; y < sh; y++) v += (rows[y] - m) * (rows[y] - m);
      if (v > bestScore) {
        bestScore = v;
        best = a;
      }
    }
    return best;
  }

  // Divide out a coarse blur of the page = removes shadows, spine gradients and
  // yellow-lamp falloff without touching glyph strokes.
  function flattenIllumination(gray, w, h) {
    const radius = Math.max(8, Math.round(Math.max(w, h) / 40));
    const bg = boxBlur(gray, w, h, radius);
    for (let i = 0; i < gray.length; i++) {
      const b = bg[i] || 1;
      let v = (gray[i] / b) * 200;
      gray[i] = v > 255 ? 255 : v < 0 ? 0 : v;
    }
  }

  function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * r + 1);
        acc -= src[row + Math.max(0, x - r)];
        acc += src[row + Math.min(w - 1, x + r + 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * r + 1);
        acc -= tmp[Math.max(0, y - r) * w + x];
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x];
      }
    }
    return out;
  }

  function stretchContrast(gray) {
    const hist = new Uint32Array(256);
    for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
    const total = gray.length;
    let lo = 0;
    let hi = 255;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc > total * 0.02) { lo = v; break; }
    }
    acc = 0;
    for (let v = 255; v >= 0; v--) {
      acc += hist[v];
      if (acc > total * 0.02) { hi = v; break; }
    }
    const span = Math.max(1, hi - lo);
    for (let i = 0; i < gray.length; i++) {
      let v = ((gray[i] - lo) * 255) / span;
      // Gentle gamma keeps thin Georgian strokes instead of washing them out.
      v = 255 * Math.pow(Math.min(1, Math.max(0, v / 255)), 0.9);
      gray[i] = v;
    }
  }

  // Recovers definition lost to soft focus / camera shake.
  function unsharpMask(gray, w, h, amount) {
    const blur = boxBlur(gray, w, h, 1);
    for (let i = 0; i < gray.length; i++) {
      const v = gray[i] + amount * (gray[i] - blur[i]);
      gray[i] = v > 255 ? 255 : v < 0 ? 0 : v;
    }
  }

  // Sauvola-style local threshold — the classic rescue for faint or blurry ink
  // where a single global cut-off either eats strokes or keeps the shadows.
  function adaptiveThreshold(gray, w, h) {
    const r = Math.max(6, Math.round(Math.max(w, h) / 120));
    const mean = boxBlur(gray, w, h, r);
    const sq = new Float32Array(gray.length);
    for (let i = 0; i < gray.length; i++) sq[i] = gray[i] * gray[i];
    const meanSq = boxBlur(sq, w, h, r);
    const k = 0.28;
    const R = 128;
    for (let i = 0; i < gray.length; i++) {
      const variance = Math.max(0, meanSq[i] - mean[i] * mean[i]);
      const std = Math.sqrt(variance);
      const t = mean[i] * (1 + k * (std / R - 1));
      gray[i] = gray[i] < t ? 0 : 255;
    }
  }

  function grayToCanvas(gray, w, h, upscale) {
    const src = document.createElement("canvas");
    src.width = w;
    src.height = h;
    const sctx = src.getContext("2d");
    const img = sctx.createImageData(w, h);
    for (let i = 0, o = 0; i < gray.length; i++, o += 4) {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = gray[i];
      img.data[o + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    if (!upscale || upscale === 1) return src;
    const out = document.createElement("canvas");
    out.width = w * upscale;
    out.height = h * upscale;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }

  function blobToBitmap(blob) {
    if (window.createImageBitmap) return createImageBitmap(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  // ── Tier 0: gateway vision OCR ─────────────────────────────────────────────
  async function ocrGateway(dataUrl, lang, hint) {
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, lang, hint: hint || undefined }),
    });
    if (!res.ok) {
      // 404 = static hosting (GitHub Pages); 401/402/403 = blocked workspace.
      if ([404, 401, 402, 403, 501].includes(res.status)) state.tier0 = false;
      const body = await res.text().catch(() => "");
      const err = new Error(`ocr ${res.status}: ${body.slice(0, 160)}`);
      err.status = res.status;
      throw err;
    }
    state.tier0 = true;
    const data = await res.json();
    return data.text || "";
  }

  // ── Tier 1: tesseract.js in the browser ────────────────────────────────────
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function tessWorkerFor(lang) {
    const target = lang === "kat" ? "kat" : lang === "auto" ? "eng+kat" : "eng";
    if (state.tessWorker && state.tessLang === target) return state.tessWorker;
    if (state.tessWorker) {
      try {
        await state.tessWorker.terminate();
      } catch (e) {
        /* ignore */
      }
      state.tessWorker = null;
    }
    await loadScript(TESSERACT_CDN);
    const worker = await window.Tesseract.createWorker(target, 1, {
      workerPath: TESS_WORKER,
      corePath: TESS_CORE,
      langPath: TESS_LANGS,
      gzip: true,
    });
    await worker.setParameters({ preserve_interword_spaces: "1" });
    state.tessWorker = worker;
    state.tessLang = target;
    return worker;
  }

  async function ocrLocal(blob, lang) {
    const worker = await tessWorkerFor(lang);
    const { data } = await worker.recognize(blob);
    return { text: data.text || "", confidence: typeof data.confidence === "number" ? data.confidence : 0 };
  }

  // ── Run ────────────────────────────────────────────────────────────────────
  async function runScan() {
    if (!state.pages.length || state.running) return;
    state.running = true;
    state.cancel = false;
    render("progress");

    let done = 0;
    const total = state.pages.length;
    const queue = state.pages.slice();

    const worker = async () => {
      while (queue.length && !state.cancel) {
        const page = queue.shift();
        await scanOnePage(page);
        done++;
        setProgress(done, total, page);
      }
    };

    // Local OCR is single-threaded per worker; keep concurrency at 1 there.
    const lanes = state.tier0 === false ? 1 : CONCURRENCY;
    await Promise.all(Array.from({ length: Math.min(lanes, total) }, worker));

    state.running = false;
    if (state.cancel) {
      render("pages");
      return;
    }
    autoOrderPages();
    detectStructure();
    render("review");
  }

  async function scanOnePage(page) {
    page.status = "working";
    try {
      const lang = state.lang;
      const attempts = [];

      // Pass 1 — enhanced greyscale, the best input for clean-ish photos.
      const enhanced = await preprocess(page, "enhanced");
      if (state.tier0 !== false) {
        try {
          const text = await withRetry(() => ocrGateway(enhanced.dataUrl, lang, ocrHint(page, lang)));
          attempts.push({ text, engine: "neural", score: scoreText(text, lang) });
        } catch (err) {
          console.warn("[scanner] tier 0 failed, falling back:", err && err.message);
        }
      }
      if (!attempts.length) {
        const r = await ocrLocal(enhanced.blob, lang);
        attempts.push({ text: r.text, engine: "offline", score: scoreText(r.text, lang) * (0.5 + r.confidence / 200) });
      }

      // Pass 2 — only when the first pass looks weak (blurry photo, faint ink,
      // low light). The adaptive-threshold variant recovers text a greyscale
      // pass drops; we keep whichever transcription scores higher.
      const first = attempts[0];
      const shaky = (page._sharpness || 0) < 90 || (page._exposure || 128) < 70 || (page._exposure || 128) > 215;
      if (first.score < 0.62 || shaky) {
        try {
          const binary = await preprocess(page, "binary");
          if (state.tier0 !== false) {
            const text = await withRetry(() => ocrGateway(binary.dataUrl, lang, ocrHint(page, lang)));
            attempts.push({ text, engine: "neural+recovery", score: scoreText(text, lang) });
          } else {
            const r = await ocrLocal(binary.blob, lang);
            attempts.push({ text: r.text, engine: "offline+recovery", score: scoreText(r.text, lang) * (0.5 + r.confidence / 200) });
          }
        } catch (err) {
          console.warn("[scanner] recovery pass failed:", err && err.message);
        }
      }

      const best = attempts.sort((a, b) => b.score - a.score)[0] || { text: "", engine: "" };
      page.text = repairText(cleanPageText(best.text, lang), lang);
      page.engine = best.engine;
      page.quality = Math.round((best.score || 0) * 100);
      page.warning = qualityWarning(page, best.score);
      page.status = page.text ? "done" : "empty";
      page.error = null;
      page._base = null; // release the cached pixel buffer
    } catch (err) {
      console.error("[scanner] page failed:", err);
      page.status = "error";
      page.error = (err && err.message) || "failed";
      page._base = null;
    }
  }

  // Nudges the vision model with what we already know about the page so it
  // guesses damaged glyphs in the right alphabet instead of inventing Latin.
  function ocrHint(page, lang) {
    const bits = [];
    if (lang === "kat") bits.push("The page is Georgian (Mkhedruli). Never transliterate into Latin letters.");
    if (lang === "eng") bits.push("The page is English prose.");
    if ((page._sharpness || 999) < 90) bits.push("The photo is slightly blurry — reconstruct partially visible words from context, do not skip them.");
    if ((page._exposure || 128) < 70) bits.push("The photo is under-exposed/dark.");
    if ((page._exposure || 128) > 215) bits.push("The photo is over-exposed with glare.");
    return bits.join(" ");
  }

  // Cheap language-aware confidence: how much of the output looks like real
  // words in the expected script, penalising OCR garbage runs.
  function scoreText(text, lang) {
    const t = (text || "").trim();
    if (!t) return 0;
    const letters = (t.match(/\p{L}/gu) || []).length;
    if (letters < 8) return 0.05;
    const ka = (t.match(/[\u10A0-\u10FF]/g) || []).length;
    const latin = (t.match(/[A-Za-z]/g) || []).length;
    const expected = lang === "kat" ? ka : lang === "eng" ? latin : Math.max(ka, latin);
    let score = expected / letters; // right-script ratio
    const junk = (t.match(/[^\p{L}\p{N}\s.,;:!?'"()\[\]«»„“”\-—–…]/gu) || []).length;
    score -= Math.min(0.35, junk / Math.max(40, t.length) * 2);
    const words = t.split(/\s+/).filter(Boolean);
    const single = words.filter((w) => w.length === 1).length;
    score -= Math.min(0.25, single / Math.max(10, words.length)); // shredded words
    score += Math.min(0.1, words.length / 3000); // reward fuller pages
    return Math.max(0, Math.min(1, score));
  }

  function qualityWarning(page, score) {
    if ((page._sharpness || 999) < 45) return "Photo looks blurry — re-shoot for best accuracy.";
    if ((page._exposure || 128) < 60) return "Photo is very dark — add light and re-shoot.";
    if ((page._exposure || 128) > 220) return "Glare/over-exposure detected — avoid direct light.";
    if (score < 0.5) return "Low recognition confidence — please check this page.";
    return null;
  }

  // Deterministic repair of the OCR mistakes each language actually makes.
  function repairText(text, lang) {
    let t = text || "";
    if (!t) return t;
    const isKa = lang === "kat" || (lang === "auto" && detectLang(t) === "kat");
    if (isKa) {
      // Latin/Cyrillic look-alikes leaking into Georgian words.
      const map = { o: "ო", e: "ე", a: "ა", c: "ც", g: "გ", b: "ბ", m: "მ", n: "ნ", p: "პ", h: "ჰ", "3": "ვ", "0": "ო" };
      t = t.replace(/[\u10A0-\u10FF]+[A-Za-z0-9]+[\u10A0-\u10FF]*|[A-Za-z0-9]+[\u10A0-\u10FF]+/g, (chunk) =>
        chunk.replace(/[A-Za-z0-9]/g, (c) => map[c.toLowerCase()] || ""),
      );
      t = t.replace(/([\u10A0-\u10FF])\s+([,.;:!?])/g, "$1$2");
    } else {
      // Classic English confusions, applied only inside alphabetic words so we
      // never damage real numbers. "1" is ambiguous (i or l), so it is resolved
      // from its neighbours: consonant + 1 + vowel is almost always "l"
      // (Eng1ish → English), otherwise "i" (Th1s → This).
      t = t.replace(/\b(?=[A-Za-z]*[0-9])(?=[0-9]*[A-Za-z])[A-Za-z0-9]{2,}\b/g, (w) =>
        w.replace(/[015]/g, (c, i) => {
          if (c === "0") return "o";
          if (c === "5") return "s";
          const prev = (w[i - 1] || "").toLowerCase();
          const next = (w[i + 1] || "").toLowerCase();
          const isVowel = (ch) => /[aeiou]/.test(ch);
          return !isVowel(prev) && prev && isVowel(next) ? "l" : "i";
        }),
      );
      t = t.replace(/([a-z])\|([a-z])/g, "$1l$2");
      t = t.replace(/(^|\s)l(?=\s+(?:am|was|will|have|had|would|could|should|think|know|said)\b)/g, "$1I");
    }
    // Quotes/dashes normalisation shared by both languages.
    t = t.replace(/\s+([,.;:!?])/g, "$1").replace(/([,.;:!?])(?=\p{L})/gu, "$1 ");
    return t.replace(/[ \t]{2,}/g, " ").trim();
  }

  async function withRetry(fn) {
    let delay = 900;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const s = err && err.status;
        // Only 429 / 5xx are retryable; everything else repeats identically.
        if (s !== 429 && !(s >= 500 && s < 600)) throw err;
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, delay + Math.random() * 400));
        delay *= 2;
      }
    }
  }

  function setProgress(done, total, page) {
    const pct = Math.round((done / total) * 100);
    const bar = document.getElementById("scanBar");
    const pctEl = document.getElementById("scanPct");
    const status = document.getElementById("scanStatus");
    const log = document.getElementById("scanLog");
    if (bar) bar.style.width = pct + "%";
    if (pctEl) pctEl.textContent = pct + "%";
    if (status) status.textContent = `Recognising page ${Math.min(done + 1, total)} of ${total}…`;
    if (log && page) {
      const line = document.createElement("div");
      const ok = page.status === "done";
      line.className = ok ? "text-on-surface-variant" : "text-error";
      line.textContent = `page ${state.pages.indexOf(page) + 1} · ${page.status}${
        page.engine ? " · " + page.engine : ""
      } · ${countWords(page.text)}w`;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }
  }

  function stopScan() {
    state.cancel = true;
  }

  async function retryPage(id) {
    const page = state.pages.find((p) => p.id === id);
    if (!page) return;
    page.text = "";
    await scanOnePage(page);
    renderReview();
  }

  function editPage(id, value) {
    const page = state.pages.find((p) => p.id === id);
    if (page) page.text = value;
  }

  // ── Text post-processing ───────────────────────────────────────────────────
  function cleanPageText(raw, lang) {
    let t = (raw || "").replace(/\r/g, "");
    if (!t.trim()) return "";
    // Join hyphenated line breaks, then collapse soft line breaks inside a paragraph.
    t = t.replace(/(\p{L})[-\u2010\u2011]\n(\p{L})/gu, "$1$2");
    t = t.replace(/([^\n])\n(?!\n)(?=\S)/g, "$1 ");
    t = t.replace(/[ \t]{2,}/g, " ");
    t = t.replace(/\n{3,}/g, "\n\n");
    // Drop stray page numbers left on their own line.
    t = t.replace(/^\s*\d{1,4}\s*$/gm, "");
    if (lang !== "eng") {
      // Foreign sentence terminators that OCR/LLMs sometimes leak into Georgian.
      t = t.replace(/[\u0964\u0965\u3002\u06D4\u0589]/g, ".");
      t = t.replace(/\s+([.,!?;:])/g, "$1");
    }
    return t.trim();
  }

  function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }

  // Runs the shared app-wide detector over the recognised pages so the scan gets
  // the same cover / title / author / chapter detection a PDF import gets.
  function detectStructure() {
    const pages = state.pages
      .filter((p) => p.text && p.text.trim())
      .map((p, i) => ({ index: i + 1, text: p.text.trim() }));
    try {
      state.structure =
        typeof window.detectBookStructure === "function" && pages.length
          ? window.detectBookStructure(pages, { isKa: false })
          : null;
    } catch (err) {
      console.warn("[scanner] structure detection failed:", err);
      state.structure = null;
    }
  }

  function suggestTitle() {
    if (state.structure && state.structure.title) return state.structure.title;
    const first = (state.pages.find((p) => p.text) || {}).text || "";
    const line = first
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 2 && l.length < 80);
    return line ? line.replace(/\s+/g, " ") : "Scanned book";
  }

  function suggestAuthor() {
    return (state.structure && state.structure.author) || "";
  }

  // Small JPEG of a captured page — used as the book cover when the cover page
  // was photographed, so the shelf shows the real book.
  async function pageDataUrl(page, maxEdge) {
    try {
      const bitmap = await blobToBitmap(page.blob);
      const rot = page.rotation % 360;
      const swap = rot === 90 || rot === 270;
      const srcW = swap ? bitmap.height : bitmap.width;
      const srcH = swap ? bitmap.width : bitmap.height;
      const scale = Math.min(1, (maxEdge || 700) / Math.max(srcW, srcH));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(srcW * scale));
      canvas.height = Math.max(1, Math.round(srcH * scale));
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      const dw = swap ? canvas.height : canvas.width;
      const dh = swap ? canvas.width : canvas.height;
      ctx.drawImage(bitmap, -dw / 2, -dh / 2, dw, dh);
      return canvas.toDataURL("image/jpeg", 0.82);
    } catch (err) {
      console.warn("[scanner] cover thumbnail failed:", err);
      return null;
    }
  }

  // ── Save into the shelf ────────────────────────────────────────────────────
  async function saveBook() {
    const btn = document.getElementById("scanSaveBtn");
    const title = (document.getElementById("scanTitle") || {}).value || "Scanned book";
    const author = (document.getElementById("scanAuthor") || {}).value || "";
    const pages = state.pages.filter((p) => p.text && p.text.trim());
    if (!pages.length) {
      alert("No recognised text to save yet.");
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Saving…';
    }
    try {
      const detected = state.lang === "auto" ? detectLang(pages.map((p) => p.text).join(" ")) : state.lang;
      const isKa = detected === "kat";
      // Georgian pages go through the same in-house rule engine (v1.45.0
      // auto-fixes + QA rules) that the translation engine uses, so scanned
      // Georgian is cleaned up the same way translated Georgian is.
      const cleanup = (t) =>
        isKa && typeof window.applyKaRuleEngine === "function" ? window.applyKaRuleEngine(t) : t;
      // Photographed cover page → the book's cover image on every shelf.
      const frontImages = {};
      for (let i = 0; i < Math.min(2, pages.length); i++) {
        const url = await pageDataUrl(pages[i], 700);
        if (url) frontImages[i + 1] = url;
      }
      if (state.appendTo) {
        await window.appendScannedPagesToBook(
          state.appendTo,
          pages.map((p, i) => ({ index: i + 1, text: cleanup(p.text.trim()), engine: p.engine || "offline" })),
          { lang: isKa ? "ka" : "en" },
        );
      } else
      await window.createBookFromScannedPages(
        pages.map((p, i) => ({ index: i + 1, text: cleanup(p.text.trim()), engine: p.engine || "offline" })),
        {
          title: title.trim() || "Scanned book",
          author: author.trim(),
          lang: isKa ? "ka" : "en",
          frontImages,
        },
      );

      // Free the object URLs and reset for the next scan.
      state.pages.forEach((p) => URL.revokeObjectURL(p.url));
      state.pages = [];
      state.structure = null;
      state.appendTo = null;
      state.orderNote = null;
      close();
    } catch (err) {
      console.error("[scanner] save failed:", err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">library_add</span> Save to my library';
      }
      alert("Could not save the scanned book: " + ((err && err.message) || "unknown error"));
    }
  }

  function detectLang(text) {
    const ka = (text.match(/[\u10A0-\u10FF]/g) || []).length;
    return ka > text.length * 0.15 ? "kat" : "eng";
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function setLang(lang) {
    state.lang = lang;
    // Re-render the current view so the pill state updates.
    render(document.getElementById("scanGrid") ? "pages" : "chooser");
  }

  function reorderByPageNumbers() {
    autoOrderPages();
    render(state.pages.some((p) => p.text && p.text.trim()) ? "review" : "pages");
    if (!state.orderNote) alert("Not enough printed page numbers were recognised to re-order these pages.");
  }

  window.LuminaScanner = {
    reorderByPageNumbers,
    _autoOrder: autoOrderPages,
    _state: state,
    open,
    close,
    render,
    setLang,
    startCamera,
    pickFiles,
    shoot,
    removePage,
    rotatePage,
    movePage,
    runScan,
    stopScan,
    retryPage,
    editPage,
    saveBook,
  };
})();
