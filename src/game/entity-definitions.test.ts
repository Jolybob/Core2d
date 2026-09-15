import { describe, expect, it } from 'vitest';
import { createEntityState, ENTITY_DEFINITIONS } from './entity-definitions';
import { createEntityId } from './entity';

describe('entity definitions', () => {
  it('creates entity state from catalog data', () => {
    const id = createEntityId('slime');
    const entity = createEntityState('slime', id, { x: 12, y: 24 });

    expect(entity).toEqual({
      id,
      kind: 'slime',
      position: { x: 12, y: 24 },
      health: { health: 30, maxHealth: 30 },
    });
  });

  it('keeps definitions centralized and data driven', () => {
    expect(ENTITY_DEFINITIONS.tree.tags).toContain('resource');
    expect(ENTITY_DEFINITIONS.rock.maxHealth).toBe(40);
  });
});
