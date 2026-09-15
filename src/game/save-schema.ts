import { createEntityRegistryState, type EntityRegistryState } from './entity';
import { ITEM_IDS, TOOL_IDS, type GameState, type InventoryState, type SaveData, type ToolId } from './types';
import { CURRENT_GENERATOR_VERSION, type WorldSaveData } from './world/world-save';
import type { ChunkPersistence } from './world/chunks';

export const SAVE_SCHEMA_VERSION = 5 as const;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteNonNegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isFiniteInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
const isBoundedNumber = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

function isInventory(value: unknown): value is InventoryState {
  if (!isObject(value)) return false;
  return ITEM_IDS.every((id) => isFiniteNonNegative(value[id]));
}

function isQuest(value: unknown): boolean {
  if (!isObject(value)) return false;
  return typeof value['id'] === 'string' && value['id'].length > 0
    && typeof value['title'] === 'string' && value['title'].length > 0
    && isFiniteInteger(value['need']) && value['need'] > 0
    && isFiniteInteger(value['progress']) && value['progress'] >= 0 && value['progress'] <= value['need']
    && isFiniteNonNegative(value['reward']) && typeof value['done'] === 'boolean';
}

function isEntityRegistry(value: unknown): value is EntityRegistryState {
  if (!isObject(value) || !isObject(value['entities'])) return false;
  return Object.entries(value['entities']).every(([id, entity]) =>
    id.length > 0 && isObject(entity) && entity['id'] === id
      && typeof entity['kind'] === 'string' && entity['kind'].length > 0,
  );
}

function isChunkPersistence(value: unknown): value is ChunkPersistence {
  if (!isObject(value) || typeof value['key'] !== 'string') return false;
  const modifiedTiles = value['modifiedTiles'];
  const removedEntities = value['removedEntities'];
  if (!isObject(modifiedTiles) || !isObject(removedEntities)) return false;
  if (!Object.values(modifiedTiles).every((modification) =>
    isObject(modification) && typeof modification['tile'] === 'string' && modification['tile'].length > 0,
  )) return false;
  return Object.values(removedEntities).every((removed) => removed === true);
}

function isWorldSave(value: unknown): value is WorldSaveData {
  if (!isObject(value)) return false;
  return isFiniteInteger(value['seed'])
    && isFiniteInteger(value['generatorVersion']) && value['generatorVersion'] >= 1
    && isObject(value['chunks']) && Object.values(value['chunks']).every(isChunkPersistence)
    && isObject(value['crops'])
    && Object.values(value['crops']).every((crop) => isObject(crop)
      && isFiniteInteger(crop['stage']) && crop['stage'] >= 0
      && typeof crop['watered'] === 'boolean' && typeof crop['tilled'] === 'boolean')
    && isObject(value['removedResources'])
    && Object.values(value['removedResources']).every((type) => type === 'tree' || type === 'rock')
    && isEntityRegistry(value['entities']);
}

function isCalendar(value: unknown): boolean {
  if (!isObject(value)) return false;
  return isFiniteInteger(value['day']) && value['day'] >= 1
    && isFiniteNonNegative(value['clock'])
    && isFiniteInteger(value['season']) && value['season'] >= 0
    && (value['weather'] === 'Sunny' || value['weather'] === 'Rainy' || value['weather'] === 'Cloudy');
}

function isPlayer(value: unknown): value is GameState['player'] {
  if (!isObject(value)) return false;
  return isFiniteNonNegative(value['x']) && isFiniteNonNegative(value['y'])
    && isBoundedNumber(value['health'], 0, 100)
    && isBoundedNumber(value['stamina'], 0, 100)
    && isBoundedNumber(value['hunger'], 0, 100)
    && isFiniteNonNegative(value['money'])
    && isFiniteInteger(value['pickaxeLevel']) && value['pickaxeLevel'] >= 1
    && typeof value['tool'] === 'string' && TOOL_IDS.includes(value['tool'] as ToolId);
}

function isEconomy(value: unknown): boolean {
  if (!isObject(value)) return false;
  return isFiniteNonNegative(value['fishCaught'])
    && isFiniteNonNegative(value['shipped'])
    && isFiniteNonNegative(value['totalHarvests']);
}

function isPlayerSave(value: unknown): value is SaveData['player'] {
  if (!isObject(value)) return false;
  return isPlayer(value['player']) && isInventory(value['inventory'])
    && Array.isArray(value['quests']) && value['quests'].every(isQuest)
    && isEconomy(value['economy']);
}

export function isGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  return isPlayer(value['player'])
    && isInventory(value['inventory'])
    && Array.isArray(value['quests']) && value['quests'].every(isQuest)
    && isCalendar(value['calendar'])
    && isEconomy(value['economy'])
    && isWorldSave(value['world']);
}

export function isSaveData(value: unknown): value is SaveData {
  if (!isObject(value) || value['schemaVersion'] !== SAVE_SCHEMA_VERSION) return false;
  return isPlayerSave(value['player']) && isCalendar(value['calendar']) && isWorldSave(value['world']);
}

const defaultInventory = (): InventoryState => ({
  wood: 12, stone: 10, ore: 8, crystal: 2, berry: 4, parsnip: 0, seeds: 6,
  torch: 6, sword: 1, fish: 0, coal: 3, rod: 0, salve: 0,
});

function normalizeInventory(value: unknown): InventoryState {
  const result = defaultInventory();
  if (!isObject(value)) return result;
  for (const id of ITEM_IDS) if (isFiniteNonNegative(value[id])) result[id] = value[id];
  return result;
}

function normalizeWorldEntities(value: unknown): EntityRegistryState {
  return isEntityRegistry(value) ? value : createEntityRegistryState();
}

function normalizeLegacyNumber(value: unknown, fallback: number, min = 0): number {
  return isFiniteNonNegative(value) && value >= min ? value : fallback;
}

function migrateLegacyState(old: Record<string, unknown>): GameState {
  const player = isObject(old['player']) ? old['player'] : {};
  const calendar = isObject(old['calendar']) ? old['calendar'] : {};
  const economy = isObject(old['economy']) ? old['economy'] : {};
  const quests = Array.isArray(old['quests']) ? old['quests'] : [];
  const world = isObject(old['world']) ? old['world'] : {};
  const legacyPlayer = !isObject(old['player']) ? old : {};
  const readPlayerNumber = (key: string, fallback: number, min = 0): number =>
    normalizeLegacyNumber(player[key], normalizeLegacyNumber(legacyPlayer[key], fallback, min), min);

  const chunks: Record<string, ChunkPersistence> = isObject(world['chunks'])
    ? Object.fromEntries(Object.entries(world['chunks']).filter(([, chunk]) => isChunkPersistence(chunk))) as Record<string, ChunkPersistence>
    : {};

  return {
    player: {
      x: readPlayerNumber('x', 35 * 24 + 12),
      y: readPlayerNumber('y', 27 * 24 + 12),
      health: isBoundedNumber(player['health'], 0, 100) ? player['health'] : (isBoundedNumber(legacyPlayer['health'], 0, 100) ? legacyPlayer['health'] : 100),
      stamina: isBoundedNumber(player['stamina'], 0, 100) ? player['stamina'] : (isBoundedNumber(legacyPlayer['stamina'], 0, 100) ? legacyPlayer['stamina'] : 100),
      hunger: isBoundedNumber(player['hunger'], 0, 100) ? player['hunger'] : (isBoundedNumber(legacyPlayer['hunger'], 0, 100) ? legacyPlayer['hunger'] : 100),
      money: readPlayerNumber('money', 120),
      pickaxeLevel: isFiniteInteger(player['pickaxeLevel']) && player['pickaxeLevel'] >= 1 ? player['pickaxeLevel'] : (isFiniteInteger(legacyPlayer['pickaxeLevel']) && legacyPlayer['pickaxeLevel'] >= 1 ? legacyPlayer['pickaxeLevel'] : 1),
      tool: typeof player['tool'] === 'string' && TOOL_IDS.includes(player['tool'] as ToolId) ? player['tool'] as ToolId : (typeof legacyPlayer['tool'] === 'string' && TOOL_IDS.includes(legacyPlayer['tool'] as ToolId) ? legacyPlayer['tool'] as ToolId : 'hoe'),
    },
    inventory: normalizeInventory(old['inventory']),
    quests: quests.filter(isObject).map((quest) => ({
      id: String(quest['id'] ?? 'quest'), title: String(quest['title'] ?? 'Quest'),
      need: Math.max(1, Number(quest['need']) || 1), progress: Math.max(0, Number(quest['progress']) || 0),
      reward: Math.max(0, Number(quest['reward']) || 0), done: Boolean(quest['done']),
    })),
    calendar: {
      day: isFiniteInteger(calendar['day']) && calendar['day'] >= 1 ? calendar['day'] : (isFiniteInteger(legacyPlayer['day']) && legacyPlayer['day'] >= 1 ? legacyPlayer['day'] : 1),
      clock: isFiniteNonNegative(calendar['clock']) ? calendar['clock'] : 0,
      season: isFiniteInteger(calendar['season']) && calendar['season'] >= 0 ? calendar['season'] : 0,
      weather: calendar['weather'] === 'Rainy' || calendar['weather'] === 'Cloudy' ? calendar['weather'] : 'Sunny',
    },
    economy: {
      fishCaught: isFiniteNonNegative(economy['fishCaught']) ? economy['fishCaught'] : 0,
      shipped: isFiniteNonNegative(economy['shipped']) ? economy['shipped'] : 0,
      totalHarvests: isFiniteNonNegative(economy['totalHarvests']) ? economy['totalHarvests'] : 0,
    },
    world: {
      seed: isFiniteInteger(world['seed']) ? world['seed'] : 2042,
      generatorVersion: isFiniteInteger(world['generatorVersion']) && world['generatorVersion'] >= 1 ? world['generatorVersion'] : CURRENT_GENERATOR_VERSION,
      chunks,
      crops: isObject(world['crops']) ? world['crops'] as GameState['world']['crops'] : {},
      removedResources: isObject(world['removedResources']) ? world['removedResources'] as GameState['world']['removedResources'] : {},
      entities: normalizeWorldEntities(world['entities']),
    },
  };
}

export function migrateSave(raw: unknown): GameState | null {
  if (!isObject(raw)) return null;

  if (isSaveData(raw)) {
    return {
      player: raw.player.player,
      inventory: raw.player.inventory,
      quests: raw.player.quests,
      calendar: raw.calendar,
      economy: raw.player.economy,
      world: raw.world,
    };
  }

  const schema = raw['schemaVersion'];
  if (schema === 4 && isObject(raw['state'])) {
    return isGameState(raw['state']) ? raw['state'] : null;
  }

  if ((schema === 3 || schema === 2 || schema === 1) && isObject(raw['state'])) {
    const candidate = migrateLegacyState(raw['state']);
    return isGameState(candidate) ? candidate : null;
  }

  if (schema === undefined && isObject(raw['inventory'])) {
    const candidate = migrateLegacyState(raw);
    return isGameState(candidate) ? candidate : null;
  }

  return null;
}

export function createSaveData(state: GameState): SaveData {
  if (!isGameState(state)) throw new Error('Cannot save invalid game state');
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    player: {
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
      economy: state.economy,
    },
    calendar: state.calendar,
    world: {
      seed: state.world.seed,
      generatorVersion: state.world.generatorVersion,
      chunks: state.world.chunks,
      crops: state.world.crops,
      removedResources: state.world.removedResources,
      entities: state.world.entities,
    },
  };
}
