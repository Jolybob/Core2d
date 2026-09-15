import type { GameStore } from '../store';
import type { QuestSystem } from './QuestSystem';

export class FishingSystem {
  constructor(private readonly store: GameStore, private readonly quests: QuestSystem) {}

  catchFish(): boolean {
    if ((this.store.getState().inventory.rod ?? 0) < 1) return false;
    this.store.update((state) => {
      state.inventory.fish = (state.inventory.fish ?? 0) + 1;
      state.economy.fishCaught += 1;
      this.quests.progress(state, 'fish');
    });
    return true;
  }
}
