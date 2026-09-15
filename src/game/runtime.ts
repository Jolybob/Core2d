import { loadGame, saveGame } from './persistence';
import { GameStore, createInitialState } from './store';
import type { GameCommand } from './commands';
import { CombatSystem } from './systems/CombatSystem';
import { CraftingSystem } from './systems/CraftingSystem';
import { DaySystem } from './systems/DaySystem';
import { EconomySystem } from './systems/EconomySystem';
import { FarmingSystem } from './systems/FarmingSystem';
import { FishingSystem } from './systems/FishingSystem';
import { ResourceSystem } from './world/ResourceSystem';
import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH, WorldSystem } from './world/WorldSystem';
import type { ToolId } from './types';

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
  readonly resources = new ResourceSystem(this.store);

  dispatch(command: GameCommand): boolean {
    switch (command.type) {
      case 'TICK':
        if (!isFiniteNonNegative(command.deltaSeconds)) return false;
        this.day.update(command.deltaSeconds);
        return true;
      case 'MOVE':
        if (!Number.isFinite(command.dx) || !Number.isFinite(command.dy) || !isFiniteNonNegative(command.deltaSeconds)) return false;
        return this.move(command.dx, command.dy, command.sprint, command.deltaSeconds);
      case 'SELECT_TOOL': return this.selectTool(command.tool);
      case 'TILL': return this.farming.till(command.key);
      case 'PLANT': return this.farming.plant(command.key);
      case 'WATER': return this.farming.water(command.key);
      case 'HARVEST': return this.farming.harvest(command.key);
      case 'MINE_AT': return this.resources.mineAt(command.x, command.y);
      case 'CHOP_AT': return this.resources.chopAt(command.x, command.y);
      case 'FISH': return this.fishing.catchFish();
      case 'ATTACK': return this.store.getState().inventory.sword > 0;
      case 'CRAFT': return this.crafting.craft(command.recipe);
      case 'EAT': {
        const item = command.item;
        if (item !== 'berry' && item !== 'fish' && item !== 'parsnip') return false;
        return this.eat(item);
      }
      case 'USE_SALVE': return this.useSalve();
      case 'BUY_SEEDS': return this.economy.buySeeds();
      case 'SHIP': return this.ship();
      case 'DAMAGE': return isFiniteNonNegative(command.amount) && command.amount > 0 && this.combat.damagePlayer(command.amount);
      case 'SAVE': return this.save();
      case 'LOAD': return this.load();
    }
  }

  private move(dx: number, dy: number, sprint: boolean, deltaSeconds: number): boolean {
    const length = Math.hypot(dx, dy);
    if (!length || deltaSeconds <= 0) return false;
    const state = this.store.getState();
    const canSprint = sprint && state.player.stamina > 2;
    const speed = canSprint ? 230 : 145;
    const next = this.world.clampPosition(
      state.player.x + (dx / length) * speed * deltaSeconds,
      state.player.y + (dy / length) * speed * deltaSeconds,
    );
    if (!this.world.canMove(next.x, next.y)) return false;
    this.store.update((current) => {
      current.player.x = next.x;
      current.player.y = next.y;
      current.player.stamina = Math.max(0, current.player.stamina - deltaSeconds * (canSprint ? 12 : 3));
    });
    return true;
  }

  private selectTool(tool: ToolId): boolean {
    this.store.update((state) => { state.player.tool = tool; });
    return true;
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
    if (state.inventory.salve < 1 || state.player.health >= 100) return false;
    this.store.update((next) => {
      next.inventory.salve -= 1;
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

export { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH };
