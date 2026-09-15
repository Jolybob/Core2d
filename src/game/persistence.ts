import { ITEM_IDS, TOOL_IDS, type GameState, type InventoryState, type SaveData, type ToolId } from './types';

export const SAVE_KEY = 'core2d-save-v3';
const LEGACY_KEYS = ['core2d-save-v2', 'core2d-save-v1', 'core2d-save-v41'];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteNonNegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function isGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  if (!isObject(value.player) || !isObject(value.inventory) || !Array.isArray(value.quests)) return false;
  if (!isObject(value.calendar) || !isObject(value.economy) || !isObject(value.world)) return false;
  const player = value.player;
  const inventory = value.inventory;
  const calendar = value.calendar;
  const world = value.world;
  if (!isFiniteNonNegative(player.x) || !isFiniteNonNegative(player.y)) return false;
  if (!isFiniteNonNegative(player.health) || !isFiniteNonNegative(player.stamina) || !isFiniteNonNegative(player.hunger)) return false;
  if (!isFiniteNonNegative(player.money) || !isFiniteNonNegative(player.pickaxeLevel)) return false;
  if (typeof player.tool !== 'string' || !TOOL_IDS.includes(player.tool as ToolId)) return false;
  if (!isFiniteNonNegative(calendar.day) || !isFiniteNonNegative(calendar.clock) || !isFiniteNonNegative(calendar.season)) return false;
  if (calendar.weather !== 'Sunny' && calendar.weather !== 'Rainy' && calendar.weather !== 'Cloudy') return false;
  if (!isFiniteNonNegative(world.seed) || !isObject(world.crops) || !isObject(world.removedResources)) return false;
  return ITEM_IDS.every((id) => isFiniteNonNegative(inventory[id]));
}

const defaultInventory = (): InventoryState => ({ wood: 12, stone: 10, ore: 8, crystal: 2, berry: 4, parsnip: 0, seeds: 6, torch: 6, sword: 1, fish: 0, coal: 3, rod: 0 });

function normalizeInventory(value: unknown): InventoryState {
  const result = defaultInventory();
  if (!isObject(value)) return result;
  for (const id of ITEM_IDS) if (isFiniteNonNegative(value[id])) result[id] = value[id];
  return result;
}

function migrate(raw: unknown): GameState | null {
  if (!isObject(raw)) return null;
  const schema = raw.schemaVersion;
  if (schema === 3 && isGameState(raw.state)) return raw.state;

  if ((schema === 1 || schema === 2) && isObject(raw.state)) {
    const old = raw.state;
    const player = isObject(old.player) ? old.player : {};
    const calendar = isObject(old.calendar) ? old.calendar : {};
    const economy = isObject(old.economy) ? old.economy : {};
    const quests = Array.isArray(old.quests) ? old.quests : [];
    const candidate: GameState = {
      player: {
        x: isFiniteNonNegative(player.x) ? player.x : 35 * 24 + 12,
        y: isFiniteNonNegative(player.y) ? player.y : 27 * 24 + 12,
        health: isFiniteNonNegative(player.health) ? player.health : 100,
        stamina: isFiniteNonNegative(player.stamina) ? player.stamina : 100,
        hunger: isFiniteNonNegative(player.hunger) ? player.hunger : 100,
        money: isFiniteNonNegative(player.money) ? player.money : 120,
        pickaxeLevel: isFiniteNonNegative(player.pickaxeLevel) ? player.pickaxeLevel : 1,
        tool: typeof player.tool === 'string' && TOOL_IDS.includes(player.tool as ToolId) ? player.tool as ToolId : 'hoe',
      },
      inventory: normalizeInventory(old.inventory),
      quests: quests.filter(isObject).map((quest) => ({ id: String(quest.id ?? 'quest'), title: String(quest.title ?? 'Quest'), need: Number(quest.need) || 1, progress: Number(quest.progress) || 0, reward: Number(quest.reward) || 0, done: Boolean(quest.done) })),
      calendar: {
        day: isFiniteNonNegative(calendar.day) ? calendar.day : 1,
        clock: isFiniteNonNegative(calendar.clock) ? calendar.clock : 0,
        season: isFiniteNonNegative(calendar.season) ? calendar.season : 0,
        weather: calendar.weather === 'Rainy' || calendar.weather === 'Cloudy' ? calendar.weather : 'Sunny',
      },
      economy: {
        fishCaught: isFiniteNonNegative(economy.fishCaught) ? economy.fishCaught : 0,
        shipped: isFiniteNonNegative(economy.shipped) ? economy.shipped : 0,
        totalHarvests: isFiniteNonNegative(economy.totalHarvests) ? economy.totalHarvests : 0,
      },
      world: { seed: 2042, crops: {}, removedResources: {} },
    };
    return candidate;
  }

  if (schema === undefined && isObject(raw.inventory)) {
    return {
      player: { x: 35 * 24 + 12, y: 27 * 24 + 12, health: isFiniteNonNegative(raw.health) ? raw.health : 100, stamina: isFiniteNonNegative(raw.stamina) ? raw.stamina : 100, hunger: isFiniteNonNegative(raw.hunger) ? raw.hunger : 100, money: isFiniteNonNegative(raw.money) ? raw.money : 120, pickaxeLevel: isFiniteNonNegative(raw.pickaxeLevel) ? raw.pickaxeLevel : 1, tool: 'hoe' },
      inventory: normalizeInventory(raw.inventory),
      quests: [],
      calendar: { day: isFiniteNonNegative(raw.day) ? raw.day : 1, clock: 0, season: 0, weather: 'Sunny' },
      economy: { fishCaught: 0, shipped: 0, totalHarvests: 0 },
      world: { seed: 2042, crops: {}, removedResources: {} },
    };
  }
  return null;
}

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  const data: SaveData = { schemaVersion: 3, state };
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(storage: Storage = localStorage): GameState | null {
  for (const key of [SAVE_KEY, ...LEGACY_KEYS]) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const state = migrate(JSON.parse(raw) as unknown);
      if (state) {
        storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 3, state } satisfies SaveData));
        return state;
      }
    } catch {
      // Ignore malformed saves and continue searching.
    }
  }
  return null;
}
