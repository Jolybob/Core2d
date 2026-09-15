import type { ConsumableId, ToolId } from '../types';
import type { GameStore } from '../store';
import { WorldSystem } from '../world/WorldSystem';

const isFiniteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

export class PlayerSystem {
  constructor(
    private readonly store: GameStore,
    private readonly world: WorldSystem,
  ) {}

  move(dx: number, dy: number, sprint: boolean, deltaSeconds: number): boolean {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !isFiniteNonNegative(deltaSeconds)) return false;
    const length = Math.hypot(dx, dy);
    if (!length || deltaSeconds <= 0) return false;

    const player = this.store.select((state) => state.player);
    const canSprint = sprint && player.stamina > 2;
    const speed = canSprint ? 230 : 145;
    const next = this.world.clampPosition(
      player.x + (dx / length) * speed * deltaSeconds,
      player.y + (dy / length) * speed * deltaSeconds,
    );
    if (!this.world.canMove(next.x, next.y)) return false;

    this.store.update((current) => {
      current.player.x = next.x;
      current.player.y = next.y;
      current.player.stamina = Math.max(0, current.player.stamina - deltaSeconds * (canSprint ? 12 : 3));
    });
    return true;
  }

  selectTool(tool: ToolId): boolean {
    this.store.update((state) => { state.player.tool = tool; });
    return true;
  }

  eat(item: ConsumableId): boolean {
    if (this.store.select((state) => state.inventory[item]) < 1) return false;
    this.store.update((state) => {
      state.inventory[item] -= 1;
      const gain = item === 'parsnip' ? 35 : item === 'fish' ? 20 : 25;
      state.player.hunger = Math.min(100, state.player.hunger + gain);
    });
    return true;
  }

  useSalve(): boolean {
    const canUse = this.store.select((state) => state.inventory.salve < 1 || state.player.health >= 100);
    if (canUse) return false;
    this.store.update((next) => {
      next.inventory.salve -= 1;
      next.player.health = Math.min(100, next.player.health + 35);
    });
    return true;
  }
}
