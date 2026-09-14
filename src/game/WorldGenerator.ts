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

  generate(): TileType[][] {
    const { width, height, seed, spawnClearRadius } = this.config;
    const random = this.seededRandom(seed);
    const world: TileType[][] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y += 1) {
      const row: TileType[] = [];
      for (let x = 0; x < width; x += 1) {
        const distance = Math.hypot(x - centerX, y - centerY);
        let tile = distance <= spawnClearRadius ? TileType.Grass : TileType.Dirt;
        const noise = random();

        if (distance > spawnClearRadius + 4 && noise > 0.72) tile = TileType.Stone;
        if (distance > spawnClearRadius + 8 && noise > 0.93) tile = TileType.Copper;
        row.push(tile);
      }
      world.push(row);
    }

    return world;
  }

  private seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }
}
