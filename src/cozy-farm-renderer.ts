import Phaser from 'phaser';
import { DAY_SECONDS } from './game/systems/DaySystem';
import type { ReadonlyDeep } from './game/store';
import { appRuntime } from './game/app-runtime';
import type { ResourceView } from './cozy-farm-world';
import { TILE } from './cozy-farm-world';
import { type ChunkKey } from './game/world/chunks';
import type { ComponentValue } from './game/world/runtime';

interface CropComponent extends ComponentValue { key: string; stage: number; watered: boolean; tilled: boolean; }
interface PositionComponent extends ComponentValue { x: number; y: number; }
interface PlayerComponent extends ComponentValue { x: number; y: number; health: number; stamina: number; hunger: number; money: number; tool: string; }
interface WorldObjectComponent extends ComponentValue { shape: 'ellipse' | 'rectangle' | 'label' | 'animal'; width?: number; height?: number; color?: number; stroke?: number; text?: string; }
interface EnemyComponent extends ComponentValue { key: string; kind: 'slime'; }
interface HealthComponent extends ComponentValue { health: number; maxHealth: number; }

const isCrop = (value: ComponentValue | undefined): value is CropComponent => typeof value?.key === 'string' && typeof value.stage === 'number' && typeof value.watered === 'boolean' && typeof value.tilled === 'boolean';
const isPosition = (value: ComponentValue | undefined): value is PositionComponent => typeof value?.x === 'number' && typeof value?.y === 'number';
const isPlayer = (value: ComponentValue | undefined): value is PlayerComponent => typeof value?.x === 'number' && typeof value?.y === 'number' && typeof value?.health === 'number' && typeof value?.stamina === 'number' && typeof value?.hunger === 'number' && typeof value?.money === 'number' && typeof value?.tool === 'string';
const isWorldObject = (value: ComponentValue | undefined): value is WorldObjectComponent => value?.shape === 'ellipse' || value?.shape === 'rectangle' || value?.shape === 'label' || value?.shape === 'animal';
const isEnemy = (value: ComponentValue | undefined): value is EnemyComponent => value?.kind === 'slime' && typeof value?.key === 'string';
const isHealth = (value: ComponentValue | undefined): value is HealthComponent => typeof value?.health === 'number' && typeof value?.maxHealth === 'number' && value.maxHealth > 0;

export class FarmRenderer {
  private cropGraphics = new Map<string, Phaser.GameObjects.Graphics>();
  private worldObjectGraphics = new Map<string, Phaser.GameObjects.GameObject[]>();
  private enemyGraphics = new Map<string, Phaser.GameObjects.GameObject[]>();
  private lastCropSignature = '';
  private lastWorldObjectSignature = '';
  private lastEnemySignature = '';
  private lastLoadedSignature = '';
  private lastRemovedSignature = '';

  constructor(private readonly scene: Phaser.Scene, private readonly player: Phaser.GameObjects.Rectangle, private readonly hud: Phaser.GameObjects.Text, private readonly night: Phaser.GameObjects.Rectangle, private readonly resources: ResourceView[]) {}

  renderState(state: ReadonlyDeep<import('./game/types').GameState>): void {
    const runtime = appRuntime.worldRuntime;
    const playerEntity = runtime.query.with('player').find((entity) => entity.kind === 'player');
    const playerComponent = playerEntity ? runtime.components.get('player', playerEntity.id) : undefined;
    const playerPosition = playerEntity ? runtime.components.get('position', playerEntity.id) : undefined;
    if (isPlayer(playerComponent)) {
      this.player.setPosition(playerComponent.x, playerComponent.y);
    } else if (isPosition(playerPosition)) {
      this.player.setPosition(playerPosition.x, playerPosition.y);
    }
    const season = ['Spring', 'Summer', 'Autumn', 'Winter'][state.calendar.season] ?? 'Spring';
    const hudPlayer = isPlayer(playerComponent) ? playerComponent : state.player;
    this.hud.setText(`${season} • DAY ${state.calendar.day}  $${hudPlayer.money}\nHP ${Math.ceil(hudPlayer.health)}  HUN ${Math.ceil(hudPlayer.hunger)}  STA ${Math.ceil(hudPlayer.stamina)}\n${hudPlayer.tool.toUpperCase()} • ${state.calendar.weather}`);
    const removedResources = runtime.readPersistence((world) => world.removedResources);
    const removedSignature = JSON.stringify(removedResources);
    if (removedSignature !== this.lastRemovedSignature) {
      this.lastRemovedSignature = removedSignature;
      for (const node of this.resources) node.object.visible = !Boolean(removedResources[node.key]);
    }
  }

  syncWorld(loadedChunkKeys: ReadonlySet<ChunkKey>): void {
    const loadedSignature = [...loadedChunkKeys].sort().join('|');
    const runtime = appRuntime.worldRuntime;
    const cropEntities = runtime.query.withInChunks(loadedChunkKeys, 'crop', 'position');
    const worldObjectEntities = runtime.query.withInChunks(loadedChunkKeys, 'worldObject', 'position');
    const enemyEntities = runtime.query.withInChunks(loadedChunkKeys, 'enemy', 'position', 'health');
    const cropSignature = cropEntities.map((entity) => `${entity.id}:${JSON.stringify(runtime.components.get('crop', entity.id))}:${JSON.stringify(runtime.components.get('position', entity.id))}`).sort().join('|');
    const worldObjectSignature = worldObjectEntities.map((entity) => `${entity.id}:${JSON.stringify(runtime.components.get('worldObject', entity.id))}:${JSON.stringify(runtime.components.get('position', entity.id))}`).sort().join('|');
    const enemySignature = enemyEntities.map((entity) => `${entity.id}:${JSON.stringify(runtime.components.get('enemy', entity.id))}:${JSON.stringify(runtime.components.get('position', entity.id))}:${JSON.stringify(runtime.components.get('health', entity.id))}`).sort().join('|');
    if (`${loadedSignature}::${cropSignature}::${worldObjectSignature}::${enemySignature}` === `${this.lastLoadedSignature}::${this.lastCropSignature}::${this.lastWorldObjectSignature}::${this.lastEnemySignature}`) return;
    this.lastLoadedSignature = loadedSignature;
    this.lastCropSignature = cropSignature;
    this.lastWorldObjectSignature = worldObjectSignature;
    this.lastEnemySignature = enemySignature;
    this.renderVisibleCrops(cropEntities);
    this.renderVisibleWorldObjects(worldObjectEntities);
    this.renderVisibleEnemies(enemyEntities);
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
    for (const objects of this.enemyGraphics.values()) for (const object of objects) object.destroy();
    this.enemyGraphics.clear();
  }

  private renderVisibleCrops(entities: readonly import('./game/entity').EntityState[]): void {
    for (const graphics of this.cropGraphics.values()) graphics.destroy();
    this.cropGraphics.clear();
    const runtime = appRuntime.worldRuntime;
    for (const entity of entities) {
      const crop = runtime.components.get('crop', entity.id);
      const position = runtime.components.get('position', entity.id);
      if (!isCrop(crop) || !isPosition(position)) continue;
      const graphics = this.scene.add.graphics().setDepth(15);
      graphics.fillStyle(crop.stage === 0 ? 0x6b4b2f : crop.stage === 1 ? 0x70b85a : crop.stage === 2 ? 0x8bc34a : 0xd9bd4a).fillRect(position.x * TILE + 3, position.y * TILE + 3, 18, 18);
      if (crop.stage > 0) graphics.fillStyle(crop.watered ? 0x4e8cc0 : 0x355d3b).fillCircle(position.x * TILE + 12, position.y * TILE + 13, crop.stage === 3 ? 7 : 4);
      this.cropGraphics.set(crop.key, graphics);
    }
  }

  private renderVisibleWorldObjects(entities: readonly import('./game/entity').EntityState[]): void {
    for (const objects of this.worldObjectGraphics.values()) for (const object of objects) object.destroy();
    this.worldObjectGraphics.clear();
    const runtime = appRuntime.worldRuntime;
    for (const entity of entities) {
      const view = runtime.components.get('worldObject', entity.id);
      const position = runtime.components.get('position', entity.id);
      if (!isWorldObject(view) || !isPosition(position)) continue;
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

  private renderVisibleEnemies(entities: readonly import('./game/entity').EntityState[]): void {
    for (const objects of this.enemyGraphics.values()) for (const object of objects) object.destroy();
    this.enemyGraphics.clear();
    const runtime = appRuntime.worldRuntime;
    for (const entity of entities) {
      const enemy = runtime.components.get('enemy', entity.id);
      const position = runtime.components.get('position', entity.id);
      const health = runtime.components.get('health', entity.id);
      if (!isEnemy(enemy) || !isPosition(position) || !isHealth(health)) continue;
      const px = position.x;
      const py = position.y;
      const body = this.scene.add.circle(px, py, 13, 0x5c3b78).setDepth(20);
      body.setStrokeStyle(2, 0xb995d6);
      const bar = this.scene.add.rectangle(px, py - 20, 26, 3, 0x7f1d1d).setDepth(21);
      const fill = this.scene.add.rectangle(px - 13, py - 20, 26 * Math.max(0, Math.min(1, health.health / health.maxHealth)), 3, 0x67c36b).setOrigin(0, 0.5).setDepth(22);
      this.enemyGraphics.set(entity.id, [body, bar, fill]);
    }
  }
}
