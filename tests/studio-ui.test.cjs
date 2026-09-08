const {test} = require('node:test');
const assert = require('node:assert/strict');
const ui = require('../static/studio-ui.js');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise,resolve}; };

test('Library searches share an in-flight request and reuse its result', async () => {
    let calls = 0; const data = deferred();
    const cache = ui.createLibraryCache(()=>'owner',()=>{ calls++; return data.promise; });
    const a = cache.read(), b = cache.read();
    data.resolve([{id:1}]);
    assert.deepEqual(await a, await b);
    assert.deepEqual(await cache.read(), [{id:1}]);
    assert.equal(calls,1);
});

test('A late read cannot replace the cache after a book mutation', async () => {
    const old = deferred(); let calls = 0;
    const cache = ui.createLibraryCache(()=>'owner',()=>++calls===1?old.promise:Promise.resolve([{id:2}]));
    const before = cache.read(); await Promise.resolve();
    cache.invalidate();
    assert.deepEqual(await cache.read(),[{id:2}]);
    old.resolve([{id:1}]); await before;
    assert.deepEqual(await cache.read(),[{id:2}]);
    assert.equal(calls,2);
});

test('Switching accounts discards an old account response', async () => {
    let owner='a'; const old=deferred();
    const cache=ui.createLibraryCache(()=>owner,()=>owner==='a'?old.promise:Promise.resolve([{id:'b'}]));
    const pending=cache.read(); await Promise.resolve(); owner='b';
    assert.deepEqual(await cache.read(),[{id:'b'}]);
    old.resolve([{id:'a'}]); assert.deepEqual(await pending,[]);
    assert.deepEqual(await cache.read(),[{id:'b'}]);
});

test('Failed library loads are retryable', async () => {
    let calls=0;
    const cache=ui.createLibraryCache(()=>1,()=>{if(++calls===1)throw Error('offline'); return [];});
    await assert.rejects(cache.read(),/offline/);
    assert.deepEqual(await cache.read(),[]);
});

test('Display titles remove export noise without changing the source title', () => {
    const title='**Final_The War of Art_6x9_Final** (ქართულად)';
    assert.equal(ui.displayTitle(title),'The War of Art (ქართულად)');
    assert.equal(title,'**Final_The War of Art_6x9_Final** (ქართულად)');
    assert.equal(ui.displayTitle('ოდისეა'),'ოდისეა');
});

test('Heavy actions report busy before execution, coalesce clicks, and recover after failure', async () => {
    const status={hidden:true,textContent:''}, attributes={};
    const button={disabled:false,setAttribute:(k,v)=>attributes[k]=v,removeAttribute:k=>delete attributes[k]};
    global.document={getElementById:()=>status,visibilityState:'hidden'};
    let calls=0; const work=deferred();
    try {
        const a=ui.run('import','Importing…',()=>{calls++;return work.promise;},button);
        const b=ui.run('import','Importing…',()=>{calls++;},button);
        assert.equal(a,b); assert.equal(calls,0);
        assert.equal(button.disabled,true); assert.equal(attributes['aria-busy'],'true');
        assert.equal(status.hidden,false);
        work.resolve(); await a; assert.equal(calls,1);
        assert.equal(button.disabled,false); assert.equal(status.hidden,true);
        await assert.rejects(ui.run('import','Retrying…',()=>{throw Error('failed');},button),/failed/);
        assert.equal(button.disabled,false); assert.equal(attributes['aria-busy'],undefined);
        assert.equal(status.hidden,true);
    } finally {delete global.document;}
});
