import { describe, expect, it } from 'vitest';
import { createSaveData, isGameState, migrateSave, SAVE_SCHEMA_VERSION } from './save-schema';
import { createInitialState } from './store';

describe('save schema', () => {
  it('creates the current version only for valid game state', () => {
    const state = createInitialState();
    const data = createSaveData(state);
    expect(data.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(data.state).toEqual(state);
    expect(isGameState(data.state)).toBe(true);
  });

  it('rejects malformed current saves without storage dependencies', () => {
    const state = createInitialState();
    const invalid = structuredClone(state) as unknown as { inventory: Record<string, unknown> };
    invalid.inventory.ore = Number.NaN;

    expect(migrateSave({ schemaVersion: SAVE_SCHEMA_VERSION, state: invalid })).toBeNull();
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
    expect(state?.calendar.day).toBe(9);
    expect(state && isGameState(state)).toBe(true);
  });
});
