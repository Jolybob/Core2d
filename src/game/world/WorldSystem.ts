import type { GameState } from '../types';

export const TILE_SIZE = 24;
export const WORLD_WIDTH = 70;
export const WORLD_HEIGHT = 48;

const HOME_MIN_X = 33;
const HOME_MAX_X = 37;
const HOME_MIN_Y = 14;
const HOME_MAX_Y = 20;

export class WorldSystem {
  isBlocked(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    return tx >= HOME_MIN_X && tx <= HOME_MAX_X && ty >= HOME_MIN_Y && ty <= HOME_MAX_Y;
  }

  clampPosition(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.min(WORLD_WIDTH * TILE_SIZE - 10, Math.max(10, x)),
      y: Math.min(WORLD_HEIGHT * TILE_SIZE - 10, Math.max(10, y)),
    };
  }

  canMove(state: GameState, x: number, y: number): boolean {
    return Number.isFinite(x) && Number.isFinite(y) && !this.isBlocked(x, y) &&
      x >= 10 && x <= WORLD_WIDTH * TILE_SIZE - 10 &&
      y >= 10 && y <= WORLD_HEIGHT * TILE_SIZE - 10;
  }
}
