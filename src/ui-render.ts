import { ITEMS, RECIPES, TOOLS } from './game/catalog';
import { appRuntime } from './game/app-runtime';
import { HOTBAR_ROWS, HOTBAR_SIZE, INVENTORY_SLOT_COUNT } from './game/systems/InventorySystem';
import { ITEM_IDS, type EquipmentSlot, type ItemId, type QuestState, type ToolId } from './game/types';

type HudState = { health: number; hunger: number; stamina: number; money: number; pickaxeLevel: number; tool: ToolId; day: number; weather: string; };
type InventoryView = ReturnType<typeof appRuntime.inventory.getLayout>;

export type UiRenderElements = {
  hotbar: HTMLDivElement;
  inventoryGrid: HTMLDivElement;
  equipmentGrid: HTMLDivElement;
  craftGrid: HTMLDivElement;
  questList: HTMLDivElement;
  itemInfo: HTMLDivElement;
  setText: (selector: string, value: string) => void;
  setBar: (name: string, value: number) => void;
};

const sameHud = (a: HudState, b: HudState) => a.health === b.health && a.hunger === b.hunger && a.stamina === b.stamina && a.money === b.money && a.pickaxeLevel === b.pickaxeLevel && a.tool === b.tool && a.day === b.day && a.weather === b.weather;
const sameLayout = (a: InventoryView, b: InventoryView) => JSON.stringify(a) === JSON.stringify(b);
const sameQuests = (a: QuestState[], b: QuestState[]) => a.length === b.length && a.every((quest, index) => { const next = b[index]; return next !== undefined && quest.id === next.id && quest.progress === next.progress && quest.done === next.done; });
const equipmentLabels: Array<[EquipmentSlot, string]> = [['helm','HELM'],['chest','CHEST'],['pants','PANTS'],['necklace','NECK'],['ring1','RING'],['ring2','RING'],['offhand','OFF'],['lantern','LANTERN'],['bag','BAG'],['pouch1','POUCH'],['pouch2','POUCH'],['pouch3','POUCH'],['pouch4','POUCH'],['pet','PET']];

function itemMarkup(id: ItemId | null, count: number, locked = false, slot = -1): string {
  if (!id) return `<button class="inv-slot empty${locked ? ' locked' : ''}" data-slot="${slot}" draggable="false">${locked ? '<span class="slot-lock">🔒</span>' : ''}</button>`;
  return `<button class="inv-slot filled${locked ? ' locked' : ''}" data-slot="${slot}" data-item="${id}" draggable="true"><span class="inv-icon">${ITEMS[id].icon}</span><b>${ITEMS[id].name}</b><em>${count}</em>${locked ? '<span class="slot-lock">🔒</span>' : ''}</button>`;
}

function renderHud(state: HudState, elements: UiRenderElements): void {
  elements.setText('[data-value="health"]', `${Math.ceil(state.health)} / 100`); elements.setBar('health', state.health);
  elements.setText('[data-value="hunger"]', `${Math.ceil(state.hunger)} / 100`); elements.setBar('hunger', state.hunger);
  elements.setText('[data-value="stamina"]', `${Math.ceil(state.stamina)} / 100`); elements.setBar('stamina', state.stamina);
  elements.setText('#ui-day', `DAY ${state.day}`); elements.setText('#ui-pickaxe', `Lv.${state.pickaxeLevel}`); elements.setText('#ui-tool', state.tool.toUpperCase()); elements.setText('#ui-money', `$${state.money}`); elements.setText('#ui-weather', state.weather);
}

function renderInventory(layout: InventoryView, counts: Record<ItemId, number>, elements: UiRenderElements): void {
  const row = layout.activeHotbarRow;
  const hotbarStart = row * HOTBAR_SIZE;
  elements.hotbar.innerHTML = Array.from({ length: HOTBAR_SIZE }, (_, index) => itemMarkup(layout.slots[hotbarStart + index] ?? null, counts[layout.slots[hotbarStart + index] as ItemId] ?? 0, layout.locked[hotbarStart + index], hotbarStart + index)).join('');
  elements.inventoryGrid.innerHTML = Array.from({ length: INVENTORY_SLOT_COUNT }, (_, slot) => itemMarkup(layout.slots[slot] ?? null, counts[layout.slots[slot] as ItemId] ?? 0, layout.locked[slot], slot)).join('');
  elements.equipmentGrid.innerHTML = equipmentLabels.map(([slot, label]) => {
    const item = layout.equipment[slot];
    return `<button class="equip-slot" data-equip="${slot}"><span class="equip-label">${label}</span><span class="equip-icon">${item ? ITEMS[item].icon : '·'}</span><small>${item ? ITEMS[item].name : 'EMPTY'}</small></button>`;
  }).join('');
  elements.itemInfo.innerHTML = `<strong>INVENTORY</strong><span>30 slots</span><span>Hotbar row ${row + 1} / ${HOTBAR_ROWS}</span><small>Drag items to rearrange • Right-click locks a slot • Sort with the button</small>`;
}

function renderCrafting(counts: Record<ItemId, number>, pickaxeLevel: number, elements: UiRenderElements): void {
  elements.craftGrid.innerHTML = Object.values(RECIPES).map((recipe) => {
    const enough = Object.entries(recipe.costs).every(([id, amount]) => counts[id as ItemId] >= (amount ?? 0));
    const built = (recipe.id === 'copperPickaxe' && pickaxeLevel >= 2) || (recipe.id === 'sword' && counts.sword > 0) || (recipe.id === 'fishingRod' && counts.rod > 0) || (recipe.id === 'healingSalve' && counts.salve > 0);
    const locked = recipe.id === 'healingSalve' && pickaxeLevel < 2;
    const costs = Object.entries(recipe.costs).map(([id, amount]) => `${amount} ${ITEMS[id as ItemId].name}`).join(' · ');
    return `<div class="recipe"><div class="recipe-icon">${recipe.id === 'copperPickaxe' ? '⛏' : recipe.id === 'sword' ? '⚔' : recipe.id === 'fishingRod' ? '🎣' : recipe.id === 'healingSalve' ? '✚' : '🔥'}</div><div class="recipe-info"><b>${recipe.name}</b><small>${locked ? 'Requires Copper Pickaxe' : costs}</small></div><button class="recipe-button" type="button" data-recipe="${recipe.id}" ${locked || !enough || built ? 'disabled' : ''}>${locked ? 'LOCKED' : built ? 'BUILT' : 'CRAFT'}</button></div>`;
  }).join('');
}

function renderQuests(quests: QuestState[], elements: UiRenderElements): void {
  elements.questList.innerHTML = quests.map((quest) => `<div class="quest-entry${quest.done ? ' quest-done' : ''}"><div class="quest-row"><b>${quest.done ? '✓' : '○'} ${quest.title}</b><span>${quest.progress}/${quest.need}</span></div><div class="quest-progress"><i style="width:${quest.need ? Math.round((quest.progress / quest.need) * 100) : 100}%"></i></div><small>${quest.done ? 'Complete' : `Reward $${quest.reward}`}</small></div>`).join('');
}

export function connectUiRenderers(elements: UiRenderElements): () => void {
  const hud = appRuntime.store.subscribe((state) => ({ health: state.player.health, hunger: state.player.hunger, stamina: state.player.stamina, money: state.player.money, pickaxeLevel: state.player.pickaxeLevel, tool: state.player.tool, day: state.calendar.day, weather: state.calendar.weather }), (state) => renderHud(state, elements), sameHud);
  const inventory = appRuntime.store.subscribe((state) => state.inventory, () => renderInventory(appRuntime.inventory.getLayout(), appRuntime.store.getState().inventory, elements), () => false);
  const layout = appRuntime.store.subscribe((state) => state.inventoryLayout, (next) => renderInventory(next, appRuntime.store.getState().inventory, elements), sameLayout);
  const crafting = appRuntime.store.subscribe((state) => ({ counts: state.inventory, pickaxeLevel: state.player.pickaxeLevel }), (selection) => renderCrafting(selection.counts, selection.pickaxeLevel, elements), (a, b) => a.pickaxeLevel === b.pickaxeLevel && JSON.stringify(a.counts) === JSON.stringify(b.counts));
  const quests = appRuntime.store.subscribe((state) => state.quests.map((quest) => ({ ...quest })), (next) => renderQuests(next, elements), sameQuests);
  void inventory;
  return () => { hud(); layout(); crafting(); quests(); };
}

export { TOOLS };
