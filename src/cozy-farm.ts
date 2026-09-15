import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { FarmInputController } from './cozy-farm-input';
import { FarmRenderer } from './cozy-farm-renderer';
import { buildFarmWorld, TILE, WORLD_TILESET_FRAME_SIZE, WORLD_TILESET_KEY, type FarmWorldRenderer, type ResourceView } from './cozy-farm-world';

const WORLD_TILESET_PATH = `${import.meta.env.BASE_URL}assets/tilesets/Tileset.png`;
const CHARACTER_PATH = `${import.meta.env.BASE_URL}assets/characters/main%20character/`;
const CHARACTER_FRAME_SIZE = 96;
const CHARACTER_DISPLAY_SIZE = 48;
const CHARACTER_COLUMNS = 12;
const CHARACTER_ASSETS = {
  idle: 'character-idle',
  walk: 'character-walk',
  attack: 'character-attack',
  bow: 'character-bow',
  hurt: 'character-hurt',
  death: 'character-death',
  mining: 'character-mining',
  woodChop: 'character-wood-chop',
} as const;

const characterAssetPaths: Record<keyof typeof CHARACTER_ASSETS, string> = {
  idle: `${CHARACTER_PATH}Char%20Idle.png`,
  walk: `${CHARACTER_PATH}Char%20Walk.png`,
  attack: `${CHARACTER_PATH}Char%20Attack.png`,
  bow: `${CHARACTER_PATH}Char%20Bow%20Shot.png`,
  hurt: `${CHARACTER_PATH}Char%20Hurt.png`,
  death: `${CHARACTER_PATH}Char%20Death.png`,
  mining: `${CHARACTER_PATH}Char%20Mining.png`,
  woodChop: `${CHARACTER_PATH}Char%20Wood%20Chop.png`,
};

const directionRows = { down: 0, left: 1, right: 2, up: 3 } as const;
type Direction = keyof typeof directionRows;

export class CozyFarm extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private target!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Text;
  private night!: Phaser.GameObjects.Rectangle;
  private resources: ResourceView[] = [];
  private inputController!: FarmInputController;
  private farmRenderer!: FarmRenderer;
  private worldRenderer!: FarmWorldRenderer;
  private direction: Direction = 'down';
  private previousPlayerX = 0;
  private previousPlayerY = 0;
  private previousHealth = 0;

  constructor() { super('CozyFarm'); }

  preload(): void {
    this.load.spritesheet(WORLD_TILESET_KEY, WORLD_TILESET_PATH, {
      frameWidth: WORLD_TILESET_FRAME_SIZE,
      frameHeight: WORLD_TILESET_FRAME_SIZE,
    });
    for (const [key, path] of Object.entries(characterAssetPaths)) {
      this.load.spritesheet(CHARACTER_ASSETS[key as keyof typeof CHARACTER_ASSETS], path, {
        frameWidth: CHARACTER_FRAME_SIZE,
        frameHeight: CHARACTER_FRAME_SIZE,
      });
    }
  }

  create(): void {
    this.createCharacterAnimations();
    const state = appRuntime.store.getState();
    this.resources = buildFarmWorld(this);
    this.worldRenderer = (this as Phaser.Scene & { farmWorldRenderer?: FarmWorldRenderer }).farmWorldRenderer!;
    this.player = this.add.sprite(state.player.x, state.player.y, CHARACTER_ASSETS.idle, 0)
      .setDisplaySize(CHARACTER_DISPLAY_SIZE, CHARACTER_DISPLAY_SIZE)
      .setOrigin(0.5, 0.65)
      .setDepth(20);
    this.target = this.add.rectangle(state.player.x, state.player.y, 24, 24, 0xffffff, 0).setStrokeStyle(1, 0xfff0b5).setDepth(19);
    this.hud = this.add.text(12, 10, '', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setScrollFactor(0).setDepth(50);
    this.night = this.add.rectangle(0, 0, 960, 640, 0x17203b, 0).setOrigin(0).setScrollFactor(0).setDepth(40);
    this.inputController = new FarmInputController(this);
    this.inputController.initialize();
    this.farmRenderer = new FarmRenderer(this, this.player, this.hud, this.night, this.resources);
    const unsubscribe = appRuntime.store.subscribe((next) => this.farmRenderer.renderState(next));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.worldRenderer.destroy();
      this.farmRenderer.destroy();
    });
    this.farmRenderer.renderState(state);
    this.farmRenderer.syncWorld(this.worldRenderer.getLoadedChunkKeys());
    this.previousPlayerX = state.player.x;
    this.previousPlayerY = state.player.y;
    this.previousHealth = state.player.health;
    this.player.play(`${CHARACTER_ASSETS.idle}-down`);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  override update(_time: number, delta: number): void {
    const attacked = this.inputController.update(delta, this.player.x, this.player.y);
    const dt = Math.min(delta, 50) / 1000;
    appRuntime.dispatch({ type: 'TICK', deltaSeconds: dt });
    const state = appRuntime.store.getState();
    const movedX = state.player.x - this.previousPlayerX;
    const movedY = state.player.y - this.previousPlayerY;
    const moving = Math.abs(movedX) > 0.01 || Math.abs(movedY) > 0.01;
    if (moving) {
      this.updateDirection(movedX, movedY);
    }

    this.player.setPosition(state.player.x, state.player.y);
    this.target.setPosition(Math.floor(state.player.x / TILE) * TILE + 12, Math.floor(state.player.y / TILE) * TILE + 12);
    this.worldRenderer.sync(state.player.x, state.player.y);
    this.farmRenderer.syncWorld(this.worldRenderer.getLoadedChunkKeys());
    this.farmRenderer.updateNight(state.calendar.clock);

    if (state.player.health <= 0 && this.previousHealth > 0) {
      this.playOneShot('death');
    } else if (state.player.health < this.previousHealth) {
      this.playOneShot('hurt');
    } else if (attacked) {
      this.playOneShot('attack');
    } else if (moving) {
      this.playLoop('walk');
    } else if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key.startsWith(`${CHARACTER_ASSETS.walk}-`)) {
      this.playLoop('idle');
    }

    this.previousPlayerX = state.player.x;
    this.previousPlayerY = state.player.y;
    this.previousHealth = state.player.health;
  }

  private createCharacterAnimations(): void {
    const looping = ['idle', 'walk'] as const;
    for (const type of Object.keys(CHARACTER_ASSETS) as Array<keyof typeof CHARACTER_ASSETS>) {
      const key = CHARACTER_ASSETS[type];
      for (const [direction, row] of Object.entries(directionRows) as Array<[Direction, number]>) {
        const animationKey = `${key}-${direction}`;
        if (this.anims.exists(animationKey)) continue;
        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(key, { start: row * CHARACTER_COLUMNS, end: row * CHARACTER_COLUMNS + CHARACTER_COLUMNS - 1 }),
          frameRate: type === 'walk' ? 12 : type === 'idle' ? 7 : 14,
          repeat: looping.includes(type as 'idle' | 'walk') ? -1 : 0,
        });
      }
    }
  }

  private updateDirection(dx: number, dy: number): void {
    if (Math.abs(dx) >= Math.abs(dy)) this.direction = dx < 0 ? 'left' : 'right';
    else this.direction = dy < 0 ? 'up' : 'down';
  }

  private playLoop(type: 'idle' | 'walk'): void {
    const key = `${CHARACTER_ASSETS[type]}-${this.direction}`;
    if (this.player.anims.currentAnim?.key !== key) this.player.play(key, true);
  }

  private playOneShot(type: 'attack' | 'hurt' | 'death'): void {
    const key = `${CHARACTER_ASSETS[type]}-${this.direction}`;
    this.player.play(key, true);
  }
}
