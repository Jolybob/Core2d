import Phaser from 'phaser';
import { appRuntime } from './game/app-runtime';

export class MainMenu extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private play!: Phaser.GameObjects.Text;
  private editor!: Phaser.GameObjects.Text;
  private tilejam!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  constructor() { super('MainMenu'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#17203b');
    this.title = this.add.text(0, 0, 'CORE 2D', {
      fontFamily: 'monospace', fontSize: '52px', color: '#fff0c2', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.subtitle = this.add.text(0, 0, 'A cozy world awaits', {
      fontFamily: 'monospace', fontSize: '18px', color: '#b9c7a3',
    }).setOrigin(0.5);
    this.play = this.add.text(0, 0, '[ PLAY ]', {
      fontFamily: 'monospace', fontSize: '30px', color: '#fff0c2', backgroundColor: '#395a35',
      padding: { left: 28, right: 28, top: 14, bottom: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.editor = this.add.text(0, 0, '[ CORE2D TILESET EDITOR ]', {
      fontFamily: 'monospace', fontSize: '17px', color: '#d8f0ff', backgroundColor: '#25324a',
      padding: { left: 18, right: 18, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tilejam = this.add.text(0, 0, '[ TILEJAM ]', {
      fontFamily: 'monospace', fontSize: '17px', color: '#ffe7b8', backgroundColor: '#4a3b2a',
      padding: { left: 22, right: 22, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.hint = this.add.text(0, 0, 'Click PLAY to generate your world', {
      fontFamily: 'monospace', fontSize: '14px', color: '#829172',
    }).setOrigin(0.5);

    this.play.on('pointerover', () => this.play.setScale(1.05));
    this.play.on('pointerout', () => this.play.setScale(1));
    this.play.on('pointerdown', () => {
      this.play.disableInteractive();
      this.play.setScale(1);
      this.play.setText('GENERATING WORLD...');
      this.hint.setText('Preparing your world...');
      appRuntime.startNewGame();
      this.time.delayedCall(250, () => this.scene.start('CozyFarm'));
    });

    this.editor.on('pointerover', () => this.editor.setScale(1.04));
    this.editor.on('pointerout', () => this.editor.setScale(1));
    this.editor.on('pointerdown', () => this.scene.start('TilesetEditor'));

    this.tilejam.on('pointerover', () => this.tilejam.setScale(1.04));
    this.tilejam.on('pointerout', () => this.tilejam.setScale(1));
    this.tilejam.on('pointerdown', () => {
      window.open(`${import.meta.env.BASE_URL}tilejam/`, '_blank', 'noopener,noreferrer');
    });

    this.layout(this.scale.gameSize);
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  private layout(gameSize: Phaser.Structs.Size): void {
    const centerX = gameSize.width / 2;
    this.title.setPosition(centerX, gameSize.height * 0.18);
    this.subtitle.setPosition(centerX, gameSize.height * 0.28);
    this.play.setPosition(centerX, gameSize.height * 0.45);
    this.editor.setPosition(centerX, gameSize.height * 0.59);
    this.tilejam.setPosition(centerX, gameSize.height * 0.71);
    this.hint.setPosition(centerX, gameSize.height * 0.84);
  }
}
