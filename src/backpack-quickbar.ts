import './backpack-quickbar.css';

const getGrid=()=>document.querySelector<HTMLElement>('#inventory-grid');

const mount=()=>{
  const grid=getGrid();
  if(!grid)return;
  let bar=document.querySelector<HTMLElement>('#backpack-quickbar');
  if(!bar){bar=document.createElement('div');bar.id='backpack-quickbar';bar.className='backpack-quickbar';document.body.appendChild(bar);}

  // The quickbar is literally a visual copy of inventory cells 1–7.
  // Clone the real inventory DOM so icons, names, quantities and empty slots
  // can never drift into a separate item list.
  const cells=Array.from(grid.children).slice(0,7);
  if(cells.length<7)return;
  const fragment=document.createDocumentFragment();
  cells.forEach((cell,index)=>{
    const clone=cell.cloneNode(true) as HTMLElement;
    clone.classList.add('backpack-quick-slot');
    clone.dataset.quickIndex=String(index);
    const button=clone.matches('button')?clone:clone.querySelector<HTMLButtonElement>('button');
    if(button){
      button.removeAttribute('data-item');
      button.dataset.quickItem=button.closest<HTMLElement>('[data-item]')?.dataset.item??'';
      button.removeAttribute('data-slot');
      button.classList.add('backpack-quick-cell');
    }
    fragment.appendChild(clone);
  });
  const signature=cells.map(cell=>cell.outerHTML).join('');
  if(bar.dataset.source!==signature){bar.replaceChildren(fragment);bar.dataset.source=signature;}
};

const refresh=()=>requestAnimationFrame(mount);

document.addEventListener('click',e=>{
  const target=e.target as HTMLElement;
  const cell=target.closest<HTMLElement>('#backpack-quickbar .backpack-quick-slot');
  if(!cell)return;
  const sourceIndex=Number(cell.dataset.quickIndex);
  const grid=getGrid();
  const source=grid?.children[sourceIndex] as HTMLElement|undefined;
  const item=source?.querySelector<HTMLElement>('[data-item]')?.dataset.item;
  if(item)window.dispatchEvent(new CustomEvent('core2d:inventory'));
});

window.addEventListener('core2d:state',refresh);

const start=()=>{
  mount();
  const grid=getGrid();
  if(grid)new MutationObserver(refresh).observe(grid,{childList:true,subtree:true});
  setTimeout(mount,100);
  setTimeout(mount,500);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
