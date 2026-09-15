import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import type { ToolId } from './game/types';
import { TILE } from './cozy-farm-world';
import type { ComponentValue } from './game/world/runtime';

type PlayerComponent = ComponentValue & { tool: ToolId };
type CropComponent = ComponentValue & { key: string; stage: number };

const isPlayerComponent = (value: ComponentValue | undefined): value is PlayerComponent => typeof value?.tool === 'string';
const isCropComponent = (value: ComponentValue | undefined): value is CropComponent => typeof value?.key === 'string' && typeof value.stage === 'number';

export class FarmInputController {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastAction = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  initialize(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for CozyFarm');
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys('W,A,S,D,E,SPACE,F,B,L,P,SHIFT,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN') as unknown as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(deltaMs: number, playerX: number, playerY: number): boolean {
    const dt = Math.min(deltaMs, 50) / 1000;
    const dx = ((this.cursors.left?.isDown ?? false) || this.isKeyDown('A') ? -1 : 0) + ((this.cursors.right?.isDown ?? false) || this.isKeyDown('D') ? 1 : 0);
    const dy = ((this.cursors.up?.isDown ?? false) || this.isKeyDown('W') ? -1 : 0) + ((this.cursors.down?.isDown ?? false) || this.isKeyDown('S') ? 1 : 0);
    const sprint = this.isKeyDown('SHIFT');

    if (dx || dy) appRuntime.dispatch({ type: 'MOVE', dx, dy, sprint, deltaSeconds: dt });

    const slots: Array<[string, ToolId]> = [['ONE', 'hoe'], ['TWO', 'seeds'], ['THREE', 'water'], ['FOUR', 'axe'], ['FIVE', 'pick'], ['SIX', 'sword'], ['SEVEN', 'rod']];
    for (const [key, tool] of slots) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[key]!)) appRuntime.dispatch({ type: 'SELECT_TOOL', tool });
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys['E']!)) this.actionAt(playerX, playerY);
    if (Phaser.Input.Keyboard.JustDown(this.keys['SPACE']!)) appRuntime.dispatch({ type: 'EAT', item: 'berry' });
    let attacked = false;
    if (Phaser.Input.Keyboard.JustDown(this.keys['F']!)) attacked = this.swing();
    if (Phaser.Input.Keyboard.JustDown(this.keys['B']!)) appRuntime.dispatch({ type: 'BUY_SEEDS' });
    if (Phaser.Input.Keyboard.JustDown(this.keys['L']!)) appRuntime.dispatch({ type: 'SHIP' });
    if (Phaser.Input.Keyboard.JustDown(this.keys['P']!)) appRuntime.dispatch({ type: 'SAVE' });

    return attacked;
  }

  private actionAt(worldX: number, worldY: number): void {
    if (this.scene.time.now - this.lastAction < 160) return;
    this.lastAction = this.scene.time.now;
    const runtime = appRuntime.worldRuntime;
    const playerEntity = runtime.query.with('player').find((entity) => entity.kind === 'player');
    const player = playerEntity ? runtime.components.get('player', playerEntity.id) : undefined;
    if (!isPlayerComponent(player)) return;
    const x = Math.floor(worldX / TILE);
    const y = Math.floor(worldY / TILE);
    const key = `${x},${y}`;

    switch (player.tool) {
      case 'hoe': {
        const cropEntity = runtime.query.with('crop').find((entity) => {
          const crop = runtime.components.get('crop', entity.id);
          return isCropComponent(crop) && crop.key === key;
        });
        const crop = cropEntity ? runtime.components.get('crop', cropEntity.id) : undefined;
        if (isCropComponent(crop) && crop.stage === 3) appRuntime.dispatch({ type: 'HARVEST', key });
        else appRuntime.dispatch({ type: 'TILL', key });
        break;
      }
      case 'seeds': appRuntime.dispatch({ type: 'PLANT', key }); break;
      case 'water': appRuntime.dispatch({ type: 'WATER', key }); break;
      case 'axe': appRuntime.dispatch({ type: 'CHOP_AT', x, y }); break;
      case 'pick': appRuntime.dispatch({ type: 'MINE_AT', x, y }); break;
      case 'sword': this.swing(); break;
      case 'rod': appRuntime.dispatch({ type: 'FISH' }); break;
    }
  }

  private swing(): boolean {
    return appRuntime.dispatch({ type: 'ATTACK' });
  }

  private isKeyDown(key: string): boolean {
    return this.keys[key]?.isDown ?? false;
  }
}
