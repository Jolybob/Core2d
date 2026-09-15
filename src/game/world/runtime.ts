import { createEntityId, type EntityId, type EntityState, type PositionComponent } from '../entity';
import { CHUNK_SIZE, chunkKey, tileKey, worldToChunk, worldToLocalTile, type ChunkCoord, type ChunkPersistence, type ChunkGenerator, type GeneratedChunk, defaultChunkGenerator } from './chunks';
import type { WorldState } from '../types';

export type ComponentName = string;
export type ComponentValue = Record<string, unknown>;

/** Owns entity identity and the minimal entity metadata. Components live separately. */
export class EntityStore {
  private readonly entities = new Map<EntityId, EntityState>();

  create(kind: string, id = createEntityId(kind)): EntityId {
    if (this.entities.has(id)) throw new Error(`Entity already exists: ${id}`);
    this.entities.set(id, { id, kind });
    return id;
  }

  add(entity: EntityState): void {
    if (this.entities.has(entity.id)) throw new Error(`Entity already exists: ${entity.id}`);
    this.entities.set(entity.id, { ...entity });
  }

  has(id: EntityId): boolean {
    return this.entities.has(id);
  }

  get(id: EntityId): EntityState | undefined {
    return this.entities.get(id);
  }

  remove(id: EntityId): boolean {
    return this.entities.delete(id);
  }

  values(): IterableIterator<EntityState> {
    return this.entities.values();
  }

  ids(): IterableIterator<EntityId> {
    return this.entities.keys();
  }
}

/** Sparse component storage. Missing components cost no per-entity allocation. */
export class ComponentStore {
  private readonly stores = new Map<ComponentName, Map<EntityId, ComponentValue>>();

  set<T extends ComponentValue>(name: ComponentName, entity: EntityId, value: T): void {
    let store = this.stores.get(name);
    if (!store) {
      store = new Map();
      this.stores.set(name, store);
    }
    store.set(entity, { ...value });
  }

  get<T extends ComponentValue>(name: ComponentName, entity: EntityId): T | undefined {
    return this.stores.get(name)?.get(entity) as T | undefined;
  }

  has(name: ComponentName, entity: EntityId): boolean {
    return this.stores.get(name)?.has(entity) ?? false;
  }

  remove(name: ComponentName, entity: EntityId): boolean {
    return this.stores.get(name)?.delete(entity) ?? false;
  }

  removeEntity(entity: EntityId): void {
    for (const store of this.stores.values()) store.delete(entity);
  }
}

/**
 * Tile-cell spatial index. It deliberately indexes positions by integer tile rather than pixels,
 * matching the chunk/world coordinate system and keeping queries cheap and deterministic.
 */
export class SpatialIndex {
  private readonly cells = new Map<string, Set<EntityId>>();
  private readonly positions = new Map<EntityId, PositionComponent>();

  set(entity: EntityId, position: PositionComponent): void {
    this.remove(entity);
    const key = tileKey({ x: Math.floor(position.x), y: Math.floor(position.y) });
    const cell = this.cells.get(key) ?? new Set<EntityId>();
    cell.add(entity);
    this.cells.set(key, cell);
    this.positions.set(entity, { ...position });
  }

  remove(entity: EntityId): void {
    const position = this.positions.get(entity);
    if (!position) return;
    const key = tileKey({ x: Math.floor(position.x), y: Math.floor(position.y) });
    const cell = this.cells.get(key);
    cell?.delete(entity);
    if (cell?.size === 0) this.cells.delete(key);
    this.positions.delete(entity);
  }

  at(tile: { x: number; y: number }): readonly EntityId[] {
    return [...(this.cells.get(tileKey({ x: Math.floor(tile.x), y: Math.floor(tile.y) })) ?? [])];
  }

  inRadius(center: PositionComponent, radius: number): EntityId[] {
    const result: EntityId[] = [];
    const minX = Math.floor(center.x - radius);
    const maxX = Math.floor(center.x + radius);
    const minY = Math.floor(center.y - radius);
    const maxY = Math.floor(center.y + radius);
    const radiusSquared = radius * radius;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        for (const id of this.at({ x, y })) {
          const position = this.positions.get(id);
          if (!position) continue;
          const dx = position.x - center.x;
          const dy = position.y - center.y;
          if (dx * dx + dy * dy <= radiusSquared) result.push(id);
        }
      }
    }
    return result;
  }

  clear(): void {
    this.cells.clear();
    this.positions.clear();
  }
}

export interface WorldQueryResult<T extends ComponentValue = ComponentValue> {
  entity: EntityState;
  components: Record<ComponentName, T>;
}

/** Read-only query boundary used by systems instead of scanning GameState directly. */
export class WorldQuery {
  constructor(
    private readonly entities: EntityStore,
    private readonly components: ComponentStore,
  ) {}

  with(...names: ComponentName[]): EntityState[] {
    const result: EntityState[] = [];
    for (const entity of this.entities.values()) {
      if (names.every((name) => this.components.has(name, entity.id))) result.push(entity);
    }
    return result;
  }

  one(id: EntityId, ...names: ComponentName[]): WorldQueryResult | undefined {
    const entity = this.entities.get(id);
    if (!entity || !names.every((name) => this.components.has(name, id))) return undefined;
    const values: Record<ComponentName, ComponentValue> = {};
    for (const name of names) {
      const value = this.components.get(name, id);
      if (value) values[name] = value;
    }
    return { entity, components: values };
  }
}

export type WorldMutation =
  | { type: 'setTile'; x: number; y: number; tile: string }
  | { type: 'removeEntity'; entity: EntityId };

/** Applies gameplay mutations at one boundary so future networking can make this server-authoritative. */
export class WorldMutationQueue {
  private readonly pending: WorldMutation[] = [];

  enqueue(mutation: WorldMutation): void {
    this.pending.push(mutation);
  }

  drain(): WorldMutation[] {
    const mutations = this.pending.splice(0, this.pending.length);
    return mutations;
  }
}

export class ChunkManager {
  private readonly cache: ChunkCacheLike;

  constructor(
    private readonly world: WorldState,
    generator: ChunkGenerator = defaultChunkGenerator,
  ) {
    this.cache = new ChunkCacheLike(generator);
  }

  getGenerated(coord: ChunkCoord): GeneratedChunk {
    return this.cache.get(this.world.seed, coord);
  }

  getTile(x: number, y: number): string {
    const coord = worldToChunk({ x, y });
    const local = worldToLocalTile({ x, y });
    const chunk = this.getGenerated(coord);
    const key = tileKey(local);
    const modification = this.world.chunks[chunkKey(coord)]?.modifiedTiles[key];
    return modification?.tile ?? chunk.tiles[local.y * CHUNK_SIZE + local.x] ?? 'ground';
  }

  setTile(x: number, y: number, tile: string): void {
    const coord = worldToChunk({ x, y });
    const local = worldToLocalTile({ x, y });
    const key = chunkKey(coord);
    const tileId = tileKey(local);
    const chunk = this.world.chunks[key] ?? this.createPersistence(key);
    chunk.modifiedTiles[tileId] = { tile };
  }

  unload(coord: ChunkCoord): void {
    this.cache.unload(coord);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private createPersistence(key: `${number},${number}`): ChunkPersistence {
    const chunk: ChunkPersistence = { key, modifiedTiles: {}, removedEntities: {} };
    this.world.chunks[key] = chunk;
    return chunk;
  }
}

class ChunkCacheLike {
  private readonly chunks = new Map<`${number},${number}`, GeneratedChunk>();

  constructor(private readonly generator: ChunkGenerator) {}

  get(seed: number, coord: ChunkCoord): GeneratedChunk {
    const key = chunkKey(coord);
    const cached = this.chunks.get(key);
    if (cached?.seed === seed) return cached;
    const generated = this.generator.generate(seed, coord);
    this.chunks.set(key, generated);
    return generated;
  }

  unload(coord: ChunkCoord): void {
    this.chunks.delete(chunkKey(coord));
  }

  clear(): void {
    this.chunks.clear();
  }
}

export class WorldRuntime {
  readonly entities = new EntityStore();
  readonly components = new ComponentStore();
  readonly spatial = new SpatialIndex();
  readonly query = new WorldQuery(this.entities, this.components);
  readonly mutations = new WorldMutationQueue();
  readonly chunks: ChunkManager;

  constructor(readonly world: WorldState, generator?: ChunkGenerator) {
    this.chunks = new ChunkManager(world, generator);
  }

  createEntity(kind: string, components: Record<ComponentName, ComponentValue> = {}): EntityId {
    const id = this.entities.create(kind);
    for (const [name, value] of Object.entries(components)) {
      this.components.set(name, id, value);
      if (name === 'position') this.spatial.set(id, value as PositionComponent);
    }
    return id;
  }

  removeEntity(id: EntityId): boolean {
    if (!this.entities.remove(id)) return false;
    this.components.removeEntity(id);
    this.spatial.remove(id);
    return true;
  }

  setComponent<T extends ComponentValue>(id: EntityId, name: ComponentName, value: T): void {
    if (!this.entities.has(id)) throw new Error(`Unknown entity: ${id}`);
    this.components.set(name, id, value);
    if (name === 'position') this.spatial.set(id, value as PositionComponent);
  }

  applyMutations(): number {
    let applied = 0;
    for (const mutation of this.mutations.drain()) {
      if (mutation.type === 'setTile') {
        this.chunks.setTile(mutation.x, mutation.y, mutation.tile);
        applied += 1;
      } else if (this.removeEntity(mutation.entity)) {
        applied += 1;
      }
    }
    return applied;
  }
}
