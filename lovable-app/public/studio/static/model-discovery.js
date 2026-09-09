(function (global) {
    'use strict';

    function asString(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function modelId(row) {
        if (typeof row === 'string') return asString(row);
        if (!row || typeof row !== 'object') return '';
        return asString(row.id || row.name || row.model || row.slug);
    }

    function modelLabel(row, id) {
        if (typeof row === 'string') return id;
        const display = asString(row?.displayName || row?.name || row?.id || row?.model);
        return display.replace(/^models\//, '') || id;
    }

    function isGeminiRow(row) {
        const methods = Array.isArray(row?.supportedGenerationMethods) ? row.supportedGenerationMethods : [];
        return !methods.length || methods.includes('generateContent');
    }

    function isFree(row) {
        const pricing = row?.pricing || {};
        return pricing.prompt !== undefined && pricing.completion !== undefined && Number(pricing.prompt) === 0 && Number(pricing.completion) === 0;
    }

    function extractModels(provider, payload) {
        const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.models)
                    ? payload.models
                    : [];
        const normalizedProvider = asString(provider).toLowerCase();
        const seen = new Set();
        const entries = [];
        for (const row of list) {
            if (normalizedProvider === 'gemini' && !isGeminiRow(row)) continue;
            if (row?.active === false || row?.capabilities?.completion_chat === false) continue;
            const id = modelId(row).replace(/^models\//, '');
            if (/embedding|whisper|tts|moderation|guard|rerank|transcri|imagen|veo-/i.test(id)) continue;
            const outputs = row?.architecture?.output_modalities;
            if (Array.isArray(outputs) && !outputs.includes('text')) continue;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            entries.push({
                id,
                label: modelLabel(row, id),
                free: isFree(row),
                provider: normalizedProvider,
            });
        }
        if (normalizedProvider === 'openrouter') {
            entries.sort((a, b) => Number(b.free) - Number(a.free) || a.label.localeCompare(b.label));
        }
        return entries;
    }

    function customModelsEndpoint(url) {
        let value = asString(url).replace(/\/+$/, '');
        if (!value) return '';
        if (/\/api\/tags$/i.test(value)) return value;
        if (/\/api\/(chat|generate)$/i.test(value)) return value.replace(/\/api\/(chat|generate)$/i, '/api/tags');
        if (/\/chat\/completions$/i.test(value)) return value.replace(/\/chat\/completions$/i, '/models');
        if (/\/completions$/i.test(value)) return value.replace(/\/completions$/i, '/models');
        if (/\/v1$/i.test(value)) return `${value}/models`;
        if (/\/models$/i.test(value)) return value;
        return `${value}/v1/models`;
    }

    function mergeSelected(entries, selected) {
        const value = asString(selected);
        if (!value) return entries;
        if (entries.some(entry => entry.id === value)) return entries;
        return [{ id: value, label: `${value} (not in current catalog)`, free: false, provider: entries[0]?.provider || '' }, ...entries];
    }

    function parseKeyBundle(raw, detect) {
        const detected = {};
        let customUrl = '', customModel = '';
        const assign = (name, value) => {
            if (typeof value !== 'string') return;
            const prop = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const clean = value.trim().replace(/^['"]|['"]$/g, '');
            if (!clean) return;
            if (/custom|openai/.test(prop) && /url|base/.test(prop)) { customUrl = clean; return; }
            if (/custom|openai/.test(prop) && /model/.test(prop)) { customModel = clean; return; }
            if (prop && !/key|token|secret/.test(prop) && !/^(gemini|google|openrouter|groq|elevenlabs|mistral|custom|openai)$/.test(prop)) return;
            const named = /gemini|google/.test(prop) ? 'gemini' : /openrouter/.test(prop) ? 'openrouter' : /groq/.test(prop) ? 'groq' : /eleven|xiapi/.test(prop) ? 'elevenlabs' : /mistral/.test(prop) ? 'mistral' : /custom|openai/.test(prop) ? 'custom' : '';
            const inferred = detect(clean);
            const provider = named || (inferred === 'openai' ? 'custom' : inferred);
            if (['gemini', 'openrouter', 'groq', 'elevenlabs', 'mistral', 'custom'].includes(provider)) detected[provider] = clean;
        };
        try {
            const data = JSON.parse(raw);
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                Object.entries(data).forEach(([name, value]) => assign(name, value));
                return { detected, customUrl, customModel };
            }
        } catch (_) { /* A single key or .env bundle is also supported. */ }
        for (const line of String(raw || '').split(/[\r\n]+/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const entry = trimmed.match(/^(?:export\s+)?([\w-]+)\s*[:=]\s*(.+)$/);
            if (entry) assign(entry[1], entry[2]);
            else trimmed.split(/[\s,;]+/).forEach(value => assign('', value));
        }
        return { detected, customUrl, customModel };
    }

    global.EngbotModelDiscovery = Object.freeze({
        extractModels,
        customModelsEndpoint,
        mergeSelected,
        modelId,
        parseKeyBundle,
    });
})(window);
