import { describe, expect, it } from 'vitest';
import {
  addMapping,
  getFrameAt,
  getSelection,
  getTilePosition,
  serializeMappingAsTypescript,
} from './core';

const config = { tileWidth: 16, tileHeight: 16, imageWidth: 64, imageHeight: 32 };

describe('tileset editor core', () => {
  it('maps tile coordinates to frame ids', () => {
    expect(getFrameAt(config, 0, 0)).toBe(0);
    expect(getFrameAt(config, 3, 1)).toBe(7);
    expect(getTilePosition(config, 7)).toEqual({ x: 3, y: 1 });
  });

  it('selects a rectangular region in row-major order', () => {
    expect(getSelection(config, 1, 0, 2, 1)).toMatchObject({
      x: 1,
      y: 0,
      width: 2,
      height: 2,
      frame: 1,
      frames: [1, 2, 5, 6],
    });
  });

  it('creates portable mappings and TypeScript output', () => {
    const selection = getSelection(config, 2, 0, 2, 0);
    const mapping = addMapping({}, 'water', selection);
    expect(mapping).toEqual({ water: [2] });
    expect(serializeMappingAsTypescript(mapping)).toContain('"water": [2]');
  });
});
