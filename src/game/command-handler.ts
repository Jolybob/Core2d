import { loadGame, saveGame } from './persistence';
import type { DomainEventBus } from './events';
import type { GameCommand } from './commands';
import type { GameStore } from './store';
import type { CombatSystem } from './systems/CombatSystem';
import type { CraftingSystem } from './systems/CraftingSystem';
import type { DaySystem } from './systems/DaySystem';
import type { EconomySystem } from './systems/EconomySystem';
import type { FarmingSystem } from './systems/FarmingSystem';
import type { FishingSystem } from './systems/FishingSystem';
import type { PlayerSystem } from './systems/PlayerSystem';
import type { ResourceSystem } from './world/ResourceSystem';

const isFiniteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

export interface GameCommandDependencies {
  store: GameStore;
  events: DomainEventBus;
  combat: CombatSystem;
  crafting: CraftingSystem;
  day: DaySystem;
  economy: EconomySystem;
  farming: FarmingSystem;
  fishing: FishingSystem;
  player: PlayerSystem;
  resources: ResourceSystem;
}

export class GameCommandHandler {
  constructor(private readonly dependencies: GameCommandDependencies) {}

  dispatch(command: GameCommand): boolean {
    const { combat, crafting, day, economy, farming, fishing, player, resources } = this.dependencies;

    switch (command.type) {
      case 'TICK':
        if (!isFiniteNonNegative(command.deltaSeconds)) return false;
        day.update(command.deltaSeconds);
        return true;
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
      case 'SAVE': return this.save();
      case 'LOAD': return this.load();
    }
  }

  save(): boolean {
    try {
      saveGame(this.dependencies.store.getState());
      return true;
    } catch {
      return false;
    }
  }

  load(): boolean {
    try {
      const state = loadGame();
      if (!state) return false;
      this.dependencies.store.replace(state);
      this.dependencies.resources.refresh();
      return true;
    } catch {
      return false;
    }
  }
}
