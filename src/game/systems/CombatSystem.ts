import type { GameStatePort } from '../store-ports';

export class CombatSystem {
  constructor(private readonly store: GameStatePort) {}

  attack(): boolean {
    return this.store.select((state) => state.inventory.sword > 0);
  }

  damagePlayer(amount: number): boolean {
    let defeated = false;
    this.store.update((state) => {
      state.player.health = Math.max(0, state.player.health - amount);
      defeated = state.player.health === 0;
      if (defeated) {
        state.player.health = 100;
        state.player.stamina = 100;
      }
    });
    return defeated;
  }

  rewardSlime(): void {
    this.store.update((state) => { state.inventory.ore = (state.inventory.ore ?? 0) + 1; });
  }
}
