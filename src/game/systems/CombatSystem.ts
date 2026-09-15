import type { DomainEventBus } from '../events';
import type { GameStatePort } from '../store-ports';
import { CHUNK_SIZE, chunkKey, seededUnit, TILE_SIZE, worldToChunk, type ChunkCoord } from '../world/chunks';
import type { EntityId } from '../entity';
import type { PlayerSystem } from './PlayerSystem';
import { WorldRuntime, type ComponentValue } from '../world/runtime';

const ATTACK_RANGE = 3.2;
const ATTACK_DAMAGE = 15;
const SLIME_DAMAGE = 8;
const SLIME_SPEED = 42;
const SLIME_ATTACK_RANGE = 1.35;
const SLIME_ATTACK_COOLDOWN = 1.1;
const SLIMES_PER_CHUNK = 1;

type EnemyComponent = ComponentValue & { key: string; kind: 'slime' };
type Health = ComponentValue & { health: number; maxHealth: number };
type Position = ComponentValue & { x: number; y: number };

export class CombatSystem {
  private readonly slimeCooldowns = new Map<EntityId, number>();

  constructor(
    private readonly store: GameStatePort,
    private readonly player: PlayerSystem,
    private readonly runtime?: WorldRuntime,
    private readonly events?: DomainEventBus,
  ) {}

  refresh(): void {
    if (!this.runtime) return;
    for (const chunk of this.runtime.loadedChunkCoords()) this.ensureSlimes(chunk);
  }

  attack(): boolean {
    if (!this.runtime) return this.store.select((state) => state.inventory.sword > 0);
    if (this.store.select((state) => state.inventory.sword < 1)) return false;
    const playerEntity = this.findPlayer();
    const playerPosition = playerEntity ? this.runtime.components.get<Position>('position', playerEntity.id) : undefined;
    if (!playerPosition) return false;

    let target: { id: EntityId; distance: number } | undefined;
    for (const entity of this.runtime.query.with('enemy', 'position', 'health')) {
      const enemy = this.runtime.components.get<EnemyComponent>('enemy', entity.id);
      const position = this.runtime.components.get<Position>('position', entity.id);
      if (!enemy || enemy.kind !== 'slime' || !position) continue;
      const distance = Math.hypot(position.x - playerPosition.x, position.y - playerPosition.y);
      if (distance <= ATTACK_RANGE && (!target || distance < target.distance)) target = { id: entity.id, distance };
    }
    if (!target) return false;

    const health = this.runtime.components.get<Health>('health', target.id);
    if (!health) return false;
    health.health = Math.max(0, health.health - ATTACK_DAMAGE);
    this.runtime.setComponent(target.id, 'health', health);
    if (health.health === 0) this.defeat(target.id);
    return true;
  }

  update(deltaSeconds: number): boolean {
    if (!this.runtime || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
    this.refresh();
    const playerEntity = this.findPlayer();
    const playerPosition = playerEntity ? this.runtime.components.get<Position>('position', playerEntity.id) : undefined;
    if (!playerPosition) return false;

    let acted = false;
    for (const entity of this.runtime.query.with('enemy', 'position', 'health')) {
      const enemy = this.runtime.components.get<EnemyComponent>('enemy', entity.id);
      const position = this.runtime.components.get<Position>('position', entity.id);
      const health = this.runtime.components.get<Health>('health', entity.id);
      if (!enemy || !position || !health || health.health <= 0) continue;
      const dx = playerPosition.x - position.x;
      const dy = playerPosition.y - position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > SLIME_ATTACK_RANGE && distance > 0) {
        const step = Math.min(distance - SLIME_ATTACK_RANGE, SLIME_SPEED * deltaSeconds);
        const nextX = position.x + (dx / distance) * step;
        const nextY = position.y + (dy / distance) * step;
        if (this.runtime.canMove(nextX, nextY)) {
          this.runtime.setComponent(entity.id, 'position', { x: nextX, y: nextY });
          acted = true;
        }
      } else {
        const remaining = (this.slimeCooldowns.get(entity.id) ?? 0) - deltaSeconds;
        if (remaining <= 0) {
          this.slimeCooldowns.set(entity.id, SLIME_ATTACK_COOLDOWN);
          this.damagePlayer(SLIME_DAMAGE);
          acted = true;
        } else {
          this.slimeCooldowns.set(entity.id, remaining);
        }
      }
    }
    return acted;
  }

  damagePlayer(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    return this.player.damage(amount);
  }

  rewardSlime(): void {
    this.store.update((state) => { state.inventory.ore += 1; });
  }

  private defeat(entityId: EntityId): void {
    const enemy = this.runtime?.components.get<EnemyComponent>('enemy', entityId);
    const position = this.runtime?.components.get<Position>('position', entityId);
    if (!this.runtime || !enemy || !position) return;
    const chunk = worldToChunk({ x: Math.floor(position.x), y: Math.floor(position.y) });
    this.runtime.markChunkEntityRemoved(chunk, enemy.key);
    this.runtime.removeEntity(entityId);
    this.slimeCooldowns.delete(entityId);
    this.rewardSlime();
    this.events?.publish({ type: 'SLIME_DEFEATED', key: enemy.key });
  }

  private findPlayer() {
    return this.runtime?.query.with('player', 'position').find((entity) => entity.kind === 'player');
  }

  private ensureSlimes(chunk: ChunkCoord): void {
    if (!this.runtime) return;
    const existing = new Set<string>();
    for (const entity of this.runtime.query.withInChunks(new Set([chunkKey(chunk)]), 'enemy', 'position')) {
      const enemy = this.runtime.components.get<EnemyComponent>('enemy', entity.id);
      if (enemy?.kind === 'slime') existing.add(enemy.key);
    }
    const seed = this.runtime.readPersistence((world) => world.seed);
    for (let slot = 0; slot < SLIMES_PER_CHUNK; slot += 1) {
      const x = chunk.x * CHUNK_SIZE + Math.floor(seededUnit(seed + 701, chunk.x * 43 + slot, chunk.y * 59 + 13) * CHUNK_SIZE);
      const y = chunk.y * CHUNK_SIZE + Math.floor(seededUnit(seed + 809, chunk.x * 71 + slot, chunk.y * 37 + 29) * CHUNK_SIZE);
      const key = `slime:${x},${y}`;
      if (existing.has(key) || this.runtime.isChunkEntityRemoved(chunk, key) || !this.runtime.canMove(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2)) continue;
      this.runtime.createEntity('slime', {
        enemy: { key, kind: 'slime' },
        position: { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 },
        health: { health: 30, maxHealth: 30 },
      });
      existing.add(key);
    }
  }
}
