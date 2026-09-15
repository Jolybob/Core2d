import type { EntityRegistryState } from '../entity';
import type { CropState } from '../types';
import type { ChunkPersistence } from './chunks';

/** Durable world-owned data. Generated terrain is intentionally absent and reconstructed from seed. */
export interface WorldSaveData {
  seed: number;
  generatorVersion: number;
  chunks: Record<string, ChunkPersistence>;
  crops: Record<string, CropState>;
  removedResources: Record<string, 'tree' | 'rock'>;
  entities: EntityRegistryState;
}

export const CURRENT_GENERATOR_VERSION = 1 as const;

export function createInitialWorldSave(seed = 2042): WorldSaveData {
  return {
    seed,
    generatorVersion: CURRENT_GENERATOR_VERSION,
    chunks: {},
    crops: {},
    removedResources: {},
    entities: { entities: {} },
  };
}
