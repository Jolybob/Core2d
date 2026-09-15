import Phaser from 'phaser';
import './background-fix.css';
import './polish.css';
import './corekeeper-ui.css';
import './game-ui.css';
import './accessibility-fix.ts';
import './version.ts';
import './ui-fix.ts';
import { CozyFarm } from './cozy-farm';
import { MainMenu } from './main-menu';
import { appRuntime } from './game/app-runtime';

export { appRuntime };

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  backgroundColor: '#17203b',
  pixelArt: true,
  antialias: false,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MainMenu, CozyFarm],
});
