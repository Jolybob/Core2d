import './ui.css';
import { VERSION } from './version';
import { appRuntime } from './game/app-runtime';
import { ITEM_IDS, type ItemId } from './game/types';
import { HOTBAR_ROWS, HOTBAR_SIZE } from './game/systems/InventorySystem';
import { connectUiRenderers } from './ui-render';

const root = document.createElement('div');
root.id = 'core-ui';
root.innerHTML = `
<header class="hud-top">
  <button class="core-button" id="ui-core-button" type="button">CORE2D <span>v${VERSION}</span></button>
  <section class="status-strip">
    <div class="hud-stat"><b>HEALTH</b><strong data-value="health">100 / 100</strong><i><em data-fill="health"></em></i></div>
    <div class="hud-stat"><b>HUNGER</b><strong data-value="hunger">100 / 100</strong><i><em data-fill="hunger"></em></i></div>
    <div class="hud-stat"><b>STAMINA</b><strong data-value="stamina">100 / 100</strong><i><em data-fill="stamina"></em></i></div>
  </section>
  <section class="world-status"><span id="ui-day">DAY 1</span><span id="ui-weather">Sunny</span><span id="ui-money">$120</span></section>
</header>
<div class="hud-message" id="ui-message">A quiet morning beneath the surface.</div>
<aside class="quest-panel"><div class="panel-kicker">JOURNAL</div><h3>Quests</h3><div id="quest-list"></div></aside>
<div class="hud-bottom">
  <button class="hotbar-page" id="hotbar-prev" type="button" aria-label="Previous hotbar row">‹</button>
  <div class="hotbar" id="hotbar"></div>
  <button class="hotbar-page" id="hotbar-next" type="button" aria-label="Next hotbar row">›</button>
</div>
<nav class="hud-actions">
  <button class="hud-action" id="ui-inventory-button" type="button">INVENTORY <kbd>I</kbd></button>
  <button class="hud-action" id="ui-craft-button" type="button">CRAFT <kbd>C</kbd></button>
  <button class="hud-action" id="ui-help-button" type="button">MENU <kbd>?</kbd></button>
</nav>
<section class="overlay" id="ui-inventory" aria-hidden="true">
  <div class="inventory-window" role="dialog" aria-label="Inventory">
    <div class="window-head"><div><span class="panel-kicker">ADVENTURER</span><h2>Inventory</h2><p>30 slots • 10-slot hotbar • 14 equipment slots</p></div><button class="window-close" id="ui-inventory-close" type="button">×</button></div>
    <div class="inventory-layout">
      <aside class="character-sheet"><h3>CHARACTER</h3><div class="character-figure">◈</div><div class="equipment-grid" id="equipment-grid"></div></aside>
      <main class="bag-panel">
        <div class="bag-toolbar"><div><b>BACKPACK</b><span id="bag-row-label">HOTBAR ROW 1 / 3</span></div><div class="bag-buttons"><button id="inventory-sort" type="button">SORT</button><button id="inventory-quick-stack" type="button">QUICK STACK</button></div></div>
        <div class="inventory-grid" id="inventory-grid"></div>
        <div class="inventory-help">Drag to move • Right-click locks a slot • Click an item for details</div>
      </main>
      <aside class="item-panel" id="item-info"><strong>SELECT AN ITEM</strong><span>Item details appear here.</span><small>Gear and equipment slots mirror the Core Keeper-style character layout.</small></aside>
    </div>
    <div class="window-foot"><span id="ui-pickaxe">PICKAXE Lv.1</span><span id="ui-tool">TOOL HOE</span><span>ESC closes</span></div>
  </div>
</section>
<section class="overlay" id="ui-crafting" aria-hidden="true">
  <div class="craft-window"><div class="window-head"><div><span class="panel-kicker">WORKBENCH</span><h2>Crafting</h2><p>Tools, weapons and supplies.</p></div><button class="window-close" id="ui-craft-close" type="button">×</button></div><div class="craft-grid" id="craft-grid"></div></div>
</section>
<section class="overlay" id="ui-help" aria-hidden="true">
  <div class="menu-window"><div class="window-head"><div><span class="panel-kicker">SYSTEM</span><h2>Core2D</h2><p>Controls and save management.</p></div><button class="window-close" id="ui-help-close" type="button">×</button></div><div class="menu-actions"><button id="menu-inventory" type="button">Open Inventory</button><button id="menu-craft" type="button">Open Crafting</button><button id="menu-save" type="button">Save Game</button><button id="menu-load" type="button">Load Game</button><button id="menu-close" type="button">Back to Game</button></div><div class="controls-list"><div><b>Move</b><span>W A S D / Arrows</span></div><div><b>Use</b><span>E / Left Mouse</span></div><div><b>Hotbar</b><span>1–0 / mouse row controls</span></div><div><b>Inventory</b><span>I / ESC</span></div></div></div>
</section>`;
document.body.appendChild(root);

const hotbar = document.querySelector<HTMLDivElement>('#hotbar')!;
const inventoryGrid = document.querySelector<HTMLDivElement>('#inventory-grid')!;
const equipmentGrid = document.querySelector<HTMLDivElement>('#equipment-grid')!;
const craftGrid = document.querySelector<HTMLDivElement>('#craft-grid')!;
const questList = document.querySelector<HTMLDivElement>('#quest-list')!;
const itemInfo = document.querySelector<HTMLDivElement>('#item-info')!;
const inventory = document.querySelector<HTMLDivElement>('#ui-inventory')!;
const crafting = document.querySelector<HTMLDivElement>('#ui-crafting')!;
const help = document.querySelector<HTMLDivElement>('#ui-help')!;
const message = document.querySelector<HTMLDivElement>('#ui-message')!;

const show = (el: HTMLElement) => { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); };
const hide = (el: HTMLElement) => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); };
const closeMenus = () => { hide(inventory); hide(crafting); hide(help); };

hotbar.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');
  if (!button) return;
  const slot = Number(button.dataset.slot);
  const id = appRuntime.inventory.selectItem(slot);
  if (id) appRuntime.dispatch({ type: 'SELECT_TOOL', tool: (id === 'sword' ? 'sword' : id === 'rod' ? 'rod' : id as never) });
});

inventoryGrid.addEventListener('dragstart', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');
  if (!button || !event.dataTransfer) return;
  event.dataTransfer.setData('text/core2d-slot', button.dataset.slot ?? '');
  event.dataTransfer.effectAllowed = 'move';
});
inventoryGrid.addEventListener('dragover', (event) => { if ((event.target as HTMLElement).closest('[data-slot]')) event.preventDefault(); });
inventoryGrid.addEventListener('drop', (event) => {
  event.preventDefault();
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');
  const sourceValue = event.dataTransfer?.getData('text/core2d-slot');
  if (!target || sourceValue === '') return;
  appRuntime.dispatch({ type: 'INVENTORY_MOVE', source: Number(sourceValue), target: Number(target.dataset.slot) });
});
inventoryGrid.addEventListener('contextmenu', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');
  if (!button) return;
  event.preventDefault();
  appRuntime.dispatch({ type: 'INVENTORY_LOCK', slot: Number(button.dataset.slot) });
});
inventoryGrid.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot]');
  if (!button) return;
  const id = appRuntime.inventory.selectItem(Number(button.dataset.slot));
  if (!id) return;
  const count = appRuntime.store.getState().inventory[id] ?? 0;
  itemInfo.innerHTML = `<span class="item-large-icon">${document.createTextNode('').textContent ?? ''}${(awaitableItemIcon(id))}</span><strong>${id.toUpperCase()}</strong><span>Owned: ${count}</span><small>Drag this stack to another slot. Right-click locks it from sorting and movement.</small>`;
});

function awaitableItemIcon(id: ItemId): string { const icons: Partial<Record<ItemId, string>> = { wood:'🪵', stone:'◆', ore:'◈', crystal:'✦', berry:'●', parsnip:'🥕', seeds:'✿', torch:'♨', sword:'⚔', fish:'🐟', coal:'●', rod:'🎣', salve:'✚' }; return icons[id] ?? '·'; }

(document.querySelector('#inventory-sort') as HTMLButtonElement).addEventListener('click', () => appRuntime.dispatch({ type: 'INVENTORY_SORT' }));
(document.querySelector('#inventory-quick-stack') as HTMLButtonElement).addEventListener('click', () => { message.textContent = appRuntime.dispatch({ type: 'INVENTORY_QUICK_STACK' }) ? 'Nearby chest stacked.' : 'No nearby chest.'; });
(document.querySelector('#hotbar-prev') as HTMLButtonElement).addEventListener('click', () => {
  const current = appRuntime.inventory.getLayout().activeHotbarRow;
  appRuntime.dispatch({ type: 'INVENTORY_HOTBAR_ROW', row: (current + HOTBAR_ROWS - 1) % HOTBAR_ROWS });
});
(document.querySelector('#hotbar-next') as HTMLButtonElement).addEventListener('click', () => {
  const current = appRuntime.inventory.getLayout().activeHotbarRow;
  appRuntime.dispatch({ type: 'INVENTORY_HOTBAR_ROW', row: (current + 1) % HOTBAR_ROWS });
});

(document.querySelector('#ui-core-button') as HTMLButtonElement).addEventListener('click', () => show(help));
(document.querySelector('#ui-inventory-button') as HTMLButtonElement).addEventListener('click', () => show(inventory));
(document.querySelector('#ui-inventory-close') as HTMLButtonElement).addEventListener('click', () => hide(inventory));
(document.querySelector('#ui-craft-button') as HTMLButtonElement).addEventListener('click', () => show(crafting));
(document.querySelector('#ui-craft-close') as HTMLButtonElement).addEventListener('click', () => hide(crafting));
(document.querySelector('#ui-help-button') as HTMLButtonElement).addEventListener('click', () => show(help));
(document.querySelector('#ui-help-close') as HTMLButtonElement).addEventListener('click', () => hide(help));
(document.querySelector('#menu-inventory') as HTMLButtonElement).addEventListener('click', () => { hide(help); show(inventory); });
(document.querySelector('#menu-craft') as HTMLButtonElement).addEventListener('click', () => { hide(help); show(crafting); });
(document.querySelector('#menu-save') as HTMLButtonElement).addEventListener('click', () => { message.textContent = appRuntime.dispatch({ type: 'SAVE' }) ? 'Game saved.' : 'Save failed.'; });
(document.querySelector('#menu-load') as HTMLButtonElement).addEventListener('click', () => { message.textContent = appRuntime.dispatch({ type: 'LOAD' }) ? 'Game loaded.' : 'No compatible save found.'; });
(document.querySelector('#menu-close') as HTMLButtonElement).addEventListener('click', closeMenus);
[inventory, crafting, help].forEach((el) => el.addEventListener('click', (event) => { if (event.target === el) hide(el); }));
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenus(); if (event.key.toLowerCase() === 'i') show(inventory); if (event.key.toLowerCase() === 'c') show(crafting); });

connectUiRenderers({ hotbar, inventoryGrid, equipmentGrid, craftGrid, questList, itemInfo, setText: (selector, value) => { const el = document.querySelector<HTMLElement>(selector); if (el) el.textContent = value; }, setBar: (name, value) => { const el = document.querySelector<HTMLElement>(`[data-fill="${name}"]`); if (el) el.style.width = `${Math.max(0, Math.min(100, value))}%`; } });
