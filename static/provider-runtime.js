(function(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    if(root)root.EngbotProviders=api;
})(typeof window!=='undefined'?window:null,function(){
    let lastFailure=null;
    function messageFor(provider,status,code){
        const why=code==='timeout'?'request timed out. Retry this segment.'
            :code==='network'?'could not be reached. Check your connection or browser access.'
            :status===401?'rejected the API key. Check the saved key.'
            :status===402?'requires available credits.'
            :status===413?'cannot accept this request within its token budget. Use a provider with a larger limit.'
            :status===403?'denied access. Check the key permissions and model access.'
            :status===429?'reached its quota or rate limit. Retry after the provider limit resets.'
            :status===404?'could not find the selected model or endpoint.'
            :status===400||status===422?'rejected the request or model settings.'
            :status>=500?'is temporarily unavailable. Retry this segment.'
            :code==='incomplete'?'returned incomplete output. Retry this segment.'
            :'returned an invalid response. Retry this segment.';
        return `${provider} ${why}`;
    }
    function emit(event){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('engbot-provider-status',{detail:event}));}
    function fail(provider,code,status=0){
        lastFailure={provider,code,status,message:messageFor(provider,status,code)};
        emit({phase:'failed',...lastFailure});return lastFailure;
    }
    async function request(url,init={},meta={}){
        const hostname=new URL(url,typeof location!=='undefined'?location.href:'http://localhost').hostname;
        const provider=meta.provider||({'generativelanguage.googleapis.com':'Gemini','api.groq.com':'Groq','openrouter.ai':'OpenRouter','api.elevenlabs.io':'ElevenLabs','api.mistral.ai':'Mistral'}[hostname]||'AI provider');
        const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),meta.timeoutMs||45000);
        const signal=init.signal?AbortSignal.any([init.signal,ctrl.signal]):ctrl.signal;
        emit({phase:'requesting',provider});
        try{
            const response=await (meta.fetchImpl||fetch)(url,{...init,signal});
            // Keep the deadline active until the payload is received, including audio.
            const body=await response.arrayBuffer();
            if(!response.ok)fail(provider,'http',response.status);
            else {lastFailure=null;emit({phase:'responded',provider});}
            return new Response([204,205,304].includes(response.status)?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});
        }catch(error){
            fail(provider,ctrl.signal.aborted||['AbortError','TimeoutError'].includes(error.name)?'timeout':'network');
            throw error;
        }finally{clearTimeout(timer);}
    }
    function createSpeechBuffer(synthesize,limit=6){
        const entries=new Map();
        return {
            get(key,payload){
                if(entries.has(key))return entries.get(key).promise;
                const controller=new AbortController();
                const entry={controller};
                entry.promise=Promise.resolve().then(()=>{controller.signal.throwIfAborted();return synthesize(payload,controller.signal);}).then(blob=>{controller.signal.throwIfAborted();return blob;}).catch(error=>{if(entries.get(key)===entry)entries.delete(key);throw error;});
                entries.set(key,entry);
                while(entries.size>limit){const oldest=entries.keys().next().value;entries.get(oldest).controller.abort();entries.delete(oldest);}
                return entry.promise;
            },
            clear(){for(const entry of entries.values())entry.controller.abort();entries.clear();},
            get size(){return entries.size;}
        };
    }
    return {request,fail,messageFor,createSpeechBuffer,getFailure:()=>lastFailure,reset:()=>{lastFailure=null;}};
});
