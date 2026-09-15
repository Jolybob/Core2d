import { ITEM_IDS, TOOL_IDS, type GameState, type InventoryState, type SaveData, type ToolId } from './types';

export const SAVE_KEY = 'core2d-save-v3';
const LEGACY_KEYS = ['core2d-save-v2', 'core2d-save-v1'];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteNonNegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isFiniteInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
const isBoundedNumber = (value: unknown, min: number, max: number): value is number => isFiniteNonNegative(value) && value >= min && value <= max;

function isInventory(value: unknown): value is InventoryState {
  if (!isObject(value)) return false;
  return ITEM_IDS.every((id) => isFiniteNonNegative(value[id]));
}

function isQuest(value: unknown): boolean {
  if (!isObject(value)) return false;
  return typeof value['id'] === 'string'
    && value['id'].length > 0
    && typeof value['title'] === 'string'
    && value['title'].length > 0
    && isFiniteInteger(value['need'])
    && value['need'] > 0
    && isFiniteInteger(value['progress'])
    && value['progress'] >= 0
    && value['progress'] <= value['need']
    && isFiniteNonNegative(value['reward'])
    && typeof value['done'] === 'boolean';
}

function isGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  const player = value['player'];
  const inventory = value['inventory'];
  const quests = value['quests'];
  const calendar = value['calendar'];
  const economy = value['economy'];
  const world = value['world'];
  if (!isObject(player) || !isInventory(inventory) || !Array.isArray(quests)) return false;
  if (!quests.every(isQuest) || !isObject(calendar) || !isObject(economy) || !isObject(world)) return false;

  if (!isFiniteNonNegative(player['x']) || !isFiniteNonNegative(player['y'])) return false;
  if (!isBoundedNumber(player['health'], 0, 100) || !isBoundedNumber(player['stamina'], 0, 100) || !isBoundedNumber(player['hunger'], 0, 100)) return false;
  if (!isFiniteNonNegative(player['money']) || !isFiniteInteger(player['pickaxeLevel']) || player['pickaxeLevel'] < 1) return false;
  if (typeof player['tool'] !== 'string' || !TOOL_IDS.includes(player['tool'] as ToolId)) return false;

  if (!isFiniteInteger(calendar['day']) || calendar['day'] < 1) return false;
  if (!isFiniteNonNegative(calendar['clock']) || !isFiniteInteger(calendar['season']) || calendar['season'] < 0) return false;
  if (calendar['weather'] !== 'Sunny' && calendar['weather'] !== 'Rainy' && calendar['weather'] !== 'Cloudy') return false;

  if (!isFiniteNonNegative(economy['fishCaught']) || !isFiniteNonNegative(economy['shipped']) || !isFiniteNonNegative(economy['totalHarvests'])) return false;
  if (!isFiniteInteger(world['seed']) || !isObject(world['crops']) || !isObject(world['removedResources'])) return false;
  if (!Object.entries(world['crops']).every(([key, crop]) => {
    if (!key || !isObject(crop)) return false;
    return isFiniteInteger(crop['stage']) && crop['stage'] >= 0
      && typeof crop['watered'] === 'boolean'
      && typeof crop['tilled'] === 'boolean';
  })) return false;
  if (!Object.values(world['removedResources']).every((type) => type === 'tree' || type === 'rock')) return false;

  return true;
}

const defaultInventory = (): InventoryState => ({ wood: 12, stone: 10, ore: 8, crystal: 2, berry: 4, parsnip: 0, seeds: 6, torch: 6, sword: 1, fish: 0, coal: 3, rod: 0, salve: 0 });

function normalizeInventory(value: unknown): InventoryState {
  const result = defaultInventory();
  if (!isObject(value)) return result;
  for (const id of ITEM_IDS) if (isFiniteNonNegative(value[id])) result[id] = value[id];
  return result;
}

function migrate(raw: unknown): GameState | null {
  if (!isObject(raw)) return null;
  const schema = raw['schemaVersion'];
  if (schema === 3 && isGameState(raw['state'])) return raw['state'];

  if ((schema === 1 || schema === 2) && isObject(raw['state'])) {
    const old = raw['state'];
    const player = isObject(old['player']) ? old['player'] : {};
    const calendar = isObject(old['calendar']) ? old['calendar'] : {};
    const economy = isObject(old['economy']) ? old['economy'] : {};
    const quests = Array.isArray(old['quests']) ? old['quests'] : [];
    const candidate: GameState = {
      player: {
        x: isFiniteNonNegative(player['x']) ? player['x'] : 35 * 24 + 12,
        y: isFiniteNonNegative(player['y']) ? player['y'] : 27 * 24 + 12,
        health: isBoundedNumber(player['health'], 0, 100) ? player['health'] : 100,
        stamina: isBoundedNumber(player['stamina'], 0, 100) ? player['stamina'] : 100,
        hunger: isBoundedNumber(player['hunger'], 0, 100) ? player['hunger'] : 100,
        money: isFiniteNonNegative(player['money']) ? player['money'] : 120,
        pickaxeLevel: isFiniteInteger(player['pickaxeLevel']) && player['pickaxeLevel'] >= 1 ? player['pickaxeLevel'] : 1,
        tool: typeof player['tool'] === 'string' && TOOL_IDS.includes(player['tool'] as ToolId) ? player['tool'] as ToolId : 'hoe',
      },
      inventory: normalizeInventory(old['inventory']),
      quests: quests.filter(isObject).map((quest) => ({ id: String(quest['id'] ?? 'quest'), title: String(quest['title'] ?? 'Quest'), need: Math.max(1, Number(quest['need']) || 1), progress: Math.max(0, Number(quest['progress']) || 0), reward: Math.max(0, Number(quest['reward']) || 0), done: Boolean(quest['done']) })),
      calendar: {
        day: isFiniteInteger(calendar['day']) && calendar['day'] >= 1 ? calendar['day'] : 1,
        clock: isFiniteNonNegative(calendar['clock']) ? calendar['clock'] : 0,
        season: isFiniteInteger(calendar['season']) && calendar['season'] >= 0 ? calendar['season'] : 0,
        weather: calendar['weather'] === 'Rainy' || calendar['weather'] === 'Cloudy' ? calendar['weather'] : 'Sunny',
      },
      economy: {
        fishCaught: isFiniteNonNegative(economy['fishCaught']) ? economy['fishCaught'] : 0,
        shipped: isFiniteNonNegative(economy['shipped']) ? economy['shipped'] : 0,
        totalHarvests: isFiniteNonNegative(economy['totalHarvests']) ? economy['totalHarvests'] : 0,
      },
      world: { seed: 2042, crops: {}, removedResources: {} },
    };
    return isGameState(candidate) ? candidate : null;
  }

  if (schema === undefined && isObject(raw['inventory'])) {
    const candidate: GameState = {
      player: { x: 35 * 24 + 12, y: 27 * 24 + 12, health: isBoundedNumber(raw['health'], 0, 100) ? raw['health'] : 100, stamina: isBoundedNumber(raw['stamina'], 0, 100) ? raw['stamina'] : 100, hunger: isBoundedNumber(raw['hunger'], 0, 100) ? raw['hunger'] : 100, money: isFiniteNonNegative(raw['money']) ? raw['money'] : 120, pickaxeLevel: 1, tool: 'hoe' },
      inventory: normalizeInventory(raw['inventory']),
      quests: [],
      calendar: { day: isFiniteInteger(raw['day']) && raw['day'] >= 1 ? raw['day'] : 1, clock: 0, season: 0, weather: 'Sunny' },
      economy: { fishCaught: 0, shipped: 0, totalHarvests: 0 },
      world: { seed: 2042, crops: {}, removedResources: {} },
    };
    return isGameState(candidate) ? candidate : null;
  }
  return null;
}

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  if (!isGameState(state)) throw new Error('Cannot save invalid game state');
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
