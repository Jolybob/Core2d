import { describe, expect, it } from 'vitest';
import type { EntityId } from '../entity';
import { GameRuntime } from '../runtime';
import { GameStore, createInitialState } from '../store';
import { DomainEventBus } from '../events';
import { FarmingSystem } from './FarmingSystem';
import { WorldRuntime } from '../world/runtime';
import { rehydrateWorld } from '../world/runtime-persistence';
import { createInitialWorldSave } from '../world/world-save';

const cropId = (key: string): EntityId => `crop-${encodeURIComponent(key)}` as EntityId;

describe('FarmingSystem ECS runtime', () => {
  it('stores crops as runtime ECS entities', () => {
    const runtime = new GameRuntime();
    expect(runtime.dispatch({ type: 'TILL', key: '4,7' })).toBe(true);
    expect(runtime.dispatch({ type: 'PLANT', key: '4,7' })).toBe(true);
    expect(runtime.dispatch({ type: 'WATER', key: '4,7' })).toBe(true);
    const id = cropId('4,7');
    expect(runtime.worldRuntime.entities.get(id)?.kind).toBe('crop');
    expect(runtime.worldRuntime.components.get('crop', id)).toMatchObject({ key: '4,7', stage: 1, watered: true, tilled: true });
  });

  it('grows and harvests through ECS without duplicating entities', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'TILL', key: '2,3' });
    runtime.dispatch({ type: 'PLANT', key: '2,3' });
    for (let i = 0; i < 2; i += 1) { expect(runtime.dispatch({ type: 'WATER', key: '2,3' })).toBe(true); runtime.farming.grow(); }
    expect(runtime.farming.getCrop('2,3')?.stage).toBe(3);
    expect(runtime.farming.getCrop('2,3')?.watered).toBe(false);
    expect(runtime.dispatch({ type: 'HARVEST', key: '2,3' })).toBe(true);
    expect(runtime.worldRuntime.query.with('crop')).toHaveLength(0);
  });

  it('hydrates persisted crops only at the explicit world persistence boundary', () => {
    const store = new GameStore(createInitialState());
    const events = new DomainEventBus();
    const worldRuntime = new WorldRuntime(createInitialWorldSave());
    const farming = new FarmingSystem(store, events, worldRuntime);
    const world = structuredClone(worldRuntime.exportWorld());
    world.crops['9,10'] = { stage: 2, watered: true, tilled: true };
    expect(farming.getCrop('9,10')).toBeUndefined();
    rehydrateWorld(worldRuntime, world);
    expect(farming.getCrop('9,10')).toEqual({ stage: 2, watered: true, tilled: true });
    expect(worldRuntime.query.with('crop')).toHaveLength(1);
    expect(worldRuntime.components.get('position', cropId('9,10'))).toEqual({ x: 9, y: 10 });
  });
});
