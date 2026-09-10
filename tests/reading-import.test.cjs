const { test } = require('node:test');
const assert = require('node:assert/strict');
const reading = require('../static/reading-state.js');
const structure = require('../static/book-structure.js');
const fs = require('node:fs'), vm = require('node:vm');
const core = require('../static/engine-core.js');
test('Reading typography preserves real words, footnotes, short blanks and paragraphs', () => {
  const source='A book. I read it [12].\n\nქართული ტექსტი , შემდეგი წინადადება.\n\nName: _____\nvariable_name';
  assert.equal(core.readingText(source),'A book. I read it [12].\n\nქართული ტექსტი, შემდეგი წინადადება.\n\nName: _____\nvariable_name');
  assert.equal(core.readingText('Heading\n______________________________ Text follows.\n______________________________\nბოლო აბზაცი.'),'Heading\n\nText follows.\n\nბოლო აბზაცი.');
});
test('Headings localize by language and old prose-fragment titles become stable numbered sections', () => {
  assert.equal(core.chapterTitle({id:6,title:'foreword against a deadline , knowing that no matter how (part 4)'},'ka'),'განყოფილება 6');
  assert.equal(core.chapterTitle({id:11,title:'dedication. The professional does not fall for this. Her (part 1)'},'ka'),'განყოფილება 11');
  assert.equal(core.chapterTitle({title:'FOREWORD'},'ka'),'წინასიტყვაობა');
  assert.equal(core.chapterTitle({title:'Page 17'},'ka'),'გვერდი 17');
  assert.equal(core.chapterTitle({title:'A new beginning',title_ka:'ახალი დასაწყისი'},'ka'),'ახალი დასაწყისი');
  assert.equal(core.chapterTitle({title:'A new beginning',title_ka:'ახალი დასაწყისი'},'en'),'A new beginning');
  assert.equal(structure.heading('წიგნი არის ძალიან საინტერესო'),false);
});
test('Positions reopen the exact sentence across layouts, and re-anchor after text edits', () => {
  const chapter={id:3,text:'First sentence. Second sentence. Third sentence.'};
  const sentences=['First sentence.','Second sentence.','Third sentence.'];
  const saved=reading.position(chapter,'en',sentences,1,'read');
  assert.equal(reading.resolve(saved,chapter,'en',sentences),1);
  assert.equal(reading.resolve(saved,{...chapter,text:'New. '+chapter.text},'en',['New.',...sentences]),2);
  assert.equal(reading.resolve(saved,chapter,'ka',sentences),0);
  assert.equal(reading.resolve(saved,{id:4,text:chapter.text},'en',sentences),0);
  const stableSource=reading.position({id:3,text:'Heading _________________________ First. Second.'},'en',['Heading _________________________ First.','Second.'],1,'read');
  assert.equal(reading.resolve(stableSource,{id:3,text:'Heading _________________________ First. Second.'},'en',['Heading','First.','Second.']),2);
});
test('Independent bookmarks merge without resurrecting removed entries or overwriting pending newer positions', () => {
  const local={a:{slot:'a',value:{sentence:8},observed_at:'2026-09-10T10:00:00Z',pending:true}};
  const merged=reading.merge(local,[{slot:'a',value:{sentence:1},observed_at:'2026-09-09T10:00:00Z'},{slot:'bookmark:b',value:{deleted:true},observed_at:'2026-09-10T10:00:00Z'}]);
  assert.equal(merged.a.value.sentence,8); assert.equal(merged['bookmark:b'].value.deleted,true);
});
test('Short chapters, cover text, page numbers and paragraphs are retained', () => {
  const pages=[{index:1,text:'A title\nBy An Author'},{index:2,text:'Chapter 1\nOnly one sentence.\n2'},{index:3,text:'Chapter 2\nAnother short section.\n\nLast paragraph.\n3'}];
  const result=structure.structure(pages);
  assert.equal(result.chapters.length,3);
  assert.equal(result.chapters[1].title,'Chapter 1');
  assert.match(result.chapters[2].text,/\n\nLast paragraph/);
  assert.equal(result.chapters.map(c=>c.text).join(' ').replace(/\s/g,''),pages.map(p=>p.text).join('').replace(/\s/g,''));
  assert.equal(result.chapters[2].firstPage,3);
});
test('Page numbers, dotted contents entries and repeated running headers do not create fake chapters', () => {
  assert.equal(structure.heading('7'),false); assert.equal(structure.heading('Chapter 1 ........ 7'),false);
  const pages=[1,2,3].map(index=>({index,text:`Chapter 1\nContinuous body on page ${index}\n${index}`}));
  assert.equal(structure.structure(pages).method,'page');
});
test('Georgian ordinal and Mtavruli headings are detected without changing original text', () => {
  for(const heading of ['თავი პირველი','მეორე თავი','ᲗᲐᲕᲘ 3']) assert.ok(structure.heading(heading));
});
test('PDF outline resolves named destinations and keeps original page ranges', async () => {
  const doc={numPages:5,getOutline:async()=>[{title:'One',dest:'one'},{title:'Two',dest:[{num:2}]}],getDestination:async()=>[0],getPageIndex:async()=>3};
  const outline=await structure.outline(doc);assert.deepEqual(outline.map(x=>x.page),[1,4]);
  const result=structure.structure([1,2,3,4,5].map(index=>({index,text:`Page ${index} body.`})),{outline});
  assert.deepEqual(result.chapters.map(c=>[c.firstPage,c.lastPage]),[[1,3],[4,5]]);
});
test('PDF items are ordered by visual position, including two-column pages', () => {
  const item=(str,x,y,width=55)=>({str,width,transform:[10,0,0,10,x,y]});
  const text=structure.pageLines({items:[item('right3',300,60),item('left2',20,80),item('right1',300,100),item('left1',20,100),item('right2',300,80),item('left3',20,60)]});
  assert.ok(text.indexOf('left3')<text.indexOf('right1'));
  assert.equal(text.replace(/\s/g,''),'left1left2left3right1right2right3');
});
test('Local OCR suffices for clear pages and optional AI cannot truncate the baseline', async () => {
  const src=fs.readFileSync('static/scanner.js','utf8');let network=0;
  const text='This is a clear and complete printed sentence with several words.';
  const ctx={state:{lang:'eng',cancel:false},preprocess:async()=>({blob:{},dataUrl:'fixture'}),ocrLocal:async()=>({text,confidence:98}),scoreText:()=>1,
    canUseNeuralOCR:()=>true,ocrGateway:async()=>{network++;return {text:'short'};},ocrHint:()=>'',qualityWarning:()=>null,
    window:{EngbotCore:{cleanVerbatim:t=>t,detectLanguage:()=> 'en'},EngbotPack:{apply:t=>t}},console};
  vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('  async function scanOnePage('),src.indexOf('  function scoreText(')),ctx);
  const page={};await ctx.scanOnePage(page);assert.equal(page.text,text);assert.equal(network,0);assert.equal(page.status,'done');
});

test('High OCR confidence cannot hide missing lines; a complete alternate layout wins', async () => {
  const src=fs.readFileSync('static/scanner.js','utf8');let ai=0;
  const ctx={state:{lang:'kat',cancel:false},preprocess:async()=>({blob:{},dataUrl:'fixture'}),
    ocrLocal:async(_blob,_lang,mode)=>({text:mode==='6'?'პირველი სტრიქონი.\nმეორე სტრიქონი.\nმესამე სტრიქონი.':'პირველი სტრიქონი.',confidence:98}),scoreText:()=>1,
    canUseNeuralOCR:()=>true,ocrGateway:async()=>{ai++;},ocrHint:()=>'',qualityWarning:()=>null,
    window:{EngbotCore:{cleanVerbatim:t=>t,detectLanguage:()=> 'ka'},EngbotPack:{apply:t=>t}},console};
  vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('  async function scanOnePage('),src.indexOf('  function scoreText(')),ctx);
  const page={_textLineCount:3};await ctx.scanOnePage(page);
  assert.equal(page.text.split('\n').length,3);assert.equal(page.engine,'offline+text-block');assert.equal(ai,0);
});

test('A same-book realtime refresh while choosing a listening position does not cancel resume', async () => {
  const src=fs.readFileSync('static/app.js','utf8');const begin=src.indexOf('async function playChapterAudio('),end=src.indexOf('    const chap = currentBook.chapters.find',begin);
  const chapter={id:1,text:'First. Second.'};
  const ctx={currentBook:{id:'book',user_id:'owner',chapters:[chapter]},getCurrentUserId:()=> 'owner',isPlaying:false,currentLang:'en',
    prepareChapterSentences:()=>['First.','Second.'],window:{EngbotReading:reading}};
  ctx.window.EngbotReadingUI={choose:async()=>{ctx.currentBook={...ctx.currentBook};return reading.position(chapter,'en',['First.','Second.'],1,'read');}};
  vm.createContext(ctx);vm.runInContext(src.slice(begin,end)+'return startSentenceIdx; }',ctx);
  assert.equal(await ctx.playChapterAudio(1),1);
});

test('Local saved places reject another account and deletion removes pending data', () => {
  const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  let owner='one';const store=reading.create({storage,user:()=>owner,client:()=>null});
  const book={id:'a',user_id:'one'};
  store.save(book,'position:en',{sentence:4});store.forget('a');assert.equal(values.size,0);
  owner='two';assert.throws(()=>store.entries(book),/another account/);
});

test('Stopping synchronized audio preserves its sentence after reader repagination', () => {
  const ctx={EngbotReading:{create:()=>({})},localStorage:{},getCurrentUserId:()=> 'owner',
    window:{addEventListener:()=>{}},document:{getElementById:()=>null,addEventListener:()=>{}},
    readerActive:true,isPlaying:true,isUserManuallyNavigating:false,readerMode:'pages',readerBook:{id:'book'},currentBook:{id:'book'},
    readerChapterId:1,currentPlayingChapterId:1,currentSentenceIndex:14,readerCurrentPage:2,readerPages:[[],[{globalIndex:7}]]};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('static/reading-ui.js','utf8'),ctx);
  ctx.window.EngbotReadingUI.followAudio();ctx.isPlaying=false;ctx.currentSentenceIndex=0;
  assert.equal(ctx.window.EngbotReadingUI.readIndex(),14);
  ctx.readerCurrentPage=3;ctx.readerPages.push([{globalIndex:19}]);
  assert.equal(ctx.window.EngbotReadingUI.readIndex(),19);
});
test('Scroll restore keeps the exact sentence when a previous sentence shares its first line', () => {
  const chapter={id:1,text:'First. Second.'};
  const scroller={scrollTop:90,getBoundingClientRect:()=>({top:0}),querySelectorAll:()=>[{id:'rsentence_0',getBoundingClientRect:()=>({bottom:30})}]};
  const ctx={EngbotReading:{...reading,create:()=>({})},localStorage:{},getCurrentUserId:()=>null,
    window:{addEventListener:()=>{}},document:{getElementById:()=>null,addEventListener:()=>{}},DOM:{readerScrollContainer:scroller},
    readerActive:true,isPlaying:false,isUserManuallyNavigating:false,readerMode:'scroll',readerBook:{id:'book',chapters:[chapter]},
    readerChapterId:1,readerLang:'en',readerSentenceToPageMap:{0:0,1:0},readerCurrentPage:1,
    renderCurrentPage:()=>{},prepareChapterSentences:()=>['First.','Second.']};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('static/reading-ui.js','utf8'),ctx);
  ctx.window.EngbotReadingUI.restore(reading.position(chapter,'en',['First.','Second.'],1,'read'));
  assert.equal(ctx.window.EngbotReadingUI.readIndex(),1);
  scroller.scrollTop=150;assert.equal(ctx.window.EngbotReadingUI.readIndex(),1);
  ctx.window.EngbotReadingUI.releaseScrollAnchor();assert.equal(ctx.window.EngbotReadingUI.readIndex(),0);
});
