const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const runtime=require('../static/provider-runtime.js'),core=require('../static/engine-core.js');
const src=fs.readFileSync('static/app.js','utf8');
function section(start,end){return src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)));}
function pipeline(review){const failures=[];const ctx=vm.createContext({window:{},EngbotCore:core,setTranslationStage(){},translationFailure:(s,m)=>failures.push(m),aiTranslationAvailable:()=>true,assessTranslation:()=>({ok:true}),geminiPasses:3,geminiDraftTranslate:async()=> 'draft',geminiCritiqueTranslation:async()=>review,geminiRefineTranslation:async()=> 'revision'});vm.runInContext(section('async function translateWithGeminiAI(','// Budget pipeline'),ctx);ctx.failures=failures;return ctx;}
test('Minor reviewer suggestions do not block a usable translation',async()=>{const ctx=pipeline({verdict:'needs_revision',errors:[{severity:'minor'}]});assert.equal(await ctx.translateWithGeminiAI('source','ka'),'draft');});
test('Unresolved accuracy errors block publication even at the two-pass setting',async()=>{for(const passes of [2,3]){const ctx=pipeline({verdict:'needs_revision',errors:[{severity:'major'}]});ctx.geminiPasses=passes;assert.equal(await ctx.translateWithGeminiAI('source','ka'),null);assert.match(ctx.failures[0],/issues remain/);}});
test('A corrected translation passes final review',async()=>{const ctx=pipeline(null);let calls=0;ctx.geminiCritiqueTranslation=async()=>++calls===1?{verdict:'needs_revision',errors:[{severity:'critical'}]}:{verdict:'approved',errors:[]};assert.equal(await ctx.translateWithGeminiAI('source','ka'),'revision');assert.equal(calls,2);});
test('Final review receives the previous draft and requested repair to prevent context-free reversals',async()=>{
 const ctx=pipeline(null);const histories=[];const issue={severity:'major',issue:'The governing clause requires optative mood.',fix:'Repair the complete clause.'};
 ctx.geminiCritiqueTranslation=async(_s,_t,_l,history)=>{histories.push(history);return history?{verdict:'approved',errors:[]}:{verdict:'needs_revision',errors:[issue]};};
 assert.equal(await ctx.translateWithGeminiAI('source','ka'),'revision');
 assert.equal(histories[0],undefined);assert.equal(histories[1].previousTranslation,'draft');assert.equal(histories[1].requestedCorrections[0],issue);
});

test('Refinement extracts the same alternate response field that its validator accepts',async()=>{
 const ctx=vm.createContext({assessTranslation:()=>({ok:true}),extractTranslation:v=>v,getTitleFidelityBlock:()=>'',callGeminiJSON:async(_prompt,options)=>{const result={translation:'valid revised text'};assert.ok(options.validateResponse(result));return result;}});
 vm.runInContext(section('async function geminiRefineTranslation(','// Full pipeline'),ctx);
 assert.equal(await ctx.geminiRefineTranslation('source','draft',[],'en'),'valid revised text');
});
test('Malformed and contradictory reviews fail closed',()=>{for(const review of [null,{verdict:'approved'},{verdict:'needs_revision',errors:[]},{verdict:'approved',errors:[{}]}])assert.equal(core.reviewDecision(review).valid,false);});
test('Provider failures give actionable, non-secret status and reset after success',async()=>{for(const [status,expected] of [[401,/API key/],[402,/credits/],[429,/quota/],[503,/temporarily/]]){await runtime.request('https://api.groq.com/test',{headers:{Authorization:'secret'}},{fetchImpl:async()=>new Response('',{status})});assert.match(runtime.getFailure().message,expected);assert.ok(!JSON.stringify(runtime.getFailure()).includes('secret'));}await runtime.request('https://api.groq.com/test',{}, {fetchImpl:async()=>new Response('{}')});assert.equal(runtime.getFailure(),null);});
test('Slow provider requests time out and stop waiting',async()=>{await assert.rejects(runtime.request('https://api.groq.com/test',{}, {timeoutMs:10,fetchImpl:(_u,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason)))}));assert.equal(runtime.getFailure().code,'timeout');});
test('Speech prefetch is reused and retained audio has a fixed memory bound',async()=>{let calls=0;const buffer=runtime.createSpeechBuffer(async text=>{calls++;return text;},2);const a=buffer.get('a','one');assert.equal(buffer.get('a','one'),a);assert.equal(await a,'one');assert.equal(await buffer.get('a','one'),'one');assert.equal(calls,1);await buffer.get('b','two');await buffer.get('c','three');assert.equal(buffer.size,2);await buffer.get('a','one');assert.equal(calls,4);});
test('Stop cancels pending speech and a late response cannot reach playback',async()=>{let release,started;const ready=new Promise(r=>started=r),buffer=runtime.createSpeechBuffer((_p,signal)=>{started();return new Promise(r=>release=r);});const request=buffer.get('a','one');const rejected=assert.rejects(request,{name:'AbortError'});await ready;buffer.clear();release('late audio');await rejected;assert.equal(buffer.size,0);});
test('Failed speech requests can be retried',async()=>{let calls=0;const buffer=runtime.createSpeechBuffer(async()=>{if(++calls===1)throw Error('temporary');return 'audio';});await assert.rejects(buffer.get('a',{}));assert.equal(await buffer.get('a',{}),'audio');});
test('Pasted API labels are removed without guessing between multiple keys',()=>{const ctx=vm.createContext({window:{}});vm.runInContext(section('function sanitizeApiKey(','\nfunction '),ctx);const key='gsk_'+'a'.repeat(30);assert.equal(ctx.sanitizeApiKey('Groq API key: '+key),key);assert.notEqual(ctx.sanitizeApiKey(key+' gsk_'+'b'.repeat(30)),key);});
test('Neural scanning recovers after a temporary outage and preserves all visible response parts',async()=>{const source=fs.readFileSync('static/scanner.js','utf8');let now=100;const ctx=vm.createContext({Date:{now:()=>now},AbortSignal,console:{warn(){}},state:{tier0:false,neuralRetryAt:200},location:{hostname:'devsura3939.github.io'},localStorage:{getItem:k=>k==='geminiApiKey'?'test':null},window:{EngbotCore:core,EngbotProviders:{request:async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'internal'},{text:'English '},{text:'ქართული'}]}}]}))}}});vm.runInContext(source.slice(source.indexOf('  function getVisionPrompt('),source.indexOf('  // ── Tier 1:')),ctx);assert.equal(ctx.canUseNeuralOCR(),false);now=201;assert.equal(ctx.canUseNeuralOCR(),true);const result=await ctx.ocrGateway('data:image/png;base64,AA==','auto','');assert.equal(result.text,'English ქართული');assert.equal(ctx.state.tier0,true);});

test('Translation direction follows source text, not the language of an existing edition',()=>{
 assert.equal(core.bookSourceLanguage({lang:'ka',isTranslatedEdition:true,chapters:[{text:'An English book about a journey.',text_ka:'ქართული თარგმანი'}]}),'en');
 assert.equal(core.bookSourceLanguage({lang:'en',chapters:[{text:'ქართული წიგნი მოგზაურობის შესახებ.'}]}),'ka');
});

test('A malformed review falls through to the next configured provider',async()=>{
 const calls=[];const ctx=vm.createContext({translationRequestController:null,console:{warn(){}},geminiApiKey:'fixture',groqApiKey:'fixture',customProviderUrl:'',openRouterApiKey:'',mistralApiKey:'',luminaGatewayAvailable:false,callGeminiJSONDirect:async()=>{calls.push('Gemini');return {translation:'not a review'};},callGroqJSON:async()=>{calls.push('Groq');return {verdict:'approved',errors:[]};}});
 vm.runInContext(section('async function callGeminiJSON(','async function callGeminiJSONDirect('),ctx);
 const result=await ctx.callGeminiJSON('Review',{validateResponse:data=>core.reviewDecision(data).valid});
 assert.equal(result.verdict,'approved');assert.deepEqual(calls,['Gemini','Groq']);
});
const ka=require('../static/georgian-linguistics.js');
test('Offline Georgian engine keeps a proper-name title nominal and complete',()=>{
 assert.match(ka.translateOfflineEnToKa('Killing Rommel'),/რომელის მოკვლა/);
 assert.doesNotMatch(ka.translateOfflineEnToKa('Killing Rommel'),/მოკალიე/);
});
test('Per-segment Georgian guidance is bounded while the full corpus remains available',()=>{
 for(const source of ['A story about a book.','John Smith did not return home.']){
  const guidance=ka.getKaTaskRules(source);assert.ok(guidance.length>1000&&guidance.length<=6000);
  assert.ok(ka.getKaCompactRules().length>40000);
 }
});

test('Georgian negative concord and coordinated negatives survive grammar QA unchanged',()=>{
 for(const text of ['არავითარი უბედურება არ ახლავს.','არავინ არ მოვიდა.','არ ჭამს და არ სვამს.']){
  assert.equal(ka.correctGeorgianMorphology(text),text);
  assert.deepEqual(ka.validateGeorgianTranslation(text).filter(issue=>/neg/.test(issue.rule)),[]);
 }
});

test('Negative fragments never receive a guessed verbal negator',()=>{
 for(const text of ['არავითარი პრობლემა.','არაფერი ახალი.']){
  assert.equal(ka.correctGeorgianMorphology(text),text);
  assert.deepEqual(ka.validateGeorgianTranslation(text).filter(issue=>/neg/.test(issue.rule)),[]);
 }
});

test('Closing completed translation details neither cancels work nor reports a false pause',()=>{
 for(const running of [false,true]){
  let aborted=0,toasts=0,closed=0;const dock={classList:{add(){}},style:{}};
  const ctx=vm.createContext({isTranslatingWholeBook:running,cancelTranslationFlag:false,translationRequestController:{abort:()=>aborted++},translationPanelMinimized:true,DOM:{translationMiniDock:dock},closeModal:()=>closed++,showToast:()=>toasts++});
  vm.runInContext(section('function cancelWholeBookTranslation()','// ══════════════════════════════════════════════════════════════════════════'),ctx);
  ctx.cancelWholeBookTranslation();assert.equal(closed,1);assert.equal(aborted,Number(running));assert.equal(toasts,Number(running));assert.equal(ctx.cancelTranslationFlag,running);assert.equal(dock.style.display,'none');
 }
});

test('The actual reviewer receives negative concord guidance without a one-negator veto',async()=>{
 let captured;
 const ctx=vm.createContext({EngbotCore:core,getKaCompactRules:ka.getKaCompactRules,getKaTaskRules:ka.getKaTaskRules,callGeminiJSON:async(prompt,options)=>{captured=prompt+options.systemPrompt;return {verdict:'approved',errors:[]};}});
 vm.runInContext(section('function getBookGlossaryBlock(','async function geminiRefineTranslation('),ctx);
 await ctx.geminiCritiqueTranslation('The journey was without danger.','არავითარი საფრთხე არ არსებობდა.','ka');
 assert.match(captured,/negative concord is valid/i);
 assert.doesNotMatch(captured,/one negator per clause|NEVER არ for commands|არავინ არ მოვიდა is wrong|Any violation.*at least a/);
 for(const rules of [ka.getKaTaskRules('A peaceful journey.'),ka.getKaCompactRules(),ka.getKaRepairRules()]){
  assert.match(rules,/negative concord is valid/i);
  assert.doesNotMatch(rules,/Double negation.*UNGRAMMATICAL|არავინ არ მოვიდა is wrong/);
 }
});

test('Source-side unusual wording cannot block a translation',()=>{
 const ctx=vm.createContext({});
 vm.runInContext(section('function normalizeSourceQualityReview(','async function geminiCritiqueTranslation('),ctx);
 const sourceComplaint={verdict:'needs_revision',errors:[{severity:'major',type:'grammar',issue:"The source text 'wall and keep motating. The' appears to be a typo-ridden fragment.",fix:'The source likely means moving.'}]};
 const normalized=ctx.normalizeSourceQualityReview(sourceComplaint);
 assert.equal(normalized.errors[0].severity,'minor');
 assert.equal(core.reviewDecision(normalized).blocking.length,0);
 const realTranslation={verdict:'needs_revision',errors:[{severity:'major',type:'grammar',issue:'The translation reverses the source meaning.',fix:'Restore the negation.'}]};
 assert.equal(ctx.normalizeSourceQualityReview(realTranslation).errors[0].severity,'major');
});

test('Reviewer receives surrounding source context for boundary fragments',async()=>{
 let captured='';
 const ctx=vm.createContext({EngbotCore:core,getKaCompactRules:ka.getKaCompactRules,getKaTaskRules:ka.getKaTaskRules,callGeminiJSON:async(prompt)=>{captured=prompt;return {verdict:'approved',errors:[]};}});
 vm.runInContext(section('function getBookGlossaryBlock(','async function geminiRefineTranslation('),ctx);
 await ctx.geminiCritiqueTranslation('wall and keep motating. The','კედელს გადაახტი და განაგრძე.','ka',null,'before sentence','after sentence');
 assert.match(captured,/PRECEDING SOURCE CONTEXT/);
 assert.match(captured,/FOLLOWING SOURCE CONTEXT/);
 assert.match(captured,/keep motating/);
});

test('Reviewer prompt locks title proper names instead of accepting an imperative mistranslation',async()=>{
 let captured='';
 const ctx=vm.createContext({EngbotCore:core,callGeminiJSON:async(prompt,options)=>{captured=prompt+(options?.systemPrompt||'');return {verdict:'approved',errors:[]};}});
 vm.runInContext(section('function getBookGlossaryBlock(','async function geminiRefineTranslation('),ctx);
 await ctx.geminiCritiqueTranslation('Killing Rommel','მოკალიე რომელი','ka');
 assert.match(captured,/Source proper-name hints: Rommel/);
 assert.match(captured,/Killing Rommel/);
 assert.match(captured,/nominal action construction/i);
 assert.match(captured,/imperative/i);
});
