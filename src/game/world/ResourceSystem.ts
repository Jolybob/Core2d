import type { GameState } from '../types';
import type { GameStore } from '../store';
import { TILE_SIZE } from './WorldSystem';

export type ResourceType = 'tree' | 'rock';

export interface ResourceNode {
  key: string;
  type: ResourceType;
  x: number;
  y: number;
  ore: boolean;
}

const INTERACTION_RANGE = 4;

export class ResourceSystem {
  private readonly resources = new Map<string, ResourceNode>();
  private readonly removedKeys = new Set<string>();

  constructor(private readonly store: GameStore) {
    this.generate(store.getState().world.seed);
    for (const key of Object.keys(store.getState().world.removedResources)) this.removedKeys.add(key);
  }

  getAll(): ResourceNode[] {
    return [...this.resources.values()];
  }

  get(key: string): ResourceNode | undefined {
    return this.resources.get(key);
  }

  chopAt(x: number, y: number): boolean {
    const resource = this.findAt(x, y, 'tree');
    return resource ? this.chop(resource.key) : false;
  }

  mineAt(x: number, y: number): boolean {
    const resource = this.findAt(x, y, 'rock');
    return resource ? this.mine(resource.key) : false;
  }

  chop(key: string): boolean {
    return this.remove(key, 'tree', (state) => {
      state.inventory.wood += 3;
    });
  }

  mine(key: string): boolean {
    const resource = this.resources.get(key);
    if (!resource || resource.type !== 'rock' || this.isRemoved(key)) return false;
    this.store.update((state) => {
      state.world.removedResources[key] = 'rock';
      state.inventory.stone += 2;
      if (resource.ore) {
        state.inventory.ore += 1;
        const quest = state.quests.find((entry) => entry.id === 'copper');
        if (quest && !quest.done) quest.progress = Math.min(quest.need, quest.progress + 1);
      }
    });
    this.removedKeys.add(key);
    return true;
  }

  private findAt(x: number, y: number, type: ResourceType): ResourceNode | undefined {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
    const state = this.store.getState();
    const playerX = Math.floor(state.player.x / TILE_SIZE);
    const playerY = Math.floor(state.player.y / TILE_SIZE);
    if (Math.hypot(x - playerX, y - playerY) > INTERACTION_RANGE) return undefined;
    return this.getAll().find((resource) => resource.type === type && !this.isRemoved(resource.key) && Math.abs(resource.x - x) <= 1 && Math.abs(resource.y - y) <= 1);
  }

  private remove(key: string, type: ResourceType, apply: (state: GameState) => void): boolean {
    const resource = this.resources.get(key);
    if (!resource || resource.type !== type || this.isRemoved(key)) return false;
    this.store.update((state) => {
      state.world.removedResources[key] = type;
      apply(state);
    });
    this.removedKeys.add(key);
    return true;
  }

  private isRemoved(key: string): boolean {
    return this.removedKeys.has(key) || Boolean(this.store.getState().world.removedResources[key]);
  }

  private generate(seed: number): void {
    const random = this.seeded(seed);
    for (let i = 0; i < 30; i += 1) {
      const x = 3 + Math.floor(random() * 63);
      const y = 3 + Math.floor(random() * 44);
      if (x > 25 && x < 46 && y > 15 && y < 37) continue;
      const key = `tree:${x},${y}`;
      this.resources.set(key, { key, type: 'tree', x, y, ore: false });
    }
    for (let i = 0; i < 20; i += 1) {
      const x = 54 + Math.floor(random() * 10);
      const y = 20 + Math.floor(random() * 15);
      const key = `rock:${x},${y}`;
      this.resources.set(key, { key, type: 'rock', x, y, ore: i % 3 === 0 });
    }
  }

  private seeded(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }
}
