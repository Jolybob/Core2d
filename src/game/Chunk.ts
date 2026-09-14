import { TileType } from './Tile';

export const CHUNK_SIZE = 16;

export class Chunk {
  readonly tiles: TileType[][];

  constructor(
    readonly x: number,
    readonly y: number,
    tiles: TileType[][],
  ) {
    this.tiles = tiles;
  }

  getTile(localX: number, localY: number): TileType {
    return this.tiles[localY][localX];
  }

  setTile(localX: number, localY: number, tile: TileType): void {
    this.tiles[localY][localX] = tile;
  }
}
