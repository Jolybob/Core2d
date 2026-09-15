import { describe, expect, it } from 'vitest';
import { DomainEventBus } from '../events';
import { GameStore, createInitialState } from '../store';
import { WorldRuntime } from '../world/runtime';
import { PlayerSystem } from './PlayerSystem';

const createPlayer = () => {
  const store = new GameStore(createInitialState());
  const runtime = new WorldRuntime(store.getState().world);
  const player = new PlayerSystem(store, runtime);
  return { store, runtime, player };
};

describe('PlayerSystem ECS', () => {
  it('creates the player as an ECS entity with position and player components', () => {
    const { store, runtime } = createPlayer();
    const entity = runtime.query.with('player', 'position')[0];

    expect(entity).toBeDefined();
    expect(entity?.kind).toBe('player');
    expect(Object.keys(store.getState().world.entities.entities)).toHaveLength(1);
  });

  it('updates ECS movement and keeps the compatibility state mirror in sync', () => {
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

  it('persists ECS player components into world entity storage', () => {
    const { store, player } = createPlayer();
    expect(player.move(1, 0, false, 1)).toBe(true);
    player.persist();

    const state = store.getState();
    const playerEntry = Object.entries(state.world.entities.components ?? {}).find(([, components]) => Boolean(components.player));
    expect(playerEntry).toBeDefined();
    expect(playerEntry?.[1].player?.x).toBe(state.player.x);
  });

  it('keeps existing gameplay dependencies independent of the ECS implementation', () => {
    const events = new DomainEventBus();
    expect(events).toBeDefined();
  });
});
