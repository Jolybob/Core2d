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

  it('validates resource targets in the domain and prevents repeat gathering', () => {
    const runtime = new GameRuntime();
    const tree = runtime.resources.getAll().find((resource) => resource.type === 'tree');
    const rock = runtime.resources.getAll().find((resource) => resource.type === 'rock');

    expect(tree).toBeDefined();
    expect(rock).toBeDefined();
    if (!tree || !rock) return;

    runtime.store.update((state) => {
      state.player.x = tree.x * 24;
      state.player.y = tree.y * 24;
    });
    expect(runtime.dispatch({ type: 'CHOP_AT', x: tree.x, y: tree.y })).toBe(true);
    expect(runtime.dispatch({ type: 'CHOP_AT', x: tree.x, y: tree.y })).toBe(false);

    runtime.store.update((state) => {
      state.player.x = rock.x * 24;
      state.player.y = rock.y * 24;
    });
    expect(runtime.dispatch({ type: 'MINE_AT', x: rock.x, y: rock.y })).toBe(true);
    expect(runtime.dispatch({ type: 'MINE_AT', x: rock.x, y: rock.y })).toBe(false);

    runtime.store.update((state) => {
      state.player.x = 1 * 24;
      state.player.y = 1 * 24;
    });
    expect(runtime.dispatch({ type: 'MINE_AT', x: rock.x, y: rock.y })).toBe(false);
  });
});
