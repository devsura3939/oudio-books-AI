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
            const tokenClean=String(token||'').trim();
            let isLlm=false;
            let healthy=false;
            try{
                const response=await fetchImpl(endpoint+'/health',{headers:{...(tokenClean?{Authorization:'Bearer '+tokenClean}:{})},signal:AbortSignal.timeout(6000)});
                if(response.ok){
                    const data=await response.json();
                    if(data&&data.ready===false&&data.error)throw Error(data.error);
                    healthy=true;
                }
            }catch(err){
                if(err&&err.message&&!/fetch|connect|failed|timeout|abort|network/i.test(err.message))throw err;
            }
            if(!healthy){
                try{
                    const base=endpoint.replace(/\/+$/,'');
                    const modelsUrl=base.endsWith('/v1')?base+'/models':base+'/v1/models';
                    const probe=await fetchImpl(modelsUrl,{headers:{...(tokenClean?{Authorization:'Bearer '+tokenClean}:{})},signal:AbortSignal.timeout(6000)});
                    if(probe.ok){
                        const mData=await probe.json();
                        if(Array.isArray(mData?.data)||Array.isArray(mData?.models)){
                            healthy=true;
                            isLlm=true;
                        }
                    }
                }catch(_){}
            }
            if(!healthy){
                throw Error('Cannot connect. Check the server address, ensure CORS is enabled, or verify connection token.');
            }
            if(key()!==account)throw Error('Account changed. Connect again from your current account.');
            storage.setItem(account,JSON.stringify({url:endpoint,token:tokenClean,type:isLlm?'llm':'argos'}));
            status(isLlm?'Connected local LLM. Free translation ready without API credits.':'Connected. Local neural translation can run without API credits.');
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
                status('Local model is translating…');
                let translatedText=null;
                if(saved.type==='llm'){
                    const base=normalizeEndpoint(saved.url);
                    const chatUrl=base.endsWith('/v1')?base+'/chat/completions':base+'/v1/chat/completions';
                    const prompt=`Translate the following text from English into natural, literary Georgian. Output ONLY the translated text with preserved formatting.\n\n${text}`;
                    const res=await fetchImpl(chatUrl,{
                        method:'POST',
                        headers:{'Content-Type':'application/json',...(saved.token?{Authorization:'Bearer '+saved.token}:{})},
                        body:JSON.stringify({
                            messages:[{role:'user',content:prompt}],
                            temperature:0.1,
                            max_tokens:Math.min(8192,Math.max(1024,text.length*3))
                        }),
                        signal
                    });
                    if(!res.ok)throw Error('Local model busy (HTTP '+res.status+'); trying another translation engine.');
                    const resData=await res.json();
                    translatedText=resData.choices?.[0]?.message?.content?.trim()||null;
                }else{
                    const response=await fetchImpl(normalizeEndpoint(saved.url)+'/translate',{method:'POST',headers:{'Content-Type':'application/json',...(saved.token?{Authorization:'Bearer '+saved.token}:{})},body:JSON.stringify({text,source_lang:sourceLang,target_lang:targetLang}),signal});
                    if(!response.ok)throw Error(response.status===429?'Local model busy; trying another translation engine.':'Local model unavailable; trying another translation engine.');
                    const data=await response.json();
                    translatedText=data.success===true&&typeof data.translated==='string'?data.translated:null;
                }
                signal.throwIfAborted();
                if(key()!==account)return null;
                status('Local translation complete.');
                return translatedText;
            }catch(error){parent?.throwIfAborted();status(error.message);return null;}
            finally{if(controller===own)controller=null;}
        }
        return {connect,enable,disable,stop,fillSettings,translate,enabled:()=>Boolean(settings())};
    }
    return {create,normalizeEndpoint};
});
