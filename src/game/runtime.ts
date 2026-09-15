import { loadGame, saveGame } from './persistence';
import { GameStore, createInitialState } from './store';
import type { GameCommand } from './commands';
import { CombatSystem } from './systems/CombatSystem';
import { CraftingSystem } from './systems/CraftingSystem';
import { DaySystem } from './systems/DaySystem';
import { EconomySystem } from './systems/EconomySystem';
import { FarmingSystem } from './systems/FarmingSystem';
import { FishingSystem } from './systems/FishingSystem';
import type { ToolId } from './types';

export class GameRuntime {
  readonly store = new GameStore(createInitialState());
  readonly farming = new FarmingSystem(this.store);
  readonly crafting = new CraftingSystem(this.store);
  readonly economy = new EconomySystem(this.store);
  readonly fishing = new FishingSystem(this.store);
  readonly combat = new CombatSystem(this.store);
  readonly day = new DaySystem(this.store, this.farming);

  dispatch(command: GameCommand): boolean {
    switch (command.type) {
      case 'TICK': this.day.update(command.deltaSeconds); return true;
      case 'MOVE': this.move(command.dx, command.dy, command.sprint, command.deltaSeconds); return true;
      case 'SELECT_TOOL': return this.selectTool(command.tool);
      case 'TILL': return this.farming.till(command.key);
      case 'PLANT': return this.farming.plant(command.key);
      case 'WATER': return this.farming.water(command.key);
      case 'HARVEST': return this.farming.harvest(command.key);
      case 'MINE': this.mine(command.resourceKey, command.ore); return true;
      case 'CHOP': this.chop(command.resourceKey); return true;
      case 'FISH': return this.fishing.catchFish();
      case 'ATTACK': return this.store.getState().inventory.sword > 0;
      case 'CRAFT': return this.crafting.craft(command.recipe);
      case 'EAT': {
        const item = command.item;
        if (item !== 'berry' && item !== 'fish' && item !== 'parsnip') return false;
        return this.eat(item);
      }
      case 'USE_SALVE': return this.useSalve();
      case 'BUY_SEEDS': return this.economy.buySeeds(command.cost, command.amount);
      case 'SHIP': return this.ship();
      case 'DAMAGE': return this.combat.damagePlayer(command.amount);
      case 'SAVE': return this.save();
      case 'LOAD': return this.load();
    }
  }

  private move(dx: number, dy: number, sprint: boolean, deltaSeconds: number): void {
    const length = Math.hypot(dx, dy);
    if (!length) return;
    this.store.update((state) => {
      const canSprint = sprint && state.player.stamina > 2;
      const speed = canSprint ? 230 : 145;
      state.player.x += (dx / length) * speed * deltaSeconds;
      state.player.y += (dy / length) * speed * deltaSeconds;
      state.player.stamina = Math.max(0, state.player.stamina - deltaSeconds * (canSprint ? 12 : 3));
    });
  }

  private selectTool(tool: ToolId): boolean {
    this.store.update((state) => { state.player.tool = tool; });
    return true;
  }

  private mine(resourceKey: string, ore: boolean): void {
    if (this.store.getState().world.removedResources[resourceKey]) return;
    this.store.update((state) => {
      state.world.removedResources[resourceKey] = 'rock';
      state.inventory.stone += 2;
      if (ore) {
        state.inventory.ore += 1;
        const quest = state.quests.find((entry) => entry.id === 'copper');
        if (quest && !quest.done) quest.progress = Math.min(quest.need, quest.progress + 1);
      }
    });
  }

  private chop(resourceKey: string): void {
    if (this.store.getState().world.removedResources[resourceKey]) return;
    this.store.update((state) => {
      state.world.removedResources[resourceKey] = 'tree';
      state.inventory.wood += 3;
    });
  }

  private eat(item: 'berry' | 'fish' | 'parsnip'): boolean {
    if (this.store.getState().inventory[item] < 1) return false;
    this.store.update((state) => {
      state.inventory[item] -= 1;
      const gain = item === 'parsnip' ? 35 : item === 'fish' ? 20 : 25;
      state.player.hunger = Math.min(100, state.player.hunger + gain);
    });
    return true;
  }

  private useSalve(): boolean {
    const state = this.store.getState();
    if (state.inventory.berry < 2 || state.inventory.crystal < 1 || state.player.health >= 100) return false;
    this.store.update((next) => {
      next.inventory.berry -= 2;
      next.inventory.crystal -= 1;
      next.player.health = Math.min(100, next.player.health + 35);
    });
    return true;
  }

  private ship(): boolean {
    const state = this.store.getState();
    const parsnips = state.inventory.parsnip;
    const fish = state.inventory.fish;
    if (!parsnips && !fish) return false;
    this.store.update((next) => {
      next.inventory.parsnip = 0;
      next.inventory.fish = 0;
      next.player.money += parsnips * 35 + fish * 25;
      next.economy.shipped += parsnips + fish;
    });
    return true;
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
