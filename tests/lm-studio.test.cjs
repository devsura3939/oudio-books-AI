const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const {create, endpoint, modelList, modelProfiles} = require('../static/lm-studio.js');
function fixture(fetchImpl, extra = {}) {
    const values = new Map(); let user = 'alice';
    const storage = {getItem:k=>values.get(k), setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k)};
    const client = create({storage, owner:()=>user, fetchImpl, cloudTimeoutMs:15, requestTimeoutMs:200, ...extra});
    return {client, values, storage, switchUser:id=>user=id};
}
const response = (content='{"translation":"ქართული ტექსტი"}', finish='stop') => new Response(JSON.stringify({choices:[{finish_reason:finish,message:{content}}]}));
async function connect(client, token='') {
    await client.detect('http://localhost:1234',token);
    client.save({url:'http://localhost:1234',token,model:'local-model',enabled:true});
}
const models = () => new Response(JSON.stringify({data:[{id:'local-model'},{id:'second-model'},{id:'text-embedding'}]}));
test('LM Studio URL normalization, supported models and transport constraints',()=>{
    for(const url of ['http://localhost:1234','http://localhost:1234/v1/','http://localhost:1234/v1/chat/completions','http://localhost:1234/api/v1/models']) assert.equal(endpoint(url),'http://localhost:1234/v1');
    assert.equal(endpoint('https://my-host.example/lm/v1'),'https://my-host.example/lm/v1');
    for(const url of ['http://192.168.1.2:1234','https://name:secret@host/v1','https://host/v1?token=secret','file:///tmp']) assert.throws(()=>endpoint(url));
    assert.deepEqual(modelList({data:[{id:'llama'},{id:'llama'},{id:'embedding-model'},{}]}),['llama']);
});
test('Detects with optional token, saves chosen model and reloads per account',async()=>{
    let auth;
    const f=fixture(async(url,init)=>{assert.ok(url.endsWith('/v1/models')); auth=init.headers.Authorization;return models();});
    await connect(f.client,'test-token'); assert.equal(auth,'Bearer test-token');
    f.client.save({...f.client.settings(),model:'second-model'});
    const restored=create({storage:f.storage,owner:()=> 'alice',fetchImpl:async()=>models()});
    assert.equal(restored.settings().model,'second-model'); assert.equal(restored.enabled(),true);
    f.switchUser('bob'); assert.equal(f.client.enabled(),false); assert.equal(f.client.settings(),null);
    f.switchUser('alice'); f.client.disconnect(); assert.equal(f.client.enabled(),false);
});
test('Changed credentials and unknown model must be detected before saving',async()=>{
    const {client}=fixture(async()=>models()); await connect(client);
    assert.throws(()=>client.save({...client.settings(),token:'different'}),/Detect models/);
    assert.throws(()=>client.save({...client.settings(),model:'missing'}),/Detect models/);
});
test('Discovery fails clearly for rejected auth and missing text models',async()=>{
    await assert.rejects(fixture(async()=>new Response('',{status:401})).client.detect('http://localhost:1234','wrong'),/rejected the token/);
    await assert.rejects(fixture(async()=>new Response('{"data":[]}')).client.detect('http://localhost:1234'),/No text models/);
});
test('Cloud success avoids local inference; failure calls the saved model without a paid key',async()=>{
    let calls=0;
    const {client}=fixture(async(url,init)=>{
        if(url.endsWith('/models'))return models(); calls++;
        const body=JSON.parse(init.body); assert.equal(body.model,'local-model'); assert.equal(body.stream,false);
        assert.equal(init.headers.Authorization,undefined); assert.equal(body.messages[0].content,'instruction');return response();
    });
    await connect(client);
    const opts={parse:JSON.parse,systemPrompt:'instruction',validateResponse:r=>!!r.translation};
    assert.deepEqual(await client.withFallback(async()=>({translation:'cloud'}),'source',opts),{translation:'cloud'});assert.equal(calls,0);
    assert.deepEqual(await client.withFallback(async()=>null,'source',opts),{translation:'ქართული ტექსტი'});assert.equal(calls,1);
});
test('A stalled paid provider is cancelled and cannot starve the local backup',async()=>{
    let aborted=false;
    const {client}=fixture(async url=>url.endsWith('/models')?models():response());await connect(client);
    const out=await client.withFallback(signal=>new Promise(resolve=>signal.addEventListener('abort',()=>{aborted=true;resolve(null);})), 'source',{parse:JSON.parse});
    assert.equal(aborted,true);assert.equal(out.translation,'ქართული ტექსტი');
});
test('Output must be complete JSON and pass the caller quality gate',async()=>{
    for(const [body,finish] of [['{"translation":"cut','length'],['not JSON','stop'],['{"translation":"bad"}','stop']]){
        const {client}=fixture(async url=>url.endsWith('/models')?models():response(body,finish));await connect(client);
        assert.equal(await client.json('source',{parse:JSON.parse,validateResponse:()=>false}),null);
    }
});
test('Unreachable server cools down; disabling backup never makes requests',async()=>{
    let calls=0, time=0;
    const {client}=fixture(async url=>{if(url.endsWith('/models'))return models();calls++;throw Error('Offline');},{now:()=>time});await connect(client);
    assert.equal(await client.text('hello'),null);assert.equal(await client.text('hello'),null);assert.equal(calls,1);
    time=60001;await client.text('hello');assert.equal(calls,2);
    client.save({...client.settings(),enabled:false});await client.text('hello');assert.equal(calls,2);
});
test('Cancellation and account changes cannot return stale local output',async()=>{
    let finish;
    const f=fixture(async(url,opts)=>url.endsWith('/models')?models():new Promise(resolve=>{finish=()=>resolve(response());}));await connect(f.client);
    const pending=f.client.text('hello');f.switchUser('bob');finish();assert.equal(await pending,null);
    f.switchUser('alice');const controller=new AbortController();controller.abort();
    await assert.rejects(f.client.text('hello',{signal:controller.signal}),{name:'AbortError'});
});
test('Application provider funnel invokes LM Studio after failed paid providers',async()=>{
    const source=fs.readFileSync('static/app.js','utf8');
    const {client}=fixture(async url=>url.endsWith('/models')?models():response());await connect(client);
    const ctx=vm.createContext({window:{EngbotLmStudio:client},parseModelJSON:JSON.parse,translationRequestController:null,console:{warn(){}},geminiApiKey:'fixture',groqApiKey:'',customProviderUrl:'',openRouterApiKey:'',mistralApiKey:'',luminaGatewayAvailable:false,callGeminiJSONDirect:async()=>null});
    vm.runInContext(source.slice(source.indexOf('async function callGeminiJSON('),source.indexOf('async function callGeminiJSONDirect(')),ctx);
    assert.equal((await ctx.callGeminiJSON('source',{validateResponse:r=>Boolean(r.translation)})).translation,'ქართული ტექსტი');
});
test('Loaded instance context overrides advertised maximum; unloaded model remains conservative',()=>{
    const profiles=modelProfiles({models:[{key:'27b',max_context_length:262144,loaded_instances:[{id:'my-alias',config:{context_length:16384}}]}]});
    assert.equal(profiles['my-alias'].context,16384);assert.equal(profiles['27b'].context,4096);
});
test('Oversized prompts are refused without sending truncated input or starting inference',async()=>{
    let inference=0;
    const {client}=fixture(async url=>{if(url.endsWith('/models'))return models();inference++;return response();});await connect(client);
    assert.equal(await client.text('ტექსტი'.repeat(4000)),null);assert.equal(inference,0);
});
test('Advertised reasoning controls use native focused generation without chat storage or tools',async()=>{
    let payload;
    const f=fixture(async(url,opts)=>{
        if(url.includes('/api/v1/models'))return new Response(JSON.stringify({models:[{key:'local-model',capabilities:{reasoning:{allowed_options:['off','on']}},loaded_instances:[{id:'local-model',config:{context_length:8192}}]}]}));
        if(url.endsWith('/models'))return models();
        assert.ok(url.endsWith('/api/v1/chat'));payload=JSON.parse(opts.body);
        return new Response(JSON.stringify({output:[{type:'message',content:'{"translation":"ქართული ტექსტი"}'}],stats:{total_output_tokens:20}}));
    });
    await connect(f.client);assert.ok(await f.client.json('source',{parse:JSON.parse}));
    assert.equal(payload.reasoning,'off');assert.equal(payload.store,false);assert.deepEqual(payload.integrations,[]);
});
test('Native output at its token limit cannot be accepted as complete',async()=>{
    const f=fixture(async(url,opts)=>{
        if(url.includes('/api/v1/models'))return new Response(JSON.stringify({models:[{key:'local-model',capabilities:{reasoning:{allowed_options:['off']}},loaded_instances:[]}]}));
        if(url.endsWith('/models'))return models();
        return new Response(JSON.stringify({output:[{type:'message',content:'{"translation":"cut"}'}],stats:{total_output_tokens:JSON.parse(opts.body).max_output_tokens}}));
    });await connect(f.client);assert.equal(await f.client.json('source',{parse:JSON.parse}),null);
});
