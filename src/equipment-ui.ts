type EquipTool='hoe'|'seeds'|'water'|'axe'|'pick'|'sword'|'rod';

const EQUIPMENT:[EquipTool,string,string][]=[
  ['sword','⚔','WEAPON'],
  ['hoe','▱','TOOL'],
  ['axe','🪓','TOOL'],
  ['pick','⛏','TOOL'],
  ['rod','🎣','TOOL'],
  ['seeds','🌱','SEEDS'],
  ['water','💧','WATER'],
];

const dispatch=(name:string,detail?:unknown)=>window.dispatchEvent(new CustomEvent(name,{detail}));

function mount(){
  const layout=document.querySelector<HTMLElement>('#ui-inventory .inventory-layout');
  if(!layout || layout.querySelector('.paper-doll')) return;
  const doll=document.createElement('section');
  doll.className='paper-doll';
  doll.innerHTML=`<div class="paper-title">EQUIPMENT</div><div class="doll-stage"><div class="doll-shadow"></div><div class="doll-body">🧑‍🌾</div><div class="equip-slot weapon" data-equip="sword"><span>⚔</span><b>WEAPON</b></div><div class="equip-slot head" data-equip="pick"><span>⛏</span><b>PICK</b></div><div class="equip-slot left" data-equip="hoe"><span>▱</span><b>HOE</b></div><div class="equip-slot right" data-equip="axe"><span>🪓</span><b>AXE</b></div><div class="equip-slot boots" data-equip="rod"><span>🎣</span><b>ROD</b></div></div><div class="doll-hint">Click a slot to equip<br>that tool to the quick bar.</div>`;
  layout.insertBefore(doll,layout.querySelector('.inventory-side'));
  doll.addEventListener('click',e=>{
    const slot=(e.target as HTMLElement).closest<HTMLElement>('[data-equip]');
    if(!slot) return;
    const tool=slot.dataset.equip as EquipTool;
    const index:Record<EquipTool,number>={sword:0,hoe:1,seeds:2,water:3,axe:4,pick:5,rod:6};
    dispatch('core2d:select',{slot:index[tool]});
    document.querySelectorAll('.equip-slot').forEach(el=>el.classList.toggle('equipped',el===slot));
    window.dispatchEvent(new CustomEvent('core2d:message',{detail:{text:`${tool.toUpperCase()} equipped`}}));
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
window.addEventListener('core2d:state',mount);
