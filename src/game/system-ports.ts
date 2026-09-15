import type { RecipeId, ToolId, ConsumableId } from './types';

export interface CombatPort {
  attack(): boolean;
  damagePlayer(amount: number): boolean;
}

export interface CraftingPort {
  craft(recipeId: RecipeId): boolean;
}

export interface DayPort {
  update(deltaSeconds: number): boolean;
}

export interface EconomyPort {
  buySeeds(cost?: number, amount?: number): boolean;
  ship(): boolean;
}

export interface FarmingPort {
  till(key: string): boolean;
  plant(key: string): boolean;
  water(key: string): boolean;
  harvest(key: string): boolean;
}

export interface FishingPort {
  catchFish(): boolean;
}

export interface PlayerPort {
  move(dx: number, dy: number, sprint: boolean, deltaSeconds: number): boolean;
  selectTool(tool: ToolId): boolean;
  eat(item: ConsumableId): boolean;
  useSalve(): boolean;
  persist(): void;
  refresh(): void;
}

export interface ResourcePort {
  mineAt(x: number, y: number): boolean;
  chopAt(x: number, y: number): boolean;
  refresh(): void;
}
