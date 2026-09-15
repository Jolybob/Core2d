import type { DomainEventBus } from '../events';
import type { ConsumableId, PlayerState, ToolId } from '../types';
import type { GameStatePort } from '../store-ports';
import { createEntityId, type EntityId } from '../entity';
import { WorldRuntime } from '../world/runtime';

const isFiniteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
const MAX_STAT = 100;
const STARVATION_DAMAGE_PER_SECOND = 2;
const RESPAWN_HUNGER = 60;
const DEATH_MONEY_LOSS_RATE = 0.1;
const RESPAWN_POSITION = { x: 35 * 24 + 12, y: 27 * 24 + 12 };
type PlayerComponent = PlayerState & Record<string, unknown>;
const PLAYER_ENTITY_ID = createEntityId('player');

/** Player simulation is owned by WorldRuntime; GameState is the application/UI mirror. */
export class PlayerSystem {
  private playerId: EntityId;

  constructor(
    private readonly store: GameStatePort,
    private readonly runtime: WorldRuntime,
    private readonly events?: DomainEventBus,
  ) {
    this.playerId = this.ensureEntity();
    this.refresh();
    this.persist();
  }

  refresh(): void { this.setComponent(this.store.select((current) => current.player)); }

  persist(): void {
    const component = this.runtime.components.get<PlayerComponent>('player', this.playerId);
    if (!component) return;
    this.store.update((state) => {
      state.player.x = component.x;
      state.player.y = component.y;
      state.player.health = component.health;
      state.player.stamina = component.stamina;
      state.player.hunger = component.hunger;
      state.player.tool = component.tool;
    });
  }

  move(dx: number, dy: number, sprint: boolean, deltaSeconds: number): boolean {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !isFiniteNonNegative(deltaSeconds)) return false;
    const length = Math.hypot(dx, dy);
    if (!length || deltaSeconds <= 0) return false;
    const player = this.readComponent();
    const canSprint = sprint && player.stamina > 2;
    const speed = canSprint ? 230 : 145;
    const next = { x: player.x + (dx / length) * speed * deltaSeconds, y: player.y + (dy / length) * speed * deltaSeconds };
    if (!this.runtime.canMove(next.x, next.y)) return false;
    player.x = next.x;
    player.y = next.y;
    player.stamina = Math.max(0, player.stamina - deltaSeconds * (canSprint ? 12 : 3));
    this.setComponent(player);
    this.syncToState(player);
    return true;
  }

  selectTool(tool: ToolId): boolean {
    const player = this.readComponent();
    player.tool = tool;
    this.setComponent(player);
    this.syncToState(player);
    return true;
  }

  eat(item: ConsumableId): boolean {
    if (this.store.select((state) => state.inventory[item]) < 1) return false;
    this.store.update((state) => { state.inventory[item] -= 1; });
    const player = this.readComponent();
    player.hunger = Math.min(MAX_STAT, player.hunger + (item === 'parsnip' ? 35 : item === 'fish' ? 20 : 25));
    this.setComponent(player);
    this.syncToState(player);
    return true;
  }

  useSalve(): boolean {
    const player = this.readComponent();
    if (this.store.select((state) => state.inventory.salve < 1 || player.health >= MAX_STAT)) return false;
    this.store.update((next) => { next.inventory.salve -= 1; });
    player.health = Math.min(MAX_STAT, player.health + 35);
    this.setComponent(player);
    this.syncToState(player);
    return true;
  }

  damage(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const player = this.readComponent();
    player.health = Math.max(0, player.health - amount);
    if (player.health === 0) {
      this.respawn(player);
      return true;
    }
    this.setComponent(player);
    this.syncToState(player);
    return false;
  }

  advanceTime(deltaSeconds: number): void {
    if (!isFiniteNonNegative(deltaSeconds)) return;
    const player = this.readComponent();
    player.hunger = Math.max(0, player.hunger - deltaSeconds * 0.25);
    player.stamina = Math.min(MAX_STAT, player.stamina + deltaSeconds * (player.hunger < 20 ? 5 : 12));
    if (player.hunger === 0 && player.health > 0) {
      player.health = Math.max(0, player.health - deltaSeconds * STARVATION_DAMAGE_PER_SECOND);
      if (player.health === 0) {
        this.respawn(player);
        return;
      }
    }
    this.setComponent(player);
    this.syncToState(player);
  }

  startNewDay(): void {
    const player = this.readComponent();
    player.stamina = MAX_STAT;
    player.health = Math.min(MAX_STAT, player.health + 10);
    player.hunger = Math.max(0, player.hunger - 6);
    this.setComponent(player);
    this.syncToState(player);
  }

  private respawn(player: PlayerState): void {
    const money = this.store.select((state) => state.player.money);
    const moneyLost = Math.floor(money * DEATH_MONEY_LOSS_RATE);
    player.x = RESPAWN_POSITION.x;
    player.y = RESPAWN_POSITION.y;
    player.health = MAX_STAT;
    player.stamina = MAX_STAT;
    player.hunger = RESPAWN_HUNGER;
    this.store.update((state) => { state.player.money = Math.max(0, state.player.money - moneyLost); });
    this.setComponent(player);
    this.syncToState(player);
    this.events?.publish({ type: 'PLAYER_DEFEATED', moneyLost });
  }

  private ensureEntity(): EntityId {
    const existing = this.runtime.query.with('player').find((entity) => entity.kind === 'player');
    if (existing) return existing.id;
    if (this.runtime.entities.has(PLAYER_ENTITY_ID)) return PLAYER_ENTITY_ID;
    return this.runtime.createEntity('player', {
      player: { ...this.store.select((state) => state.player) },
      position: this.store.select((state) => ({ x: state.player.x, y: state.player.y })),
    });
  }

  private readComponent(): PlayerComponent {
    const value = this.runtime.components.get<PlayerComponent>('player', this.playerId);
    if (!value) {
      const state = this.store.select((current) => current.player);
      this.setComponent(state);
      return { ...state };
    }
    return { ...value };
  }

  private setComponent(player: PlayerState): void {
    const component: PlayerComponent = { ...player };
    if (!this.runtime.entities.has(this.playerId)) {
      this.playerId = this.runtime.createEntity('player', { player: component, position: { x: player.x, y: player.y } });
      return;
    }
    this.runtime.setComponent(this.playerId, 'player', component);
    this.runtime.setComponent(this.playerId, 'position', { x: player.x, y: player.y });
  }

  private syncToState(player: PlayerState): void {
    this.store.update((state) => {
      state.player.x = player.x;
      state.player.y = player.y;
      state.player.health = player.health;
      state.player.stamina = player.stamina;
      state.player.hunger = player.hunger;
      state.player.tool = player.tool;
    });
  }
}
