const {test}=require('node:test'), assert=require('node:assert/strict');
const phases=require('../static/translation-phases.js'), core=require('../static/engine-core.js');
const source='He did not open the door because he was afraid.';
const baseline='მას ეშინოდა და ამიტომ კარი არ გააღო.';
const edited='მან კარი არ გააღო, რადგან ეშინოდა.';
const approved={verdict:'approved',errors:[]};
function setup(overrides={}) {
    const calls=[];
    const engine=phases.create({machine:async()=>{calls.push('machine');return baseline;},localAvailable:()=>true,cloudAvailable:()=>true,assess:core.assessTranslation,
        local:async(prompt)=>{calls.push(prompt.startsWith('Audit')?'review':'local');return prompt.startsWith('Audit')?approved:{translation:edited};},
        cloud:async()=>{calls.push('cloud');return {translation:edited};},...overrides});
    return {engine,calls};
}
test('Quality uses machine baseline, local source-aware editor then local audit, without paid work',async()=>{
    const {engine,calls}=setup();assert.equal(await engine.translate(source,'ka',{mode:'quality'}),edited);assert.deepEqual(calls,['machine','local','review']);
});
test('Budget leaves a simple validated baseline alone, quality edits it',async()=>{
    const {engine,calls}=setup();const simple='She opened the door.';
    await engine.translate(simple,'ka',{mode:'budget'});assert.deepEqual(calls,['machine']);
    calls.length=0;await engine.translate(simple,'ka',{mode:'quality'});assert.deepEqual(calls,['machine','local']);
});
test('Local work continues beyond the 48-cloud-escalation cap and across restored budgets',async()=>{
    const {engine,calls}=setup();engine.reset({cloudCalls:48,reservedCloudTokens:180000});
    for(let i=0;i<55;i++)assert.equal(await engine.translate(source,'ka',{mode:'quality'}),edited);
    assert.equal(calls.filter(c=>c==='local').length,55);assert.equal(calls.filter(c=>c==='cloud').length,0);assert.equal(engine.snapshot().cloudCalls,48);
});
test('No baseline can be recovered with a local draft and review without paid credentials',async()=>{
    const {engine,calls}=setup({machine:async()=>null,cloudAvailable:()=>false});
    assert.equal(await engine.translate(source,'ka'),edited);assert.deepEqual(calls,['local','review']);
});
test('Quality sampling escalates only every twelfth difficult segment',async()=>{
    const {engine,calls}=setup();for(let i=0;i<13;i++) await engine.translate(source,'ka',{mode:'quality'});
    assert.equal(calls.filter(c=>c==='cloud').length,1);
});
test('Malformed local output escalates to cloud with the existing source and draft',async()=>{
    let prompt;
    const {engine}=setup({local:async()=>({translation:'...'}),cloud:async p=>{prompt=p;return {translation:edited};}});
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),edited);assert.ok(prompt.includes(source));assert.ok(prompt.includes(baseline));
});
test('Paid timeout preserves baseline, cools down, and cannot disable local work',async()=>{
    let cloudCalls=0,localCalls=0;
    const {engine}=setup({local:async()=>{localCalls++;return null;},cloud:async()=>{cloudCalls++;return new Promise(()=>{});},cloudTimeoutMs:10});
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),baseline);
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),baseline);assert.equal(cloudCalls,1);assert.equal(localCalls,2);
});
test('Source-grounded major errors request local repair and re-review when credits are unavailable',async()=>{
    let count=0;
    const issue={verdict:'needs_revision',errors:[{severity:'major',type:'negation',source_quote:'did not open',reason:'Preserve negation.'}]};
    const {engine}=setup({cloudAvailable:()=>false,local:async()=>{count++;return count===2?issue:count===4?approved:{translation:edited};}});
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),edited);assert.equal(count,4);
});
test('Unresolved major errors retain baseline; minor source issues cannot veto it',async()=>{
    const issue={verdict:'needs_revision',errors:[{severity:'major',type:'negation',source_quote:'did not open',reason:'Negation missing.'}]};
    const {engine}=setup({cloudAvailable:()=>false,local:async p=>p.startsWith('Audit')?issue:{translation:edited}});
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),baseline);
    assert.deepEqual(phases.reviewResult({verdict:'needs_revision',errors:[{severity:'minor',type:'style'}]},source),[]);
    assert.equal(phases.reviewResult({verdict:'approved',errors:issue.errors},source),null);
    assert.equal(phases.reviewResult({verdict:'needs_revision',errors:[{severity:'major',type:'made_up'}]},source),null);
});
test('Local edits cannot add or drop numeric facts',async()=>{
    const text='He bought 3 books and read 2 books.';
    const original='მან 3 წიგნი იყიდა და 2 წიგნი წაიკითხა.';
    const {engine}=setup({machine:async()=>original,cloudAvailable:()=>false,local:async()=>({translation:'მან 7 წიგნი იყიდა და ყველა წაიკითხა.'})});
    assert.equal(await engine.translate(text,'ka',{mode:'quality'}),original);
});
test('Local edits cannot merge or invent source paragraphs',async()=>{
    const {engine}=setup({cloudAvailable:()=>false,local:async()=>({translation:edited+'\n\n'+edited})});
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),baseline);
});
test('Comparative review can retain the stronger baseline without credits',async()=>{
    let captured;
    const {engine}=setup({cloudAvailable:()=>false,local:async p=>{if(p.startsWith('Audit')){captured=p;return {...approved,preferred:'baseline'};}return {translation:edited};}});
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),baseline);assert.ok(captured.includes(baseline));assert.ok(captured.includes(edited));
});
test('Cancellation stops pending phases promptly and never accepts late output',async()=>{
    const controller=new AbortController();let started;
    const ready=new Promise(r=>started=r);
    const {engine}=setup({local:async()=>{started();return new Promise(()=>{});}});
    const pending=engine.translate(source,'ka',{mode:'quality',signal:controller.signal});await ready;controller.abort();
    await assert.rejects(pending,{name:'AbortError'});
});
test('Phase budget prevents an unlimited repair loop',async()=>{
    let time=0,calls=0;
    const {engine}=setup({now:()=>time,phaseTimeoutMs:150,local:async()=>{calls++;time+=200;return {translation:edited,uncertain:true};}});
    // Sub-second remaining budgets are intentionally skipped.
    assert.equal(await engine.translate(source,'ka',{mode:'quality'}),baseline);assert.equal(calls,0);
});
test('No usable engine never returns fabricated completion',async()=>{
    const {engine}=setup({machine:async()=>null,local:async()=>null,cloud:async()=>null});assert.equal(await engine.translate(source,'ka'),null);
});
test('Prompts preserve full source and draft while bounding reference context',()=>{
    const prompt=phases.promptFor('edit',{source,draft:baseline,target:'ka',before:'b'.repeat(10000),after:'a'.repeat(10000),glossary:'g'.repeat(10000)});
    assert.ok(prompt.includes(source));assert.ok(prompt.includes(baseline));assert.ok(prompt.length<3000);
    assert.equal(phases.segmentLimit(16384),1400);assert.ok(phases.segmentLimit(4096)<500);
});
