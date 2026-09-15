import { loadGame, saveGame } from './persistence';
import { rehydrateWorld } from './world/runtime-persistence';
import type { GameCommand } from './commands';
import type { GameStore } from './store';
import type { WorldRuntime } from './world/runtime';
import type { CombatPort, CraftingPort, DayPort, EconomyPort, FarmingPort, FishingPort, InventoryPort, PlayerPort, ResourcePort } from './system-ports';

const isFiniteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
export interface GameCommandDependencies { store: GameStore; worldRuntime: WorldRuntime; combat: CombatPort; crafting: CraftingPort; day: DayPort; economy: EconomyPort; farming: FarmingPort; fishing: FishingPort; inventory: InventoryPort; player: PlayerPort; resources: ResourcePort; }

export class GameCommandHandler {
  constructor(private readonly dependencies: GameCommandDependencies) {}
  dispatch(command: GameCommand): boolean {
    const worldBefore = this.dependencies.worldRuntime.exportWorld();
    try {
      return this.dependencies.store.transaction(() => {
        this.dependencies.player.refresh();
        return this.dispatchCommand(command);
      });
    } catch (error) {
      this.dependencies.worldRuntime.rehydrate(worldBefore);
      throw error;
    }
  }
  private dispatchCommand(command: GameCommand): boolean { const { combat, crafting, day, economy, farming, fishing, inventory, player, resources } = this.dependencies; switch (command.type) {
    case 'TICK': if (!isFiniteNonNegative(command.deltaSeconds)) return false; return combat.update(command.deltaSeconds) || day.update(command.deltaSeconds);
    case 'MOVE': return player.move(command.dx, command.dy, command.sprint, command.deltaSeconds);
    case 'SELECT_TOOL': return player.selectTool(command.tool);
    case 'TILL': return farming.till(command.key);
    case 'PLANT': return farming.plant(command.key);
    case 'WATER': return farming.water(command.key);
    case 'HARVEST': return farming.harvest(command.key);
    case 'MINE_AT': return resources.mineAt(command.x, command.y);
    case 'CHOP_AT': return resources.chopAt(command.x, command.y);
    case 'FISH': return fishing.catchFish();
    case 'ATTACK': return combat.attack();
    case 'CRAFT': return crafting.craft(command.recipe);
    case 'EAT': return player.eat(command.item);
    case 'USE_SALVE': return player.useSalve();
    case 'BUY_SEEDS': return economy.buySeeds();
    case 'SHIP': return economy.ship();
    case 'DAMAGE': return isFiniteNonNegative(command.amount) && command.amount > 0 && combat.damagePlayer(command.amount);
    case 'INVENTORY_MOVE': return inventory.move(command.source, command.target);
    case 'INVENTORY_LOCK': return inventory.toggleLock(command.slot);
    case 'INVENTORY_SORT': return inventory.sort();
    case 'INVENTORY_HOTBAR_ROW': return inventory.setHotbarRow(command.row);
    case 'INVENTORY_EQUIP': return inventory.equip(command.slot, command.target);
    case 'INVENTORY_QUICK_STACK': return inventory.quickStack();
    case 'SAVE': return this.save();
    case 'LOAD': return this.load();
  } }
  save(): boolean { try { this.dependencies.player.persist(); this.dependencies.farming.refresh(); this.dependencies.inventory.refresh(); const state = this.dependencies.store.getState(); saveGame(state, this.dependencies.worldRuntime); return true; } catch { return false; } }
  load(): boolean { try { const loaded = loadGame(); if (!loaded) return false; this.dependencies.store.replace(loaded.state); rehydrateWorld(this.dependencies.worldRuntime, loaded.world); this.dependencies.player.refresh(); this.dependencies.farming.refresh(); this.dependencies.resources.refresh(); this.dependencies.combat.refresh(); this.dependencies.inventory.refresh(); return true; } catch { return false; } }
}
