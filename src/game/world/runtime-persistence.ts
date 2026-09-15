import type { WorldRuntime } from './runtime';
import type { WorldSaveData } from './world-save';

/** The only adapter allowed to cross the WorldRuntime <-> GameState persistence boundary. */
export function serializeWorld(runtime: WorldRuntime): WorldSaveData {
  return structuredClone(runtime.exportWorld());
}

export function rehydrateWorld(runtime: WorldRuntime, world: WorldSaveData): void {
  runtime.rehydrate(structuredClone(world));
}
