export const TILE_SIZE = 24;

/**
 * Legacy rendering dimensions.
 *
 * These are retained only for compatibility with the current Phaser adapter;
 * they are not authoritative world bounds and are not used for collision or
 * movement limits.
 */
export const WORLD_WIDTH = 70;
export const WORLD_HEIGHT = 48;

const HOME_MIN_X = 33;
const HOME_MAX_X = 37;
const HOME_MIN_Y = 14;
const HOME_MAX_Y = 20;

/**
 * World-space collision adapter.
 *
 * The authoritative world is no longer constrained to a finite rectangle.
 * Chunk loading/generation will provide the world topology; this system only
 * answers local movement/collision questions for the runtime.
 */
export class WorldSystem {
  isBlocked(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    return tx >= HOME_MIN_X && tx <= HOME_MAX_X && ty >= HOME_MIN_Y && ty <= HOME_MAX_Y;
  }

  /**
   * Kept as a compatibility adapter for callers that previously expected a
   * finite-world clamp. An authoritative infinite world has no global clamp.
   */
  clampPosition(x: number, y: number): { x: number; y: number } {
    return { x, y };
  }

  canMove(x: number, y: number): boolean {
    return Number.isFinite(x) && Number.isFinite(y) && !this.isBlocked(x, y);
  }
}
