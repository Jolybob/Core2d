import { describe, expect, it } from 'vitest';
import { DomainEventBus } from '../events';
import { GameStore, createInitialState } from '../store';
import { WorldRuntime } from './runtime';
import { chunkKey } from './chunks';
import { ResourceSystem } from './ResourceSystem';
import { createInitialWorldSave } from './world-save';

const createResources = () => {
  const store = new GameStore(createInitialState());
  const events = new DomainEventBus();
  const runtime = new WorldRuntime(createInitialWorldSave());
  for (let y = -1; y <= 1; y += 1) for (let x = -1; x <= 1; x += 1) runtime.loadChunk({ x, y });
  const resources = new ResourceSystem(store, events, runtime);
  return { runtime, resources };
};

describe('ResourceSystem', () => {
  it('materializes deterministic resources as runtime ECS entities', () => {
    const { runtime, resources } = createResources(); const nodes = resources.getAll();
    expect(nodes.length).toBeGreaterThan(0); expect(runtime.query.with('resource', 'position')).toHaveLength(nodes.length); expect(resources.get(nodes[0]?.key ?? '')).toEqual(nodes[0]);
  });
  it('removes the resource entity and records its removal in runtime persistence', () => {
    const { runtime, resources } = createResources(); const tree = resources.getAll().find((resource) => resource.type === 'tree'); expect(tree).toBeDefined(); if (!tree) return;
    expect(resources.chop(tree.key)).toBe(true); expect(runtime.query.with('resource', 'position').some((entity) => runtime.components.get<{ key?: unknown }>('resource', entity.id)?.key === tree.key)).toBe(false); expect(runtime.isResourceRemoved(tree.key)).toBe(true); expect([...runtime.readPersistence((world) => Object.values(world.chunks))].some((chunk) => chunk.removedEntities[tree.key])).toBe(true); expect(resources.chop(tree.key)).toBe(false); expect(resources.get(tree.key)).toBeUndefined();
  });
  it('does not regenerate a removed resource after a runtime refresh', () => { const { runtime, resources } = createResources(); const tree = resources.getAll().find((resource) => resource.type === 'tree'); expect(tree).toBeDefined(); if (!tree) return; expect(resources.chop(tree.key)).toBe(true); resources.refresh(); expect(resources.get(tree.key)).toBeUndefined(); expect(runtime.isResourceRemoved(tree.key)).toBe(true); });
  it('does not duplicate ECS resources when refreshed', () => { const { runtime, resources } = createResources(); const before = runtime.query.with('resource', 'position').length; resources.refresh(); expect(before).toBeGreaterThan(0); expect(runtime.query.with('resource', 'position')).toHaveLength(before); });
  it('generates the same resource layout for the same seed', () => { const first = createResources().resources.getAll(); const second = createResources().resources.getAll(); expect(second).toEqual(first); });
  it('uses the runtime loaded chunks instead of deriving a player-centered radius', () => { const store = new GameStore(createInitialState()); const events = new DomainEventBus(); const runtime = new WorldRuntime(createInitialWorldSave()); runtime.loadChunk({ x: 12, y: -9 }); const resources = new ResourceSystem(store, events, runtime); const nodes = resources.getAll(); const loadedKey = chunkKey({ x: 12, y: -9 }); const loadedNodes = nodes.filter((node) => chunkKey({ x: Math.floor(node.x / 64), y: Math.floor(node.y / 64) }) === loadedKey); expect(loadedNodes.length).toBeGreaterThan(0); expect(runtime.isChunkLoaded({ x: 12, y: -9 })).toBe(true); });
  it('generates resources outside the former finite world rectangle', () => { const { runtime, resources } = createResources(); const nodes = resources.getAll(); const hasOutsideFiniteWorld = nodes.some((node) => node.x >= 70 || node.y >= 48 || node.x < 0 || node.y < 0); expect(nodes.length).toBeGreaterThan(0); expect(hasOutsideFiniteWorld).toBe(true); expect(runtime.loadedChunkCoords().length).toBeGreaterThan(0); });
});
