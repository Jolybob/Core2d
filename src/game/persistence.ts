import { createSaveData, migrateSave, SAVE_SCHEMA_VERSION } from './save-schema';
import type { GameState } from './types';
import type { WorldRuntime } from './world/runtime';
import { serializeWorld } from './world/runtime-persistence';

export const SAVE_KEY = `core2d-save-v${SAVE_SCHEMA_VERSION}`;
const LEGACY_KEYS = ['core2d-save-v4', 'core2d-save-v3', 'core2d-save-v2', 'core2d-save-v1'];

export function saveGame(state: GameState, runtime?: WorldRuntime, storage: Storage = localStorage): void {
  const saveState = runtime
    ? { ...state, world: serializeWorld(runtime) }
    : state;
  storage.setItem(SAVE_KEY, JSON.stringify(createSaveData(saveState)));
}

export function loadGame(storage: Storage = localStorage): GameState | null {
  for (const key of [SAVE_KEY, ...LEGACY_KEYS]) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const state = migrateSave(JSON.parse(raw) as unknown);
      if (state) {
        storage.setItem(SAVE_KEY, JSON.stringify(createSaveData(state)));
        return state;
      }
    } catch {
      // Ignore malformed saves and continue searching.
    }
  }
  return null;
}
