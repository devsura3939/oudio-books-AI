const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../static/model-discovery.js'), 'utf8'), context);
const models = context.window.EngbotModelDiscovery;
const plain = value => JSON.parse(JSON.stringify(value));

test('catalogs exclude non-text models, deduplicate IDs and do not truncate large lists', () => {
    const result = models.extractModels('gemini', { models: [
        { name: 'models/gemini-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embedding', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-flash', supportedGenerationMethods: ['generateContent'] },
    ] });
    assert.deepEqual(plain(result.map(row => row.id)), ['gemini-flash']);
    assert.equal(models.extractModels('custom', { data: Array.from({ length: 200 }, (_, i) => ({ id: `model-${i}` })) }).length, 200);
    assert.equal(models.extractModels('groq', { data: [{ id: 'whisper-large' }, { id: 'disabled', active: false }, { id: 'text-model' }] }).length, 1);
    assert.equal(models.extractModels('mistral', { data: [{ id: 'embed', capabilities: { completion_chat: false } }] }).length, 0);
});

test('free labels require both input and output to be free; saved models are preserved', () => {
    const entries = models.extractModels('openrouter', { data: [
        { id: 'paid-output', pricing: { prompt: '0', completion: '0.1' } },
        { id: 'free', pricing: { prompt: '0', completion: '0' } },
    ] });
    assert.equal(entries[0].id, 'free');
    assert.equal(entries[1].free, false);
    assert.equal(models.mergeSelected(entries, 'previous')[0].id, 'previous');
    assert.equal(models.mergeSelected(entries, '').length, 2);
});

test('custom base and completion URLs discover the correct catalogs', () => {
    for (const [input, expected] of [
        ['https://example.test/v1', 'https://example.test/v1/models'],
        ['https://example.test/v1/chat/completions/', 'https://example.test/v1/models'],
        ['http://localhost:11434/api/chat', 'http://localhost:11434/api/tags'],
        ['http://localhost:1234', 'http://localhost:1234/v1/models'],
    ]) assert.equal(models.customModelsEndpoint(input), expected);
});

test('key bundles preserve JSON values and URLs, and route plain OpenAI keys', () => {
    const detect = value => value.startsWith('sk-') ? 'openai' : null;
    const json = models.parseKeyBundle(JSON.stringify({ custom_api_key: 'sk-test', custom_base_url: 'https://example.test/v1', custom_model: 'test:latest', gemini_model: 'not-a-key' }), detect);
    assert.deepEqual(plain(json), { detected: { custom: 'sk-test' }, customUrl: 'https://example.test/v1', customModel: 'test:latest' });
    assert.equal(models.parseKeyBundle('sk-test', detect).detected.custom, 'sk-test');
    const env = models.parseKeyBundle('CUSTOM_BASE_URL=https://example.test/v1\nCUSTOM_API_KEY="sk-test"\nCUSTOM_MODEL=test:latest', detect);
    assert.deepEqual(plain(env), plain(json));
});

test('saved catalog models reach Groq and Mistral requests and Training Lab', async () => {
    const calls = [];
    const ctx = { window: {}, groqApiKey: 'test', mistralApiKey: 'test', groqSelectedModel: 'new-groq', mistralSelectedModel: 'new-mistral',
        GROQ_MODELS: ['old-groq'], MISTRAL_MODELS: ['old-mistral'], GROQ_API_URL: 'groq', MISTRAL_API_URL: 'mistral',
        groqModelCooldown: {}, mistralModelCooldown: {}, GROQ_MODEL_COOLDOWN_MS: 1, MISTRAL_MODEL_COOLDOWN_MS: 1,
        mistralCorsBlockedUntil: 0, mistralCorsFailures: 0, sanitizeApiKey: x => x,
        callOpenAICompatibleJSON: async (...args) => { calls.push(args); return { translation: 'ok' }; },
        geminiApiKey: '', geminiModel: '', EngbotCore: { geminiModels: () => ['gemini'] }, openRouterApiKey: '', openRouterModel: '',
        OPENROUTER_FREE_MODELS: ['free'], customProviderKey: '', customProviderModel: '', customProviderUrl: '', normalizeCustomProviderUrl: x => x };
    vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('async function callGroqJSON('), source.indexOf('// Shared save-time probe')), ctx);
    vm.runInContext(source.slice(source.indexOf('window.getTrainingProviderConfig ='), source.indexOf('let trainingKeyBusy')), ctx);
    await ctx.callGroqJSON('test'); await ctx.callMistralJSON('test');
    assert.equal(calls[0][1][0], 'new-groq');
    assert.equal(calls[1][1][0], 'new-mistral');
    assert.equal(ctx.window.getTrainingProviderConfig('groq').model, 'new-groq');
    assert.equal(ctx.window.getTrainingProviderConfig('mistral').model, 'new-mistral');
});

test('saving Auto clears previous preferences and persists all selected models to account storage', () => {
    const storage = new Map([['openRouterModel', 'old'], ['groqSelectedModel', 'old']]);
    const fields = { geminiModelSelect: { value: 'new-gemini' }, openRouterModelSelect: { value: '' }, groqModelSelect: { value: '' },
        mistralModelSelect: { value: 'new-mistral' }, customProviderModelInput: { value: 'new-custom' } };
    const ctx = { window: {}, document: { getElementById: id => fields[id] }, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        geminiApiKey: '', geminiModel: 'old', geminiPasses: 3, openRouterApiKey: '', OPENROUTER_DEFAULT_KEY: '', openRouterModel: 'old',
        groqApiKey: '', groqSelectedModel: 'old', mistralApiKey: '', mistralSelectedModel: 'old', elevenLabsApiKey: '', elevenLabsEnabled: false,
        customProviderUrl: 'https://example.test/v1', customProviderModel: 'old', customProviderKey: '', sanitizeApiKey: x => x || '',
        getActiveUserEmail: () => '', getAccountSettingsStorageKey: () => 'account', getCurrentAccountSettings: () => ({ mistralSelectedModel: ctx.mistralSelectedModel }),
        setCustomProvider: (url, model) => { ctx.customProviderModel = model; }, syncSettingsToDOMInputs() {}, showToast() {}, renderAiKeyStatusPanel() {}, closeModal() {} };
    vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('function saveGeminiSettings()'), source.indexOf('function openToCDrawer()')), ctx);
    ctx.saveGeminiSettings();
    const account = JSON.parse(storage.get('account'));
    assert.equal(storage.get('openRouterModel'), ''); assert.equal(storage.get('groqSelectedModel'), '');
    assert.equal(ctx.openRouterModel, ''); assert.equal(ctx.groqSelectedModel, '');
    assert.equal(account.geminiModel, 'new-gemini'); assert.equal(account.mistralSelectedModel, 'new-mistral');
    assert.equal(account.customProviderModel, 'new-custom');
});

test('cloud restore accepts new model IDs and empty Auto preferences', () => {
    const storage = new Map();
    const ctx = { localStorage: { setItem: (key, value) => storage.set(key, value) },
        groqSelectedModel: 'old', openRouterModel: 'old', mistralSelectedModel: 'old', geminiModel: 'old',
        syncSettingsToDOMInputs() {} };
    vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('function applyAccountSettings('), source.indexOf('async function restoreAccountSettingsForCurrentUser(')), ctx);
    ctx.applyAccountSettings({ groqSelectedModel: '', openRouterModel: '', mistralSelectedModel: 'new-mistral', geminiModel: 'new-gemini' });
    assert.equal(ctx.groqSelectedModel, ''); assert.equal(ctx.openRouterModel, '');
    assert.equal(ctx.mistralSelectedModel, 'new-mistral'); assert.equal(ctx.geminiModel, 'new-gemini');
    assert.equal(storage.get('groqSelectedModel'), '');
});
