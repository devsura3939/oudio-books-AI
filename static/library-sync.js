(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.EngbotLibrarySync = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function() {
    'use strict';
    // Keep authoritative content in the database. Poll only compact revisions,
    // then fetch changed rows. A full reconnect still reconciles all deletions.
    function create({owner, load}) {
        let account = null, generation = 0, pending = null;
        let saved = {books:new Map(),chapters:new Map()};
        function clear() {generation++;account=null;pending=null;saved={books:new Map(),chapters:new Map()};}
        async function read() {
            const user = owner();
            if (account !== user) {clear();account=user;}
            if (!user) return {books:[],chapters:[]};
            if (pending) return pending;
            const revision = generation;
            const task = (async () => {
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
                saved = next;
                // Consumers can edit studio objects without mutating revision caches.
                return structuredClone({books:[...saved.books.values()],chapters:[...saved.chapters.values()]});
            })();
            pending = task;
            try {return await task;} finally {if(pending===task)pending=null;}
        }
        return {read,clear};
    }
    return {create};
});
