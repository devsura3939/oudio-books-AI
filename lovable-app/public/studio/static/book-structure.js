(function (root, factory) {
    const api = factory();
    root.EngbotBookStructure = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.EngbotBookStructure = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const wordCount = text => text.trim().split(/\s+/u).filter(Boolean).length;
    function heading(line) {
        const t = line.trim(), lower = t.toLowerCase();
        if (!t || t.length > 100 || /\.{2,}|….*\d+\s*$/.test(t)) return false;
        return /^(chapter|part|book|section|volume)\s+(\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)(?!\p{L})/iu.test(t)
            || /^(prologue|epilogue|introduction|preface|foreword|afterword|appendix|conclusion|contents|table of contents|dedication|acknowledgements?)\s*[:—–-]?\s*$/iu.test(t)
            || /^(თავი|ნაწილი|წიგნი|კარი)\s+(\d+|[ivxlcdm]+|[ა-ჰ]+)(?!\p{L})/u.test(lower)
            || /^(პირველი|მეორე|მესამე|მეოთხე|მეხუთე|მეექვსე|მეშვიდე|მერვე|მეცხრე|მეათე)\s+თავი/u.test(lower)
            || /^(შესავალი|წინასიტყვაობა|ბოლოსიტყვაობა|დასკვნა|დანართი|პროლოგი|ეპილოგი|სარჩევი|მიძღვნა)\s*[:—–-]?\s*$/u.test(lower);
    }
    function pageLines(content) {
        const rows = [];
        for (const item of content.items || []) {
            if (typeof item.str !== 'string' || !item.str) continue;
            const x = item.transform?.[4] || 0, y = item.transform?.[5] || 0;
            const size = Math.abs(item.transform?.[3] || item.height || 10);
            let row = rows.find(r => Math.abs(r.y - y) < Math.max(2, size * 0.25));
            if (!row) { row = { y, size, parts: [] }; rows.push(row); }
            row.parts.push({ text: item.str, x, end: x + (item.width || item.str.length * size * 0.5), size });
        }
        rows.sort((a, b) => b.y - a.y);
        const gaps = [];
        for (const row of rows) {
            row.parts.sort((a, b) => a.x - b.x);
            for (let i = 1; i < row.parts.length; i++) {
                const left = row.parts[i - 1].end, right = row.parts[i].x;
                if (right - left > Math.max(36, row.size * 3)) gaps.push({ left, right });
            }
        }
        // Repeated empty vertical space identifies two columns; sparse headings never create a column.
        const candidate = gaps.map(g => ({ x: (g.left + g.right) / 2, count: gaps.filter(h => (g.left + g.right) / 2 > h.left && (g.left + g.right) / 2 < h.right).length }))
            .sort((a, b) => b.count - a.count)[0];
        const gutter = candidate?.count >= Math.max(3, rows.length * 0.4) ? candidate.x : null;
        const join = parts => parts.reduce((text, item, i) => text + (i && !/\s$/.test(text) && !/^\s/.test(item.text) && item.x - parts[i - 1].end > item.size * 0.12 ? ' ' : '') + item.text, '').trim();
        const render = list => list.map((r, i) => (i && list[i - 1].y - r.y > Math.max(r.size, list[i - 1].size) * 1.8 ? '\n' : '') + join(r.parts)).filter(Boolean).join('\n');
        if (gutter === null) return render(rows);
        const columns = rows.filter(r => r.parts.some(p => p.end < gutter) && r.parts.some(p => p.x > gutter));
        const top = Math.max(...columns.map(r => r.y)), bottom = Math.min(...columns.map(r => r.y));
        const body = rows.filter(r => r.y <= top && r.y >= bottom);
        return [render(rows.filter(r => r.y > top)), render(body.map(r => ({ ...r, parts: r.parts.filter(p => p.x < gutter) }))),
            render(body.map(r => ({ ...r, parts: r.parts.filter(p => p.x >= gutter) }))), render(rows.filter(r => r.y < bottom))].filter(Boolean).join('\n\n');
    }
    async function outline(doc) {
        const out = [];
        async function visit(items, depth = 0) {
            for (const item of items || []) {
                try {
                    const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
                    if (Array.isArray(dest) && dest[0] != null) {
                        const index = typeof dest[0] === 'number' ? dest[0] : await doc.getPageIndex(dest[0]);
                        if (index >= 0 && index < doc.numPages) out.push({ page: index + 1, title: String(item.title || '').trim(), depth });
                    }
                } catch (_) { /* Malformed outline entries do not discard page text. */ }
                await visit(item.items, depth + 1);
            }
        }
        try { await visit(await doc.getOutline()); } catch (_) {}
        // Use the shallowest outline level with multiple actual chapter destinations.
        const levels = [...new Set(out.map(x => x.depth))].sort();
        const chosen = levels.find(level => out.filter(x => x.depth === level).length > 1) ?? levels[0];
        return out.filter(x => x.depth === chosen && x.title).sort((a, b) => a.page - b.page).filter((x, i, all) => !i || x.page !== all[i - 1].page);
    }
    function structure(pages, { isKa = false, outline = [] } = {}) {
        const list = pages.map((p, i) => ({ ...p, index: p.index ?? i + 1 })).filter(p => typeof p.text === 'string');
        const edgeCounts = new Map();
        for (const p of list) {
            const lines = p.text.split('\n').map(l => l.trim()).filter(Boolean);
            for (const line of new Set([...lines.slice(0, 2), ...lines.slice(-2)])) edgeCounts.set(line, (edgeCounts.get(line) || 0) + 1);
        }
        const chapters = []; let current;
        const push = () => { if (current?.text.trim()) { current.text = current.text.trim(); current.word_count = wordCount(current.text); current.estimated_duration_sec = Math.round(current.word_count / 140 * 60); if (isKa) current.text_ka = current.text; chapters.push({ ...current, id: chapters.length + 1 }); } };
        const begin = (title, page, method) => { push(); current = { title, text: '', firstPage: page, lastPage: page, structure_method: method }; };
        const hasOutline = outline.length > 0;
        let headingCount = 0;
        for (const page of list) {
            const entry = outline.find(e => e.page === page.index);
            if (entry) begin(entry.title, page.index, 'pdf-outline');
            if (!current) begin(isKa ? 'შესავალი ნაწილი' : 'Opening', page.index, hasOutline ? 'pdf-outline' : 'page');
            if (current.text) current.text += '\n\n';
            for (const line of page.text.split('\n')) {
                // Page numbers and repeated running headers are retained as text, never promoted to chapters.
                if (!hasOutline && heading(line) && (edgeCounts.get(line.trim()) || 0) < 3) { begin(line.trim(), page.index, 'heading'); headingCount++; }
                current.text += line + '\n';
                current.lastPage = page.index;
            }
        }
        push();
        if (!hasOutline && !headingCount) {
            chapters.length = 0;
            for (let i = 0; i < list.length; i += 8) {
                const group = list.slice(i, i + 8), text = group.map(p => p.text).join('\n\n').trim();
                if (!text) continue;
                const firstPage = group[0].index, lastPage = group.at(-1).index;
                const words = wordCount(text);
                chapters.push({ id: chapters.length + 1, title: `${isKa ? 'გვერდები' : 'Pages'} ${firstPage}–${lastPage}`, text, ...(isKa ? { text_ka: text } : {}), firstPage, lastPage, structure_method: 'page', word_count: words, estimated_duration_sec: Math.round(words / 140 * 60) });
            }
        }
        return { chapters, pageCount: list.length, method: hasOutline ? 'pdf-outline' : headingCount ? 'heading' : 'page', emptyPages: list.filter(p => !p.text.trim()).map(p => p.index) };
    }
    const needsOcr = text => (String(text).match(/\p{L}/gu) || []).length < 20 || /\uFFFD/.test(String(text));
    return { heading, pageLines, outline, structure, needsOcr };
});
