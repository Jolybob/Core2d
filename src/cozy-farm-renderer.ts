import Phaser from 'phaser';
import { DAY_SECONDS } from './game/systems/DaySystem';
import type { GameState } from './game/types';
import type { ResourceView } from './cozy-farm-world';
import { TILE } from './cozy-farm-world';

export class FarmRenderer {
  private cropGraphics = new Map<string, Phaser.GameObjects.Graphics>();
  private lastCropSignature = '';
  private lastRemovedSignature = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.GameObjects.Rectangle,
    private readonly hud: Phaser.GameObjects.Text,
    private readonly night: Phaser.GameObjects.Rectangle,
    private readonly resources: ResourceView[],
  ) {}

  renderState(state: GameState): void {
    this.player.setPosition(state.player.x, state.player.y);
    const season = ['Spring', 'Summer', 'Autumn', 'Winter'][state.calendar.season] ?? 'Spring';
    this.hud.setText(`${season} • DAY ${state.calendar.day}  $${state.player.money}\nHP ${Math.ceil(state.player.health)}  HUN ${Math.ceil(state.player.hunger)}  STA ${Math.ceil(state.player.stamina)}\n${state.player.tool.toUpperCase()} • ${state.calendar.weather}`);

    const cropSignature = JSON.stringify(state.world.crops);
    if (cropSignature !== this.lastCropSignature) {
      this.lastCropSignature = cropSignature;
      this.renderCrops(state);
    }

    const removedSignature = JSON.stringify(state.world.removedResources);
    if (removedSignature !== this.lastRemovedSignature) {
      this.lastRemovedSignature = removedSignature;
      for (const node of this.resources) node.object.visible = !Boolean(state.world.removedResources[node.key]);
    }
  }

  updateNight(clock: number): void {
    const phase = clock / DAY_SECONDS;
    this.night.setAlpha(phase > 0.68 ? Math.min(0.62, (phase - 0.68) * 2.2) : 0);
  }

  destroy(): void {
    for (const graphics of this.cropGraphics.values()) graphics.destroy();
    this.cropGraphics.clear();
  }

  private renderCrops(state: GameState): void {
    for (const graphics of this.cropGraphics.values()) graphics.destroy();
    this.cropGraphics.clear();

    for (const [key, crop] of Object.entries(state.world.crops)) {
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      const graphics = this.scene.add.graphics().setDepth(15);
      graphics
        .fillStyle(crop.stage === 0 ? 0x6b4b2f : crop.stage === 1 ? 0x70b85a : crop.stage === 2 ? 0x8bc34a : 0xd9bd4a)
        .fillRect(x * TILE + 3, y * TILE + 3, 18, 18);
      if (crop.stage > 0) {
        graphics
          .fillStyle(crop.watered ? 0x4e8cc0 : 0x355d3b)
          .fillCircle(x * TILE + 12, y * TILE + 13, crop.stage === 3 ? 7 : 4);
      }
      this.cropGraphics.set(key, graphics);
    }
  }
}
