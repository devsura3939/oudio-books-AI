const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../static/library-sync.js');
function setup() {
    let owner='alice';const calls=[];
    const rows={books:[{id:'book',user_id:'alice',updated_at:'1',title:'Original'}],chapters:[{id:'chapter',book_id:'book',user_id:'alice',updated_at:'1',text_content:'Original text'}]};
    let fail=false;
    const sync=create({owner:()=>owner,load:async(table,columns,ids,user)=>{
        calls.push({table,columns,ids,user});if(fail)throw Error('offline');
        return rows[table].filter(r=>r.user_id===user&&(!ids||ids.includes(r.id))).map(r=>columns==='*'?structuredClone(r):{id:r.id,updated_at:r.updated_at});
    }});
    return {sync,rows,calls,setOwner:v=>owner=v,setFail:v=>fail=v};
}
test('Unchanged libraries poll revisions without downloading book or chapter content',async()=>{
    const h=setup();await h.sync.read();h.calls.length=0;
    const read=await h.sync.read();assert.equal(read.chapters[0].text_content,'Original text');
    assert.equal(h.calls.length,2);assert.ok(h.calls.every(c=>c.columns==='id,updated_at'));
});
test('One changed chapter downloads only that row and preserves all untouched contents',async()=>{
    const h=setup();await h.sync.read();h.calls.length=0;
    h.rows.chapters[0].updated_at='2';h.rows.chapters[0].text_content='Translated';
    const result=await h.sync.read();assert.equal(result.chapters[0].text_content,'Translated');
    const fetched=h.calls.filter(c=>c.columns==='*');assert.equal(fetched.length,1);assert.deepEqual(fetched[0].ids,['chapter']);
});
test('Adds and deletions reconcile without resurrecting removed books or chapters',async()=>{
    const h=setup();await h.sync.read();h.rows.books=[];h.rows.chapters=[];
    assert.deepEqual(await h.sync.read(),{books:[],chapters:[]});
    h.rows.books.push({id:'new',user_id:'alice',updated_at:'2'});
    assert.equal((await h.sync.read()).books[0].id,'new');
});
test('Account switches and consumer edits cannot leak or poison the revision cache',async()=>{
    const h=setup();const first=await h.sync.read();first.chapters[0].text_content='Local unsaved edit';
    assert.equal((await h.sync.read()).chapters[0].text_content,'Original text');
    h.setOwner('bob');assert.deepEqual(await h.sync.read(),{books:[],chapters:[]});
    h.setOwner('alice');assert.equal((await h.sync.read()).books.length,1);
});
test('Failed reads do not mark missing content as synchronized',async()=>{
    const h=setup();h.setFail(true);await assert.rejects(h.sync.read(),/offline/);h.setFail(false);
    assert.equal((await h.sync.read()).chapters.length,1);
});
test('Large manifests fetch content in bounded batches without dropping later records',async()=>{
    const h=setup();h.rows.chapters=Array.from({length:1205},(_,i)=>({id:'c'+i,book_id:'book',user_id:'alice',updated_at:'1'}));
    assert.equal((await h.sync.read()).chapters.length,1205);
    assert.ok(h.calls.filter(c=>c.ids).every(c=>c.ids.length<=100));
});
test('Changing account while loading discards the previous account response',async()=>{
    let owner='alice',release;const wait=new Promise(r=>release=r);
    const sync=create({owner:()=>owner,load:async(table,columns)=>{await wait;return table==='books'?[{id:'private',updated_at:'1'}]:[];}});
    const result=sync.read();owner='bob';release();assert.deepEqual(await result,{books:[],chapters:[]});
});
