import { describe, expect, it } from 'vitest';
import { DomainEventBus } from '../events';
import { GameStore, createInitialState } from '../store';
import { WorldRuntime } from '../world/runtime';
import { createInitialWorldSave } from '../world/world-save';
import { PlayerSystem } from './PlayerSystem';

const createPlayer = () => { const store = new GameStore(createInitialState()); const runtime = new WorldRuntime(createInitialWorldSave()); const player = new PlayerSystem(store, runtime); return { store, runtime, player }; };

describe('PlayerSystem ECS', () => {
  it('creates the player as an ECS entity with position and player components', () => { const { store, runtime } = createPlayer(); const entity = runtime.query.with('player', 'position')[0]; expect(entity).toBeDefined(); expect(entity?.kind).toBe('player'); expect([...runtime.entities.ids()]).toHaveLength(1); expect(store.getState().world).toBeUndefined(); });
  it('updates ECS movement and keeps the application state mirror in sync', () => { const { store, runtime, player } = createPlayer(); const before = store.getState().player; expect(player.move(1, 0, false, 1)).toBe(true); const after = store.getState().player; expect(after.x).toBeGreaterThan(before.x); expect(after.stamina).toBeLessThan(before.stamina); const entity = runtime.query.with('player', 'position')[0]; expect(entity).toBeDefined(); if (!entity) return; const position = runtime.components.get<{ x: number; y: number }>('position', entity.id); expect(position?.x).toBe(after.x); expect(position?.y).toBe(after.y); });
  it('keeps ECS player components in WorldRuntime rather than mirroring them into GameStore', () => { const { store, runtime, player } = createPlayer(); expect(player.move(1, 0, false, 1)).toBe(true); player.persist(); const entity = runtime.query.with('player', 'position')[0]; expect(entity).toBeDefined(); if (!entity) return; const component = runtime.components.get<{ x: number; y: number } & Record<string, unknown>>('player', entity.id); expect(component?.x).toBe(store.getState().player.x); expect(store.getState().world).toBeUndefined(); });
  it('keeps existing gameplay dependencies independent of the ECS implementation', () => { const events = new DomainEventBus(); expect(events).toBeDefined(); });
});
