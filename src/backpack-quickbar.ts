import './backpack-quickbar.css';

type Item='wood'|'ore'|'stone'|'crystal'|'berry'|'seeds'|'parsnip';
type State={inventory?:Partial<Record<Item,number>>};

const ITEM_ORDER:Item[]=['wood','ore','stone','crystal','berry','seeds','parsnip'];
const ITEMS:Record<Item,{name:string;icon:string}>={
  wood:{name:'WOOD',icon:'🪵'},ore:{name:'COPPER',icon:'◆'},stone:{name:'STONE',icon:'🪨'},crystal:{name:'CRYSTAL',icon:'✦'},berry:{name:'BERRY',icon:'🍓'},seeds:{name:'SEEDS',icon:'🌱'},parsnip:{name:'PARSNIP',icon:'🥕'}
};

let inventory:Partial<Record<Item,number>>={};

const mount=()=>{
  let bar=document.querySelector<HTMLElement>('#backpack-quickbar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='backpack-quickbar';
    bar.className='backpack-quickbar';
    document.body.appendChild(bar);
  }
  const html=ITEM_ORDER.map((id,i)=>{
    const item=ITEMS[id];
    const count=inventory[id]??0;
    return `<button type="button" class="backpack-quick-slot${count>0?' filled':''}" data-item="${id}" title="${item.name}"><span class="slot-key">${i+1}</span><span class="slot-icon">${item.icon}</span><span class="slot-name">${item.name}</span><span class="slot-count">${count}</span></button>`;
  }).join('');
  if(bar.dataset.rendered!==html){bar.innerHTML=html;bar.dataset.rendered=html;}
};

const openItem=(item:Item)=>{
  if((inventory[item]??0)<=0)return;
  window.dispatchEvent(new CustomEvent('core2d:inventory'));
  requestAnimationFrame(()=>{
    const target=document.querySelector<HTMLElement>(`#inventory-grid [data-item="${item}"]`);
    target?.classList.add('quick-access-target');
    target?.scrollIntoView({block:'nearest'});
  });
};

document.addEventListener('click',e=>{
  const button=(e.target as HTMLElement).closest<HTMLButtonElement>('#backpack-quickbar [data-item]');
  if(button)openItem(button.dataset.item as Item);
});

window.addEventListener('core2d:state',e=>{
  const detail=(e as CustomEvent<State>).detail;
  if(detail?.inventory)inventory={...inventory,...detail.inventory};
  mount();
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
