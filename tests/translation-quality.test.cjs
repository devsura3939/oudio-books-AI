const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const core=require('../static/engine-core.js'), machine=require('../static/translation-machine.js');
const local=require('../static/local-translation.js');

test('English phonetic Georgian and model repetition cannot pass as a translation',()=>{
 const source='The only entrance to the estate was a small door in the west wall.';
 const bad='თე ონე ენტრანსე ტო თე ესტატე ვას ა სმოლ დორ ინ თე ვესტ ვოლ.';
 assert.equal(core.assessTranslation(source,bad,'ka').reason,'transliterated_english');
 assert.equal(core.assessTranslation('Her report never exceeded one hundred words.','არასოდეს არასოდეს არასოდეს არასოდეს არასოდეს','ka').reason,'repeated_word_loop');
 assert.equal(core.assessTranslation(source,'...','ka').ok,false);
 assert.ok(core.assessTranslation(source,'მამულში შესასვლელი ერთადერთი კარი დასავლეთის კედელში იყო.','ka').ok);
 assert.ok(core.assessTranslation('If he is at home, ask him to read the book.','თუ ის სახლშია, სთხოვე, წიგნი წაიკითხოს.','ka').ok);
 assert.ok(core.assessTranslation('No, no, no, no!','არა, არა, არა, არა!','ka').ok);
});

test('No-credit fallback rejects disguised English and tries the connected neural model',async()=>{
 let calls=0;
 const source='The only entrance to the estate was a small door in the west wall.';
 const bad='თე ონე ენტრანსე ტო თე ესტატე ვას ა სმოლ დორ ინ თე ვესტ ვოლ.';
 const expected='მამულში შესასვლელი ერთადერთი კარი დასავლეთის კედელში იყო.';
 const engine=machine.create({assess:core.assessTranslation,fetchImpl:async(url)=>new Response(JSON.stringify(String(url).includes('google')?[[[bad,source]]]:{responseStatus:429,quotaFinished:true})),offline:async()=>{calls++;return expected;}});
 assert.equal(await engine.translate(source,'en','ka'),expected);assert.equal(calls,1);
});

test('Disconnected neural fallback never publishes source text or an invented translation',async()=>{
 const engine=machine.create({assess:core.assessTranslation,fetchImpl:async()=>new Response('',{status:503}),offline:async()=>{throw Error('server down');}});
 assert.equal(await engine.translate('She opened the door and waited.','en','ka'),null);
});

test('Optional AI receives the actual draft and bounded context in one editing request',async()=>{
 const source=fs.readFileSync('static/app.js','utf8');let calls=0;
 const original='He did not open the door because he was afraid.',draft='მას ეშინოდა და ამიტომ კარი არ გააღო.';
 const ctx=vm.createContext({assessTranslation:core.assessTranslation,extractTranslation:v=>v,recordEngineUse(){},callGeminiJSON:async(prompt,options)=>{
   calls++;assert.ok(prompt.includes(draft));assert.ok(prompt.includes(original));assert.ok(prompt.length<4000);
   assert.equal(options.retries,0);assert.equal(options.temperature,0.1);
   assert.ok(options.validateResponse({translation:draft}));assert.equal(options.validateResponse({translation:'...'}),false);
   return {translation:draft};
 }});
 vm.runInContext(source.slice(source.indexOf('async function editTranslationDraft('),source.indexOf('async function runOptionalAiCorrection(')),ctx);
 assert.equal(await ctx.editTranslationDraft(original,draft,'ka','a'.repeat(4000),'b'.repeat(4000)),draft);assert.equal(calls,1);
});

function harness(fetchImpl){const values=new Map();let user='alice';const api=local.create({storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},fetchImpl,owner:()=>user});return {api,values,user:value=>user=value};}
test('Translation server connection is checked, account scoped, and preserved after a failed change',async()=>{
 let ok=true;const h=harness(async()=>new Response(JSON.stringify({ready:ok,languages:['en','ka']})));
 await h.api.connect('http://127.0.0.1:8766','fixture');assert.equal(h.api.enabled(),true);
 ok=false;await assert.rejects(h.api.connect('https://example.com','new'),/Install/);assert.match(h.values.get('engbot_neural_server:alice'),/127.0.0.1/);
 h.user('bob');assert.equal(h.api.enabled(),false);assert.equal(await h.api.translate('book','en','ka'),null);
 assert.throws(()=>local.normalizeEndpoint('http://public.example.com'),/HTTPS/);
 assert.throws(()=>local.normalizeEndpoint('https://user:pass@example.com'),/HTTPS/);
});

test('Stopping a local translation aborts its HTTP request without a late accepted result',async()=>{
 let entered;const ready=new Promise(r=>entered=r);
 const h=harness(async(url,{signal})=>{
   if(url.endsWith('/health'))return new Response(JSON.stringify({ready:true,languages:['en','ka']}));
   entered();return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason)));
 });
 await h.api.connect('http://127.0.0.1:8766','fixture');const parent=new AbortController();
 const job=h.api.translate('She opened the door.','en','ka',parent.signal);const rejected=assert.rejects(job,{name:'AbortError'});await ready;parent.abort();await rejected;
});
