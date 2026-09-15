import { loadGame, saveGame } from './persistence';
import { GameStore, createInitialState } from './store';
import type { GameCommand } from './commands';
import { CombatSystem } from './systems/CombatSystem';
import { CraftingSystem } from './systems/CraftingSystem';
import { DaySystem } from './systems/DaySystem';
import { EconomySystem } from './systems/EconomySystem';
import { FarmingSystem } from './systems/FarmingSystem';
import { FishingSystem } from './systems/FishingSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { ResourceSystem } from './world/ResourceSystem';
import { WorldSystem } from './world/WorldSystem';

const isFiniteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

export class GameRuntime {
  readonly store = new GameStore(createInitialState());
  readonly farming = new FarmingSystem(this.store);
  readonly crafting = new CraftingSystem(this.store);
  readonly economy = new EconomySystem(this.store);
  readonly fishing = new FishingSystem(this.store);
  readonly combat = new CombatSystem(this.store);
  readonly day = new DaySystem(this.store, this.farming);
  readonly world = new WorldSystem();
  readonly player = new PlayerSystem(this.store, this.world);
  readonly resources = new ResourceSystem(this.store);

  dispatch(command: GameCommand): boolean {
    switch (command.type) {
      case 'TICK':
        if (!isFiniteNonNegative(command.deltaSeconds)) return false;
        this.day.update(command.deltaSeconds);
        return true;
      case 'MOVE': return this.player.move(command.dx, command.dy, command.sprint, command.deltaSeconds);
      case 'SELECT_TOOL': return this.player.selectTool(command.tool);
      case 'TILL': return this.farming.till(command.key);
      case 'PLANT': return this.farming.plant(command.key);
      case 'WATER': return this.farming.water(command.key);
      case 'HARVEST': return this.farming.harvest(command.key);
      case 'MINE_AT': return this.resources.mineAt(command.x, command.y);
      case 'CHOP_AT': return this.resources.chopAt(command.x, command.y);
      case 'FISH': return this.fishing.catchFish();
      case 'ATTACK': return this.combat.attack();
      case 'CRAFT': return this.crafting.craft(command.recipe);
      case 'EAT': {
        const item = command.item;
        if (item !== 'berry' && item !== 'fish' && item !== 'parsnip') return false;
        return this.player.eat(item);
      }
      case 'USE_SALVE': return this.player.useSalve();
      case 'BUY_SEEDS': return this.economy.buySeeds();
      case 'SHIP': return this.economy.ship();
      case 'DAMAGE': return isFiniteNonNegative(command.amount) && command.amount > 0 && this.combat.damagePlayer(command.amount);
      case 'SAVE': return this.save();
      case 'LOAD': return this.load();
    }
  }

  save(): boolean {
    try { saveGame(this.store.getState()); return true; } catch { return false; }
  }

  load(): boolean {
    try {
      const state = loadGame();
      if (!state) return false;
      this.store.replace(state);
      return true;
    } catch { return false; }
  }
}
