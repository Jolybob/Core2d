import './backpack-quickbar.css';

type Item={name:string;icon:string};
type State={inventory?:Record<string,number>};

const ITEMS:Record<string,Item>={wood:{name:'WOOD',icon:'🪵'},ore:{name:'COPPER',icon:'◆'},stone:{name:'STONE',icon:'🪨'},crystal:{name:'CRYSTAL',icon:'✦'},berry:{name:'BERRY',icon:'🍓'},seeds:{name:'SEEDS',icon:'🌱'},parsnip:{name:'PARSNIP',icon:'🥕'},torch:{name:'TORCH',icon:'🔥'},sword:{name:'SWORD',icon:'⚔'},fish:{name:'FISH',icon:'🐟'},coal:{name:'COAL',icon:'●'},rod:{name:'ROD',icon:'🎣'}};

let inventory:Record<string,number>={};
const firstRow=()=>Object.keys(ITEMS).slice(0,7);

const mount=()=>{
  let bar=document.querySelector<HTMLElement>('#backpack-quickbar');
  if(!bar){bar=document.createElement('div');bar.id='backpack-quickbar';bar.className='backpack-quickbar';document.body.appendChild(bar);}
  const html=firstRow().map((id,i)=>{const item=ITEMS[id];const count=inventory[id]??0;return `<button type="button" class="backpack-quick-slot${count>0?' filled':''}" data-item="${id}" title="${item.name}"><span class="slot-key">${i+1}</span><span class="slot-icon">${item.icon}</span><span class="slot-name">${item.name}</span><span class="slot-count">${count}</span></button>`;}).join('');
  if(bar.dataset.rendered!==html){bar.innerHTML=html;bar.dataset.rendered=html;}
};

const openItem=(item:string)=>{if((inventory[item]??0)<=0)return;window.dispatchEvent(new CustomEvent('core2d:inventory'));requestAnimationFrame(()=>document.querySelector<HTMLElement>(`#inventory-grid [data-item="${item}"]`)?.classList.add('quick-access-target'));};
document.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('#backpack-quickbar [data-item]');if(button)openItem(button.dataset.item as string);});
window.addEventListener('core2d:state',e=>{const detail=(e as CustomEvent<State>).detail;if(detail?.inventory)inventory={...inventory,...detail.inventory};mount();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
