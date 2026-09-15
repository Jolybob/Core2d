import { describe, expect, it } from 'vitest';
import { loadGame, saveGame, SAVE_KEY } from './persistence';
import { createInitialState } from './store';
import type { GameState } from './types';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('persistence', () => {
  it('round trips the complete domain state', () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    state.player.money = 777;
    state.world.seed = 9001;
    state.world.crops['30,24'] = { stage: 2, watered: true, tilled: true };
    state.world.removedResources['rock:55,21'] = 'rock';
    state.quests[1].progress = 4;
    saveGame(state, storage);
    const loaded = loadGame(storage);
    expect(storage.getItem(SAVE_KEY)).toContain('"schemaVersion":3');
    expect(loaded).toEqual(state);
  });

  it('rejects malformed schema v3 saves instead of partially accepting them', () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    const invalid = structuredClone(state) as GameState & { inventory: Record<string, unknown> };
    invalid.inventory.ore = Number.NaN;
    storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 3, state: invalid }));

    expect(loadGame(storage)).toBeNull();
  });

  it('rejects malformed nested crop and resource state', () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    const invalid = structuredClone(state) as GameState & { world: Record<string, unknown> };
    invalid.world.crops = { '1,2': { stage: -1, watered: true, tilled: true } };
    invalid.world.removedResources = { 'rock:1,2': 'invalid' };
    storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 3, state: invalid }));

    expect(loadGame(storage)).toBeNull();
  });

  it('migrates legacy schema v2 saves into the validated schema', () => {
    const storage = new MemoryStorage();
    storage.setItem('core2d-save-v2', JSON.stringify({
      schemaVersion: 2,
      state: {
        player: { x: 100, y: 120, health: 80, stamina: 90, hunger: 70, money: 50, pickaxeLevel: 2, tool: 'pick' },
        inventory: { wood: 5, berry: 2 },
        quests: [{ id: 'legacy', title: 'Legacy Quest', need: 3, progress: 1, reward: 20, done: false }],
        calendar: { day: 4, clock: 120, season: 1, weather: 'Rainy' },
        economy: { fishCaught: 2, shipped: 3, totalHarvests: 1 },
      },
    }));

    const state = loadGame(storage);
    expect(state?.player.x).toBe(100);
    expect(state?.inventory.wood).toBe(5);
    expect(state?.world.seed).toBe(2042);
    expect(storage.getItem(SAVE_KEY)).toContain('"schemaVersion":3');
  });
});
