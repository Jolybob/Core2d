import Phaser from 'phaser';
import {
  addMapping,
  getSelection,
  serializeMapping,
  serializeMappingAsTypescript,
  type TilesetEditorConfig,
  type TilesetMapping,
  type TilesetSelection,
} from './core';

export type TilesetPickerOptions = {
  textureKey: string;
  imagePath: string;
  tileWidth: number;
  tileHeight: number;
  initialMapping?: TilesetMapping;
  zoom?: number;
  title?: string;
};

export class TilesetPicker {
  private readonly scene: Phaser.Scene;
  private readonly options: TilesetPickerOptions;
  private readonly root: Phaser.GameObjects.Container;
  private readonly grid: Phaser.GameObjects.Graphics;
  private readonly selectionGraphics: Phaser.GameObjects.Graphics;
  private readonly info: Phaser.GameObjects.Text;
  private readonly mappingText: Phaser.GameObjects.Text;
  private mapping: TilesetMapping;
  private selection?: TilesetSelection;
  private startTile?: { x: number; y: number };
  private tilesetImage?: Phaser.GameObjects.Image;
  private nameInput?: HTMLInputElement;
  private mappingSelect?: HTMLSelectElement;
  private readonly config: TilesetEditorConfig;
  private readonly scale: number;

  constructor(scene: Phaser.Scene, options: TilesetPickerOptions) {
    this.scene = scene;
    this.options = options;
    this.mapping = structuredClone(options.initialMapping ?? {});
    const texture = scene.textures.get(options.textureKey);
    const source = texture.getSourceImage() as HTMLImageElement;
    this.config = {
      tileWidth: options.tileWidth,
      tileHeight: options.tileHeight,
      imageWidth: source.width,
      imageHeight: source.height,
    };
    this.scale = options.zoom ?? 2;
    this.root = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);
    this.grid = scene.add.graphics();
    this.selectionGraphics = scene.add.graphics();
    this.info = scene.add.text(16, 46, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' }).setScrollFactor(0);
    this.mappingText = scene.add.text(16, 88, '', { fontFamily: 'monospace', fontSize: '12px', color: '#d8f0ff' }).setScrollFactor(0);
    this.root.add([this.grid, this.selectionGraphics, this.info, this.mappingText]);
    this.buildUi();
    this.drawTileset();
    this.refreshInfo();
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.layout();
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.nameInput?.remove();
    this.mappingSelect?.remove();
    this.root.destroy(true);
  }

  getMapping(): TilesetMapping {
    return structuredClone(this.mapping);
  }

  exportJson(): string {
    return serializeMapping(this.config, this.options.imagePath, this.mapping);
  }

  exportTypescript(): string {
    return serializeMappingAsTypescript(this.mapping);
  }

  private buildUi(): void {
    const title = this.scene.add.text(16, 14, this.options.title ?? 'TILESET EDITOR', {
      fontFamily: 'monospace', fontSize: '18px', color: '#fff0c2', fontStyle: 'bold',
    }).setScrollFactor(0);
    this.root.add(title);

    const panel = this.scene.add.rectangle(0, 0, 330, 80, 0x111827, 0.94).setOrigin(0);
    panel.setStrokeStyle(1, 0x566174);
    this.root.addAt(panel, 0);

    this.nameInput = document.createElement('input');
    this.nameInput.placeholder = 'mapping name, e.g. water';
    this.nameInput.style.cssText = 'position:fixed;z-index:10001;width:170px;height:26px;background:#0b1220;color:#fff;border:1px solid #566174;padding:3px 7px;font-family:monospace;';
    document.body.appendChild(this.nameInput);

    this.mappingSelect = document.createElement('select');
    this.mappingSelect.style.cssText = 'position:fixed;z-index:10001;width:145px;height:28px;background:#0b1220;color:#fff;border:1px solid #566174;font-family:monospace;';
    document.body.appendChild(this.mappingSelect);
    this.refreshMappingSelect();

    const add = this.makeButton(196, 14, 'ADD / UPDATE', () => {
      if (!this.selection || !this.nameInput?.value.trim()) return;
      this.mapping = addMapping(this.mapping, this.nameInput.value, this.selection);
      this.refreshMappingSelect();
      this.refreshInfo();
    });
    const remove = this.makeButton(196, 48, 'REMOVE', () => {
      const name = this.mappingSelect?.value;
      if (!name) return;
      const next = { ...this.mapping };
      delete next[name];
      this.mapping = next;
      this.refreshMappingSelect();
      this.refreshInfo();
    });
    const exportJson = this.makeButton(302, 14, 'EXPORT JSON', () => this.download(this.exportJson(), 'tileset-mapping.json', 'application/json'));
    const exportTs = this.makeButton(302, 48, 'EXPORT TS', () => this.download(this.exportTypescript(), 'tileset-mapping.ts', 'text/plain'));
    const copy = this.makeButton(410, 14, 'COPY JSON', () => {
      void navigator.clipboard?.writeText(this.exportJson());
    });
    const copyTs = this.makeButton(410, 48, 'COPY TS', () => {
      void navigator.clipboard?.writeText(this.exportTypescript());
    });
    this.root.add([add, remove, exportJson, exportTs, copy, copyTs]);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.scene.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', backgroundColor: '#25324a', padding: { x: 6, y: 5 },
    }).setScrollFactor(0).setInteractive({ useHandCursor: true });
    button.on('pointerdown', onClick);
    return button;
  }

  private drawTileset(): void {
    const texture = this.scene.textures.get(this.options.textureKey);
    this.tilesetImage = this.scene.add.image(0, 0, this.options.textureKey).setOrigin(0).setScale(this.scale).setInteractive();
    this.root.addAt(this.tilesetImage, 1);
    this.tilesetImage.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.selectAt(pointer.x, pointer.y));
    this.tilesetImage.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.startTile) return;
      const tile = this.pointerTile(pointer.x, pointer.y);
      this.selection = getSelection(this.config, this.startTile.x, this.startTile.y, tile.x, tile.y);
      this.drawSelection();
      this.refreshInfo();
    });
    this.grid.lineStyle(1, 0xffffff, 0.18);
    const columns = Math.floor(texture.getSourceImage().width / this.config.tileWidth);
    const rows = Math.floor(texture.getSourceImage().height / this.config.tileHeight);
    for (let x = 0; x <= columns; x += 1) this.grid.lineBetween(x * this.config.tileWidth * this.scale, 0, x * this.config.tileWidth * this.scale, rows * this.config.tileHeight * this.scale);
    for (let y = 0; y <= rows; y += 1) this.grid.lineBetween(0, y * this.config.tileHeight * this.scale, columns * this.config.tileWidth * this.scale, y * this.config.tileHeight * this.scale);
    this.root.add(this.grid);
  }

  private pointerTile(pointerX: number, pointerY: number): { x: number; y: number } {
    const localX = pointerX - this.root.x - this.tilesetImage!.x;
    const localY = pointerY - this.root.y - this.tilesetImage!.y;
    return {
      x: Math.floor(localX / (this.config.tileWidth * this.scale)),
      y: Math.floor(localY / (this.config.tileHeight * this.scale)),
    };
  }

  private selectAt(pointerX: number, pointerY: number): void {
    const tile = this.pointerTile(pointerX, pointerY);
    this.startTile = tile;
    this.selection = getSelection(this.config, tile.x, tile.y);
    this.drawSelection();
    this.refreshInfo();
  }

  private drawSelection(): void {
    this.selectionGraphics.clear();
    if (!this.selection) return;
    this.selectionGraphics.lineStyle(2, 0xffd166, 1);
    this.selectionGraphics.strokeRect(
      this.selection.x * this.config.tileWidth * this.scale,
      this.selection.y * this.config.tileHeight * this.scale,
      this.selection.width * this.config.tileWidth * this.scale,
      this.selection.height * this.config.tileHeight * this.scale,
    );
  }

  private refreshInfo(): void {
    if (!this.selection) {
      this.info.setText(`Tile size: ${this.config.tileWidth}×${this.config.tileHeight}    Click or drag to select`);
    } else {
      this.info.setText(`Frame: ${this.selection.frame}    Region: ${this.selection.x},${this.selection.y} ${this.selection.width}×${this.selection.height}    Frames: [${this.selection.frames.join(', ')}]`);
    }
    const entries = Object.entries(this.mapping).map(([name, frames]) => `${name}: [${frames.join(', ')}]`);
    this.mappingText.setText(entries.length ? `Mappings\n${entries.join('\n')}` : 'Mappings\n(none yet)');
  }

  private refreshMappingSelect(): void {
    if (!this.mappingSelect) return;
    this.mappingSelect.replaceChildren();
    for (const name of Object.keys(this.mapping)) this.mappingSelect.add(new Option(name, name));
  }

  private layout(): void {
    const width = this.scene.scale.width;
    this.root.setPosition(Math.max(8, (width - this.root.width) / 2), 8);
    if (this.nameInput) {
      this.nameInput.style.left = `${this.root.x + 16}px`;
      this.nameInput.style.top = `${this.root.y + 116}px`;
    }
    if (this.mappingSelect) {
      this.mappingSelect.style.left = `${this.root.x + 16}px`;
      this.mappingSelect.style.top = `${this.root.y + 150}px`;
    }
  }

  private download(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
