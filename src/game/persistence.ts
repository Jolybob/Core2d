import { ITEM_IDS } from './types';
import type { GameState, SaveData } from './types';

export const SAVE_KEY = 'core2d-save-v2';
const LEGACY_SAVE_KEY = 'core2d-save-v1';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function isGameState(value: unknown): value is GameState {
  if (!isObject(value) || !isObject(value.player) || !isObject(value.inventory) || !Array.isArray(value.quests) || !isObject(value.calendar) || !isObject(value.economy)) return false;
  if (typeof value.player.health !== 'number' || typeof value.player.money !== 'number' || typeof value.calendar.day !== 'number') return false;
  return ITEM_IDS.every((id) => typeof value.inventory[id] === 'number' && Number.isFinite(value.inventory[id]) && value.inventory[id] >= 0);
}

function migrate(raw: unknown): GameState | null {
  if (!isObject(raw)) return null;
  if (raw.schemaVersion === 2 && isGameState(raw.state)) return raw.state;
  if (raw.schemaVersion === 1 && isGameState(raw.state)) return raw.state;
  return null;
}

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  const data: SaveData = { schemaVersion: 2, state };
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(storage: Storage = localStorage): GameState | null {
  for (const key of [SAVE_KEY, LEGACY_SAVE_KEY]) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const state = migrate(JSON.parse(raw) as unknown);
      if (state) {
        if (key === LEGACY_SAVE_KEY) storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 2, state } satisfies SaveData));
        return state;
      }
    } catch {
      // Ignore malformed saves and continue looking for a usable slot.
    }
  }
  return null;
}
