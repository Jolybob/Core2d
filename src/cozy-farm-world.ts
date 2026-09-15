import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { CHUNK_SIZE, chunkKey, worldToChunk, type ChunkCoord } from './game/world/chunks';
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

export class FarmWorldRenderer {
  private readonly chunkObjects = new Map<string, Phaser.GameObjects.GameObject[]>();
  private readonly resourceObjects = new Map<string, ResourceView>();
  private loadedKeys = new Set<string>();

  constructor(private readonly scene: Phaser.Scene, private readonly resources: ResourceView[]) {}

  sync(playerX: number, playerY: number): void {
    const tileX = Math.floor(playerX / TILE);
    const tileY = Math.floor(playerY / TILE);
    const center = worldToChunk({ x: tileX, y: tileY });
    const desired: ChunkCoord[] = [];

    for (let y = center.y - RENDER_RADIUS; y <= center.y + RENDER_RADIUS; y += 1) {
      for (let x = center.x - RENDER_RADIUS; x <= center.x + RENDER_RADIUS; x += 1) desired.push({ x, y });
    }

    const desiredKeys = new Set(desired.map(chunkKey));
    for (const key of this.loadedKeys) {
      if (desiredKeys.has(key)) continue;
      for (const object of this.chunkObjects.get(key) ?? []) object.destroy();
      this.chunkObjects.delete(key);
    }

    for (const coord of desired) {
      const key = chunkKey(coord);
      if (this.chunkObjects.has(key)) continue;
      this.chunkObjects.set(key, this.renderChunk(coord));
    }
    this.loadedKeys = desiredKeys;

    this.syncResources();
  }

  destroy(): void {
    for (const objects of this.chunkObjects.values()) for (const object of objects) object.destroy();
    this.chunkObjects.clear();
    for (const resource of this.resourceObjects.values()) resource.object.destroy();
    this.resourceObjects.clear();
    this.resources.splice(0, this.resources.length);
    this.loadedKeys.clear();
  }

  private renderChunk(coord: ChunkCoord): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const runtime = appRuntime.worldRuntime;
    const chunk = runtime.chunks.getGenerated(coord);

    for (let localY = 0; localY < CHUNK_SIZE; localY += 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const worldX = coord.x * CHUNK_SIZE + localX;
        const worldY = coord.y * CHUNK_SIZE + localY;
        const tile = runtime.chunks.getTile(worldX, worldY);
        const base = tile === 'water'
          ? 0x4f8fa3
          : tile === 'stone'
            ? 0x77736c
            : (worldX + worldY) % 2 ? 0x6f9b4f : 0x739f52;
        const object = this.scene.add.rectangle(worldX * TILE + 12, worldY * TILE + 12, 23, 23, base);
        objects.push(object);
      }
    }

    // Keep the generated chunk materialized in the runtime cache without persisting generated tiles.
    void chunk;
    return objects;
  }

  private syncResources(): void {
    const active = new Map(appRuntime.resources.getAll().map((resource) => [resource.key, resource]));
    for (const [key, view] of this.resourceObjects) {
      if (active.has(key)) continue;
      view.object.destroy();
      this.resourceObjects.delete(key);
    }

    for (const resource of active.values()) {
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

export function buildFarmWorld(scene: Phaser.Scene): ResourceView[] {
  const resources: ResourceView[] = [];
  const renderer = new FarmWorldRenderer(scene, resources);
  renderer.sync(appRuntime.store.getState().player.x, appRuntime.store.getState().player.y);

  scene.add.ellipse(13 * TILE, 11 * TILE, 230, 150, 0x4f8fa3).setDepth(2).setStrokeStyle(4, 0x315f70);
  scene.add.text(10 * TILE, 8 * TILE, 'FISHING POND', { fontFamily: 'monospace', fontSize: '12px', color: '#fff0c2' }).setDepth(8);
  scene.add.rectangle(35 * TILE + 12, 17 * TILE + 12, 12 * TILE, 6 * TILE, 0xc18a55).setDepth(5).setStrokeStyle(3, 0x7b5537);
  scene.add.polygon(35 * TILE - 133, 17 * TILE - 43, [0, 55, 145, 0, 290, 55], 0x9a4e43).setDepth(6);
  scene.add.text(35 * TILE + 12, 17 * TILE + 5, 'HOME', { fontFamily: 'monospace', fontSize: '13px', color: '#ffe6ad' }).setOrigin(0.5).setDepth(7);
  scene.add.text(58 * TILE, 18 * TILE, 'QUARRY', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setDepth(8);
  scene.add.text(7 * TILE, 36 * TILE, 'FOREST', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setDepth(8);

  for (let i = 0; i < 5; i += 1) {
    const animal = scene.add.ellipse((22 + i * 2) * TILE + 12, 34 * TILE + 12, 19, 14, 0xf1dfbd).setDepth(12);
    scene.tweens.add({ targets: animal, y: animal.y + 3, duration: 700 + i * 80, yoyo: true, repeat: -1 });
  }

  // The scene owns the adapter; expose its initial resource set to existing renderer code.
  (scene as Phaser.Scene & { farmWorldRenderer?: FarmWorldRenderer }).farmWorldRenderer = renderer;
  return resources;
}
