import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { DAY_SECONDS } from './game/systems/DaySystem';
import type { GameState, ToolId } from './game/types';

const TILE = 24;
const WORLD_WIDTH = 70;
const WORLD_HEIGHT = 48;

type TreeNode = { key: string; x: number; y: number; object: Phaser.GameObjects.Container };
type RockNode = { key: string; x: number; y: number; ore: boolean; object: Phaser.GameObjects.Rectangle };

export class CozyFarm extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private target!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Text;
  private night!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private trees: TreeNode[] = [];
  private rocks: RockNode[] = [];
  private cropGraphics = new Map<string, Phaser.GameObjects.Graphics>();
  private unsubscribe?: () => void;
  private lastCropSignature = '';
  private lastRemovedSignature = '';
  private lastAction = 0;

  constructor() { super('CozyFarm'); }

  create(): void {
    const state = appRuntime.store.getState();
    this.buildWorld(state.world.seed);
    this.player = this.add.rectangle(state.player.x, state.player.y, 16, 20, 0xe7c48f).setDepth(20);
    this.target = this.add.rectangle(state.player.x, state.player.y, 24, 24, 0xffffff, 0).setStrokeStyle(1, 0xfff0b5).setDepth(19);
    this.hud = this.add.text(12, 10, '', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setScrollFactor(0).setDepth(50);
    this.night = this.add.rectangle(0, 0, 960, 640, 0x17203b, 0).setOrigin(0).setScrollFactor(0).setDepth(40);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE,F,B,L,P,SHIFT,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN') as unknown as Record<string, Phaser.Input.Keyboard.Key>;
    this.unsubscribe = appRuntime.store.subscribe((next) => this.renderState(next));
    this.events.once('shutdown', () => this.unsubscribe?.());
    this.events.once('destroy', () => this.unsubscribe?.());
    this.renderState(state);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH * TILE, WORLD_HEIGHT * TILE);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const dx = ((this.cursors.left?.isDown ?? false) || this.isKeyDown('A') ? -1 : 0) + ((this.cursors.right?.isDown ?? false) || this.isKeyDown('D') ? 1 : 0);
    const dy = ((this.cursors.up?.isDown ?? false) || this.isKeyDown('W') ? -1 : 0) + ((this.cursors.down?.isDown ?? false) || this.isKeyDown('S') ? 1 : 0);
    const sprint = this.isKeyDown('SHIFT');

    if (dx || dy) {
      const state = appRuntime.store.getState();
      const length = Math.hypot(dx, dy);
      const speed = sprint && state.player.stamina > 2 ? 230 : 145;
      const nextX = Phaser.Math.Clamp(state.player.x + (dx / length) * speed * dt, 10, WORLD_WIDTH * TILE - 10);
      const nextY = Phaser.Math.Clamp(state.player.y + (dy / length) * speed * dt, 10, WORLD_HEIGHT * TILE - 10);
      if (!this.blocked(nextX, nextY)) appRuntime.dispatch({ type: 'MOVE', dx, dy, sprint, deltaSeconds: dt });
    }

    const slots: Array<[string, ToolId]> = [['ONE', 'hoe'], ['TWO', 'seeds'], ['THREE', 'water'], ['FOUR', 'axe'], ['FIVE', 'pick'], ['SIX', 'sword'], ['SEVEN', 'rod']];
    for (const [key, tool] of slots) if (Phaser.Input.Keyboard.JustDown(this.keys[key]!)) appRuntime.dispatch({ type: 'SELECT_TOOL', tool });
    if (Phaser.Input.Keyboard.JustDown(this.keys['E']!)) this.actionAt(this.player.x, this.player.y);
    if (Phaser.Input.Keyboard.JustDown(this.keys['SPACE']!)) appRuntime.dispatch({ type: 'EAT', item: 'berry' });
    if (Phaser.Input.Keyboard.JustDown(this.keys['F']!)) this.swing();
    if (Phaser.Input.Keyboard.JustDown(this.keys['B']!)) appRuntime.dispatch({ type: 'BUY_SEEDS' });
    if (Phaser.Input.Keyboard.JustDown(this.keys['L']!)) appRuntime.dispatch({ type: 'SHIP' });
    if (Phaser.Input.Keyboard.JustDown(this.keys['P']!)) appRuntime.dispatch({ type: 'SAVE' });

    appRuntime.dispatch({ type: 'TICK', deltaSeconds: dt });
    const next = appRuntime.store.getState();
    this.player.setPosition(next.player.x, next.player.y);
    this.target.setPosition(Math.floor(next.player.x / TILE) * TILE + 12, Math.floor(next.player.y / TILE) * TILE + 12);
    this.updateNight(next.calendar.clock);
  }

  private buildWorld(seed: number): void {
    for (let y = 0; y < WORLD_HEIGHT; y += 1) for (let x = 0; x < WORLD_WIDTH; x += 1) {
      let tile = (x + y) % 2 ? 0x6f9b4f : 0x739f52;
      if (x >= 27 && x <= 43 && y >= 19 && y <= 35) tile = (x + y) % 2 ? 0x9a6845 : 0xa06e4a;
      if (x >= 53 && x <= 64 && y >= 19 && y <= 35) tile = (x + y) % 3 ? 0x77736c : 0x88847b;
      this.add.rectangle(x * TILE + 12, y * TILE + 12, 23, 23, tile);
    }
    this.add.ellipse(13 * TILE, 11 * TILE, 230, 150, 0x4f8fa3).setDepth(2).setStrokeStyle(4, 0x315f70);
    this.add.text(10 * TILE, 8 * TILE, 'FISHING POND', { fontFamily: 'monospace', fontSize: '12px', color: '#fff0c2' }).setDepth(8);
    this.add.rectangle(35 * TILE + 12, 17 * TILE + 12, 12 * TILE, 6 * TILE, 0xc18a55).setDepth(5).setStrokeStyle(3, 0x7b5537);
    this.add.polygon(35 * TILE - 133, 17 * TILE - 43, [0, 55, 145, 0, 290, 55], 0x9a4e43).setDepth(6);
    this.add.text(35 * TILE + 12, 17 * TILE + 5, 'HOME', { fontFamily: 'monospace', fontSize: '13px', color: '#ffe6ad' }).setOrigin(0.5).setDepth(7);
    this.add.text(58 * TILE, 18 * TILE, 'QUARRY', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setDepth(8);
    this.add.text(7 * TILE, 36 * TILE, 'FOREST', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setDepth(8);
    const random = this.seeded(seed);
    for (let i = 0; i < 30; i += 1) {
      const x = 3 + Math.floor(random() * 63); const y = 3 + Math.floor(random() * 44);
      if (x > 25 && x < 46 && y > 15 && y < 37) continue;
      const key = `tree:${x},${y}`; const object = this.add.container(x * TILE + 12, y * TILE + 12).setDepth(5);
      object.add(this.add.rectangle(0, 10, 11, 22, 0x60452e)); object.add(this.add.circle(0, -5, 17, 0x355d3b)); this.trees.push({ key, x, y, object });
    }
    for (let i = 0; i < 20; i += 1) {
      const x = 54 + Math.floor(random() * 10); const y = 20 + Math.floor(random() * 15); const ore = i % 3 === 0; const key = `rock:${x},${y}`;
      const object = this.add.rectangle(x * TILE + 12, y * TILE + 12, 17, 17, ore ? 0xb7864f : 0x77736c).setDepth(3); this.rocks.push({ key, x, y, ore, object });
    }
    for (let i = 0; i < 5; i += 1) { const animal = this.add.ellipse((22 + i * 2) * TILE + 12, 34 * TILE + 12, 19, 14, 0xf1dfbd).setDepth(12); this.tweens.add({ targets: animal, y: animal.y + 3, duration: 700 + i * 80, yoyo: true, repeat: -1 }); }
  }

  private renderState(state: GameState): void {
    this.player?.setPosition(state.player.x, state.player.y);
    const season = ['Spring', 'Summer', 'Autumn', 'Winter'][state.calendar.season] ?? 'Spring';
    this.hud?.setText(`${season} • DAY ${state.calendar.day}  $${state.player.money}\nHP ${Math.ceil(state.player.health)}  HUN ${Math.ceil(state.player.hunger)}  STA ${Math.ceil(state.player.stamina)}\n${state.player.tool.toUpperCase()} • ${state.calendar.weather}`);
    const cropSignature = JSON.stringify(state.world.crops);
    if (cropSignature !== this.lastCropSignature) { this.lastCropSignature = cropSignature; this.renderCrops(state); }
    const removedSignature = JSON.stringify(state.world.removedResources);
    if (removedSignature !== this.lastRemovedSignature) {
      this.lastRemovedSignature = removedSignature;
      for (const node of [...this.trees, ...this.rocks]) node.object.visible = !Boolean(state.world.removedResources[node.key]);
    }
  }

  private renderCrops(state: GameState): void {
    for (const graphics of this.cropGraphics.values()) graphics.destroy();
    this.cropGraphics.clear();
    for (const [key, crop] of Object.entries(state.world.crops)) {
      const [xs, ys] = key.split(','); const x = Number(xs); const y = Number(ys);
      const graphics = this.add.graphics().setDepth(15);
      graphics.fillStyle(crop.stage === 0 ? 0x6b4b2f : crop.stage === 1 ? 0x70b85a : crop.stage === 2 ? 0x8bc34a : 0xd9bd4a).fillRect(x * TILE + 3, y * TILE + 3, 18, 18);
      if (crop.stage > 0) graphics.fillStyle(crop.watered ? 0x4e8cc0 : 0x355d3b).fillCircle(x * TILE + 12, y * TILE + 13, crop.stage === 3 ? 7 : 4);
      this.cropGraphics.set(key, graphics);
    }
  }

  private actionAt(worldX: number, worldY: number): void {
    if (this.time.now - this.lastAction < 160) return;
    this.lastAction = this.time.now;
    const state = appRuntime.store.getState(); const x = Math.floor(worldX / TILE); const y = Math.floor(worldY / TILE); const playerX = Math.floor(state.player.x / TILE); const playerY = Math.floor(state.player.y / TILE);
    if (Math.hypot(x - playerX, y - playerY) > 4) return;
    const key = `${x},${y}`;
    switch (state.player.tool) {
      case 'hoe': if (state.world.crops[key]?.stage === 3) appRuntime.dispatch({ type: 'HARVEST', key }); else appRuntime.dispatch({ type: 'TILL', key }); break;
      case 'seeds': appRuntime.dispatch({ type: 'PLANT', key }); break;
      case 'water': appRuntime.dispatch({ type: 'WATER', key }); break;
      case 'axe': this.tryChop(x, y); break;
      case 'pick': this.tryMine(x, y); break;
      case 'sword': this.swing(); break;
      case 'rod': appRuntime.dispatch({ type: 'FISH' }); break;
    }
  }

  private tryChop(x: number, y: number): void { const node = this.trees.find((entry) => Math.abs(entry.x - x) <= 1 && Math.abs(entry.y - y) <= 1); if (node) appRuntime.dispatch({ type: 'CHOP', resourceKey: node.key }); }
  private tryMine(x: number, y: number): void { const node = this.rocks.find((entry) => Math.abs(entry.x - x) <= 1 && Math.abs(entry.y - y) <= 1); if (node) appRuntime.dispatch({ type: 'MINE', resourceKey: node.key }); }
  private swing(): void { if (!appRuntime.dispatch({ type: 'ATTACK' })) return; this.tweens.add({ targets: this.player, scaleX: 1.35, duration: 90, yoyo: true }); }
  private blocked(x: number, y: number): boolean { const tx = Math.floor(x / TILE); const ty = Math.floor(y / TILE); return tx >= 33 && tx <= 37 && ty >= 14 && ty <= 20; }
  private updateNight(clock: number): void { const phase = clock / DAY_SECONDS; this.night.setAlpha(phase > 0.68 ? Math.min(0.62, (phase - 0.68) * 2.2) : 0); }
  private isKeyDown(key: string): boolean { return this.keys[key]?.isDown ?? false; }
  private seeded(seed: number): () => number { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
}
