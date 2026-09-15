import { RECIPES } from '../catalog';
import type { GameStore } from '../store';
import type { RecipeId } from '../types';

export class CraftingSystem {
  constructor(private readonly store: GameStore) {}

  canCraft(recipeId: RecipeId): boolean {
    const recipe = RECIPES[recipeId];
    const inventory = this.store.getState().inventory;
    return Object.entries(recipe.costs).every(([item, amount]) => (inventory[item] ?? 0) >= (amount ?? 0));
  }

  craft(recipeId: RecipeId): boolean {
    if (!this.canCraft(recipeId)) return false;
    const recipe = RECIPES[recipeId];
    this.store.update((state) => {
      for (const [item, amount] of Object.entries(recipe.costs)) {
        state.inventory[item] = (state.inventory[item] ?? 0) - (amount ?? 0);
      }
      switch (recipeId) {
        case 'copperPickaxe': state.player.pickaxeLevel += 1; break;
        case 'sword': state.inventory.sword = (state.inventory.sword ?? 0) + 1; break;
        case 'torch': state.inventory.torch = (state.inventory.torch ?? 0) + 1; break;
        case 'healingSalve': break;
        case 'fishingRod': state.inventory.rod = (state.inventory.rod ?? 0) + 1; break;
      }
    });
    return true;
  }
}
