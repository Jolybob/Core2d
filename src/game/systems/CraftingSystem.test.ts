import { describe, expect, it } from 'vitest';
import { GameStore, createInitialState } from '../store';
import { CraftingSystem } from './CraftingSystem';

describe('CraftingSystem', () => {
  it('consumes materials and upgrades the pickaxe', () => {
    const store = new GameStore(createInitialState());
    const crafting = new CraftingSystem(store);
    expect(crafting.craft('copperPickaxe')).toBe(true);
    const state = store.getState();
    expect(state.inventory.wood).toBe(4);
    expect(state.inventory.ore).toBe(4);
    expect(state.player.pickaxeLevel).toBe(2);
    expect(crafting.craft('copperPickaxe')).toBe(false);
  });

  it('blocks recipes when materials are missing', () => {
    const state = createInitialState();
    state.inventory.wood = 0;
    const crafting = new CraftingSystem(new GameStore(state));
    expect(crafting.canCraft('fishingRod')).toBe(false);
  });
});
