import type { GameStore } from '../store';
import { FarmingSystem } from './FarmingSystem';

export const DAY_SECONDS = 150;

export class DaySystem {
  constructor(private readonly store: GameStore, private readonly farming: FarmingSystem) {}

  update(deltaSeconds: number, crops: Iterable<import('../types').CropState>): boolean {
    let advanced = false;
    this.store.update((state) => {
      state.calendar.clock += deltaSeconds;
      state.player.hunger = Math.max(0, state.player.hunger - deltaSeconds * 0.1);
      state.player.stamina = Math.min(100, state.player.stamina + deltaSeconds * (state.player.hunger < 20 ? 5 : 12));
      if (state.calendar.clock < DAY_SECONDS) return;
      state.calendar.clock -= DAY_SECONDS;
      state.calendar.day += 1;
      state.player.stamina = 100;
      state.player.health = Math.min(100, state.player.health + 10);
      state.player.hunger = Math.max(0, state.player.hunger - 6);
      state.calendar.weather = Math.random() < 0.22 ? 'Rainy' : Math.random() < 0.18 ? 'Cloudy' : 'Sunny';
      if (state.calendar.day % 8 === 1) state.calendar.season = (state.calendar.season + 1) % 4;
      advanced = true;
    });
    if (advanced) this.farming.grow(crops);
    return advanced;
  }
}
