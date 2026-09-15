import { createSaveData, migrateSaveData, SAVE_SCHEMA_VERSION } from './save-schema';
import type { GameState, LoadedGame, SaveData } from './types';
import type { WorldRuntime } from './world/runtime';
import { serializeWorld, rehydrateWorld } from './world/runtime-persistence';

export const SAVE_KEY = `core2d-save-v${SAVE_SCHEMA_VERSION}`;
const LEGACY_KEYS = ['core2d-save-v4', 'core2d-save-v3', 'core2d-save-v2', 'core2d-save-v1'];
const defaultStorage = (): Storage => { if (typeof localStorage === 'undefined') throw new Error('No browser storage is available'); return localStorage; };

export function saveGame(state: GameState, runtime: WorldRuntime, storage: Storage = defaultStorage()): void {
  const saveData = createSaveData(state, serializeWorld(runtime));
  storage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

export function loadGame(storage: Storage = defaultStorage()): LoadedGame | null {
  for (const key of [SAVE_KEY, ...LEGACY_KEYS]) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const saveData = migrateSaveData(JSON.parse(raw) as unknown);
      if (!saveData) continue;
      storage.setItem(SAVE_KEY, JSON.stringify(saveData));
      return { state: {
        player: saveData.player.player,
        inventory: saveData.player.inventory,
        quests: saveData.player.quests,
        calendar: saveData.calendar,
        economy: saveData.player.economy,
      }, world: saveData.world };
    } catch { /* Ignore malformed saves and continue searching. */ }
  }
  return null;
}

export function rehydrateLoadedGame(runtime: WorldRuntime, loaded: LoadedGame): GameState {
  rehydrateWorld(runtime, loaded.world);
  return loaded.state;
}
