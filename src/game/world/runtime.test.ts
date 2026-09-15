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

  it('hydrates persisted entity metadata into the runtime store', () => {
    const world = createInitialWorldSave(42); const id = createEntityId('saved'); world.entities.entities[id] = { id, kind: 'npc' };
    const runtime = new WorldRuntime(world);
    expect(runtime.entities.get(id)).toEqual({ id, kind: 'npc' });
    expect(runtime.query.with().map((entity) => entity.id)).toEqual([id]);
  });

  it('keeps spatial and chunk indexes synchronized with position components', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42));
    const tree = runtime.createEntity('tree', { position: position(4, 3) });
    expect(runtime.spatial.at({ x: 4, y: 3 })).toContain(tree);
    expect(runtime.query.withInChunks(new Set(['0,0']), 'position')).toContainEqual({ id: tree, kind: 'tree' });
    runtime.setComponent(tree, 'position', position(70, 3));
    expect(runtime.spatial.at({ x: 4, y: 3 })).not.toContain(tree);
    expect(runtime.query.withInChunks(new Set(['0,0']), 'position')).not.toContainEqual({ id: tree, kind: 'tree' });
    expect(runtime.query.withInChunks(new Set(['1,0']), 'position')).toContainEqual({ id: tree, kind: 'tree' });
  });

  it('removes spatial and chunk indexes when a position component is removed', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42)); const tree = runtime.createEntity('tree', { position: position(4, 3) });
    expect(runtime.removeComponent(tree, 'position')).toBe(true);
    expect(runtime.spatial.at({ x: 4, y: 3 })).not.toContain(tree);
    expect(runtime.query.withInChunks(new Set(['0,0']), 'position')).toHaveLength(0);
  });

  it('owns loaded chunk lifecycle independently of generated chunk caching', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42));
    expect(runtime.chunks.loadedKeys()).toHaveLength(0);
    runtime.chunks.load({ x: -1, y: 2 });
    expect(runtime.chunks.isLoaded({ x: -1, y: 2 })).toBe(true);
    expect(runtime.chunks.loadedKeys()).toEqual(new Set(['-1,2']));
    runtime.chunks.unload({ x: -1, y: 2 });
    expect(runtime.chunks.isLoaded({ x: -1, y: 2 })).toBe(false);
    expect(runtime.chunks.loadedKeys()).toHaveLength(0);
  });

  it('preserves loaded chunk lifecycle across world rehydration', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42));
    runtime.chunks.load({ x: 1, y: -1 });
    runtime.rehydrate(createInitialWorldSave(99));
    expect(runtime.chunks.loadedKeys()).toEqual(new Set(['1,-1']));
  });

  it('persists tile mutations without storing generated terrain', () => {
    const world = createInitialWorldSave(42); const runtime = new WorldRuntime(world); const generated = runtime.chunks.getTile(70, -1);
    runtime.mutations.enqueue({ type: 'setTile', x: 70, y: -1, tile: 'tilled' });
    expect(runtime.applyMutations()).toBe(1); expect(runtime.chunks.getTile(70, -1)).toBe('tilled');
    expect(Object.keys(world.chunks)).toEqual(['1,-1']); expect(generated).not.toBe('tilled');
  });

  it('removes entities and all their components through the mutation boundary', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42)); const id = createEntityId('test'); runtime.entities.add({ id, kind: 'enemy' });
    runtime.setComponent(id, 'position', position(1, 1)); runtime.setComponent(id, 'health', { health: 10, maxHealth: 10 });
    runtime.mutations.enqueue({ type: 'removeEntity', entity: id });
    expect(runtime.applyMutations()).toBe(1); expect(runtime.entities.has(id)).toBe(false); expect(runtime.components.has('health', id)).toBe(false); expect(runtime.spatial.at({ x: 1, y: 1 })).not.toContain(id); expect(runtime.query.withInChunks(new Set(['0,0']), 'position')).toHaveLength(0);
  });

  it('hydrates and persists ECS components with world entities', () => {
    const world = createInitialWorldSave(42); const runtime = new WorldRuntime(world); const id = runtime.createEntity('enemy', { position: position(8, 9), health: { health: 20, maxHealth: 20 } });
    expect(world.entities.components?.[id]).toEqual({ position: { x: 8, y: 9 }, health: { health: 20, maxHealth: 20 } });
    const restored = new WorldRuntime(world);
    expect(restored.query.one(id, 'position', 'health')?.components).toEqual({ position: { x: 8, y: 9 }, health: { health: 20, maxHealth: 20 } });
    expect(restored.spatial.at({ x: 8, y: 9 })).toContain(id);
    expect(restored.query.withInChunks(new Set(['0,0']), 'position')).toContainEqual({ id, kind: 'enemy' });
  });

  it('removes persisted component data when a component is removed', () => {
    const world = createInitialWorldSave(42); const runtime = new WorldRuntime(world); const id = runtime.createEntity('enemy', { position: position(2, 2), health: { health: 5, maxHealth: 5 } });
    expect(runtime.removeComponent(id, 'position')).toBe(true); expect(world.entities.components?.[id]).toEqual({ health: { health: 5, maxHealth: 5 } }); expect(runtime.spatial.at({ x: 2, y: 2 })).not.toContain(id);
  });

  it('ensures stable world entities are registered and persisted through the runtime', () => {
    const world = createInitialWorldSave(42); const runtime = new WorldRuntime(world); const id = 'world-pond' as ReturnType<typeof createEntityId>;
    runtime.ensureEntity(id, 'structure', { position: position(13, 11), worldObject: { shape: 'ellipse', width: 230, height: 150 } });
    expect(world.entities.entities[id]).toEqual({ id, kind: 'structure' }); expect(world.entities.components?.[id]).toEqual({ position: { x: 13, y: 11 }, worldObject: { shape: 'ellipse', width: 230, height: 150 } });
    const restored = new WorldRuntime(world); expect(restored.query.one(id, 'position', 'worldObject')?.components).toEqual({ position: { x: 13, y: 11 }, worldObject: { shape: 'ellipse', width: 230, height: 150 } }); expect(restored.spatial.at({ x: 13, y: 11 })).toContain(id);
  });
});
