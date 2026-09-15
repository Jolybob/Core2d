import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  ChunkCache,
  chunkKey,
  defaultChunkGenerator,
  seededUnit,
  tileKey,
  worldToChunk,
  worldToLocalTile,
} from './chunks';

describe('world chunks', () => {
  it('uses stable chunk coordinates, including negative tiles', () => {
    expect(worldToChunk({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(worldToChunk({ x: CHUNK_SIZE, y: CHUNK_SIZE })).toEqual({ x: 1, y: 1 });
    expect(worldToChunk({ x: -1, y: -1 })).toEqual({ x: -1, y: -1 });
    expect(worldToLocalTile({ x: -1, y: -1 })).toEqual({ x: CHUNK_SIZE - 1, y: CHUNK_SIZE - 1 });
  });

  it('creates stable persistence keys', () => {
    expect(chunkKey({ x: -2, y: 7 })).toBe('-2,7');
    expect(tileKey({ x: 12, y: 9 })).toBe('12,9');
  });

  it('generates identical terrain for the same seed and coordinate', () => {
    const a = defaultChunkGenerator.generate(2042, { x: 4, y: -3 });
    const b = defaultChunkGenerator.generate(2042, { x: 4, y: -3 });
    expect(a.tiles).toEqual(b.tiles);
    expect(seededUnit(2042, 100, -50)).toBe(seededUnit(2042, 100, -50));
  });

  it('changes generation when the world seed changes', () => {
    const a = defaultChunkGenerator.generate(2042, { x: 4, y: 2 });
    const b = defaultChunkGenerator.generate(2043, { x: 4, y: 2 });
    expect(a.tiles).not.toEqual(b.tiles);
  });

  it('caches generated chunks and supports unloading', () => {
    const cache = new ChunkCache();
    const a = cache.get(2042, { x: 1, y: 2 });
    const b = cache.get(2042, { x: 1, y: 2 });
    expect(a).toBe(b);
    expect(cache.has({ x: 1, y: 2 })).toBe(true);
    cache.unload({ x: 1, y: 2 });
    expect(cache.has({ x: 1, y: 2 })).toBe(false);
  });
});
