import { describe, expect, it } from 'vitest';
import { DomainEventBus } from '../events';
import { GameRuntime } from '../runtime';
import { GameStore, createInitialState } from '../store';
import { ResourceSystem } from './ResourceSystem';
import { WorldRuntime } from './runtime';
import { rehydrateWorld } from './runtime-persistence';

describe('WorldRuntime lifecycle', () => {
  it('rehydrates a runtime to a newly loaded world without replacing the runtime instance', () => {
    const first = createInitialState();
    const second = createInitialState();
    second.world.seed = 99;
    const runtime = new WorldRuntime(first.world);
    const entity = runtime.createEntity('npc', { position: { x: 4, y: 5 } });

    rehydrateWorld(runtime, second);

    expect(runtime.exportWorld()).toEqual(second.world);
    expect(runtime.entities.has(entity)).toBe(false);
    expect(runtime.spatial.at({ x: 4, y: 5 })).not.toContain(entity);
  });

  it('lets GameRuntime resource simulation use the same world runtime instance', () => {
    const runtime = new GameRuntime();
    const resource = runtime.resources.getAll()[0];

    expect(resource).toBeDefined();
    if (!resource) return;

    expect(runtime.worldRuntime.query.with('resource', 'position')).toHaveLength(
      runtime.resources.getAll().length,
    );
  });

  it('rehydrates a shared resource runtime through the explicit persistence boundary', () => {
    const store = new GameStore(createInitialState());
    const events = new DomainEventBus();
    const runtime = new WorldRuntime(store.getState().world);
    const resources = new ResourceSystem(store, events, runtime);
    const firstSeed = runtime.readPersistence((world) => world.seed);

    runtime.loadChunk({ x: 0, y: 0 });
    store.update((state) => {
      state.world.seed = firstSeed + 1;
      state.world.entities.entities = {};
      state.world.entities.components = {};
    });
    rehydrateWorld(runtime, store.getState());
    runtime.loadChunk({ x: 0, y: 0 });
    resources.hydrateFromPersistence();

    expect(runtime.readPersistence((world) => world.seed)).toBe(firstSeed + 1);
    expect(runtime.query.with('resource', 'position').length).toBeGreaterThan(0);
  });
});
