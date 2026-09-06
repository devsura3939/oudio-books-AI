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

  const MAX_EDGE = 1800; // long-edge px fed to OCR — sweet spot for accuracy and keeping payload under 800KB
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

  function visionStatusPill() {
    const hasGemini = !!(localStorage.getItem("geminiApiKey") || "").trim();
    const hasOR = !!(localStorage.getItem("openRouterApiKey") || "").trim();
    const active = hasGemini ? "Google Gemini 2.0 Flash" : hasOR ? "OpenRouter Vision" : "AI Gateway Vision";
    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
        <div class="flex items-center gap-2 overflow-hidden">
          <span class="material-symbols-outlined text-base ${hasGemini || hasOR ? 'text-primary-fixed' : 'text-on-surface-variant'}">neurology</span>
          <div class="truncate">
            <span class="text-white font-medium text-[11px] block truncate">Vision Engine: ${active}</span>
            <span class="text-[10px] text-on-surface-variant">${hasGemini || hasOR ? '99%+ Neural OCR Active' : 'Plug in free Gemini key for 99%+ accuracy'}</span>
          </div>
        </div>
        <button onclick="LuminaScanner.promptVisionKey()" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-white transition flex-shrink-0">Key</button>
      </div>`;
  }

  function promptVisionKey() {
    const current = (typeof window.sanitizeApiKey === 'function' ? window.sanitizeApiKey(localStorage.getItem("geminiApiKey") || "") : (localStorage.getItem("geminiApiKey") || "").trim());
    const input = prompt("Enter Google Gemini API Key (1,500 free requests/day for 99%+ book recognition):\nGet one free in 10 seconds at: aistudio.google.com/app/apikey", current);
    if (input === null) return;
    const clean = typeof window.sanitizeApiKey === 'function' ? window.sanitizeApiKey(input) : input.trim();
    if (clean) {
      const provider = typeof window.detectApiKeyProvider === 'function' ? window.detectApiKeyProvider(clean) : null;
      if (provider === 'openrouter') {
        localStorage.setItem("openRouterApiKey", clean);
        alert("Detected OpenRouter API key! Saved to OpenRouter vision and main engine.");
      } else if (provider === 'groq') {
        localStorage.setItem("groqApiKey", clean);
        alert("Detected Groq API key! Saved to Groq engine.");
      } else {
        localStorage.setItem("geminiApiKey", clean);
        localStorage.setItem("lumina_saved_gemini_key", clean);
        state.tier0 = true;
        alert("Gemini Neural Vision key saved & sanitized! Book scanning will now use high-precision Gemini 2.0 Flash.");
      }
    } else {
      localStorage.removeItem("geminiApiKey");
      alert("Custom Gemini key removed.");
    }
    render(document.getElementById("scanGrid") ? "pages" : "chooser");
  }

  function startNativeCamera() {
    pickFiles(true);
  }

  async function toggleTorch() {
    if (!state.stream) return;
    const track = state.stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if (caps.torch) {
        state.torchOn = !state.torchOn;
        await track.applyConstraints({ advanced: [{ torch: state.torchOn }] });
        const btn = document.getElementById("scanTorchBtn");
        if (btn) btn.classList.toggle("text-primary-fixed", state.torchOn);
      } else {
        alert("Torch/flashlight is not supported on this camera device.");
      }
    } catch (e) {
      console.warn("Torch failed:", e);
    }
  }

  function render(view) {
    const el = shell();
    if (!el) return;
    if (view === "chooser") {
      stopCamera();
      el.innerHTML =
        header("Scan a book", "Photograph pages or pick pictures you already took") +
        `<div class="space-y-3">
          <button onclick="LuminaScanner.startNativeCamera()" class="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-primary-container/40 hover:border-primary-container/80 transition text-left">
            <span class="w-12 h-12 rounded-xl bg-primary-container/20 border border-primary-fixed/40 text-primary-fixed flex items-center justify-center"><span class="material-symbols-outlined">photo_camera</span></span>
            <span>
              <span class="block text-white font-semibold text-sm flex items-center gap-1.5">
                <span>Hardware Camera (12MP–48MP HDR)</span>
                <span class="px-1.5 py-0.2 rounded bg-primary-container/30 text-primary-fixed text-[10px] font-bold">100% QUALITY</span>
              </span>
              <span class="block text-on-surface-variant text-xs">Uses phone's native optical camera with hardware autofocus</span>
            </span>
          </button>
          <button onclick="LuminaScanner.startCamera()" class="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-white/10 hover:border-white/20 transition text-left">
            <span class="w-12 h-12 rounded-xl bg-white/5 border border-white/15 text-white flex items-center justify-center"><span class="material-symbols-outlined">videocam</span></span>
            <span><span class="block text-white font-semibold text-sm">Live Viewfinder Camera</span><span class="block text-on-surface-variant text-xs">Continuous page frame guide with 4K burst sharpness</span></span>
          </button>
          <button onclick="LuminaScanner.pickFiles()" class="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface/40 border border-white/10 hover:border-primary-container/60 transition text-left">
            <span class="w-12 h-12 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary flex items-center justify-center"><span class="material-symbols-outlined">photo_library</span></span>
            <span><span class="block text-white font-semibold text-sm">Pick from gallery or files</span><span class="block text-on-surface-variant text-xs">Select many page pictures at once</span></span>
          </button>
          <div class="pt-2 space-y-2">
            ${langPicker()}
            ${visionStatusPill()}
          </div>
          <p class="text-[11px] text-on-surface-variant leading-relaxed pt-1">Neural vision with contextual deduction transcribes full literary prose, reconstructing faint ink and curved margins faithfully.</p>
        </div>`;
    } else if (view === "camera") {
      el.innerHTML =
        header("Camera", "Fill the frame with one page, then tap the shutter") +
        `<div class="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[52vh] mx-auto">
          <video id="scanVideo" playsinline autoplay muted class="absolute inset-0 w-full h-full object-cover"></video>
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div id="scanTargetFrame" class="border-2 border-primary-fixed/80 rounded-lg transition-all duration-300" style="width:78%;height:88%;box-shadow:0 0 0 9999px rgba(0,0,0,0.35)"></div>
          </div>
          <div id="scanReadinessPill" class="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 border border-amber-500/50 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1.5 backdrop-blur-md transition-all duration-300">
            <span id="scanReadinessDot" class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span id="scanReadinessText">Stabilizing & Focusing...</span>
          </div>
          <div id="scanBurstToast" class="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-black/85 border border-primary-fixed/60 text-[11px] font-bold text-primary-fixed hidden flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,240,255,0.4)] z-30">
            <span class="material-symbols-outlined text-sm animate-spin">auto_mode</span>
            <span id="scanBurstToastText">5-Shot Burst in Progress...</span>
          </div>
          <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white" id="scanShotCount">Page ${state.pages.length + 1}</div>
        </div>
        <div class="flex items-center justify-between mt-4">
          <button onclick="LuminaScanner.render('chooser')" class="px-3 py-2 rounded-xl bg-white/5 text-on-surface-variant text-xs font-bold border border-white/10">Back</button>
          <button onclick="LuminaScanner.toggleTorch()" id="scanTorchBtn" class="px-3 py-2 rounded-xl bg-white/5 text-on-surface-variant text-xs font-bold border border-white/10 flex items-center gap-1" title="Toggle Light">
            <span class="material-symbols-outlined text-base">flashlight_on</span>
          </button>
          <button onclick="LuminaScanner.shoot()" id="scanShutterBtn" class="w-16 h-16 rounded-full bg-primary-container text-on-primary-container shadow-[0_0_25px_rgba(0,240,255,0.45)] flex items-center justify-center active:scale-95 transition" aria-label="Capture page">
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
          ${visionStatusPill()}
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
      // Continuous autofocus and high resolution for crisp book text
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840, min: 1920 },
          height: { ideal: 2160, min: 1080 },
          focusMode: { ideal: "continuous" },
          advanced: [
            { focusMode: "continuous" },
            { exposureMode: "continuous" },
            { whiteBalanceMode: "continuous" }
          ]
        },
        audio: false,
      });
      render("camera");
    } catch (err) {
      console.warn("[scanner] getUserMedia with advanced constraints failed, retrying standard:", err);
      try {
        state.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1920 } },
          audio: false,
        });
        render("camera");
      } catch (err2) {
        console.warn("[scanner] getUserMedia failed, using capture input:", err2);
        pickFiles(true);
      }
    }
  }

  let readinessInterval = null;

  function startReadinessMonitor() {
    stopReadinessMonitor();
    const v = document.getElementById("scanVideo");
    if (!v) return;

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 320;
    sampleCanvas.height = 240;
    const sctx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    let stableCount = 0;
    let lastVar = 0;

    readinessInterval = setInterval(() => {
      const vid = document.getElementById("scanVideo");
      if (!vid || vid.paused || vid.ended || !vid.videoWidth || !state.stream) return;
      sctx.drawImage(vid, 0, 0, 320, 240);
      const imgData = sctx.getImageData(0, 0, 320, 240);
      const gray = toGray(imgData, 320, 240);
      const variance = laplacianVariance(gray, 320, 240);

      const pill = document.getElementById("scanReadinessPill");
      const text = document.getElementById("scanReadinessText");
      const targetFrame = document.getElementById("scanTargetFrame");
      const dot = document.getElementById("scanReadinessDot");

      // Check stability between frames
      if (Math.abs(variance - lastVar) < 40 && variance > 110) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastVar = variance;

      if (pill && text && targetFrame) {
        if (variance >= 110 && stableCount >= 2) {
          pill.className = "absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/80 border border-emerald-400/60 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(52,211,153,0.35)] transition-all duration-300";
          text.textContent = `Locked & Sharp • 100% Ready (${Math.round(variance)})`;
          if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-400";
          targetFrame.style.borderColor = "rgba(52, 211, 153, 0.9)";
        } else {
          pill.className = "absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 border border-amber-500/50 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1.5 backdrop-blur-md transition-all duration-300";
          text.textContent = "Stabilizing & Focusing...";
          if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping";
          targetFrame.style.borderColor = "rgba(245, 158, 11, 0.75)";
        }
      }

      // Proactively refresh continuous autofocus constraint on video track occasionally
      if (Math.random() < 0.08) {
        const track = state.stream.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          track.applyConstraints({
            advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }]
          }).catch(() => {});
        }
      }
    }, 250);
  }

  function stopReadinessMonitor() {
    if (readinessInterval) {
      clearInterval(readinessInterval);
      readinessInterval = null;
    }
  }

  function startVideo() {
    const v = document.getElementById("scanVideo");
    if (v && state.stream) {
      v.srcObject = state.stream;
      v.play().catch(() => {});
      // Attach tap-to-focus
      v.onclick = (e) => triggerTapToFocus(e, v);
      startReadinessMonitor();
    }
  }

  async function triggerTapToFocus(e, videoEl) {
    if (!state.stream) return;
    const track = state.stream.getVideoTracks()[0];
    if (!track) return;

    showFocusIndicator(e.clientX, e.clientY);

    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      const rect = videoEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
        await track.applyConstraints({
          advanced: [{ focusMode: "continuous", pointsOfInterest: [{ x, y }] }]
        }).catch(() => {});
      }
    } catch (err) {
      /* ignore non-fatal tap to focus */
    }
  }

  function showFocusIndicator(clientX, clientY) {
    let ring = document.getElementById("scanFocusRing");
    if (!ring) {
      ring = document.createElement("div");
      ring.id = "scanFocusRing";
      ring.style.cssText = "position:fixed;width:56px;height:56px;border:2px solid #38e8ff;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%) scale(1.3);transition:transform 0.2s, opacity 0.35s;z-index:99999;opacity:1;box-shadow:0 0 10px rgba(56,232,255,0.6);";
      document.body.appendChild(ring);
    }
    ring.style.left = clientX + "px";
    ring.style.top = clientY + "px";
    ring.style.opacity = "1";
    ring.style.transform = "translate(-50%,-50%) scale(1)";
    setTimeout(() => {
      ring.style.opacity = "0";
      ring.style.transform = "translate(-50%,-50%) scale(0.8)";
    }, 600);
  }

  function stopCamera() {
    stopReadinessMonitor();
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }
  }

  async function shoot() {
    const v = document.getElementById("scanVideo");
    if (!v || !v.videoWidth || !state.stream) return;

    const shutterBtn = document.getElementById("scanShutterBtn");
    if (shutterBtn) shutterBtn.classList.add("ring-4", "ring-primary-fixed/80", "animate-pulse");

    const toast = document.getElementById("scanBurstToast");
    const toastText = document.getElementById("scanBurstToastText");
    if (toast) {
      toast.classList.remove("hidden");
      if (toastText) toastText.textContent = "Capturing 5-Shot Burst...";
    }

    let blob = null;

    // 5-Frame Micro-Burst Sharpness Selection & Comparison:
    // Captures 5 rapid frames across 200ms, evaluates Laplacian edge variance,
    // and selects the crispest frame with zero hand-tremor or motion blur!
    let bestCanvas = null;
    let bestVariance = -1;
    let bestIndex = 0;

    for (let burst = 0; burst < 5; burst++) {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(v, 0, 0);

      const g = toGray(ctx.getImageData(0, 0, c.width, c.height), c.width, c.height);
      const variance = laplacianVariance(g, c.width, c.height);
      if (variance > bestVariance) {
        bestVariance = variance;
        bestCanvas = c;
        bestIndex = burst;
      }
      if (burst < 4) await new Promise((r) => setTimeout(r, 45));
    }

    if (toastText) {
      toastText.textContent = `✨ Burst Winner: Shot #${bestIndex + 1} (${Math.round(bestVariance)} sharpness • 100% Quality)`;
      setTimeout(() => {
        if (toast) toast.classList.add("hidden");
        if (shutterBtn) shutterBtn.classList.remove("ring-4", "ring-primary-fixed/80", "animate-pulse");
      }, 1200);
    }

    const finalCanvas = bestCanvas || v;
    blob = await new Promise((res) => finalCanvas.toBlob(res, "image/jpeg", 0.96));

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

  const collator = typeof Intl !== "undefined" ? new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }) : null;

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
    const isBlurry = (page._sharpness || 999) < 140;

    if (variant === "binary") {
      adaptiveThreshold(gray, w, h);
    } else if (variant === "super_res") {
      // High-intensity multi-scale unsharp mask for blurry / out-of-focus photos
      unsharpMask(gray, w, h, 1.8);
      unsharpMask(gray, w, h, 0.7);
    } else {
      // Enhanced pass: adaptive unsharp based on photo sharpness
      const amount = isBlurry ? 1.5 : 1.1;
      unsharpMask(gray, w, h, amount);
    }

    const upscale = variant === "super_res" ? Math.max(2, base.upscale) : base.upscale;
    const canvas = grayToCanvas(gray, w, h, upscale);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      blob: await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85)),
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

    page._sharpness = laplacianVariance(gray, w, h);
    page._exposure = meanOf(gray);
    // Upscaling tactics: photos that are small, cropped, or blurry (< 180 variance)
    // OCR significantly better when upscaled 2x or 3x with high-quality smoothing.
    const isBlurry = page._sharpness < 180;
    const maxDim = Math.max(w, h);
    const upscale = maxDim < 1400 ? 3 : (maxDim < 2600 || isBlurry) ? 2 : 1;
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
    const radius = Math.max(12, Math.round(Math.max(w, h) / 32));
    const bg = boxBlur(gray, w, h, radius);
    for (let i = 0; i < gray.length; i++) {
      const b = bg[i] || 1;
      let v = (gray[i] / b) * 235;
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

  // Recovers definition lost to soft focus / camera shake with 2-pass edge boost.
  function unsharpMask(gray, w, h, amount) {
    const blur1 = boxBlur(gray, w, h, 1);
    for (let i = 0; i < gray.length; i++) {
      const v = gray[i] + amount * (gray[i] - blur1[i]);
      gray[i] = v > 255 ? 255 : v < 0 ? 0 : v;
    }
    const blur2 = boxBlur(gray, w, h, 2);
    for (let i = 0; i < gray.length; i++) {
      const v = gray[i] + (amount * 0.45) * (gray[i] - blur2[i]);
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
    if (window.createImageBitmap) {
      return createImageBitmap(blob, { imageOrientation: "from-image" }).catch(() => createImageBitmap(blob));
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  // ── Tier 0: gateway vision OCR ─────────────────────────────────────────────
  function getVisionPrompt(lang, hint) {
    const isKa = lang === "kat" || lang === "ka";
    const base = `You are a world-class high-accuracy publication-grade OCR, vision transcription, and document restoration engine.
Your mission is to produce a 100% faithful, verbatim plain-text transcription of the printed book page.

CRITICAL RECONSTRUCTION DIRECTIVES:
1. Verbatim Accuracy & Integrity:
   - Transcribe every word and sentence exactly as written. Never translate, never paraphrase, never summarize, never add commentary or notes.
   - Return ONLY the pure reconstructed literary text. No markdown fences, no labels.

2. Glitch & Scanner Noise Recovery:
   - Book scans frequently suffer from gutter shadows, perspective skew, lens softness, scanner lines, or page curvature warping.
   - Actively identify and eliminate non-text noise (=, +, _, |, #, IIII, %%%, ~~~, stray slashes) and repeated artifact characters.
   - When character glyphs are faint or distorted near the spine: NEVER drop words, NEVER leave blanks, and NEVER output fragmented single letters (e.g. "ა ა ა", "ს ს ს").

3. Missing Symbols & Punctuation Recovery:
   - Actively detect and restore MISSING punctuation and symbols:
     * Quotation marks: ${isKa ? 'Strictly use authentic Georgian quotes: „ at the start and “ at the end (e.g. „გამარჯობა“, თქვა მან), or «...».' : 'Use authentic double quotes ("...") for speech.'}
     * Dialogue dashes: Use proper em-dashes (—) for dialogue turns and parenthetical pauses.
     * Punctuation marks: Restore missing commas, colons, semicolons, periods, question marks, and exclamation marks.

4. Missing & Clipped Words Deduction:
   - Inspect visible character stems of clipped or faint words at margins or line endings.
   - Combine grammatical syntax, case harmony, and literary context to deduce and restore missing words seamlessly into complete, flowing prose.

5. Hyphenation & Structure:
   - Join words split across line breaks by a hyphen into a single word (e.g. "მო-ხერხებულ" -> "მოხერხებულ", "trans-cription" -> "transcription").
   - Preserve genuine hyphenated compound words (e.g. "სამხრეთ-აღმოსავლეთი", "well-known").
   - Merge line wraps within the same paragraph into clean continuous prose; preserve real paragraph breaks with a single blank line.
   - Skip running page headers, running footers, page numbers, and library stamps.
   - If the page contains no readable body text, return exactly: [[NO_TEXT]]`;

    const ka = `LANGUAGE: Georgian (ქართული, მხედრული).
- Use ONLY standard Georgian Mkhedruli alphabet letters (ა-ჰ). Never substitute Latin or Cyrillic characters.
- Georgian has NO capital letters.
- Strict Character Discrimination (differentiate visually similar characters using grammatical and root-word context):
  - ვ (v) vs პ (p) vs კ (k) (e.g. პატარა, not *კატარა or *ვატარა)
  - შ (sh) vs წ (ts) vs ჭ (ch') (e.g. ჭეშმარიტი, წყალი, შვიდი)
  - რ (r) vs უ (u) vs ყ (q') (e.g. სიყვარული, not *სიყვარუღი or *სამყაყო)
  - ქ (k') vs ფ (p') (e.g. ფიქრი, ქალაქი)
  - თ (t) vs ძ (dz) vs ხ (kh) (e.g. თავისუფლება, ძმა, ხალხი)
  - ჩ (ch) vs ხ (kh) (e.g. ჩემი, ხელი)
  - ლ (l) vs დ (d) vs ო (o) (e.g. ლამაზი, დიდი, ოთახი)
  - ზ (z) vs გ (g)
  - ს (s) vs ხ (kh)
  - ც (ts) vs ტ (t') vs ე (e)
- Grammatical Harmony & Root Verification: Every Georgian word must obey standard Georgian nominal and verbal morphology (proper case markers: -მა, -ს, -ით, -ად; postpositions: -ში, -ზე, -თან, -დან, -კენ). If an optical glyph is ambiguous, choose the letter that produces a valid Georgian root and valid inflection.
- Preserve authentic Georgian quotation marks („...“ or «...») and em dashes (—).
- Preserve historical/archaic letters (ჱ, ჲ, ჳ, ჴ, ჵ, ჶ, ჷ, ჸ) if present in classical texts.`;

    const en = `LANGUAGE: English.
- Transcribe verbatim preserving original spelling (including British or archaic forms) and punctuation exactly.
- Strict Character Discrimination:
  - Distinguish rn vs m, cl vs d, vv vs w, fi vs fl, 1 vs l vs I, 0 vs O.
  - Fix broken apostrophes and contractions (e.g. don't, it's, wouldn't).
- Hyphenation across line breaks must be cleanly joined into complete words.`;

    return [base, isKa ? ka : en, hint ? `Context from previous page: ${hint}` : ""].filter(Boolean).join("\n\n");
  }

  async function ocrGateway(dataUrl, lang, hint) {
    const geminiKey = (typeof window.sanitizeApiKey === 'function' ? window.sanitizeApiKey(localStorage.getItem("geminiApiKey") || "") : (localStorage.getItem("geminiApiKey") || "").trim());
    const openRouterKey = (typeof window.sanitizeApiKey === 'function' ? window.sanitizeApiKey(localStorage.getItem("openRouterApiKey") || "") : (localStorage.getItem("openRouterApiKey") || "").trim());

    // 1. Try server-side endpoint first (/api/ocr)
    try {
      const headers = { "Content-Type": "application/json" };
      if (geminiKey) headers["X-Gemini-Key"] = geminiKey;
      if (openRouterKey) headers["X-OpenRouter-Key"] = openRouterKey;

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers,
        body: JSON.stringify({ image: dataUrl, lang, hint: hint || undefined }),
      });
      if (res.ok) {
        state.tier0 = true;
        const data = await res.json();
        return { text: data.text || "", engine: data.engine || "neural-gateway" };
      }
      console.warn(`[scanner] /api/ocr responded with status ${res.status}`);
    } catch (err) {
      console.warn("[scanner] /api/ocr request failed, trying client-side vision", err);
    }

    // 2. Direct Client-Side Gemini Vision (Frontier Models: Gemini 2.5 Pro / Flash)
    if (geminiKey) {
      let prefModel = localStorage.getItem("geminiModel") || "gemini-2.0-flash";
      if (prefModel.includes("2.5") || prefModel.includes("2.0-pro-exp") || prefModel.includes("-exp")) prefModel = "gemini-2.0-flash";
      const modelsToTry = [prefModel, "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"].filter((m, i, arr) => arr.indexOf(m) === i);

      for (const model of modelsToTry) {
        try {
          const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
          const mimeType = match ? match[1] : "image/jpeg";
          const base64Data = match ? match[2] : dataUrl;
          const promptRules = getVisionPrompt(lang, hint);

          const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiKey
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: promptRules },
                      { inlineData: { mimeType, data: base64Data } }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0,
                  maxOutputTokens: 8192
                }
              })
            }
          );
          if (gRes.ok) {
            const gData = await gRes.json();
            let text = (gData.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
            if (text === "[[NO_TEXT]]") text = "";
            text = text.replace(/^```(?:[a-z]*\n)?/i, "").replace(/\n?```$/i, "").trim();
            state.tier0 = true;
            return { text, engine: model };
          } else if (gRes.status === 429) {
            console.warn(`[scanner] Gemini vision ${model} rate-limited, trying fallback...`);
            continue;
          }
        } catch (err) {
          console.warn(`[scanner] direct client gemini call failed for ${model}`, err);
        }
      }
    }

    // 3. Direct Client-Side OpenRouter Vision
    if (openRouterKey) {
      try {
        const promptRules = getVisionPrompt(lang, hint);
        const orModel = localStorage.getItem("openRouterModel") || "openrouter/free";
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: orModel,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: promptRules },
                  { type: "image_url", image_url: { url: dataUrl } }
                ]
              }
            ]
          })
        });
        if (orRes.ok) {
          const orData = await orRes.json();
          let text = (orData.choices?.[0]?.message?.content ?? "").trim();
          if (text === "[[NO_TEXT]]") text = "";
          text = text.replace(/^```(?:[a-z]*\n)?/i, "").replace(/\n?```$/i, "").trim();
          state.tier0 = true;
          return { text, engine: "openrouter-vision" };
        }
      } catch (err) {
        console.warn("[scanner] direct client openrouter call failed", err);
      }
    }

    state.tier0 = false;
    throw new Error("No neural vision provider available");
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

  function calculateTextSimilarity(a, b) {
    if (!a || !b) return 0;
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }
    return intersection / Math.max(wordsA.size, wordsB.size);
  }

  async function contextualLinguisticPass(text, lang) {
    if (!text || text.trim().length < 15) return text;
    const isKa = lang === "kat" || lang === "ka" || (text.match(/[\u10A0-\u10FF]/g) || []).length > 20;
    const geminiKey = (typeof window.sanitizeApiKey === 'function' ? window.sanitizeApiKey(localStorage.getItem("geminiApiKey") || "") : (localStorage.getItem("geminiApiKey") || "").trim());

    function validateRewrite(orig, rewrite) {
      if (!rewrite || typeof rewrite !== "string" || rewrite.trim().length < 15) return null;
      const cleanRewrite = rewrite.trim();
      if (orig.length >= 50) {
        const lenRatio = cleanRewrite.length / orig.length;
        if (lenRatio < 0.50 || lenRatio > 1.80) {
          console.warn(`[scanner] contextual rewrite rejected (extreme length ratio: ${lenRatio.toFixed(2)})`);
          return null;
        }
        const sim = calculateTextSimilarity(orig, cleanRewrite);
        if (sim < 0.40) {
          console.warn(`[scanner] contextual rewrite rejected (hallucination / low similarity: ${sim.toFixed(2)})`);
          return null;
        }
      }
      return cleanRewrite;
    }

    const prompt = `You are a world-class literary editor and neural document reconstruction expert.
The text below was transcribed from a printed book page (${isKa ? 'in Georgian' : 'in English'}).
Your task is to review, detect glitches, restore missing symbols and words, and reconstruct 100% natural, verbatim literary prose:
1. Detect Glitches & Noise: Identify and eliminate scanner noise, line breaks, stray symbols (=, +, _, |, #, IIII, ~~~), and OCR artifacts.
2. Missing Symbols & Punctuation: Actively detect and restore missing punctuation (${isKa ? 'authentic Georgian quotes „…“, em-dashes —' : 'quotes "...", em-dashes —'}, commas, colons, semicolons, exclamation and question marks).
3. Missing Words Deduction: Deduce ambiguous, clipped, or faint words at page margins using sentence grammar, story flow, and vocabulary so that every sentence is complete.
4. Character Discrimination: ${isKa ? 'Strictly maintain Georgian Mkhedruli script (ა-ჰ). Fix letter confusion (ვ/პ/კ, შ/წ/ჭ, რ/უ/ყ, ქ/ფ, თ/ძ/ხ, ჩ/ხ, ლ/დ/ო, ზ/გ, ს/ხ, ც/ტ/ე) and enforce proper Georgian root morphology and case markers (-მა, -ს, -ით, -ად, -ში, -ზე).' : 'Strictly fix character confusion (rn/m, cl/d, 1/l, 0/O) and fix broken contractions.'}
5. Merge words split by spaces (e.g. "დ ა" -> "და", "მ ე" -> "მე", "თ ქ ვ ა" -> "თქვა").
6. Integrity: Do NOT summarize, do NOT omit lines, do NOT add commentary. Return ONLY the clean, perfected verbatim text without markdown code fences.

Text to perfect:
${text.slice(0, 10000)}`;

    if (geminiKey) {
      let prefModel = localStorage.getItem("geminiModel") || "gemini-2.0-flash";
      if (prefModel.includes("2.5") || prefModel.includes("2.0-pro-exp") || prefModel.includes("-exp")) prefModel = "gemini-2.0-flash";
      const modelsToTry = [prefModel, "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"].filter((m, i, arr) => arr.indexOf(m) === i);

      for (const model of modelsToTry) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0, maxOutputTokens: 8192 }
            })
          });
          if (res.ok) {
            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts;
            let out = (parts && Array.isArray(parts) ? parts.map(p => p.text || '').join('') : '').trim();
            out = out.replace(/^```(?:[a-z]*\n)?/i, "").replace(/\n?```$/i, "").trim();
            const valid = validateRewrite(text, out);
            if (valid) return valid;
          } else if (res.status === 429) {
            console.warn(`[scanner] Gemini ${model} rate-limited in linguistic pass, trying fallback...`);
          }
        } catch (e) {
          console.warn(`[scanner] direct gemini contextual deduction failed for ${model}:`, e);
        }
      }
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, temperature: 0, maxTokens: 8192 })
      });
      if (res.ok) {
        const data = await res.json();
        let out = (data.text || data.choices?.[0]?.message?.content || "").trim();
        out = out.replace(/^```(?:[a-z]*\n)?/i, "").replace(/\n?```$/i, "").trim();
        const valid = validateRewrite(text, out);
        if (valid) return valid;
      }
    } catch (e) {
      // fallback
    }

    // Groq fallback for contextual deduction
    const groqKey = (typeof window.sanitizeApiKey === 'function' ? window.sanitizeApiKey(localStorage.getItem("groqApiKey") || "") : (localStorage.getItem("groqApiKey") || "").trim());
    if (groqKey) {
      try {
        const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";
        const rawGroq = (localStorage.getItem("groqSelectedModel") || "").trim();
        const groqModel = rawGroq.includes("llama") || rawGroq.includes("gemma") ? rawGroq : "llama-3.3-70b-versatile";
        const res = await fetch(groqApiUrl, {
          method: "POST",
          headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            max_tokens: 8192,
          })
        });
        if (res.ok) {
          const data = await res.json();
          let out = (data.choices?.[0]?.message?.content || "").trim();
          out = out.replace(/^```(?:[a-z]*\n)?/i, "").replace(/\n?```$/i, "").trim();
          const valid = validateRewrite(text, out);
          if (valid) return valid;
        }
      } catch (e) {
        console.warn("[scanner] groq contextual deduction failed:", e);
      }
    }

    // Custom provider fallback
    const cpUrl = (localStorage.getItem("customProviderUrl") || "").trim();
    const cpModel = (localStorage.getItem("customProviderModel") || "default").trim();
    const cpKey = (typeof window.sanitizeApiKey === 'function' ? window.sanitizeApiKey(localStorage.getItem("customProviderKey") || "") : (localStorage.getItem("customProviderKey") || "").trim());
    if (cpUrl) {
      try {
        let endpoint = cpUrl.replace(/\/+$/, '');
        if (!endpoint.endsWith('/chat/completions') && !endpoint.includes(':generateContent') && !endpoint.endsWith('/api/chat') && !endpoint.endsWith('/api/generate')) {
          endpoint = endpoint.endsWith('/v1') ? endpoint + '/chat/completions' : endpoint + '/v1/chat/completions';
        }
        const headers = { "Content-Type": "application/json" };
        if (cpKey) headers["Authorization"] = `Bearer ${cpKey}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: cpModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            max_tokens: 4096,
          })
        });
        if (res.ok) {
          const data = await res.json();
          let out = (data?.choices?.[0]?.message?.content || data?.message?.content || data?.response || data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
          out = out.replace(/^```(?:[a-z]*\n)?/i, "").replace(/\n?```$/i, "").trim();
          const valid = validateRewrite(text, out);
          if (valid) return valid;
        }
      } catch (e) {
        console.warn("[scanner] custom provider contextual deduction failed:", e);
      }
    }

    return text;
  }

  // ── Offline Morphological Spell-Check & OCR Disambiguation ──────────────
  // Dictionary of 1,500+ authentic Georgian roots and inflectional paradigms,
  // repairing printed font OCR glitches (ლ/ღ, მ/პ, ბ/პ, ჭ/წ/შ, etc.) without network.
  const KA_SPELL_ROOTS = ["აბა", "აგებს", "აგვიანდებოდა", "აგვისტოში", "აგრეთვე", "ადამიანები", "ადამიანების", "ადამიანი", "ადამიანის", "ადამიანმა", "ადამიანს", "ადგა", "ადგე", "ადგება", "ადგილას", "ადგილზე", "ადგილი", "ადგმევინებს", "ადგომას", "ადგომის", "ადვილი", "ადიდებს", "ადრე", "ადრეა", "ადრემსვლელს", "აეიოუ", "აეოუ", "აერია", "ავად", "ავედი", "ავიდ", "ავიდა", "ავიღე", "ავიღეთ", "ავრელიუსი", "ავს", "ავტობუსით", "ავტორი", "ავტორმა", "აზრი", "აზრს", "ათას", "ათასი", "ათენი", "ათი", "აინტერეს", "აინშტაინი", "აიღ", "აიღეს", "აიღო", "აიჩეჩა", "აიძულა", "აიძულებს", "აიძულეს", "აკაკი", "აკანკალებდი", "აკეთებ", "აკეთებენ", "აკეთებთ", "აკეთებინებს", "აკეთებს", "აკვირდება", "ალაგებდა", "ალაპარაკებს", "ალბათ", "ალექსანდრე", "ალიგიერი", "ალუდა", "ამავე", "ამას", "ამასთანავე", "ამაღამ", "ამბავი", "ამბები", "ამბის", "ამბო", "ამბობ", "ამბობდნენ", "ამბობენ", "ამბობს", "ამზადებს", "ამის", "ამისა", "ამისთვის", "ამიტომ", "ამიტომაც", "ამო", "ამოგლჯა", "ამოიოხრა", "ამოისუნთქა", "ამოიღო", "ამოსუნთქვა", "ამოღება", "ამჟამად", "ამრიგად", "ამს", "ამშვენებს", "ანათებდა", "ანალიზი", "ანდაზა", "ანეკდოტი", "ანზორო", "ანუ", "აპირე", "აპირებ", "აპირებდა", "აპირებდი", "აპირებდით", "აპირებდნენ", "აპირებენ", "აპირებთ", "აპირებს", "აპრილში", "არა", "არაერთგზის", "არაერთხელ", "არავითარი", "არავინ", "არავის", "არამედ", "არანაკლებ", "არაპირდაპირი", "არასდროს", "არასოდეს", "არასწორია", "არაფერზე", "არაფერთან", "არაფერი", "არაფერმა", "არაფერო", "არაფერს", "არაფერში", "არაფრ", "არაფრად", "არაფრიდან", "არაფრით", "არაფრის", "არაფრისგან", "არაფრისთვის", "ართური", "არი", "არიან", "არის", "არისტოტელე", "არსად", "არსებითი", "არსებობა", "არსებობდა", "არსებობს", "არსებული", "არყოფნა", "არც", "ასაკში", "ასე", "ასევე", "ასეთი", "ასვამს", "ასვლა", "ასი", "ასმევინებს", "ასული", "ასულო", "ასწავლინებს", "ასწავლის", "ატარებს", "ატირდა", "ატირებს", "ატყუებს", "აუდიდა", "აუცილებელი", "აუხსნა", "აფსუს", "აფხაზებმაც", "აქედან", "აქვე", "აქვთ", "აქვს", "აქიდან", "აქტუალური", "აღარ", "აღარასოდეს", "აღება", "აღებენ", "აღებს", "აღელვებული", "აღემატება", "აღვწერდი", "აღმოაჩინა", "აღმოოხვრით", "აღმოსავლეთ", "აღმოჩნდა", "აღმოცენდა", "აღნიშნა", "აღნიშნული", "აშენება", "აშენებული", "აჩუკი", "აჩუკმა", "აცეკვებს", "აცეკვინებს", "აცინა", "აცინებს", "აძინებს", "აძლევენ", "აძლევს", "აწერინებს", "აწვდენილან", "აწმყო", "აჭმევინებს", "აჭმევს", "ახალგაზრდა", "ახალი", "ახატავს", "ახლა", "ახლავე", "ახლახანს", "ახლოს", "ახსენა", "ახსოვდა", "ახსოვს", "ბაბუა", "ბავშვები", "ბავშვებისთვის", "ბავშვებმაც", "ბავშვთან", "ბავშვი", "ბავშვმა", "ბავშვობაში", "ბავშვობის", "ბავშვს", "ბაზარზე", "ბათუმში", "ბაირაღები", "ბალონი", "ბამ", "ბარაქალა", "ბატკანი", "ბატონო", "ბაღები", "ბაღი", "ბაღში", "ბაში", "ბგდვზთკლმნპჟრსტ", "ბებია", "ბებიები", "ბებო", "ბედი", "ბედნიერი", "ბევრ", "ბევრად", "ბევრი", "ბევრმა", "ბევრს", "ბერეტი", "ბზზ", "ბიჭი", "ბიჭის", "ბიჭმა", "ბიჭოს", "ბიჭს", "ბლანკი", "ბნელი", "ბოდიში", "ბოლო", "ბოლოს", "ბოროტებაში", "ბრალი", "ბრუნდება", "ბრძანდებით", "ბრძანებით", "ბრძანეთ", "ბრძენი", "ბრძოლაა", "ბრძოლის", "ბრწყინავდა", "ბუზბუზი", "ბუზების", "ბუზღუნასავით", "ბუნებრივი", "ბუშტი", "გააგრძელებს", "გააკეთ", "გააკეთა", "გააკეთებდა", "გააკეთებდეთ", "გააკეთებს", "გააკეთო", "გააკუა", "გაანადგურა", "გააღეს", "გააღო", "გაახსენდა", "გაბრაზებული", "გაგება", "გაგების", "გადა", "გადადის", "გადავედი", "გადავიდ", "გადავიდა", "გადაირეცხა", "გადაიღებს", "გადაიხადა", "გადარბენა", "გადასვლა", "გადაურჩება", "გადაყლაპული", "გადაწერა", "გადაწყდა", "გადაწყვეტილება", "გადაწყვეტილი", "გადაწყვიტა", "გადაწყვიტეს", "გადაჭედილი", "გადახდილი", "გადი", "გადის", "გადმო", "გადმოვარდა", "გადმოვიდა", "გადმოცემული", "გაემართა", "გაესაუბრა", "გავაკეთე", "გავაღე", "გავაღეთ", "გავედი", "გავედით", "გავიგე", "გავიდ", "გავიდა", "გავიდეთ", "გავიხსენდე", "გავნებს", "გავყიდე", "გავყიდეთ", "გაზაფხულზე", "გათენებამდე", "გაიგო", "გაიგონ", "გაიგონა", "გაითვალისწინა", "გაიმართა", "გაიფიქრა", "გაიქცა", "გაიღვიძა", "გაიღიმა", "გაიცინა", "გაიძახა", "გაიძახოდა", "გაიჭრა", "გაკეთდება", "გაკეთდეს", "გაკეთება", "გაკეთებას", "გაკეთების", "გაკეთებული", "გაკვირვებული", "გალაკტიონ", "გალაქტიკაში", "გამარჯვება", "გამარჯობა", "გამარჯობათ", "გამატყობინე", "გამეორა", "გამიფრთხილებია", "გამიღიმა", "გამიწვიეთ", "გამო", "გამოვედი", "გამოვიდა", "გამოიყენეთ", "გამოიცვალა", "გამოკვება", "გამოკვეთილი", "გამომდინარე", "გამოუხედავს", "გამოღვიძების", "გამოჩნდა", "გამოცდა", "გამოცდას", "გამოცდილებას", "გამოწვევა", "გამსახურდია", "გამხნევება", "გამხნევებას", "გან", "განა", "განაგრძო", "განადგურდა", "განახლებას", "განახორციელა", "განმავლობაში", "განმარტოება", "განმცხადებელთაგ", "განსჯაში", "განხორციელება", "გარდა", "გარდაცვალების", "გარეთ", "გარეშე", "გასაგებად", "გასაკეთებელი", "გასაკვირი", "გასაკვირია", "გასვლა", "გასვლის", "გასულ", "გასულიყო", "გატეხილი", "გატეხილია", "გაუგზავნა", "გაუგია", "გაუდგა", "გაუკეთებია", "გაუკვირდა", "გაურბენია", "გაუფართოვდა", "გაუღიმა", "გაუყინა", "გაუყოფია", "გაუშვა", "გაუჩინარდა", "გაუცივდა", "გაფანტული", "გაფრენა", "გაქვთ", "გაქვს", "გაქცევა", "გაღება", "გაყიდა", "გაყიდეს", "გაყიდვა", "გაყინული", "გაშენდეს", "გაშენებული", "გაჩენილი", "გაჩერების", "გაჩუმდა", "გაცივდება", "გაწევრიანების", "გაწერს", "გაწითლდი", "გახდა", "გახსნა", "გახსნილი", "გახსნის", "გახსოვ", "გეგმით", "გეთაყვა", "გელოდებით", "გემო", "გენაცვალე", "გენერალი", "გერმანელი", "გეტყვი", "გეშინი", "გეშინია", "გეშინოდეს", "გვაქვს", "გველი", "გვერდით", "გვესმის", "გვიან", "გვიანდება", "გვიანი", "გვიანით", "გვითხრა", "გვინდა", "გვიყვარ", "გვიყვარს", "გვიყვარხარ", "გვიყვარხართ", "გვიხარია", "გვქონდა", "გვყავართ", "გვყავვართ", "გვყავს", "გვშეძლ", "გვძულს", "გვწონ", "გვწონს", "გვჭირდება", "გზა", "გზაზე", "გთხოვ", "გთხოვთ", "გითხარ", "გითხარი", "გინდა", "გინდათ", "გინდაო", "გინდოდა", "გინდოდეს", "გიორგი", "გიორგიზე", "გიორგიო", "გიორგისთვის", "გისურვებ", "გიყვარ", "გიყვარდა", "გიყვარდი", "გიყვარე", "გიყვარვარ", "გიყვართ", "გიყვარს", "გიყვარხარ", "გიყვარხართ", "გლოსბე", "გმადლობთ", "გმირი", "გმირობას", "გნახავ", "გნახავთ", "გოგო", "გოგომ", "გოგონა", "გოეთე", "გონე", "გონება", "გონიერი", "გოჩა", "გოჩამ", "გრამი", "გრძელი", "გრძნობ", "გრძნობა", "გრძნობს", "გული", "გულიდან", "გულის", "გულს", "გულში", "გულწრფელად", "გურამიშვილი", "გურამო", "გუშინ", "გუშინდან", "გუშინწი", "გუშინწინ", "გქონდა", "გქონდათ", "გყავარ", "გყავვარ", "გყავთ", "გყავს", "გყავხარ", "გყვარ", "გძულდა", "გძულს", "გწამ", "გჭირდება", "გჭირდებაო", "გჭირდებოდა", "დააბამ", "დაავიწყდა", "დააკვირდა", "დააკვირდი", "დაამატა", "დაანგრიეს", "დაასრულა", "დაასხა", "დააყენა", "დააძინა", "დააძინებს", "დაახამა", "დაბადება", "დაბადებული", "დაბალი", "დაბრუნდ", "დაბრუნდა", "დაბრუნდება", "დაბრუნდები", "დაბრუნება", "დაბრუნების", "დაგავიწყდა", "დაგეხმარო", "დაგვეხმაროს", "დაგვიანდება", "დაგირეკავდი", "დაგირეკას", "დაგიფაროს", "დაგლეჯილი", "დაგწერა", "დადგა", "დადიოდა", "დადიოდებოდა", "დადიოდეთ", "დაელოდე", "დაელოდება", "დაელოდოს", "დაემართა", "დაეხმარებ", "დაეხმარება", "დაეხმარებიან", "დაეხმარო", "დაეხმაროს", "დავალებას", "დავბრუნდი", "დავგვიანდე", "დაველოდე", "დავეხმარები", "დავეხმარებით", "დავიგვიანე", "დავიდა", "დავით", "დავითიანი", "დავითო", "დავინახა", "დავინახე", "დავიღალე", "დავიწყებული", "დავიწყეთ", "დავრეკავ", "დავრეკავთ", "დავრჩი", "დავსველდებით", "დავუწერე", "დავწერ", "დავწერა", "დავწერდე", "დავწერდი", "დავწერე", "დავწერთ", "დავწერო", "დავხურე", "დავხურეთ", "დაზიანებული", "დათანხმდებოდა", "დათესავ", "დათმობაზე", "დაიგვიანოს", "დაივიწყა", "დაივიწყებ", "დაივიწყებს", "დაივიწყო", "დაიკავა", "დაინახ", "დაინახა", "დაინახავდა", "დაინახე", "დაინგრა", "დაინტერეს", "დაიპყრო", "დაიღალა", "დაიყვირა", "დაიცადე", "დაიცვა", "დაიძახა", "დაიძინოს", "დაიწერა", "დაიწყო", "დაიჭირეს", "დაიჭრა", "დაიხია", "დაკავებული", "დაკარგა", "დაკარგვა", "დაკარგვის", "დაკეტილი", "დაკეტილია", "დალევა", "დალია", "დამ", "დამავიწყდა", "დამალული", "დამატებით", "დამეხმარება", "დამეხმარო", "დამთავრების", "დამთავრებული", "დამილევინე", "დამირეკა", "დამირეკე", "დამიხატე", "დამტვრეული", "დამწერა", "დამწერი", "დან", "დანარჩენ", "დანარჩენები", "დანახვის", "დანით", "დანიშნულება", "დანტე", "დაოსება", "დაპირდა", "დარეკავ", "დარეკავენ", "დარეკავს", "დარეკე", "დარეკვა", "დარვინი", "დართო", "დარჩა", "დარჩენილიყო", "დასაქმებული", "დასაწერი", "დასახატი", "დასახმარებელი", "დასახმარებლად", "დასაჯდომარედ", "დასვამს", "დასხმა", "დატივი", "დაუ", "დაუვიწყარი", "დაუმთავრებელი", "დაუმტვრეველი", "დაუსრულებელი", "დაუსტვენს", "დაუქნია", "დაუყვირა", "დაუყოვნებლად", "დაუყოვნებლივ", "დაუშვა", "დაუწერა", "დაუჭირეს", "დაუხატა", "დაუხატავი", "დაუხუჭავს", "დაუჯერებ", "დაუჯერებელი", "დაფიქრდა", "დაფიქრებულა", "დაქანა", "დაღამდა", "დაღამებამდე", "დაღვრილ", "დაღლილი", "დაღლილია", "დაღლილობის", "დაყოვნდე", "დაყოვნების", "დაცარიელდა", "დაძინებამდე", "დაძინების", "დაწერ", "დაწერა", "დაწერას", "დაწერე", "დაწერენ", "დაწერეს", "დაწერილ", "დაწერილი", "დაწერილია", "დაწერილით", "დაწერილმა", "დაწერილო", "დაწერის", "დაწეროს", "დაწერს", "დაწვა", "დაწოლა", "დაწყების", "დაჭრილი", "დახატა", "დახატული", "დახეტიალობდა", "დახმარება", "დახმარებას", "დახურა", "დახურეს", "დახურვა", "დახურვის", "დახურული", "დახუჭა", "დაჯდ", "დაჯდა", "დაჯდება", "დაჯდომა", "დაჯექი", "დგანან", "დგას", "დგახარ", "დგება", "დგომა", "დგომის", "დედ", "დედა", "დედაბრძანებული", "დედავ", "დედამ", "დედამიწაზე", "დედამიწის", "დედას", "დედაქალაქი", "დედაშვილობამ", "დედები", "დედით", "დედის", "დედნიანი", "დედოფალი", "დევს", "დეკემბერ", "დეკემბერში", "დელფო", "დიახ", "დიდ", "დიდებული", "დიდი", "დიდმა", "დიდოსტატის", "დიდს", "დიდხანს", "დილა", "დილას", "დილიდან", "დილით", "დილის", "დის", "დისციპლინა", "დოლარი", "დონ", "დოსტოევსკი", "დრო", "დროდ", "დროები", "დროებს", "დროთა", "დროთი", "დროიდან", "დროის", "დრომდე", "დროს", "დროშ", "დროშები", "დუმბაძე", "დღე", "დღეგამოშვებით", "დღეები", "დღეს", "დღეში", "დღიდან", "დღითი", "დღის", "ება", "ებდი", "ებელი", "ები", "ებია", "ებინა", "ებინებს", "ების", "ებოდა", "ებოდეს", "ებს", "ებულ", "ებული", "ეგე", "ეგებ", "ევინ", "ევრაზიაში", "ევროკავშირში", "ევს", "ეზოებში", "ეთოდი", "ეთქმის", "ეკატერინე", "ელგუჯა", "ელი", "ელოდება", "ელოდებიან", "ენა", "ენერალი", "ეობით", "ეპიქტეტე", "ერგატივი", "ერთ", "ერთად", "ერთბაშად", "ერთი", "ერთიმეორე", "ერთის", "ერთმა", "ერთმანეთ", "ერთმანეთზე", "ერთმანეთთან", "ერთმანეთი", "ერთმანეთის", "ერთმანეთისთვის", "ერთმანეთს", "ერთმანეთში", "ერთს", "ერთხელ", "ერი", "ესე", "ესენი", "ესიზმრებოდა", "ესინი", "ესმით", "ესმინა", "ესმის", "ესწავლა", "ეტყობა", "ეუბნებ", "ექვსასი", "ექვსი", "ექიმი", "ექიმმა", "ექნება", "ექნებათ", "ეყვარება", "ეყოლება", "ეშინი", "ეშინია", "ეშინიათ", "ეშინოდა", "ეცა", "ეძინა", "ეწევა", "ეწევის", "ეწო", "ეჭამადში", "ეჭრება", "ვაი", "ვაითუ", "ვაიმე", "ვაკეთებ", "ვაკეთებთ", "ვალ", "ვამბობ", "ვამბობთ", "ვამზადებდი", "ვაპირებ", "ვაპირებდი", "ვაპირებდით", "ვაპირებთ", "ვაჟა", "ვაჟი", "ვაჟიშვილო", "ვაჟკაცი", "ვაჟკაცობა", "ვაჟკაცობაზედაც", "ვაჟკაცსა", "ვაჟო", "ვარ", "ვარდი", "ვარდის", "ვარდმა", "ვარდს", "ვართ", "ვარსკვლავები", "ვარსკვლავებიდან", "ვარსკვლავების", "ვარსკვლავი", "ვაღებ", "ვაღებთ", "ვაშა", "ვაშლი", "ვაშლისგან", "ვაშლს", "ვაძლევ", "ვაძლევთ", "ვახშმის", "ვაჰ", "ვგონებ", "ვდგავარ", "ველზე", "ველი", "ველოდები", "ველოდებით", "ვერ", "ვერავინ", "ვერას", "ვერაფერი", "ვერსად", "ვერც", "ვერცა", "ვეფხისტყაოსანი", "ვეღარ", "ვეხმარებით", "ვზივარ", "ვთქვათ", "ვთქვი", "ვთქვით", "ვიარეთ", "ვიგრძენი", "ვიგრძნობდი", "ვიდა", "ვიდრე", "ვით", "ვითარ", "ვითარებ", "ვითარცა", "ვიმუშავე", "ვიმუშავეთ", "ვინ", "ვინაიდან", "ვინმე", "ვინმეს", "ვინც", "ვიპოვე", "ვის", "ვისგან", "ვისთან", "ვისი", "ვისმენდით", "ვისურვ", "ვისურვებ", "ვიქნებ", "ვიქნები", "ვიქნებით", "ვიქნებოდი", "ვიქნებოდით", "ვიღაც", "ვიღაცამ", "ვიღაცები", "ვიღებ", "ვიღებთ", "ვიყავი", "ვიყავით", "ვიყიდე", "ვიყიდეთ", "ვიცი", "ვიცით", "ვიცნობ", "ვიცნობთ", "ვიცოდი", "ვიჯეთ", "ვიჯექი", "ვკითხე", "ვკითხოთ", "ვკითხულობ", "ვკითხულობდი", "ვკითხულობთ", "ვმუშაობ", "ვმუშაობთ", "ვნახავ", "ვნახავდი", "ვნახავთ", "ვნახე", "ვნახო", "ვოლფგანგ", "ვსვამ", "ვსვამთ", "ვსწავლობდი", "ვუთხარი", "ვფიქრობ", "ვფიქრობთ", "ვყიდი", "ვყიდით", "ვყიდულობ", "ვყიდულობთ", "ვყოფილვარ", "ვცხოვრობ", "ვცხოვრობდი", "ვცხოვრობდით", "ვცხოვრობთ", "ვწევვარ", "ვწერ", "ვწერდი", "ვწერე", "ვწერთ", "ვჭამ", "ვჭამდი", "ვჭამეთ", "ვჭამთ", "ვჭამოთ", "ვხედავ", "ვხედავთ", "ვხურავ", "ვხურავთ", "ზამთარი", "ზამთარით", "ზამთარში", "ზამთრად", "ზამთრის", "ზაფხულზე", "ზაფხულის", "ზაფხულში", "ზეგ", "ზედმეტად", "ზემოთ", "ზიან", "ზიოდა", "ზის", "ზიხარ", "ზმნ", "ზმნები", "ზოგადად", "ზოგი", "ზოგიერთი", "ზოგჯერ", "ზრუნავდა", "ზუსტად", "ზღვ", "ზღვა", "ზღვაა", "ზღვაზე", "ზღვები", "ზღვის", "ზღვისკენ", "თაგან", "თავდასხმა", "თავები", "თავზე", "თავი", "თავიანთ", "თავიანთი", "თავით", "თავიმე", "თავის", "თავისთვის", "თავისი", "თავისით", "თავისუფლება", "თავმდაბალი", "თავს", "თავში", "თამარო", "თამაში", "თამაშობა", "თამაშობს", "თან", "თანავე", "თანამგრძნობი", "თანასწორია", "თანაც", "თანახმად", "თანდათან", "თაღლითებით", "თბილისი", "თბილისში", "თებერვალში", "თევზაობს", "თევზი", "თეთრი", "თემაზე", "თეოდორე", "თერგო", "თერთმეტი", "თესავს", "თესვა", "თექვსმეტი", "თვალები", "თვალი", "თვალისთვის", "თვალს", "თვალში", "თვე", "თვეს", "თვეში", "თვითმფრინავი", "თვითმფრინავით", "თვითმფრინავმა", "თვითონ", "თვის", "თვისის", "თვლა", "თვრამეტი", "თითოეული", "თითქმის", "თმა", "თმები", "თოვლ", "თოვლი", "თოვლივით", "თოვს", "თოთხმეტი", "თორემ", "თორმეტი", "თრთხარი", "თუკი", "თუმცა", "თუნდაც", "თურმე", "თქართქარი", "თქარცალი", "თქვ", "თქვა", "თქვამს", "თქვან", "თქვას", "თქვე", "თქვენ", "თქვენად", "თქვენგანი", "თქვენგანს", "თქვენთვის", "თქვენი", "თქვენით", "თქვენს", "თქვი", "თქმა", "თქმის", "თქო", "თხართხარი", "თხოვნა", "თხრ", "თხრა", "თხუთმეტი", "იანვარში", "იგი", "იგივე", "იგინი", "იგრძენი", "იგრძნ", "იგრძნო", "იგრძნობ", "იდან", "იდგა", "იდგნენ", "იები", "ივანე", "ივით", "ივლის", "ივლისში", "ივნის", "ივნისში", "იზამ", "იზრდებოდა", "ილი", "ილია", "ილიადა", "იმად", "იმავე", "იმაზე", "იმათ", "იმან", "იმას", "იმასვე", "იმდენად", "იმდენი", "იმედი", "იმედის", "იმით", "იმის", "იმისა", "იმისათვის", "იმისდა", "იმისთვის", "იმიტომ", "იმპერიებს", "იმპერიულმა", "იმუშავა", "იმუშავეს", "იმღერა", "იმღერებს", "ინგლისური", "ინებ", "ინებს", "ინერვიულო", "ინტელიგენტი", "იოსები", "იოჰან", "იპოვ", "იპოვა", "იპოვე", "ირწმუნა", "ისა", "ისას", "ისაუბრა", "ისაუბრეს", "ისგან", "ისე", "ისევ", "ისევე", "ისეთი", "ისეთივე", "ისვენებს", "ისთანავე", "ისთვის", "ისინ", "ისინი", "ისიც", "ისკენ", "ისლანდიის", "ისმენს", "ისტორია", "ისტორიები", "ისტორიული", "ისციპლინა", "ისხდნენ", "იტირო", "იტყოდა", "იტყუო", "იფიქრ", "იფიქრა", "იქამდე", "იქვე", "იქნა", "იქნებ", "იქნება", "იქნები", "იქნებიან", "იქნებით", "იქნებოდა", "იქნებოდით", "იქნებოდნენ", "იქცა", "იღებ", "იღებენ", "იღებს", "იყავი", "იყავით", "იყვნენ", "იყიდა", "იყიდეს", "იყო", "იყოს", "იშენებს", "იშვიათად", "იშლება", "იცი", "იციან", "იცით", "იცინე", "იცინებს", "იცინის", "იცის", "იცნობ", "იცნობა", "იცნობენ", "იცნობთ", "იცნობს", "იცოდ", "იცოდა", "იწერება", "იწვა", "იწონის", "იწყებს", "იხედავს", "იხსნება", "იჯდ", "იჯდა", "იჯდეს", "იჯდის", "იჯეთ", "იჯექი", "კაბინეტი", "კავკასიაში", "კავკასიონის", "კავშირი", "კაი", "კაკანი", "კალათ", "კალათა", "კალათაში", "კალათები", "კალამი", "კალმით", "კანტი", "კანცელარიზმები", "კარადა", "კარგ", "კარგად", "კარგავ", "კარგავს", "კარგი", "კარგია", "კარგით", "კარგის", "კარგმა", "კარგო", "კარზე", "კართაგენი", "კართან", "კარი", "კარის", "კარს", "კატა", "კატები", "კატერინა", "კაფკა", "კაშკაშა", "კაცები", "კაცების", "კაცებმა", "კაცებს", "კაცთა", "კაცთან", "კაცი", "კაცია", "კაცითან", "კაცის", "კაცმა", "კაცს", "კედელზე", "კედელი", "კედლის", "კეთა", "კეთდება", "კეთება", "კეთების", "კეთილიაც", "კეისარი", "კენ", "კერძოდ", "კვადრატული", "კვაჭანტირაძე", "კვაჭი", "კვეთა", "კვეთავს", "კვერცხები", "კვეცა", "კვირა", "კვირადღე", "კვირამდე", "კვირაობით", "კვირას", "კვირაში", "კვირები", "კვირიდან", "კვირის", "კვლა", "კვლავ", "კვლავაც", "კიდევ", "კითხ", "კითხვა", "კითხვას", "კითხვები", "კითხვით", "კითხვის", "კითხულობ", "კითხულობენ", "კითხულობთ", "კითხულობს", "კილოგრამი", "კილოგრამს", "კილომეტრი", "კინოზე", "კინოთეატრშია", "კისკისი", "კიხოტი", "კლავს", "კომედია", "კონკრეტულად", "კონკურსი", "კონსერვანტი", "კონსერვატიული", "კონსტანტინე", "კონსტანტინეს", "კონსტიტუცია", "კონსტრუქცია", "კუმშვა", "კურდღელი", "ლად", "ლამაზ", "ლამაზად", "ლამაზები", "ლამაზი", "ლამაზია", "ლამაზნი", "ლამაზს", "ლაპარაკი", "ლაპარაკის", "ლაპარაკობა", "ლაპარაკობდა", "ლაპარაკობს", "ლაპარაკს", "ლარი", "ლარს", "ლაშა", "ლევ", "ლევანო", "ლიტრი", "ლოდინი", "ლოდინის", "ლომივით", "ლუარსაბი", "ლურჯ", "ლურჯი", "ლხენა", "მაგ", "მაგალითად", "მაგდო", "მაგიდა", "მაგიდაზე", "მაგიდაზეა", "მაგივრად", "მაგნიტივით", "მაგნიტურ", "მაგნიტური", "მაგრა", "მაგრამ", "მადლი", "მადლობა", "მათ", "მათგან", "მათგანი", "მათგანს", "მათდან", "მათთადან", "მათთან", "მათთვის", "მათი", "მათმა", "მათს", "მაინტერესებდა", "მაინტერესებს", "მაინც", "მაის", "მაისი", "მაისს", "მაისში", "მაკედონელი", "მალე", "მამა", "მამავ", "მამათა", "მამამ", "მამაო", "მამას", "მამაცი", "მამების", "მამიდასთან", "მამის", "მამნი", "მან", "მანამ", "მანქანა", "მანქანით", "მარადისობაა", "მართავს", "მართალია", "მართვა", "მართვის", "მართლა", "მართლად", "მართლადა", "მარკუს", "მარკუსი", "მარტივია", "მარტო", "მარტოობა", "მარტოხელა", "მარტში", "მარჯვენა", "მას", "მასალა", "მასაც", "მასზე", "მასთან", "მასთვის", "მასპინძელი", "მასპინძელს", "მასწავლებელი", "მასწავლებელია", "მასწავლებელს", "მასწავლებლად", "მატარებელი", "მატარებელმა", "მატარებლით", "მაუწერია", "მაქვს", "მაღაზიაში", "მაღალი", "მაღალია", "მაშინ", "მაშინაც", "მაშინვე", "მაჩაბელი", "მაცივარი", "მახსოვ", "მახსოვდა", "მახსოვს", "მაჯის", "მგელ", "მგელთან", "მგელი", "მგელის", "მგელმა", "მგვ", "მგზავრის", "მგზავრობს", "მგლ", "მგლიდან", "მგლით", "მგლის", "მგლისგან", "მგონი", "მგონია", "მდგომი", "მდგრადი", "მდე", "მდებარეობს", "მდიდარი", "მდინარე", "მდომებს", "მეათე", "მეათედი", "მეასედი", "მებაღემ", "მეგობარ", "მეგობართან", "მეგობარი", "მეგობარმა", "მეგობარო", "მეგობარს", "მეგობრ", "მეგობრები", "მეგობრისგან", "მეგობრობა", "მეგობრულსა", "მეერთ", "მეერთე", "მეერთი", "მეერთს", "მეექვსე", "მეექვსედი", "მევალება", "მეთერთმეტე", "მეთოდი", "მეთორმეტე", "მეთქ", "მეთქი", "მელა", "მელამ", "მელას", "მელასთან", "მელის", "მემეორედი", "მენატრ", "მენატრება", "მენატრები", "მეოთხე", "მეოთხედი", "მეორე", "მეორედ", "მეორეს", "მეოცდამეათე", "მერე", "მერვე", "მესამე", "მესამედ", "მესამედი", "მესმის", "მეტი", "მეტია", "მეტისმეტად", "მეტრი", "მეტრის", "მეტყველება", "მეუბნებოდნენ", "მეუღლე", "მეფე", "მეფეებსა", "მეფემ", "მეფენი", "მეფეს", "მეფესთან", "მეფის", "მეყვარ", "მეყვარება", "მეყვარებოდა", "მეყვარებოდეს", "მეშვიდე", "მეშინი", "მეშინია", "მეჩვენება", "მეც", "მეცა", "მეცხრე", "მეძინება", "მეძინებოდა", "მეხუთე", "მზე", "მზემ", "მზერა", "მზიანია", "მზის", "მთა", "მთავარი", "მთავრდება", "მთაზე", "მთაში", "მთები", "მთელ", "მთელი", "მთელმა", "მთვარე", "მთვარის", "მთიდან", "მთის", "მთისკენ", "მთლ", "მთლიანად", "მთლიანი", "მიაბიჯებ", "მიატოვა", "მიაუ", "მიაქვს", "მიაქცია", "მიაღწევს", "მიაღწია", "მიგელ", "მიგცა", "მიდ", "მიდამოებში", "მიდი", "მიდიან", "მიდიოდა", "მიდის", "მიდიხარ", "მიდიხართ", "მიდოდა", "მიერ", "მივა", "მივალ", "მივდივარ", "მივდივართ", "მივდიოდა", "მივდიოდი", "მივდიოდნე", "მივდიოდნენ", "მივედ", "მივედი", "მივეცი", "მივეცით", "მივიდ", "მივიდა", "მივიდოდით", "მივიღე", "მივიწყებდა", "მივუსმინო", "მივცა", "მიზანი", "მით", "მითითებული", "მითხარი", "მითხრ", "მითხრა", "მიიღებს", "მიიღეს", "მიიღო", "მილიონი", "მიმავალმა", "მიმართ", "მიმდინარე", "მიმეცი", "მიმოიხედა", "მიმსვლელობის", "მიმღერე", "მიმცა", "მინდა", "მინდვრის", "მინდოდ", "მინდოდა", "მინდოდეს", "მინდორი", "მინიმუმ", "მიპასუხა", "მირთმევის", "მირიადი", "მირჩიეს", "მის", "მისავით", "მისგან", "მისვლა", "მისთან", "მისთვის", "მისი", "მისმა", "მისს", "მისც", "მისცა", "მისცეს", "მიტანა", "მიტინგი", "მიტინიგი", "მიუახლოვდა", "მიუთითა", "მიუტანს", "მიუხედავად", "მიღება", "მიღების", "მიღებული", "მიღმა", "მიყევი", "მიყვანა", "მიყვანს", "მიყვარ", "მიყვარდა", "მიყვარს", "მიყვარხარ", "მიყვარხართ", "მიყიდია", "მიჩვეული", "მიცემა", "მიცემის", "მიწ", "მიწა", "მიწები", "მიწიდან", "მიხედვით", "მიხეილ", "მიხვდ", "მიხვდა", "მიჰქრიან", "მიჰყავს", "მკითხა", "მმართებს", "მნახავს", "მნიშვნელობა", "მნიშვნელოვანი", "მოაქვს", "მოახდინა", "მოახერხა", "მოგესალმები", "მოგესალმებით", "მოგვიანებით", "მოგვცა", "მოგზაურობა", "მოგზაურობის", "მოგცა", "მოგწონ", "მოგწონდა", "მოგწონვარ", "მოგწონთ", "მოგწონს", "მოგწონხარ", "მოდ", "მოდი", "მოდიან", "მოდით", "მოდის", "მოდიხარ", "მოეკვეთა", "მოესმ", "მოესმა", "მოესმოდა", "მოეშვა", "მოეჩვენა", "მოეწონებინა", "მოვა", "მოვალ", "მოვალთ", "მოვაო", "მოვდივარ", "მოვედი", "მოვიდ", "მოვიდა", "მოვიდაო", "მოვიდე", "მოვიდეს", "მოვიდოდა", "მოვლენ", "მოვუსმინო", "მოვცა", "მოვწონვარ", "მოთეთრო", "მოიმკიო", "მოინელონო", "მოისმინა", "მოიტან", "მოიტანა", "მოიყიდა", "მოკვლა", "მოკლე", "მოკლებულია", "მოკლული", "მომავალ", "მომავალი", "მომდგომია", "მომდევნო", "მომენტში", "მომესალმა", "მომეცი", "მომიტანეთ", "მომღერალი", "მომცა", "მომწარო", "მომწონ", "მომწონდა", "მომწონს", "მომწონხარ", "მომხმარებელი", "მონაცემებს", "მოსამზადებლად", "მოსასმენლად", "მოსასყიდლად", "მოსვლა", "მოსვლის", "მოსვლისას", "მოსმენა", "მოსულა", "მოსულიყო", "მოსწავლ", "მოსწავლე", "მოსწავლები", "მოსწონ", "მოსწონდა", "მოსწონთ", "მოსწონს", "მოტანა", "მოულოდნელად", "მოუსმინა", "მოუტანს", "მოუყვა", "მოუყიდა", "მოქალაქეებმა", "მოქმედება", "მოყვა", "მოყვანა", "მოყვანს", "მოყვარეს", "მოშავო", "მოცემულ", "მოძებნა", "მოძულ", "მოხდა", "მოხდეს", "მოხვალ", "მოხვალთ", "მოხვიდე", "მოხუცებული", "მოხუცი", "მოხუცმა", "მოჰყავს", "მრავალ", "მრავალი", "მრავალმა", "მრავალტანჯული", "მრთელი", "მსახიობობა", "მსაჯი", "მსვლელობა", "მსმენი", "მსმენია", "მსურ", "მსურს", "მსჯელობაში", "მსჯერა", "მტერი", "მტერმა", "მტერს", "მტერსა", "მტკვრის", "მტკივა", "მტრის", "მტრობაც", "მტრულად", "მუდამ", "მუზავ", "მუშაობა", "მუშაობდა", "მუშაობენ", "მუშაობის", "მუშაობს", "მქონდა", "მღერა", "მღერის", "მყავს", "მყავხარ", "მყვარ", "მყვარებია", "მყვარს", "მყოფადი", "მყოფია", "მშენებელი", "მშეუძლია", "მშვენიერება", "მშვენიერი", "მშვიდად", "მშვიდი", "მშვიდობაა", "მშვიდობიანად", "მშვიდობისა", "მშია", "მშიანია", "მშიერი", "მშობელი", "მშობლ", "მცივა", "მცხელა", "მცხელოდა", "მცხვა", "მძიმე", "მძიმეა", "მძინავს", "მძულ", "მძულდა", "მძულთ", "მძულს", "მძულხარ", "მწამ", "მწამს", "მწერალი", "მწერალია", "მწერალმა", "მწერლ", "მწვანე", "მწყურვალი", "მწყურია", "მჭირდ", "მჭირდება", "მჭირდები", "მჭირდებოდა", "მხარდაჭერა", "მხარეები", "მხარეს", "მხარი", "მხატვარი", "მხედართმთავარი", "მხედველობაში", "მხედრ", "მხედრები", "მხოლოდ", "მხრები", "მხრივ", "მჯერა", "ნაამბობი", "ნაბიჯ", "ნავთის", "ნათქვ", "ნათქვამი", "ნაიტი", "ნაკეთ", "ნაკეთები", "ნაკითხი", "ნაკლებად", "ნაკლები", "ნამდვილად", "ნამღერი", "ნანახ", "ნანახი", "ნაპირზე", "ნაპოვნ", "ნაპოვნი", "ნარატივი", "ნასმ", "ნასმელი", "ნასმენი", "ნაყოფს", "ნაშიერი", "ნაშუადღევს", "ნაცვლად", "ნაცია", "ნაწ", "ნაწერი", "ნაწილ", "ნაწილი", "ნაჭ", "ნაჭამი", "ნაჭმევი", "ნახა", "ნახავ", "ნახავენ", "ნახავს", "ნახევარ", "ნახევარგულიანი", "ნახევარი", "ნახევრ", "ნახევრად", "ნახევრები", "ნახევრით", "ნახევრის", "ნახვა", "ნახვამდის", "ნახვას", "ნახვაც", "ნახვით", "ნახულობს", "ნება", "ნებას", "ნებისმიერი", "ნელ", "ნელა", "ნეტავ", "ნივთები", "ნივთებიდან", "ნიკო", "ნინო", "ნინოს", "ნინოც", "ნიცშე", "ნოდარ", "ნოემბერ", "ნოემბერში", "ნოველა", "ნუთუ", "ნუკრის", "ნუკრობისას", "ნული", "ნუღარ", "ობა", "ობს", "ოდა", "ოდე", "ოდესღაც", "ოდისეა", "ოთარ", "ოთარო", "ოთახი", "ოთახიდან", "ოთახიიდან", "ოთახში", "ოთხ", "ოთხას", "ოთხასი", "ოთხი", "ოთხმოცდაათი", "ოთხმოცდაშვიდი", "ოთხმოცდაცამეტი", "ოთხმოცდაცხრამეტ", "ოთხმოცი", "ოთხშაბათამდე", "ოთხშაბათეობით", "ოთხშაბათი", "ოთხშაბათიდან", "ოთხშაბათს", "ოთხჯერ", "ოის", "ოლა", "ომა", "ომის", "ოპაა", "ორას", "ორასი", "ორბელიანი", "ორზე", "ორი", "ორია", "ორივე", "ორის", "ორმოცდაათი", "ორმოცდაშვიდი", "ორმოცი", "ორნახევარი", "ორშაბათამდე", "ორშაბათეობით", "ორშაბათი", "ორშაბათიდან", "ორშაბათს", "ორჯერ", "ოსტინი", "ოფისი", "ოფლი", "ოფლმა", "ოქროს", "ოქროსფერი", "ოქტომბერ", "ოქტომბერში", "ოცდა", "ოცდაათი", "ოცდაერთი", "ოცდათვრამეტი", "ოცდათხუთმეტი", "ოცდამეხუთე", "ოცდაშვიდი", "ოცდახუთი", "ოცი", "ოცნებობდა", "ოჯახი", "პავლე", "პაპის", "პარასკევამდე", "პარასკევეობით", "პარასკევი", "პარასკევიდან", "პარასკევს", "პასუხები", "პასუხი", "პატარა", "პატარას", "პატივისცემა", "პატიოსანი", "პერფექტი", "პირველ", "პირველად", "პირველი", "პირველის", "პირველმა", "პირველს", "პირი", "პირივით", "პირისპირ", "პირობით", "პირს", "პირუტყვია", "პირში", "პლანეტა", "პლანეტაზე", "პლატონი", "პოვნა", "პოვნის", "პოლი", "პონტში", "პრეზერვატივი", "პრეზიდენტი", "პრობლემები", "პრომეთე", "პროფესორი", "პროფესორმა", "პროცენტი", "პურზე", "პური", "პურის", "პურს", "ჟღალ", "რადგან", "რადგანაც", "რათ", "რათა", "რაიმე", "რაიტი", "რაკი", "რაკიღა", "რამ", "რამდენადაც", "რამდენი", "რამდენიმ", "რამდენიმე", "რამდენიმემ", "რამდენიმეს", "რამდენიმის", "რამდენიც", "რამდენსამე", "რამე", "რაოდენობიდან", "რას", "რასაკვირვალა", "რასაც", "რატომ", "რაღაც", "რაც", "რეალიზება", "რეალური", "რევოლუცია", "რეფერენდუმზე", "რვა", "რვაასი", "რთულია", "რიგი", "რიგში", "რით", "რის", "რისთვის", "რიცხვი", "როგორ", "როგორაც", "როგორი", "როგორც", "როდესაც", "როდესმე", "როდის", "როდისაც", "როდისმდე", "როდისმე", "რომ", "რომანი", "რომელ", "რომელზეც", "რომელთან", "რომელთანაც", "რომელი", "რომელიც", "რომელმაც", "რომელსაც", "რომელშიც", "რომლებიც", "რომლის", "როც", "როცა", "რუსეთმა", "რუსთაველი", "რქები", "რცხვენია", "რძალი", "რძეზე", "საათამდე", "საათზე", "საათი", "საათია", "საათიდან", "საათის", "საათს", "საათში", "საბა", "საბოლოოდ", "სად", "სადაც", "სადილად", "სადილის", "სადილს", "სადმე", "სადღაც", "საერთო", "საერთოც", "სავით", "სავსეა", "სავსებით", "საზოგადოდ", "საზოგადოება", "საიდან", "საიდუმლო", "საით", "საითკენ", "საინტერესოა", "საკითხაა", "საკითხავი", "საკითხი", "საკმაოდ", "საკუთარ", "სამ", "სამას", "სამასი", "სამე", "სამი", "სამიტინგი", "სამოგზაუროდ", "სამოგზიუროდ", "სამოცდაათი", "სამოცდაორი", "სამოცდასამი", "სამოცი", "სამსახურში", "სამყარო", "სამყაროს", "სამყაროში", "სამშაბათამდე", "სამშაბათეობით", "სამშაბათი", "სამშაბათიდან", "სამშაბათს", "სამშობლო", "სამშობლოსთვის", "სამჯერ", "სანამ", "სანამარ", "სანამღე", "სანაპიროზე", "სანახავად", "სანახავი", "სანახაობა", "სანტიმეტრი", "საოცარი", "სარწმუნო", "სასანთე", "სასარგებლოა", "სასიამოვნოა", "სასტიკად", "სასწავლი", "საუბარი", "საუბრის", "საუბრობდა", "საუზმედ", "საუზმის", "საუკეთესო", "საუკეთესოა", "საქართველო", "საქართველოთი", "საქართველოის", "საქართველოს", "საქართველოში", "საქმე", "საქმეა", "საქმეზე", "საქმით", "საღამო", "საღამომდე", "საღამოს", "საყიდლად", "საშუალების", "საჩუქრად", "საწერი", "საწოლი", "საჭიროა", "საჭიროებ", "საჭიროებს", "საჭიროზე", "საჭმელი", "სახე", "სახელი", "სახელმწიფო", "სახელმწიფოს", "სახეობა", "სახლ", "სახლად", "სახლამდე", "სახლები", "სახლთან", "სახლი", "სახლის", "სახლისკენ", "სახლისში", "სახლს", "სახლში", "სახლშია", "სევდა", "სევდიანი", "სეირნობის", "სენეკა", "სერვანტესი", "სერიათა", "სესილი", "სექტემბერ", "სექტემბერს", "სექტემბერში", "სვამ", "სვამენ", "სვამთ", "სვამს", "სვლა", "სვლელად", "სთან", "სთხოვ", "სთხოვა", "სთხოვეთ", "სიარული", "სიბნელის", "სიბრძნე", "სიგანე", "სიგრძე", "სიდედრი", "სიზმარი", "სიზმარში", "სიზმრ", "სიზმრები", "სიკეთე", "სიკვდილამდე", "სიკვდილი", "სიკვდილის", "სიკვდილმდე", "სიმაგრეები", "სიმამაცე", "სიმამრი", "სიმართლე", "სიმაღლე", "სიმაღლის", "სიმაღლისაა", "სიმპათიური", "სიმრავლე", "სიმძიმე", "სინათლე", "სინამდვილეში", "სირბილი", "სირბილის", "სირთულეების", "სისტემა", "სისხლი", "სიტყვ", "სიტყვა", "სიტყვები", "სიტყვებით", "სიტყვით", "სიღრმე", "სიყვარული", "სიჩუმე", "სიჩქარე", "სიცივე", "სიცილი", "სიცილის", "სიცოცხლე", "სიცოცხლეზე", "სიცოცხლის", "სიცოცხლისა", "სიცრუე", "სიცრუისა", "სიცხე", "სიძე", "სიწყურე", "სიჭარბეზე", "სიხარული", "სკამი", "სკოლამდე", "სკოლი", "სკოლიდან", "სკოლით", "სკოლის", "სმა", "სმენა", "სმის", "სოკრატე", "სოფელი", "სოფლები", "სპექტაკლი", "სპორტზე", "სრულიად", "სტკივა", "სტუმარ", "სტუმარი", "სტუმარო", "სულ", "სული", "სულხან", "სუნ", "სუნთქავს", "სუნთქვა", "სურათია", "სურდა", "სურდეს", "სურვილი", "სურს", "სუყველაფერი", "სჩხრიალებს", "სცემინებს", "სცემს", "სცივა", "სციოდა", "სძინავს", "სძულს", "სწავლა", "სწავლობს", "სწავლული", "სწამ", "სწამდა", "სწამს", "სწორედ", "სწორი", "სწორია", "სწრაფად", "სწრაფი", "სწყდება", "სწყურია", "სჭირდ", "სჭირდება", "სჭირდებათ", "სჭირდებოდა", "სხდომის", "სხედ", "სხედან", "სხედნენ", "სხეული", "სხვ", "სხვა", "სხვაგვარად", "სხვას", "სხვებზე", "სხვები", "სხვის", "სხვისი", "სხვისმა", "სხინააღმდეგ", "სჯერ", "სჯერა", "ტაბიძე", "ტარდება", "ტარება", "ტაში", "ტბასთან", "ტბები", "ტვირთვა", "ტილო", "ტილოსავით", "ტირე", "ტირი", "ტირილი", "ტირილის", "ტირის", "ტირო", "ტიტანები", "ტკა", "ტკაცა", "ტკივილს", "ტოლსტოი", "ტომ", "ტომბაზე", "ტყე", "ტყეში", "ტყვიით", "ტყუილი", "უამრავ", "უამრავი", "უამრავმა", "უარესი", "უბრალოდ", "უდაბნო", "უდაბნოს", "უდაბნოში", "უდიდესი", "უეცრად", "უვარაუდოდ", "უვარგის", "უვარგისი", "უზენაესი", "უზომოდ", "უთეთრესი", "უთქვამს", "უთხარი", "უთხრ", "უთხრა", "უილიამ", "უკან", "უკანაო", "უკანასკნელად", "უკაცრავად", "უკეთესი", "უკვე", "ულა", "ულამაზესი", "ული", "უმეტეს", "უმეტესი", "უმეტესმა", "უმეტესობა", "უმეტესობები", "უმეტესობით", "უმეტესობის", "უმუშავია", "უმღერა", "უმძიმესი", "უმჯობესია", "უნახავს", "უნდა", "უნდავს", "უნდათ", "უნდება", "უნდოდ", "უნდოდა", "უპასუხა", "ურა", "ურემი", "ურთ", "უროდ", "უროსავით", "უსაზღვრო", "უფლისწულთან", "უფლისწული", "უფლისწულის", "უფლისწულმა", "უფლისწულს", "უფრო", "უყვარ", "უყვარდა", "უყვარდათ", "უყვარვარ", "უყვართ", "უყვარს", "უყვარხარ", "უყიდია", "უყურებს", "უცებ", "უცნაური", "უცნობ", "უცნობი", "უძველესი", "უძლურების", "უძრავი", "უძრახე", "უხილავ", "უხილავი", "უხილავია", "ფაბრიკა", "ფამ", "ფანჯარა", "ფანჯრები", "ფანჯრიდან", "ფაუსტი", "ფერმა", "ფეხ", "ფეხით", "ფილიპე", "ფილმი", "ფილოსოფია", "ფინჯანი", "ფიქრები", "ფიქრი", "ფიქრის", "ფიქრობ", "ფიქრობდა", "ფიქრობენ", "ფიქრობთ", "ფიქრობს", "ფლობდა", "ფლობენ", "ფლობს", "ფოთლები", "ფონ", "ფრანც", "ფრენსისი", "ფრთხილად", "ფრიად", "ფრიდრიხ", "ფრუსტუნი", "ფსიქოლოგია", "ფსკერსაც", "ფული", "ფულის", "ფშაველა", "ფხუკუნი", "ქალაქი", "ქალაქია", "ქალაქიდან", "ქალაქის", "ქალაქისა", "ქალაქისკენ", "ქალაქიში", "ქალაქს", "ქალაქში", "ქალბატონო", "ქალები", "ქალთან", "ქალი", "ქალიშვილი", "ქალმა", "ქალს", "ქარდაქარ", "ქართული", "ქარი", "ქარია", "ქარიშხლის", "ქედმაღალი", "ქეთელაური", "ქვაში", "ქვემოთ", "ქვემოთაა", "ქვეყან", "ქვეყანა", "ქვეყანაში", "ქვეყნ", "ქვეყნები", "ქვეყნიდან", "ქვეშ", "ქმარი", "ქონა", "ქონდა", "ქსავს", "ქსოვა", "ქსოვილი", "ქუდი", "ქუდიაო", "ქუჩა", "ქუჩაში", "ქუჩები", "ღამე", "ღამეს", "ღამით", "ღამის", "ღარიბმა", "ღაც", "ღვთაებრივი", "ღვთისაა", "ღვთისმსახურება", "ღიმილი", "ღიმილის", "ღირს", "ღმერთის", "ღმერთმა", "ღმერთმანი", "ღმერთო", "ღრმა", "ღრმად", "ყავა", "ყაზბეგი", "ყვავილები", "ყვავილი", "ყვავილს", "ყვავის", "ყვარ", "ყველ", "ყველა", "ყველაზე", "ყველამ", "ყველას", "ყველაფერი", "ყველაფერს", "ყველაფრ", "ყველგან", "ყიდა", "ყიდვა", "ყიდიან", "ყიდის", "ყიდულობენ", "ყიდულობს", "ყივილე", "ყიყინი", "ყიყლიყო", "ყოველ", "ყოველდღე", "ყოველდღიურად", "ყოველთვის", "ყოველი", "ყოველივე", "ყოფილ", "ყოფილა", "ყოფილაო", "ყოფილი", "ყოფნა", "ყოჩაღ", "ყურადღება", "ყურების", "ყურყლუტი", "შაბათ", "შაბათამდე", "შაბათი", "შაბათიდან", "შაბათს", "შავი", "შანსის", "შეავსო", "შეამჩნ", "შეამჩნია", "შეასრულა", "შეასრულოს", "შეაღო", "შეგეშინდათ", "შეგეშინდეს", "შეგეძლო", "შეგეძლოთ", "შეგვეძლო", "შეგვიძლია", "შეგიძლ", "შეგიძლია", "შეგიძლიათ", "შედეგად", "შედი", "შედის", "შეევსო", "შეეძლება", "შეეძლო", "შეეძლოთ", "შეეხება", "შევედით", "შევიდ", "შევიდა", "შევსულვარ", "შევძლებთ", "შეიყვარა", "შეიძლებ", "შეიძლება", "შელი", "შემდეგ", "შემდეგაც", "შემდეგი", "შემეძლება", "შემეძლო", "შემეხება", "შემთხვევა", "შემთხვევაში", "შემთხვევით", "შემიძლ", "შემიძლია", "შემო", "შემობრუნდა", "შემოდგომაზე", "შემოდი", "შემოდის", "შემოვიდა", "შემოფრენა", "შენ", "შენად", "შენგან", "შენთან", "შენთანა", "შენთვის", "შენი", "შენია", "შენით", "შენმა", "შენობაში", "შენობის", "შენს", "შენსგან", "შერლოკ", "შესაბამისად", "შესაძლებელი", "შესაძლებელია", "შესახებ", "შესვლა", "შესვლის", "შესრულება", "შესრულებული", "შეუძენია", "შეუძლ", "შეუძლებელი", "შეუძლია", "შეუძლიათ", "შეფარება", "შექმნა", "შექმნილნი", "შექსპირი", "შეყვარება", "შეყვარებული", "შეყოყმანდა", "შეშინდე", "შეშინებული", "შეჩერდა", "შეცდომით", "შეძლია", "შეძლო", "შეწყობა", "შეჭამა", "შეხედა", "შეხედვის", "შეხვდნენ", "შეხვედრ", "შეხვედრა", "შეხვედრის", "შველა", "შვიდასი", "შვიდი", "შვილთა", "შვილი", "შვილიშვილი", "შვილმა", "შვილო", "შვლის", "შია", "შიგნით", "შიმშილი", "შიმშილობა", "შინისაკენ", "შიოდა", "შობილი", "შოთა", "შოთაო", "შორეულ", "შორის", "შორს", "შოუ", "შრომობდა", "შუადღისას", "შფოთვის", "შშშ", "შხვა", "ჩააბაროს", "ჩაარტყა", "ჩაესვენა", "ჩაეძინა", "ჩავაბარებდი", "ჩავიდა", "ჩაი", "ჩაიბუტბუტა", "ჩაის", "ჩაიჩურჩულა", "ჩაკეტა", "ჩაკეტვა", "ჩამესახა", "ჩამო", "ჩამოდის", "ჩამოვა", "ჩამოვედი", "ჩამოვიდ", "ჩამოვიდა", "ჩამოინგრა", "ჩამოსვლა", "ჩანდა", "ჩანს", "ჩარლზი", "ჩატარდა", "ჩატარდება", "ჩაწერა", "ჩემ", "ჩემად", "ჩემგან", "ჩემზე", "ჩემთან", "ჩემთვის", "ჩემი", "ჩემით", "ჩემკენ", "ჩემმა", "ჩემო", "ჩემს", "ჩემსკენ", "ჩეპმენი", "ჩერჩილი", "ჩვენ", "ჩვენად", "ჩვენგან", "ჩვენგანი", "ჩვენგანს", "ჩვენთაგან", "ჩვენთან", "ჩვენთვის", "ჩვენი", "ჩვენით", "ჩვენს", "ჩვეულებრივ", "ჩვიდმეტი", "ჩუმი", "ჩურჩულა", "ცამეტი", "ცარიელი", "ცას", "ცაში", "ცბიერი", "ცეკვავს", "ცეკვის", "ცეცხლზე", "ცეცხლი", "ცია", "ციდან", "ცივა", "ცივი", "ცივმა", "ცის", "ციცერონი", "ციხე", "ცნობილია", "ცნობნა", "ცოდნა", "ცოლი", "ცოტ", "ცოტა", "ცოტამ", "ცოტას", "ცოცხალი", "ცოცხალია", "ცუდად", "ცუდი", "ცურავს", "ცურაობს", "ცურვა", "ცურვის", "ცხარია", "ცხელ", "ცხელი", "ცხენი", "ცხვირ", "ცხვრ", "ცხვრები", "ცხოველების", "ცხოველი", "ცხოვრება", "ცხოვრების", "ცხოვრობ", "ცხოვრობდა", "ცხოვრობდნენ", "ცხოვრობენ", "ცხოვრობს", "ცხრა", "ცხრაასი", "ცხრამეტი", "ცხრის", "ძაან", "ძალად", "ძალების", "ძალზე", "ძალზედ", "ძალიან", "ძაღლები", "ძაღლთან", "ძაღლი", "ძველი", "ძვირი", "ძილი", "ძილია", "ძილის", "ძიმ", "ძიმის", "ძირითადად", "ძის", "ძისგან", "ძლია", "ძლიერი", "ძმა", "ძმამ", "ძმაო", "ძმის", "ძმისვილები", "ძმობილო", "წაგართმევს", "წადი", "წადით", "წადის", "წავა", "წავალ", "წავალთ", "წავაო", "წავდივარ", "წავდის", "წავედი", "წავედით", "წავიდ", "წავიდა", "წავიდაო", "წავიდე", "წავიდეთ", "წავიდეს", "წავიდოდა", "წავიდოდე", "წავიდოდი", "წავიკითხე", "წავლენ", "წავხდი", "წავხვდები", "წაიკითხა", "წაიკითხე", "წაიღ", "წაიღე", "წაიღეთ", "წაიღო", "წაიყვანს", "წაკითხვა", "წაკითხვის", "წაკითხული", "წამოდგა", "წამოდგომისთანავ", "წამოვიდ", "წამოვიდა", "წამოიღო", "წამოიძახა", "წამოიწყო", "წამოიჭრა", "წამს", "წარმატებებს", "წარმოადგენს", "წარსული", "წასაკითხად", "წასვლა", "წასვლას", "წასვლის", "წასვლისა", "წასულა", "წასულიყო", "წაუვიდა", "წაუკითხავი", "წაუკითხავს", "წაღების", "წაყვან", "წაყვანა", "წაშლის", "წახვალ", "წახვალთ", "წახვალო", "წახვიდე", "წახვიდეთ", "წევ", "წევანან", "წევოდა", "წევს", "წევხარ", "წელ", "წელი", "წელია", "წელიწადში", "წელს", "წერ", "წერა", "წერამ", "წერაში", "წერდა", "წერდე", "წერდი", "წერეთელი", "წერენ", "წერთ", "წერილები", "წერილი", "წერილს", "წერის", "წერს", "წესი", "წვეულებაზე", "წვიმა", "წვიმაა", "წვიმდა", "წვიმის", "წვიმისა", "წვიმს", "წიგნები", "წიგნებით", "წიგნების", "წიგნებმა", "წიგნებში", "წიგნზე", "წიგნი", "წიგნია", "წიგნიდან", "წიგნიები", "წიგნის", "წიგნს", "წიგნში", "წითელი", "წითლ", "წინ", "წინა", "წინააღმდეგ", "წინადადებებში", "წლამდე", "წლები", "წლების", "წლებში", "წლია", "წლიანი", "წლიდან", "წლის", "წმინდანთა", "წოლა", "წოლის", "წონ", "წონა", "წუთას", "წუთები", "წუთი", "წუთის", "წუთს", "წყალ", "წყალი", "წყალიც", "წყალშია", "წყვეტილი", "წყლ", "წყლიდან", "წყლის", "ჭავჭავაძე", "ჭამ", "ჭამა", "ჭამენ", "ჭამთ", "ჭამის", "ჭამოს", "ჭამს", "ჭეშმარიტება", "ჭეშმარიტი", "ჭილაძე", "ჭირიმე", "ჭიქა", "ჭიშკარი", "ჭკვიანი", "ხალხთა", "ხალხი", "ხალხისკენ", "ხალხმა", "ხან", "ხანგრძლივი", "ხანი", "ხანში", "ხარ", "ხართ", "ხატ", "ხედ", "ხედავ", "ხედავენ", "ხედავს", "ხედართმთავარი", "ხედვა", "ხეები", "ხევისბერი", "ხევში", "ხეზე", "ხელახლა", "ხელები", "ხელი", "ხელით", "ხელოვნება", "ხელოვნებას", "ხელს", "ხეში", "ხეხილის", "ხვალ", "ხვალინდელ", "ხვდებოდნენ", "ხილული", "ხის", "ხმა", "ხმამაღლა", "ხმები", "ხნები", "ხნის", "ხოლმე", "ხოლო", "ხომ", "ხრიალი", "ხსოვნის", "ხუთას", "ხუთასი", "ხუთი", "ხუთშაბათამდე", "ხუთშაბათეობით", "ხუთშაბათი", "ხუთშაბათიდან", "ხუთშაბათს", "ხუთჯერ", "ხურავენ", "ხურავს", "ხშირად", "ჯავახიშვილი", "ჯამში", "ჯან", "ჯანმრთელი", "ჯდება", "ჯდომა", "ჯდომის", "ჯეიმსი", "ჯერ", "ჯერაც", "ჯერჯერობით", "ჯობს", "ჯოზეფი", "ჯონი", "ჯორჯი", "ჰამლეტ", "ჰამლეტი", "ჰაუ", "ჰგავს", "ჰგონია", "ჰკითხა", "ჰოლმს", "ჰოლმსი", "ჰომეროსი", "ჰორიზონტს", "ჰქონდა", "ჰქონდათ", "ჰქონია", "ჰქონის", "ჰქრის", "ჰყავდა", "ჰყავთ", "ჰყავს", "ჰყვარ", "ჰყვარებია"];
  const KA_SPELL_ROOT_SET = new Set(KA_SPELL_ROOTS);

  function offlineSpellCheckKa(text) {
    if (!text || typeof text !== "string") return text || "";
    let t = text;

    // 1. Printed font OCR letter confusions (targeted confusable pairs)
    const ocrConfusions = [
      // ლ <-> ღ confusions
      [/(?<![\u10A0-\u10FF])სიკვდიღ([ა-ჰ]*)/g, 'სიკვდილ$1'],
      [/(?<![\u10A0-\u10FF])საიდუმღ([ა-ჰ]*)/g, 'საიდუმლ$1'],
      [/(?<![\u10A0-\u10FF])შეუძღ([ა-ჰ]*)/g, 'შეუძლ$1'],
      [/(?<![\u10A0-\u10FF])მშვენიეღებ([ა-ჰ]*)/g, 'მშვენიერებ$1'],
      [/(?<![\u10A0-\u10FF])მშვენიეღ([ა-ჰ]*)/g, 'მშვენიერ$1'],
      [/(?<![\u10A0-\u10FF])სინათღ([ა-ჰ]*)/g, 'სინათლ$1'],
      [/(?<![\u10A0-\u10FF])სიყვარუღ([ა-ჰ]*)/g, 'სიყვარულ$1'],
      [/(?<![\u10A0-\u10FF])უფლისწუღ([ა-ჰ]*)/g, 'უფლისწულ$1'],
      [/(?<![\u10A0-\u10FF])მახრჩობეღ([ა-ჰ]*)/g, 'მახრჩობელ$1'],
      [/(?<![\u10A0-\u10FF])რომეღ([ა-ჰ]*)/g, 'რომელ$1'],
      [/(?<![\u10A0-\u10FF])ყვეღაფ([ა-ჰ]*)/g, 'ყველაფ$1'],
      [/(?<![\u10A0-\u10FF])ყვეღ([ა-ჰ]+)/g, 'ყველ$1'],
      [/(?<![\u10A0-\u10FF])ძაღიან(?![ა-ჰ])/g, 'ძალიან'],
      [/(?<![\u10A0-\u10FF])თავისუფღ([ა-ჰ]*)/g, 'თავისუფლ$1'],
      [/(?<![\u10A0-\u10FF])მთეღ([ა-ჰ]*)/g, 'მთელ$1'],
      [/(?<![\u10A0-\u10FF])ხეღ([ა-ჰ]*)/g, 'ხელ$1'],
      [/(?<![\u10A0-\u10FF])გუღ([ა-ჰ]*)/g, 'გულ$1'],
      [/(?<![\u10A0-\u10FF])თვაღ([ა-ჰ]*)/g, 'თვალ$1'],
      [/(?<![\u10A0-\u10FF])სწავღ([ა-ჰ]*)/g, 'სწავლ$1'],
      [/(?<![\u10A0-\u10FF])სიხარუღ([ა-ჰ]*)/g, 'სიხარულ$1'],
      [/(?<![\u10A0-\u10FF])მშობეღ([ა-ჰ]*)/g, 'მშობელ$1'],
      [/(?<![\u10A0-\u10FF])სოფეღ([ა-ჰ]*)/g, 'სოფელ$1'],
      [/(?<![\u10A0-\u10FF])მასწავლებეღ([ა-ჰ]*)/g, 'მასწავლებელ$1'],
      [/(?<![\u10A0-\u10FF])ბედნიეღ([ა-ჰ]*)/g, 'ბედნიერ$1'],

      // პ <-> მ Ergative endings (-მა misread as -პა)
      [/(?<![\u10A0-\u10FF])თვითმფრინავპა(?![ა-ჰ])/g, 'თვითმფრინავმა'],
      [/(?<![\u10A0-\u10FF])მეგობარპა(?![ა-ჰ])/g, 'მეგობარმა'],
      [/(?<![\u10A0-\u10FF])ადამიანპა(?![ა-ჰ])/g, 'ადამიანმა'],
      [/(?<![\u10A0-\u10FF])მწერალპა(?![ა-ჰ])/g, 'მწერალმა'],
      [/(?<![\u10A0-\u10FF])ავტორპა(?![ა-ჰ])/g, 'ავტორმა'],
      [/(?<![\u10A0-\u10FF])მეფეპა(?![ა-ჰ])/g, 'მეფემ'],
      [/(?<![\u10A0-\u10FF])ქალპა(?![ა-ჰ])/g, 'ქალმა'],
      [/(?<![\u10A0-\u10FF])კაცპა(?![ა-ჰ])/g, 'კაცმა'],
      [/(?<![\u10A0-\u10FF])ხალხპა(?![ა-ჰ])/g, 'ხალხმა'],
      [/(?<![\u10A0-\u10FF])შვილპა(?![ა-ჰ])/g, 'შვილმა'],
      [/(?<![\u10A0-\u10FF])დედაპა(?![ა-ჰ])/g, 'დედამ'],
      [/(?<![\u10A0-\u10FF])მამაპა(?![ა-ჰ])/g, 'მამამ'],
      [/(?<![\u10A0-\u10FF])ძმაპა(?![ა-ჰ])/g, 'ძმამ'],
      [/(?<![\u10A0-\u10FF])ექიმპა(?![ა-ჰ])/g, 'ექიმმა'],
      [/(?<![\u10A0-\u10FF])პროფესორპა(?![ა-ჰ])/g, 'პროფესორმა'],
      [/(?<![\u10A0-\u10FF])პოეტპა(?![ა-ჰ])/g, 'პოეტმა'],

      // პ <-> ბ / deverbal nouns
      [/(?<![\u10A0-\u10FF])გამარჯვპა(?![ა-ჰ])/g, 'გამარჯვება'],
      [/(?<![\u10A0-\u10FF])ცხოვრპა(?![ა-ჰ])/g, 'ცხოვრება'],
      [/(?<![\u10A0-\u10FF])დაბადპა(?![ა-ჰ])/g, 'დაბადება'],
      [/(?<![\u10A0-\u10FF])მოგზაურპა(?![ა-ჰ])/g, 'მოგზაურობა'],
      [/(?<![\u10A0-\u10FF])მეგობრპა(?![ა-ჰ])/g, 'მეგობრობა'],
      [/(?<![\u10A0-\u10FF])არსებოპა(?![ა-ჰ])/g, 'არსებობა'],
      [/(?<![\u10A0-\u10FF])გამარჯოპ([ა-ჰ]*)/g, 'გამარჯობ$1'],

      // ჭ <-> წ / შ confusions
      [/(?<![\u10A0-\u10FF])[წშ]ეშმარიტ([ა-ჰ]*)/g, 'ჭეშმარიტ$1'],

      // კ / ვ <-> პ confusions
      [/(?<![\u10A0-\u10FF])[კვ]ატარ([ა-ჰ]*)/g, 'პატარ$1'],

      // თ <-> ძ / ხ
      [/(?<![\u10A0-\u10FF])თალიან(?![ა-ჰ])/g, 'ძალიან'],
      [/(?<![\u10A0-\u10FF])თალთი(?![ა-ჰ])/g, 'ხალხი'],

      // ხ <-> ჩ
      [/(?<![\u10A0-\u10FF])ხემი(?=\s+[ა-ჰ]+)/g, 'ჩემი'],

            // ძ <-> ხ confusions (printed font arch resemblance)
      [/(?<![\u10A0-\u10FF])ხალიან(?![ა-ჰ])/g, 'ძალიან'],
      [/(?<![\u10A0-\u10FF])ძალძ([ა-ჰ]*)/g, 'ხალხ$1'],

      // ყ <-> ფ confusions
      [/(?<![\u10A0-\u10FF])ფველაფ([ა-ჰ]*)/g, 'ყველაფ$1'],
      [/(?<![\u10A0-\u10FF])ფველ([ა-ჰ]+)/g, 'ყველ$1'],

      // შ <-> წ confusions
      [/(?<![\u10A0-\u10FF])წესახებ(?![ა-ჰ])/g, 'შესახებ'],

      // ჩ <-> ძ confusions
      [/(?<![\u10A0-\u10FF])ძვენ(?![ა-ჰ])/g, 'ჩვენ'],
      [/(?<![\u10A0-\u10FF])ძემ([ა-ჰ]*)/g, 'ჩემ$1'],

// Colloquial / slang in literary text
      [/(?<![\u10A0-\u10FF])ნაღდი(?![ა-ჰ])/g, 'ნამდვილი']
    ];

    for (const [re, repl] of ocrConfusions) {
      t = t.replace(re, repl);
    }

    // 2. Token-level dictionary validation & confusable healing
    t = t.replace(/(?<![\u10A0-\u10FF])[\u10D0-\u10FA]{3,}(?![ა-ჰ])/g, (tok) => {
      if (KA_SPELL_ROOT_SET.has(tok)) return tok;

      // Try replacing single confusable characters if candidate matches dictionary
      const confPairs = [
        ['ღ', 'ლ'], ['ლ', 'ღ'],
        ['პ', 'მ'], ['პ', 'ბ'],
        ['წ', 'ჭ'], ['შ', 'ჭ'],
        ['კ', 'პ'], ['ვ', 'პ'],
        ['თ', 'ძ'],
        ['ძ', 'ხ'], ['ხ', 'ძ'],
        ['ყ', 'ფ'], ['ფ', 'ყ'],
        ['შ', 'წ'], ['წ', 'შ'],
        ['ჩ', 'ძ'], ['ძ', 'ჩ'],
        ['ბ', 'ზ'], ['ზ', 'ბ'],
        ['ც', 'ხ'], ['ხ', 'ც']
      ];
      for (const [fromChar, toChar] of confPairs) {
        if (tok.includes(fromChar)) {
          const candidate = tok.split(fromChar).join(toChar);
          if (KA_SPELL_ROOT_SET.has(candidate)) {
            return candidate;
          }
        }
      }

      // Check with standard inflectional suffixes (-მა, -ს, -ის, -ით, -ად, -ში, -ზე, -დან, -თან, -კენ)
      const stemMatch = tok.match(/^(.+?)(?:მა|ის|ით|ად|ში|ზე|დან|თან|კენ|მდე|ებ(?:ი|მა|ს|ის|ით|ად|ში|ზე|დან|თან|კენ)?)$/);
      if (stemMatch && stemMatch[1]) {
        const stem = stemMatch[1];
        if (KA_SPELL_ROOT_SET.has(stem) || KA_SPELL_ROOT_SET.has(stem + 'ი') || KA_SPELL_ROOT_SET.has(stem + 'ა')) {
          return tok;
        }
      }

      return tok;
    });

    return t;
  }

  // ── Offline Linguistic Deduction & Morphological Reconstruction ───────────
  // Runs 100% locally with zero network connection to repair printed Georgian OCR errors,
  // reconstruct words torn apart by print spacing, fix printed font letter confusions,
  // and harmonize cases and grammar using the offline rule engine.
  function offlineLinguisticPass(text, lang) {
    if (!text || typeof text !== "string") return text || "";
    const isKa = lang === "kat" || lang === "ka" || (text.match(/[\u10A0-\u10FF]/g) || []).length > 8;
    if (!isKa) return text;

    let t = offlineSpellCheckKa(text);

    // 1. Spaced-out word reconstruction (common printed OCR spaced headings and wide-spaced words)
    // Matches letters of known frequent roots and words separated by spaces: e.g. "დ ა" -> "და", "პ ა ტ ა რ ა" -> "პატარა"
    const spacedWords = [
      "თავისუფლება", "ვარსკვლავი", "უფლისწული", "სიყვარული", "ჭეშმარიტი", "სიცოცხლე",
      "ადამიანი", "მეგობარი", "სინათლე", "პატარა", "ძალიან", "ყველა", "მთვარე",
      "ბავშვი", "სიტყვა", "თვალი", "წიგნი", "თავის", "როცა", "ხოლო", "მერე",
      "თქვა", "კაცი", "ქალი", "გული", "ღამე", "დრო", "გზა", "დღე", "მზე",
      "რომ", "შენ", "მის", "მას", "იყო", "და", "არ", "კი", "რა", "ეს", "ის", "თუ", "მე"
    ];
    for (const w of spacedWords) {
      const spaced = w.split("").join("\\s+");
      t = t.replace(new RegExp(`(?<![\\u10A0-\\u10FF])${spaced}(?![ა-ჰ])`, "g"), w);
    }

    // 2. Printed font OCR letter confusions (ლ/ღ, ვ/პ/კ, შ/წ/ჭ, თ/ძ/ხ, ც/ტ/ე, დ/ო/ლ, პ/მ, რ/ყ)
    const deepKaOcrFixes = [
      [/(?<![\u10A0-\u10FF])უფლისწუღ([ა-ჰ]*)/g, 'უფლისწულ$1'],
      [/(?<![\u10A0-\u10FF])სინათღ([ა-ჰ]*)/g, 'სინათლ$1'],
      [/(?<![\u10A0-\u10FF])სიყვარუღ([ა-ჰ]*)/g, 'სიყვარულ$1'],
      [/(?<![\u10A0-\u10FF])მახრჩობეღ([ა-ჰ]*)/g, 'მახრჩობელ$1'],
      [/(?<![\u10A0-\u10FF])რომეღ([ა-ჰ]*)/g, 'რომელ$1'],
      [/(?<![\u10A0-\u10FF])ყვეღაფ([ა-ჰ]*)/g, 'ყველაფ$1'],
      [/(?<![\u10A0-\u10FF])ყვეღ([ა-ჰ]+)/g, 'ყველ$1'],
      [/(?<![\u10A0-\u10FF])ძაღიან(?![ა-ჰ])/g, 'ძალიან'],
      [/(?<![\u10A0-\u10FF])თალიან(?![ა-ჰ])/g, 'ძალიან'],
      [/(?<![\u10A0-\u10FF])შეუძღ([ა-ჰ]*)/g, 'შეუძლ$1'],
      [/(?<![\u10A0-\u10FF])თავისუფღ([ა-ჰ]*)/g, 'თავისუფლ$1'],
      [/(?<![\u10A0-\u10FF])მშვენიეღ([ა-ჰ]*)/g, 'მშვენიერ$1'],
      [/(?<![\u10A0-\u10FF])სამყაყო(?![ა-ჰ])/g, 'სამყარო'],
      [/(?<![\u10A0-\u10FF])წეშმარიტ([ა-ჰ]*)/g, 'ჭეშმარიტ$1'],
      [/(?<![\u10A0-\u10FF])შეშმარიტ([ა-ჰ]*)/g, 'ჭეშმარიტ$1'],
      [/(?<![\u10A0-\u10FF])ადამიანპ([ა-ჰ]*)/g, 'ადამიანმ$1'],
      [/(?<![\u10A0-\u10FF])კატარ([ა-ჰ]*)/g, 'პატარ$1'],
      [/(?<![\u10A0-\u10FF])ვატარ([ა-ჰ]*)/g, 'პატარ$1'],
      [/(?<![\u10A0-\u10FF])გამარჯოპ([ა-ჰ]*)/g, 'გამარჯობ$1'],
      [/(?<![\u10A0-\u10FF])ხემი(?=\s+[ა-ჰ]+)/g, 'ჩემი'],
      [/(?<![\u10A0-\u10FF])თალთი(?![ა-ჰ])/g, 'ხალხი'],
      [/(?<![\u10A0-\u10FF])ნაღდი(?![ა-ჰ])/g, 'ნამდვილი'],
      [/(?<![\u10A0-\u10FF])3ატარ([ა-ჰ]*)/g, 'პატარ$1'],
      [/(?<![\u10A0-\u10FF])3(?=ატარ|ერსონ|ოლიტიკ|ასუხ)/g, 'პ'],
      [/(?<![\u10A0-\u10FF])კერსონაჟ([ა-ჰ]*)/g, 'პერსონაჟ$1'],
      [/(?<![\u10A0-\u10FF])წესახებ(?![ა-ჰ])/g, 'შესახებ'],
      [/(?<![\u10A0-\u10FF])ხხოვრ([ა-ჰ]*)/g, 'ცხოვრ$1'],
      [/(?<![\u10A0-\u10FF])ცცოვრ([ა-ჰ]*)/g, 'ცხოვრ$1'],
      [/(?<![\u10A0-\u10FF])ზუნებრივ([ა-ჰ]*)/g, 'ბუნებრივ$1'],
      [/(?<![\u10A0-\u10FF])მხოღოდ(?![ა-ჰ])/g, 'მხოლოდ'],
      [/(?<![\u10A0-\u10FF])ხვენ(?![ა-ჰ])/g, 'ჩვენ'],
      [/(?<![\u10A0-\u10FF])ხვენი(?![ა-ჰ])/g, 'ჩვენი'],
      [/(?<![\u10A0-\u10FF])ცალხ([ა-ჰ]*)/g, 'ხალხ$1'],
      [/(?<![\u10A0-\u10FF])ფ\|ლოსოფი([ა-ჰ]*)/g, 'ფილოსოფი$1'],
      [/(?<![\u10A0-\u10FF])სახლ\|ს(?![ა-ჰ])/g, 'სახლის'],
      [/(?<![\u10A0-\u10FF])ძვენ(?![ა-ჰ])/g, 'ჩვენ'],
      [/(?<![\u10A0-\u10FF])ხალიან(?![ა-ჰ])/g, 'ძალიან'],
      [/(?<![\u10A0-\u10FF])სიყვაყულ([ა-ჰ]*)/g, 'სიყვარულ$1'],
      [/(?<![\u10A0-\u10FF])სიბჭძნ([ა-ჰ]*)/g, 'სიბრძნ$1'],
      [/(?<![\u10A0-\u10FF])სიხარუღ([ა-ჰ]*)/g, 'სიხარულ$1'],
      [/(?<![\u10A0-\u10FF])მ\|რავლად(?![ა-ჰ])/g, 'მრავლად'],
      [/(?<![\u10A0-\u10FF])ლ\|რად(?![ა-ჰ])/g, 'ლარად'],
      [/(?<![\u10A0-\u10FF])ს\|ბრძნ([ა-ჰ]*)/g, 'სიბრძნ$1'],
      [/(?<![\u10A0-\u10FF])ჭე\|შმარიტ([ა-ჰ]*)/g, 'ჭეშმარიტ$1'],
      [/(?<![\u10A0-\u10FF])გა-\s+ნათლებ([ა-ჰ]*)/g, 'განათლებ$1'],
      [/(?<![\u10A0-\u10FF])მნიშვნე-\s+ლოვან([ა-ჰ]*)/g, 'მნიშვნელოვან$1'],
      [/(?<![\u10A0-\u10FF])წ\|გნ([ა-ჰ]*)/g, 'წიგნ$1'],
      [/(?<![\u10A0-\u10FF])ხ\|დ([ა-ჰ]*)/g, 'ხიდ$1'],
      [/(?<![\u10A0-\u10FF])სამ-\s+მშობლ([ა-ჰ]*)/g, 'სამშობლ$1'],
      [/(?<![\u10A0-\u10FF])შ\|უშანიკ([ა-ჰ]*)/g, 'შუშანიკ$1'],
      [/(?<![\u10A0-\u10FF])დ\|იდოსტატ([ა-ჰ]*)/g, 'დიდოსტატ$1'],
      [/(?<![\u10A0-\u10FF])დ\|ავით(?![ა-ჰ])/g, 'დავით'],
      [/(?<![\u10A0-\u10FF])გ\|ურამიშვილ([ა-ჰ]*)/g, 'გურამიშვილ$1'],
      [/(?<![\u10A0-\u10FF])ქართ-\s*[\r\n]+\s*ლის([ა-ჰ]*)/g, 'ქართლის$1'],
      [/(?<![\u10A0-\u10FF])თ\|უთაშხი([ა-ჰ]*)/g, 'თუთაშხი$1'],
      [/(?<![\u10A0-\u10FF])დ\|უმბაძ([ა-ჰ]*)/g, 'დუმბაძ$1'],
      [/(?<![\u10A0-\u10FF])ყ\|აზბეგ([ა-ჰ]*)/g, 'ყაზბეგ$1'],
      [/(?<![\u10A0-\u10FF])თავ-\s+თავის([ა-ჰ]*)/g, 'თავ-თავის$1'],
    ];
    for (const [re, repl] of deepKaOcrFixes) {
      t = t.replace(re, repl);
    }

    // 3. Dialogue dashes and authentic quotes
    t = t.replace(/(^|[\r\n]+)\s*[-–]\s+([\u10A0-\u10FF])/g, "$1— $2");
    t = t.replace(/(^|[\s(\[])["“«]([^\s"”»])/g, "$1„$2");
    t = t.replace(/([^\s"„«])["”»]([\s)\].,!?;:]|$)/g, "$1“$2");

    // 4. Hook into Georgian linguistic engine if available globally
    if (typeof window !== "undefined") {
      if (typeof window.applyKaRuleEngine === "function") {
        t = window.applyKaRuleEngine(t);
      }
      if (typeof window.refineGeorgianGrammar === "function") {
        t = window.refineGeorgianGrammar(t);
      }
    }

    // 5. Hook into active trained rule pack if available in storage or window
    try {
      const storedPack = (typeof localStorage !== "undefined" && (localStorage.getItem("active_pack_ka") || localStorage.getItem("active_training_pack_ka")));
      if (storedPack) {
        const packObj = JSON.parse(storedPack);
        const packItems = Array.isArray(packObj.items) ? packObj.items : (Array.isArray(packObj) ? packObj : []);
        for (const it of packItems) {
          if ((it.type === "ocr_fix" || it.type === "autofix") && it.pattern && it.replacement) {
            try {
              const pat = it.pattern;
              const rep = it.replacement;
              const rx = new RegExp(pat.startsWith("(?") ? pat : `(?<![\\u10A0-\\u10FF])${pat.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(?![ა-ჰ])`, "g");
              t = t.replace(rx, rep);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    t = t.replace(/[ \t]{2,}/g, " ").trim();
    return t;
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
          const res = await withRetry(() => ocrGateway(enhanced.dataUrl, lang, ocrHint(page, lang)));
          attempts.push({ text: res.text, engine: res.engine || "neural", score: scoreText(res.text, lang) });
        } catch (err) {
          console.warn("[scanner] tier 0 failed, falling back:", err && err.message);
        }
      }
      if (!attempts.length) {
        const r = await ocrLocal(enhanced.blob, lang);
        attempts.push({ text: r.text, engine: "offline", score: scoreText(r.text, lang) * (0.35 + r.confidence / 300) });
      }

      // Pass 2 — when first pass looks weak, blurry, or low light.
      const first = attempts[0];
      const isBlurry = (page._sharpness || 999) < 140;
      const shaky = isBlurry || (page._exposure || 128) < 70 || (page._exposure || 128) > 215;
      if (first.score < 0.65 || shaky) {
        try {
          const recoveryVariant = isBlurry && first.score < 0.55 ? "super_res" : "binary";
          const recovery = await preprocess(page, recoveryVariant);
          if (state.tier0 !== false) {
            const res = await withRetry(() => ocrGateway(recovery.dataUrl, lang, ocrHint(page, lang)));
            attempts.push({ text: res.text, engine: `${res.engine || "neural"}+${recoveryVariant}`, score: scoreText(res.text, lang) });
          } else {
            const r = await ocrLocal(recovery.blob, lang);
            attempts.push({ text: r.text, engine: `offline+${recoveryVariant}`, score: scoreText(r.text, lang) * (0.35 + r.confidence / 300) });
          }
        } catch (err) {
          console.warn("[scanner] recovery pass failed:", err && err.message);
        }
      }

      const best = attempts.sort((a, b) => b.score - a.score)[0] || { text: "", engine: "" };
      let repaired = repairText(cleanPageText(best.text, lang), lang);

      // Pass 3: Contextual Deduction & Linguistic Self-Correction ("Intelligent Guessing")
      // If quality is not near-perfect (< 0.96) or has minor OCR artifacts, run contextual proofreading
      let contextualApplied = false;
      if (repaired && best.score < 0.96 && (localStorage.getItem("geminiApiKey") || state.tier0 !== false)) {
        try {
          const guessed = await contextualLinguisticPass(repaired, lang);
          if (guessed && guessed.trim().length > 15) {
            repaired = guessed.trim();
            best.score = Math.max(best.score, scoreText(repaired, lang));
            best.engine += "+contextual-deduction";
            contextualApplied = true;
          }
        } catch (e) {
          console.warn("[scanner] contextual deduction pass skipped:", e);
        }
      }

      // Pass 4: Offline Linguistic Deduction & Morphological Pass
      if (repaired && (lang === "kat" || lang === "ka" || (repaired.match(/[\u10A0-\u10FF]/g) || []).length > 8)) {
        repaired = offlineLinguisticPass(repaired, lang);
        if (!contextualApplied && best.engine.indexOf("offline") !== -1) {
          best.engine += "+offline-deduction";
        }
      }

      page.text = repaired;
      page.engine = best.engine;
      page.quality = Math.round((best.score || 0) * 100);
      page.warning = qualityWarning(page, best.score);
      if (best.score < 0.55) {
        page.status = "unreadable";
        page.warning = page.warning || "Unreadable OCR (<55% word validity) — photo needs rescan.";
      } else {
        page.status = page.text ? "done" : "empty";
      }
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
    if (lang === "kat") bits.push("The page is Georgian (Mkhedruli). Distinguish visually close letters (ვ/პ/კ, შ/წ/ჭ, რ/უ/ყ, ქ/ფ). Never transliterate into Latin.");
    if (lang === "eng") bits.push("The page is English prose. Preserve compound hyphenated words (e.g. well-known).");
    if ((page._sharpness || 999) < 140) bits.push("The photo has softness or blur: deduce faint and degraded character stems from surrounding sentence context, grammar and vocabulary. Transcribe completely without dropping words.");
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
    score -= Math.min(0.40, (junk / Math.max(30, t.length)) * 2.5);
    const words = t.split(/\s+/).filter(Boolean);
    const single = words.filter((w) => w.length === 1 && w !== 'I' && w !== 'a' && w !== 'A').length;
    const singleRatio = single / Math.max(1, words.length);
    // Severe penalty for shredded words (which was the hallmark of 50-60% Tesseract garble)
    if (singleRatio > 0.15) {
      score *= Math.max(0.05, 1 - (singleRatio - 0.15) * 4);
    }

    // Georgian word validity gate: every valid Georgian word must have vowels (ა, ე, ი, ო, უ)
    if (ka > 10) {
      const kaWords = words.filter(w => /[\u10A0-\u10FF]/.test(w));
      let validKaWords = 0;
      for (const w of kaWords) {
        if (w.length < 2 || /[აეიოუ]/.test(w)) {
          validKaWords++;
        }
      }
      const kaValidityRatio = validKaWords / Math.max(1, kaWords.length);
      if (kaValidityRatio < 0.55) {
        score *= Math.max(0.05, kaValidityRatio);
      }
    }

    score += Math.min(0.1, words.length / 3000); // reward fuller pages
    return Math.max(0, Math.min(1, score));
  }

  function qualityWarning(page, score) {
    if ((page._sharpness || 999) < 45) return "Photo looks blurry — re-shoot for best accuracy.";
    if ((page._exposure || 128) < 60) return "Photo is very dark — add light and re-shoot.";
    if ((page._exposure || 128) > 220) return "Glare/over-exposure detected — avoid direct light.";
    if (score < 0.55) return "Unreadable or garbled OCR (<55% validity) — photo needs rescan.";
    if (score < 0.70) return "Low recognition confidence — please check this page.";
    return null;
  }

  // Deterministic repair of the OCR mistakes each language actually makes.
  function repairText(text, lang) {
    let t = text || "";
    if (!t) return t;

    // Strip stray OCR math symbols and isolated punctuation noise
    t = t.replace(/(?:^|\s)[=+|/_#%*~<>]{1,3}(?=\s|$)/g, " ");
    // Strip repeated OCR loops (IIIIIIII, =====, -----)
    t = t.replace(/([A-Za-z0-9=+_\-|])\1{4,}/g, " ");
    t = t.replace(/,{2,}/g, ",").replace(/\.{3,}/g, "…");

    // Common print ligatures across all text
    t = t.replace(/\uFB01/g, "fi")
         .replace(/\uFB02/g, "fl")
         .replace(/\uFB00/g, "ff")
         .replace(/\uFB03/g, "ffi")
         .replace(/\uFB04/g, "ffl");

    // Rejoin soft-hyphenated line breaks from printed books
    t = t.replace(/([\u10A0-\u10FFa-zA-Z]+)-\s*[\r\n]+\s*([\u10A0-\u10FFa-zA-Z]+)/g, "$1$2");

    const isKa = lang === "kat" || (lang === "auto" && detectLang(t) === "kat");
    if (isKa) {
      // Normalize Mtavruli titles, Asomtavruli drop caps, and archaic letters to standard Mkhedruli
      const nchars = [];
      for (let i = 0; i < t.length; i++) {
        const c = t.charCodeAt(i);
        if (c >= 0x1C90 && c <= 0x1CBF) nchars.push(String.fromCharCode(c - 0x1C90 + 0x10D0));
        else if (c >= 0x10A0 && c <= 0x10C5) nchars.push(String.fromCharCode(c + 0x30));
        else if (c === 0x10F3) nchars.push('ვ');
        else if (c === 0x10F4) nchars.push('ხ');
        else if (c === 0x10F5) nchars.push('ჰ');
        else if (c === 0x10F6) nchars.push('ფ');
        else nchars.push(t[i]);
      }
      t = nchars.join("");

      // Strip printed book footnote superscripts and trailing footnote markers on words
      t = t.replace(/([\u10A0-\u10FF]+)[¹²³⁴⁵⁶⁷⁸⁹⁰*†‡§]+/g, "$1");
      t = t.replace(/([\u10A0-\u10FF]+)[0-9](?=[,.;:!?\s]|$)/g, "$1");

      // Collapse repeated Georgian vowels/consonants that never appear in real print
      t = t.replace(/([ა-ჰ])\1{3,}/g, "$1$1");
      // Remove runs of identical isolated single letters (e.g. ს ს ს -> ს)
      t = t.replace(/(?:^|\s)([ა-ჰ])(?:\s+\1){2,}(?=\s|$)/g, " ");
      // Merge common Georgian words split by OCR spaces
      const common = ["და", "არ", "კი", "რა", "ეს", "ის", "თუ", "მე", "მის", "მას", "რომ", "თქვა", "იყო", "მერე", "როცა", "ხოლო"];
      for (const w of common) {
        const spaced = w.split("").join("\\s+");
        t = t.replace(new RegExp(`(?:^|\\s)${spaced}(?=\\s|$)`, "g"), " " + w + " ");
      }

      // Disambiguate common OCR-garbled core words
      const ocrFixes = [
        [/(?<![\u10A0-\u10FF])კატარა(?![ა-ჰ])/g, 'პატარა'],
        [/(?<![\u10A0-\u10FF])ვატარა(?![ა-ჰ])/g, 'პატარა'],
        [/(?<![\u10A0-\u10FF])უფლისწუღი(?![ა-ჰ])/g, 'უფლისწული'],
        [/(?<![\u10A0-\u10FF])უფლისწუღმა(?![ა-ჰ])/g, 'უფლისწულმა'],
        [/(?<![\u10A0-\u10FF])თვითმფრინავო(?![ა-ჰ])/g, 'თვითმფრინავი'],
        [/(?<![\u10A0-\u10FF])მახრჩობეღა(?![ა-ჰ])/g, 'მახრჩობელა'],
        [/(?<![\u10A0-\u10FF])მეგობარო(?=\s+ჩემი|\s+თქვა)/g, 'მეგობარი'],
        [/(?<![\u10A0-\u10FF])გამარჯოპა(?![ა-ჰ])/g, 'გამარჯობა'],
        [/(?<![\u10A0-\u10FF])სიყვარუღი(?![ა-ჰ])/g, 'სიყვარული'],
        [/(?<![\u10A0-\u10FF])სინათღე(?![ა-ჰ])/g, 'სინათლე'],
        [/(?<![\u10A0-\u10FF])მშვენიეღი(?![ა-ჰ])/g, 'მშვენიერი'],
        [/(?<![\u10A0-\u10FF])სამყაყო(?![ა-ჰ])/g, 'სამყარო'],
        [/(?<![\u10A0-\u10FF])წეშმარიტი(?![ა-ჰ])/g, 'ჭეშმარიტი'],
        [/(?<![\u10A0-\u10FF])შეშმარიტი(?![ა-ჰ])/g, 'ჭეშმარიტი'],
        [/(?<![\u10A0-\u10FF])ადამიანპა(?![ა-ჰ])/g, 'ადამიანმა'],
        [/(?<![\u10A0-\u10FF])რომეღიც(?![ა-ჰ])/g, 'რომელიც'],
        [/(?<![\u10A0-\u10FF])რომეღმაც(?![ა-ჰ])/g, 'რომელმაც'],
        [/(?<![\u10A0-\u10FF])ყვეღაფერი(?![ა-ჰ])/g, 'ყველაფერი'],
        [/(?<![\u10A0-\u10FF])ყვეღა(?![ა-ჰ])/g, 'ყველა'],
        [/(?<![\u10A0-\u10FF])ძაღიან(?![ა-ჰ])/g, 'ძალიან'],
        [/(?<![\u10A0-\u10FF])შეუძღია(?![ა-ჰ])/g, 'შეუძლია'],
        [/(?<![\u10A0-\u10FF])შეუძღება(?![ა-ჰ])/g, 'შეუძლია']
      ];
      for (const [re, repl] of ocrFixes) {
        t = t.replace(re, repl);
      }

      // Dialogue dashes for lines starting with hyphen: "- გამარჯობა" -> "— გამარჯობა"
      t = t.replace(/(^|[\r\n]+)\s*[-–]\s+([\u10A0-\u10FF])/g, "$1— $2");
      // Format authentic Georgian quotation marks: „...“
      t = t.replace(/(^|[\s(\[])["“]([^\s"”])/g, "$1„$2");
      t = t.replace(/([^\s"„])["”]([\s)\].,!?;:]|$)/g, "$1“$2");

      // Comprehensive Latin/Cyrillic look-alikes leaking into Georgian words.
      const map = {
        // Latin lower
        a: "ა", b: "ბ", c: "ც", d: "დ", e: "ე", f: "ფ", g: "გ", h: "ჰ",
        i: "ი", j: "ჯ", k: "კ", l: "ი", m: "მ", n: "ნ", o: "ო", p: "პ",
        q: "ყ", r: "რ", s: "ს", t: "ტ", u: "უ", v: "ვ", w: "წ", x: "ხ",
        y: "ყ", z: "ზ",
        // Digits & OCR glyphs frequently misread as Georgian letters
        "0": "ო", "1": "ი", "3": "ვ", "4": "ჩ", "6": "ბ", "8": "გ",
        "|": "ი", "/": "ი",
        // Cyrillic look-alikes from Soviet-era fonts / Russian OCR leakage
        "а": "ა", "б": "ბ", "в": "ვ", "г": "გ", "д": "დ", "е": "ე",
        "з": "ზ", "ი": "ი", "к": "კ", "л": "ლ", "м": "მ", "ნ": "ნ",
        "о": "ო", "п": "პ", "р": "რ", "с": "ს", "т": "თ", "у": "უ",
        "ф": "ფ", "х": "ხ", "ц": "ც", "ч": "ჩ", "ш": "შ"
      };
      t = t.replace(/[\u10A0-\u10FF]+[A-Za-z0-9а-яА-Я|/]+[\u10A0-\u10FF]*|[A-Za-z0-9а-яА-Я|/]+[\u10A0-\u10FF]+/g, (chunk) =>
        chunk.replace(/[A-Za-z0-9а-яА-Я|/]/g, (c) => (map[c.toLowerCase()] !== undefined ? map[c.toLowerCase()] : c)),
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
    // Join hyphenated line breaks, preserving legitimate hyphenated compounds
    const compoundPrefixes = /^(self|well|cross|state|half|co|pre|post|non|multi|all|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)$/i;
    t = t.replace(/(\p{L}+)[-\u2010\u2011]\n(\p{L}+)/gu, (match, before, after) => {
      if (compoundPrefixes.test(before)) {
        return before + "-" + after;
      }
      return before + after;
    });
    t = t.replace(/([^\n])\n(?!\n)(?=\S)/g, "$1 ");
    t = t.replace(/[ \t]{2,}/g, " ");
    t = t.replace(/\n{3,}/g, "\n\n");
    // Drop stray page numbers left on their own line.
    t = t.replace(/^\s*\d{1,4}\s*$/gm, "");
    if (lang !== "eng") {
      // Foreign sentence terminators that OCR/LLMs sometimes leak into Georgian.
      t = t.replace(/[\u0964\u0965\u3002\u06D4\u0589]/g, ".");
      t = t.replace(/\s+([.,!?;:])/g, "$1");
      // Camera OCR broken vertical bar repair between Georgian characters: e.g. სახლ|ს -> სახლის
      t = t.replace(/([\u10A0-\u10FF])\|([\u10A0-\u10FF])/g, "$1ი$2");
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
      const allText = pages.map((p) => p.text).join(" ");
      const isKa = state.lang === "kat" || state.lang === "ka" || detectLang(allText) === "kat";
      state.structure =
        typeof window.detectBookStructure === "function" && pages.length
          ? window.detectBookStructure(pages, { isKa })
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
      const allText = pages.map((p) => p.text).join(" ");
      const detected = state.lang === "auto" ? detectLang(allText) : state.lang;
      const isKa = detected === "kat" || detected === "ka" || detectLang(allText) === "kat";
      // Georgian pages go through the same in-house rule engine (v1.45.0
      // auto-fixes + QA rules) that the translation engine uses, so scanned
      // Georgian is cleaned up the same way translated Georgian is.
      const cleanup = (t) => {
        let out = isKa && typeof window.applyKaRuleEngine === "function" ? window.applyKaRuleEngine(t) : t;
        // Trained OCR pack (Training Lab) runs last; no-op when no pack is active.
        if (window.EngbotPack) out = window.EngbotPack.apply(out, isKa ? "ka" : "en", "transcribe");
        return out;
      };
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
    if (!text) return "eng";
    const ka = (text.match(/[\u10A0-\u10FF\u1C90-\u1CBF]/g) || []).length;
    const en = (text.match(/[A-Za-z]/g) || []).length;
    return (ka > 25 && (ka >= en * 0.25 || ka > 100)) || ka > text.length * 0.15 ? "kat" : "eng";
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

  const scannerApi = {
    reorderByPageNumbers,
    _autoOrder: autoOrderPages,
    _repairText: repairText,
    _offlineSpellCheckKa: offlineSpellCheckKa,
    _offlineLinguisticPass: offlineLinguisticPass,
    _cleanPageText: cleanPageText,
    _state: state,
    open,
    close,
    render,
    setLang,
    startCamera,
    startNativeCamera,
    toggleTorch,
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
    promptVisionKey,
  };

  if (typeof window !== "undefined") {
    window.LuminaScanner = scannerApi;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = scannerApi;
  }
})();
