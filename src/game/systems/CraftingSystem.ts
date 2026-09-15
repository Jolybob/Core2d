import { RECIPES } from '../catalog';
import type { GameStore } from '../store';
import { ITEM_IDS, type ItemId, type RecipeId } from '../types';

export class CraftingSystem {
  constructor(private readonly store: GameStore) {}

  canCraft(recipeId: RecipeId): boolean {
    const player = this.store.select((state) => state.player);
    const inventory = this.store.select((state) => state.inventory);
    if (recipeId === 'copperPickaxe' && player.pickaxeLevel >= 2) return false;
    if (recipeId === 'sword' && inventory.sword > 0) return false;
    if (recipeId === 'fishingRod' && inventory.rod > 0) return false;
    if (recipeId === 'healingSalve' && (player.pickaxeLevel < 2 || inventory.salve > 0)) return false;
    const recipe = RECIPES[recipeId];
    return ITEM_IDS.every((item: ItemId) => {
      const amount = recipe.costs[item];
      return amount === undefined || inventory[item] >= amount;
    });
  }

  craft(recipeId: RecipeId): boolean {
    if (!this.canCraft(recipeId)) return false;
    const recipe = RECIPES[recipeId];
    this.store.update((state) => {
      for (const item of ITEM_IDS) {
        const amount = recipe.costs[item];
        if (amount !== undefined) state.inventory[item] -= amount;
      }
      switch (recipeId) {
        case 'copperPickaxe': state.player.pickaxeLevel += 1; break;
        case 'sword': state.inventory.sword = 1; break;
        case 'torch': state.inventory.torch += 3; break;
        case 'healingSalve': state.inventory.salve += 1; break;
        case 'fishingRod': state.inventory.rod = 1; break;
      }
    });
    return true;
  }
}
