import type { GameState, SaveData } from './types';

export const SAVE_KEY = 'core2d-save-v1';

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  const data: SaveData = { schemaVersion: 1, state };
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(storage: Storage = localStorage): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.schemaVersion !== 1 || !parsed.state) return null;
    return parsed.state;
  } catch {
    return null;
  }
}
