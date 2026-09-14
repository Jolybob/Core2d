import { CHUNK_SIZE } from './Chunk';
import { TileType } from './Tile';

export interface WorldConfig {
  width: number;
  height: number;
  seed: number;
  spawnClearRadius: number;
}

export class WorldGenerator {
  private readonly config: WorldConfig;

  constructor(config: WorldConfig) {
    this.config = config;
  }

  generateChunk(chunkX: number, chunkY: number): TileType[][] {
    const tiles: TileType[][] = [];
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;

    for (let localY = 0; localY < CHUNK_SIZE; localY += 1) {
      const row: TileType[] = [];
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const worldX = chunkX * CHUNK_SIZE + localX;
        const worldY = chunkY * CHUNK_SIZE + localY;
        const distance = Math.hypot(worldX - centerX, worldY - centerY);
        const noise = this.hash01(worldX, worldY);

        let tile = distance <= this.config.spawnClearRadius ? TileType.Grass : TileType.Dirt;
        if (distance > this.config.spawnClearRadius + 4 && noise > 0.72) tile = TileType.Stone;
        if (distance > this.config.spawnClearRadius + 8 && noise > 0.93) tile = TileType.Copper;

        row.push(tile);
      }
      tiles.push(row);
    }

    return tiles;
  }

  private hash01(x: number, y: number): number {
    let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(this.config.seed, 1442695041);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    value ^= value >>> 16;
    return (value >>> 0) / 0x100000000;
  }
}
