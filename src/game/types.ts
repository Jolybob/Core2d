import type { EntityRegistryState } from './entity';
import type { ChunkPersistence } from './world/chunks';
import type { WorldSaveData } from './world/world-save';

export const TOOL_IDS = ['hoe', 'seeds', 'water', 'axe', 'pick', 'sword', 'rod'] as const;
export type ToolId = typeof TOOL_IDS[number];

export const ITEM_IDS = ['wood', 'stone', 'ore', 'crystal', 'berry', 'parsnip', 'seeds', 'torch', 'sword', 'fish', 'coal', 'rod', 'salve'] as const;
export type ItemId = typeof ITEM_IDS[number];
export type ConsumableId = Extract<ItemId, 'berry' | 'fish' | 'parsnip'>;

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

/**
 * Runtime world state. Generated terrain is not stored here: it is reconstructed from
 * seed + generatorVersion and overlaid with persistent chunk modifications.
 */
export interface WorldState extends WorldSaveData {
  // Kept as named fields through v5 so existing gameplay systems remain source-compatible.
  crops: Record<string, CropState>;
  removedResources: Record<string, 'tree' | 'rock'>;
  entities: EntityRegistryState;
  chunks: Record<string, ChunkPersistence>;
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

/** v5 separates durable world ownership from player-owned runtime data. */
export interface PlayerSaveData {
  player: PlayerState;
  inventory: InventoryState;
  quests: QuestState[];
  economy: EconomyState;
}

export interface SaveData {
  schemaVersion: 5;
  player: PlayerSaveData;
  calendar: CalendarState;
  world: WorldSaveData;
}
