(function (global) {
    'use strict';
    const catalogs = new Map();
    let controller;
    const providers = [
        { id: 'gemini', key: 'geminiApiKeyInput', select: 'geminiModelSelect', url: 'https://generativelanguage.googleapis.com/v1beta/models', header: 'x-goog-api-key' },
        { id: 'openrouter', key: 'openRouterApiKeyInput', select: 'openRouterModelSelect', url: 'https://openrouter.ai/api/v1/models/user', auto: 'Auto — rotate free models' },
        { id: 'groq', key: 'groqApiKeyInput', select: 'groqModelSelect', url: 'https://api.groq.com/openai/v1/models', auto: 'Auto — use fallback models' },
        { id: 'mistral', key: 'mistralApiKeyInput', select: 'mistralModelSelect', url: 'https://api.mistral.ai/v1/models' },
        { id: 'custom', key: 'customProviderKeyInput', select: 'customProviderModelSelect' },
    ];
    const el = id => document.getElementById(id);

    function credentials(provider) {
        return {
            key: (el(provider.key)?.value || '').trim(),
            url: provider.url || global.EngbotModelDiscovery.customModelsEndpoint(el('customProviderUrlInput')?.value),
        };
    }

    function setSelected(id, selected) {
        const select = el(id);
        if (!select) return;
        if (![...select.options].some(option => option.value === selected)) {
            const option = document.createElement('option');
            option.value = selected;
            option.textContent = selected || 'Choose a model';
            select.appendChild(option);
        }
        select.value = selected;
    }

    function status(provider, message) {
        const select = el(provider.select);
        if (!select) return;
        let node = el(`${provider.id}ModelDiscoveryStatus`);
        if (!node) {
            node = document.createElement('p');
            node.id = `${provider.id}ModelDiscoveryStatus`;
            node.className = 'model-discovery-status';
            node.setAttribute('role', 'status');
            select.after(node);
            select.setAttribute('aria-describedby', node.id);
        }
        node.textContent = message;
    }

    function render(provider, models) {
        const select = el(provider.select);
        if (!select) return;
        // Read at completion, so refreshing never overwrites a choice made while loading.
        const selected = provider.id === 'custom' ? el('customProviderModelInput')?.value.trim() : select.value;
        const fragment = document.createDocumentFragment();
        const add = (value, label) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            fragment.appendChild(option);
        };
        if (provider.auto) add('', provider.auto);
        else if (!selected) add('', 'Choose an available model');
        for (const model of global.EngbotModelDiscovery.mergeSelected(models, selected)) {
            add(model.id, `${model.label}${model.free ? ' · Free' : ''}`);
        }
        select.replaceChildren(fragment);
        select.value = selected || '';
        status(provider, `${models.length} text models listed. Choose one, then Save AI Settings. Access and quota are checked when used.`);
    }

    async function discover({ force = false } = {}) {
        controller?.abort();
        const current = new AbortController();
        controller = current;
        const timer = setTimeout(() => current.abort(), 12000);
        try {
            await Promise.all(providers.map(async provider => {
                const initial = credentials(provider);
                if (!initial.url || (!initial.key && provider.id !== 'custom')) {
                    status(provider, 'Add a key to discover models.');
                    return;
                }
                const sameCredentials = () => {
                    const latest = credentials(provider);
                    return controller === current && initial.key === latest.key && initial.url === latest.url;
                };
                status(provider, 'Loading available models…');
                try {
                    const cached = catalogs.get(provider.id);
                    let models;
                    if (!force && cached && cached.key === initial.key && cached.url === initial.url && Date.now() - cached.time < 600000) {
                        models = cached.models;
                    } else {
                        const headers = initial.key ? { [provider.header || 'Authorization']: provider.header ? initial.key : `Bearer ${initial.key}` } : {};
                        models = [];
                        let nextPage = '';
                        const seenPages = new Set();
                        do {
                            const endpoint = new URL(initial.url);
                            if (nextPage) endpoint.searchParams.set('pageToken', nextPage);
                            if (provider.id === 'gemini') endpoint.searchParams.set('pageSize', '100');
                            const response = await fetch(endpoint.href, { headers, signal: current.signal });
                            if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
                            const data = await response.json();
                            models.push(...global.EngbotModelDiscovery.extractModels(provider.id, data));
                            nextPage = provider.id === 'gemini' ? data.nextPageToken || '' : '';
                            if (nextPage && seenPages.has(nextPage)) throw new Error('Provider repeated a catalog page.');
                            seenPages.add(nextPage);
                        } while (nextPage);
                        models = [...new Map(models.map(model => [model.id, model])).values()];
                        if (!models.length) throw new Error('No text models returned.');
                        if (sameCredentials()) catalogs.set(provider.id, { ...initial, models, time: Date.now() });
                    }
                    if (sameCredentials() && !current.signal.aborted) render(provider, models);
                } catch (error) {
                    if (sameCredentials()) status(provider, `${current.signal.aborted ? 'Discovery timed out.' : error instanceof TypeError ? 'Catalog could not be reached (network or browser access).' : error.message} Existing selection retained; retry with Refresh models.`);
                }
            }));
        } finally {
            clearTimeout(timer);
        }
    }

    function toggleSecretVisibility(id, button) {
        const input = el(id);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        const label = (button.getAttribute('aria-label') || 'Show API key').replace(/^(Show|Hide)/, show ? 'Hide' : 'Show');
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', String(show));
        button.querySelector('span').textContent = show ? 'visibility_off' : 'visibility';
    }

    function hideSecrets() {
        controller?.abort();
        document.querySelectorAll('#aiSettingsModal .secret-field').forEach(field => {
            const input = field.querySelector('input');
            if (input?.type === 'text') toggleSecretVisibility(input.id, field.querySelector('button'));
        });
    }

    global.toggleSecretVisibility = toggleSecretVisibility;
    global.discoverAiModels = discover;
    global.syncCustomProviderModelFromSelect = () => {
        const select = el('customProviderModelSelect');
        if (select?.value && el('customProviderModelInput')) el('customProviderModelInput').value = select.value;
    };
    global.EngbotAiSettings = { setSelected, hideSecrets };
})(window);
