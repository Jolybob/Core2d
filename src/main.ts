import Phaser from 'phaser';

const TILE = 24;
const WIDTH = 100;
const HEIGHT = 75;
const WORLD_SEED = 1337;
const PLAYER_SPEED = 170;
const SPRINT_SPEED = 270;
const MINE_RANGE = TILE * 3.5;
const MAX_HEALTH = 100;
const MAX_STAMINA = 100;
const STAMINA_DRAIN = 28;
const STAMINA_REGEN = 20;

const TILE_COLORS = {
  grass: 0x587c45, dirt: 0x765037, stone: 0x474a52, ore: 0xb86f35,
  water: 0x254b59, empty: 0x171c1a, crystal: 0x7862a8,
} as const;

type TileType = keyof typeof TILE_COLORS;
type MineableTile = Exclude<TileType, 'grass' | 'empty' | 'water'>;
type ItemType = 'wood' | 'ore' | 'stone' | 'crystal' | 'berry';

const ITEM_NAMES: Record<ItemType, string> = {
  wood: 'Wood', ore: 'Copper Ore', stone: 'Stone', crystal: 'Crystal', berry: 'Berry',
};

class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private core!: Phaser.GameObjects.Arc;
  private world!: TileType[][];
  private tiles!: Phaser.GameObjects.Rectangle[][];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private inventory: Partial<Record<ItemType, number>> = { wood: 6, berry: 2 };
  private selectedSlot = 0;
  private hotbar: ItemType[] = ['wood', 'stone', 'ore', 'crystal', 'berry'];
  private health = MAX_HEALTH;
  private hunger = 100;
  private stamina = MAX_STAMINA;
  private pickaxeLevel = 1;
  private selected = { x: 0, y: 0 };
  private hud!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private selection!: Phaser.GameObjects.Rectangle;
  private rng!: () => number;
  private enemies: Array<{ body: Phaser.GameObjects.Rectangle; hp: number; hitAt: number }> = [];
  private lastEnemySpawn = 0;
  private lastHungerDamage = 0;
  private survivalTime = 0;

  constructor() { super('world'); }

  create() {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for Core2D.');

    this.rng = this.seededRandom(WORLD_SEED);
    this.world = this.generateWorld();
    this.tiles = [];

    for (let y = 0; y < HEIGHT; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < WIDTH; x++) {
        this.tiles[y][x] = this.add.rectangle(
          x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 1, TILE - 1,
          TILE_COLORS[this.world[y][x]],
        );
      }
    }

    const spawnX = Math.floor(WIDTH / 2), spawnY = Math.floor(HEIGHT / 2);
    this.world[spawnY][spawnX] = 'grass';
    this.tiles[spawnY][spawnX].setFillStyle(TILE_COLORS.grass);
    this.core = this.add.circle(spawnX * TILE + TILE / 2, spawnY * TILE + TILE / 2, 13, 0x83d6c4).setStrokeStyle(3, 0xd8fff2).setDepth(18);
    this.player = this.add.rectangle(spawnX * TILE + TILE / 2, spawnY * TILE + TILE / 2, 15, 20, 0xf1cf91).setDepth(20);

    this.cursors = keyboard.createCursorKeys();
    this.keys = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W), A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S), D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      E: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E), SPACE: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      SHIFT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      ONE: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE), TWO: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      THREE: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE), FOUR: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      FIVE: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
    };

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.interactAt(pointer.worldX, pointer.worldY);
      if (pointer.rightButtonDown()) this.placeAt(pointer.worldX, pointer.worldY);
    });

    this.selection = this.add.rectangle(0, 0, TILE - 2, TILE - 2, 0xffffff, 0)
      .setStrokeStyle(2, 0xf5df8b).setDepth(15);
    this.hud = this.add.text(14, 12, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#fff', backgroundColor: '#101512dd',
      padding: { x: 9, y: 8 },
    }).setScrollFactor(0).setDepth(100);
    this.message = this.add.text(480, 14, 'Find resources and protect the Core', {
      fontFamily: 'monospace', fontSize: '15px', color: '#f5df8b', backgroundColor: '#101512cc',
      padding: { x: 8, y: 6 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    this.cameras.main.setBounds(0, 0, WIDTH * TILE, HEIGHT * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.25);
    this.lastEnemySpawn = this.time.now;
    this.spawnEnemy(spawnX + 10, spawnY + 6);
    this.updateHud();
    console.info('[Core2D] Gameplay systems online: sprinting, escalating enemies, survival loop');
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    this.survivalTime += dt;
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx--;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx++;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy--;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy++;

    const sprinting = Boolean(this.keys.SHIFT?.isDown) && (dx !== 0 || dy !== 0) && this.stamina > 0;
    const speed = sprinting ? SPRINT_SPEED : PLAYER_SPEED;
    if (sprinting) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * dt);
    } else {
      this.stamina = Math.min(MAX_STAMINA, this.stamina + STAMINA_REGEN * dt);
    }

    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      dx /= length; dy /= length;
      this.player.x = Phaser.Math.Clamp(this.player.x + dx * speed * dt, 8, WIDTH * TILE - 8);
      this.player.y = Phaser.Math.Clamp(this.player.y + dy * speed * dt, 10, HEIGHT * TILE - 10);
    }

    const numberKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
    for (let i = 0; i < numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[numberKeys[i]])) this.selectedSlot = i;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.craftPickaxe();
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.eatBerry();

    this.hunger = Math.max(0, this.hunger - dt * (sprinting ? 1.05 : 0.7));
    if (this.hunger <= 0 && this.time.now - this.lastHungerDamage > 1000) {
      this.lastHungerDamage = this.time.now;
      this.health = Math.max(0, this.health - 2);
    }
    if (this.health <= 0) this.respawn();

    const tileX = Phaser.Math.Clamp(Math.floor(this.player.x / TILE), 0, WIDTH - 1);
    const tileY = Phaser.Math.Clamp(Math.floor(this.player.y / TILE), 0, HEIGHT - 1);
    this.selected.x = tileX; this.selected.y = tileY;
    this.selection.setPosition(tileX * TILE + TILE / 2, tileY * TILE + TILE / 2);
    this.updateEnemies(dt, this.time.now);
    this.updateHud();
  }

  private interactAt(worldX: number, worldY: number) {
    const enemy = this.enemies.find((e) => Phaser.Math.Distance.Between(e.body.x, e.body.y, worldX, worldY) < 16);
    if (enemy && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.body.x, enemy.body.y) <= MINE_RANGE) {
      enemy.hp -= this.pickaxeLevel >= 2 ? 14 : 8;
      this.say(`Hit enemy (${Math.max(0, enemy.hp)} HP)`);
      if (enemy.hp <= 0) {
        enemy.body.destroy();
        this.enemies = this.enemies.filter((e) => e !== enemy);
        this.addItem('berry', 1);
        if (this.rng() > 0.55) this.addItem('ore', 1);
        this.say('Enemy defeated • loot recovered');
      }
      return;
    }
    this.mineAt(worldX, worldY);
  }

  private mineAt(worldX: number, worldY: number) {
    const x = Math.floor(worldX / TILE), y = Math.floor(worldY / TILE);
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const centerX = x * TILE + TILE / 2, centerY = y * TILE + TILE / 2;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, centerX, centerY) > MINE_RANGE) return this.say('Too far away.');
    const type = this.world[y][x];
    if (!this.isMineable(type)) return;
    const item: ItemType = type === 'ore' ? 'ore' : type === 'stone' ? 'stone' : type === 'crystal' ? 'crystal' : 'wood';
    const amount = type === 'crystal' ? 2 : type === 'ore' ? 2 : 1;
    this.addItem(item, amount);
    this.world[y][x] = 'empty';
    this.tiles[y][x].setFillStyle(TILE_COLORS.empty);
    this.say(`Mined ${amount} ${ITEM_NAMES[item]}`);
  }

  private placeAt(worldX: number, worldY: number) {
    const x = Math.floor(worldX / TILE), y = Math.floor(worldY / TILE), item = this.hotbar[this.selectedSlot];
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT || this.world[y][x] !== 'empty') return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, x * TILE + TILE / 2, y * TILE + TILE / 2) > MINE_RANGE) return this.say('Too far away.');
    if ((this.inventory[item] ?? 0) < 1) return this.say(`No ${ITEM_NAMES[item]}.`);
    this.inventory[item] = (this.inventory[item] ?? 0) - 1;
    this.world[y][x] = item === 'crystal' ? 'crystal' : item === 'ore' ? 'ore' : item === 'stone' ? 'stone' : 'dirt';
    this.tiles[y][x].setFillStyle(TILE_COLORS[this.world[y][x]]);
  }

  private craftPickaxe() {
    if (this.pickaxeLevel >= 2) return this.say('Copper pickaxe already crafted.');
    if ((this.inventory.wood ?? 0) < 8 || (this.inventory.ore ?? 0) < 4) return this.say('Pickaxe needs 8 Wood + 4 Copper Ore.');
    this.inventory.wood = (this.inventory.wood ?? 0) - 8;
    this.inventory.ore = (this.inventory.ore ?? 0) - 4;
    this.pickaxeLevel = 2;
    this.say('Crafted Copper Pickaxe! Mining damage increased.');
  }

  private eatBerry() {
    if ((this.inventory.berry ?? 0) < 1) return this.say('No berries.');
    this.inventory.berry = (this.inventory.berry ?? 0) - 1;
    this.hunger = Math.min(100, this.hunger + 30);
    this.health = Math.min(MAX_HEALTH, this.health + 8);
    this.say('Ate a berry.');
  }

  private spawnEnemy(tileX: number, tileY: number) {
    const x = Phaser.Math.Clamp(tileX, 1, WIDTH - 2), y = Phaser.Math.Clamp(tileY, 1, HEIGHT - 2);
    const tier = Math.min(4, Math.floor(this.survivalTime / 45));
    const hp = 20 + tier * 8;
    const size = 16 + tier * 2;
    const body = this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, size, size, 0xa24b58).setDepth(19);
    this.enemies.push({ body, hp, hitAt: 0 });
  }

  private updateEnemies(dt: number, time: number) {
    const spawnInterval = Math.max(6500, 15000 - Math.floor(this.survivalTime / 30) * 1000);
    const maxEnemies = Math.min(8, 3 + Math.floor(this.survivalTime / 60));
    if (time - this.lastEnemySpawn > spawnInterval && this.enemies.length < maxEnemies) {
      this.lastEnemySpawn = time;
      const angle = this.rng() * Math.PI * 2;
      const distance = 9 + Math.floor(this.rng() * 7);
      const px = Math.floor(this.player.x / TILE) + Math.round(Math.cos(angle) * distance);
      const py = Math.floor(this.player.y / TILE) + Math.round(Math.sin(angle) * distance);
      this.spawnEnemy(px, py);
      this.say('Something is hunting nearby...');
    }
    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, this.player.x, this.player.y);
      if (distance < 240) {
        const angle = Phaser.Math.Angle.Between(enemy.body.x, enemy.body.y, this.player.x, this.player.y);
        const tier = Math.max(0, Math.floor((enemy.hp - 20) / 8));
        enemy.body.x += Math.cos(angle) * (35 + tier * 5) * dt;
        enemy.body.y += Math.sin(angle) * (35 + tier * 5) * dt;
        if (distance < 22 && time > enemy.hitAt) {
          enemy.hitAt = time + Math.max(550, 900 - tier * 80);
          this.health = Math.max(0, this.health - (8 + tier * 2));
          this.say('Enemy attack!');
        }
      }
    }
  }

  private respawn() {
    this.health = MAX_HEALTH; this.hunger = 70; this.stamina = MAX_STAMINA;
    this.player.setPosition((WIDTH / 2) * TILE, (HEIGHT / 2) * TILE);
    this.say('You fell. The Core brought you home.');
  }

  private addItem(type: ItemType, count: number) { this.inventory[type] = (this.inventory[type] ?? 0) + count; }
  private isMineable(type: TileType): type is MineableTile { return type === 'dirt' || type === 'stone' || type === 'ore' || type === 'crystal'; }
  private say(text: string) { this.message.setText(text); }

  private updateHud() {
    const inv = this.hotbar.map((item, i) => `${i === this.selectedSlot ? '>' : ' '} ${i + 1}:${ITEM_NAMES[item]} ${(this.inventory[item] ?? 0)}`).join('\n');
    const minutes = Math.floor(this.survivalTime / 60);
    const seconds = Math.floor(this.survivalTime % 60).toString().padStart(2, '0');
    const coreX = WIDTH / 2 * TILE, coreY = HEIGHT / 2 * TILE;
    const distanceFromCore = Math.floor(Phaser.Math.Distance.Between(this.player.x, this.player.y, coreX, coreY) / TILE);
    this.hud.setText([
      'CORE2D — UNDERGROUND SURVIVAL',
      `HP ${Math.ceil(this.health)}/${MAX_HEALTH}   Hunger ${Math.ceil(this.hunger)}/100`,
      `Stamina ${Math.ceil(this.stamina)}/${MAX_STAMINA}   Depth ${distanceFromCore}m`,
      `Pickaxe Lv.${this.pickaxeLevel}   Threats ${this.enemies.length}   ${minutes}:${seconds}`,
      '──────── HOTBAR ────────', inv,
      'WASD / arrows move • SHIFT sprint • LMB mine/attack • RMB place',
      '1-5 select • E craft Copper Pickaxe • SPACE eat',
    ]);
  }

  private generateWorld(): TileType[][] {
    const world: TileType[][] = [];
    const cx = WIDTH / 2, cy = HEIGHT / 2;
    for (let y = 0; y < HEIGHT; y++) {
      world[y] = [];
      for (let x = 0; x < WIDTH; x++) {
        const distance = Math.hypot(x - cx, y - cy), n = this.rng();
        let type: TileType = distance < 7 ? 'grass' : n > 0.72 ? 'stone' : 'dirt';
        if (distance > 10 && n > 0.92) type = 'ore';
        if (distance > 20 && n > 0.975) type = 'crystal';
        if (n < 0.035 && distance > 9) type = 'water';
        world[y][x] = type;
      }
    }
    return world;
  }

  private seededRandom(seed: number) {
    let state = seed >>> 0;
    return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 0x100000000; };
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  backgroundColor: '#101712',
  pixelArt: true,
  scene: [WorldScene],
});
