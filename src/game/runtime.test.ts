import { describe, expect, it } from 'vitest';
import { GameRuntime } from './runtime';

const advanceOneDay = (runtime: GameRuntime): void => {
  runtime.dispatch({ type: 'TICK', deltaSeconds: 150 });
};

describe('GameRuntime', () => {
  it('rejects invalid numeric commands without mutating state', () => {
    const runtime = new GameRuntime();
    const before = runtime.store.getState();

    expect(runtime.dispatch({ type: 'TICK', deltaSeconds: Number.NaN })).toBe(false);
    expect(runtime.dispatch({ type: 'DAMAGE', amount: -10 })).toBe(false);
    expect(runtime.dispatch({ type: 'MOVE', dx: 1, dy: 0, sprint: false, deltaSeconds: Number.POSITIVE_INFINITY })).toBe(false);

    expect(runtime.store.getState()).toEqual(before);
  });

  it('keeps world weather deterministic for the same seed and day', () => {
    const first = new GameRuntime();
    const second = new GameRuntime();

    advanceOneDay(first);
    advanceOneDay(second);

    expect(first.store.getState().calendar.weather).toBe(second.store.getState().calendar.weather);
  });

  it('routes economy, crafting, combat, and player commands through their systems', () => {
    const runtime = new GameRuntime();
    const before = runtime.store.getState();

    expect(runtime.dispatch({ type: 'BUY_SEEDS' })).toBe(true);
    expect(runtime.dispatch({ type: 'CRAFT', recipe: 'torch' })).toBe(true);
    expect(runtime.dispatch({ type: 'DAMAGE', amount: 15 })).toBe(false);
    runtime.store.update((state) => { state.player.health = 80; });
    expect(runtime.dispatch({ type: 'DAMAGE', amount: 15 })).toBe(false);
    expect(runtime.dispatch({ type: 'EAT', item: 'berry' })).toBe(true);

    const after = runtime.store.getState();
    expect(after.player.money).toBe(before.player.money - 20);
    expect(after.inventory.seeds).toBe(before.inventory.seeds + 5);
    expect(after.inventory.torch).toBe(before.inventory.torch + 3);
    expect(after.player.health).toBe(65);
    expect(after.player.hunger).toBeGreaterThan(0);
  });

  it('rejects movement into the domain collision area', () => {
    const runtime = new GameRuntime();
    runtime.store.update((state) => {
      state.player.x = 32 * 24 + 12;
      state.player.y = 17 * 24 + 12;
    });
    const before = runtime.store.getState();

    expect(runtime.dispatch({ type: 'MOVE', dx: 1, dy: 0, sprint: false, deltaSeconds: 0.2 })).toBe(false);
    expect(runtime.store.getState()).toEqual(before);
  });

  it('validates resource targets in the domain, prevents repeat gathering, and routes copper progress through QuestSystem', () => {
    const runtime = new GameRuntime();
    const tree = runtime.resources.getAll().find((resource) => resource.type === 'tree');
    const rock = runtime.resources.getAll().find((resource) => resource.type === 'rock');
    const oreRock = runtime.resources.getAll().find((resource) => resource.type === 'rock' && resource.ore);

    expect(tree).toBeDefined();
    expect(rock).toBeDefined();
    expect(oreRock).toBeDefined();
    if (!tree || !rock || !oreRock) return;

    runtime.store.update((state) => {
      state.player.x = tree.x * 24;
      state.player.y = tree.y * 24;
    });
    expect(runtime.dispatch({ type: 'CHOP_AT', x: tree.x, y: tree.y })).toBe(true);
    expect(runtime.dispatch({ type: 'CHOP_AT', x: tree.x, y: tree.y })).toBe(false);

    runtime.store.update((state) => {
      state.player.x = oreRock.x * 24;
      state.player.y = oreRock.y * 24;
    });
    const copperBefore = runtime.store.getState().quests.find((quest) => quest.id === 'copper')?.progress ?? 0;
    expect(runtime.dispatch({ type: 'MINE_AT', x: oreRock.x, y: oreRock.y })).toBe(true);
    expect(runtime.store.getState().quests.find((quest) => quest.id === 'copper')?.progress).toBe(copperBefore + 1);
    expect(runtime.dispatch({ type: 'MINE_AT', x: oreRock.x, y: oreRock.y })).toBe(false);

    runtime.store.update((state) => {
      state.player.x = 1 * 24;
      state.player.y = 1 * 24;
    });
    expect(runtime.dispatch({ type: 'MINE_AT', x: rock.x, y: rock.y })).toBe(false);
  });
});
