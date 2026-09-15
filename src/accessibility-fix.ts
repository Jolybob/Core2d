const preventHiddenFocusedContent=()=>{
  document.querySelectorAll<HTMLElement>('[aria-hidden="true"]').forEach(el=>{
    const active=document.activeElement;
    if(active instanceof HTMLElement && el.contains(active))active.blur();
  });
};

const observer=new MutationObserver(mutations=>{
  for(const mutation of mutations){
    if(mutation.type==='attributes'&&mutation.attributeName==='aria-hidden')preventHiddenFocusedContent();
  }
});

const start=()=>{
  document.querySelectorAll<HTMLElement>('[aria-hidden]').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['aria-hidden']}));
  preventHiddenFocusedContent();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
