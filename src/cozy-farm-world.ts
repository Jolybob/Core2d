import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';
import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './game/world/WorldSystem';

export const TILE = TILE_SIZE;

export type ResourceView = {
  key: string;
  x: number;
  y: number;
  type: 'tree' | 'rock';
  object: Phaser.GameObjects.GameObject & { visible: boolean };
};

export function buildFarmWorld(scene: Phaser.Scene): ResourceView[] {
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      let tile = (x + y) % 2 ? 0x6f9b4f : 0x739f52;
      if (x >= 27 && x <= 43 && y >= 19 && y <= 35) tile = (x + y) % 2 ? 0x9a6845 : 0xa06e4a;
      if (x >= 53 && x <= 64 && y >= 19 && y <= 35) tile = (x + y) % 3 ? 0x77736c : 0x88847b;
      scene.add.rectangle(x * TILE + 12, y * TILE + 12, 23, 23, tile);
    }
  }

  scene.add.ellipse(13 * TILE, 11 * TILE, 230, 150, 0x4f8fa3).setDepth(2).setStrokeStyle(4, 0x315f70);
  scene.add.text(10 * TILE, 8 * TILE, 'FISHING POND', { fontFamily: 'monospace', fontSize: '12px', color: '#fff0c2' }).setDepth(8);
  scene.add.rectangle(35 * TILE + 12, 17 * TILE + 12, 12 * TILE, 6 * TILE, 0xc18a55).setDepth(5).setStrokeStyle(3, 0x7b5537);
  scene.add.polygon(35 * TILE - 133, 17 * TILE - 43, [0, 55, 145, 0, 290, 55], 0x9a4e43).setDepth(6);
  scene.add.text(35 * TILE + 12, 17 * TILE + 5, 'HOME', { fontFamily: 'monospace', fontSize: '13px', color: '#ffe6ad' }).setOrigin(0.5).setDepth(7);
  scene.add.text(58 * TILE, 18 * TILE, 'QUARRY', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setDepth(8);
  scene.add.text(7 * TILE, 36 * TILE, 'FOREST', { fontFamily: 'monospace', fontSize: '13px', color: '#fff0c2' }).setDepth(8);

  const resources: ResourceView[] = [];
  for (const resource of appRuntime.resources.getAll()) {
    if (resource.type === 'tree') {
      const object = scene.add.container(resource.x * TILE + 12, resource.y * TILE + 12).setDepth(5);
      object.add(scene.add.rectangle(0, 10, 11, 22, 0x60452e));
      object.add(scene.add.circle(0, -5, 17, 0x355d3b));
      resources.push({ key: resource.key, x: resource.x, y: resource.y, type: resource.type, object });
    } else {
      const object = scene.add.rectangle(resource.x * TILE + 12, resource.y * TILE + 12, 17, 17, resource.ore ? 0xb7864f : 0x77736c).setDepth(3);
      resources.push({ key: resource.key, x: resource.x, y: resource.y, type: resource.type, object });
    }
  }

  for (let i = 0; i < 5; i += 1) {
    const animal = scene.add.ellipse((22 + i * 2) * TILE + 12, 34 * TILE + 12, 19, 14, 0xf1dfbd).setDepth(12);
    scene.tweens.add({ targets: animal, y: animal.y + 3, duration: 700 + i * 80, yoyo: true, repeat: -1 });
  }

  return resources;
}
