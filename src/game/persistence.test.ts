import { describe, expect, it } from 'vitest';
import { loadGame, saveGame, SAVE_KEY } from './persistence';
import { createInitialState } from './store';
import { WorldRuntime } from './world/runtime';
import { createInitialWorldSave } from './world/world-save';

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
  it('round trips application state and authoritative world independently', () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    const world = new WorldRuntime(createInitialWorldSave(9001));
    state.player.money = 777;
    world.setTile(30, 24, 'blocked');
    world.setCropPersistence('30,24', { stage: 2, watered: true, tilled: true });
    world.markResourceRemoved('rock:55,21', 'rock');
    const copperQuest = state.quests.find((quest) => quest.id === 'copper');
    expect(copperQuest).toBeDefined();
    if (!copperQuest) return;
    copperQuest.progress = 4;

    saveGame(state, world, storage);
    const loaded = loadGame(storage);
    expect(storage.getItem(SAVE_KEY)).toContain('"schemaVersion":5');
    expect(loaded?.state).toEqual(state);
    expect(loaded?.world.seed).toBe(9001);
    expect(loaded?.world.chunks['0,0']?.modifiedTiles['30,24']?.tile).toBe('blocked');
    expect(loaded?.world.crops['30,24']).toEqual({ stage: 2, watered: true, tilled: true });
    expect(loaded?.world.removedResources['rock:55,21']).toBe('rock');
  });

  it('rejects malformed current saves instead of partially accepting them', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 5, player: { player: createInitialState().player, inventory: createInitialState().inventory, quests: createInitialState().quests, economy: createInitialState().economy }, calendar: createInitialState().calendar, world: { seed: 2042, generatorVersion: 1, chunks: {}, crops: { '1,2': { stage: -1, watered: true, tilled: true } }, removedResources: {}, entities: { entities: {} } } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('rejects malformed nested world state', () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 5, player: { player: state.player, inventory: state.inventory, quests: state.quests, economy: state.economy }, calendar: state.calendar, world: { seed: 2042, generatorVersion: 1, chunks: { '0,0': { key: '0,0', modifiedTiles: { '1,1': { tile: '' } }, removedEntities: {} } }, crops: {}, removedResources: {}, entities: { entities: {} } } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('migrates legacy schema v2 saves into validated player and default world data', () => {
    const storage = new MemoryStorage();
    storage.setItem('core2d-save-v2', JSON.stringify({ schemaVersion: 2, state: { player: { x: 100, y: 120, health: 80, stamina: 90, hunger: 70, money: 50, pickaxeLevel: 2, tool: 'pick' }, inventory: { wood: 5, berry: 2 }, quests: [{ id: 'legacy', title: 'Legacy Quest', need: 3, progress: 1, reward: 20, done: false }], calendar: { day: 4, clock: 120, season: 1, weather: 'Rainy' }, economy: { fishCaught: 2, shipped: 3, totalHarvests: 1 } } }));
    const loaded = loadGame(storage);
    expect(loaded?.state.player.x).toBe(100);
    expect(loaded?.state.inventory.wood).toBe(5);
    expect(loaded?.world.seed).toBe(2042);
    expect(storage.getItem(SAVE_KEY)).toContain('"schemaVersion":5');
  });
});
