import { describe, expect, it } from 'vitest';
import { createEntityId } from '../entity';
import { createInitialWorldSave } from './world-save';
import { WorldRuntime } from './runtime';

const position = (x: number, y: number) => ({ x, y });

describe('WorldRuntime', () => {
  it('stores components separately and queries by component set', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42));
    const player = runtime.createEntity('player', { position: position(2, 3), health: { health: 100, maxHealth: 100 } });
    runtime.createEntity('tree', { position: position(4, 3) });

    expect(runtime.query.with('position', 'health').map((entity) => entity.id)).toEqual([player]);
    expect(runtime.query.one(player, 'health')?.components['health']).toEqual({ health: 100, maxHealth: 100 });
  });

  it('keeps the spatial index synchronized with position components', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42));
    const tree = runtime.createEntity('tree', { position: position(4, 3) });

    expect(runtime.spatial.at({ x: 4, y: 3 })).toContain(tree);
    runtime.setComponent(tree, 'position', position(5, 3));
    expect(runtime.spatial.at({ x: 4, y: 3 })).not.toContain(tree);
    expect(runtime.spatial.at({ x: 5, y: 3 })).toContain(tree);
  });

  it('persists tile mutations without storing generated terrain', () => {
    const world = createInitialWorldSave(42);
    const runtime = new WorldRuntime(world);
    const generated = runtime.chunks.getTile(70, -1);

    runtime.mutations.enqueue({ type: 'setTile', x: 70, y: -1, tile: 'tilled' });
    expect(runtime.applyMutations()).toBe(1);
    expect(runtime.chunks.getTile(70, -1)).toBe('tilled');
    expect(Object.keys(world.chunks)).toEqual(['1,-1']);
    expect(generated).not.toBe('tilled');
  });

  it('removes entities and all their components through the mutation boundary', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42));
    const id = createEntityId('test');
    runtime.entities.add({ id, kind: 'enemy' });
    runtime.setComponent(id, 'position', position(1, 1));
    runtime.setComponent(id, 'health', { health: 10, maxHealth: 10 });

    runtime.mutations.enqueue({ type: 'removeEntity', entity: id });
    expect(runtime.applyMutations()).toBe(1);
    expect(runtime.entities.has(id)).toBe(false);
    expect(runtime.components.has('health', id)).toBe(false);
    expect(runtime.spatial.at({ x: 1, y: 1 })).not.toContain(id);
  });
});
