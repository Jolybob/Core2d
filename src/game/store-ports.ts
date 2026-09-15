import type { GameState } from './types';
import type { ReadonlyDeep } from './store';

export interface GameStateReader {
  getState(): GameState;
  select<T>(selector: (state: ReadonlyDeep<GameState>) => T): T;
}

export interface GameStateWriter {
  update(mutator: (state: GameState) => void): void;
  replace(state: GameState): void;
}

export type GameStatePort = GameStateReader & GameStateWriter;
