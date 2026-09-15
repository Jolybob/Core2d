import type { GameState, InventoryState } from './types';

type Listener = (state: GameState) => void;

export class GameStore {
  private readonly listeners = new Set<Listener>();

  constructor(private state: GameState) {}

  getState(): GameState {
    return structuredClone(this.state);
  }

  update(mutator: (state: GameState) => void): void {
    const next = structuredClone(this.state);
    mutator(next);
    this.state = next;
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }

  replace(state: GameState): void {
    this.state = structuredClone(state);
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }
}

const inventory = (): InventoryState => ({
  wood: 12,
  stone: 10,
  ore: 8,
  crystal: 2,
  berry: 4,
  parsnip: 0,
  seeds: 6,
  torch: 6,
  sword: 1,
  fish: 0,
  coal: 3,
  rod: 0,
  salve: 0,
});

export const createInitialState = (): GameState => ({
  player: {
    x: 35 * 24 + 12,
    y: 27 * 24 + 12,
    health: 100,
    stamina: 100,
    hunger: 100,
    money: 120,
    pickaxeLevel: 1,
    tool: 'hoe',
  },
  inventory: inventory(),
  quests: [
    { id: 'harvest', title: 'First Harvest', need: 3, progress: 0, reward: 100, done: false },
    { id: 'copper', title: 'Copper Collector', need: 10, progress: 0, reward: 150, done: false },
    { id: 'fish', title: 'River Friend', need: 3, progress: 0, reward: 125, done: false },
  ],
  calendar: { day: 1, clock: 0, season: 0, weather: 'Sunny' },
  economy: { fishCaught: 0, shipped: 0, totalHarvests: 0 },
  world: { seed: 2042, crops: {}, removedResources: {} },
});
