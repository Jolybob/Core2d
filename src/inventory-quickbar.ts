import './inventory-quickbar.css';

const QUICK_SLOTS=[
  {name:'SWORD',icon:'⚔'},
  {name:'HOE',icon:'▱'},
  {name:'SEEDS',icon:'🌱'},
  {name:'WATER',icon:'💧'},
  {name:'AXE',icon:'🪓'},
  {name:'PICKAXE',icon:'⛏'},
  {name:'ROD',icon:'🎣'},
];

const mount=()=>{
  const inventory=document.querySelector<HTMLElement>('#ui-inventory .inventory-card');
  const grid=document.querySelector<HTMLElement>('#inventory-grid');
  if(!inventory||!grid)return;
  let row=inventory.querySelector<HTMLElement>('.inventory-quickbar');
  if(!row){
    row=document.createElement('section');
    row.className='inventory-quickbar';
    row.innerHTML=`<div class="inventory-quickbar-title">QUICK BAR</div><div class="inventory-quickbar-slots"></div>`;
    const title=inventory.querySelector('.menu-head');
    title?.after(row);
  }
  const slots=row.querySelector<HTMLElement>('.inventory-quickbar-slots')!;
  const live=document.querySelectorAll<HTMLElement>('#hotbar .slot');
  slots.innerHTML=QUICK_SLOTS.map((item,i)=>{
    const source=live[i];
    const selected=source?.classList.contains('selected');
    const count=source?.querySelector('.slot-count')?.textContent??'0';
    return `<button type="button" class="inventory-quick-slot${selected?' selected':''}" data-slot="${i}"><span class="slot-key">${i+1}</span><span class="slot-icon">${item.icon}</span><span class="slot-name">${item.name}</span><span class="slot-count">${count}</span></button>`;
  }).join('');
  slots.onclick=(e)=>{
    const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');
    if(!b)return;
    window.dispatchEvent(new CustomEvent('core2d:select',{detail:{slot:Number(b.dataset.slot)}}));
  };
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.addEventListener('core2d:state',mount);
window.addEventListener('core2d:inventory',()=>setTimeout(mount,0));
new MutationObserver(()=>mount()).observe(document.body,{childList:true,subtree:true});
