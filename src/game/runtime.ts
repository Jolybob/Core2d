import { GameStore, createInitialState } from './store';
import { CombatSystem } from './systems/CombatSystem';
import { CraftingSystem } from './systems/CraftingSystem';
import { DaySystem } from './systems/DaySystem';
import { EconomySystem } from './systems/EconomySystem';
import { FarmingSystem } from './systems/FarmingSystem';
import { FishingSystem } from './systems/FishingSystem';
import { QuestSystem } from './systems/QuestSystem';

export class GameRuntime {
  readonly store = new GameStore(createInitialState());
  readonly farming = new FarmingSystem(this.store);
  readonly crafting = new CraftingSystem(this.store);
  readonly economy = new EconomySystem(this.store);
  readonly fishing = new FishingSystem(this.store);
  readonly combat = new CombatSystem(this.store);
  readonly quests = new QuestSystem(this.store);
  readonly day = new DaySystem(this.store, this.farming);
}
