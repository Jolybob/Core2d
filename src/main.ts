import Phaser from 'phaser';
import { Inventory } from './game/Inventory';
import { TILE_COLORS, TILE_SIZE, TileType, isMineable, miningYield } from './game/Tile';
import { WorldGenerator } from './game/WorldGenerator';

const WORLD_WIDTH = 80;
const WORLD_HEIGHT = 60;
const WORLD_SEED = 1337;
const PLAYER_SPEED = 180;
const MINE_RANGE = TILE_SIZE * 4;

class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private world!: TileType[][];
  private tiles!: Phaser.GameObjects.Rectangle[][];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private inventory = new Inventory();
  private hud!: Phaser.GameObjects.Text;
  private target!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('world');
  }

  create(): void {
    this.world = new WorldGenerator({
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      seed: WORLD_SEED,
      spawnClearRadius: 9,
    }).generate();

    this.renderWorld();
    this.createPlayer();
    this.createInput();
    this.createHud();
    this.createTargetIndicator();

    this.cameras.main
      .setBounds(0, 0, WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE)
      .setZoom(1.25)
      .startFollow(this.player, true, 0.12, 0.12);

    this.updateHud();
  }

  update(_time: number, delta: number): void {
    this.movePlayer(delta);
    this.updateTargetIndicator();
  }

  private renderWorld(): void {
    this.tiles = [];

    for (let y = 0; y < WORLD_HEIGHT; y += 1) {
      this.tiles[y] = [];
      for (let x = 0; x < WORLD_WIDTH; x += 1) {
        const tile = this.world[y][x];
        this.tiles[y][x] = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
          TILE_COLORS[tile],
        );
      }
    }
  }

  private createPlayer(): void {
    const spawnX = Math.floor(WORLD_WIDTH / 2);
    const spawnY = Math.floor(WORLD_HEIGHT / 2);

    this.player = this.add.rectangle(
      spawnX * TILE_SIZE + TILE_SIZE / 2,
      spawnY * TILE_SIZE + TILE_SIZE / 2,
      16,
      20,
      0xf0d090,
    );
    this.player.setDepth(10);
  }

  private createInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.mineAt(pointer.worldX, pointer.worldY);
    });
  }

  private createHud(): void {
    this.hud = this.add.text(16, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#111111cc',
      padding: { x: 10, y: 8 },
    }).setScrollFactor(0).setDepth(100);
  }

  private createTargetIndicator(): void {
    this.target = this.add.rectangle(0, 0, TILE_SIZE - 2, TILE_SIZE - 2)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setFillStyle(0xffffff, 0.05)
      .setDepth(20);
  }

  private movePlayer(delta: number): void {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    if (dx === 0 && dy === 0) return;

    const length = Math.hypot(dx, dy);
    const distance = PLAYER_SPEED * delta / 1000;
    dx = (dx / length) * distance;
    dy = (dy / length) * distance;

    this.player.x = Phaser.Math.Clamp(this.player.x + dx, 8, WORLD_WIDTH * TILE_SIZE - 8);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy, 10, WORLD_HEIGHT * TILE_SIZE - 10);
  }

  private mineAt(worldX: number, worldY: number): void {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    if (!this.isInsideWorld(tileX, tileY)) return;

    const tileCenterX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const tileCenterY = tileY * TILE_SIZE + TILE_SIZE / 2;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, tileCenterX, tileCenterY);
    if (distance > MINE_RANGE) return;

    const tile = this.world[tileY][tileX];
    if (!isMineable(tile)) return;

    this.inventory.addResources(miningYield(tile));
    this.world[tileY][tileX] = TileType.Air;
    this.tiles[tileY][tileX].setFillStyle(TILE_COLORS[TileType.Air]);
    this.updateHud();
  }

  private updateTargetIndicator(): void {
    const pointer = this.input.activePointer;
    const tileX = Math.floor(pointer.worldX / TILE_SIZE);
    const tileY = Math.floor(pointer.worldY / TILE_SIZE);

    if (!this.isInsideWorld(tileX, tileY)) {
      this.target.setVisible(false);
      return;
    }

    this.target
      .setVisible(true)
      .setPosition(tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE + TILE_SIZE / 2);

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.target.x,
      this.target.y,
    );
    this.target.setAlpha(distance <= MINE_RANGE ? 1 : 0.25);
  }

  private updateHud(): void {
    this.hud.setText([
      'CORE2D — Phaser 4',
      'WASD / arrows: move   |   LMB: mine',
      `Resources: ${this.inventory.totalResources}   |   Mine range: ${MINE_RANGE / TILE_SIZE} tiles`,
    ]);
  }

  private isInsideWorld(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT;
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: 960,
  height: 540,
  parent: 'game',
  backgroundColor: '#172018',
  scene: [WorldScene],
  render: {
    antialias: false,
    pixelArt: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
