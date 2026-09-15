import { describe, expect, it } from 'vitest';
import { loadGame, saveGame, SAVE_KEY } from './persistence';
import { createInitialState } from './store';

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
    state.world.crops['30,24'] = { stage: 2, watered: true, tilled: true };
    saveGame(state, storage);
    const loaded = loadGame(storage);
    expect(storage.getItem(SAVE_KEY)).toContain('"schemaVersion":3');
    expect(loaded?.player.money).toBe(777);
    expect(loaded?.world.crops['30,24']?.stage).toBe(2);
  });
});
