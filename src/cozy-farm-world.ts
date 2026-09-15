import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { CHUNK_SIZE, chunkKey, worldToChunk, type ChunkCoord, type ChunkKey } from './game/world/chunks';
import { TILE_SIZE } from './game/world/WorldSystem';

export const TILE = TILE_SIZE;
const RENDER_RADIUS = 1;

export type ResourceView = {
  key: string;
  x: number;
  y: number;
  type: 'tree' | 'rock';
  object: Phaser.GameObjects.GameObject & { visible: boolean };
};

const chunkCoordFromKey = (key: ChunkKey): ChunkCoord | undefined => {
  const separator = key.indexOf(',');
  if (separator < 1) return undefined;
  const x = Number(key.slice(0, separator));
  const y = Number(key.slice(separator + 1));
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
};

export class FarmWorldRenderer {
  private readonly chunkObjects = new Map<ChunkKey, Phaser.GameObjects.Graphics>();
  private readonly resourceObjects = new Map<string, ResourceView>();
  private loadedKeys = new Set<ChunkKey>();

  constructor(private readonly scene: Phaser.Scene, private readonly resources: ResourceView[]) {}

  sync(playerX: number, playerY: number): void {
    const tileX = Math.floor(playerX / TILE);
    const tileY = Math.floor(playerY / TILE);
    const center = worldToChunk({ x: tileX, y: tileY });
    const desired: ChunkCoord[] = [];
    for (let y = center.y - RENDER_RADIUS; y <= center.y + RENDER_RADIUS; y += 1) {
      for (let x = center.x - RENDER_RADIUS; x <= center.x + RENDER_RADIUS; x += 1) desired.push({ x, y });
    }
    const desiredKeys = new Set<ChunkKey>(desired.map((coord) => chunkKey(coord)));
    for (const key of this.loadedKeys) {
      if (desiredKeys.has(key)) continue;
      this.chunkObjects.get(key)?.destroy();
      this.chunkObjects.delete(key);
      const coord = chunkCoordFromKey(key);
      if (coord) appRuntime.worldRuntime.chunks.unload(coord);
    }
    for (const coord of desired) {
      const key = chunkKey(coord);
      appRuntime.worldRuntime.chunks.load(coord);
      if (this.chunkObjects.has(key)) continue;
      this.chunkObjects.set(key, this.renderChunk(coord));
    }
    this.loadedKeys = desiredKeys;
    this.syncResources();
  }

  getLoadedChunkKeys(): ReadonlySet<ChunkKey> { return this.loadedKeys; }

  destroy(): void {
    for (const graphics of this.chunkObjects.values()) graphics.destroy();
    this.chunkObjects.clear();
    for (const key of this.loadedKeys) {
      const coord = chunkCoordFromKey(key);
      if (coord) appRuntime.worldRuntime.chunks.unload(coord);
    }
    for (const resource of this.resourceObjects.values()) resource.object.destroy();
    this.resourceObjects.clear();
    this.resources.splice(0, this.resources.length);
    this.loadedKeys.clear();
  }

  private renderChunk(coord: ChunkCoord): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics().setDepth(0);
    const runtime = appRuntime.worldRuntime;
    let currentBase: number | undefined;

    for (let localY = 0; localY < CHUNK_SIZE; localY += 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const worldX = coord.x * CHUNK_SIZE + localX;
        const worldY = coord.y * CHUNK_SIZE + localY;
        const tile = runtime.chunks.getTile(worldX, worldY);
        const base = tile === 'water'
          ? 0x4f8fa3
          : tile === 'stone'
            ? 0x77736c
            : (worldX + worldY) % 2
              ? 0x6f9b4f
              : 0x739f52;
        if (base !== currentBase) {
          graphics.fillStyle(base, 1);
          currentBase = base;
        }
        graphics.fillRect(worldX * TILE + 1, worldY * TILE + 1, TILE - 2, TILE - 2);
      }
    }
    return graphics;
  }

  private syncResources(): void {
    const active = new Map(appRuntime.resources.getAll().map((resource) => [resource.key, resource]));
    for (const [key, view] of this.resourceObjects) {
      const resource = active.get(key);
      const chunk = resource && chunkKey(worldToChunk({ x: Math.floor(resource.x), y: Math.floor(resource.y) }));
      if (resource && chunk && this.loadedKeys.has(chunk)) continue;
      view.object.destroy();
      this.resourceObjects.delete(key);
    }
    for (const resource of active.values()) {
      const chunk = chunkKey(worldToChunk({ x: Math.floor(resource.x), y: Math.floor(resource.y) }));
      if (!this.loadedKeys.has(chunk)) continue;
      let view = this.resourceObjects.get(resource.key);
      if (!view) {
        const object = resource.type === 'tree'
          ? this.scene.add.container(resource.x * TILE + 12, resource.y * TILE + 12).setDepth(5)
          : this.scene.add.rectangle(resource.x * TILE + 12, resource.y * TILE + 12, 17, 17, resource.ore ? 0xb7864f : 0x77736c).setDepth(3);
        if (resource.type === 'tree') {
          const container = object as Phaser.GameObjects.Container;
          container.add(this.scene.add.rectangle(0, 10, 11, 22, 0x60452e));
          container.add(this.scene.add.circle(0, -5, 17, 0x355d3b));
        }
        view = { key: resource.key, x: resource.x, y: resource.y, type: resource.type, object };
        this.resourceObjects.set(resource.key, view);
      }
      view.object.visible = !Boolean(appRuntime.store.getState().world.removedResources[resource.key]);
    }
    this.resources.splice(0, this.resources.length, ...this.resourceObjects.values());
  }
}