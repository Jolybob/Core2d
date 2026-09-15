import './backpack-quickbar.css';

type InventoryCell={id:string;icon:string;name:string;count:string};

const readFirstRow=():InventoryCell[]=>{
  const grid=document.querySelector<HTMLElement>('#inventory-grid');
  if(!grid)return [];
  return Array.from(grid.children).slice(0,7).map((cell)=>{
    const button=cell.querySelector<HTMLButtonElement>('[data-item]');
    if(!button)return {id:'',icon:'',name:'',count:''};
    return {
      id:button.dataset.item??'',
      icon:button.querySelector('span')?.textContent??'',
      name:button.querySelector('b')?.textContent??'',
      count:button.querySelector('em')?.textContent??'0',
    };
  });
};

const mount=()=>{
  let bar=document.querySelector<HTMLElement>('#backpack-quickbar');
  if(!bar){bar=document.createElement('div');bar.id='backpack-quickbar';bar.className='backpack-quickbar';document.body.appendChild(bar);}
  const row=readFirstRow();
  const html=Array.from({length:7},(_,i)=>{
    const cell=row[i]??{id:'',icon:'',name:'',count:''};
    return cell.id
      ? `<button type="button" class="backpack-quick-slot filled" data-item="${cell.id}" title="${cell.name}"><span class="slot-key">${i+1}</span><span class="slot-icon">${cell.icon}</span><span class="slot-name">${cell.name}</span><span class="slot-count">${cell.count}</span></button>`
      : `<div class="backpack-quick-slot empty" aria-hidden="true"><span class="slot-key">${i+1}</span></div>`;
  }).join('');
  if(bar.dataset.rendered!==html){bar.innerHTML=html;bar.dataset.rendered=html;}
};

const refresh=()=>requestAnimationFrame(mount);

document.addEventListener('click',e=>{
  const button=(e.target as HTMLElement).closest<HTMLButtonElement>('#backpack-quickbar [data-item]');
  if(!button)return;
  window.dispatchEvent(new CustomEvent('core2d:inventory'));
  requestAnimationFrame(()=>document.querySelector<HTMLElement>(`#inventory-grid [data-item="${button.dataset.item}"]`)?.classList.add('quick-access-target'));
});
window.addEventListener('core2d:state',refresh);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
