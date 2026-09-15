import type { DomainEventBus } from '../events';
import type { GameState } from '../types';
import type { GameStatePort } from '../store-ports';
import { WorldRuntime, type ComponentValue } from './runtime';
import { CHUNK_SIZE, chunkKey, seededUnit, worldToChunk, type ChunkCoord } from './chunks';
import { TILE_SIZE } from './WorldSystem';

export type ResourceType = 'tree' | 'rock';
export interface ResourceNode { key: string; type: ResourceType; x: number; y: number; ore: boolean; }
type ResourceComponent = ComponentValue & { key: string; type: ResourceType; ore: boolean };
export type WorldRuntimeFactory = (state: GameState) => WorldRuntime;

const INTERACTION_RANGE = 4;
const RESOURCE_KIND_PREFIX = 'resource:';
const TREES_PER_CHUNK = 4;
const ROCKS_PER_CHUNK = 2;

export class ResourceSystem {
  constructor(
    private readonly store: GameStatePort,
    private readonly events: DomainEventBus,
    private readonly runtime: WorldRuntime = new WorldRuntime(store.getState().world),
  ) { this.refresh(); }

  refresh(): void {
    this.store.update((state) => {
      this.runtime.rehydrate(state.world);
      this.ensureGenerated(this.runtime, this.runtime.chunks.loadedCoords());
      this.commitRuntime(state, this.runtime);
    });
  }

  getAll(): ResourceNode[] {
    let chunks: ChunkCoord[] = [];
    this.store.update((state) => {
      this.runtime.rehydrate(state.world);
      chunks = this.runtime.chunks.loadedCoords();
      this.ensureGenerated(this.runtime, chunks);
      this.commitRuntime(state, this.runtime);
    });
    return this.readResources(this.runtime, chunks);
  }

  get(key: string): ResourceNode | undefined { return this.getAll().find((resource) => resource.key === key); }
  chopAt(x: number, y: number): boolean { const resource = this.findAt(x, y, 'tree'); return resource ? this.chop(resource.key) : false; }
  mineAt(x: number, y: number): boolean { const resource = this.findAt(x, y, 'rock'); return resource ? this.mine(resource.key) : false; }
  chop(key: string): boolean { return this.remove(key, 'tree', (state) => { state.inventory.wood += 3; }); }
  mine(key: string): boolean {
    const resource = this.get(key);
    if (!resource || resource.type !== 'rock' || this.isRemoved(key)) return false;
    this.removeRuntimeResource(key, resource);
    this.store.update((state) => { state.world.removedResources[key] = 'rock'; state.inventory.stone += 2; if (resource.ore) state.inventory.ore += 1; });
    if (resource.ore) this.events.publish({ type: 'ORE_MINED', key });
    return true;
  }

  private findAt(x: number, y: number, type: ResourceType): ResourceNode | undefined {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
    const player = this.store.select((state) => state.player);
    const playerX = Math.floor(player.x / TILE_SIZE);
    const playerY = Math.floor(player.y / TILE_SIZE);
    if (Math.hypot(x - playerX, y - playerY) > INTERACTION_RANGE) return undefined;
    const key = `${type}:${x},${y}`;
    const resource = this.get(key);
    return resource && !this.isRemoved(key) ? resource : undefined;
  }

  private remove(key: string, type: ResourceType, apply: (state: GameState) => void): boolean {
    const resource = this.get(key);
    if (!resource || resource.type !== type || this.isRemoved(key)) return false;
    this.removeRuntimeResource(key, resource);
    this.store.update((state) => { state.world.removedResources[key] = type; apply(state); });
    return true;
  }

  private removeRuntimeResource(key: string, resource: ResourceNode): void {
    const entity = this.findRuntimeResource(key);
    if (entity) this.runtime.removeEntity(entity.id);
    const chunk = chunkKey(worldToChunk({ x: resource.x, y: resource.y }));
    const persistence = this.runtime.world.chunks[chunk] ??= { key: chunk, modifiedTiles: {}, removedEntities: {} };
    persistence.removedEntities[key] = true;
  }

  private findRuntimeResource(key: string): { id: import('../entity').EntityId } | undefined {
    for (const entity of this.runtime.query.with('resource')) {
      const resource = this.runtime.components.get<ResourceComponent>('resource', entity.id);
      if (resource?.key === key) return entity;
    }
    return undefined;
  }

  private isRemoved(key: string): boolean { return this.store.select((state) => Boolean(state.world.removedResources[key])); }
  private commitRuntime(state: GameState, runtime: WorldRuntime): void { state.world = runtime.world; }

  private ensureGenerated(runtime: WorldRuntime, chunks: readonly ChunkCoord[]): void {
    const existing = new Set<string>();
    for (const entity of runtime.query.with('resource', 'position')) {
      const result = runtime.query.one(entity.id, 'resource', 'position');
      const resource = result?.components.resource as ResourceComponent | undefined;
      if (resource) existing.add(resource.key);
    }

    for (const chunk of chunks) {
      const key = chunkKey(chunk);
      const persistence = runtime.world.chunks[key] ??= { key, modifiedTiles: {}, removedEntities: {} };
      for (const resource of this.generateChunk(runtime.world.seed, chunk)) {
        if (existing.has(resource.key) || persistence.removedEntities[resource.key] || runtime.world.removedResources[resource.key]) continue;
        runtime.createEntity(`${RESOURCE_KIND_PREFIX}${resource.type}`, {
          position: { x: resource.x, y: resource.y },
          resource: { key: resource.key, type: resource.type, ore: resource.ore },
        });
        existing.add(resource.key);
      }
    }
  }

  private readResources(runtime: WorldRuntime, chunks: readonly ChunkCoord[]): ResourceNode[] {
    const allowed = new Set(chunks.map(chunkKey));
    const resources: ResourceNode[] = [];
    for (const entity of runtime.query.with('resource', 'position')) {
      const result = runtime.query.one(entity.id, 'resource', 'position');
      if (!result) continue;
      const resource = result.components.resource as ResourceComponent | undefined;
      const position = result.components.position as { x: number; y: number } | undefined;
      if (!resource || !position || this.isRemoved(resource.key)) continue;
      const chunk = worldToChunk({ x: Math.floor(position.x), y: Math.floor(position.y) });
      if (!allowed.has(chunkKey(chunk))) continue;
      resources.push({ key: resource.key, type: resource.type, x: position.x, y: position.y, ore: resource.ore });
    }
    return resources.sort((a, b) => a.key.localeCompare(b.key));
  }

  private generateChunk(seed: number, coord: ChunkCoord): ResourceNode[] {
    const resources: ResourceNode[] = [];
    for (let slot = 0; slot < TREES_PER_CHUNK; slot += 1) {
      const x = coord.x * CHUNK_SIZE + Math.floor(seededUnit(seed + 101, coord.x * 17 + slot, coord.y * 31 + 7) * CHUNK_SIZE);
      const y = coord.y * CHUNK_SIZE + Math.floor(seededUnit(seed + 211, coord.x * 29 + slot, coord.y * 13 + 11) * CHUNK_SIZE);
      if (this.isHomeTile(x, y)) continue;
      resources.push({ key: `tree:${x},${y}`, type: 'tree', x, y, ore: false });
    }
    for (let slot = 0; slot < ROCKS_PER_CHUNK; slot += 1) {
      const x = coord.x * CHUNK_SIZE + Math.floor(seededUnit(seed + 307, coord.x * 19 + slot, coord.y * 23 + 17) * CHUNK_SIZE);
      const y = coord.y * CHUNK_SIZE + Math.floor(seededUnit(seed + 401, coord.x * 37 + slot, coord.y * 7 + 19) * CHUNK_SIZE);
      if (this.isHomeTile(x, y)) continue;
      resources.push({ key: `rock:${x},${y}`, type: 'rock', x, y, ore: seededUnit(seed + 503, x, y) < 0.34 });
    }
    return resources;
  }

  private isHomeTile(x: number, y: number): boolean {
    return x >= 33 && x <= 37 && y >= 14 && y <= 20;
  }
}
