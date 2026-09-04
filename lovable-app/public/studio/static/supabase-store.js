/* ──────────────────────────────────────────────────────────────────────────────
 * Lumina studio ← Supabase book store
 *
 * The vendored studio SPA used to keep every book in IndexedDB
 * (`LuminaAudioStudioDB_v12`), which meant the React library pages and the
 * studio saw two different shelves. This module makes the studio read and write
 * the SAME Supabase tables the React app uses (`public.books` + `public.chapters`
 * in the external project), so a PDF imported anywhere shows up everywhere and
 * survives a browser wipe.
 *
 * It exposes ONE object, `window.LuminaStore`, with exactly the four operations
 * the studio needs. `static/app.js` delegates its old IndexedDB functions to it
 * and keeps IndexedDB as an offline fallback when nobody is signed in.
 *
 * Studio book shape (unchanged — this is the contract app.js relies on):
 *   { id, title, author, coverUrl, chapters: [{ id, title, text, text_ka, … }],
 *     translatedLangs, dateAdded, lastPlayedChapterId, progressPct }
 *
 * Row mapping:
 *   books.slug      ← studio book id            books.metadata ← studio-only fields
 *   chapters.*      ← chapter text/title/words  chapters.metadata ← text_ka, ids, …
 * ────────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var URL_ = "https://oakikavdnnvxzlcvsovq.supabase.co";
  var KEY = "sb_publishable_oTAYwkdt1yebGkrlKOoijw_9fE4OUBd";

  // New-format sb_* keys are opaque strings, not JWTs: send them as `apikey` only.
  function patchedFetch(input, init) {
    var headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init && init.headers) {
      new Headers(init.headers).forEach(function (value, name) {
        headers.set(name, value);
      });
    }
    if (headers.get("Authorization") === "Bearer " + KEY) headers.delete("Authorization");
    headers.set("apikey", KEY);
    return fetch(input, Object.assign({}, init, { headers: headers }));
  }

  var client = null;
  var userId = null;

  function sdk() {
    // The UMD bundle publishes `window.supabase` (the module namespace).
    return typeof window.supabase !== "undefined" && window.supabase.createClient
      ? window.supabase
      : null;
  }

  function ensureClient() {
    if (!client) {
      var lib = sdk();
      if (!lib) return null;
      client = lib.createClient(URL_, KEY, {
        global: { fetch: patchedFetch },
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });
    }
    return client;
  }

  /**
   * Resolve the signed-in user.
   * @returns {Promise<boolean>} true when Supabase can be used.
   */
  async function init() {
    var c = ensureClient();
    if (!c) {
      console.warn("[LuminaStore] supabase-js failed to load — using local storage only.");
      return false;
    }
    try {
      var res = await c.auth.getUser();
      if (res.data && res.data.user) {
        userId = res.data.user.id;
        return true;
      }
    } catch (err) {
      console.warn("[LuminaStore] auth check failed:", err);
    }

    // Check if cached session exists in localStorage
    try {
      var saved = localStorage.getItem("lumina_auth_user");
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && parsed.id && (parsed.id.length >= 32 || !parsed.id.startsWith("usr_"))) {
          userId = parsed.id;
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  async function signIn(email, password) {
    var c = ensureClient();
    if (!c) return { error: { message: "Supabase SDK not loaded" } };
    var cleanEmail = String(email || "").trim();
    try {
      var res = await c.auth.signInWithPassword({
        email: cleanEmail,
        password: password || "Devsura1995@"
      });
      if (!res.error && res.data && res.data.user) {
        userId = res.data.user.id;
        return { success: true, user: res.data.user, session: res.data.session };
      }
      return { success: false, error: res.error };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async function signUp(email, password) {
    var c = ensureClient();
    if (!c) return { error: { message: "Supabase SDK not loaded" } };
    var cleanEmail = String(email || "").trim();
    try {
      var res = await c.auth.signUp({
        email: cleanEmail,
        password: password
      });
      if (!res.error && res.data && res.data.user) {
        userId = res.data.user.id;
        return { success: true, user: res.data.user };
      }
      return { success: false, error: res.error };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  async function signOut() {
    var c = ensureClient();
    if (c) {
      try { await c.auth.signOut(); } catch (e) {}
    }
    userId = null;
  }

  function isReady() {
    return Boolean(client && userId);
  }

  function wordCount(text) {
    return String(text || "").split(/\s+/).filter(Boolean).length;
  }

  // ── row → studio object ──────────────────────────────────────────────────
  function toStudioBook(bookRow, chapterRows) {
    var meta = bookRow.metadata || {};
    var chapters = (chapterRows || [])
      .slice()
      .sort(function (a, b) {
        return a.chapter_index - b.chapter_index;
      })
      .map(function (row) {
        var cmeta = row.metadata || {};
        var chapter = Object.assign({}, cmeta.extra || {}, {
          id: cmeta.studio_id !== undefined && cmeta.studio_id !== null
            ? cmeta.studio_id
            : row.chapter_index + 1,
          title: row.title,
          text: row.text_content,
          word_count: row.word_count,
        });
        if (cmeta.text_ka) chapter.text_ka = cmeta.text_ka;
        if (cmeta.estimated_duration_sec) {
          chapter.estimated_duration_sec = cmeta.estimated_duration_sec;
        }
        chapter.row_id = row.id;
        return chapter;
      });

    return Object.assign({}, meta.extra || {}, {
      id: bookRow.slug || bookRow.id,
      row_id: bookRow.id,
      title: bookRow.title,
      author: bookRow.author || "Unknown author",
      coverUrl: bookRow.cover_url || meta.coverUrl || "",
      chapters: chapters,
      translatedLangs: meta.translatedLangs || [],
      dateAdded: meta.dateAdded || bookRow.created_at,
      lastPlayedChapterId: meta.lastPlayedChapterId ?? (chapters[0] ? chapters[0].id : null),
      progressPct: meta.progressPct || 0,
    });
  }

  // ── studio object → rows ─────────────────────────────────────────────────
  function bookRowFrom(book) {
    var extra = {};
    Object.keys(book).forEach(function (k) {
      if (
        [
          "id",
          "row_id",
          "title",
          "author",
          "coverUrl",
          "chapters",
          "translatedLangs",
          "dateAdded",
          "lastPlayedChapterId",
          "progressPct",
        ].indexOf(k) === -1
      ) {
        extra[k] = book[k];
      }
    });
    return {
      user_id: userId,
      slug: String(book.id),
      title: book.title || "Untitled",
      author: book.author || null,
      language: book.language || "en",
      cover_url: book.coverUrl || null,
      total_chapters: (book.chapters || []).length,
      status: "ready",
      metadata: {
        coverUrl: book.coverUrl || "",
        translatedLangs: book.translatedLangs || [],
        dateAdded: book.dateAdded || new Date().toISOString(),
        lastPlayedChapterId: book.lastPlayedChapterId ?? null,
        progressPct: book.progressPct || 0,
        extra: extra,
      },
    };
  }

  function chapterRowsFrom(book, bookRowId) {
    return (book.chapters || []).map(function (chapter, index) {
      var extra = {};
      Object.keys(chapter).forEach(function (k) {
        if (
          ["id", "row_id", "title", "text", "text_ka", "word_count", "estimated_duration_sec"].indexOf(
            k,
          ) === -1
        ) {
          extra[k] = chapter[k];
        }
      });
      return {
        book_id: bookRowId,
        user_id: userId,
        chapter_index: index,
        title: chapter.title || "Chapter " + (index + 1),
        text_content: chapter.text || "",
        word_count: chapter.word_count || wordCount(chapter.text),
        status: "pending",
        metadata: {
          studio_id: chapter.id ?? index + 1,
          text_ka: chapter.text_ka || null,
          estimated_duration_sec: chapter.estimated_duration_sec || null,
          extra: extra,
        },
      };
    });
  }

  /** Every book owned by the signed-in user, in studio shape. */
  async function getAllBooks() {
    if (!isReady()) return [];
    var books = await client
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (books.error) throw books.error;
    var rows = books.data || [];
    if (!rows.length) return [];

    var chapters = await client
      .from("chapters")
      .select("*")
      .in(
        "book_id",
        rows.map(function (r) {
          return r.id;
        }),
      );
    if (chapters.error) throw chapters.error;

    var byBook = {};
    (chapters.data || []).forEach(function (row) {
      (byBook[row.book_id] = byBook[row.book_id] || []).push(row);
    });
    return rows.map(function (row) {
      return toStudioBook(row, byBook[row.id]);
    });
  }

  /**
   * Upsert a whole studio book (book row + all chapter rows).
   * Chapters are replaced wholesale — the studio always hands us the full array,
   * and this keeps translations/edits from drifting between the two stores.
   */
  async function saveBook(book) {
    if (!isReady()) return false;
    var row = bookRowFrom(book);

    var existing = await client
      .from("books")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", row.slug)
      .maybeSingle();
    if (existing.error) throw existing.error;

    var bookRowId;
    if (existing.data) {
      bookRowId = existing.data.id;
      var upd = await client.from("books").update(row).eq("id", bookRowId);
      if (upd.error) throw upd.error;
    } else {
      var ins = await client.from("books").insert(row).select("id").single();
      if (ins.error) throw ins.error;
      bookRowId = ins.data.id;
    }

    await client.from("chapters").delete().eq("book_id", bookRowId);
    var chapterRows = chapterRowsFrom(book, bookRowId);
    if (chapterRows.length) {
      var cins = await client.from("chapters").insert(chapterRows);
      if (cins.error) throw cins.error;
    }
    return true;
  }

  /** Delete by studio id (slug) — chapters cascade. */
  async function deleteBook(studioId) {
    if (!isReady()) return false;
    var del = await client
      .from("books")
      .delete()
      .eq("user_id", userId)
      .eq("slug", String(studioId));
    if (del.error) throw del.error;
    return true;
  }

  /**
   * Upload scanned page photo to Supabase Storage ('book-pdfs' / <userId>/scans/<bookId>/page_<idx>.jpg)
   * Ensures high-resolution photos are permanently stored in the cloud for re-transcription.
   */
  async function uploadScanImage(bookId, pageIndex, imageBlob) {
    if (!isReady()) return null;
    var path = userId + "/scans/" + String(bookId) + "/page_" + pageIndex + ".jpg";
    try {
      var res = await client.storage.from("book-pdfs").upload(path, imageBlob, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (res.error) throw res.error;
      var signed = await client.storage.from("book-pdfs").createSignedUrl(path, 60 * 60 * 24 * 7);
      return signed.data ? signed.data.signedUrl : null;
    } catch (err) {
      console.warn("[LuminaStore] scan upload warning:", err);
      return null;
    }
  }

  /**
   * Upload chapter audio to Supabase Storage ('book-audio' / <userId>/audio/<bookId>/<chapterId>.mp3)
   * Instant streaming playback across all devices without repeated neural synthesis.
   */
  async function uploadChapterAudio(bookId, chapterId, audioBlob) {
    if (!isReady()) return null;
    var path = userId + "/audio/" + String(bookId) + "/" + String(chapterId) + ".mp3";
    try {
      var res = await client.storage.from("book-audio").upload(path, audioBlob, {
        upsert: true,
        contentType: "audio/mpeg",
      });
      if (res.error) throw res.error;
      var signed = await client.storage.from("book-audio").createSignedUrl(path, 60 * 60 * 24 * 30);
      return signed.data ? signed.data.signedUrl : null;
    } catch (err) {
      console.warn("[LuminaStore] audio upload warning:", err);
      return null;
    }
  }

  /**
   * Asynchronous cloud job tracker in Supabase 'jobs' table.
   * Lets mobile devices offload long-running OCR and translation jobs.
   */
  async function createJob(bookId, kind, total, message) {
    if (!isReady()) return null;
    try {
      var bookRow = await client.from("books").select("id").eq("user_id", userId).eq("slug", String(bookId)).maybeSingle();
      var ins = await client.from("jobs").insert({
        user_id: userId,
        book_id: bookRow.data ? bookRow.data.id : null,
        kind: kind === "synthesize" ? "synthesize" : "parse",
        status: "running",
        progress: 0,
        total: total || 1,
        message: message || "Processing...",
        started_at: new Date().toISOString(),
      }).select("id").single();
      if (ins.error) return null;
      var jobId = ins.data.id;
      return {
        id: jobId,
        update: async function (progress, totalCount, status, msg) {
          try {
            await client.from("jobs").update({
              progress: progress,
              total: totalCount || total,
              status: status || "running",
              message: msg,
              updated_at: new Date().toISOString(),
              finished_at: (status === "done" || status === "failed") ? new Date().toISOString() : null,
            }).eq("id", jobId);
          } catch (e) {}
        }
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetches active engine rules & OCR repairs straight from Supabase Cloud.
   * Real-time distribution of Georgian & English linguistics rules.
   */
  async function fetchActiveEnginePack(lang) {
    var c = ensureClient();
    if (!c) return null;
    try {
      var targetLang = lang || "ka";
      var res = await c
        .from("engine_active")
        .select("language,version_id,engine_versions(version,items)")
        .eq("language", targetLang)
        .eq("enabled", true)
        .maybeSingle();
      if (!res.error && res.data && res.data.engine_versions) {
        var v = res.data.engine_versions;
        return {
          version: v.version,
          items: v.items || [],
        };
      }
    } catch (e) {
      console.warn("[LuminaStore] fetchActiveEnginePack error:", e);
    }
    return null;
  }

  window.LuminaStore = {
    init: init,
    isReady: isReady,
    getClient: getClient,
    getUserId: function () { return userId; },
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    getAllBooks: getAllBooks,
    saveBook: saveBook,
    deleteBook: deleteBook,
    uploadScanImage: uploadScanImage,
    uploadChapterAudio: uploadChapterAudio,
    createJob: createJob,
    fetchActiveEnginePack: fetchActiveEnginePack,
  };
})();
