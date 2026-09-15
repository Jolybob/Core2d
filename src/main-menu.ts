import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';

export class MainMenu extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#17203b');

    this.add.text(width / 2, height * 0.25, 'CORE 2D', {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: '#fff0c2',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.36, 'A cozy world awaits', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#b9c7a3',
    }).setOrigin(0.5);

    const play = this.add.text(width / 2, height * 0.56, '[ PLAY ]', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#fff0c2',
      backgroundColor: '#395a35',
      padding: { left: 28, right: 28, top: 14, bottom: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    play.on('pointerover', () => play.setScale(1.05));
    play.on('pointerout', () => play.setScale(1));
    play.on('pointerdown', () => {
      play.disableInteractive();
      play.setText('GENERATING WORLD...');
      appRuntime.startNewGame();
      this.time.delayedCall(250, () => this.scene.start('CozyFarm'));
    });

    this.add.text(width / 2, height * 0.78, 'Click PLAY to generate your world', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#829172',
    }).setOrigin(0.5);

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  private layout(gameSize: Phaser.Structs.Size): void {
    this.children.each((child) => {
      if (!('x' in child) || !('y' in child)) return;
      const object = child as Phaser.GameObjects.GameObject & { x: number; y: number };
      const ratio = gameSize.height / 640;
      if (object === this.children.getAt(0)) object.setPosition(gameSize.width / 2, gameSize.height * 0.25);
      if (object === this.children.getAt(1)) object.setPosition(gameSize.width / 2, gameSize.height * 0.36);
      if (object === this.children.getAt(2)) object.setPosition(gameSize.width / 2, gameSize.height * 0.56);
      if (object === this.children.getAt(3)) object.setPosition(gameSize.width / 2, gameSize.height * 0.78);
      void ratio;
    });
  }
}
