import Phaser from 'phaser';
import { TilesetPicker, type TilesetPickerOptions } from './phaser-picker';

export type TilesetEditorSceneOptions = TilesetPickerOptions & {
  backgroundColor?: number;
};

export const DEFAULT_TILESET_EDITOR_OPTIONS: TilesetEditorSceneOptions = {
  textureKey: 'editor-tileset',
  imagePath: `${import.meta.env.BASE_URL}assets/tilesets/Tileset.png`,
  tileWidth: 16,
  tileHeight: 16,
  zoom: 2,
  title: 'CORE 2D TILESET EDITOR',
  backgroundColor: 0x080d16,
};

export class TilesetEditorScene extends Phaser.Scene {
  private picker?: TilesetPicker;

  constructor() {
    super('TilesetEditor');
  }

  preload(): void {
    const options = DEFAULT_TILESET_EDITOR_OPTIONS;
    this.load.image(options.textureKey, options.imagePath);
  }

  create(): void {
    const options = DEFAULT_TILESET_EDITOR_OPTIONS;
    this.cameras.main.setBackgroundColor(options.backgroundColor ?? 0x080d16);
    this.picker = new TilesetPicker(this, options);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
    this.add.text(16, this.scale.height - 28, 'ESC  Back to menu', {
      fontFamily: 'monospace', fontSize: '12px', color: '#829172',
    }).setScrollFactor(0).setDepth(1001);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.picker?.destroy());
  }

  getMapping(): Record<string, number[]> {
    return this.picker?.getMapping() ?? {};
  }
}
