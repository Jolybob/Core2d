import type { ItemId, RecipeId, ToolId } from './types';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  icon: string;
}

export const ITEMS: Record<ItemId, ItemDefinition> = {
  wood: { id: 'wood', name: 'Wood', icon: '🪵' },
  stone: { id: 'stone', name: 'Stone', icon: '◆' },
  ore: { id: 'ore', name: 'Ore', icon: '◈' },
  crystal: { id: 'crystal', name: 'Crystal', icon: '✦' },
  berry: { id: 'berry', name: 'Berry', icon: '●' },
  parsnip: { id: 'parsnip', name: 'Parsnip', icon: '🥕' },
  seeds: { id: 'seeds', name: 'Seeds', icon: '✿' },
  torch: { id: 'torch', name: 'Torch', icon: '♨' },
  sword: { id: 'sword', name: 'Sword', icon: '⚔' },
  fish: { id: 'fish', name: 'Fish', icon: '🐟' },
  coal: { id: 'coal', name: 'Coal', icon: '●' },
  rod: { id: 'rod', name: 'Fishing Rod', icon: '🎣' },
  salve: { id: 'salve', name: 'Healing Salve', icon: '✚' },
};

export interface RecipeDefinition {
  id: RecipeId;
  name: string;
  costs: Partial<Record<ItemId, number>>;
}

export const RECIPES: Record<RecipeId, RecipeDefinition> = {
  copperPickaxe: { id: 'copperPickaxe', name: 'Copper Pickaxe', costs: { wood: 8, ore: 4 } },
  sword: { id: 'sword', name: 'Copper Sword', costs: { wood: 4, ore: 6 } },
  torch: { id: 'torch', name: 'Torch', costs: { wood: 2, coal: 1 } },
  healingSalve: { id: 'healingSalve', name: 'Healing Salve', costs: { berry: 2, crystal: 1 } },
  fishingRod: { id: 'fishingRod', name: 'Fishing Rod', costs: { wood: 6, stone: 2 } },
};

export const TOOLS: Record<ToolId, { id: ToolId; name: string; icon: string }> = {
  hoe: { id: 'hoe', name: 'Hoe', icon: '▱' },
  seeds: { id: 'seeds', name: 'Seeds', icon: '✿' },
  water: { id: 'water', name: 'Water', icon: '💧' },
  axe: { id: 'axe', name: 'Axe', icon: '🪓' },
  pick: { id: 'pick', name: 'Pickaxe', icon: '⛏' },
  sword: { id: 'sword', name: 'Sword', icon: '⚔' },
  rod: { id: 'rod', name: 'Rod', icon: '🎣' },
};
