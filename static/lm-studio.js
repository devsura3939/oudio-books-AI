(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.EngbotLmStudio = api.create({storage: root.localStorage, fetchImpl: root.fetch.bind(root), owner: () => root.getCurrentUserId?.(), document: root.document});
})(typeof window === 'undefined' ? null : window, function() {
    'use strict';
    function endpoint(value) {
        const url = new URL(String(value).trim());
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        if (url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || local && url.protocol === 'http:')) throw Error('Use HTTPS, or http://localhost:1234 on this computer.');
        url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/(?:v1(?:\/models|\/chat\/completions)?|api\/v[01]\/models)$/, '') + '/v1';
        return url.href.replace(/\/$/, '');
    }
    function modelList(data) {
        const rows = Array.isArray(data?.data) ? data.data : [];
        return [...new Set(rows.filter(row => row && typeof row.id === 'string' && !/embedding|rerank|whisper|tts/i.test(row.id)).map(row => row.id.trim()).filter(Boolean))];
    }
    function modelProfiles(data) {
        const profiles = {};
        for (const row of data?.models || []) {
            if (row.type === 'embedding') continue;
            const reasoning = row.capabilities?.reasoning?.allowed_options || [];
            for (const instance of row.loaded_instances || []) {
                const context = Number(instance.config?.context_length);
                if (instance.id && Number.isFinite(context) && context >= 1024) profiles[instance.id] = {context: Math.min(context, 131072), loaded: true, reasoning};
            }
            // Advertised maximum context is not the context actually allocated by JIT.
            if (row.key && !profiles[row.key]) profiles[row.key] = {context: 4096, loaded: false, reasoning};
        }
        return profiles;
    }
    const estimateTokens = value => Math.ceil(new TextEncoder().encode(String(value || '')).length / 2);
    function create({storage, fetchImpl, owner, document, now = Date.now, cloudTimeoutMs = 12000, requestTimeoutMs = 90000}) {
        let detected = null, discovery = null, active = null, cooldown = null, runtimeProfile = null;
        const field = id => document?.getElementById(id);
        const accountKey = () => owner() ? 'engbot_lm_studio:' + owner() : null;
        const status = text => { if (field('lmStudioStatus')) field('lmStudioStatus').textContent = text; };
        function settings() { try { const key = accountKey(); return key ? JSON.parse(storage.getItem(key) || 'null') : null; } catch { return null; } }
        function headers(token) { return {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})}; }
        function input() { return {url: endpoint(field('lmStudioUrl').value), token: field('lmStudioToken').value.trim()}; }
        function options(models, selected) {
            const select = field('lmStudioModel'); if (!select) return;
            select.replaceChildren();
            for (const id of models) { const option = document.createElement('option'); option.value = id; option.textContent = id; select.appendChild(option); }
            if (!models.length) { const option = document.createElement('option'); option.value = ''; option.textContent = 'Detect models to choose one'; select.appendChild(option); }
            select.value = models.includes(selected) ? selected : models[0] || '';
        }
        function fillSettings() {
            discovery?.abort(); discovery = null; detected = null;
            const saved = settings();
            if (!field('lmStudioUrl')) return;
            field('lmStudioUrl').value = saved?.url || 'http://localhost:1234/v1';
            field('lmStudioToken').value = saved?.token || ''; field('lmStudioToken').type = 'password';
            const eye = field('lmStudioTokenToggle'); if (eye) { eye.setAttribute('aria-label', 'Show LM Studio token'); eye.querySelector('span').textContent = 'visibility'; }
            field('lmStudioEnabled').checked = Boolean(saved?.enabled);
            options(saved?.models || (saved?.model ? [saved.model] : []), saved?.model);
            status(saved ? 'Saved on this device. ' + (saved.enabled ? 'Translation phases and backup enabled.' : 'Backup disabled.') : 'Start LM Studio’s server and enable CORS, then detect models.');
        }
        async function detect(url, token = '') {
            const account = accountKey(); if (!account) throw Error('Sign in before connecting LM Studio.');
            const normalized = endpoint(url); token = String(token).trim();
            discovery?.abort(); const controller = new AbortController(); discovery = controller; detected = null;
            const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
            try {
                const response = await fetchImpl(normalized + '/models', {headers: headers(token), signal});
                if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'LM Studio rejected the token. Check its authentication settings.' : 'LM Studio model discovery failed (HTTP ' + response.status + ').');
                const models = modelList(await response.json()); signal.throwIfAborted();
                if (account !== accountKey()) throw Error('Account changed. Detect models again.');
                if (!models.length) throw Error('No text models found. Download or load a chat model in LM Studio.');
                let profiles = {};
                try {
                    const native = await fetchImpl(normalized.replace(/\/v1$/, '/api/v1/models'), {headers: headers(token), signal: AbortSignal.any([signal, AbortSignal.timeout(3000)])});
                    if (native.ok) profiles = modelProfiles(await native.json());
                } catch { /* OpenAI-compatible proxies may omit the native metadata API. */ }
                signal.throwIfAborted();
                if (account !== accountKey()) throw Error('Account changed. Detect models again.');
                detected = {account, url: normalized, token, models, profiles};
                return models;
            } finally { if (discovery === controller) discovery = null; }
        }
        async function detectFromUI() {
            const button = field('lmStudioDetect'); if (button) button.disabled = true;
            status('Detecting models…');
            try {
                const draft = input(), selected = field('lmStudioModel').value;
                const models = await detect(draft.url, draft.token);
                // Ignore a result if the user changed the endpoint or token in flight.
                const current = input(); if (current.url !== draft.url || current.token !== draft.token) { detected = null; status('Connection changed. Detect models again.'); return; }
                options(models, selected); field('lmStudioEnabled').checked = true;
                status(models.length + ' text model(s) found. Choose one and save.');
            } catch (error) { status(error.message + ' Ensure the server is running, CORS is enabled, and browser local-network access is allowed.'); }
            finally { if (button) button.disabled = false; }
        }
        function save(config) {
            const account = accountKey(); if (!account) throw Error('Sign in before saving LM Studio.');
            const next = {...config, url: endpoint(config.url), token: String(config.token || '').trim()};
            const previous = settings();
            const catalog = detected?.account === account && detected.url === next.url && detected.token === next.token ? detected.models
                : previous?.url === next.url && previous.token === next.token ? previous.models : null;
            if (!catalog?.includes(next.model)) throw Error('Detect models for this connection and choose a model before saving.');
            active?.abort(); cooldown = null; runtimeProfile = null;
            const profiles = detected?.account === account && detected.url === next.url && detected.token === next.token ? detected.profiles : previous?.profiles || {};
            storage.setItem(account, JSON.stringify({url: next.url, token: next.token, model: next.model, models: catalog, profiles, enabled: Boolean(next.enabled)}));
            status(next.enabled ? 'Saved. LM Studio will edit translations and back up unavailable AI providers.' : 'Saved. Automatic backup is disabled.');
        }
        function saveFromUI() {
            if (!field('lmStudioUrl')) return true;
            // An untouched, disconnected card must not block saving other API settings.
            if (!settings() && !detected && !field('lmStudioEnabled').checked) return true;
            try { save({...input(), model: field('lmStudioModel').value, enabled: field('lmStudioEnabled').checked}); return true; }
            catch (error) { status(error.message); field('lmStudioDetect')?.focus(); return false; }
        }
        function disconnect() { discovery?.abort(); active?.abort(); detected = null; cooldown = null; const key = accountKey(); if (key) storage.removeItem(key); fillSettings(); status('LM Studio disconnected.'); }
        const enabled = () => Boolean(settings()?.enabled && settings()?.model);
        function profile() {
            const saved = settings();
            return runtimeProfile?.account === accountKey() && runtimeProfile.model === saved?.model ? runtimeProfile.profile : saved?.profiles?.[saved?.model] || {context: 4096, loaded: false};
        }
        async function prepare(parent) {
            const saved = settings(), account = accountKey(); if (!saved?.enabled) return;
            runtimeProfile = {account, model:saved.model, profile:{context:4096,loaded:false}};
            try {
                const response = await fetchImpl(endpoint(saved.url).replace(/\/v1$/, '/api/v1/models'), {headers: headers(saved.token), signal: AbortSignal.any([AbortSignal.timeout(3000), ...(parent ? [parent] : [])])});
                const profiles = response.ok ? modelProfiles(await response.json()) : {};
                if (account === accountKey()) runtimeProfile = {account, model: saved.model, profile: profiles[saved.model] || {context:4096, loaded:false}};
            } catch { parent?.throwIfAborted(); }
        }
        const available = () => enabled() && !active && !(cooldown?.account === accountKey() && cooldown.until > now());
        async function text(prompt, {systemPrompt, temperature = 0.1, maxTokens = 4096, signal: parent, timeoutMs = requestTimeoutMs} = {}) {
            parent?.throwIfAborted();
            const saved = settings(), account = accountKey();
            if (!saved?.enabled || active || (cooldown?.account === account && cooldown.until > now())) return null;
            const inputTokens = estimateTokens(prompt) + estimateTokens(systemPrompt) + 128;
            const outputTokens = Math.min(maxTokens, 8192, profile().context - inputTokens - 256);
            if (outputTokens < Math.min(maxTokens, 256)) { status('Local model context is too small for this request. Preserving the accepted draft.'); return null; }
            const controller = new AbortController(); active = controller;
            const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(Math.max(1, Math.min(timeoutMs, requestTimeoutMs))), ...(parent ? [parent] : [])]);
            status('LM Studio backup is working…');
            try {
                // Use the documented native control only when the model advertises it.
                // Focused editing does not need an unbounded hidden reasoning preamble.
                const native = profile().reasoning?.includes('off');
                const url = native ? endpoint(saved.url).replace(/\/v1$/, '/api/v1/chat') : endpoint(saved.url) + '/chat/completions';
                const payload = native
                    ? {model:saved.model,input:prompt,system_prompt:systemPrompt || '',temperature,max_output_tokens:outputTokens,reasoning:'off',store:false,stream:false,integrations:[]}
                    : {model:saved.model,messages:[...(systemPrompt ? [{role:'system',content:systemPrompt}] : []),{role:'user',content:prompt}],temperature,max_tokens:outputTokens,stream:false};
                const response = await fetchImpl(url, {method:'POST',headers:headers(saved.token),signal,body:JSON.stringify(payload)});
                if (!response.ok) throw Error('LM Studio unavailable (HTTP ' + response.status + ').');
                const data = await response.json(); signal.throwIfAborted();
                if (account !== accountKey()) return null;
                if (native) {
                    const output = data?.output, count = data?.stats?.total_output_tokens;
                    if (!Array.isArray(output) || output.some(item => !['message','reasoning'].includes(item.type)) || !Number.isFinite(count) || count >= outputTokens) throw Error('LM Studio returned incomplete output.');
                    const messages = output.filter(item => item.type === 'message');
                    if (messages.length !== 1 || typeof messages[0].content !== 'string' || !messages[0].content.trim()) throw Error('LM Studio returned no complete translation.');
                    status('LM Studio responded.'); return messages[0].content.trim();
                }
                const choice = data?.choices?.[0];
                if (!['stop', 'eos', 'end_turn'].includes(choice?.finish_reason) || typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) throw Error('LM Studio returned incomplete output. Try a model with a larger context window.');
                status('LM Studio backup responded.'); return choice.message.content.trim();
            } catch (error) {
                parent?.throwIfAborted();
                cooldown = {account, until: now() + 60000}; status(error.message || 'LM Studio is unavailable.'); return null;
            } finally { if (active === controller) active = null; }
        }
        async function json(prompt, {parse, validateResponse = () => true, ...opts}) {
            const output = await text(prompt, opts); if (!output) return null;
            try { const parsed = parse(output); return parsed && validateResponse(parsed) ? parsed : null; } catch { return null; }
        }
        async function withFallback(cloud, prompt, opts) {
            if (!enabled()) return cloud(opts.signal);
            const controller = new AbortController();
            const signal = opts.signal ? AbortSignal.any([opts.signal, controller.signal]) : controller.signal;
            let timer;
            try {
                const result = await Promise.race([
                    Promise.resolve().then(() => cloud(signal)).catch(() => null),
                    new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null); }, cloudTimeoutMs); }),
                ]);
                opts.signal?.throwIfAborted();
                if (result !== null && result !== undefined) return result;
            } finally { clearTimeout(timer); controller.abort(); }
            return json(prompt, opts);
        }
        return {settings, enabled, available, profile, prepare, fillSettings, detect, detectFromUI, save, saveFromUI, disconnect, text, json, withFallback};
    }
    return {create, endpoint, modelList, modelProfiles, estimateTokens};
});
