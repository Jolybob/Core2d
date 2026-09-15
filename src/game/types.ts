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
export type EquipmentSlot = 'helm' | 'chest' | 'pants' | 'lantern' | 'offhand' | 'necklace' | 'ring1' | 'ring2' | 'bag' | 'pouch1' | 'pouch2' | 'pouch3' | 'pouch4' | 'pet';
export interface InventoryLayoutState {
  slots: Array<ItemId | null>;
  locked: boolean[];
  activeHotbarRow: number;
  equipment: Record<EquipmentSlot, ItemId | null>;
}
export interface CropState { stage: number; watered: boolean; tilled: boolean; }
export interface QuestState { id: string; title: string; need: number; progress: number; reward: number; done: boolean; }
export interface CalendarState { day: number; clock: number; season: number; weather: 'Sunny' | 'Rainy' | 'Cloudy'; }
export interface PlayerState { x: number; y: number; health: number; stamina: number; hunger: number; money: number; pickaxeLevel: number; tool: ToolId; }
export type WorldState = WorldSaveData;
export interface EconomyState { fishCaught: number; shipped: number; totalHarvests: number; }
export interface GameState { player: PlayerState; inventory: InventoryState; inventoryLayout: InventoryLayoutState; quests: QuestState[]; calendar: CalendarState; economy: EconomyState; }
export interface PlayerSaveData { player: PlayerState; inventory: InventoryState; inventoryLayout: InventoryLayoutState; quests: QuestState[]; economy: EconomyState; }
export interface SaveData { schemaVersion: 6; player: PlayerSaveData; calendar: CalendarState; world: WorldSaveData; }
export interface LoadedGame { state: GameState; world: WorldSaveData; }
export type { EntityRegistryState, ChunkPersistence };
