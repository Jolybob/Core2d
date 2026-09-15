import { describe, expect, it } from 'vitest';
import { createEntityId } from '../entity';
import { createInitialWorldSave } from './world-save';
import { WorldRuntime } from './runtime';

const position = (x: number, y: number) => ({ x, y });

describe('WorldRuntime', () => {
  it('owns loaded chunk lifecycle independently of generated chunk caching', () => {
    const runtime = new WorldRuntime(createInitialWorldSave(42));
    expect(runtime.loadedChunkKeys()).toHaveLength(0);
    runtime.loadChunk({ x: -1, y: 2 });
    expect(runtime.isChunkLoaded({ x: -1, y: 2 })).toBe(true);
    expect(runtime.loadedChunkKeys()).toEqual(new Set(['-1,2']));
    runtime.unloadChunk({ x: -1, y: 2 });
    expect(runtime.isChunkLoaded({ x: -1, y: 2 })).toBe(false);
    expect(runtime.loadedChunkKeys()).toHaveLength(0);
  });
});
