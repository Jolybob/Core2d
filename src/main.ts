import Phaser from 'phaser';

const TILE = 24;
const WIDTH = 80;
const HEIGHT = 60;
const WORLD_SEED = 1337;

const TILE_COLORS = {
  grass: 0x5d8c4a,
  dirt: 0x7a5236,
  stone: 0x4b4d55,
  ore: 0xb87333,
} as const;

type TileType = keyof typeof TILE_COLORS;

class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private world!: TileType[][];
  private tiles!: Phaser.GameObjects.Rectangle[][];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private selected = { x: 0, y: 0 };
  private inventory = 0;
  private hud!: Phaser.GameObjects.Text;
  private rng!: () => number;

  constructor() {
    super('world');
  }

  create() {
    this.rng = this.seededRandom(WORLD_SEED);
    this.world = this.generateWorld();
    this.tiles = [];

    for (let y = 0; y < HEIGHT; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < WIDTH; x++) {
        const type = this.world[y][x];
        this.tiles[y][x] = this.add.rectangle(
          x * TILE + TILE / 2,
          y * TILE + TILE / 2,
          TILE - 1,
          TILE - 1,
          TILE_COLORS[type],
        );
      }
    }

    const spawnX = Math.floor(WIDTH / 2);
    const spawnY = Math.floor(HEIGHT / 2);
    this.player = this.add.rectangle(
      spawnX * TILE + TILE / 2,
      spawnY * TILE + TILE / 2,
      16,
      20,
      0xf0d090,
    );
    this.player.setDepth(10);

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

    this.hud = this.add.text(16, 16, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#111111cc',
      padding: { x: 10, y: 8 },
    }).setScrollFactor(0).setDepth(100);

    this.cameras.main.setBounds(0, 0, WIDTH * TILE, HEIGHT * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.25);

    this.updateHud();
  }

  update(_time: number, delta: number) {
    const speed = 180;
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      const nextX = Phaser.Math.Clamp(this.player.x + dx * speed * delta / 1000, 8, WIDTH * TILE - 8);
      const nextY = Phaser.Math.Clamp(this.player.y + dy * speed * delta / 1000, 10, HEIGHT * TILE - 10);
      this.player.setPosition(nextX, nextY);
    }

    const tileX = Math.floor(this.player.x / TILE);
    const tileY = Math.floor(this.player.y / TILE);
    this.selected.x = tileX;
    this.selected.y = tileY;
    this.updateHud();
  }

  private mineAt(worldX: number, worldY: number) {
    const x = Math.floor(worldX / TILE);
    const y = Math.floor(worldY / TILE);
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;

    const type = this.world[y][x];
    if (type === 'stone' || type === 'ore' || type === 'dirt') {
      this.inventory += type === 'ore' ? 3 : 1;
      this.world[y][x] = 'dirt';
      this.tiles[y][x].setFillStyle(TILE_COLORS.dirt);
      this.updateHud();
    }
  }

  private updateHud() {
    this.hud.setText([
      'CORE2D — Phaser 4 prototype',
      'WASD / arrows: move   |   LMB: mine',
      `Resources: ${this.inventory}   |   Tile: ${this.selected.x},${this.selected.y}`,
    ]);
  }

  private generateWorld(): TileType[][] {
    const world: TileType[][] = [];
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    for (let y = 0; y < HEIGHT; y++) {
      world[y] = [];
      for (let x = 0; x < WIDTH; x++) {
        const distance = Math.hypot(x - cx, y - cy);
        const noise = this.rng();
        let type: TileType = distance < 9 ? 'grass' : noise > 0.66 ? 'stone' : 'dirt';
        if (distance > 14 && noise > 0.91) type = 'ore';
        world[y][x] = type;
      }
    }
    return world;
  }

  private seededRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
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
