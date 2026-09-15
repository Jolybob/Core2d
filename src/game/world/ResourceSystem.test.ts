import { describe, expect, it } from 'vitest';
import { DomainEventBus } from '../events';
import { GameStore, createInitialState } from '../store';
import { WorldRuntime } from './runtime';
import { chunkKey } from './chunks';
import { ResourceSystem } from './ResourceSystem';

const createResources = () => {
  const store = new GameStore(createInitialState());
  const events = new DomainEventBus();
  const runtime = new WorldRuntime(store.getState().world);
  for (let y = -1; y <= 1; y += 1) for (let x = -1; x <= 1; x += 1) runtime.chunks.load({ x, y });
  const resources = new ResourceSystem(store, events, runtime);
  return { store, resources };
};

describe('ResourceSystem', () => {
  it('materializes deterministic resources as persisted ECS entities', () => {
    const { store, resources } = createResources();
    const nodes = resources.getAll();
    const state = store.getState();
    const entityCount = Object.keys(state.world.entities.entities).length;

    expect(nodes.length).toBeGreaterThan(0);
    expect(entityCount).toBe(nodes.length);
    expect(Object.keys(state.world.entities.components ?? {})).toHaveLength(nodes.length);
    expect(resources.get(nodes[0]?.key ?? '')).toEqual(nodes[0]);
  });

  it('removes the resource entity and records its removal in chunk persistence', () => {
    const { store, resources } = createResources();
    const tree = resources.getAll().find((resource) => resource.type === 'tree');
    expect(tree).toBeDefined();
    if (!tree) return;

    expect(resources.chop(tree.key)).toBe(true);
    const state = store.getState();
    const removedId = Object.entries(state.world.entities.components ?? {}).find(([, components]) => {
      const resource = components.resource as { key?: unknown } | undefined;
      return resource?.key === tree.key;
    })?.[0];

    expect(removedId).toBeUndefined();
    expect(state.world.removedResources[tree.key]).toBe('tree');
    const chunk = Object.values(state.world.chunks).find((candidate) => candidate.removedEntities[tree.key]);
    expect(chunk?.removedEntities[tree.key]).toBe(true);
    expect(resources.chop(tree.key)).toBe(false);
    expect(resources.get(tree.key)).toBeUndefined();
  });

  it('does not regenerate a removed resource after a runtime refresh', () => {
    const { store, resources } = createResources();
    const tree = resources.getAll().find((resource) => resource.type === 'tree');
    expect(tree).toBeDefined();
    if (!tree) return;

    expect(resources.chop(tree.key)).toBe(true);
    const before = resources.getAll();
    resources.refresh();
    const after = resources.getAll();

    expect(before.some((resource) => resource.key === tree.key)).toBe(false);
    expect(after.some((resource) => resource.key === tree.key)).toBe(false);
    expect(store.getState().world.removedResources[tree.key]).toBe('tree');
  });

  it('does not duplicate ECS resources when refreshed', () => {
    const { store, resources } = createResources();
    const before = Object.keys(store.getState().world.entities.entities).length;
    resources.refresh();
    const after = Object.keys(store.getState().world.entities.entities).length;

    expect(before).toBeGreaterThan(0);
    expect(after).toBe(before);
  });

  it('generates the same resource layout for the same seed', () => {
    const first = createResources().resources.getAll();
    const second = createResources().resources.getAll();

    expect(second).toEqual(first);
  });

  it('uses the runtime loaded chunks instead of deriving a player-centered radius', () => {
    const store = new GameStore(createInitialState());
    const events = new DomainEventBus();
    const runtime = new WorldRuntime(store.getState().world);
    runtime.chunks.load({ x: 12, y: -9 });
    const resources = new ResourceSystem(store, events, runtime);
    const nodes = resources.getAll();
    const loadedKey = chunkKey({ x: 12, y: -9 });
    const loadedNodes = nodes.filter((node) => chunkKey({ x: Math.floor(node.x / 64), y: Math.floor(node.y / 64) }) === loadedKey);

    expect(loadedNodes.length).toBeGreaterThan(0);
    expect(Object.keys(store.getState().world.chunks)).toContain(loadedKey);
  });

  it('generates resources from runtime-loaded chunks instead of a finite world rectangle', () => {
    const { store, resources } = createResources();
    const nodes = resources.getAll();
    const state = store.getState();
    const hasOutsideLegacyWorld = nodes.some((node) => node.x >= 70 || node.y >= 48 || node.x < 0 || node.y < 0);

    expect(nodes.length).toBeGreaterThan(0);
    expect(hasOutsideLegacyWorld).toBe(true);
    expect(Object.keys(state.world.chunks).length).toBeGreaterThan(0);
  });
});
