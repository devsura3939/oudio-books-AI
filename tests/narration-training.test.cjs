const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const speech = require('../static/narration.js');
const training = require('../static/training-runner.js');

test('Georgian and English statements retain punctuation and do not become questions', () => {
    for (const line of ['როგორ მოხდა ეს, არ ვიცი.', 'How it happened remains unclear.', 'დედ-მამა მოვიდა; „ხვალ დავბრუნდები.“']) {
        assert.equal(speech.normalize(line), line);
        assert.equal(speech.sentenceType(line), 'statement');
    }
    assert.equal(speech.sentenceType('„სად მიდიხარ?“'), 'question');
    assert.equal(speech.sentenceType('„გამარჯობა!“'), 'exclamation');
    assert.ok(speech.pauseMs('„სად მიდიხარ?“') > speech.pauseMs('სახლში მიდის.'));
    assert.ok(speech.pauseMs('სახლში მიდის.', 2) < speech.pauseMs('სახლში მიდის.', 1));
});

test('Fallback speech plays all chunks before advancing and preserves position on failure', async () => {
    const source = fs.readFileSync(require.resolve('../static/app.js'), 'utf8');
    const code = source.slice(source.indexOf('function pauseFailedNarration('), source.indexOf('function speakStandardSentence('));
    const played = [];
    const ctx = { window: { EngbotNarration: speech }, currentSpeechToken: 1, isPlaying: true, isPaused: false, currentGlobalSpeed: 1,
        currentSentenceIndex: 0, encodeURIComponent, startBackgroundKeepAlive() {}, requestScreenWakeLock() {}, updateMediaSession() {},
        speakCurrentSentence() {}, updatePlayerUIState() {}, showToast() {}, Audio: function(url) { this.url=url; this.play=async()=>{}; played.push(this); } };
    vm.createContext(ctx); vm.runInContext(code, ctx);
    const text = 'ქართული ტექსტი. '.repeat(70).trim();
    ctx.playUltimateFallbackTTS(text, 'ka', 1);
    for (let i=0;i<played.length;i++) played[i].onended();
    assert.equal(ctx.currentSentenceIndex, 1);
    assert.equal(played.map(a => new URL(a.url).searchParams.get('q')).join(' '), text);
    assert.ok(played.every(a => new URL(a.url).searchParams.get('q').length <= 200));
    ctx.playUltimateFallbackTTS(text, 'ka', 1); played.at(-1).onerror();
    assert.equal(ctx.currentSentenceIndex, 1); assert.equal(ctx.isPaused, true);
});

test('Training treats dollar replacements literally and respects Georgian word boundaries', () => {
    const rules = [{type:'ocr_fix',pattern:'თავi',replacement:'თავი $&'}];
    assert.equal(training.apply('თავi / თავiს',rules,'transcribe'), 'თავი $& / თავiს');
    assert.throws(()=>training.validate([{type:'autofix',pattern:'.*',replacement:'anything'}],'ka'));
    assert.throws(()=>training.validate([{type:'ocr_fix',pattern:'x',replacement:'y',language:'en'}],'ka'));
});

const cases = [{id:'fix',kind:'transcribe',source:'bad',expected:'good'},{id:'holdout',kind:'transcribe',source:'fine',expected:'fine'}];
test('Training accepts an exact improvement but rejects corrupting correct or still-failing text', () => {
    const rule = {type:'ocr_fix',pattern:'bad',replacement:'good'};
    assert.equal(training.gate([], [rule], cases).ok,true);
    assert.equal(training.gate([], [rule,{type:'ocr_fix',pattern:'fine',replacement:'wrong'}], cases).ok,false);
    assert.equal(training.gate([], [{...rule,replacement:'worse'}],cases).ok,false);
});

test('Cancelled or exhausted training never promotes a late proposal', async () => {
    const controller = new AbortController(); let writes=0;
    await assert.rejects(training.run({language:'en',signal:controller.signal,load:async()=>({items:[],cases}),
        propose:async()=>{controller.abort();return {items:[{type:'ocr_fix',pattern:'bad',replacement:'good'}]};},publish:async()=>{writes++;}}));
    assert.equal(writes,0);
    await assert.rejects(training.run({language:'en',signal:new AbortController().signal,load:async()=>({items:[],cases}),
        propose:async()=>{throw new Error('quota');},publish:async()=>{writes++;}}),/quota/);
    assert.equal(writes,0);
});

test('Small model gets original failure input and feedback; repeated failures stop spending', async () => {
    let calls=0;
    const results = await training.run({language:'en',iterations:5,signal:new AbortController().signal,load:async()=>({items:[],cases}),
        propose:async prompt=>{assert.match(prompt,/"source":"bad"/); if(calls++)assert.match(prompt,/1 → 1/); return {items:[]};},publish:async()=>{throw new Error('must not publish');}});
    assert.equal(calls,2); assert.equal(results.length,2);
});

test('A mixed proposal retains only independently improving rules', async () => {
    let saved=[];
    const results = await training.run({language:'en',signal:new AbortController().signal,load:async()=>({versionId:'baseline',items:[],cases}),
        propose:async()=>({items:[{type:'ocr_fix',pattern:'bad',replacement:'good'},{type:'ocr_fix',pattern:'fine',replacement:'wrong'}]}),
        publish:async({items})=>{saved=items;return {accepted:true,reason:'verified'};}});
    assert.equal(saved.length,1);assert.equal(saved[0].pattern,'bad');assert.equal(results[0].accepted,true);
});

test('Custom gateway needs no JSON capability; truncated and cancelled responses cannot become proposals', async () => {
    const file = fs.readFileSync(require.resolve('../static/training-studio.js'),'utf8');
    const code = file.slice(file.indexOf('    async function generate('),file.indexOf('    async function run('));
    const requests=[];
    const ctx={AbortSignal,JSON,encodeURIComponent,fetch:async(_url,options)=>{
        requests.push(JSON.parse(options.body));
        return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'{"items":[]}'}}]})};
    }};
    vm.createContext(ctx);vm.runInContext(code,ctx);
    const config={provider:'custom',url:'https://gateway.test/v1/chat/completions',model:'glm-5.3-flash',key:'test-only'};
    assert.equal((await ctx.generate(config,'Return JSON',new AbortController().signal)).items.length,0);
    assert.equal(requests[0].response_format,undefined);
    assert.equal(requests[0].reasoning_effort,'low');
    ctx.fetch=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'{"items":[]}'}}]})});
    await assert.rejects(ctx.generate(config,'Return JSON',new AbortController().signal),/complete proposal/);
});
