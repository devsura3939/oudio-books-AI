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
