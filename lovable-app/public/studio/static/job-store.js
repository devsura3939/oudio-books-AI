/* Full checkpoints live in IndexedDB; localStorage contains only discoverable metadata. */
(function () {
    'use strict';
    let opening;
    function open() {
        if (!opening) opening = new Promise((resolve, reject) => {
            const request = indexedDB.open('EngbotTranslationJobs', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('jobs');
            request.onsuccess = () => {
                request.result.onversionchange = () => { request.result.close(); opening = null; };
                resolve(request.result);
            };
            request.onblocked = () => reject(new Error('Close other studio tabs to unlock checkpoint storage'));
            request.onerror = () => reject(request.error);
        }).catch(error => { opening = null; throw error; });
        return opening;
    }
    async function transact(mode, action) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('jobs', mode);
            const request = action(tx.objectStore('jobs'));
            tx.oncomplete = () => resolve(request.result);
            tx.onabort = tx.onerror = () => reject(tx.error || new Error('Checkpoint storage failed'));
        });
    }
    window.EngbotJobStore = {
        get: key => transact('readonly', store => store.get(key)),
        put: (key, value) => transact('readwrite', store => store.put(value, key)),
        remove: key => transact('readwrite', store => store.delete(key)),
    };
})();
