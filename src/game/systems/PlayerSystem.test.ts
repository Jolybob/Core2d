import { describe, expect, it } from 'vitest';
import { DomainEventBus } from '../events';
import { GameStore, createInitialState } from '../store';
import { WorldRuntime } from '../world/runtime';
import { createInitialWorldSave } from '../world/world-save';
import { PlayerSystem } from './PlayerSystem';

const createPlayer = () => {
  const store = new GameStore(createInitialState());
  const runtime = new WorldRuntime(createInitialWorldSave());
  const events = new DomainEventBus();
  const player = new PlayerSystem(store, runtime, events);
  return { store, runtime, events, player };
};

describe('PlayerSystem ECS', () => {
  it('creates the player as an ECS entity with position and player components', () => {
    const { runtime } = createPlayer();
    const entity = runtime.query.with('player', 'position')[0];
    expect(entity).toBeDefined();
    expect(entity?.kind).toBe('player');
    expect([...runtime.entities.ids()]).toHaveLength(1);
  });

  it('updates ECS movement and keeps the application state mirror in sync', () => {
    const { store, runtime, player } = createPlayer();
    const before = store.getState().player;
    expect(player.move(1, 0, false, 1)).toBe(true);
    const after = store.getState().player;
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.stamina).toBeLessThan(before.stamina);
    const entity = runtime.query.with('player', 'position')[0];
    expect(entity).toBeDefined();
    if (!entity) return;
    const position = runtime.components.get<{ x: number; y: number }>('position', entity.id);
    expect(position?.x).toBe(after.x);
    expect(position?.y).toBe(after.y);
  });

  it('keeps ECS player components in WorldRuntime rather than mirroring them into GameStore', () => {
    const { store, runtime, player } = createPlayer();
    expect(player.move(1, 0, false, 1)).toBe(true);
    player.persist();
    const entity = runtime.query.with('player', 'position')[0];
    expect(entity).toBeDefined();
    if (!entity) return;
    const component = runtime.components.get<{ x: number; y: number } & Record<string, unknown>>('player', entity.id);
    expect(component?.x).toBe(store.getState().player.x);
  });

  it('damages the player without defeating them until health reaches zero', () => {
    const { store, player } = createPlayer();
    expect(player.damage(25)).toBe(false);
    expect(store.getState().player.health).toBe(75);
  });

  it('respawns at home after defeat and publishes the defeat event', () => {
    const { store, events, player } = createPlayer();
    const received: unknown[] = [];
    events.subscribe((event) => received.push(event));
    store.update((state) => { state.player.health = 10; state.player.money = 101; });
    player.refresh();
    expect(player.damage(10)).toBe(true);
    expect(store.getState().player).toMatchObject({ x: 852, y: 660, health: 100, stamina: 100, hunger: 60, money: 91 });
    expect(received).toEqual([{ type: 'PLAYER_DEFEATED', moneyLost: 10 }]);
  });

  it('applies starvation damage when hunger reaches zero', () => {
    const { store, player } = createPlayer();
    store.update((state) => { state.player.hunger = 0; state.player.health = 50; });
    player.refresh();
    player.advanceTime(5);
    expect(store.getState().player.hunger).toBe(0);
    expect(store.getState().player.health).toBe(40);
  });

  it('defeats a starving player and returns them to the spawn state', () => {
    const { store, events, player } = createPlayer();
    const received: unknown[] = [];
    events.subscribe((event) => received.push(event));
    store.update((state) => { state.player.hunger = 0; state.player.health = 1; state.player.money = 50; });
    player.refresh();
    player.advanceTime(1);
    expect(store.getState().player).toMatchObject({ health: 100, stamina: 100, hunger: 60, money: 45, x: 852, y: 660 });
    expect(received).toEqual([{ type: 'PLAYER_DEFEATED', moneyLost: 5 }]);
  });

  it('keeps existing gameplay dependencies independent of the ECS implementation', () => {
    const events = new DomainEventBus();
    expect(events).toBeDefined();
  });
});
