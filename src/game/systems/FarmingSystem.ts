import type { GameStore } from '../store';
import type { CropState } from '../types';

export class FarmingSystem {
  constructor(private readonly store: GameStore) {}

  till(key: string): boolean {
    const crop = this.store.getState().world.crops[key];
    if (crop) return false;
    this.store.update((state) => {
      state.world.crops[key] = { stage: 0, watered: false, tilled: true };
    });
    return true;
  }

  plant(key: string): boolean {
    const current = this.store.getState().world.crops[key];
    if (!current || !current.tilled || current.stage > 0) return false;
    if (this.store.getState().inventory.seeds < 1) return false;
    this.store.update((state) => {
      state.inventory.seeds -= 1;
      state.world.crops[key] = { ...state.world.crops[key], stage: 1, watered: false, tilled: true };
    });
    return true;
  }

  water(key: string): boolean {
    const current = this.store.getState().world.crops[key];
    if (!current || !current.tilled || current.stage < 1) return false;
    this.store.update((state) => {
      state.world.crops[key] = { ...state.world.crops[key], watered: true };
    });
    return true;
  }

  grow(): void {
    this.store.update((state) => {
      for (const [key, crop] of Object.entries(state.world.crops)) {
        if (crop.watered && crop.stage > 0 && crop.stage < 3) {
          state.world.crops[key] = { ...crop, stage: crop.stage + 1, watered: false };
        }
      }
    });
  }

  harvest(key: string): boolean {
    const crop = this.store.getState().world.crops[key];
    if (!crop || crop.stage < 3) return false;
    this.store.update((state) => {
      state.inventory.parsnip += 1;
      state.economy.totalHarvests += 1;
      const quest = state.quests.find((entry) => entry.id === 'harvest');
      if (quest && !quest.done) quest.progress = Math.min(quest.need, quest.progress + 1);
      delete state.world.crops[key];
    });
    return true;
  }

  getCrop(key: string): CropState | undefined {
    return this.store.getState().world.crops[key];
  }
}
