import type { DomainEventBus } from '../events';
import type { GameState } from '../types';
import type { GameStatePort } from '../store-ports';
import { WorldRuntime } from './runtime';
import { TILE_SIZE } from './WorldSystem';

export type ResourceType = 'tree' | 'rock';
export interface ResourceNode { key: string; type: ResourceType; x: number; y: number; ore: boolean; }
interface ResourceComponent { key: string; type: ResourceType; ore: boolean; }
export type WorldRuntimeFactory = (state: GameState) => WorldRuntime;
const INTERACTION_RANGE = 4;
const RESOURCE_KIND_PREFIX = 'resource:';

export class ResourceSystem {
  constructor(
    private readonly store: GameStatePort,
    private readonly events: DomainEventBus,
    private readonly runtime: WorldRuntime = new WorldRuntime(store.getState().world),
  ) { this.refresh(); }

  refresh(): void {
    this.store.update((state) => {
      this.runtime.rehydrate(state.world);
      this.ensureGenerated(this.runtime);
      this.commitRuntime(state, this.runtime);
    });
  }

  getAll(): ResourceNode[] { this.ensureGenerated(this.runtime); return this.readResources(this.runtime); }
  get(key: string): ResourceNode | undefined { return this.getAll().find((resource) => resource.key === key); }
  chopAt(x: number, y: number): boolean { const resource = this.findAt(x, y, 'tree'); return resource ? this.chop(resource.key) : false; }
  mineAt(x: number, y: number): boolean { const resource = this.findAt(x, y, 'rock'); return resource ? this.mine(resource.key) : false; }
  chop(key: string): boolean { return this.remove(key, 'tree', (state) => { state.inventory.wood += 3; }); }
  mine(key: string): boolean {
    const resource = this.get(key);
    if (!resource || resource.type !== 'rock' || this.isRemoved(key)) return false;
    this.store.update((state) => { state.world.removedResources[key] = 'rock'; state.inventory.stone += 2; if (resource.ore) state.inventory.ore += 1; });
    if (resource.ore) this.events.publish({ type: 'ORE_MINED', key });
    return true;
  }
  private findAt(x: number, y: number, type: ResourceType): ResourceNode | undefined {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
    const player = this.store.select((state) => state.player);
    const playerX = Math.floor(player.x / TILE_SIZE); const playerY = Math.floor(player.y / TILE_SIZE);
    if (Math.hypot(x - playerX, y - playerY) > INTERACTION_RANGE) return undefined;
    const key = `${type}:${x},${y}`; const resource = this.get(key); return resource && !this.isRemoved(key) ? resource : undefined;
  }
  private remove(key: string, type: ResourceType, apply: (state: GameState) => void): boolean {
    const resource = this.get(key);
    if (!resource || resource.type !== type || this.isRemoved(key)) return false;
    this.store.update((state) => { state.world.removedResources[key] = type; apply(state); });
    return true;
  }
  private isRemoved(key: string): boolean { return this.store.select((state) => Boolean(state.world.removedResources[key])); }
  private commitRuntime(state: GameState, runtime: WorldRuntime): void { state.world = runtime.world; }
  private ensureGenerated(runtime: WorldRuntime): void {
    const existing = new Set<string>();
    for (const entity of runtime.query.with('resource', 'position')) {
      const result = runtime.query.one(entity.id, 'resource', 'position');
      const resource = result?.components.resource as ResourceComponent | undefined;
      if (resource) existing.add(resource.key);
    }
    for (const resource of this.generate(runtime.world.seed)) {
      if (existing.has(resource.key)) continue;
      runtime.createEntity(`${RESOURCE_KIND_PREFIX}${resource.type}`, { position: { x: resource.x, y: resource.y }, resource: { key: resource.key, type: resource.type, ore: resource.ore } });
    }
  }
  private readResources(runtime: WorldRuntime): ResourceNode[] {
    const resources: ResourceNode[] = [];
    for (const entity of runtime.query.with('resource', 'position')) {
      const result = runtime.query.one(entity.id, 'resource', 'position'); if (!result) continue;
      const resource = result.components.resource as ResourceComponent | undefined;
      const position = result.components.position as { x: number; y: number } | undefined;
      if (!resource || !position) continue;
      resources.push({ key: resource.key, type: resource.type, x: position.x, y: position.y, ore: resource.ore });
    }
    return resources;
  }
  private generate(seed: number): ResourceNode[] {
    const resources: ResourceNode[] = []; const random = this.seeded(seed);
    for (let i = 0; i < 30; i += 1) { const x = 3 + Math.floor(random() * 63); const y = 3 + Math.floor(random() * 44); if (x > 25 && x < 46 && y > 15 && y < 37) continue; resources.push({ key: `tree:${x},${y}`, type: 'tree', x, y, ore: false }); }
    for (let i = 0; i < 20; i += 1) { const x = 54 + Math.floor(random() * 10); const y = 20 + Math.floor(random() * 15); resources.push({ key: `rock:${x},${y}`, type: 'rock', x, y, ore: i % 3 === 0 }); }
    return resources;
  }
  private seeded(seed: number): () => number { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
}
