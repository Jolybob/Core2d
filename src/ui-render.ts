import { ITEMS, RECIPES } from './game/catalog';
import { appRuntime } from './game/app-runtime';
import { ITEM_IDS, type ItemId, type QuestState, type ToolId } from './game/types';

type HudState = { health: number; hunger: number; stamina: number; money: number; pickaxeLevel: number; tool: ToolId; day: number; weather: string; };
type QuestHudState = QuestState[];

export type UiRenderElements = {
  hotbar: HTMLDivElement;
  inventoryGrid: HTMLDivElement;
  craftGrid: HTMLDivElement;
  questList: HTMLDivElement;
  setText: (selector: string, value: string) => void;
  setBar: (name: string, value: number) => void;
};

const TOOL_BY_SLOT: ToolId[] = ['hoe', 'seeds', 'water', 'axe', 'pick', 'sword', 'rod'];
const FIRST_ROW = ITEM_IDS.slice(0, 7);
const sameHud = (a: HudState, b: HudState) => a.health === b.health && a.hunger === b.hunger && a.stamina === b.stamina && a.money === b.money && a.pickaxeLevel === b.pickaxeLevel && a.tool === b.tool && a.day === b.day && a.weather === b.weather;
const sameInventory = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index]);
const sameQuests = (a: QuestHudState, b: QuestHudState) => a.length === b.length && a.every((quest, index) => { const next = b[index]; return next !== undefined && quest.id === next.id && quest.progress === next.progress && quest.done === next.done; });

function renderHud(state: HudState, elements: UiRenderElements): void {
  elements.setText('[data-value="health"]', `${Math.ceil(state.health)} / 100`); elements.setBar('health', state.health);
  elements.setText('[data-value="hunger"]', `${Math.ceil(state.hunger)} / 100`); elements.setBar('hunger', state.hunger);
  elements.setText('[data-value="stamina"]', `${Math.ceil(state.stamina)} / 100`); elements.setBar('stamina', state.stamina);
  elements.setText('#ui-day', `DAY ${state.day}`); elements.setText('#ui-pickaxe', `Lv.${state.pickaxeLevel}`); elements.setText('#ui-tool', state.tool.toUpperCase()); elements.setText('#ui-money', `$${state.money}`); elements.setText('#ui-weather', state.weather);
}

function renderInventory(counts: number[], elements: UiRenderElements): void {
  const values = Object.fromEntries(ITEM_IDS.map((id, index) => [id, counts[index]])) as Record<ItemId, number>;
  elements.hotbar.innerHTML = FIRST_ROW.map((id, index) => `<button type="button" class="slot" data-item="${id}"><span class="slot-key">${index + 1}</span><span class="slot-icon">${ITEMS[id].icon}</span><span class="slot-name">${ITEMS[id].name}</span><span class="slot-count">${values[id]}</span></button>`).join('');
  elements.inventoryGrid.innerHTML = ITEM_IDS.map((id) => `<button type="button" class="inv-slot filled" data-item="${id}"><span>${ITEMS[id].icon}</span><b>${ITEMS[id].name}</b><em>${values[id]}</em></button>`).join('');
  elements.setText('#inventory-summary', `${counts.filter((count) => count > 0).length} / ${ITEM_IDS.length} item types used`);
}

function renderCrafting(counts: number[], pickaxeLevel: number, elements: UiRenderElements): void {
  const values = Object.fromEntries(ITEM_IDS.map((id, index) => [id, counts[index]])) as Record<ItemId, number>;
  elements.craftGrid.innerHTML = Object.values(RECIPES).map((recipe) => {
    const enough = Object.entries(recipe.costs).every(([id, amount]) => values[id as ItemId] >= (amount ?? 0));
    const built = (recipe.id === 'copperPickaxe' && pickaxeLevel >= 2) || (recipe.id === 'sword' && values.sword > 0) || (recipe.id === 'fishingRod' && values.rod > 0) || (recipe.id === 'healingSalve' && values.salve > 0);
    const locked = recipe.id === 'healingSalve' && pickaxeLevel < 2;
    const costs = Object.entries(recipe.costs).map(([id, amount]) => `${amount} ${ITEMS[id as ItemId].name}`).join(' · ');
    return `<div class="recipe"><div class="recipe-icon">${recipe.id === 'copperPickaxe' ? '⛏' : recipe.id === 'sword' ? '⚔' : recipe.id === 'fishingRod' ? '🎣' : recipe.id === 'healingSalve' ? '✚' : '🔥'}</div><div class="recipe-info"><b>${recipe.name}</b><small>${locked ? 'Requires Copper Pickaxe' : costs}</small></div><button class="recipe-button" type="button" data-recipe="${recipe.id}" ${locked || !enough || built ? 'disabled' : ''}>${locked ? 'LOCKED' : built ? 'BUILT' : 'CRAFT'}</button></div>`;
  }).join('');
}

function renderQuests(quests: QuestHudState, elements: UiRenderElements): void {
  elements.questList.innerHTML = quests.map((quest) => {
    const progress = Math.min(quest.need, Math.max(0, quest.progress));
    const percent = quest.need > 0 ? Math.round((progress / quest.need) * 100) : 100;
    return `<div class="quest-entry${quest.done ? ' quest-done' : ''}"><div class="quest-row"><b>${quest.done ? '✓' : '○'} ${quest.title}</b><span>${progress}/${quest.need}</span></div><div class="quest-progress"><i style="width:${percent}%"></i></div><small>${quest.done ? `Reward claimed: $${quest.reward}` : `Reward: $${quest.reward}`}</small></div>`;
  }).join('');
}

export function connectUiRenderers(elements: UiRenderElements): () => void {
  const unsubscribeHud = appRuntime.store.subscribe((state) => ({ health: state.player.health, hunger: state.player.hunger, stamina: state.player.stamina, money: state.player.money, pickaxeLevel: state.player.pickaxeLevel, tool: state.player.tool, day: state.calendar.day, weather: state.calendar.weather }), (state) => renderHud(state, elements), sameHud);
  const unsubscribeInventory = appRuntime.store.subscribe((state) => ITEM_IDS.map((id) => state.inventory[id]), (counts) => renderInventory(counts, elements), sameInventory);
  const unsubscribeCrafting = appRuntime.store.subscribe((state) => ({ counts: ITEM_IDS.map((id) => state.inventory[id]), pickaxeLevel: state.player.pickaxeLevel }), (selection) => renderCrafting(selection.counts, selection.pickaxeLevel, elements), (a, b) => a.pickaxeLevel === b.pickaxeLevel && sameInventory(a.counts, b.counts));
  const unsubscribeQuests = appRuntime.store.subscribe((state) => state.quests.map((quest) => ({ ...quest })), (quests) => renderQuests(quests, elements), sameQuests);
  return () => { unsubscribeHud(); unsubscribeInventory(); unsubscribeCrafting(); unsubscribeQuests(); };
}

export { TOOL_BY_SLOT };
