type EquipTool='hoe'|'seeds'|'water'|'axe'|'pick'|'sword'|'rod';

const EQUIPMENT:[EquipTool,string,string][]=[
  ['sword','⚔','WEAPON'],['hoe','▱','HOE'],['axe','🪓','AXE'],['pick','⛏','PICKAXE'],['rod','🎣','ROD'],['seeds','🌱','SEEDS'],['water','💧','WATER'],
];
const equipped:Record<EquipTool,boolean>={sword:true,hoe:true,axe:true,pick:true,rod:false,seeds:true,water:true};
const dispatch=(name:string,detail?:unknown)=>window.dispatchEvent(new CustomEvent(name,{detail}));

function render(){document.querySelectorAll<HTMLElement>('[data-equip]').forEach(el=>{const tool=el.dataset.equip as EquipTool;el.classList.toggle('equipped',!!equipped[tool]);el.classList.toggle('unequipped',!equipped[tool]);const i=el.querySelector('i');if(i)i.textContent=equipped[tool]?'EQUIPPED':'UNEQUIPPED';});}
function mount(){
  const layout=document.querySelector<HTMLElement>('#ui-inventory .inventory-layout');
  if(!layout||layout.querySelector('.paper-doll'))return;
  const doll=document.createElement('section');doll.className='paper-doll';
  doll.innerHTML=`<div class="paper-title">EQUIPMENT</div><div class="doll-stage"><div class="doll-shadow"></div><div class="doll-body">🧑‍🌾</div>${EQUIPMENT.slice(0,5).map(([tool,icon,label])=>`<button type="button" class="equip-slot ${tool}" data-equip="${tool}"><span>${icon}</span><b>${label}</b><i></i></button>`).join('')}</div><div class="doll-list">${EQUIPMENT.slice(5).map(([tool,icon,label])=>`<button type="button" class="equip-row" data-equip="${tool}"><span>${icon}</span><b>${label}</b><i></i></button>`).join('')}</div><div class="doll-hint">Click a slot to equip / unequip.<br>Unequipped tools cannot be used.</div>`;
  layout.insertBefore(doll,layout.querySelector('.inventory-side'));
  doll.addEventListener('click',e=>{
    const slot=(e.target as HTMLElement).closest<HTMLElement>('[data-equip]');if(!slot)return;
    const tool=slot.dataset.equip as EquipTool;
    const next=!equipped[tool];
    if(!next&&Object.values(equipped).filter(Boolean).length<=1){dispatch('core2d:message',{text:'Keep at least one tool equipped.'});return;}
    equipped[tool]=next;dispatch('core2d:equip-tool',{tool,equipped:next});render();
    dispatch('core2d:message',{text:`${tool.toUpperCase()} ${next?'equipped':'unequipped'}`});
  });
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.addEventListener('core2d:state',mount);
