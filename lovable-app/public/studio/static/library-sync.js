(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.EngbotLibrarySync = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function() {
    'use strict';
    // Keep authoritative content in the database. Poll only compact revisions,
    // then fetch changed rows. A full reconnect still reconciles all deletions.
    function create({owner, load, getRevision}) {
        let account = null, generation = 0, pending = null;
        let savedRevision = null, dirty = true;
        let deletedBooks = [];
        let saved = {books:new Map(),chapters:new Map()};
        function clear() {generation++;account=null;pending=null;savedRevision=null;dirty=true;deletedBooks=[];saved={books:new Map(),chapters:new Map()};}
        function invalidate() {dirty=true;savedRevision=null;}
        function snapshot() {return structuredClone({books:[...saved.books.values()],chapters:[...saved.chapters.values()]});}
        async function read() {
            const user = owner();
            if (account !== user) {clear();account=user;}
            if (!user) return {books:[],chapters:[]};
            if (pending) return pending;
            const revision = generation;
            const task = (async () => {
                const serverRevision = getRevision ? await getRevision(user) : null;
                if (owner() !== user || generation !== revision) return {books:[],chapters:[]};
                if (!dirty && serverRevision !== null && serverRevision === savedRevision) return snapshot();
                // Clear before I/O, so an event during the read keeps the cache dirty.
                dirty = false;
                const next = {};
                for (const table of ['books','chapters']) {
                    const manifest = await load(table,'id,updated_at',null,user);
                    const changed = manifest.filter(row => !row.updated_at || saved[table].get(row.id)?.updated_at !== row.updated_at).map(row => row.id);
                    const fresh = new Map();
                    for (let start=0; start<changed.length; start+=100) {
                        for (const row of await load(table,'*',changed.slice(start,start+100),user)) fresh.set(row.id,row);
                    }
                    // Build from the manifest, never from a union with old records.
                    // If a row disappeared during this read, don't resurrect it.
                    const changedIds = new Set(changed);
                    next[table] = new Map();
                    for (const row of manifest) {
                        const value = changedIds.has(row.id) ? fresh.get(row.id) : saved[table].get(row.id);
                        if (value) next[table].set(row.id,value);
                    }
                }
                if (owner() !== user || generation !== revision) return {books:[],chapters:[]};
                deletedBooks.push(...[...saved.books.values()].filter(row=>!next.books.has(row.id)));
                saved = next;
                savedRevision = dirty ? null : serverRevision;
                // Consumers can edit studio objects without mutating revision caches.
                return snapshot();
            })();
            pending = task;
            try {return await task;} catch(error) {invalidate();throw error;} finally {if(pending===task)pending=null;}
        }
        return {read,clear,invalidate,takeDeletedBooks:()=>deletedBooks.splice(0)};
    }
    function canonical(value) {
        if (Array.isArray(value)) return value.map(canonical);
        if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
        return value;
    }
    // Compare only fields the caller owns; retain server-owned status/timestamps.
    function changedRows(desired, existing, key) {
        const indexed=new Map(existing.map(row=>[row[key],row]));
        return desired.filter(row=>{
            const old=indexed.get(row[key]);
            return !old || Object.keys(row).some(k=>JSON.stringify(canonical(row[k]))!==JSON.stringify(canonical(old[k])));
        });
    }
    return {create,changedRows};
});
