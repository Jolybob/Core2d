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
import { createInitialWorldSave } from './world/world-save';
import { TILE_SIZE, worldToChunk } from './world/chunks';
import { WorldRuntime } from './world/runtime';

const INITIAL_CHUNK_RADIUS = 1;

export class GameRuntime {
  readonly store: GameStore;
  readonly events: DomainEventBus;
  readonly quests: QuestSystem;
  readonly worldRuntime: WorldRuntime;
  readonly farming: FarmingSystem;
  readonly crafting: CraftingSystem;
  readonly economy: EconomySystem;
  readonly fishing: FishingSystem;
  readonly player: PlayerSystem;
  readonly combat: CombatSystem;
  readonly day: DaySystem;
  readonly resources: ResourceSystem;
  private readonly commandHandler: GameCommandHandler;

  constructor() {
    this.store = new GameStore(createInitialState());
    this.events = new DomainEventBus();
    this.quests = new QuestSystem(this.store, this.events);
    const initialState = this.store.getState();
    this.worldRuntime = new WorldRuntime(createInitialWorldSave(2042));
    const center = worldToChunk({ x: Math.floor(initialState.player.x / TILE_SIZE), y: Math.floor(initialState.player.y / TILE_SIZE) });
    for (let y = center.y - INITIAL_CHUNK_RADIUS; y <= center.y + INITIAL_CHUNK_RADIUS; y += 1) for (let x = center.x - INITIAL_CHUNK_RADIUS; x <= center.x + INITIAL_CHUNK_RADIUS; x += 1) this.worldRuntime.loadChunk({ x, y });
    this.farming = new FarmingSystem(this.store, this.events, this.worldRuntime);
    this.crafting = new CraftingSystem(this.store);
    this.economy = new EconomySystem(this.store);
    this.fishing = new FishingSystem(this.store, this.events);
    this.player = new PlayerSystem(this.store, this.worldRuntime);
    this.combat = new CombatSystem(this.store, this.player, this.worldRuntime, this.events);
    this.combat.refresh();
    this.day = new DaySystem(this.store, this.farming, this.worldRuntime, this.player);
    this.resources = new ResourceSystem(this.store, this.events, this.worldRuntime);
    this.commandHandler = new GameCommandHandler({ store: this.store, worldRuntime: this.worldRuntime, combat: this.combat, crafting: this.crafting, day: this.day, economy: this.economy, farming: this.farming, fishing: this.fishing, player: this.player, resources: this.resources });
  }

  dispatch(command: GameCommand): boolean { return this.commandHandler.dispatch(command); }
  save(): boolean { return this.commandHandler.save(); }
  load(): boolean { return this.commandHandler.load(); }
  destroy(): void { this.quests.destroy(); }
}
