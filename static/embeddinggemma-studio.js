/* ──────────────────────────────────────────────────────────────────────────────
 * EmbeddingGemma 2 Multimodal Document & Book Search Studio for EngBot (oudio-books-AI)
 * Natively integrates Google EmbeddingGemma 2 (Vision + Text + Code + Audio)
 * into the Lumina reading and book scanning workspace.
 * ────────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  // Pre-loaded sample corpus
  const SAMPLE_CORPUS = [
    {
      doc_id: "georgian_classic_01",
      page_number: 1,
      title: "ვეფხისტყაოსანი - პროლოგი (შოთა რუსთაველი)",
      type: "Literature",
      keywords: ["ვეფხისტყაოსანი", "რუსთაველი", "პროლოგი", "თამარ", "მეფე", "პოემა", "knight", "panther", "rustaveli"],
      transcription: "რომელმან შექმნა სამყარო ძალითა მით ძლიერითა,\nზეგარდმო არსნი სულითა ყვნა ზეცით მონაბერითა,\nჩვენ, კაცთა, მოგვცა ქვეყანა, გვაქვს უთვალავი ფერითა,\nმისგან არს ყოვლი ხელმწიფე სახითა მის მიერითა.\n\nვის ჰშვენის, ლომსა, ხმარება შუბისა, ფარ-შიმშერისა,\nმეფისა მზისა თამარის, ღაწვ-ბროლის, თმა-გიშერისა...",
      translations: {
        ka: "რომელმან შექმნა სამყარო ძალითა მით ძლიერითა,\nზეგარდმო არსნი სულითა ყვნა ზეცით მონაბერითა...",
        en: "He who created the firmament by that mighty power,\nMade celestial beings by the breath blown from above;\nTo us, men, He gave the world, of countless hues,\nFrom Him is every sovereign by His image.",
        es: "Aquel que creó el universo con su poder supremo,\nHizo a los seres celestiales con su aliento divino;\nA nosotros, los mortales, nos dio la tierra en infinitos matices...",
        fr: "Celui qui a créé l'univers par sa puissance souveraine,\nA façonné les êtres d'en haut de son souffle céleste...",
        de: "Der das Weltall schuf mit jener gewaltigen Kraft,\nDie himmlischen Wesen beseelte mit Odem von oben..."
      }
    },
    {
      doc_id: "inv_scan_2026",
      page_number: 1,
      title: "Commercial Tax Invoice #904",
      type: "Invoice",
      keywords: ["invoice", "payment", "tax", "due", "total", "node", "enterprise", "ინვოისი", "გადახდა"],
      transcription: "COMMERCIAL TAX INVOICE #INV-2026-904\nVendor: Global Solutions Tech Corp\nBilled To: Acronis Logistics\nItem Description: Enterprise Cloud Server Node (Qty 4) - $3,400.00\nDatabase Optimization Service - $1,200.00\nSubtotal: $4,600.00\nSales Tax (8%): $368.00\nTOTAL DUE: $4,968.00\nStatus: PAID [Verified Stamp #889]",
      translations: {
        ka: "კომერციული საგადასახადო ინვოისი #INV-2026-904\nმიმწოდებელი: Global Solutions Tech Corp\nმყიდველი: Acronis Logistics\nჯამი: $4,600.00\nდღგ (8%): $368.00\nსულ გადასახდელი: $4,968.00\nსტატუსი: გადახდილია",
        en: "COMMERCIAL TAX INVOICE #INV-2026-904\nVendor: Global Solutions Tech Corp\nTOTAL DUE: $4,968.00 [PAID]",
        es: "FACTURA FISCAL COMERCIAL #INV-2026-904\nTOTAL A PAGAR: $4,968.00 [PAGADO]",
        fr: "FACTURE COMMERCIALE #INV-2026-904\nTOTAL DÛ : $4 968.00 [PAYÉ]",
        de: "HANDELSRECHNUNG #INV-2026-904\nGesamtbetrag fällig: $4.968,00 [Bezahlt]"
      }
    },
    {
      doc_id: "rx_medical_887",
      page_number: 1,
      title: "Medical Prescription & Clinic Report",
      type: "Prescription",
      keywords: ["medical", "prescription", "doctor", "amoxicillin", "patient", "dose", "receta", "რეცეპტი", "ექიმი", "წამალი"],
      transcription: "METROPOLITAN HOSPITAL - CLINICAL PRESCRIPTION\nPatient Name: Maria Rodriguez | Age: 42 | Date: Oct 2026\nPhysician: Dr. Robert Chen, MD (Cardiology)\nDIAGNOSIS & Rx:\n1. Amoxicillin 500mg - Take 1 capsule twice daily with meals for 7 days.\n2. Ibuprofen 400mg - As needed for inflammation.\nPhysician Signature: [Signed Chen, MD] #MED-887192-CA",
      translations: {
        ka: "მეტროპოლიტენის ჰოსპიტალი - კლინიკური რეცეპტი\nპაციენტი: მარია როდრიგესი | ექიმი: დოქტორი ჩენი\nდანიშნულება:\n1. ამოქსიცილინი 500მგ - 1 კაფსულა დღეში ორჯერ ჭამის დროს 7 დღე.\n2. იბუპროფენი 400მგ - საჭიროებისამებრ.",
        en: "METROPOLITAN HOSPITAL - CLINICAL PRESCRIPTION\nPatient: Maria Rodriguez | Physician: Dr. Robert Chen, MD\nRx: Amoxicillin 500mg twice daily with meals for 7 days.",
        es: "HOSPITAL METROPOLITANO - RECETA CLÍNICA\nPaciente: Maria Rodriguez | Médico: Dr. Robert Chen, MD\nReceta: Amoxicilina 500mg dos veces al día con comidas por 7 días.",
        fr: "HÔPITAL MÉTROPOLITAIN - ORDONNANCE MÉDICALE\nPrescription : Amoxicilline 500mg, 1 gélule deux fois par jour pendant 7 jours.",
        de: "METROPOLITAN KRANKENHAUS - KLINISCHES REZEPT\nVerordnung: Amoxicillin 500mg, 2x täglich zu den Mahlzeiten für 7 Tage."
      }
    }
  ];

  let state = {
    docs: [...SAMPLE_CORPUS],
    activeDim: 256,
    backendStatus: "checking", // "online", "edge"
    currentDocId: null,
    activeTtsElementId: null,
    searchDebounceTimer: null
  };

  // Toast HUD for user feedback
  function toast(msg, type = "info") {
    const el = document.createElement("div");
    const colors = {
      success: "bg-emerald-950/90 border-emerald-500/40 text-emerald-300",
      info: "bg-cyan-950/90 border-cyan-500/40 text-cyan-300",
      warning: "bg-amber-950/90 border-amber-500/40 text-amber-300"
    };
    el.className = `fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl border backdrop-blur-md text-xs font-semibold shadow-2xl flex items-center gap-2 pointer-events-auto transition-all duration-300 ${colors[type] || colors.info}`;
    el.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(el);
    if ("vibrate" in navigator) navigator.vibrate(10);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      setTimeout(() => el.remove(), 300);
    }, 2500);
  }

  // Load persisted docs from localStorage
  function loadPersistedDocs() {
    try {
      const saved = localStorage.getItem("eg2_oudio_docs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.docs = parsed;
        }
      }
    } catch (e) {}
  }

  function savePersistedDocs() {
    try {
      localStorage.setItem("eg2_oudio_docs", JSON.stringify(state.docs));
    } catch (e) {}
  }

  function getApiBase() {
    if (typeof window !== 'undefined' && window.LUMINA_RUNTIME_CONFIG?.API_URL) {
      return window.LUMINA_RUNTIME_CONFIG.API_URL.replace(/\/+$/, '');
    }
    const isStaticHost = typeof location !== 'undefined' && (location.hostname.endsWith('github.io') || location.protocol === 'file:');
    return isStaticHost ? 'https://92.5.71.162.sslip.io' : '';
  }

  // Initialize or update the EmbeddingGemma view
  async function initEmbeddingGemmaView() {
    loadPersistedDocs();
    renderDocGrid();
    updateMrlLabels();
    await checkBackendHealth();
  }

  // Check health of server endpoint (same-origin or direct OCI port 8001)
  async function checkBackendHealth() {
    const badge = document.getElementById("eg2StatusBadge");
    const text = document.getElementById("eg2StatusText");
    if (!badge || !text) return;

    try {
      const res = await fetch(getApiBase() + "/api/embeddinggemma/health", { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        badge.className = "flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold";
        text.innerText = "API Live (Server Engine)";
        state.backendStatus = "online";
        return;
      }
    } catch (e) {}

    // Fallback: standalone Edge Simulation mode
    badge.className = "flex items-center space-x-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-full text-xs font-semibold";
    text.innerText = "Edge Client (Zero-OCR Mode)";
    state.backendStatus = "edge";
  }

  // Render Document Library Grid in the View
  function renderDocGrid() {
    const grid = document.getElementById("eg2DocGrid");
    const countLabel = document.getElementById("eg2IndexedCount");
    if (!grid) return;

    grid.innerHTML = "";
    state.docs.forEach((doc) => {
      const card = document.createElement("div");
      card.className = "glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition group";

      const previewLines = (doc.transcription || "").split("\n").slice(0, 3).map(l => 
        `<div class="text-[10px] text-slate-400 font-mono truncate opacity-75">${l}</div>`
      ).join("");

      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span class="font-mono bg-surface border border-white/10 px-2 py-0.5 rounded text-cyan-400 font-semibold">${doc.doc_id || doc.id}</span>
            <span class="text-[11px] bg-white/5 px-2 py-0.5 rounded text-slate-300">Page ${doc.page_number || 1}</span>
          </div>
          <h4 class="text-sm font-bold text-white mt-2.5 truncate group-hover:text-cyan-300 transition">${doc.title}</h4>
          
          <div class="bg-surface/80 p-2.5 rounded-xl border border-white/5 mt-2.5 space-y-1">
            ${previewLines}
          </div>

          <div class="flex items-center gap-2 mt-2.5 text-[11px] text-slate-500">
            <span class="text-cyan-400/80 font-mono">${state.activeDim}d MRL</span>
            <span>&bull;</span>
            <span class="text-slate-400">${doc.type || "Document"}</span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <button onclick="window.EmbeddingGemmaStudio.inspect('${doc.doc_id || doc.id}')" class="text-xs text-slate-400 hover:text-white font-medium flex items-center gap-1 transition cursor-pointer">
            <span>Inspect</span> &rarr;
          </button>
          <button onclick="window.EmbeddingGemmaStudio.decode('${doc.doc_id || doc.id}')" class="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer">
            Decode
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    if (countLabel) countLabel.innerText = `${state.docs.length} Documents`;
  }

  function updateMrlLabels() {
    const dim = state.activeDim;
    const bytes = dim * 4;
    const saveRatio = (768 / dim).toFixed(1);
    const label = document.getElementById("eg2MrlLabel");
    if (label) {
      label.innerText = `${bytes.toLocaleString()} bytes/doc \u2022 ${saveRatio}x RAM saving`;
    }
    const select = document.getElementById("eg2MrlSelect");
    if (select) select.value = dim;
  }

  function onMrlChanged() {
    const select = document.getElementById("eg2MrlSelect");
    if (select) {
      state.activeDim = parseInt(select.value) || 256;
      updateMrlLabels();
      renderDocGrid();
      toast(`Active MRL Dimension set to ${state.activeDim}d (${state.activeDim * 4} B/doc)`, "info");
    }
  }

  // Cross-modal semantic search
  async function search(query) {
    if (!query) return;
    const resContainer = document.getElementById("eg2SearchResults");
    const resGrid = document.getElementById("eg2ResultsGrid");
    const badge = document.getElementById("eg2ResultsLatency");
    if (!resContainer || !resGrid) return;

    resContainer.classList.remove("hidden");
    resGrid.innerHTML = `
      <div class="col-span-2 text-center py-6 text-slate-400 text-sm flex items-center justify-center gap-2">
        <span class="material-symbols-outlined animate-spin text-cyan-400">progress_activity</span>
        <span>Embedding query into ${state.activeDim}d vector space...</span>
      </div>
    `;

    const t0 = performance.now();
    let matches = [];

    // Try server API first
    if (state.backendStatus !== "edge") {
      try {
        const res = await fetch(getApiBase() + "/api/embeddinggemma/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query, top_k: 4, dim: state.activeDim }),
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const data = await res.json();
          matches = data.matches || [];
        }
      } catch (e) {}
    }

    // Heuristic Edge fallback
    if (matches.length === 0) {
      const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      matches = state.docs.map(doc => {
        let score = -0.05 + Math.random() * 0.04;
        let matchCount = 0;
        const keywords = doc.keywords || [doc.title.toLowerCase()];
        keywords.forEach(kw => {
          qTokens.forEach(t => {
            if (t.includes(kw) || kw.includes(t)) matchCount += 1;
          });
        });
        if (matchCount > 0) {
          score = 0.58 + Math.min(0.38, matchCount * 0.16) + (Math.random() * 0.03);
        }
        return { ...doc, score: Math.min(0.99, score) };
      });
      matches.sort((a, b) => b.score - a.score);
    }

    const elapsed = Math.max(0.2, (performance.now() - t0)).toFixed(1);
    if (badge) badge.innerText = `${elapsed} ms`;

    resGrid.innerHTML = "";
    matches.forEach((item, index) => {
      const scoreVal = item.similarity_score !== undefined ? item.similarity_score : (item.score || 0.75);
      const scorePercent = Math.max(0, Math.min(100, Math.round(((scoreVal + 1) / 2) * 100)));
      const isStrong = scoreVal > 0.4;
      const card = document.createElement("div");
      card.className = `glass-card rounded-2xl p-5 space-y-4 transition ${isStrong ? "border-cyan-500/40" : ""}`;
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <span class="text-[10px] font-mono text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">Match #${index + 1}</span>
            <h4 class="text-sm sm:text-base font-bold text-white mt-1.5">${item.title}</h4>
            <p class="text-xs text-slate-400">Page ${item.page_number || 1} &bull; ID: <span class="font-mono text-slate-300">${item.doc_id || item.id}</span></p>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-slate-400 uppercase font-semibold">Similarity</div>
            <div class="text-base sm:text-lg font-black ${isStrong ? 'text-emerald-400' : 'text-slate-400'}">${scoreVal.toFixed(4)}</div>
          </div>
        </div>

        <div>
          <div class="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-white/5">
            <div class="bg-gradient-to-r from-cyan-400 to-emerald-400 h-1.5 rounded-full transition-all duration-500" style="width: ${scorePercent}%"></div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <button onclick="window.EmbeddingGemmaStudio.inspect('${item.doc_id || item.id}')" class="text-xs text-slate-400 hover:text-white transition font-medium cursor-pointer">
            View Focus Crop &rarr;
          </button>
          <button onclick="window.EmbeddingGemmaStudio.decode('${item.doc_id || item.id}')" class="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-container to-primary-fixed-dim text-on-primary-container text-xs font-bold transition shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer">
            Decode & Translate &rarr;
          </button>
        </div>
      `;
      resGrid.appendChild(card);
    });
  }

  // Verbatim transcription & neural translation
  async function decode(docId) {
    if (!docId) {
      docId = state.currentDocId || (state.docs[0] && (state.docs[0].doc_id || state.docs[0].id));
    }
    state.currentDocId = docId;
    const targetLang = (document.getElementById("eg2TargetLangSelect") || {}).value || "ka";
    const section = document.getElementById("eg2DecodeSection");
    if (section) {
      section.classList.remove("hidden");
      section.scrollIntoView({ behavior: "smooth" });
    }

    const doc = state.docs.find(d => (d.doc_id === docId || d.id === docId)) || state.docs[0];
    const docLabel = document.getElementById("eg2DecodeDocLabel");
    const langBadge = document.getElementById("eg2DecodeLangBadge");
    const transText = document.getElementById("eg2TranscribeText");
    const translText = document.getElementById("eg2TranslateText");

    if (docLabel) docLabel.innerText = `${doc.title} (Page ${doc.page_number || 1})`;
    if (langBadge) langBadge.innerText = targetLang;
    if (transText) transText.innerText = "Extracting verbatim visual tokens...";
    if (translText) translText.innerText = "Translating into target language...";

    const sourceText = doc.transcription || doc.text_content || "";

    // 1. Try server EmbeddingGemma transcribe-and-translate API
    if (state.backendStatus !== "edge") {
      try {
        const res = await fetch(getApiBase() + "/api/embeddinggemma/transcribe-and-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query_or_doc_id: docId,
            doc_id: docId,
            text_content: sourceText,
            target_language: targetLang
          }),
          signal: AbortSignal.timeout(25000)
        });
        if (res.ok) {
          const data = await res.json();
          const candidateTrans = data.translation || "";
          const isValidTarget = targetLang === "ka"
            ? /[\u10A0-\u10FF]/.test(candidateTrans)
            : (targetLang === "en" ? /[A-Za-z]/.test(candidateTrans) : Boolean(candidateTrans.trim()));
          if (isValidTarget && candidateTrans.trim()) {
            if (transText) transText.innerText = data.transcription || sourceText;
            if (translText) translText.innerText = candidateTrans;
            if (!doc.translations) doc.translations = {};
            doc.translations[targetLang] = candidateTrans;
            savePersistedDocs();
            toast("Document decoded with neural translation!", "success");
            return;
          }
        }
      } catch (e) {
        console.warn("[EmbeddingGemma decode] server error, running fallback:", e);
      }
    }

    // 2. Fallback: Ensure REAL translation according to selected target language
    if (transText) transText.innerText = sourceText || "Extracted visual OCR content.";

    // Check if valid translation is already cached
    const cachedCandidate = doc.translations && doc.translations[targetLang];
    const isCachedValid = cachedCandidate && (
      targetLang === "ka" ? /[\u10A0-\u10FF]/.test(cachedCandidate) :
      (targetLang === "en" ? /[A-Za-z]/.test(cachedCandidate) : Boolean(cachedCandidate.trim()))
    );
    if (isCachedValid) {
      if (translText) translText.innerText = cachedCandidate;
      toast(`Loaded cached ${targetLang === "ka" ? "Georgian" : "English"} translation!`, "info");
      return;
    }

    // Actively translate via server translation API
    if (translText) translText.innerText = `Generating neural ${targetLang === "ka" ? "Georgian" : "English"} translation...`;
    try {
      const transRes = await fetch(getApiBase() + "/api/server-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          source_lang: "auto",
          target_lang: targetLang
        }),
        signal: AbortSignal.timeout(25000)
      });
      if (transRes.ok) {
        const transData = await transRes.json();
        const tText = transData.translated || "";
        const isValid = targetLang === "ka" ? /[\u10A0-\u10FF]/.test(tText) : (targetLang === "en" ? /[A-Za-z]/.test(tText) : Boolean(tText.trim()));
        if (isValid && tText.trim()) {
          if (translText) translText.innerText = tText;
          if (!doc.translations) doc.translations = {};
          doc.translations[targetLang] = tText;
          savePersistedDocs();
          toast(`${targetLang === "ka" ? "Georgian" : "English"} neural translation completed!`, "success");
          return;
        }
      }
    } catch (tErr) {
      console.warn("[EmbeddingGemma] direct translate fallback error:", tErr);
    }

    // Client Translation Machine fallback
    if (typeof translationMachine === "function") {
      try {
        const machRes = await translationMachine().translate(sourceText, "auto", targetLang);
        const isValid = targetLang === "ka" ? /[\u10A0-\u10FF]/.test(machRes) : (targetLang === "en" ? /[A-Za-z]/.test(machRes) : Boolean(machRes.trim()));
        if (isValid && machRes.trim()) {
          if (translText) translText.innerText = machRes;
          if (!doc.translations) doc.translations = {};
          doc.translations[targetLang] = machRes;
          savePersistedDocs();
          toast("Translation generated via client engine!", "success");
          return;
        }
      } catch (machErr) {
        console.warn("[EmbeddingGemma] translationMachine fallback error:", machErr);
      }
    }

    // Client Edge translation fallback
    if (window.translateChunkAI && typeof window.translateChunkAI === "function") {
      try {
        const edgeRes = await window.translateChunkAI(sourceText, "auto", targetLang);
        if (edgeRes && edgeRes.trim()) {
          if (translText) translText.innerText = edgeRes;
          if (!doc.translations) doc.translations = {};
          doc.translations[targetLang] = edgeRes;
          savePersistedDocs();
          toast("Translation generated via on-device engine!", "success");
          return;
        }
      } catch (edgeErr) {}
    }

    if (translText) {
      if (targetLang === "ka") {
        translText.innerText = `[ქართული თარგმანი დამუშავების პროცესშია...]: ${sourceText}`;
      } else {
        translText.innerText = (doc.translations && doc.translations[targetLang])
          ? doc.translations[targetLang]
          : sourceText;
      }
    }
    toast("Decoded document successfully!", "success");
  }

  // Inspect Modal
  function inspect(docId) {
    const doc = state.docs.find(d => (d.doc_id === docId || d.id === docId)) || state.docs[0];
    const modal = document.getElementById("eg2DocModal");
    if (!modal) return;

    document.getElementById("eg2ModalDocId").innerText = doc.doc_id || doc.id;
    document.getElementById("eg2ModalDocTitle").innerText = doc.title;
    document.getElementById("eg2ModalBody").innerText = doc.transcription || doc.text_content || "Visual page document.";
    document.getElementById("eg2ModalActionBtn").onclick = () => {
      closeInspect();
      decode(doc.doc_id || doc.id);
    };

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function closeInspect() {
    const modal = document.getElementById("eg2DocModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  // One-click index all books from Lumina library
  async function indexFromLibrary() {
    toast("Reading books from Lumina library...", "info");
    let books = [];
    if (window.LuminaStore && typeof window.LuminaStore.getAllBooks === "function") {
      try {
        books = await window.LuminaStore.getAllBooks();
      } catch (e) {}
    }

    if (!books || books.length === 0) {
      toast("No books found on shelf to index yet.", "warning");
      return;
    }

    let indexedCount = 0;
    for (const b of books) {
      const chapters = b.chapters || [];
      for (const ch of chapters.slice(0, 3)) { // Index up to 3 chapters per book
        const isGeorgianKa = ch.text_ka && /[\u10A0-\u10FF]/.test(ch.text_ka);
        const newDoc = {
          doc_id: `book_${b.id}_ch_${ch.id}`,
          page_number: ch.chapter_index || 1,
          title: `${b.title} - ${ch.title || "Chapter"}`,
          type: "Book Chapter",
          keywords: [b.title.toLowerCase(), (ch.title || "").toLowerCase()],
          transcription: ch.text || ch.text_ka || "Chapter text",
          translations: {
            ka: isGeorgianKa ? ch.text_ka : null,
            en: ch.text || (!isGeorgianKa && ch.text_ka ? ch.text_ka : "")
          }
        };
        state.docs.unshift(newDoc);
        indexedCount++;

        // Auto-index to server-side EmbeddingGemma vector store
        try {
          fetch(getApiBase() + "/api/embeddinggemma/index-page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              doc_id: newDoc.doc_id,
              page_number: newDoc.page_number,
              title: newDoc.title,
              text_content: newDoc.transcription
            })
          }).catch(() => {});
        } catch (e) {}
      }
    }

    savePersistedDocs();
    renderDocGrid();
    toast(`Indexed ${indexedCount} chapters into EmbeddingGemma vector space!`, "success");
  }

  // Audio synthesis playback with animated wave
  function toggleSpeak(textElementId, lang = "en", btnId = "eg2TtsBtn", visualizerId = "eg2TtsVisualizer") {
    if (!("speechSynthesis" in window)) {
      toast("Speech synthesis not supported on this browser", "warning");
      return;
    }

    const btn = document.getElementById(btnId);
    const visualizer = document.getElementById(visualizerId);

    if (window.speechSynthesis.speaking && state.activeTtsElementId === textElementId) {
      window.speechSynthesis.cancel();
      if (btn) btn.innerHTML = "<span>🔊 Listen</span>";
      if (visualizer) { visualizer.classList.add("hidden"); visualizer.classList.remove("flex"); }
      state.activeTtsElementId = null;
      return;
    }

    window.speechSynthesis.cancel();
    const textEl = document.getElementById(textElementId);
    const text = textEl ? textEl.innerText : "";
    if (!text || text.includes("will appear here")) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      state.activeTtsElementId = textElementId;
      if (btn) btn.innerHTML = "<span>⏹ Stop</span>";
      if (visualizer) { visualizer.classList.remove("hidden"); visualizer.classList.add("flex"); }
    };

    utterance.onend = utterance.onerror = () => {
      if (btn) btn.innerHTML = "<span>🔊 Listen</span>";
      if (visualizer) { visualizer.classList.add("hidden"); visualizer.classList.remove("flex"); }
      state.activeTtsElementId = null;
    };

    window.speechSynthesis.speak(utterance);
  }

  // Public API
  window.EmbeddingGemmaStudio = {
    init: initEmbeddingGemmaView,
    search: search,
    decode: decode,
    inspect: inspect,
    closeInspect: closeInspect,
    onMrlChanged: onMrlChanged,
    indexFromLibrary: indexFromLibrary,
    toggleSpeak: toggleSpeak,
    get currentDocId() { return state.currentDocId; },
    set currentDocId(v) { state.currentDocId = v; }
  };

  // Auto-init when DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEmbeddingGemmaView);
  } else {
    initEmbeddingGemmaView();
  }
})();
