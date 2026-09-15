import type { GameState, InventoryState } from './types';

type Listener = (state: GameState) => void;
type Selector<T> = (state: GameState) => T;
type SelectedListener<T> = (selected: T, state: GameState) => void;
type Equality<T> = (previous: T, next: T) => boolean;

type Subscription = {
  selector: Selector<unknown>;
  listener: SelectedListener<unknown>;
  equals: Equality<unknown>;
  selected: unknown;
};

const objectIs: Equality<unknown> = Object.is;

export class GameStore {
  private readonly listeners = new Set<Listener>();
  private readonly subscriptions = new Set<Subscription>();

  constructor(private state: GameState) {}

  getState(): GameState {
    return structuredClone(this.state);
  }

  update(mutator: (state: GameState) => void): void {
    const next = structuredClone(this.state);
    mutator(next);
    this.state = next;
    this.notify(next);
  }

  replace(state: GameState): void {
    const next = structuredClone(state);
    this.state = next;
    this.notify(next);
  }

  subscribe(listener: Listener): () => void;
  subscribe<T>(selector: Selector<T>, listener: SelectedListener<T>, equals?: Equality<T>): () => void;
  subscribe<T>(
    selectorOrListener: Selector<T> | Listener,
    listener?: SelectedListener<T>,
    equals: Equality<T> = objectIs as Equality<T>,
  ): () => void {
    if (!listener) {
      const legacyListener = selectorOrListener as Listener;
      this.listeners.add(legacyListener);
      legacyListener(this.getState());
      return () => this.listeners.delete(legacyListener);
    }

    const selector = selectorOrListener as Selector<T>;
    const subscription: Subscription = {
      selector,
      listener: listener as SelectedListener<unknown>,
      equals: equals as Equality<unknown>,
      selected: selector(this.state),
    };
    this.subscriptions.add(subscription);
    listener(subscription.selected as T, this.getState());
    return () => this.subscriptions.delete(subscription);
  }

  private notify(snapshot: GameState): void {
    for (const listener of this.listeners) listener(snapshot);

    for (const subscription of this.subscriptions) {
      const nextSelected = subscription.selector(snapshot);
      if (subscription.equals(subscription.selected, nextSelected)) continue;
      subscription.selected = nextSelected;
      subscription.listener(nextSelected, snapshot);
    }
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
