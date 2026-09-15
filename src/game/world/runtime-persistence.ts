import type { WorldRuntime } from './runtime';
import type { WorldSaveData } from './world-save';

/** Explicit adapter between the authoritative WorldRuntime and durable world data. */
export function serializeWorld(runtime: WorldRuntime): WorldSaveData {
  return structuredClone(runtime.exportWorld());
}

export function rehydrateWorld(runtime: WorldRuntime, world: WorldSaveData): void {
  runtime.rehydrate(structuredClone(world));
}
