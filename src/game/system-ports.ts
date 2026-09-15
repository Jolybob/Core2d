export interface FarmingPort {
  refresh(): void;
  plant(): boolean;
  harvest(): boolean;
}

export interface ResourcePort {
  refresh(): void;
  mine(): boolean;
}

export interface CombatPort {
  attack(): boolean;
  update(deltaSeconds: number): boolean;
  damagePlayer(amount: number): boolean;
  refresh(): void;
}
