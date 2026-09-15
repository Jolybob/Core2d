import type { GameStore } from '../store';

export class CombatSystem {
  constructor(private readonly store: GameStore) {}

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
