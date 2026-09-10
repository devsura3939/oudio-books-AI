(function () {
    'use strict';
    let activeDialog, closeDialog, restorePending = false, readerAnchor;
    const store = EngbotReading.create({ storage: localStorage, user: () => getCurrentUserId(), client: () => window.LuminaStore?.getClient?.(),
        onStatus: text => { const el = document.getElementById('readingSaveStatus'); if (el) el.textContent = text; } });
    const textFor = (chapter, language) => chapter['text_' + language] || chapter.text || '';
    function followAudio() {
        if (readerActive && isPlaying && !isUserManuallyNavigating && readerBook?.id === currentBook?.id && String(readerChapterId) === String(currentPlayingChapterId)) {
            readerAnchor = { book: readerBook.id, chapter: readerChapterId, page: readerCurrentPage, index: currentSentenceIndex, scrollLocked: readerMode === 'scroll' };
        }
    }
    function readIndex() {
        if (isPlaying && !isUserManuallyNavigating && String(currentPlayingChapterId) === String(readerChapterId)) return currentSentenceIndex;
        if (readerMode === 'scroll') {
            if (readerAnchor?.book === readerBook?.id && String(readerAnchor.chapter) === String(readerChapterId)
                && (readerAnchor.scrollLocked || Math.abs(DOM.readerScrollContainer.scrollTop - readerAnchor.scrollTop) < 2)) return readerAnchor.index;
            const top = DOM.readerScrollContainer.getBoundingClientRect().top;
            const spans = DOM.readerScrollContainer.querySelectorAll('.reader-sentence');
            for (const span of spans) if (span.getBoundingClientRect().bottom > top + 12) return Number(span.id.replace('rsentence_', '')) || 0;
        }
        if (readerAnchor?.book === readerBook?.id && readerAnchor.chapter === readerChapterId && readerAnchor.page === readerCurrentPage) return readerAnchor.index;
        return readerPages[readerCurrentPage - 1]?.[0]?.globalIndex || 0;
    }
    function current(mode) {
        const reading = mode === 'read' || (!mode && readerActive && (!isPlaying || isPaused || isUserManuallyNavigating));
        const book = reading ? readerBook : currentBook;
        const chapterId = reading ? readerChapterId : currentPlayingChapterId;
        const language = reading ? readerLang : currentLang;
        const chapter = book?.chapters.find(c => String(c.id) === String(chapterId));
        if (!chapter || (!reading && !isPlaying)) return null;
        return { book, value: EngbotReading.position(chapter, language, prepareChapterSentences(textFor(chapter, language)), reading ? readIndex() : currentSentenceIndex, reading ? 'read' : 'listen') };
    }
    function capture(mode, immediate = false) {
        if (restorePending || !getCurrentUserId()) return;
        if (mode === 'read' && isPlaying && !isPaused && !isUserManuallyNavigating) return;
        const saved = current(mode); if (!saved) return;
        try { store.save(saved.book, 'position:' + saved.value.language, saved.value, immediate); }
        catch (_) { showToast('Could not save your place on this device.', 'error'); }
    }
    function dialog(title) {
        closeDialog?.(null);
        const el = document.createElement('dialog'); el.className = 'reading-dialog';
        const heading = document.createElement('h2'); heading.textContent = title; el.append(heading);
        document.body.append(el); activeDialog = el;
        return el;
    }
    function button(parent, label, action, primary = false) {
        const el = document.createElement('button'); el.type = 'button'; el.textContent = label;
        el.className = primary ? 'reading-primary' : ''; el.onclick = action; parent.append(el); return el;
    }
    async function choose(book, mode, preferredChapter, language) {
        const owner = getCurrentUserId();
        const el = dialog(mode === 'read' ? 'Open your book' : 'Listen to your book');
        const subtitle = document.createElement('p'); subtitle.textContent = book.title; el.append(subtitle);
        const status = document.createElement('p'); status.textContent = 'Loading your saved places…'; el.append(status);
        el.showModal();
        return new Promise(resolve => {
            let finished = false;
            const finish = value => { if (finished) return; finished = true; el.close(); el.remove(); if (activeDialog === el) { activeDialog = null; closeDialog = null; } resolve(getCurrentUserId() === owner ? value : null); };
            closeDialog = finish; el.addEventListener('cancel', e => { e.preventDefault(); finish(null); });
            button(el, 'Cancel', () => finish(null));
            void store.load(book).then(entries => {
                if (finished || getCurrentUserId() !== owner) { finish(null); return; }
                status.remove();
                const controls = document.createElement('div'); el.insertBefore(controls, el.lastChild);
                const saved = entries['position:' + language]?.value;
                if (saved && book.chapters.some(c => String(c.id) === String(saved.chapterId))) {
                    const chapter = book.chapters.find(c => String(c.id) === String(saved.chapterId));
                    button(controls, `Continue · ${chapter.title} · sentence ${saved.sentence + 1}`, () => finish(saved), true);
                }
                const label = document.createElement('label'); label.textContent = 'Start at a chapter'; controls.append(label);
                const select = document.createElement('select'); select.setAttribute('aria-label', 'Starting chapter');
                for (const c of book.chapters) { const option = document.createElement('option'); option.value = String(c.id); option.textContent = c.title; select.append(option); }
                if (preferredChapter != null) select.value = String(preferredChapter);
                controls.append(select);
                button(controls, 'Start selected chapter', () => finish({ chapterId: select.value, language, sentence: 0 }));
                button(controls, 'Start from the beginning', () => finish({ chapterId: book.chapters[0]?.id, language, sentence: 0 }));
                const marks = Object.entries(entries).filter(([slot, entry]) => slot.startsWith('bookmark:') && !entry.value.deleted && entry.value.language === language);
                if (marks.length) { const h = document.createElement('h3'); h.textContent = 'Bookmarks'; controls.append(h); }
                for (const [slot, entry] of marks) {
                    const row = document.createElement('div'); row.className = 'reading-bookmark'; controls.append(row);
                    button(row, entry.value.label || entry.value.anchor || 'Saved bookmark', () => finish(entry.value));
                    const remove = button(row, 'Remove', () => { store.save(book, slot, { deleted: true }, true); row.remove(); });
                    remove.setAttribute('aria-label', 'Remove bookmark ' + (entry.value.label || ''));
                }
            }).catch(() => { status.textContent = 'Could not load saved places. Close and try again.'; });
        });
    }
    function bookmark() {
        const saved = current(); if (!saved) { showToast('Open a book or start listening first.', 'info'); return; }
        const el = dialog('Bookmark this place'); const label = document.createElement('label'); label.textContent = 'Bookmark name'; el.append(label);
        const input = document.createElement('input'); input.maxLength = 120; input.setAttribute('aria-label', 'Bookmark name');
        input.value = `${saved.book.chapters.find(c => String(c.id) === String(saved.value.chapterId)).title} · sentence ${saved.value.sentence + 1}`; el.append(input);
        closeDialog = () => { el.close(); el.remove(); activeDialog = null; closeDialog = null; };
        button(el, 'Save bookmark', () => {
            try { store.save(saved.book, 'bookmark:' + crypto.randomUUID(), { ...saved.value, label: input.value.trim() || saved.value.anchor }, true); closeDialog(); showToast('Bookmark saved.', 'success'); }
            catch (_) { showToast('Bookmark could not be saved.', 'error'); }
        }, true);
        button(el, 'Cancel', () => closeDialog()); el.addEventListener('cancel', () => closeDialog()); el.showModal(); input.select();
    }
    function restore(saved) {
        const chap = readerBook?.chapters.find(c => String(c.id) === String(readerChapterId)); if (!chap) return;
        restorePending = true;
        const idx = EngbotReading.resolve(saved, chap, readerLang, prepareChapterSentences(textFor(chap, readerLang)));
        readerCurrentPage = (readerSentenceToPageMap[idx] ?? 0) + 1;
        readerAnchor = { book: readerBook.id, chapter: readerChapterId, page: readerCurrentPage, index: idx };
        renderCurrentPage();
        const anchor = document.getElementById('rsentence_' + idx);
        if (anchor) { anchor.classList.add('reading-resume-anchor'); anchor.setAttribute('title', 'Your saved place'); }
        if (readerMode === 'scroll') {
            document.getElementById('rsentence_' + idx)?.scrollIntoView({ block: 'start', behavior: 'instant' });
            readerAnchor.scrollTop = DOM.readerScrollContainer.scrollTop;
            readerAnchor.scrollLocked = true;
        }
        restorePending = false;
        capture('read', true);
    }
    let scrollTimer;
    function releaseScrollAnchor() { if (readerAnchor) { readerAnchor.scrollLocked = false; readerAnchor.scrollTop = undefined; } }
    for (const event of ['wheel', 'touchmove', 'pointerdown']) document.getElementById('readerScrollContainer')?.addEventListener(event, releaseScrollAnchor, { passive: true });
    document.addEventListener('keydown', e => { if (readerActive && readerMode === 'scroll' && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) releaseScrollAnchor(); });
    document.getElementById('readerScrollContainer')?.addEventListener('scroll', () => {
        clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { if (readerActive && readerMode === 'scroll' && !restorePending) capture('read'); }, 400);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { capture(undefined, true); store.flush(); } });
    window.addEventListener('pagehide', () => { capture(undefined, true); store.flush(); });
    window.addEventListener('online', () => store.flush());
    window.addEventListener('focus', () => store.flush());
    window.EngbotReadingUI = { choose, capture, bookmark, restore, readIndex, followAudio, releaseScrollAnchor, store };
})();
