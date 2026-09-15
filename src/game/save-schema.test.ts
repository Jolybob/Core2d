import { describe, expect, it } from 'vitest';
import { createSaveData, isGameState, migrateSave, migrateSaveData, SAVE_SCHEMA_VERSION } from './save-schema';
import { createInitialState } from './store';
import { createInitialWorldSave } from './world/world-save';

describe('save schema', () => {
  it('creates the current split world/player envelope', () => {
    const state = createInitialState();
    const world = createInitialWorldSave();
    const data = createSaveData(state, world);
    expect(data.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(data.player.player).toEqual(state.player);
    expect(data.player.inventory).toEqual(state.inventory);
    expect(data.world).toEqual(world);
    expect(data.world.chunks).toEqual({});
    expect(isGameState(state)).toBe(true);
  });

  it('rejects malformed current saves without storage dependencies', () => {
    const state = createInitialState();
    const invalid = structuredClone(createSaveData(state, createInitialWorldSave())) as unknown as { player: { inventory: Record<string, unknown> } };
    invalid.player.inventory.ore = Number.NaN;
    expect(migrateSave(invalid)).toBeNull();
  });

  it('migrates schema v4 into the v5 world/player envelope', () => {
    const state = createInitialState();
    const legacy = { ...state, world: createInitialWorldSave(2042) };
    legacy.world.chunks['0,0'] = { key: '0,0', modifiedTiles: { '1,2': { tile: 'tilled' } }, removedEntities: {} };
    const migrated = migrateSaveData({ schemaVersion: 4, state: legacy });
    expect(migrated).not.toBeNull();
    if (!migrated) return;
    expect(migrated.world.chunks['0,0']?.modifiedTiles['1,2']?.tile).toBe('tilled');
    expect(migrated.world.generatorVersion).toBe(1);
    expect(isGameState({ ...migrated.player, calendar: migrated.calendar })).toBe(true);
  });

  it('migrates schema v2 into the current validated state and default world', () => {
    const state = migrateSave({ schemaVersion: 2, state: { player: { x: 100, y: 120, health: 80, stamina: 90, hunger: 70, money: 50, pickaxeLevel: 2, tool: 'pick' }, inventory: { wood: 5, berry: 2 }, quests: [{ id: 'legacy', title: 'Legacy Quest', need: 3, progress: 1, reward: 20, done: false }], calendar: { day: 4, clock: 120, season: 1, weather: 'Rainy' }, economy: { fishCaught: 2, shipped: 3, totalHarvests: 1 } } });
    expect(state?.player.x).toBe(100);
    expect(state?.inventory.wood).toBe(5);
    expect(state && isGameState(state)).toBe(true);
  });

  it('migrates the original unversioned inventory save format', () => {
    const state = migrateSave({ inventory: { wood: 7, berry: 3 }, health: 60, money: 25, day: 9 });
    expect(state?.inventory.wood).toBe(7);
    expect(state?.inventory.berry).toBe(3);
    expect(state?.player.health).toBe(60);
    expect(state?.player.money).toBe(25);
    expect(state?.calendar.day).toBe(9);
    expect(state && isGameState(state)).toBe(true);
  });
});
