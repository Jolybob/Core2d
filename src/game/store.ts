import type { GameState } from './types';

type Listener = (state: GameState) => void;

export class GameStore {
  private listeners = new Set<Listener>();

  constructor(private state: GameState) {}

  getState(): GameState {
    return this.state;
  }

  update(mutator: (state: GameState) => void): void {
    mutator(this.state);
    for (const listener of this.listeners) listener(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}

export const createInitialState = (): GameState => ({
  player: {
    health: 100,
    stamina: 100,
    hunger: 100,
    money: 120,
    pickaxeLevel: 1,
    tool: 'hoe',
  },
  inventory: {
    wood: 12,
    ore: 8,
    stone: 10,
    berry: 4,
    crystal: 2,
    seeds: 6,
    parsnip: 0,
    torch: 6,
    sword: 1,
    fish: 0,
    coal: 3,
    rod: 0,
  },
  quests: [
    { id: 'harvest', title: 'First Harvest', need: 3, progress: 0, reward: 100, done: false },
    { id: 'copper', title: 'Copper Collector', need: 10, progress: 0, reward: 150, done: false },
    { id: 'fish', title: 'River Friend', need: 3, progress: 0, reward: 125, done: false },
  ],
  calendar: { day: 1, clock: 0, season: 0, weather: 'Sunny' },
  economy: { fishCaught: 0, shipped: 0, totalHarvests: 0 },
});
