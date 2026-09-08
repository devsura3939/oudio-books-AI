(function(root,factory) {
    const api=factory();
    if(typeof module==='object'&&module.exports) module.exports=api;
    else root.EngbotUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
    function createLibraryCache(getOwner, load, ttl=10000) {
        let saved=null, pending=null, generation=0;
        return {
            invalidate(){saved=null;pending=null;generation++;},
            async read(){
                const owner=getOwner(), revision=generation;
                if(saved?.owner===owner&&Date.now()-saved.at<ttl) return saved.books;
                if(pending?.owner===owner) return pending.promise;
                const promise=Promise.resolve().then(load).then(books=>{
                    if(getOwner()!==owner) return [];
                    if(generation===revision) saved={owner,books,at:Date.now()};
                    return books;
                }).finally(()=>{if(pending?.promise===promise) pending=null;});
                pending={owner,promise};
                return promise;
            }
        };
    }
    function displayTitle(title) {
        return String(title||'Untitled book').replace(/\*{2}/g,'').replace(/_/g,' ')
            .replace(/^Final\s+/i,'').replace(/\s+Final(?=\s*(?:\(|$))/i,'').replace(/\b\d+x\d+\b/gi,'').replace(/\s+/g,' ').trim() || 'Untitled book';
    }
    function nextPaint(){return new Promise(resolve=>{
        if(typeof requestAnimationFrame==='function'&&document.visibilityState==='visible') requestAnimationFrame(()=>setTimeout(resolve,0));
        else setTimeout(resolve,0);
    });}
    const pendingActions=new Map();
    function run(key,label,operation,button){
        if(pendingActions.has(key)) return pendingActions.get(key);
        const status=document.getElementById('studioActionStatus');
        if(status){status.hidden=false;status.textContent=label;}
        const wasDisabled=button?.disabled;
        if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
        const promise=nextPaint().then(operation).finally(()=>{
            pendingActions.delete(key);
            if(button){button.disabled=wasDisabled;button.removeAttribute('aria-busy');}
            if(status&&!pendingActions.size) status.hidden=true;
        });
        pendingActions.set(key,promise);
        return promise;
    }
    function install(){
        const drawer=document.getElementById('mobileNavDrawer');
        if(drawer) drawer.inert=!drawer.classList.contains('active');
        document.addEventListener('keydown',event=>{
            if(event.key==='Escape'&&drawer?.classList.contains('active')){
                window.closeMobileNav();
                document.querySelector('[aria-label="Open menu"]')?.focus();
            }
        });
        const actions={handleFileUpload:'Importing your book…',exportCurrentBookPDF:'Preparing your PDF…',startWholeBookTranslation:'Translating your book…'};
        Object.entries(actions).forEach(([name,label])=>{
            const original=window[name]; if(typeof original!=='function') return;
            window[name]=function(...args){
                const button=document.activeElement?.closest('button');
                return run(name,label,()=>original.apply(this,args),button).catch(error=>{
                    if(typeof window.showToast==='function') window.showToast(error.message||'Please try again.','error');
                    else console.error(error);
                });
            };
        });
        let timer;
        ['searchInput','mobileShelfSearch'].forEach(id=>document.getElementById(id)?.addEventListener('input',event=>{
            clearTimeout(timer);
            const query=event.target.value;
            ['searchInput','mobileShelfSearch'].forEach(other=>{const field=document.getElementById(other);if(field&&field!==event.target) field.value=query;});
            timer=setTimeout(()=>window.renderDigitalShelf(query),100);
        }));
        document.querySelectorAll('[data-shelf-language]').forEach(button=>button.addEventListener('click',()=>{
            document.querySelectorAll('[data-shelf-language]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
            window.renderDigitalShelf(document.getElementById('searchInput')?.value||document.getElementById('mobileShelfSearch')?.value||'');
        }));
    }
    if(typeof window!=='undefined') window.addEventListener('DOMContentLoaded',install);
    return {createLibraryCache,displayTitle,nextPaint,run};
});
