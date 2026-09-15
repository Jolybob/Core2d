import './backpack-quickbar.css';

type Item={name:string;icon:string};

const ITEM_ORDER=['wood','ore','stone','crystal','berry','seeds','parsnip'];
const ITEMS:Record<string,Item>={
  wood:{name:'WOOD',icon:'🪵'},ore:{name:'COPPER',icon:'◆'},stone:{name:'STONE',icon:'🪨'},crystal:{name:'CRYSTAL',icon:'✦'},berry:{name:'BERRY',icon:'🍓'},seeds:{name:'SEEDS',icon:'🌱'},parsnip:{name:'PARSNIP',icon:'🥕'},
};

const mount=()=>{
  const bottom=document.querySelector<HTMLElement>('.ui-bottom');
  if(!bottom)return;
  let bar=document.querySelector<HTMLElement>('#backpack-quickbar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='backpack-quickbar';
    bar.className='backpack-quickbar';
    bottom.prepend(bar);
  }
  const state=(window as typeof window & {core2dState?:{inventory?:Record<string,number>}}).core2dState;
  const inventory=state?.inventory??{};
  const hotbar=document.querySelectorAll<HTMLElement>('#hotbar .slot');
  const html=ITEM_ORDER.map((id,i)=>{
    const item=ITEMS[id];
    const count=inventory[id]??0;
    const selected=hotbar[i]?.classList.contains('selected');
    return `<button type="button" class="backpack-quick-slot${selected?' selected':''}" data-item="${id}" title="${item.name}"><span class="slot-key">${i+1}</span><span class="slot-icon">${item.icon}</span><span class="slot-count">${count}</span></button>`;
  }).join('');
  if(bar.dataset.rendered!==html){bar.innerHTML=html;bar.dataset.rendered=html;}
};

window.addEventListener('core2d:state',e=>{
  const detail=(e as CustomEvent<{inventory?:Record<string,number>}>).detail;
  (window as typeof window & {core2dState?:unknown}).core2dState=detail;
  mount();
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();

window.addEventListener('core2d:inventory',()=>setTimeout(mount,0));
