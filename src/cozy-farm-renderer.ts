import Phaser from 'phaser';
import { DAY_SECONDS } from './game/systems/DaySystem';
import type { ReadonlyDeep } from './game/store';
import { appRuntime } from './game/app-runtime';
import type { ResourceView } from './cozy-farm-world';
import { TILE } from './cozy-farm-world';
import { chunkKey, worldToChunk, type ChunkKey } from './game/world/chunks';
import type { ComponentValue } from './game/world/runtime';

interface CropComponent extends ComponentValue { key: string; stage: number; watered: boolean; tilled: boolean; }
interface PositionComponent extends ComponentValue { x: number; y: number; }
interface WorldObjectComponent extends ComponentValue { shape: 'ellipse' | 'rectangle' | 'label' | 'animal'; width?: number; height?: number; color?: number; stroke?: number; text?: string; }

const isCrop = (value: ComponentValue | undefined): value is CropComponent => typeof value?.key === 'string' && typeof value.stage === 'number' && typeof value.watered === 'boolean' && typeof value.tilled === 'boolean';
const isPosition = (value: ComponentValue | undefined): value is PositionComponent => typeof value?.x === 'number' && typeof value?.y === 'number';
const isWorldObject = (value: ComponentValue | undefined): value is WorldObjectComponent => value?.shape === 'ellipse' || value?.shape === 'rectangle' || value?.shape === 'label' || value?.shape === 'animal';

export class FarmRenderer {
  private cropGraphics = new Map<string, Phaser.GameObjects.Graphics>();
  private worldObjectGraphics = new Map<string, Phaser.GameObjects.GameObject[]>();
  private lastCropSignature = '';
  private lastWorldObjectSignature = '';
  private lastLoadedSignature = '';
  private lastRemovedSignature = '';

  constructor(private readonly scene: Phaser.Scene, private readonly player: Phaser.GameObjects.Rectangle, private readonly hud: Phaser.GameObjects.Text, private readonly night: Phaser.GameObjects.Rectangle, private readonly resources: ResourceView[]) {}

  renderState(state: ReadonlyDeep<import('./game/types').GameState>): void {
    this.player.setPosition(state.player.x, state.player.y);
    const season = ['Spring', 'Summer', 'Autumn', 'Winter'][state.calendar.season] ?? 'Spring';
    this.hud.setText(`${season} • DAY ${state.calendar.day}  $${state.player.money}\nHP ${Math.ceil(state.player.health)}  HUN ${Math.ceil(state.player.hunger)}  STA ${Math.ceil(state.player.stamina)}\n${state.player.tool.toUpperCase()} • ${state.calendar.weather}`);
    const removedSignature = JSON.stringify(state.world.removedResources);
    if (removedSignature !== this.lastRemovedSignature) {
      this.lastRemovedSignature = removedSignature;
      for (const node of this.resources) node.object.visible = !Boolean(state.world.removedResources[node.key]);
    }
  }

  syncWorld(loadedChunkKeys: ReadonlySet<ChunkKey>): void {
    const loadedSignature = [...loadedChunkKeys].sort().join('|');
    const runtime = appRuntime.worldRuntime;
    const cropSignature = [...runtime.query.with('crop', 'position')].map((entity) => `${entity.id}:${JSON.stringify(runtime.components.get('crop', entity.id))}:${JSON.stringify(runtime.components.get('position', entity.id))}`).sort().join('|');
    const worldObjectSignature = [...runtime.query.with('worldObject', 'position')].map((entity) => `${entity.id}:${JSON.stringify(runtime.components.get('worldObject', entity.id))}:${JSON.stringify(runtime.components.get('position', entity.id))}`).sort().join('|');
    if (`${loadedSignature}::${cropSignature}::${worldObjectSignature}` === `${this.lastLoadedSignature}::${this.lastCropSignature}::${this.lastWorldObjectSignature}`) return;
    this.lastLoadedSignature = loadedSignature;
    this.lastCropSignature = cropSignature;
    this.lastWorldObjectSignature = worldObjectSignature;
    this.renderVisibleCrops(loadedChunkKeys);
    this.renderVisibleWorldObjects(loadedChunkKeys);
  }

  updateNight(clock: number): void {
    const phase = clock / DAY_SECONDS;
    this.night.setAlpha(phase > 0.68 ? Math.min(0.62, (phase - 0.68) * 2.2) : 0);
  }

  destroy(): void {
    for (const graphics of this.cropGraphics.values()) graphics.destroy();
    this.cropGraphics.clear();
    for (const objects of this.worldObjectGraphics.values()) for (const object of objects) object.destroy();
    this.worldObjectGraphics.clear();
  }

  private renderVisibleCrops(loadedChunkKeys: ReadonlySet<ChunkKey>): void {
    for (const graphics of this.cropGraphics.values()) graphics.destroy();
    this.cropGraphics.clear();
    const runtime = appRuntime.worldRuntime;
    for (const entity of runtime.query.with('crop', 'position')) {
      const crop = runtime.components.get('crop', entity.id);
      const position = runtime.components.get('position', entity.id);
      if (!isCrop(crop) || !isPosition(position)) continue;
      const chunk = chunkKey(worldToChunk({ x: Math.floor(position.x), y: Math.floor(position.y) }));
      if (!loadedChunkKeys.has(chunk)) continue;
      const graphics = this.scene.add.graphics().setDepth(15);
      graphics.fillStyle(crop.stage === 0 ? 0x6b4b2f : crop.stage === 1 ? 0x70b85a : crop.stage === 2 ? 0x8bc34a : 0xd9bd4a).fillRect(position.x * TILE + 3, position.y * TILE + 3, 18, 18);
      if (crop.stage > 0) graphics.fillStyle(crop.watered ? 0x4e8cc0 : 0x355d3b).fillCircle(position.x * TILE + 12, position.y * TILE + 13, crop.stage === 3 ? 7 : 4);
      this.cropGraphics.set(crop.key, graphics);
    }
  }

  private renderVisibleWorldObjects(loadedChunkKeys: ReadonlySet<ChunkKey>): void {
    for (const objects of this.worldObjectGraphics.values()) for (const object of objects) object.destroy();
    this.worldObjectGraphics.clear();
    const runtime = appRuntime.worldRuntime;
    for (const entity of runtime.query.with('worldObject', 'position')) {
      const view = runtime.components.get('worldObject', entity.id);
      const position = runtime.components.get('position', entity.id);
      if (!isWorldObject(view) || !isPosition(position)) continue;
      const chunk = chunkKey(worldToChunk({ x: Math.floor(position.x), y: Math.floor(position.y) }));
      if (!loadedChunkKeys.has(chunk)) continue;
      const objects: Phaser.GameObjects.GameObject[] = [];
      const px = position.x * TILE;
      const py = position.y * TILE;
      if (view.shape === 'ellipse') {
        const object = this.scene.add.ellipse(px, py, view.width ?? 0, view.height ?? 0, view.color ?? 0).setDepth(2);
        if (view.stroke !== undefined) object.setStrokeStyle(4, view.stroke);
        objects.push(object);
      } else if (view.shape === 'rectangle') {
        const object = this.scene.add.rectangle(px, py, view.width ?? TILE, view.height ?? TILE, view.color ?? 0).setDepth(5);
        if (view.stroke !== undefined) object.setStrokeStyle(4, view.stroke);
        objects.push(object);
      } else if (view.shape === 'label') {
        objects.push(this.scene.add.text(px, py, view.text ?? '', { fontFamily: 'monospace', fontSize: '16px', color: `#${(view.color ?? 0xffffff).toString(16).padStart(6, '0')}` }).setDepth(7));
      } else {
        objects.push(this.scene.add.rectangle(px + 12, py + 12, 18, 12, view.color ?? 0xffffff).setDepth(7));
        objects.push(this.scene.add.circle(px + 20, py + 8, 5, view.color ?? 0xffffff).setDepth(7));
      }
      this.worldObjectGraphics.set(entity.id, objects);
    }
  }
}
