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
    tessWorker: null,
    tessLang: null,
  };

  // ── DOM ────────────────────────────────────────────────────────────────────
  const shell = () => document.getElementById("scanShell");

  function open() {
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
      el.innerHTML =
        header("Review & save", `${state.pages.length} pages · ${words.toLocaleString()} words recognised`) +
        `<div class="space-y-3">
          <input id="scanTitle" value="${escapeAttr(suggestTitle())}" placeholder="Book title" class="w-full glass-input rounded-xl p-3 text-sm text-white outline-none">
          <input id="scanAuthor" value="" placeholder="Author (optional)" class="w-full glass-input rounded-xl p-3 text-sm text-white outline-none">
          <div id="scanReview" class="max-h-[34vh] overflow-y-auto space-y-2"></div>
          <button onclick="LuminaScanner.saveBook()" id="scanSaveBtn" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-container to-primary-fixed-dim text-on-primary-container font-bold text-sm shadow-[0_0_25px_rgba(0,240,255,0.35)] flex items-center justify-center gap-2">
            <span class="material-symbols-outlined">library_add</span> Save to my library
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
      const files = Array.from(input.files || []);
      files.forEach((f) => addPage(f));
      if (files.length) render("pages");
    });
    input.click();
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
            <span>Page ${i + 1} · ${countWords(p.text)} words ${p.status === "error" ? '<span class="text-error">failed</span>' : ""}</span>
            <span class="text-[10px] text-on-surface-variant">${p.engine || ""}</span>
          </summary>
          <textarea data-page="${p.id}" oninput="LuminaScanner.editPage('${p.id}', this.value)" class="mt-2 w-full h-32 glass-input rounded-lg p-2 text-[12px] text-white outline-none leading-relaxed">${escapeHtml(p.text)}</textarea>
          <button onclick="LuminaScanner.retryPage('${p.id}')" class="mt-1 text-[11px] text-primary-fixed font-bold">Re-scan this page</button>
        </details>`,
      )
      .join("");
  }

  // ── Preprocessing (canvas only, no dependencies) ───────────────────────────
  async function preprocess(page) {
    const bitmap = await blobToBitmap(page.blob);
    const rot = page.rotation % 360;
    const swap = rot === 90 || rot === 270;
    const srcW = swap ? bitmap.height : bitmap.width;
    const srcH = swap ? bitmap.width : bitmap.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    const dw = (swap ? h : w);
    const dh = (swap ? w : h);
    ctx.drawImage(bitmap, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    if (bitmap.close) bitmap.close();

    // Grayscale + local contrast stretch: the single biggest accuracy lever for
    // phone photos (uneven lighting, grey paper, shadow from the spine).
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, g = 0; i < d.length; i += 4, g++) {
      gray[g] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    }
    // Percentile stretch (2%/98%) so we never clip real glyph strokes.
    const hist = new Uint32Array(256);
    for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
    const total = gray.length;
    let lo = 0;
    let hi = 255;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc > total * 0.02) {
        lo = v;
        break;
      }
    }
    acc = 0;
    for (let v = 255; v >= 0; v--) {
      acc += hist[v];
      if (acc > total * 0.02) {
        hi = v;
        break;
      }
    }
    const span = Math.max(1, hi - lo);
    for (let i = 0, g = 0; i < d.length; i += 4, g++) {
      let v = ((gray[g] - lo) * 255) / span;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      // Gentle gamma keeps thin Georgian strokes instead of thresholding them away.
      v = 255 * Math.pow(v / 255, 0.9);
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.86),
      blob: await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.86)),
    };
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
    return data.text || "";
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
    render("review");
  }

  async function scanOnePage(page) {
    page.status = "working";
    try {
      const pre = await preprocess(page);
      let text = "";
      let engine = "";
      if (state.tier0 !== false) {
        try {
          text = await withRetry(() => ocrGateway(pre.dataUrl, state.lang));
          engine = "neural";
        } catch (err) {
          console.warn("[scanner] tier 0 failed, falling back:", err && err.message);
        }
      }
      if (!text) {
        text = await ocrLocal(pre.blob, state.lang);
        engine = "offline";
      }
      page.text = cleanPageText(text, state.lang);
      page.engine = engine;
      page.status = page.text ? "done" : "empty";
      page.error = null;
    } catch (err) {
      console.error("[scanner] page failed:", err);
      page.status = "error";
      page.error = (err && err.message) || "failed";
    }
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

  function suggestTitle() {
    const first = (state.pages.find((p) => p.text) || {}).text || "";
    const line = first
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 2 && l.length < 80);
    return line ? line.replace(/\s+/g, " ") : "Scanned book";
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
      await window.createBookFromScannedPages(
        pages.map((p, i) => ({ index: i + 1, text: cleanup(p.text.trim()), engine: p.engine || "offline" })),
        { title: title.trim() || "Scanned book", author: author.trim(), lang: isKa ? "ka" : "en" },
      );

      // Free the object URLs and reset for the next scan.
      state.pages.forEach((p) => URL.revokeObjectURL(p.url));
      state.pages = [];
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

  window.LuminaScanner = {
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
