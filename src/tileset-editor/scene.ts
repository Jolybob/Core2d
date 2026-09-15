import Phaser from 'phaser';
import { TilesetPicker, type TilesetPickerOptions } from './phaser-picker';

export type TilesetEditorSceneOptions = TilesetPickerOptions & {
  backgroundColor?: number;
};

export class TilesetEditorScene extends Phaser.Scene {
  private readonly editorOptions: TilesetEditorSceneOptions;
  private picker?: TilesetPicker;

  constructor(options: TilesetEditorSceneOptions) {
    super('TilesetEditor');
    this.editorOptions = options;
  }

  preload(): void {
    this.load.image(this.editorOptions.textureKey, this.editorOptions.imagePath);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.editorOptions.backgroundColor ?? 0x080d16);
    this.picker = new TilesetPicker(this, this.editorOptions);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.picker?.destroy());
  }

  getMapping(): Record<string, number[]> {
    return this.picker?.getMapping() ?? {};
  }
}
