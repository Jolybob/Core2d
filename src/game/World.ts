import { Chunk, CHUNK_SIZE } from './Chunk';
import { TileType } from './Tile';
import { WorldGenerator } from './WorldGenerator';

export class World {
  private readonly chunks = new Map<string, Chunk>();

  constructor(
    private readonly generator: WorldGenerator,
    readonly widthInTiles: number,
    readonly heightInTiles: number,
  ) {}

  getTile(worldX: number, worldY: number): TileType {
    const { chunkX, chunkY, localX, localY } = this.toChunkCoordinates(worldX, worldY);
    return this.getChunk(chunkX, chunkY).getTile(localX, localY);
  }

  setTile(worldX: number, worldY: number, tile: TileType): void {
    const { chunkX, chunkY, localX, localY } = this.toChunkCoordinates(worldX, worldY);
    this.getChunk(chunkX, chunkY).setTile(localX, localY, tile);
  }

  private getChunk(chunkX: number, chunkY: number): Chunk {
    const key = `${chunkX}:${chunkY}`;
    const cached = this.chunks.get(key);
    if (cached) return cached;

    const chunk = new Chunk(chunkX, chunkY, this.generator.generateChunk(chunkX, chunkY));
    this.chunks.set(key, chunk);
    return chunk;
  }

  private toChunkCoordinates(worldX: number, worldY: number) {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    return {
      chunkX,
      chunkY,
      localX: worldX - chunkX * CHUNK_SIZE,
      localY: worldY - chunkY * CHUNK_SIZE,
    };
  }
}
