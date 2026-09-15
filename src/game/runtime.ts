import { DomainEventBus } from './events';
import { GameCommandHandler } from './command-handler';
import { GameStore, createInitialState } from './store';
import type { GameCommand } from './commands';
import { CombatSystem } from './systems/CombatSystem';
import { CraftingSystem } from './systems/CraftingSystem';
import { DaySystem } from './systems/DaySystem';
import { EconomySystem } from './systems/EconomySystem';
import { FarmingSystem } from './systems/FarmingSystem';
import { FishingSystem } from './systems/FishingSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { QuestSystem } from './systems/QuestSystem';
import { ResourceSystem } from './world/ResourceSystem';
import { WorldRuntime } from './world/runtime';
import { WorldSystem } from './world/WorldSystem';

export class GameRuntime {
  readonly store = new GameStore(createInitialState());
  readonly events = new DomainEventBus();
  readonly quests = new QuestSystem(this.store, this.events);
  readonly farming = new FarmingSystem(this.store, this.events);
  readonly crafting = new CraftingSystem(this.store);
  readonly economy = new EconomySystem(this.store);
  readonly fishing = new FishingSystem(this.store, this.events);
  readonly combat = new CombatSystem(this.store);
  readonly day = new DaySystem(this.store, this.farming);
  readonly world = new WorldSystem();
  readonly player = new PlayerSystem(this.store, this.world);
  readonly resources = new ResourceSystem(this.store, this.events, (state) => new WorldRuntime(state.world));
  private readonly commandHandler = new GameCommandHandler({
    store: this.store,
    combat: this.combat,
    crafting: this.crafting,
    day: this.day,
    economy: this.economy,
    farming: this.farming,
    fishing: this.fishing,
    player: this.player,
    resources: this.resources,
  });

  /**
   * Returns an ECS view over the current transactional game state.
   * A fresh view is intentional: GameStore transactions replace immutable snapshots.
   */
  get worldRuntime(): WorldRuntime {
    return new WorldRuntime(this.store.getState().world);
  }

  dispatch(command: GameCommand): boolean {
    return this.commandHandler.dispatch(command);
  }

  save(): boolean {
    return this.commandHandler.save();
  }

  load(): boolean {
    return this.commandHandler.load();
  }

  destroy(): void {
    this.quests.destroy();
  }
}
