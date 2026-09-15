import type { EntityId, EntityState, HealthComponent, PositionComponent } from './entity';

export const ENTITY_DEFINITIONS = {
  player: { kind: 'player', maxHealth: 100, tags: ['character'] },
  tree: { kind: 'tree', maxHealth: 25, tags: ['resource', 'wood'] },
  rock: { kind: 'rock', maxHealth: 40, tags: ['resource', 'stone'] },
  slime: { kind: 'slime', maxHealth: 30, tags: ['enemy'] },
} as const;

export type EntityKind = keyof typeof ENTITY_DEFINITIONS;

export interface DefinedEntityState extends EntityState {
  kind: EntityKind;
  position?: PositionComponent;
  health?: HealthComponent;
}

export function createEntityState(kind: EntityKind, id: EntityId, position?: PositionComponent): DefinedEntityState {
  const definition = ENTITY_DEFINITIONS[kind];
  return {
    id,
    kind,
    ...(position ? { position: { ...position } } : {}),
    ...(definition.maxHealth !== undefined
      ? { health: { health: definition.maxHealth, maxHealth: definition.maxHealth } }
      : {}),
  };
}
