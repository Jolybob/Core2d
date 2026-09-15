import type { GameState, WorldState } from '../types';
import type { WorldRuntime } from './runtime';
import type { WorldSaveData } from './world-save';

/** The only adapter allowed to cross the WorldRuntime <-> GameState persistence boundary. */
export function serializeWorld(runtime: WorldRuntime): WorldSaveData {
  return structuredClone(runtime.exportWorld());
}

export function rehydrateWorld(runtime: WorldRuntime, state: GameState): void {
  runtime.rehydrate(structuredClone(state.world));
}

export function projectWorld(state: GameState, runtime: WorldRuntime): void {
  state.world = structuredClone(runtime.exportWorld()) as WorldState;
}
