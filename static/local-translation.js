(function(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(root)root.EngbotLocalTranslation=api.create({storage:root.localStorage,fetchImpl:root.fetch.bind(root),owner:()=>typeof root.getCurrentUserId==='function'?root.getCurrentUserId():null,document:root.document});
})(typeof window==='undefined'?null:window,function(){
    'use strict';
    function normalizeEndpoint(value){
        const url=new URL(String(value).trim());
        const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
        if(url.username||url.password||url.search||url.hash||(!loopback&&url.protocol!=='https:')||!['http:','https:'].includes(url.protocol))throw Error('Use HTTPS for a server, or HTTP for localhost.');
        return url.href.replace(/\/$/,'');
    }
    function create({storage,fetchImpl,owner,document}){
        let controller=null;
        const key=()=>{const id=owner();return id?'engbot_neural_server:'+id:null;};
        function settings(){try{return JSON.parse(storage.getItem(key())||'null');}catch{return null;}}
        function status(message){const el=document?.getElementById('localTranslationStatus');if(el)el.textContent=message;}
        function fillSettings(){const saved=settings();for(const [id,value]of [['localTranslationEndpoint',saved?.url||'http://127.0.0.1:8766'],['localTranslationToken',saved?.token||'']]){const el=document?.getElementById(id);if(el)el.value=value;}status(saved?'Connected server saved for this account on this device.':'Optional: connect your running translation server.');}
        async function connect(url,token){
            const account=key();if(!account)throw Error('Sign in before connecting a translation server.');
            const endpoint=normalizeEndpoint(url);
            if(!String(token||'').trim())throw Error('Enter the connection token printed by your server.');
            const response=await fetchImpl(endpoint+'/health',{headers:{Authorization:'Bearer '+token.trim()},signal:AbortSignal.timeout(10000)});
            if(!response.ok)throw Error('Cannot connect. Check the server address and connection token.');
            const data=await response.json();
            if(!data.ready||!['en','ka'].every(l=>data.languages?.includes(l)))throw Error('Install the English–Georgian model on the server first.');
            if(key()!==account)throw Error('Account changed. Connect again from your current account.');
            storage.setItem(account,JSON.stringify({url:endpoint,token:token.trim()}));
            status('Connected. Local neural translation can run without API credits.');
        }
        async function enable(){const button=document?.getElementById('enableLocalTranslation');if(button)button.disabled=true;status('Checking translation server…');try{await connect(document.getElementById('localTranslationEndpoint').value,document.getElementById('localTranslationToken').value);}catch(error){status(error.message);}finally{if(button)button.disabled=false;}}
        function stop(){controller?.abort();controller=null;}
        function disable(){stop();const account=key();if(account)storage.removeItem(account);fillSettings();status('Translation server disconnected.');}
        async function translate(text,sourceLang,targetLang,parent){
            const saved=settings(),account=key();if(!saved || sourceLang!=='en' || targetLang!=='ka')return null;
            parent?.throwIfAborted();
            if(controller)return null;
            const own=new AbortController();controller=own;
            const signal=AbortSignal.any([own.signal,AbortSignal.timeout(180000),...(parent?[parent]:[])]);
            try{
                status('Local neural model is translating…');
                const response=await fetchImpl(normalizeEndpoint(saved.url)+'/translate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+saved.token},body:JSON.stringify({text,source_lang:sourceLang,target_lang:targetLang}),signal});
                if(!response.ok)throw Error(response.status===429?'Local model busy; trying another translation engine.':'Local model unavailable; trying another translation engine.');
                const data=await response.json();signal.throwIfAborted();
                if(key()!==account)return null;
                status('Local neural translation complete.');
                return data.success===true&&typeof data.translated==='string'?data.translated:null;
            }catch(error){parent?.throwIfAborted();status(error.message);return null;}
            finally{if(controller===own)controller=null;}
        }
        return {connect,enable,disable,stop,fillSettings,translate,enabled:()=>Boolean(settings())};
    }
    return {create,normalizeEndpoint};
});
