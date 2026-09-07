(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.EngbotTraining = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    async function createKey({ staticHost = false, language = 'ka', getAccessToken, fetchImpl = fetch } = {}) {
        if (staticHost) throw new Error('Open Training Lab on the server-hosted app to create a working key. GitHub Pages cannot run the training API.');
        if (!['ka', 'en'].includes(language)) throw new Error('Choose Georgian or English.');
        const token = getAccessToken ? await getAccessToken() : null;
        const body = { label: 'Studio training key', language, scope: 'both' };
        let response;
        // Lovable uses an authenticated admin action. Only a missing route permits
        // the Python endpoint fallback; timeouts/auth failures must never mint a second key.
        if (token) {
            response = await fetchImpl('/api/admin/training', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...body, action: 'create_key' }), signal: AbortSignal.timeout(15000),
            });
        }
        if (!response || [404, 405].includes(response.status)) {
            response = await fetchImpl('/api/public/train/key/generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
            });
        }
        if (!response.ok) throw new Error(`Training server could not create the key (${response.status}). Check the server and admin session.`);
        const data = await response.json();
        if (typeof data.key !== 'string' || !/^engbot_tk_[a-zA-Z0-9_\-]{16,}$/.test(data.key)) {
            throw new Error('Training server did not confirm a registered key. No local replacement was created.');
        }
        return { key: data.key, language, issuedAt: new Date().toISOString() };
    }
    return { createKey };
});
