import type { DomainEventBus } from '../events';
import type { GameStatePort } from '../store-ports';
import type { CropState } from '../types';

export class FarmingSystem {
  constructor(private readonly store: GameStatePort, private readonly events: DomainEventBus) {}

  till(key: string): boolean {
    if (this.store.select((state) => Boolean(state.world.crops[key]))) return false;
    this.store.update((state) => {
      state.world.crops[key] = { stage: 0, watered: false, tilled: true };
    });
    return true;
  }

  plant(key: string): boolean {
    const current = this.store.select((state) => state.world.crops[key]);
    if (!current || !current.tilled || current.stage > 0) return false;
    if (this.store.select((state) => state.inventory.seeds) < 1) return false;
    this.store.update((state) => {
      state.inventory.seeds -= 1;
      state.world.crops[key] = { stage: 1, watered: false, tilled: true };
    });
    return true;
  }

  water(key: string): boolean {
    const current = this.store.select((state) => state.world.crops[key]);
    if (!current || !current.tilled || current.stage < 1) return false;
    this.store.update((state) => {
      const crop = state.world.crops[key];
      if (crop) state.world.crops[key] = { stage: crop.stage, watered: true, tilled: crop.tilled };
    });
    return true;
  }

  grow(): void {
    this.store.update((state) => {
      for (const [key, crop] of Object.entries(state.world.crops)) {
        if (crop.watered && crop.stage > 0 && crop.stage < 3) state.world.crops[key] = { stage: crop.stage + 1, watered: false, tilled: crop.tilled };
      }
    });
  }

  harvest(key: string): boolean {
    const crop = this.store.select((state) => state.world.crops[key]);
    if (!crop || crop.stage < 3) return false;
    this.store.update((state) => {
      state.inventory.parsnip += 1;
      state.economy.totalHarvests += 1;
      delete state.world.crops[key];
    });
    this.events.publish({ type: 'CROP_HARVESTED', key });
    return true;
  }

  getCrop(key: string): CropState | undefined {
    return this.store.select((state) => state.world.crops[key]);
  }
}
