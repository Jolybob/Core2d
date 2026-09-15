import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/cozy-farm.ts';
const source = readFileSync(path, 'utf8');

if (!source.includes('new Phaser.Game')) {
  writeFileSync(path, `${source.trimEnd()}\n\nnew Phaser.Game({\n  type: Phaser.AUTO,\n  parent: 'game',\n  width: 960,\n  height: 640,\n  backgroundColor: '#739f52',\n  pixelArt: true,\n  antialias: false,\n  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },\n  scene: [CozyFarm],\n});\n`);
  console.log('Added Phaser game bootstrap.');
} else {
  console.log('Phaser game bootstrap already present.');
}
