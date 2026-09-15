export type EntityId = string & { readonly __entityId: unique symbol };

let nextEntityId = 0;

export function createEntityId(prefix = 'entity'): EntityId {
  nextEntityId += 1;
  return `${prefix}-${nextEntityId.toString(36)}` as EntityId;
}

export interface EntityState {
  id: EntityId;
  kind: string;
}

export interface PositionComponent {
  x: number;
  y: number;
}

export interface HealthComponent {
  health: number;
  maxHealth: number;
}

export interface EntityRegistryState {
  entities: Record<EntityId, EntityState>;
}

export const createEntityRegistryState = (): EntityRegistryState => ({ entities: {} });

export function isEntityId(value: string): value is EntityId {
  return value.length > 0;
}
