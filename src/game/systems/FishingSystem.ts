import type { GameStore } from '../store';

export class FishingSystem {
  constructor(private readonly store: GameStore) {}

  catchFish(): boolean {
    if ((this.store.getState().inventory.rod ?? 0) < 1) return false;
    this.store.update((state) => {
      state.inventory.fish = (state.inventory.fish ?? 0) + 1;
      state.economy.fishCaught += 1;
      const quest = state.quests.find((q) => q.id === 'fish');
      if (quest && !quest.done) quest.progress = Math.min(quest.need, quest.progress + 1);
    });
    return true;
  }
}
