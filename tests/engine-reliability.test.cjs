const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../static/engine-core.js');
const source = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
    const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
    assert.ok(a >= 0 && b > a, `Missing source markers ${start}`);
    return source.slice(a, b);
}
const silent = {log(){},warn(){},error(){}};
const training = require('../static/training-client.js');
const registeredKey = 'engbot_tk_en_fixture_registered_123456';
test('Static hosting cannot invent a working training key', async () => {
    let calls = 0;
    await assert.rejects(training.createKey({staticHost:true, fetchImpl:async()=>{calls++;}}), /server-hosted/);
    assert.equal(calls,0);
});
test('Lovable training key creation uses the authenticated admin route and selected language', async () => {
    const record = await training.createKey({language:'en',getAccessToken:async()=> 'fixture-token',fetchImpl:async(url,options)=>{
        assert.equal(url,'/api/admin/training');
        assert.equal(options.headers.Authorization,'Bearer fixture-token');
        assert.equal(JSON.parse(options.body).action,'create_key');
        assert.equal(JSON.parse(options.body).language,'en');
        return {ok:true,status:200,json:async()=>({key:registeredKey})};
    }});
    assert.equal(record.key,registeredKey);
    assert.equal(record.language,'en');
});
test('Missing admin route uses the Python registered-key endpoint', async () => {
    const urls=[];
    const record=await training.createKey({getAccessToken:async()=> 'fixture-token',fetchImpl:async url=>{
        urls.push(url);
        return urls.length===1 ? {ok:false,status:404} : {ok:true,status:200,json:async()=>({key:registeredKey})};
    }});
    assert.deepEqual(urls,['/api/admin/training','/api/public/train/key/generate']);
    assert.equal(record.key,registeredKey);
});
test('Training auth failure and timeout never trigger a second key-creation attempt',async()=>{
    for(const failure of ['auth','timeout']) {
        let calls=0;
        await assert.rejects(training.createKey({getAccessToken:async()=> 'fixture-token',fetchImpl:async()=>{
            calls++; if(failure==='timeout') throw new Error('timeout');
            return {ok:false,status:403};
        }}));
        assert.equal(calls,1);
    }
});
test('Successful HTTP response without a registered key is still a creation failure',async()=>{
    await assert.rejects(training.createKey({fetchImpl:async()=>({ok:true,status:200,json:async()=>({status:'ok'})})}), /did not confirm/);
});
test('Failed key generation preserves the previous key without a success message or replacement',async()=>{
    const storage=new Map([['lumina_training_api_key','previous-unverified-key']]);
    const toasts=[];
    const ctx=vm.createContext({
        getCurrentUserId:()=> 'test-user', _isStaticHost:true,
        window:{EngbotTraining:training},
        localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
        document:{getElementById:()=>null,querySelectorAll:()=>[]},
        showToast:(text,kind)=>toasts.push({text,kind}),
    });
    vm.runInContext(section('let trainingKeyBusy =', 'function toggleTrainingKeyMask('),ctx);
    await ctx.generateTrainingApiKey();
    assert.equal(storage.size,1);
    assert.equal(ctx.trainingKeyRecord().legacy,true);
    assert.equal(ctx.trainingKeyRecord().key,'previous-unverified-key');
    assert.deepEqual(toasts.map(t=>t.kind),['error']);
});
test('Missing chapter durations use each chapter word count, never the cumulative book count',()=>{
    const ctx=vm.createContext({EngbotCore:core});
    vm.runInContext(section('function getBookStats(', '// ── Navigation & Modals'),ctx);
    const stats=ctx.getBookStats({chapters:[{word_count:140},{word_count:140},{word_count:140}]});
    assert.equal(stats.totalSeconds,180);
    assert.equal(stats.totalWords,420);
    assert.deepEqual(core.chapterStats({text:'ქართული ტექსტი',estimated_duration_sec:'invalid'}),{words:2,seconds:1});
    assert.deepEqual(core.chapterStats({word_count:140,estimated_duration_sec:85}),{words:140,seconds:85});
    vm.runInContext(section('function formatTime(', '// ── Event Listeners Binding'),ctx);
    for(const value of [undefined,NaN,-1,Infinity]) assert.equal(ctx.formatTime(value),'0:00');
});
test('Cloud round trip retains legacy Georgian language, English translation and source history', () => {
    const storeSource = fs.readFileSync(path.join(__dirname, '../static/supabase-store.js'), 'utf8');
    const start = storeSource.indexOf('  function toStudioBook(');
    const end = storeSource.indexOf('  async function getAllBooks(', start);
    assert.ok(start >= 0 && end > start);
    const ctx = vm.createContext({userId:'fixture-user', wordCount:t=>t.split(/\s+/).length});
    vm.runInContext(storeSource.slice(start, end), ctx);
    const sourceBook = ctx.toStudioBook({id:'book-row', slug:'fixture', title:'წიგნი', language:'en', metadata:{extra:{lang:'ka'}}}, []);
    assert.equal(sourceBook.lang, 'ka');
    sourceBook.chapters = [{id:1, title:'პირველი', text:'ქართული ტექსტი', text_en:'Georgian text', source_history:[{text:'ძველი ტექსტი'}]}];
    const row = ctx.bookRowFrom(sourceBook);
    assert.equal(row.language, 'ka');
    const restored = ctx.toStudioBook(row, ctx.chapterRowsFrom(sourceBook, 'book-row'));
    assert.equal(restored.lang, 'ka');
    assert.equal(restored.chapters[0].text, 'ქართული ტექსტი');
    assert.equal(restored.chapters[0].text_en, 'Georgian text');
    assert.equal(restored.chapters[0].source_history[0].text, 'ძველი ტექსტი');
});
function context() {
    const checkpoints = new Map();
    const metadata = new Map();
    const ctx = vm.createContext({EngbotCore: core, console: silent, AbortController, AbortSignal,
        DOM: {wbProgressPct: {textContent: '0%'},wbProgressBar:{style:{}}},
        window: {EngbotJobStore: {
            get: async k => structuredClone(checkpoints.get(k)),
            put: async (k,v) => checkpoints.set(k, structuredClone(v)),
            remove: async k => checkpoints.delete(k),
        }},
        localStorage: {setItem:(k,v)=>metadata.set(k,v),removeItem:k=>metadata.delete(k)},
        getCurrentUserId:()=> 'test-user',
        currentBook: {id:'fixture', title:'Fixture',lang:'en', chapters:[{id:1,title:'First',text:'A full sentence about a book and its author. '.repeat(130)}]},
        isTranslatingWholeBook:false, cancelTranslationFlag:false, translationRequestController:null,
        geminiModel:'gemini-2.5-pro',geminiPasses:3,openRouterModel:'',customProviderModel:'',usingCloud:false,
        detectTextLang:core.detectLanguage,assessTranslation:core.assessTranslation,
        setTranslationStage(){},translationFailure(){},appendChunkLog(){},updateChunkRate(){},updateMiniDock(){},
        openModal(){}, closeModal(){},buildChapterQueue(){},updateChapterQueueStatus(){},showToast(){},renderChaptersList(){},renderDigitalShelf(){},
        document:{getElementById:()=>null},
        saveBookToDB:async b=>ctx.saved.push(structuredClone(b)),
        getAllBooks:async()=>[],saved:[],
    });
    vm.runInContext(section("const TJOB_PREFIX =", 'function findResumableTranslationJob('), ctx);
    vm.runInContext(section('async function startWholeBookTranslation(', '// ══════════════════════════════════════════════════════════════════════════\n// ██ LOCK-SCREEN'),ctx);
    vm.runInContext(section('async function saveTranslatedBookEdition(', 'window.saveTranslatedBookEdition'),ctx);
    ctx.checkpoints=checkpoints;
    return ctx;
}
test('Unicode Georgian, English and script rejection',()=>{
    assert.equal(core.detectLanguage('ᲥᲐᲠᲗᲣᲚᲘ ᲔᲜᲐ'),'ka');
    assert.equal(core.normalizeLanguage('ka-GE'),'ka');
    assert.equal(core.normalizeLanguage('en-US'),'en');
    assert.equal(core.assessTranslation('English source', 'Это русский текст', 'ka').ok,false);
    assert.equal(core.assessTranslation('ქართული ტექსტი','ეს ქართულია','en').ok,false);
    assert.equal(core.assessTranslation('ეს ქართულია','This is Georgian','en').ok,true);
});
test('Hard chunk cap and exact coverage including unbroken text and surrogate pairs',()=>{
    assert.deepEqual(core.splitText('😀😀',2),['😀','😀']);
    for(const text of ['x'.repeat(30001),'Ა'.repeat(20001),'word '.repeat(5000),'😀'.repeat(11000)]) {
        const chunks=core.splitText(text,1800);
        assert.equal(chunks.join(''),text);
        assert.ok(chunks.every(c=>c.length<=1800&&!/[\uD800-\uDBFF]$/.test(c)));
    }
});
test('Truncated JSON is rejected',()=>{
    const ctx=vm.createContext({});
    vm.runInContext(section('function parseModelJSON(', '// Extract a clean Georgian translation'),ctx);
    assert.equal(ctx.parseModelJSON('{"translation":"partial'),null);
    assert.equal(ctx.parseModelJSON('```json\n{"translation":"complete"}\n```').translation,'complete');
});
test('Selected current model is preserved, retired IDs migrated',()=>{
    assert.equal(core.geminiModels('gemini-2.5-pro')[0],'gemini-2.5-pro');
    assert.equal(core.geminiModels('gemini-2.0-flash')[0],'gemini-2.5-flash');
});
test('Provider token limits and safety stops cannot become completed text',()=>{
    assert.equal(core.providerOutputComplete({choices:[{finish_reason:'length'}]}),false);
    assert.equal(core.providerOutputComplete({candidates:[{finishReason:'MAX_TOKENS'}]}),false);
    assert.equal(core.providerOutputComplete({candidates:[{finishReason:'SAFETY'}]}),false);
    assert.equal(core.providerOutputComplete({choices:[{finish_reason:'stop'}]}),true);
});
test('Failure in middle of a chapter resumes only missing chunks and publishes only at full coverage',async()=>{
    const ctx=context(); let calls=0;
    const output=text=>'ქართული წინადადება წიგნისა და ავტორის შესახებ. '.repeat(Math.ceil(text.length/45));
    ctx.translateChunkAI=async text=>++calls===2?null:output(text);
    await ctx.startWholeBookTranslation();
    assert.equal(ctx.checkpoints.size,1);
    assert.equal([...ctx.checkpoints.values()][0].status,'failed');
    assert.equal([...ctx.checkpoints.values()][0].chapters['1'].outputs.filter(Boolean).length,1);
    assert.equal(ctx.currentBook.chapters[0].text_ka,undefined);
    assert.equal(ctx.saved.filter(b=>b.isTranslatedEdition).length,0);
    const remaining=core.splitText(ctx.currentBook.chapters[0].text,1800).length-1;
    calls=0;ctx.translateChunkAI=async text=>{calls++;return output(text);};
    await ctx.startWholeBookTranslation(true);
    assert.equal(calls,remaining);
    assert.equal(ctx.checkpoints.size,0);
    assert.equal(ctx.saved.filter(b=>b.isTranslatedEdition).length,1);
    assert.equal(ctx.DOM.wbProgressPct.textContent,'100%');
});
test('Georgian source creates an English edition',async()=>{
    const ctx=context();ctx.currentBook.lang='ka';ctx.currentBook.chapters[0].text='ეს არის ქართული ტექსტი წიგნის შესახებ.';
    ctx.translateChunkAI=async(_text,lang)=>{assert.equal(lang,'en');return 'This is Georgian text about a book.';};
    await ctx.startWholeBookTranslation();
    const edition=ctx.saved.find(b=>b.isTranslatedEdition);
    assert.ok(edition);assert.equal(edition.lang,'en');
    assert.equal(edition.chapters[0].text,'This is Georgian text about a book.');
});
test('Late provider response after pause cannot commit',async()=>{
    const ctx=context();let release, started;
    const pending=new Promise(resolve=>started=resolve);
    ctx.translateChunkAI=async()=>{started();return await new Promise(resolve=>release=resolve);};
    const running=ctx.startWholeBookTranslation();await pending;
    ctx.cancelWholeBookTranslation();
    release('ქართული ტექსტი '.repeat(150));await running;
    assert.equal(ctx.currentBook.chapters[0].text_ka,undefined);
    assert.equal([...ctx.checkpoints.values()][0].status,'paused');
    assert.equal(ctx.saved.length,0);
});
test('Changed source invalidates saved chunks',async()=>{
    const ctx=context();let calls=0;
    ctx.translateChunkAI=async text=>++calls===2?null:'ქართული ტექსტი '.repeat(Math.ceil(text.length/15));
    await ctx.startWholeBookTranslation();
    ctx.currentBook.chapters[0].text='A changed source sentence about a different book.';
    calls=0;ctx.translateChunkAI=async()=>{calls++;return 'სხვა წიგნის შესახებ შეცვლილი წინადადება.';};
    await ctx.startWholeBookTranslation();assert.equal(calls,1);
    assert.equal(ctx.currentBook.chapters[0].translation_state.ka.source,ctx.currentBook.chapters[0].text);
});
test('Edition cannot fall back to untranslated source',async()=>{
    const ctx=context();ctx.currentBook.chapters[0].text_ka='partial';
    await assert.rejects(ctx.saveTranslatedBookEdition(ctx.currentBook,'ka'));
    assert.equal(ctx.saved.length,0);
});
test('Account switch preserves checkpoint under original owner and stops book writes',async()=>{
    const ctx=context();
    ctx.translateChunkAI=async()=>{
        ctx.getCurrentUserId=()=> 'different-user';
        return 'ქართული ტექსტი '.repeat(130);
    };
    await ctx.startWholeBookTranslation();
    assert.equal(ctx.saved.length,0);
    assert.ok([...ctx.checkpoints.keys()].every(key=>key.includes('test-user')));
    assert.equal([...ctx.checkpoints.values()][0].status,'failed');
});
test('Cloud save failure retains accepted chunks without completing the edition',async()=>{
    const ctx=context();
    ctx.translateChunkAI=async text=>'ქართული ტექსტი '.repeat(Math.ceil(text.length/15));
    ctx.saveBookToDB=async()=>{throw Error('Cloud sync failed');};
    await ctx.startWholeBookTranslation();
    const job=[...ctx.checkpoints.values()][0];
    assert.equal(job.status,'failed');
    assert.ok(job.chapters['1'].outputs.every(Boolean));
    assert.notEqual(ctx.DOM.wbProgressPct.textContent,'100%');
});
test('Full long repair retains every chunk; shortened output rejected',async()=>{
    const ctx=vm.createContext({EngbotCore:core});
    vm.runInContext(section('async function repairTextLinguisticAI(', 'async function repairTextLinguisticAIChunk('),ctx);
    let calls=0;ctx.repairTextLinguisticAIChunk=async text=>{calls++;return text;};
    const original='Sentence with 5 + 3 = 8. '.repeat(900).trim();
    assert.equal(await ctx.repairTextLinguisticAI(original,'en'),original);assert.ok(calls>3);
    ctx.repairTextLinguisticAIChunk=async text=>text.slice(0,100);
    await assert.rejects(ctx.repairTextLinguisticAI(original,'en'));
});
test('Required review failures do not silently return the draft',async()=>{
    const ctx=vm.createContext({EngbotCore:core,window:{},setTranslationStage(){},translationFailure(){},assessTranslation:()=>({ok:true}),aiTranslationAvailable:()=>true,geminiPasses:3,geminiDraftTranslate:async()=> 'A draft',geminiCritiqueTranslation:async()=>null});
    vm.runInContext(section('async function translateWithGeminiAI(', '// Budget pipeline'),ctx);
    assert.equal(await ctx.translateWithGeminiAI('source','en'),null);
    ctx.geminiPasses=1;assert.equal(await ctx.translateWithGeminiAI('source','en'),'A draft');
});
test('Scanner repair preserves operators and historical Georgian',()=>{
    global.window={EngbotCore:core};global.document={getElementById:()=>null};
    const scanner=require('../static/scanner.js');
    for(const text of ['5 + 3 = 8.','ჳ ჴ ჵ','ᲥᲐᲠᲗᲣᲚᲘ']) assert.equal(scanner._repairText(text,'kat'),text);
});
