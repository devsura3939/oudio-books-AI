const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
  const user={id:'owner'},writes=[];let revision=1,fail=false;
  const data={books:[{id:'row',slug:'book',user_id:'owner',title:'Book',language:'en',created_at:'2026-01-01',updated_at:'1',metadata:{dateAdded:'2026-01-01'}}],chapters:[{id:'c',book_id:'row',user_id:'owner',chapter_index:0,title:'One',text_content:'Hello world',word_count:2,status:'done',metadata:{studio_id:1,text_ka:null,estimated_duration_sec:null,extra:{}},updated_at:'1'}]};
  const client={auth:{signInWithPassword:async()=>({data:{user,session:{user}}})},rpc:async()=>({data:String(revision)}),from(table){
    let op='read',value,filters=[],one=false;
    const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},gte(k,v){filters.push(r=>r[k]>=v);return q;},order(){return q;},range(){return q;},maybeSingle(){one=true;return q;},single(){one=true;return q;},update(v){op='update';value=v;return q;},insert(v){op='insert';value=v;return q;},upsert(v){op='upsert';value=v;return q;},delete(){op='delete';return q;},then(resolve,reject){return Promise.resolve().then(()=>{
      if(op==='read'){const found=data[table].filter(r=>filters.every(f=>f(r)));return {data:structuredClone(one?found[0]:found)};}
      if(fail&&table==='chapters')return {error:Error('interrupted upload')};
      writes.push({table,op,value:structuredClone(value)});revision++;
      if(op==='update')data[table].filter(r=>filters.every(f=>f(r))).forEach(r=>Object.assign(r,value,{updated_at:String(revision)}));
      if(op==='upsert')for(const row of value){const old=data[table].find(r=>r.book_id===row.book_id&&r.chapter_index===row.chapter_index);if(old)Object.assign(old,row,{updated_at:String(revision)});else data[table].push({...row,id:'new'+row.chapter_index,updated_at:String(revision),status:'pending'});}
      if(op==='delete')data[table]=data[table].filter(r=>!filters.every(f=>f(r)));
      return {data:null};
    }).then(resolve,reject);}};return q;
  }};
  const storage={length:0,getItem:()=>null,setItem(){},removeItem(){}};
  const window={location:new URL('https://example.test/'),supabase:{createClient:()=>client},EngbotLibrarySync:require('../static/library-sync.js')};
  vm.runInNewContext(fs.readFileSync('static/supabase-store.js','utf8'),{window,localStorage:storage,sessionStorage:storage,console,structuredClone,URL,URLSearchParams,Headers,Request,fetch});
  return {store:window.LuminaStore,data,writes,setFail:v=>fail=v};
}
test('Store saves only edited chapters and resets synthesis only when narration content changes',async()=>{
  const h=setup();await h.store.signIn('reader@example.test','password');
  let book=(await h.store.getAllBooks())[0];await h.store.saveBook(book);
  assert.equal(h.writes.filter(w=>w.table==='chapters').length,0);
  h.writes.length=0;book=(await h.store.getAllBooks())[0];await h.store.saveBook(book);
  assert.equal(h.writes.length,0);
  book.chapters[0].title='New heading';await h.store.saveBook(book);
  assert.equal(h.data.chapters[0].status,'done');h.writes.length=0;
  book.chapters[0].text='გამარჯობა';await h.store.saveBook(book);
  assert.equal(h.data.chapters[0].status,'pending');
  assert.equal(h.writes.filter(w=>w.table==='chapters').length,1);
});
test('Failed checkpoint remains retryable and shrinking a book removes only obsolete chapters',async()=>{
  const h=setup();await h.store.signIn('reader@example.test','password');
  const book=(await h.store.getAllBooks())[0];book.chapters.push({id:2,title:'Two',text:'Second chapter'});
  h.setFail(true);await assert.rejects(h.store.saveBook(book),/interrupted/);
  h.setFail(false);await h.store.saveBook(book);assert.equal(h.data.chapters.length,2);
  book.chapters.pop();await h.store.saveBook(book);assert.equal(h.data.chapters.length,1);
  assert.equal(h.data.chapters[0].text_content,'Hello world');
});
