(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.EngbotReading = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    function hash(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.codePointAt(0), 16777619); return (h >>> 0).toString(36); }
    function position(chapter, language, sentences, index, mode) {
        const i = Math.max(0, Math.min(Math.floor(index) || 0, sentences.length - 1));
        return { chapterId: chapter.id, language, sentence: i, anchor: (sentences[i]?.text || sentences[i] || '').slice(0, 180),
            fingerprint: hash(chapter['text_' + language] || chapter.text || ''), mode, savedAt: new Date().toISOString() };
    }
    function resolve(saved, chapter, language, sentences) {
        if (!saved || String(saved.chapterId) !== String(chapter.id) || saved.language !== language) return 0;
        if (saved.fingerprint === hash(chapter['text_' + language] || chapter.text || '')) return Math.max(0, Math.min(saved.sentence || 0, sentences.length - 1));
        const matches = sentences.map((s, i) => (s.text || s).startsWith(saved.anchor || '\0') ? i : -1).filter(i => i >= 0);
        return matches.sort((a, b) => Math.abs(a - saved.sentence) - Math.abs(b - saved.sentence))[0] ?? 0;
    }
    function merge(local, remote) {
        const next = { ...local };
        for (const row of remote) {
            const current = next[row.slot];
            if (!current || Date.parse(row.observed_at) > Date.parse(current.observed_at) ||
                (!current.pending && row.observed_at === current.observed_at)) next[row.slot] = { ...row, pending: false };
        }
        return next;
    }
    function create({ storage, user, client, onStatus = () => {} }) {
        const contexts = new Map(); let channel, subscribedOwner;
        function write(ctx) { if (!ctx.deleted) storage.setItem(ctx.key, JSON.stringify(ctx.entries)); }
        function context(book) {
            const owner = user(); if (!owner) throw new Error('Sign in to save your place.');
            if (book.user_id && book.user_id !== owner) throw new Error('This book belongs to another account.');
            const key = 'engbot_reading_v1:' + owner + ':' + book.id;
            if (!contexts.has(key)) {
                let entries = {}; try { entries = JSON.parse(storage.getItem(key) || '{}'); } catch (_) {}
                contexts.set(key, { key, owner, book, entries, timer: null, flushing: false });
            }
            const ctx = contexts.get(key); ctx.book = book;
            const sb = client();
            if (sb && subscribedOwner !== owner) {
                if (channel) sb.removeChannel(channel);
                subscribedOwner = owner;
                channel = sb.channel('reader-entries-' + owner).on('postgres_changes', { event: '*', schema: 'public', table: 'reader_entries', filter: 'user_id=eq.' + owner }, event => {
                    if (user() !== owner || !event.new?.slot) return;
                    for (const entry of contexts.values()) if (entry.owner === owner && entry.rowId === event.new.book_id) {
                        entry.entries = merge(entry.entries, [event.new]); write(entry);
                    }
                }).subscribe();
            }
            return ctx;
        }
        async function rowId(ctx) {
            if (ctx.rowId) return ctx.rowId;
            if (ctx.book.row_id) return ctx.rowId = ctx.book.row_id;
            const sb = client(); if (!sb || user() !== ctx.owner) return null;
            let q = sb.from('books').select('id').eq('user_id', ctx.owner);
            q = /^[0-9a-f-]{36}$/i.test(String(ctx.book.id)) ? q.eq('id', ctx.book.id) : q.eq('slug', String(ctx.book.id));
            const { data, error } = await q.maybeSingle().abortSignal(AbortSignal.timeout(8000));
            if (error) throw error;
            return ctx.rowId = data?.id;
        }
        async function flushContext(ctx) {
            clearTimeout(ctx.timer);
            ctx.timer = null;
            if (ctx.deleted || ctx.flushing || user() !== ctx.owner) return;
            ctx.flushing = true;
            let succeeded = false;
            try {
                const sb = client(), id = await rowId(ctx);
                if (!sb || !id) return;
                for (const [slot, entry] of Object.entries(ctx.entries)) {
                    if (ctx.deleted || !entry.pending || user() !== ctx.owner) continue;
                    const { data, error } = await sb.rpc('save_reader_entry', { p_book: id, p_slot: slot, p_value: entry.value, p_observed: entry.observed_at }).abortSignal(AbortSignal.timeout(8000));
                    if (error) throw error;
                    if (!data?.[0]) throw new Error('Saved place was not acknowledged.');
                    if (ctx.entries[slot]?.observed_at === entry.observed_at && data?.[0]) {
                        ctx.entries[slot] = { ...data[0], pending: false }; write(ctx);
                    }
                }
                onStatus('Synced across devices');
                succeeded = true;
            } catch (_) { onStatus('Saved on this device · sync pending'); }
            finally {
                ctx.flushing = false;
                if (!ctx.deleted && user() === ctx.owner && Object.values(ctx.entries).some(e => e.pending)) ctx.timer = setTimeout(() => flushContext(ctx), succeeded ? 250 : 15000);
            }
        }
        async function load(book) {
            const ctx = context(book);
            try {
                const id = await rowId(ctx), sb = client();
                if (id && sb && user() === ctx.owner) {
                    const { data, error } = await sb.from('reader_entries').select('*').eq('book_id', id).eq('user_id', ctx.owner).abortSignal(AbortSignal.timeout(8000));
                    if (error) throw error;
                    ctx.entries = merge(ctx.entries, data || []); write(ctx);
                }
            } catch (_) { onStatus('Using saved positions on this device'); }
            void flushContext(ctx);
            return ctx.entries;
        }
        function save(book, slot, value, immediate = false) {
            const ctx = context(book), previous = ctx.entries[slot];
            const now = Math.max(Date.now(), Date.parse(previous?.observed_at || '') + 1 || 0);
            ctx.entries[slot] = { slot, value, observed_at: new Date(now).toISOString(), pending: true };
            write(ctx); onStatus('Place saved');
            if (!ctx.timer) ctx.timer = setTimeout(() => { ctx.timer = null; void flushContext(ctx); }, immediate ? 0 : 2500);
            if (immediate) void flushContext(ctx);
            return ctx.entries[slot];
        }
        function flush() { for (const ctx of contexts.values()) if (ctx.owner === user()) void flushContext(ctx); }
        function forget(bookId) {
            const key = 'engbot_reading_v1:' + user() + ':' + bookId;
            const ctx = contexts.get(key); if (ctx) { ctx.deleted = true; clearTimeout(ctx.timer); contexts.delete(key); }
            storage.removeItem(key);
        }
        return { load, save, flush, forget, entries: book => context(book).entries };
    }
    return { hash, position, resolve, merge, create };
});
