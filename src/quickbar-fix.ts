import './quickbar-fix.css';

const QUICK_SLOTS = [
  {name:'SWORD', icon:'⚔'},
  {name:'HOE', icon:'▱'},
  {name:'SEEDS', icon:'🌱'},
  {name:'WATER', icon:'💧'},
  {name:'AXE', icon:'🪓'},
  {name:'PICKAXE', icon:'⛏'},
  {name:'ROD', icon:'🎣'},
];

const patchQuickbar = () => {
  document.querySelectorAll<HTMLElement>('#hotbar .slot').forEach((slot, index) => {
    const item = QUICK_SLOTS[index];
    if (!item) return;
    const icon = slot.querySelector<HTMLElement>('.slot-icon');
    const name = slot.querySelector<HTMLElement>('.slot-name');
    if (icon && icon.textContent !== item.icon) icon.textContent = item.icon;
    if (name && name.textContent !== item.name) name.textContent = item.name;
  });
};

const hotbar = document.querySelector('#hotbar');
if (hotbar) {
  patchQuickbar();
  new MutationObserver(patchQuickbar).observe(hotbar, {childList:true, subtree:true});
}

// Quick-bar slots are the only tool/action controls during gameplay.
// Keep the existing keyboard and click event system, but remove the redundant tool dock.
document.querySelector('.ui-action-dock')?.remove();
