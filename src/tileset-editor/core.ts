export type TilesetRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TilesetSelection = TilesetRegion & {
  frame: number;
  frames: number[];
};

export type TilesetEditorConfig = {
  tileWidth: number;
  tileHeight: number;
  imageWidth: number;
  imageHeight: number;
};

export type TilesetMapping = Record<string, number[]>;

export function getTilesetColumns(config: TilesetEditorConfig): number {
  return Math.max(1, Math.floor(config.imageWidth / config.tileWidth));
}

export function getTilesetRows(config: TilesetEditorConfig): number {
  return Math.max(1, Math.floor(config.imageHeight / config.tileHeight));
}

export function getFrameAt(config: TilesetEditorConfig, tileX: number, tileY: number): number {
  const columns = getTilesetColumns(config);
  return tileY * columns + tileX;
}

export function getTilePosition(config: TilesetEditorConfig, frame: number): { x: number; y: number } {
  const columns = getTilesetColumns(config);
  const safeFrame = Math.max(0, Math.floor(frame));
  return {
    x: safeFrame % columns,
    y: Math.floor(safeFrame / columns),
  };
}

export function getSelection(
  config: TilesetEditorConfig,
  startX: number,
  startY: number,
  endX = startX,
  endY = startY,
): TilesetSelection {
  const maxX = getTilesetColumns(config) - 1;
  const maxY = getTilesetRows(config) - 1;
  const x1 = Math.max(0, Math.min(maxX, Math.min(startX, endX)));
  const y1 = Math.max(0, Math.min(maxY, Math.min(startY, endY)));
  const x2 = Math.max(0, Math.min(maxX, Math.max(startX, endX)));
  const y2 = Math.max(0, Math.min(maxY, Math.max(startY, endY)));
  const frames: number[] = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) frames.push(getFrameAt(config, x, y));
  }
  return {
    x: x1,
    y: y1,
    width: x2 - x1 + 1,
    height: y2 - y1 + 1,
    frame: frames[0] ?? 0,
    frames,
  };
}

export function addMapping(mapping: TilesetMapping, name: string, selection: TilesetSelection): TilesetMapping {
  const key = name.trim();
  if (!key) return structuredClone(mapping);
  return { ...mapping, [key]: [...selection.frames] };
}

export function removeMapping(mapping: TilesetMapping, name: string): TilesetMapping {
  const next = { ...mapping };
  delete next[name];
  return next;
}

export function serializeMapping(
  config: TilesetEditorConfig,
  imagePath: string,
  mapping: TilesetMapping,
): string {
  return JSON.stringify({
    version: 1,
    image: imagePath,
    tileWidth: config.tileWidth,
    tileHeight: config.tileHeight,
    mapping,
  }, null, 2);
}
