export const TILE_SIZE = 24;

export enum TileType {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Copper = 4,
}

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.Air]: 0x172018,
  [TileType.Grass]: 0x5d8c4a,
  [TileType.Dirt]: 0x7a5236,
  [TileType.Stone]: 0x4b4d55,
  [TileType.Copper]: 0xb87333,
};

export function isMineable(tile: TileType): boolean {
  return tile === TileType.Dirt || tile === TileType.Stone || tile === TileType.Copper;
}

export function miningYield(tile: TileType): number {
  switch (tile) {
    case TileType.Copper:
      return 3;
    case TileType.Dirt:
    case TileType.Stone:
      return 1;
    default:
      return 0;
  }
}
