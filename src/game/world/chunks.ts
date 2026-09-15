export const CHUNK_SIZE = 64 as const;
export const TILE_SIZE = 24 as const;

export interface ChunkCoord {
  x: number;
  y: number;
}

export interface TileCoord {
  x: number;
  y: number;
}

export type ChunkKey = `${number},${number}`;

export interface TileModification {
  /** Runtime tile id after a player/world modification. */
  tile: string;
}

/** Only persistent changes belong in a chunk save. Generated terrain is reconstructed from the world seed. */
export interface ChunkPersistence {
  key: ChunkKey;
  modifiedTiles: Record<string, TileModification>;
  removedEntities: Record<string, true>;
}

export const chunkKey = ({ x, y }: ChunkCoord): ChunkKey => `${x},${y}`;

export function worldToChunk(tile: TileCoord): ChunkCoord {
  return {
    x: Math.floor(tile.x / CHUNK_SIZE),
    y: Math.floor(tile.y / CHUNK_SIZE),
  };
}

export function worldToLocalTile(tile: TileCoord): TileCoord {
  return {
    x: ((tile.x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    y: ((tile.y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
  };
}

export function tileKey(tile: TileCoord): string {
  return `${tile.x},${tile.y}`;
}

/** Stable integer hash suitable for deterministic procedural generation. */
export function hash2D(seed: number, x: number, y: number): number {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x45d9f3b) ^ Math.imul(y | 0, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

export function seededUnit(seed: number, x: number, y: number): number {
  return hash2D(seed, x, y) / 0x1_0000_0000;
}

export interface GeneratedChunk {
  coord: ChunkCoord;
  seed: number;
  generatorVersion: number;
  /** Deterministic generated terrain. Do not persist this array. */
  tiles: string[];
}

export interface ChunkGenerator {
  generate(seed: number, generatorVersion: number, coord: ChunkCoord): GeneratedChunk;
}

/**
 * Minimal deterministic generator. Gameplay-specific biome/terrain rules can replace this
 * implementation without changing persistence or chunk addressing.
 */
export const defaultChunkGenerator: ChunkGenerator = {
  generate(seed, generatorVersion, coord) {
    const tiles = new Array<string>(CHUNK_SIZE * CHUNK_SIZE);
    const versionSeed = generatorVersion <= 1 ? seed : seed ^ Math.imul(generatorVersion - 1, 0x1f123bb5);
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const worldX = coord.x * CHUNK_SIZE + x;
        const worldY = coord.y * CHUNK_SIZE + y;
        const roll = seededUnit(versionSeed, worldX, worldY);
        tiles[y * CHUNK_SIZE + x] = roll < 0.08 ? 'water' : roll < 0.18 ? 'stone' : 'ground';
      }
    }
    return { coord: { ...coord }, seed, generatorVersion, tiles };
  },
};

/** Runtime cache: generated chunks are disposable; ChunkPersistence is the durable source of modifications. */
export class ChunkCache {
  private readonly chunks = new Map<ChunkKey, GeneratedChunk>();

  constructor(private readonly generator: ChunkGenerator = defaultChunkGenerator) {}

  get(seed: number, generatorVersion: number, coord: ChunkCoord): GeneratedChunk {
    const key = chunkKey(coord);
    const cached = this.chunks.get(key);
    if (cached?.seed === seed && cached.generatorVersion === generatorVersion) return cached;

    const generated = this.generator.generate(seed, generatorVersion, coord);
    this.chunks.set(key, generated);
    return generated;
  }

  has(coord: ChunkCoord): boolean {
    return this.chunks.has(chunkKey(coord));
  }

  unload(coord: ChunkCoord): void {
    this.chunks.delete(chunkKey(coord));
  }

  clear(): void {
    this.chunks.clear();
  }
}
