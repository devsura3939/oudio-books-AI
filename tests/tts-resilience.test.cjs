const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('TTS API Endpoint resolves to Oracle Cloud HTTPS backend on static hosts like github.io', () => {
    const source = fs.readFileSync('static/app.js', 'utf8');

    // Test on GitHub Pages host
    const ctxStatic = vm.createContext({
        location: { hostname: 'devsura3939.github.io', origin: 'https://devsura3939.github.io' },
        window: {},
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        document: { querySelector: () => null, addEventListener: () => {} }
    });
    vm.runInContext(
        `const _isStaticHost = (() => { const h = location.hostname; return h.endsWith('.github.io'); })();
        function getTTSApiEndpoint() {
            const configured = typeof window !== 'undefined' && window.LUMINA_RUNTIME_CONFIG?.API_URL;
            if (configured) return \`\${configured.replace(/\\/+$/, '')}/api/tts\`;
            if (_isStaticHost) return 'https://92.5.71.162.sslip.io/api/tts';
            return '/api/tts';
        }`,
        ctxStatic
    );
    assert.equal(ctxStatic.getTTSApiEndpoint(), 'https://92.5.71.162.sslip.io/api/tts');

    // Test on local host
    const ctxLocal = vm.createContext({
        location: { hostname: 'localhost', origin: 'http://localhost:8001' },
        window: {},
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    });
    vm.runInContext(
        `const _isStaticHost = false;
        function getTTSApiEndpoint() {
            const configured = typeof window !== 'undefined' && window.LUMINA_RUNTIME_CONFIG?.API_URL;
            if (configured) return \`\${configured.replace(/\\/+$/, '')}/api/tts\`;
            if (_isStaticHost) return 'https://92.5.71.162.sslip.io/api/tts';
            return '/api/tts';
        }`,
        ctxLocal
    );
    assert.equal(ctxLocal.getTTSApiEndpoint(), '/api/tts');

    // Test with explicit runtime config override
    const ctxConfig = vm.createContext({
        location: { hostname: 'devsura3939.github.io', origin: 'https://devsura3939.github.io' },
        window: { LUMINA_RUNTIME_CONFIG: { API_URL: 'https://custom-backend.example.com' } }
    });
    vm.runInContext(
        `const _isStaticHost = true;
        function getTTSApiEndpoint() {
            const configured = typeof window !== 'undefined' && window.LUMINA_RUNTIME_CONFIG?.API_URL;
            if (configured) return \`\${configured.replace(/\\/+$/, '')}/api/tts\`;
            if (_isStaticHost) return 'https://92.5.71.162.sslip.io/api/tts';
            return '/api/tts';
        }`,
        ctxConfig
    );
    assert.equal(ctxConfig.getTTSApiEndpoint(), 'https://custom-backend.example.com/api/tts');
});

test('TTS pauseFailedNarration auto-retries transient network drops before pausing', () => {
    let speakCalled = false;
    let toastCalled = false;
    let uiState = null;

    const ctx = vm.createContext({
        currentSpeechToken: 42,
        isPlaying: true,
        isPaused: false,
        isSpeakingLock: true,
        currentSentenceIndex: 5,
        sentenceRetryCount: 0,
        console: { warn: () => {} },
        setTimeout: (fn) => { fn(); },
        updatePlayerUIState: (state) => { uiState = state; },
        showToast: () => { toastCalled = true; },
        speakCurrentSentence: () => { speakCalled = true; }
    });

    vm.runInContext(
        `function pauseFailedNarration(token, reason = '') {
            if (token !== currentSpeechToken || !isPlaying || isPaused) return;
            if (sentenceRetryCount < 2) {
                sentenceRetryCount++;
                setTimeout(() => {
                    if (token === currentSpeechToken && isPlaying && !isPaused) {
                        speakCurrentSentence();
                    }
                }, 10);
                return;
            }
            sentenceRetryCount = 0;
            isPaused = true;
            isSpeakingLock = false;
            updatePlayerUIState(false);
            showToast('Playback failed', 'error');
        }`,
        ctx
    );

    // Attempt 1: Should auto-retry without showing error toast or pausing playback!
    ctx.pauseFailedNarration(42, 'network glitch');
    assert.equal(ctx.sentenceRetryCount, 1);
    assert.equal(ctx.isPaused, false);
    assert.equal(speakCalled, true);
    assert.equal(toastCalled, false);

    // Reset spy
    speakCalled = false;

    // Attempt 2: Second auto-retry
    ctx.pauseFailedNarration(42, 'network glitch');
    assert.equal(ctx.sentenceRetryCount, 2);
    assert.equal(ctx.isPaused, false);
    assert.equal(speakCalled, true);
    assert.equal(toastCalled, false);

    // Attempt 3: Exhausted retries, now cleanly pauses and informs user
    ctx.pauseFailedNarration(42, 'network glitch');
    assert.equal(ctx.sentenceRetryCount, 0);
    assert.equal(ctx.isPaused, true);
    assert.equal(toastCalled, true);
    assert.equal(uiState, false);
});

test('Voice buffer flushing and reset on narrator switch', () => {
    let evictedUrls = [];
    const ctx = vm.createContext({
        elevenSpeechBuffer: { clear: () => {} },
        georgianAudioPrefetchCache: new Map([
            [1, { pause: () => {}, src: 'blob:1' }],
            [2, { pause: () => {}, src: 'blob:2' }]
        ]),
        gatewayTTSCache: new Map([
            ['preset|test1', 'blob:url1'],
            ['preset|test2', 'blob:url2']
        ]),
        URL: { revokeObjectURL: (u) => evictedUrls.push(u) }
    });

    vm.runInContext(
        `function clearNarrationBuffers() {
            elevenSpeechBuffer.clear();
            georgianAudioPrefetchCache.forEach(a => {
                try { a.pause(); a.src = ''; } catch (e) {}
            });
            georgianAudioPrefetchCache.clear();
            gatewayTTSCache.forEach(url => { try { URL.revokeObjectURL(url); } catch (e) {} });
            gatewayTTSCache.clear();
        }`,
        ctx
    );

    ctx.clearNarrationBuffers();
    assert.equal(ctx.georgianAudioPrefetchCache.size, 0);
    assert.equal(ctx.gatewayTTSCache.size, 0);
    assert.deepEqual(evictedUrls, ['blob:url1', 'blob:url2']);
});
