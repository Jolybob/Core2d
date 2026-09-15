import { ITEM_IDS, TOOL_IDS, type GameState, type SaveData, type ToolId } from './types';

export const SAVE_KEY = 'core2d-save-v2';
const LEGACY_SAVE_KEY = 'core2d-save-v1';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function isGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  if (!isObject(value.player) || !isObject(value.inventory) || !Array.isArray(value.quests)) return false;
  if (!isObject(value.calendar) || !isObject(value.economy)) return false;

  const player = value.player;
  const inventory = value.inventory;
  const calendar = value.calendar;

  if (!isFiniteNonNegative(player.health) || !isFiniteNonNegative(player.stamina) || !isFiniteNonNegative(player.hunger)) return false;
  if (!isFiniteNonNegative(player.money) || !isFiniteNonNegative(player.pickaxeLevel)) return false;
  if (typeof player.tool !== 'string' || !TOOL_IDS.includes(player.tool as ToolId)) return false;
  if (!isFiniteNonNegative(calendar.day) || !isFiniteNonNegative(calendar.clock) || !isFiniteNonNegative(calendar.season)) return false;
  if (calendar.weather !== 'Sunny' && calendar.weather !== 'Rainy' && calendar.weather !== 'Cloudy') return false;

  return ITEM_IDS.every((id) => isFiniteNonNegative(inventory[id]));
}

function migrate(raw: unknown): GameState | null {
  if (!isObject(raw) || !isObject(raw.state)) return null;
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
        if (key === LEGACY_SAVE_KEY) {
          storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 2, state } satisfies SaveData));
        }
        return state;
      }
    } catch {
      // Ignore malformed saves and continue looking for a usable slot.
    }
  }
  return null;
}
