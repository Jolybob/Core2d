import type { GameStore } from '../store';
import type { FarmingSystem } from './FarmingSystem';

export const DAY_SECONDS = 150;

const weatherRoll = (seed: number, day: number): number => {
  let value = (seed ^ Math.imul(day, 0x9e3779b9)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b) >>> 0;
  value ^= value >>> 13;
  return (value >>> 0) / 4294967296;
};

export class DaySystem {
  constructor(private readonly store: GameStore, private readonly farming: FarmingSystem) {}

  update(deltaSeconds: number): boolean {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return false;
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
      const roll = weatherRoll(state.world.seed, state.calendar.day);
      state.calendar.weather = roll < 0.22 ? 'Rainy' : roll < 0.40 ? 'Cloudy' : 'Sunny';
      if (state.calendar.day % 8 === 1) state.calendar.season = (state.calendar.season + 1) % 4;
      advanced = true;
    });
    if (advanced) this.farming.grow();
    return advanced;
  }
}
