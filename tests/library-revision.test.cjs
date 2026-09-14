const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create,changedRows}=require('../static/library-sync.js');

test('Stable account revision avoids every manifest and full-content request',async()=>{
  let revision='1',reads=0;
  const rows={books:[{id:'b',updated_at:'1'}],chapters:[]};
  const sync=create({owner:()=> 'a',getRevision:async()=>revision,load:async table=>{reads++;return rows[table];}});
  await sync.read();reads=0;
  await sync.read();assert.equal(reads,0);
  revision='2';rows.books=[];
  assert.deepEqual(await sync.read(),{books:[],chapters:[]});
  assert.equal(sync.takeDeletedBooks()[0].id,'b');
  assert.equal(sync.takeDeletedBooks().length,0);
});
test('Events and local writes invalidate a matching revision',async()=>{
  let reads=0;
  const sync=create({owner:()=> 'a',getRevision:async()=> '1',load:async()=>{reads++;return [];}});
  await sync.read();sync.invalidate();await sync.read();assert.equal(reads,4);
});
test('Event arriving during a snapshot is reconciled by the next read',async()=>{
  let reads=0,sync;
  sync=create({owner:()=> 'a',getRevision:async()=> '1',load:async()=>{reads++;if(reads===2)sync.invalidate();return [];}});
  await sync.read();await sync.read();assert.equal(reads,4);
});
test('Missing revision RPC retains manifest fallback; other read errors preserve cache',async()=>{
  let reads=0,fail=false;
  const sync=create({owner:()=> 'a',getRevision:async()=>{if(fail)throw Error('offline');return null;},load:async()=>{reads++;return [];}});
  await sync.read();await sync.read();assert.equal(reads,4);
  fail=true;await assert.rejects(sync.read(),/offline/);
  fail=false;await sync.read();assert.equal(reads,6);
});
test('Delta saves ignore property order and server-owned fields, include real edits and additions',()=>{
  const old=[{chapter_index:0,title:'One',text_content:'Hello',metadata:{b:2,a:1},status:'done',updated_at:'now'}];
  const unchanged={chapter_index:0,title:'One',text_content:'Hello',metadata:{a:1,b:2}};
  assert.deepEqual(changedRows([unchanged],old,'chapter_index'),[]);
  const edit={...unchanged,text_content:'გამარჯობა'};
  const added={...unchanged,chapter_index:1};
  assert.deepEqual(changedRows([edit,added],old,'chapter_index'),[edit,added]);
});

function durableFixture() {
  const disk = new Map(), calls=[];
  let revision='1',owner='alice';
  const rows={books:[{id:'b',user_id:'alice',updated_at:'1'}],chapters:[{id:'c',book_id:'b',user_id:'alice',updated_at:'1',text_content:'ქართული ტექსტი'}]};
  const storage={get:async user=>structuredClone(disk.get(user)),set:async(user,value)=>disk.set(user,structuredClone(value))};
  const options={owner:()=>owner,storage,getRevision:async()=>revision,load:async(table,columns,ids,user)=>{
    calls.push({table,columns,ids});
    return structuredClone(rows[table].filter(row=>row.user_id===user&&(!ids||ids.includes(row.id))));
  }};
  return {disk,calls,rows,options,setRevision:value=>revision=value,setOwner:value=>owner=value};
}

test('Reload validates persisted account revision without downloading any chapters',async()=>{
  const h=durableFixture();await create(h.options).read();h.calls.length=0;
  const result=await create(h.options).read();
  assert.equal(result.chapters[0].text_content,'ქართული ტექსტი');assert.equal(h.calls.length,0);
});

test('Reload after remote edits downloads only changed chapters and reconciles deleted books',async()=>{
  const h=durableFixture();await create(h.options).read();h.calls.length=0;
  h.setRevision('2');h.rows.chapters[0].updated_at='2';h.rows.chapters[0].text_content='Updated';
  assert.equal((await create(h.options).read()).chapters[0].text_content,'Updated');
  assert.deepEqual(h.calls.filter(call=>call.columns==='*').map(call=>call.table),['chapters']);
  h.setRevision('3');h.rows.books=[];h.rows.chapters=[];
  const reopened=create(h.options);assert.deepEqual(await reopened.read(),{books:[],chapters:[]});
  assert.equal(reopened.takeDeletedBooks()[0].id,'b');
});

test('Persisted caches cannot cross accounts; malformed and unavailable caches recover from cloud',async()=>{
  const h=durableFixture();await create(h.options).read();h.setOwner('bob');
  h.disk.set('bob',h.disk.get('alice'));
  assert.deepEqual(await create(h.options).read(),{books:[],chapters:[]});
  h.setOwner('alice');h.disk.get('alice').chapters[0].user_id='bob';h.calls.length=0;
  assert.equal((await create(h.options).read()).chapters[0].user_id,'alice');assert.ok(h.calls.length>0);
  const badStorage={get:async()=>{throw Error('blocked');},set:async()=>{throw Error('quota');}};
  assert.equal((await create({...h.options,storage:badStorage}).read()).books.length,1);
});

test('Hydration does not hide a reconnect and an account switch discards a pending cache read',async()=>{
  const h=durableFixture();await create(h.options).read();h.calls.length=0;
  let release;const wait=new Promise(resolve=>release=resolve);
  const storage={...h.options.storage,get:async user=>{await wait;return h.options.storage.get(user);}};
  const sync=create({...h.options,storage});const pending=sync.read();sync.invalidate();release();await pending;
  assert.equal(h.calls.filter(call=>call.columns==='id,updated_at').length,2);
  let releaseAgain;const secondWait=new Promise(resolve=>releaseAgain=resolve);
  const switched=create({...h.options,storage:{...storage,get:async user=>{await secondWait;return h.options.storage.get(user);}}});
  const second=switched.read();h.setOwner('bob');releaseAgain();assert.deepEqual(await second,{books:[],chapters:[]});
});

test('Offline or missing revision never treats a disk snapshot as current cloud content',async()=>{
  const h=durableFixture();await create(h.options).read();h.calls.length=0;
  await assert.rejects(create({...h.options,getRevision:async()=>{throw Error('offline');}}).read(),/offline/);
  await create({...h.options,getRevision:async()=>null}).read();
  assert.equal(h.calls.filter(call=>call.columns==='id,updated_at').length,2);
});
