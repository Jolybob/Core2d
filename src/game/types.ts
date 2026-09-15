export const TOOL_IDS = ['hoe', 'seeds', 'water', 'axe', 'pick', 'sword', 'rod'] as const;
export type ToolId = typeof TOOL_IDS[number];

export const ITEM_IDS = ['wood', 'stone', 'ore', 'crystal', 'berry', 'parsnip', 'seeds', 'torch', 'sword', 'fish', 'coal', 'rod'] as const;
export type ItemId = typeof ITEM_IDS[number];

export const RECIPE_IDS = ['copperPickaxe', 'sword', 'torch', 'healingSalve', 'fishingRod'] as const;
export type RecipeId = typeof RECIPE_IDS[number];

export type InventoryState = Record<ItemId, number>;

export interface CropState {
  stage: number;
  watered: boolean;
  tilled: boolean;
}

export interface QuestState {
  id: string;
  title: string;
  need: number;
  progress: number;
  reward: number;
  done: boolean;
}

export interface CalendarState {
  day: number;
  clock: number;
  season: number;
  weather: 'Sunny' | 'Rainy' | 'Cloudy';
}

export interface PlayerState {
  x: number;
  y: number;
  health: number;
  stamina: number;
  hunger: number;
  money: number;
  pickaxeLevel: number;
  tool: ToolId;
}

export interface WorldState {
  seed: number;
  crops: Record<string, CropState>;
  removedResources: Record<string, 'tree' | 'rock'>;
}

export interface EconomyState {
  fishCaught: number;
  shipped: number;
  totalHarvests: number;
}

export interface GameState {
  player: PlayerState;
  inventory: InventoryState;
  quests: QuestState[];
  calendar: CalendarState;
  economy: EconomyState;
  world: WorldState;
}

export interface SaveData {
  schemaVersion: 3;
  state: GameState;
}
