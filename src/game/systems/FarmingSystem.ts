import type { GameStore } from '../store';
import type { CropState } from '../types';

export class FarmingSystem {
  constructor(private readonly store: GameStore) {}

  water(crop: CropState): boolean {
    if (!crop.tilled || crop.stage < 1) return false;
    crop.watered = true;
    return true;
  }

  plant(crop: CropState): boolean {
    if (!crop.tilled || crop.stage > 0) return false;
    if ((this.store.getState().inventory.seeds ?? 0) < 1) return false;
    this.store.update((state) => { state.inventory.seeds -= 1; });
    crop.stage = 1;
    crop.watered = false;
    return true;
  }

  grow(crops: Iterable<CropState>): void {
    for (const crop of crops) {
      if (crop.watered && crop.stage > 0 && crop.stage < 3) {
        crop.stage += 1;
        crop.watered = false;
      }
    }
  }

  harvest(crop: CropState): boolean {
    if (crop.stage < 3) return false;
    this.store.update((state) => {
      state.inventory.parsnip = (state.inventory.parsnip ?? 0) + 1;
      state.economy.totalHarvests += 1;
      state.player.money += 35;
      const quest = state.quests.find((q) => q.id === 'harvest');
      if (quest && !quest.done) quest.progress = Math.min(quest.need, quest.progress + 1);
    });
    crop.stage = 0;
    crop.watered = false;
    return true;
  }
}
