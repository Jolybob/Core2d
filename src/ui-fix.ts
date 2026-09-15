import './ui.css';
import { VERSION } from './version';
import { ITEMS, RECIPES } from './game/catalog';
import { appRuntime } from './game/app-runtime';
import { ITEM_IDS, type ItemId, type RecipeId, type ToolId } from './game/types';

const root = document.createElement('div');
root.id = 'core-ui';
root.innerHTML = `<header class="ui-top"><div class="ui-brand"><span class="brand-title">CORE2D</span><span class="brand-version">v${VERSION}</span></div><div class="ui-stats"><div class="stat health"><span>HEALTH</span><strong data-value="health">100 / 100</strong><div class="bar"><i data-fill="health"></i></div></div><div class="stat hunger"><span>HUNGER</span><strong data-value="hunger">100 / 100</strong><div class="bar"><i data-fill="hunger"></i></div></div><div class="stat stamina"><span>STAMINA</span><strong data-value="stamina">100 / 100</strong><div class="bar"><i data-fill="stamina"></i></div></div></div></header><div class="ui-message" id="ui-message">A quiet morning beneath the surface.</div><aside class="ui-journal"><div class="journal-tab" id="ui-day">DAY 1</div><h3>Journal</h3><div class="journal-note">One state. One command path. One world.</div><h4>TO-DO</h4><div class="todo">○ Till, plant and water crops</div><div class="todo">○ Fish at the pond</div><div class="todo">○ Gather wood and copper</div><div class="todo">○ Complete village quests</div><div class="journal-divider"></div><div class="small-stat">PICKAXE <b id="ui-pickaxe">Lv.1</b></div><div class="small-stat">TOOL <b id="ui-tool">HOE</b></div><div class="small-stat">MONEY <b id="ui-money">$120</b></div><div class="small-stat">WEATHER <b id="ui-weather">Sunny</b></div></aside><div class="ui-bottom"><div class="hotbar-wrap"><div class="hotbar-label">BACKPACK — FIRST ROW</div><div class="hotbar" id="hotbar"></div></div><div class="controls"><span>WASD / ARROWS</span> Move &nbsp; <span>LMB</span> Use &nbsp; <span>1-7</span> Tools &nbsp; <span>I</span> Backpack &nbsp; <span>C</span> Craft</div></div><nav class="ui-nav"><button class="ui-button" id="ui-inventory-button">BACKPACK <kbd>I</kbd></button><button class="ui-button" id="ui-craft-button">CRAFT <kbd>C</kbd></button><button class="ui-button" id="ui-help-button">MENU <kbd>?</kbd></button></nav><div class="ui-inventory" id="ui-inventory" aria-hidden="true"><div class="menu-card inventory-card"><div class="menu-ribbon">BACKPACK</div><div class="menu-head"><div><h2>Inventory</h2><p id="inventory-summary">0 / 13 item types used</p></div><button type="button" class="menu-close" id="ui-inventory-close">×</button></div><div class="inventory-layout"><section class="paper-panel"><div class="paper-title">ADVENTURER'S SATCHEL</div><div class="inventory-grid" id="inventory-grid"></div></section><aside class="inventory-side"><div class="portrait">🧑‍🌾</div><b>EXPLORER</b><span>Local Farmer</span><hr><small>The quickbar is the first inventory row.</small><button type="button" id="inventory-done">DONE</button></aside></div><div class="menu-footer">I / ESC closes the backpack • P saves</div></div></div><div class="ui-crafting" id="ui-crafting" aria-hidden="true"><div class="menu-card"><div class="menu-ribbon">WORKBENCH</div><div class="menu-head"><div><h2>Crafting</h2><p>Tools, weapons and supplies.</p></div><button type="button" class="menu-close" id="ui-craft-close">×</button></div><div class="craft-grid" id="craft-grid"></div><div class="menu-footer">Materials are consumed immediately.</div></div></div><div class="ui-help" id="ui-help" aria-hidden="true"><div class="menu-card small"><div class="menu-ribbon">SYSTEM</div><div class="menu-head"><div><h2>Core2D</h2><p>v${VERSION} architecture completion.</p></div><button type="button" class="menu-close" id="ui-help-close">×</button></div><div class="menu-actions"><button id="menu-inventory">Open Backpack</button><button id="menu-craft">Open Crafting</button><button id="menu-save">Save Game</button><button id="menu-load">Load Game</button><button id="menu-close">Back to game</button></div><div class="help-list"><div><b>Move</b><span>W A S D / Arrows</span></div><div><b>Farm</b><span>1-3 tools, E interact</span></div><div><b>Tools</b><span>4 Axe · 5 Pick · 6 Sword · 7 Rod</span></div><div><b>Village</b><span>B buy seeds · L ship</span></div></div></div></div>`;
document.body.appendChild(root);

const hotbar = document.querySelector<HTMLDivElement>('#hotbar')!;
const inventoryGrid = document.querySelector<HTMLDivElement>('#inventory-grid')!;
const craftGrid = document.querySelector<HTMLDivElement>('#craft-grid')!;
const inventory = document.querySelector<HTMLDivElement>('#ui-inventory')!;
const crafting = document.querySelector<HTMLDivElement>('#ui-crafting')!;
const help = document.querySelector<HTMLDivElement>('#ui-help')!;
const message = document.querySelector<HTMLDivElement>('#ui-message')!;
const TOOL_BY_SLOT: ToolId[] = ['hoe', 'seeds', 'water', 'axe', 'pick', 'sword', 'rod'];
const FIRST_ROW = ITEM_IDS.slice(0, 7);

type HudState = {
  health: number;
  hunger: number;
  stamina: number;
  money: number;
  pickaxeLevel: number;
  tool: ToolId;
  day: number;
  weather: string;
};

const show = (el: HTMLElement) => { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); };
const hide = (el: HTMLElement) => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); };
const closeMenus = () => { hide(inventory); hide(crafting); hide(help); };
const setText = (selector: string, value: string) => { const el = document.querySelector<HTMLElement>(selector); if (el) el.textContent = value; };
const setBar = (name: string, value: number) => { const el = document.querySelector<HTMLElement>(`[data-fill="${name}"]`); if (el) el.style.width = `${Math.max(0, Math.min(100, value))}%`; };
const sameHud = (a: HudState, b: HudState) => a.health === b.health && a.hunger === b.hunger && a.stamina === b.stamina && a.money === b.money && a.pickaxeLevel === b.pickaxeLevel && a.tool === b.tool && a.day === b.day && a.weather === b.weather;
const sameInventory = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index]);

function renderHud(state: HudState): void {
  setText('[data-value="health"]', `${Math.ceil(state.health)} / 100`); setBar('health', state.health);
  setText('[data-value="hunger"]', `${Math.ceil(state.hunger)} / 100`); setBar('hunger', state.hunger);
  setText('[data-value="stamina"]', `${Math.ceil(state.stamina)} / 100`); setBar('stamina', state.stamina);
  setText('#ui-day', `DAY ${state.day}`); setText('#ui-pickaxe', `Lv.${state.pickaxeLevel}`); setText('#ui-tool', state.tool.toUpperCase()); setText('#ui-money', `$${state.money}`); setText('#ui-weather', state.weather);
}

function renderInventory(counts: number[]): void {
  const values = Object.fromEntries(ITEM_IDS.map((id, index) => [id, counts[index]])) as Record<ItemId, number>;
  hotbar.innerHTML = FIRST_ROW.map((id, index) => `<button type="button" class="slot" data-item="${id}"><span class="slot-key">${index + 1}</span><span class="slot-icon">${ITEMS[id].icon}</span><span class="slot-name">${ITEMS[id].name}</span><span class="slot-count">${values[id]}</span></button>`).join('');
  inventoryGrid.innerHTML = ITEM_IDS.map((id) => `<button type="button" class="inv-slot filled" data-item="${id}"><span>${ITEMS[id].icon}</span><b>${ITEMS[id].name}</b><em>${values[id]}</em></button>`).join('');
  setText('#inventory-summary', `${counts.filter((count) => count > 0).length} / ${ITEM_IDS.length} item types used`);
}

function renderCrafting(counts: number[], pickaxeLevel: number): void {
  const values = Object.fromEntries(ITEM_IDS.map((id, index) => [id, counts[index]])) as Record<ItemId, number>;
  craftGrid.innerHTML = Object.values(RECIPES).map((recipe) => {
    const enough = Object.entries(recipe.costs).every(([id, amount]) => values[id as ItemId] >= (amount ?? 0));
    const built = (recipe.id === 'copperPickaxe' && pickaxeLevel >= 2) || (recipe.id === 'sword' && values.sword > 0) || (recipe.id === 'fishingRod' && values.rod > 0) || (recipe.id === 'healingSalve' && values.salve > 0);
    const locked = recipe.id === 'healingSalve' && pickaxeLevel < 2;
    const costs = Object.entries(recipe.costs).map(([id, amount]) => `${amount} ${ITEMS[id as ItemId].name}`).join(' · ');
    return `<div class="recipe"><div class="recipe-icon">${recipe.id === 'copperPickaxe' ? '⛏' : recipe.id === 'sword' ? '⚔' : recipe.id === 'fishingRod' ? '🎣' : recipe.id === 'healingSalve' ? '✚' : '🔥'}</div><div class="recipe-info"><b>${recipe.name}</b><small>${locked ? 'Requires Copper Pickaxe' : costs}</small></div><button class="recipe-button" type="button" data-recipe="${recipe.id}" ${locked || !enough || built ? 'disabled' : ''}>${locked ? 'LOCKED' : built ? 'BUILT' : 'CRAFT'}</button></div>`;
  }).join('');
}

function useItem(id: ItemId): void {
  if (id === 'berry' || id === 'fish' || id === 'parsnip') { appRuntime.dispatch({ type: 'EAT', item: id }); return; }
  if (id === 'salve') { appRuntime.dispatch({ type: 'USE_SALVE' }); return; }
  if (id === 'sword' || id === 'rod' || TOOL_BY_SLOT.includes(id as ToolId)) appRuntime.dispatch({ type: 'SELECT_TOOL', tool: id as ToolId });
}

hotbar.addEventListener('click', (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-item]'); if (button) useItem(button.dataset.item as ItemId); });
inventoryGrid.addEventListener('click', (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-item]'); if (button) useItem(button.dataset.item as ItemId); });
craftGrid.addEventListener('click', (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-recipe]'); if (button && !button.disabled) appRuntime.dispatch({ type: 'CRAFT', recipe: button.dataset.recipe as RecipeId }); });
document.querySelector('#ui-inventory-button')!.addEventListener('click', () => show(inventory));
document.querySelector('#ui-inventory-close')!.addEventListener('click', () => hide(inventory));
document.querySelector('#inventory-done')!.addEventListener('click', () => hide(inventory));
document.querySelector('#ui-craft-button')!.addEventListener('click', () => show(crafting));
document.querySelector('#ui-craft-close')!.addEventListener('click', () => hide(crafting));
document.querySelector('#ui-help-button')!.addEventListener('click', () => show(help));
document.querySelector('#ui-help-close')!.addEventListener('click', () => hide(help));
document.querySelector('#menu-inventory')!.addEventListener('click', () => { hide(help); show(inventory); });
document.querySelector('#menu-craft')!.addEventListener('click', () => { hide(help); show(crafting); });
document.querySelector('#menu-save')!.addEventListener('click', () => { message.textContent = appRuntime.dispatch({ type: 'SAVE' }) ? 'Game saved.' : 'Save failed.'; });
document.querySelector('#menu-load')!.addEventListener('click', () => { message.textContent = appRuntime.dispatch({ type: 'LOAD' }) ? 'Game loaded.' : 'No compatible save found.'; });
document.querySelector('#menu-close')!.addEventListener('click', closeMenus);
[inventory, crafting, help].forEach((el) => el.addEventListener('click', (event) => { if (event.target === el) hide(el); }));
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenus(); if (event.key.toLowerCase() === 'i') show(inventory); if (event.key.toLowerCase() === 'c') show(crafting); });

appRuntime.store.subscribe(
  (state) => ({ health: state.player.health, hunger: state.player.hunger, stamina: state.player.stamina, money: state.player.money, pickaxeLevel: state.player.pickaxeLevel, tool: state.player.tool, day: state.calendar.day, weather: state.calendar.weather }),
  renderHud,
  sameHud,
);

appRuntime.store.subscribe(
  (state) => ITEM_IDS.map((id) => state.inventory[id]),
  renderInventory,
  sameInventory,
);

appRuntime.store.subscribe(
  (state) => ({ counts: ITEM_IDS.map((id) => state.inventory[id]), pickaxeLevel: state.player.pickaxeLevel }),
  (selection) => renderCrafting(selection.counts, selection.pickaxeLevel),
  (a, b) => a.pickaxeLevel === b.pickaxeLevel && sameInventory(a.counts, b.counts),
);
