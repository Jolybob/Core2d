import { describe, expect, it } from 'vitest';
import { DomainEventBus } from '../events';
import { GameStore, createInitialState } from '../store';
import { ResourceSystem } from './ResourceSystem';

const createResources = () => {
  const store = new GameStore(createInitialState());
  const events = new DomainEventBus();
  const resources = new ResourceSystem(store, events);
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

  it('preserves resource entities while recording removal in world persistence', () => {
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

    expect(removedId).toBeDefined();
    expect(state.world.removedResources[tree.key]).toBe('tree');
    expect(resources.chop(tree.key)).toBe(false);
    expect(resources.get(tree.key)).toBeUndefined();
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

  it('generates resources from nearby chunks instead of a finite world rectangle', () => {
    const { store, resources } = createResources();
    const nodes = resources.getAll();
    const state = store.getState();
    const hasOutsideLegacyWorld = nodes.some((node) => node.x >= 70 || node.y >= 48 || node.x < 0 || node.y < 0);

    expect(nodes.length).toBeGreaterThan(0);
    expect(hasOutsideLegacyWorld).toBe(true);
    expect(Object.keys(state.world.chunks).length).toBeGreaterThan(0);
  });
});
