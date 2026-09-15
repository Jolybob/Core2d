import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { CHUNK_SIZE, chunkKey, type ChunkCoord, type ChunkKey, TILE_SIZE } from './game/world/chunks';
import type { EntityId } from './game/entity';

export const TILE = TILE_SIZE;
const RENDER_RADIUS = 1;
const TILESET_KEY = 'world-tiles';
const TILESET_FRAME_SIZE = 16;

/**
 * The imported art is a 16x16 atlas. Keep the semantic mapping here so the
 * simulation never knows about art-frame indices.
 *
 * The world generator currently emits `ground`, `water`, and `stone`. Unknown
 * terrain falls back to grass so a future generator change cannot produce an
 * invalid Phaser frame lookup.
 */
const TILE_FRAMES: Record<string, number> = {
  ground: 0,
  grass: 0,
  water: 1,
  stone: 2,
};

export type ResourceView = {
  key: string;
  x: number;
  y: number;
  type: 'tree' | 'rock';
  ore: boolean;
  object: Phaser.GameObjects.GameObject & { visible: boolean };
};

export type WorldObjectView = {
  shape: 'ellipse' | 'rectangle' | 'label' | 'animal';
  width?: number;
  height?: number;
  color?: number;
  stroke?: number;
  text?: string;
};

const ensureWorldObject = (id: string, kind: string, x: number, y: number, view: WorldObjectView): void => {
  appRuntime.worldRuntime.ensureEntity(id as EntityId, kind, {
    position: { x, y },
    worldObject: view,
  });
};

const ensureStaticWorldObjects = (): void => {
  ensureWorldObject('world-pond', 'structure', 13, 11, { shape: 'ellipse', width: 230, height: 150, color: 0x4f8fa3, stroke: 0x315f70 });
  ensureWorldObject('world-home', 'structure', 35.5, 17, { shape: 'rectangle', width: 12 * TILE, height: 6 * TILE, color: 0xc18a55, stroke: 0x8d623e });
  ensureWorldObject('world-pond-label', 'landmark', 10, 8, { shape: 'label', text: 'FISHING POND', color: 0xd8f0ff });
  ensureWorldObject('world-home-label', 'landmark', 34, 17, { shape: 'label', text: 'HOME', color: 0xfff4dc });
  ensureWorldObject('world-quarry-label', 'landmark', 58, 25, { shape: 'label', text: 'QUARRY', color: 0xddd7cc });
  ensureWorldObject('world-forest-label', 'landmark', 9, 31, { shape: 'label', text: 'FOREST', color: 0xd7f0d0 });
  const animals = [
    ['world-animal-1', 18, 14, 0xe7e1d2],
    ['world-animal-2', 22, 12, 0xb9c2c8],
    ['world-animal-3', 28, 30, 0xd6a66d],
    ['world-animal-4', 50, 20, 0x9b6f4f],
  ] as const;
  for (const [id, x, y, color] of animals) ensureWorldObject(id, 'animal', x, y, { shape: 'animal', color });
};

export class FarmWorldRenderer {
  private readonly chunkObjects = new Map<ChunkKey, Phaser.GameObjects.Container>();
  private readonly resourceObjects = new Map<string, ResourceView>();

  constructor(private readonly scene: Phaser.Scene, private readonly resources: ResourceView[]) {}

  sync(playerX: number, playerY: number): void {
    const runtime = appRuntime.worldRuntime;
    const player = runtime.query.with('player').find((entity) => entity.kind === 'player');
    const position = player ? runtime.components.get<{ x: number; y: number }>('position', player.id) : undefined;
    runtime.ensureChunksAroundPixelPosition(position ?? { x: playerX, y: playerY }, RENDER_RADIUS);

    const loaded = runtime.loadedChunkKeys();
    for (const key of [...this.chunkObjects.keys()]) {
      if (loaded.has(key)) continue;
      this.chunkObjects.get(key)?.destroy(true);
      this.chunkObjects.delete(key);
    }

    for (const coord of runtime.loadedChunkCoords()) {
      const key = chunkKey(coord);
      if (this.chunkObjects.has(key)) continue;
      this.chunkObjects.set(key, this.renderChunk(coord));
    }

    this.syncResources();
  }

  getLoadedChunkKeys(): ReadonlySet<ChunkKey> {
    return appRuntime.worldRuntime.loadedChunkKeys();
  }

  destroy(): void {
    for (const container of this.chunkObjects.values()) container.destroy(true);
    this.chunkObjects.clear();
    for (const resource of this.resourceObjects.values()) resource.object.destroy();
    this.resourceObjects.clear();
    this.resources.splice(0, this.resources.length);
  }

  private renderChunk(coord: ChunkCoord): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0).setDepth(0);
    const runtime = appRuntime.worldRuntime;

    for (let localY = 0; localY < CHUNK_SIZE; localY += 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const worldX = coord.x * CHUNK_SIZE + localX;
        const worldY = coord.y * CHUNK_SIZE + localY;
        const tile = runtime.getTile(worldX, worldY);
        const frame = TILE_FRAMES[tile] ?? TILE_FRAMES.ground;
        const image = this.scene.add.image(worldX * TILE + TILE / 2, worldY * TILE + TILE / 2, TILESET_KEY, frame);
        image.setDisplaySize(TILE, TILE);
        image.setOrigin(0.5);
        container.add(image);
      }
    }

    return container;
  }

  private syncResources(): void {
    const runtime = appRuntime.worldRuntime;
    const loaded = runtime.loadedChunkKeys();
    const active = new Map<string, ResourceView>();

    for (const entity of runtime.query.withInChunks(loaded, 'resource', 'position')) {
      const result = runtime.query.one(entity.id, 'resource', 'position');
      const resource = result?.components.resource as { key: string; type: 'tree' | 'rock'; ore: boolean } | undefined;
      const position = result?.components.position as { x: number; y: number } | undefined;
      if (!resource || !position || runtime.isResourceRemoved(resource.key)) continue;
      active.set(resource.key, {
        key: resource.key,
        x: position.x,
        y: position.y,
        type: resource.type,
        ore: resource.ore,
        object: this.resourceObjects.get(resource.key)?.object ?? this.scene.add.rectangle(0, 0, 1, 1),
      });
    }

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

        view = { ...resource, object };
        this.resourceObjects.set(resource.key, view);
      } else {
        view.x = resource.x;
        view.y = resource.y;
        view.ore = resource.ore;
        (view.object as Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle).setPosition(resource.x * TILE + 12, resource.y * TILE + 12);
        view.object.visible = true;
      }
    }

    this.resources.splice(0, this.resources.length, ...this.resourceObjects.values());
  }
}

export function buildFarmWorld(scene: Phaser.Scene): ResourceView[] {
  ensureStaticWorldObjects();
  const resources: ResourceView[] = [];
  const renderer = new FarmWorldRenderer(scene, resources);
  const runtime = appRuntime.worldRuntime;
  const player = runtime.query.with('player').find((entity) => entity.kind === 'player');
  const position = player ? runtime.components.get<{ x: number; y: number }>('position', player.id) : undefined;
  const state = appRuntime.store.getState();
  renderer.sync(position?.x ?? state.player.x, position?.y ?? state.player.y);
  (scene as Phaser.Scene & { farmWorldRenderer?: FarmWorldRenderer }).farmWorldRenderer = renderer;
  return resources;
}

export const WORLD_TILESET_KEY = TILESET_KEY;
export const WORLD_TILESET_FRAME_SIZE = TILESET_FRAME_SIZE;
