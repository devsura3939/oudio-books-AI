/* Editorial proposals are explicit revisions, never silent source replacements. */
(function () {
    'use strict';
    let reviewBook;
    window.reviewRepairProposals = async function (book) {
        reviewBook = book || activeRetranscribeBook;
        if (!reviewBook) return;
        const host = document.getElementById('repairReviewSections');
        host.replaceChildren();
        for (const [index, chapter] of reviewBook.chapters.entries()) {
            const proposal = chapter.repair_proposal;
            if (proposal?.status !== 'needs_review') continue;
            const section = document.createElement('section');
            section.className = 'space-y-3 border-t border-white/15 pt-4';
            const heading = document.createElement('h3');
            heading.textContent = chapter.title || `Section ${index + 1}`;
            const columns = document.createElement('div');
            columns.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
            let editor;
            for (const [label, value, editable] of [['Original', proposal.source, false], ['Proposed correction — editable', proposal.text, true]]) {
                const field = document.createElement('label');
                field.className = 'block text-sm space-y-2';
                const caption = document.createElement('span');
                caption.textContent = label;
                const area = document.createElement('textarea');
                area.className = 'w-full glass-input rounded-xl p-3 text-sm leading-relaxed';
                area.rows = 12;
                area.value = value;
                area.readOnly = !editable;
                field.append(caption, area);
                columns.append(field);
                if (editable) editor = area;
            }
            const controls = document.createElement('div');
            controls.className = 'flex gap-3';
            for (const [label, accept] of [['Accept correction', true], ['Keep original', false]]) {
                const button = document.createElement('button');
                button.textContent = label;
                button.className = 'glass-button px-4 py-2 rounded-xl text-sm';
                button.onclick = async () => {
                    const buttons = [...controls.querySelectorAll('button')];
                    buttons.forEach(b => b.disabled = true);
                    try {
                        if (chapter.text !== proposal.source) throw new Error('The source changed. Generate a new proposal before accepting.');
                        if (accept && !editor.value.trim()) throw new Error('A correction cannot be empty.');
                        const updated = structuredClone(reviewBook);
                        const next = updated.chapters[index];
                        if (accept) {
                            next.source_history = [...(next.source_history || []), {text: next.text, savedAt: new Date().toISOString()}];
                            if (EngbotCore.detectLanguage(next.text) === 'ka' && next.text_ka === next.text) next.text_ka = editor.value;
                            next.text = editor.value;
                            next.word_count = editor.value.trim().split(/\s+/).length;
                            // Existing translations remain available but are explicitly stale.
                            for (const state of Object.values(next.translation_state || {})) state.status = 'stale';
                        }
                        next.repair_proposal = {...proposal, text: editor.value, status: accept ? 'accepted' : 'rejected', reviewedAt: new Date().toISOString()};
                        await saveBookToDB(updated);
                        Object.assign(reviewBook, updated);
                        if (currentBook?.id === updated.id) {
                            currentBook = updated;
                            renderChaptersList();
                            if (typeof selectBook === 'function') await selectBook(updated.id, false);
                        }
                        await window.reviewRepairProposals(reviewBook);
                        showToast(accept ? 'Correction saved. Original retained in revision history.' : 'Original retained.', 'success');
                    } catch (error) { showToast(error.message, 'error'); }
                    finally { buttons.forEach(b => b.disabled = false); }
                };
                controls.append(button);
            }
            section.append(heading, columns, controls);
            host.append(section);
        }
        if (!host.children.length) host.textContent = 'No corrections are waiting for review.';
        closeModal('retranscribeModal');
        openModal('repairReviewModal');
    };
})();
