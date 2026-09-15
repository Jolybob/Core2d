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

  it('does not report mining or chopping a removed resource as successful', () => {
    const runtime = new GameRuntime();

    expect(runtime.dispatch({ type: 'MINE', resourceKey: 'rock:1,1', ore: false })).toBe(true);
    expect(runtime.dispatch({ type: 'MINE', resourceKey: 'rock:1,1', ore: false })).toBe(false);
    expect(runtime.dispatch({ type: 'CHOP', resourceKey: 'tree:1,1' })).toBe(true);
    expect(runtime.dispatch({ type: 'CHOP', resourceKey: 'tree:1,1' })).toBe(false);
  });
});
