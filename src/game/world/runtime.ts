import { createEntityId, type EntityId, type EntityState, type PositionComponent } from '../entity';
import { CHUNK_SIZE, chunkKey, ChunkCache, tileKey, worldToChunk, worldToLocalTile, TILE_SIZE, type ChunkCoord, type ChunkKey, type ChunkPersistence, type ChunkGenerator, type GeneratedChunk, defaultChunkGenerator } from './chunks';
import type { WorldState, CropState } from '../types';

export type ComponentName = string;
export type ComponentValue = Record<string, unknown>;
const isPositionComponent = (v: unknown): v is PositionComponent => typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).x === 'number' && Number.isFinite((v as Record<string, unknown>).x) && typeof (v as Record<string, unknown>).y === 'number' && Number.isFinite((v as Record<string, unknown>).y);
const HOME_MIN_X = 33; const HOME_MAX_X = 37; const HOME_MIN_Y = 14; const HOME_MAX_Y = 20;

export class EntityStore {
  private readonly entities = new Map<EntityId, EntityState>();
  create(kind: string, id = createEntityId(kind)): EntityId { if (this.entities.has(id)) throw new Error(`Entity already exists: ${id}`); this.entities.set(id, { id, kind }); return id; }
  add(entity: EntityState): void { if (this.entities.has(entity.id)) throw new Error(`Entity already exists: ${entity.id}`); this.entities.set(entity.id, { ...entity }); }
  has(id: EntityId): boolean { return this.entities.has(id); }
  get(id: EntityId): EntityState | undefined { return this.entities.get(id); }
  remove(id: EntityId): boolean { return this.entities.delete(id); }
  values(): IterableIterator<EntityState> { return this.entities.values(); }
  ids(): IterableIterator<EntityId> { return this.entities.keys(); }
  clear(): void { this.entities.clear(); }
}

export class ComponentStore {
  private readonly stores = new Map<ComponentName, Map<EntityId, ComponentValue>>();
  set<T extends ComponentValue>(name: ComponentName, entity: EntityId, value: T): void { let store = this.stores.get(name); if (!store) { store = new Map(); this.stores.set(name, store); } store.set(entity, { ...value }); }
  get<T extends ComponentValue>(name: ComponentName, entity: EntityId): T | undefined { return this.stores.get(name)?.get(entity) as T | undefined; }
  has(name: ComponentName, entity: EntityId): boolean { return this.stores.get(name)?.has(entity) ?? false; }
  remove(name: ComponentName, entity: EntityId): boolean { return this.stores.get(name)?.delete(entity) ?? false; }
  removeEntity(entity: EntityId): void { for (const store of this.stores.values()) store.delete(entity); }
  clear(): void { this.stores.clear(); }
}

export class SpatialIndex {
  private readonly cells = new Map<string, Set<EntityId>>(); private readonly positions = new Map<EntityId, PositionComponent>();
  set(entity: EntityId, position: PositionComponent): void { this.remove(entity); const key = tileKey({ x: Math.floor(position.x), y: Math.floor(position.y) }); const cell = this.cells.get(key) ?? new Set<EntityId>(); cell.add(entity); this.cells.set(key, cell); this.positions.set(entity, { ...position }); }
  remove(entity: EntityId): void { const p = this.positions.get(entity); if (!p) return; const key = tileKey({ x: Math.floor(p.x), y: Math.floor(p.y) }); const cell = this.cells.get(key); cell?.delete(entity); if (cell?.size === 0) this.cells.delete(key); this.positions.delete(entity); }
  at(tile: { x: number; y: number }): readonly EntityId[] { return [...(this.cells.get(tileKey({ x: Math.floor(tile.x), y: Math.floor(tile.y) })) ?? [])]; }
  inRadius(center: PositionComponent, radius: number): EntityId[] { const result: EntityId[] = []; const minX = Math.floor(center.x - radius), maxX = Math.floor(center.x + radius), minY = Math.floor(center.y - radius), maxY = Math.floor(center.y + radius), r2 = radius * radius; for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) for (const id of this.at({ x, y })) { const p = this.positions.get(id); if (!p) continue; const dx = p.x - center.x, dy = p.y - center.y; if (dx * dx + dy * dy <= r2) result.push(id); } return result; }
  clear(): void { this.cells.clear(); this.positions.clear(); }
}

export class ChunkEntityIndex {
  private readonly chunks = new Map<ChunkKey, Set<EntityId>>(); private readonly locations = new Map<EntityId, ChunkKey>();
  set(entity: EntityId, position: PositionComponent): void { this.remove(entity); const key = chunkKey(worldToChunk({ x: Math.floor(position.x), y: Math.floor(position.y) })); const entities = this.chunks.get(key) ?? new Set<EntityId>(); entities.add(entity); this.chunks.set(key, entities); this.locations.set(entity, key); }
  remove(entity: EntityId): void { const key = this.locations.get(entity); if (!key) return; const entities = this.chunks.get(key); entities?.delete(entity); if (entities?.size === 0) this.chunks.delete(key); this.locations.delete(entity); }
  inChunks(keys: ReadonlySet<ChunkKey>): EntityId[] { const result: EntityId[] = []; for (const key of keys) for (const entity of this.chunks.get(key) ?? []) result.push(entity); return result; }
  clear(): void { this.chunks.clear(); this.locations.clear(); }
}

export interface WorldQueryResult<T extends ComponentValue = ComponentValue> { entity: EntityState; components: Record<ComponentName, T>; }
export class WorldQuery {
  constructor(private readonly entities: EntityStore, private readonly components: ComponentStore, private readonly chunkIndex?: ChunkEntityIndex) {}
  with(...names: ComponentName[]): EntityState[] { const result: EntityState[] = []; for (const entity of this.entities.values()) if (names.every((name) => this.components.has(name, entity.id))) result.push(entity); return result; }
  withInChunks(chunks: ReadonlySet<ChunkKey>, ...names: ComponentName[]): EntityState[] { if (!this.chunkIndex) return this.with(...names); const result: EntityState[] = []; for (const id of this.chunkIndex.inChunks(chunks)) { const entity = this.entities.get(id); if (entity && names.every((name) => this.components.has(name, id))) result.push(entity); } return result; }
  one(id: EntityId, ...names: ComponentName[]): WorldQueryResult | undefined { const entity = this.entities.get(id); if (!entity || !names.every((name) => this.components.has(name, id))) return undefined; const values: Record<ComponentName, ComponentValue> = {}; for (const name of names) { const value = this.components.get(name, id); if (value) values[name] = value; } return { entity, components: values }; }
}

export type WorldMutation = { type: 'setTile'; x: number; y: number; tile: string } | { type: 'removeEntity'; entity: EntityId };
export class WorldMutationQueue { private readonly pending: WorldMutation[] = []; enqueue(mutation: WorldMutation): void { this.pending.push(mutation); } drain(): WorldMutation[] { return this.pending.splice(0, this.pending.length); } }

class RuntimeChunkManager {
  private readonly cache: ChunkCache; private readonly loaded = new Set<ChunkKey>();
  constructor(private world: WorldState, generator: ChunkGenerator = defaultChunkGenerator) { this.cache = new ChunkCache(generator); }
  bindWorld(world: WorldState, preserveLoaded = false): void { const loaded = preserveLoaded ? [...this.loaded] : []; this.world = world; this.cache.clear(); this.loaded.clear(); for (const key of loaded) { const parts = key.split(','); const x = Number(parts[0]); const y = Number(parts[1]); if (Number.isFinite(x) && Number.isFinite(y)) this.load({ x, y }); } }
  load(coord: ChunkCoord): GeneratedChunk { const chunk = this.getGenerated(coord); this.loaded.add(chunkKey(coord)); return chunk; }
  unload(coord: ChunkCoord): void { this.loaded.delete(chunkKey(coord)); this.cache.unload(coord); }
  isLoaded(coord: ChunkCoord): boolean { return this.loaded.has(chunkKey(coord)); }
  loadedKeys(): ReadonlySet<ChunkKey> { return this.loaded; }
  loadedCoords(): ChunkCoord[] { const result: ChunkCoord[] = []; for (const key of this.loaded) { const parts = key.split(','); const x = Number(parts[0]); const y = Number(parts[1]); if (Number.isFinite(x) && Number.isFinite(y)) result.push({ x, y }); } return result; }
  getGenerated(coord: ChunkCoord): GeneratedChunk { return this.cache.get(this.world.seed, coord); }
  getTile(x: number, y: number): string { const coord = worldToChunk({ x, y }); const local = worldToLocalTile({ x, y }); const chunk = this.getGenerated(coord); const modification = this.world.chunks[chunkKey(coord)]?.modifiedTiles[tileKey(local)]; return modification?.tile ?? chunk.tiles[local.y * CHUNK_SIZE + local.x] ?? 'ground'; }
  setTile(x: number, y: number, tile: string): void { const coord = worldToChunk({ x, y }); const local = worldToLocalTile({ x, y }); const key = chunkKey(coord); const persistence = this.world.chunks[key] ?? { key, modifiedTiles: {}, removedEntities: {} } as ChunkPersistence; this.world.chunks[key] = persistence; persistence.modifiedTiles[tileKey(local)] = { tile }; }
}

export class WorldRuntime {
  readonly entities = new EntityStore(); readonly components = new ComponentStore(); readonly spatial = new SpatialIndex(); readonly chunkEntities = new ChunkEntityIndex(); readonly query: WorldQuery; readonly mutations = new WorldMutationQueue(); private readonly chunks: RuntimeChunkManager;
  constructor(private _world: WorldState, generator?: ChunkGenerator) { this.chunks = new RuntimeChunkManager(_world, generator); this.query = new WorldQuery(this.entities, this.components, this.chunkEntities); this.hydrate(); }
  loadedChunkKeys(): ReadonlySet<ChunkKey> { return this.chunks.loadedKeys(); }
  loadedChunkCoords(): ChunkCoord[] { return this.chunks.loadedCoords(); }
  isChunkLoaded(coord: ChunkCoord): boolean { return this.chunks.isLoaded(coord); }
  loadChunk(coord: ChunkCoord): GeneratedChunk { return this.chunks.load(coord); }
  unloadChunk(coord: ChunkCoord): void { this.chunks.unload(coord); }
  getGeneratedChunk(coord: ChunkCoord): GeneratedChunk { return this.chunks.getGenerated(coord); }
  getTile(x: number, y: number): string { return this.chunks.getTile(x, y); }
  setTile(x: number, y: number, tile: string): void { this.chunks.setTile(x, y, tile); }
  exportWorld(): WorldState { return this._world; }
  readPersistence<T>(selector: (world: Readonly<WorldState>) => T): T { return selector(this._world); }
  updatePersistence(mutator: (world: WorldState) => void): void { mutator(this._world); }
  ensureChunkPersistence(coord: ChunkCoord): void { const key = chunkKey(coord); if (!this._world.chunks[key]) this._world.chunks[key] = { key, modifiedTiles: {}, removedEntities: {} }; }
  isResourceRemoved(key: string): boolean { return Boolean(this._world.removedResources[key]); }
  markResourceRemoved(key: string, type: 'tree' | 'rock'): void { this._world.removedResources[key] = type; }
  isChunkEntityRemoved(chunk: ChunkCoord, key: string): boolean { const persistence = this._world.chunks[chunkKey(chunk)]; return Boolean(persistence?.removedEntities[key]); }
  markChunkEntityRemoved(chunk: ChunkCoord, key: string): void { const normalized = chunkKey(chunk); const persistence = this._world.chunks[normalized] ?? { key: normalized, modifiedTiles: {}, removedEntities: {} } as ChunkPersistence; this._world.chunks[normalized] = persistence; persistence.removedEntities[key] = true; }
  getCropPersistence(key: string): CropState | undefined { const crop = this._world.crops[key]; return crop ? { ...crop } : undefined; }
  setCropPersistence(key: string, crop: CropState): void { this._world.crops[key] = { ...crop }; }
  removeCropPersistence(key: string): void { delete this._world.crops[key]; }
  replaceCropPersistence(crops: Record<string, CropState>): void { this._world.crops = Object.fromEntries(Object.entries(crops).map(([key, crop]) => [key, { ...crop }])); }
  ensureChunksAroundPixelPosition(position: PositionComponent, radius = 1): void { const center = worldToChunk({ x: Math.floor(position.x / TILE_SIZE), y: Math.floor(position.y / TILE_SIZE) }); const desired = new Set<ChunkKey>(); for (let y = center.y - radius; y <= center.y + radius; y++) for (let x = center.x - radius; x <= center.x + radius; x++) desired.add(chunkKey({ x, y })); for (const key of [...this.chunks.loadedKeys()]) if (!desired.has(key)) { const parts = key.split(','); const x = Number(parts[0]); const y = Number(parts[1]); if (Number.isFinite(x) && Number.isFinite(y)) this.unloadChunk({ x, y }); } for (const key of desired) { const parts = key.split(','); const x = Number(parts[0]); const y = Number(parts[1]); if (Number.isFinite(x) && Number.isFinite(y)) this.loadChunk({ x, y }); } }
  canMove(x: number, y: number): boolean { if (!Number.isFinite(x) || !Number.isFinite(y)) return false; const tileX = Math.floor(x / TILE_SIZE), tileY = Math.floor(y / TILE_SIZE); if (tileX >= HOME_MIN_X && tileX <= HOME_MAX_X && tileY >= HOME_MIN_Y && tileY <= HOME_MAX_Y) return false; const tile = this.getTile(tileX, tileY); return tile !== 'blocked' && tile !== 'water'; }
  rehydrate(world: WorldState): void { this._world = world; this.entities.clear(); this.components.clear(); this.spatial.clear(); this.chunkEntities.clear(); this.mutations.drain(); this.chunks.bindWorld(world, true); this.hydrate(); }
  private hydrate(): void {
    for (const entity of Object.values(this._world.entities.entities)) this.entities.add(entity);
    for (const [id, components] of Object.entries(this._world.entities.components ?? {})) {
      if (!this.entities.has(id as EntityId)) continue;
      for (const [name, value] of Object.entries(components)) this.setComponent(id as EntityId, name, value as ComponentValue);
    }
    for (const [key, crop] of Object.entries(this._world.crops)) {
      const id = `crop-${encodeURIComponent(key)}` as EntityId;
      if (this.entities.has(id)) continue;
      const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(key);
      if (!match) continue;
      const x = Number(match[1]);
      const y = Number(match[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      this.ensureEntity(id, 'crop', {
        position: { x, y },
        crop: { key, stage: crop.stage, watered: crop.watered, tilled: crop.tilled },
      });
    }
  }
  createEntity(kind: string, components: Record<ComponentName, ComponentValue> = {}): EntityId { const id = this.entities.create(kind); this._world.entities.entities[id] = { id, kind }; for (const [name, value] of Object.entries(components)) this.setComponent(id, name, value); return id; }
  ensureEntity(id: EntityId, kind: string, components: Record<ComponentName, ComponentValue> = {}): EntityId { if (!this.entities.has(id)) { this.entities.add({ id, kind }); this._world.entities.entities[id] = { id, kind }; } for (const [name, value] of Object.entries(components)) this.setComponent(id, name, value); return id; }
  removeEntity(id: EntityId): boolean { if (!this.entities.remove(id)) return false; this.components.removeEntity(id); this.spatial.remove(id); this.chunkEntities.remove(id); delete this._world.entities.entities[id]; if (this._world.entities.components) delete this._world.entities.components[id]; return true; }
  setComponent<T extends ComponentValue>(id: EntityId, name: ComponentName, value: T): void { if (!this.entities.has(id)) throw new Error(`Unknown entity: ${id}`); this.components.set(name, id, value); const entityComponents = this._world.entities.components ??= {}; const persisted = entityComponents[id] ??= {}; persisted[name] = { ...value }; if (name === 'position' && isPositionComponent(value)) { this.spatial.set(id, value); this.chunkEntities.set(id, value); } }
  removeComponent(id: EntityId, name: ComponentName): boolean { if (!this.entities.has(id)) throw new Error(`Unknown entity: ${id}`); const removed = this.components.remove(name, id); const persisted = this._world.entities.components?.[id]; if (persisted) { delete persisted[name]; if (Object.keys(persisted).length === 0) delete this._world.entities.components?.[id]; } if (name === 'position') { this.spatial.remove(id); this.chunkEntities.remove(id); } return removed; }
  applyMutations(): number { let applied = 0; for (const mutation of this.mutations.drain()) { if (mutation.type === 'setTile') { this.setTile(mutation.x, mutation.y, mutation.tile); applied++; } else if (this.removeEntity(mutation.entity)) applied++; } return applied; }
}