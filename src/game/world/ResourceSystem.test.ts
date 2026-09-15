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

    expect(nodes).toHaveLength(50);
    expect(Object.keys(state.world.entities.entities)).toHaveLength(50);
    expect(Object.keys(state.world.entities.components ?? {})).toHaveLength(50);
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
      const resource = components.resource;
      return resource?.key === tree.key;
    })?.[0];

    expect(removedId).toBeDefined();
    expect(state.world.removedResources[tree.key]).toBe('tree');
    expect(resources.chop(tree.key)).toBe(false);
  });

  it('does not duplicate ECS resources when refreshed', () => {
    const { store, resources } = createResources();
    const before = Object.keys(store.getState().world.entities.entities).length;
    resources.refresh();
    const after = Object.keys(store.getState().world.entities.entities).length;

    expect(before).toBe(50);
    expect(after).toBe(before);
  });
});
