import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import type { GameState, ToolId } from './game/types';

const TILE = 24;
const WORLD_WIDTH = 80;
const WORLD_HEIGHT = 50;
const DAY_SECONDS = 120;

export class CozyFarm extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private target!: Phaser.GameObjects.Rectangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private unsubscribe?: () => void;

  constructor() {
    super('CozyFarm');
  }

  create(): void {
    this.buildWorld(appRuntime.store.getState().world.seed);
    this.player = this.add.rectangle(35 * TILE + 12, 27 * TILE + 12, 16, 18, 0xf2d39b);
    this.target = this.add.rectangle(this.player.x, this.player.y, 8, 8, 0xffd166, 0.25);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,F,B,L,P,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN') as Record<string, Phaser.Input.Keyboard.Key>;
    this.unsubscribe = appRuntime.store.subscribe((next) => this.renderState(next));
    this.events.once('shutdown', () => this.unsubscribe?.());
    this.events.once('destroy', () => this.unsubscribe?.());
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);
    let dx = 0;
    let dy = 0;
    if (this.keys.W?.isDown || this.keys.UP?.isDown) dy -= 1;
    if (this.keys.S?.isDown || this.keys.DOWN?.isDown) dy += 1;
    if (this.keys.A?.isDown || this.keys.LEFT?.isDown) dx -= 1;
    if (this.keys.D?.isDown || this.keys.RIGHT?.isDown) dx += 1;
    const sprint = Boolean(this.keys.SHIFT?.isDown);

    if (dx || dy) appRuntime.dispatch({ type: 'MOVE', dx, dy, sprint, deltaSeconds: dt });

    const slots: Array<[string, ToolId]> = [['ONE', 'hoe'], ['TWO', 'seeds'], ['THREE', 'water'], ['FOUR', 'axe'], ['FIVE', 'pick'], ['SIX', 'sword'], ['SEVEN', 'rod']];
    for (const [key, tool] of slots) if (Phaser.Input.Keyboard.JustDown(this.keys[key]!)) appRuntime.dispatch({ type: 'SELECT_TOOL', tool });
    if (Phaser.Input.Keyboard.JustDown(this.keys.E!)) this.actionAt(this.player.x, this.player.y);
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE!)) appRuntime.dispatch({ type: 'EAT', item: 'berry' });
    if (Phaser.Input.Keyboard.JustDown(this.keys.F!)) this.swing();
    if (Phaser.Input.Keyboard.JustDown(this.keys.B!)) appRuntime.dispatch({ type: 'BUY_SEEDS' });
    if (Phaser.Input.Keyboard.JustDown(this.keys.L!)) appRuntime.dispatch({ type: 'SHIP' });
    if (Phaser.Input.Keyboard.JustDown(this.keys.P!)) appRuntime.dispatch({ type: 'SAVE' });

    appRuntime.dispatch({ type: 'TICK', deltaSeconds: dt });
    const next = appRuntime.store.getState();
    this.player.setPosition(next.player.x, next.player.y);
    this.target.setPosition(Math.floor(next.player.x / TILE) * TILE + 12, Math.floor(next.player.y / TILE) * TILE + 12);
    this.updateNight(next.calendar.clock);
  }

  private buildWorld(seed: number): void {
    for (let y = 0; y < WORLD_HEIGHT; y += 1) for (let x = 0; x < WORLD_WIDTH; x += 1) {
      let tile = (x + y + seed) % 2 ? 0x6f9b4f : 0x739f52;
      if (x >= 27 && x <= 43 && y >= 19 && y <= 35) tile = (x + y) % 2 ? 0x9a6845 : 0xa06e4a;
      if (x >= 53 && x <= 64 && y >= 19 && y <= 35) tile = (x + y) % 3 ? 0x77736c : 0x88847b;
      this.add.rectangle(x * TILE + 12, y * TILE + 12, TILE, TILE, tile);
    }
    this.add.rectangle(35 * TILE + 12, 27 * TILE + 12, 11 * TILE, 7 * TILE, 0x8c5a3c);
  }

  private actionAt(x: number, y: number): void {
    const key = `${Math.floor(x / TILE)},${Math.floor(y / TILE)}`;
    const state = appRuntime.store.getState();
    const tool = state.player.tool;
    if (tool === 'hoe') appRuntime.dispatch({ type: 'TILL', key });
    else if (tool === 'seeds') appRuntime.dispatch({ type: 'PLANT', key });
    else if (tool === 'water') appRuntime.dispatch({ type: 'WATER', key });
    else if (tool === 'axe') appRuntime.dispatch({ type: 'CHOP', resourceKey: key });
    else if (tool === 'pick') appRuntime.dispatch({ type: 'MINE', resourceKey: key });
    else if (tool === 'rod') appRuntime.dispatch({ type: 'FISH', spotKey: key });
    else if (tool === 'sword') appRuntime.dispatch({ type: 'ATTACK' });
  }

  private swing(): void {
    this.target.setScale(1.5);
    this.time.delayedCall(90, () => this.target.setScale(1));
  }

  private renderState(state: GameState): void {
    this.player.setPosition(state.player.x, state.player.y);
    this.target.setPosition(Math.floor(state.player.x / TILE) * TILE + 12, Math.floor(state.player.y / TILE) * TILE + 12);
  }

  private updateNight(clock: number): void {
    const darkness = Math.max(0, Math.min(0.45, (clock / DAY_SECONDS - 0.65) * 1.2));
    this.cameras.main.setAlpha(1 - darkness * 0.25);
  }
}
