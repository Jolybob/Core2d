export interface FarmingPort {
  refresh(): void;
  till(key: string): boolean;
  plant(key: string): boolean;
  water(key: string): boolean;
  harvest(key: string): boolean;
}

export interface ResourcePort {
  refresh(): void;
  mineAt(x: number, y: number): boolean;
  chopAt(x: number, y: number): boolean;
}

export interface CombatPort {
  attack(): boolean;
  update(deltaSeconds: number): boolean;
  damagePlayer(amount: number): boolean;
  refresh(): void;
}

export interface PlayerPort {
  refresh(): void;
  persist(): void;
  move(dx: number, dy: number, sprint: boolean, deltaSeconds: number): boolean;
  selectTool(tool: import('./types').ToolId): boolean;
  eat(item: import('./types').ConsumableId): boolean;
  useSalve(): boolean;
}

export interface FishingPort {
  catchFish(): boolean;
}

export interface EconomyPort {
  buySeeds(): boolean;
  ship(): boolean;
}

export interface DayPort {
  update(deltaSeconds: number): boolean;
}

export interface CraftingPort {
  craft(recipe: import('./types').RecipeId): boolean;
}
