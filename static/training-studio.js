(function () {
    'use strict';
    let controller = null;
    const el = id => document.getElementById(id);
    const log = message => {
        const node = document.createElement('p'); node.textContent = message;
        el('trainerLog')?.appendChild(node);
    };
    function client() {
        const sb = window.LuminaStore?.getClient?.();
        if (!sb) throw new Error('Sign in to the cloud account first.');
        return sb;
    }
    async function load(language, signal) {
        const sb = client();
        const [active, benchmark] = await Promise.all([
            sb.from('engine_active').select('version_id,enabled,engine_versions(version,items)').eq('language', language).single().abortSignal(signal),
            sb.from('engine_benchmark_cases').select('id,kind,source,expected,weight', { count: 'exact' }).eq('language', language).order('id').limit(2000).abortSignal(signal),
        ]);
        if (active.error || benchmark.error) throw new Error('Could not load the active pack and benchmarks. Check your admin session.');
        if (benchmark.count > 2000) throw new Error('Use the server Training Lab for more than 2,000 examples.');
        if (!active.data.enabled) throw new Error('This language pack is disabled. Enable it in the server Training Lab first.');
        const version = active.data.engine_versions;
        const state = { versionId: active.data.version_id, items: version.items, cases: benchmark.data };
        const result = window.EngbotTrainer.evaluate(state.items, state.cases);
        if (el('trainerLanguage').value === language) {
            el('trainerSummary').textContent = `Pack ${version.version} · ${state.items.length} rules · ${result.passed}/${result.total} exact benchmark matches`;
            const list = el('trainerFailures');
            if (list) {
                list.replaceChildren();
                for (const failure of result.failures.slice(0, 8)) {
                    const row = document.createElement('p');
                    row.textContent = `${failure.kind === 'translate' ? 'Translation' : 'OCR'}: ${failure.source.slice(0, 180)} → ${failure.expected.slice(0, 180)}`;
                    list.appendChild(row);
                }
                if (!result.failures.length) list.textContent = 'All current examples pass. Add verified examples to test new material.';
            }
        }
        return state;
    }
    async function refresh() {
        if (controller) return;
        try { await load(el('trainerLanguage').value, AbortSignal.timeout(12000)); }
        catch (e) { el('trainerSummary').textContent = e.message; }
    }
    async function generate(config, prompt, signal) {
        const combined = AbortSignal.any([signal, AbortSignal.timeout(45000)]);
        const isGemini = config.provider === 'gemini' || config.url?.includes(':generateContent');
        const isOllama = /\/api\/(chat|generate)$/.test(config.url || '');
        let url = config.url, body, headers = { 'Content-Type': 'application/json' };
        if (isGemini) {
            if (config.provider === 'gemini') url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
            headers['x-goog-api-key'] = config.key;
            body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 2500, responseMimeType: 'application/json',
                ...(/^gemini-2\.5-flash/.test(config.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}) } };
        } else if (isOllama) {
            if (config.key) headers.Authorization = `Bearer ${config.key}`;
            body = { model: config.model, stream: false, format: 'json', options: { temperature: 0.1, num_predict: 2500 },
                ...(url.endsWith('/api/generate') ? { prompt } : { messages: [{ role: 'user', content: prompt }] }) };
        } else {
            if (config.key) headers.Authorization = `Bearer ${config.key}`;
            body = { model: config.model, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2500,
                ...(/(?:^|\/)glm-5\.3/.test(config.model) ? { reasoning_effort: 'low' } : {}),
                ...(config.provider === 'custom' ? {} : { response_format: { type: 'json_object' } }) };
        }
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: combined });
        if (!response.ok) throw new Error(`Provider request failed (${response.status}). Run stopped; active rules are retained.`);
        const data = await response.json();
        const reason = isGemini ? data.candidates?.[0]?.finishReason : isOllama ? (data.done === true ? data.done_reason : null) : data.choices?.[0]?.finish_reason;
        if (!['STOP', 'stop'].includes(reason)) throw Object.assign(new Error('Provider did not finish a complete proposal. No truncated rules were accepted.'), { proposalInvalid: ['length', 'MAX_TOKENS'].includes(reason) });
        const text = isGemini ? data.candidates[0].content?.parts?.map(p => p.text || '').join('') : isOllama ? (data.message?.content || data.response) : data.choices[0].message?.content;
        try { return JSON.parse(String(text).replace(/^```(?:json)?\s*|\s*```$/g, '')); }
        catch { throw Object.assign(new Error('Provider returned invalid JSON. Active rules are retained.'), { proposalInvalid: true }); }
    }
    async function run() {
        if (controller) return;
        controller = new AbortController();
        const signal = controller.signal, owner = window.LuminaStore.getUserId();
        el('trainerRun').disabled = true; el('trainerStop').disabled = false;
        el('trainerLog').textContent = '';
        ['trainerLanguage','trainerProvider','trainerIterations','trainerResearch','trainerQuery','trainerAddCase'].forEach(id => { el(id).disabled = true; });
        const ensureOwner = () => { if (window.LuminaStore.getUserId() !== owner) { controller.abort(); throw new Error('Account changed; training stopped.'); } };
        try {
            const config = window.getTrainingProviderConfig(el('trainerProvider').value);
            log(`Using ${config.provider} / ${config.model}. At most 2,500 output tokens per request.`);
            const results = await window.EngbotTrainer.run({
                language: el('trainerLanguage').value, iterations: Number(el('trainerIterations').value), signal,
                researchQuery: el('trainerResearch').checked ? el('trainerQuery').value.trim() : '',
                load: async language => { ensureOwner(); return load(language, signal); },
                propose: async (prompt, requestSignal) => { ensureOwner(); return generate(config, prompt, requestSignal); },
                publish: async ({ language, version, items, sources }) => {
                    ensureOwner(); signal.throwIfAborted();
                    const { data, error } = await client().rpc('engbot_training_propose', { p_language: language, p_version: version, p_items: items, p_model: `${config.provider}/${config.model}`, p_sources: sources }).abortSignal(AbortSignal.any([signal, AbortSignal.timeout(20000)]));
                    if (error) throw new Error('Cloud promotion was not confirmed. Refresh the pack before retrying; check that migration 007 is installed and your account is admin.');
                    if (data.accepted) window.dispatchEvent(new CustomEvent('engbot:pack-updated', { detail: { language } }));
                    return data;
                },
                onProgress: event => {
                    ensureOwner();
                    el('trainerProgress').textContent = event.iteration ? `Iteration ${event.iteration} · ${event.phase}` : event.phase;
                    if (event.reason || event.message) log(event.reason || event.message);
                    for (const url of event.sources || []) {
                        const link = document.createElement('a'); link.href = url; link.textContent = 'Consulted source'; link.target = '_blank'; link.rel = 'noopener noreferrer';
                        el('trainerLog').appendChild(link);
                    }
                },
            });
            log(`Run finished: ${results.filter(r => r.accepted).length} accepted / ${results.length} proposals. Benchmark results measure these examples, not whole-language fluency.`);
            el('trainerProgress').textContent = 'Finished';
        } catch (e) {
            const message = signal.aborted ? 'Stopped. Any already-confirmed promotion remains active; refresh shows the current pack.' : e.message;
            log(message); el('trainerProgress').textContent = signal.aborted ? 'Stopped' : 'Run ended';
        } finally {
            controller = null;
            el('trainerRun').disabled = false; el('trainerStop').disabled = true;
            ['trainerLanguage','trainerProvider','trainerIterations','trainerResearch','trainerQuery','trainerAddCase'].forEach(id => { el(id).disabled = false; });
            await refresh();
        }
    }
    async function addCase() {
        if (controller) return;
        const source = el('trainerSource').value.trim(), expected = el('trainerExpected').value.trim(), note = el('trainerReference').value.trim();
        if (!source || !expected || source.length > 4000 || expected.length > 4000 || !note) { log('Provide an input, a verified correction (up to 4,000 characters each), and its reference or explanation.'); return; }
        el('trainerAddCase').disabled = true;
        try {
            const { error } = await client().from('engine_benchmark_cases').insert({ language: el('trainerLanguage').value, kind: el('trainerKind').value, source, expected, note: note.slice(0, 300), origin: 'user' }).abortSignal(AbortSignal.timeout(12000));
            if (error) throw new Error('Example was not saved. An admin cloud session is required.');
            log('Verified example saved. It will protect future proposals.'); await refresh();
        } catch (e) { log(e.message); }
        finally { el('trainerAddCase').disabled = false; }
    }
    window.EngbotTrainingStudio = { run, refresh, addCase, stop: () => controller?.abort() };
})();
