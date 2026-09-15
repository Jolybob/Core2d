import { describe, expect, it } from 'vitest';
import { createSaveData, isGameState, migrateSave, SAVE_SCHEMA_VERSION } from './save-schema';
import { createInitialState } from './store';

describe('save schema', () => {
  it('creates the current split world/player envelope', () => {
    const state = createInitialState();
    const data = createSaveData(state);

    expect(data.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(data.player.player).toEqual(state.player);
    expect(data.player.inventory).toEqual(state.inventory);
    expect(data.world.seed).toBe(state.world.seed);
    expect(data.world.chunks).toEqual({});
    expect(isGameState(state)).toBe(true);
  });

  it('rejects malformed current saves without storage dependencies', () => {
    const state = createInitialState();
    const invalid = structuredClone(createSaveData(state)) as unknown as { player: { inventory: Record<string, unknown> } };
    invalid.player.inventory.ore = Number.NaN;

    expect(migrateSave(invalid)).toBeNull();
  });

  it('migrates schema v4 into the v5 world/player model', () => {
    const state = createInitialState();
    state.world.chunks['0,0'] = { key: '0,0', modifiedTiles: { '1,2': { tile: 'tilled' } }, removedEntities: {} };

    const migrated = migrateSave({ schemaVersion: 4, state });

    expect(migrated?.world.chunks['0,0'].modifiedTiles['1,2'].tile).toBe('tilled');
    expect(migrated?.world.generatorVersion).toBe(1);
    expect(migrated && isGameState(migrated)).toBe(true);
  });

  it('migrates schema v2 into the current validated state', () => {
    const state = migrateSave({
      schemaVersion: 2,
      state: {
        player: { x: 100, y: 120, health: 80, stamina: 90, hunger: 70, money: 50, pickaxeLevel: 2, tool: 'pick' },
        inventory: { wood: 5, berry: 2 },
        quests: [{ id: 'legacy', title: 'Legacy Quest', need: 3, progress: 1, reward: 20, done: false }],
        calendar: { day: 4, clock: 120, season: 1, weather: 'Rainy' },
        economy: { fishCaught: 2, shipped: 3, totalHarvests: 1 },
      },
    });

    expect(state?.player.x).toBe(100);
    expect(state?.inventory.wood).toBe(5);
    expect(state?.world.seed).toBe(2042);
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
