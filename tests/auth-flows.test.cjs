const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('static/supabase-store.js', 'utf8');
function storage(seed = {}) { const map = new Map(Object.entries(seed)); return { get length() { return map.size; }, key: i => [...map.keys()][i], getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; }
function setup(url = 'https://devsura3939.github.io/oudio-books-AI/', overrides = {}, pending = {}) {
  const calls = [];
  const user = { id:'user-1', email:'reader@example.test' };
  const auth = Object.fromEntries(['signUp','signInWithPassword','resetPasswordForEmail','resend','setSession','exchangeCodeForSession','verifyOtp','getUser','updateUser'].map(method => [method, async (...args) => { calls.push([method,...args]); return overrides[method] ? overrides[method](...args) : {data:{user,session:{user}},error:null}; }]));
  const window = { location:new URL(url), history:{replaceState:(_,__,path) => {window.location = new URL(path, window.location);}}, supabase:{createClient:() => ({auth, rpc:()=> {throw new Error('Account lookup must not block recovery');}})} };
  const sessionStorage = storage(pending);
  vm.runInNewContext(source, {window,localStorage:storage(),sessionStorage,URL,URLSearchParams,console,Headers,Request,fetch});
  return {store:window.LuminaStore,calls,window,sessionStorage,user};
}
test('signup waits for confirmation without activating the unconfirmed user',async()=>{
 const {store,calls}=setup(undefined,{signUp:()=>({data:{user:{id:'unconfirmed'},session:null}})});
 const res=await store.signUp(' reader@example.test ','  exact password  ');
 assert.equal(res.success,true); assert.equal(res.session,null); assert.equal(store.isReady(),false);
 assert.equal(calls[0][1].password,'  exact password  ');
 assert.equal(calls[0][1].options.emailRedirectTo,'https://devsura3939.github.io/oudio-books-AI/');
});
test('recovery sends directly and retains recovery intent and Pages subpath',async()=>{
 const {store,calls}=setup('https://devsura3939.github.io/oudio-books-AI/?verify=old#forgot');
 assert.equal((await store.resetPassword(' reader@example.test ')).success,true);
 assert.equal(calls.length,1); assert.equal(calls[0][0],'resetPasswordForEmail');
 assert.equal(calls[0][2].redirectTo,'https://devsura3939.github.io/oudio-books-AI/?type=recovery');
});
test('email delivery failures are surfaced',async()=>{
 const {store}=setup(undefined,{resetPasswordForEmail:()=>({error:{message:'SMTP unavailable'}})});
 assert.equal((await store.resetPassword('reader@example.test')).error.message,'SMTP unavailable');
});
test('confirmation resend strips stale link parameters',async()=>{
 const {store,calls}=setup('https://devsura3939.github.io/oudio-books-AI/?code=old#error=expired');
 await store.resendConfirmation('reader@example.test');
 assert.equal(calls[0][1].options.emailRedirectTo,'https://devsura3939.github.io/oudio-books-AI/');
});
test('implicit confirmation consumes the link once and removes its credentials',async()=>{
 const {store,calls,window}=setup('https://devsura3939.github.io/oudio-books-AI/#access_token=secret&refresh_token=refresh&type=signup');
 const [a,b]=await Promise.all([store.handleRecoverySession(),store.handleRecoverySession()]);
 assert.equal(a.success,true); assert.equal(b.type,'signup'); assert.equal(calls.length,1); assert.equal(window.location.hash,'');
 assert.equal((await store.updatePassword('test')).success,false);
});
test('valid recovery allows password update but rejects a changed session',async()=>{
 const {store,calls,sessionStorage}=setup('https://devsura3939.github.io/oudio-books-AI/#access_token=secret&refresh_token=refresh&type=recovery');
 assert.equal((await store.handleRecoverySession()).type,'recovery');
 assert.equal(sessionStorage.getItem('engbot_recovery_user'),'user-1');
 assert.equal((await store.updatePassword(' new password ')).success,true);
 assert.equal(calls.find(c=>c[0]==='updateUser')[1].password,' new password ');
 store.clearAuthCallback(); assert.equal((await store.updatePassword('again')).success,false);
});
test('expired link never falls back to an unrelated existing session',async()=>{
 const {store,calls}=setup('https://devsura3939.github.io/oudio-books-AI/?type=recovery#access_token=old&refresh_token=old',{setSession:()=>({error:{message:'Expired link'}})});
 assert.equal((await store.handleRecoverySession()).success,false);
 assert.equal(calls.some(c=>c[0]==='getUser'),false);
 assert.equal((await store.updatePassword('test')).success,false);
});
test('recovery refresh requires a matching verified pending user',async()=>{
 const a=setup('https://devsura3939.github.io/oudio-books-AI/?type=recovery',{}, {'engbot_recovery_user':'user-1'});
 assert.equal((await a.store.handleRecoverySession()).success,true);
 const b=setup('https://devsura3939.github.io/oudio-books-AI/?type=recovery',{}, {'engbot_recovery_user':'another-user'});
 assert.equal((await b.store.handleRecoverySession()).success,false);
 const c=setup('https://devsura3939.github.io/oudio-books-AI/?type=recovery');
 assert.equal((await c.store.handleRecoverySession()).success,false);
});
test('PKCE and token-hash callbacks preserve recovery mode',async()=>{
 for (const [query,method] of [['?code=once&type=recovery','exchangeCodeForSession'],['?token_hash=once&type=recovery','verifyOtp']]) {
 const {store,calls,window}=setup('https://devsura3939.github.io/oudio-books-AI/'+query);
 assert.equal((await store.handleRecoverySession()).success,true);assert.equal(calls[0][0],method);assert.equal(window.location.search,'?type=recovery');
 }
});
test('error links show a retryable error without touching sessions',async()=>{
 const {store,calls}=setup('https://devsura3939.github.io/oudio-books-AI/#error=access_denied&error_code=otp_expired');
 assert.match((await store.handleRecoverySession()).error.message,/expired/); assert.equal(calls.length,0);
});
test('password login sends exactly what the user entered with no owner fallback',async()=>{
 const {store,calls}=setup();await store.signIn('ananiadevsurashvili@gmail.com',''); assert.equal(calls[0][1].password,'');
 await store.signIn('reader@example.test',' password ');assert.equal(calls[1][1].password,' password ');
});
const appSource = fs.readFileSync('static/app.js','utf8');
function appFunction(name) { const start=appSource.indexOf('function '+name+'('); const end=appSource.indexOf('\nfunction ',start+1); const asyncEnd=appSource.indexOf('\nasync function ',start+1); return appSource.slice(start,Math.min(...[end,asyncEnd].filter(n=>n>=0))); }
test('registration with no session shows confirmation instructions and never signs in',async()=>{
 const messages=[];let logins=0;
 const context={window:{LuminaStore:{signUp:async()=>({success:true,session:null})}},document:{getElementById:()=>null},setAuthError:m=>messages.push(m),setAuthSuccess:m=>messages.push(m),login:async()=>logins++,setTimeout:()=>0,Promise};
 vm.createContext(context);vm.runInContext('async '+appFunction('register'),context);
 await context.register('reader@example.test','password',false);
 assert.equal(logins,0);assert.match(messages.at(-1),/confirm your account/);
});
test('ordinary and unverified users cannot see build details',()=>{
 const build={hidden:false};
 const context={currentUser:{id:'u',email:'reader@example.test',role:'admin'},verifiedAuthUserId:'u',document:{querySelectorAll:()=>[build],getElementById:()=>null},DOM:{}};
 vm.createContext(context);vm.runInContext(appFunction('updateAuthUI'),context);context.updateAuthUI();assert.equal(build.hidden,true);
 context.currentUser={id:'owner',email:'ananiadevsurashvili@gmail.com'};context.updateAuthUI();assert.equal(build.hidden,true);
 context.verifiedAuthUserId='owner';context.updateAuthUI();assert.equal(build.hidden,false);
 context.currentUser=null;context.updateAuthUI();assert.equal(build.hidden,true);
});
test('login markup contains no admin autofill or public build badge',()=>{
 const html=fs.readFileSync('index.html','utf8');const gate=html.slice(html.indexOf('<div id="authGateScreen"'),html.indexOf('<!-- ════════════════ App Main Container'));
 assert.doesNotMatch(html,/fillAdminCredentials|Quick-fill Admin/);
 assert.doesNotMatch(gate,/v\d+\.\d+\.\d+/);
 assert.doesNotMatch(appSource+source,/anania39/);
});
test('auth initialization cannot erase the completed email-link result',()=>{
 const gate={classList:{remove:()=>{}}},app={classList:{add:()=>{}}};
 const context={authCallbackResult:'error',document:{getElementById:id=>id==='authGateScreen'?gate:app},localStorage:{getItem:()=>{throw new Error('Callback result must be retained before session restoration');}}};
 vm.createContext(context);vm.runInContext(appFunction('updateAuthGateVisibility'),context);
 context.updateAuthGateVisibility();
 assert.equal(context.authCallbackResult,'error');
});
