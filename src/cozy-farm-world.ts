import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { CHUNK_SIZE, chunkKey, type ChunkCoord, type ChunkKey } from './game/world/chunks';
import { TILE_SIZE } from './game/world/chunks';
import type { EntityId } from './game/entity';

export const TILE = TILE_SIZE;
const RENDER_RADIUS = 1;
export type ResourceView = { key: string; x: number; y: number; type: 'tree' | 'rock'; ore: boolean; object: Phaser.GameObjects.GameObject & { visible: boolean }; };
export type WorldObjectView = { shape: 'ellipse' | 'rectangle' | 'label' | 'animal'; width?: number; height?: number; color?: number; stroke?: number; text?: string; };
const ensureWorldObject = (id: string, kind: string, x: number, y: number, view: WorldObjectView): void => { appRuntime.worldRuntime.ensureEntity(id as EntityId, kind, { position: { x, y }, worldObject: view }); };
const ensureStaticWorldObjects = (): void => {
  ensureWorldObject('world-pond', 'structure', 13, 11, { shape: 'ellipse', width: 230, height: 150, color: 0x4f8fa3, stroke: 0x315f70 });
  ensureWorldObject('world-home', 'structure', 35.5, 17, { shape: 'rectangle', width: 12 * TILE, height: 6 * TILE, color: 0xc18a55, stroke: 0x8d623e });
  ensureWorldObject('world-pond-label', 'landmark', 10, 8, { shape: 'label', text: 'FISHING POND', color: 0xd8f0ff });
  ensureWorldObject('world-home-label', 'landmark', 34, 17, { shape: 'label', text: 'HOME', color: 0xfff4dc });
  ensureWorldObject('world-quarry-label', 'landmark', 58, 25, { shape: 'label', text: 'QUARRY', color: 0xddd7cc });
  ensureWorldObject('world-forest-label', 'landmark', 9, 31, { shape: 'label', text: 'FOREST', color: 0xd7f0d0 });
  const animals = [['world-animal-1', 18, 14, 0xe7e1d2], ['world-animal-2', 22, 12, 0xb9c2c8], ['world-animal-3', 28, 30, 0xd6a66d], ['world-animal-4', 50, 20, 0x9b6f4f]] as const;
  for (const [id, x, y, color] of animals) ensureWorldObject(id, 'animal', x, y, { shape: 'animal', color });
};

export class FarmWorldRenderer {
  private readonly chunkObjects = new Map<ChunkKey, Phaser.GameObjects.Graphics>();
  private readonly chunkRevisions = new Map<ChunkKey, number>();
  private readonly resourceObjects = new Map<string, ResourceView>();
  constructor(private readonly scene: Phaser.Scene, private readonly resources: ResourceView[]) {}
  sync(playerX: number, playerY: number): void {
    const runtime = appRuntime.worldRuntime;
    const player = runtime.query.with('player').find((entity) => entity.kind === 'player');
    const position = player ? runtime.components.get<{ x: number; y: number }>('position', player.id) : undefined;
    runtime.ensureChunksAroundPixelPosition(position ?? { x: playerX, y: playerY }, RENDER_RADIUS);
    for (const key of [...this.chunkObjects.keys()]) {
      if (runtime.loadedChunkKeys().has(key)) continue;
      this.chunkObjects.get(key)?.destroy(); this.chunkObjects.delete(key); this.chunkRevisions.delete(key);
    }
    for (const coord of runtime.loadedChunkCoords()) {
      const key = chunkKey(coord); const revision = runtime.chunkRevision(coord); const current = this.chunkRevisions.get(key);
      if (!this.chunkObjects.has(key) || current !== revision) {
        this.chunkObjects.get(key)?.destroy(); this.chunkObjects.set(key, this.renderChunk(coord)); this.chunkRevisions.set(key, revision);
      }
    }
    this.syncResources();
  }
  getLoadedChunkKeys(): ReadonlySet<ChunkKey> { return appRuntime.worldRuntime.loadedChunkKeys(); }
  destroy(): void {
    for (const graphics of this.chunkObjects.values()) graphics.destroy(); this.chunkObjects.clear(); this.chunkRevisions.clear();
    for (const resource of this.resourceObjects.values()) resource.object.destroy(); this.resourceObjects.clear(); this.resources.splice(0, this.resources.length);
  }
  private renderChunk(coord: ChunkCoord): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics().setDepth(0); const runtime = appRuntime.worldRuntime; let currentBase: number | undefined;
    for (let localY = 0; localY < CHUNK_SIZE; localY += 1) for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
      const worldX = coord.x * CHUNK_SIZE + localX; const worldY = coord.y * CHUNK_SIZE + localY; const tile = runtime.getTile(worldX, worldY);
      const base = tile === 'water' ? 0x4f8fa3 : tile === 'stone' ? 0x77736c : (worldX + worldY) % 2 ? 0x6f9b4f : 0x739f52;
      if (base !== currentBase) { graphics.fillStyle(base, 1); currentBase = base; }
      graphics.fillRect(worldX * TILE + 1, worldY * TILE + 1, TILE - 2, TILE - 2);
    }
    return graphics;
  }
  private syncResources(): void {
    const runtime = appRuntime.worldRuntime;
    const loaded = runtime.loadedChunkKeys();
    const active = new Map<string, ResourceView>();
    for (const entity of runtime.query.withInChunks(loaded, 'resource', 'position')) {
      const result = runtime.query.one(entity.id, 'resource', 'position');
      const resource = result?.components.resource as { key: string; type: 'tree' | 'rock'; ore: boolean } | undefined;
      const position = result?.components.position as { x: number; y: number } | undefined;
      if (!resource || !position || runtime.world.removedResources[resource.key]) continue;
      active.set(resource.key, { key: resource.key, x: position.x, y: position.y, type: resource.type, ore: resource.ore, object: this.resourceObjects.get(resource.key)?.object ?? this.scene.add.rectangle(0, 0, 1, 1) });
    }
    for (const [key, view] of this.resourceObjects) { if (active.has(key)) continue; view.object.destroy(); this.resourceObjects.delete(key); }
    for (const resource of active.values()) {
      let view = this.resourceObjects.get(resource.key);
      if (!view) {
        const object = resource.type === 'tree' ? this.scene.add.container(resource.x * TILE + 12, resource.y * TILE + 12).setDepth(5) : this.scene.add.rectangle(resource.x * TILE + 12, resource.y * TILE + 12, 17, 17, resource.ore ? 0xb7864f : 0x77736c).setDepth(3);
        if (resource.type === 'tree') { const container = object as Phaser.GameObjects.Container; container.add(this.scene.add.rectangle(0, 10, 11, 22, 0x60452e)); container.add(this.scene.add.circle(0, -5, 17, 0x355d3b)); }
        view = { ...resource, object }; this.resourceObjects.set(resource.key, view);
      } else {
        view.x = resource.x; view.y = resource.y; view.ore = resource.ore;
        (view.object as Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle).setPosition(resource.x * TILE + 12, resource.y * TILE + 12);
        view.object.visible = true;
      }
    }
    this.resources.splice(0, this.resources.length, ...this.resourceObjects.values());
  }
}
export function buildFarmWorld(scene: Phaser.Scene): ResourceView[] { ensureStaticWorldObjects(); const resources: ResourceView[] = []; const renderer = new FarmWorldRenderer(scene, resources); const runtime = appRuntime.worldRuntime; const player = runtime.query.with('player').find((entity) => entity.kind === 'player'); const position = player ? runtime.components.get<{ x: number; y: number }>('position', player.id) : undefined; const state = appRuntime.store.getState(); renderer.sync(position?.x ?? state.player.x, position?.y ?? state.player.y); (scene as Phaser.Scene & { farmWorldRenderer?: FarmWorldRenderer }).farmWorldRenderer = renderer; return resources; }