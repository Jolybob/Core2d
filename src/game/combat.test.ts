import { describe, expect, it } from 'vitest';
import { GameRuntime } from './runtime';

describe('CombatSystem', () => {
  it('spawns deterministic slimes, attacks the nearest target, and persists defeat', () => {
    const runtime = new GameRuntime();
    const slime = runtime.worldRuntime.query.with('enemy', 'position', 'health').find((entity) => entity.kind === 'slime');
    expect(slime).toBeDefined();
    if (!slime) return;
    const position = runtime.worldRuntime.components.get<{ x: number; y: number }>('position', slime.id);
    expect(position).toBeDefined();
    if (!position) return;

    runtime.store.update((state) => {
      state.inventory.sword = 1;
      state.player.x = position.x;
      state.player.y = position.y;
    });

    const oreBefore = runtime.store.getState().inventory.ore;
    expect(runtime.dispatch({ type: 'ATTACK' })).toBe(true);
    expect(runtime.worldRuntime.components.get<{ health: number; maxHealth: number }>('health', slime.id)?.health).toBe(15);
    expect(runtime.dispatch({ type: 'ATTACK' })).toBe(true);
    expect(runtime.worldRuntime.entities.has(slime.id)).toBe(false);
    expect(runtime.store.getState().inventory.ore).toBe(oreBefore + 1);

    runtime.combat.refresh();
    expect(runtime.worldRuntime.entities.has(slime.id)).toBe(false);
  });

  it('slimes chase and damage the player on the authoritative tick', () => {
    const runtime = new GameRuntime();
    const slime = runtime.worldRuntime.query.with('enemy', 'position', 'health').find((entity) => entity.kind === 'slime');
    expect(slime).toBeDefined();
    if (!slime) return;
    const position = runtime.worldRuntime.components.get<{ x: number; y: number }>('position', slime.id);
    expect(position).toBeDefined();
    if (!position) return;

    runtime.store.update((state) => {
      state.player.x = position.x;
      state.player.y = position.y;
      state.player.health = 100;
    });
    expect(runtime.dispatch({ type: 'TICK', deltaSeconds: 1.2 })).toBe(false);
    expect(runtime.store.getState().player.health).toBe(92);
  });
});
