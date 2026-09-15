import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { FarmInputController } from './cozy-farm-input';
import { FarmRenderer } from './cozy-farm-renderer';
import { buildFarmWorld, TILE, WORLD_TILESET_FRAME_SIZE, WORLD_TILESET_KEY, type FarmWorldRenderer, type ResourceView } from './cozy-farm-world';

export class CozyFarm extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private target!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Text;
  private night!: Phaser.GameObjects.Rectangle;
  private resources: ResourceView[] = [];
  private inputController!: FarmInputController;
  private farmRenderer!: FarmRenderer;
  private worldRenderer!: FarmWorldRenderer;
  private unsubscribe: (() => void) | undefined;

  constructor() { super('CozyFarm'); }

  preload(): void {
    this.load.spritesheet(WORLD_TILESET_KEY, '/assets/tilesets/Tileset.png', {
      frameWidth: WORLD_TILESET_FRAME_SIZE,
      frameHeight: WORLD_TILESET_FRAME_SIZE,
    });
  }

  create(): void {
    const state = appRuntime.store.getState();
    this.resources = buildFarmWorld(this);
    this.worldRenderer = (this as Phaser.Scene & { farmWorldRenderer?: FarmWorldRenderer }).farmWorldRenderer!;
    this.player = this.add.rectangle(state.player.x, state.player.y, 16, 20, 0xe7c48f).setDepth(20);
    this.target = this.add.rectangle(state.player.x, state.player.y, 24, 24, 0xffffff, 0).setStrokeStyle(1, 0xfff0b5).setDepth(19);
    this.hud = this.add.text(12, 10, '', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setScrollFactor(0).setDepth(50);
    this.night = this.add.rectangle(0, 0, 960, 640, 0x17203b, 0).setOrigin(0).setScrollFactor(0).setDepth(40);
    this.inputController = new FarmInputController(this);
    this.inputController.initialize();
    this.farmRenderer = new FarmRenderer(this, this.player, this.hud, this.night, this.resources);
    this.unsubscribe = appRuntime.store.subscribe((next) => this.farmRenderer.renderState(next));
    this.events.once('shutdown', this.cleanup, this);
    this.events.once('destroy', this.cleanup, this);
    this.farmRenderer.renderState(state);
    this.farmRenderer.syncWorld(this.worldRenderer.getLoadedChunkKeys());
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  override update(_time: number, delta: number): void {
    const attacked = this.inputController.update(delta, this.player.x, this.player.y);
    if (attacked) this.playAttackAnimation();
    const dt = Math.min(delta, 50) / 1000;
    appRuntime.dispatch({ type: 'TICK', deltaSeconds: dt });
    const state = appRuntime.store.getState();
    this.player.setPosition(state.player.x, state.player.y);
    this.target.setPosition(Math.floor(state.player.x / TILE) * TILE + 12, Math.floor(state.player.y / TILE) * TILE + 12);
    this.worldRenderer.sync(state.player.x, state.player.y);
    this.farmRenderer.syncWorld(this.worldRenderer.getLoadedChunkKeys());
    this.farmRenderer.updateNight(state.calendar.clock);
  }

  private playAttackAnimation(): void {
    this.tweens.add({ targets: this.player, scaleX: 1.35, duration: 90, yoyo: true });
  }

  private cleanup(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.worldRenderer?.destroy();
    this.farmRenderer?.destroy();
  }
}
