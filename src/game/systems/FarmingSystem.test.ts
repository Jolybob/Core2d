import { describe, expect, it } from 'vitest';
import { GameRuntime } from '../runtime';

const cropId = (key: string): string => `crop-${encodeURIComponent(key)}`;

describe('FarmingSystem ECS runtime', () => {
  it('stores crops as persisted ECS entities while keeping the legacy mirror', () => {
    const runtime = new GameRuntime();

    expect(runtime.dispatch({ type: 'TILL', key: '4,7' })).toBe(true);
    expect(runtime.dispatch({ type: 'PLANT', key: '4,7' })).toBe(true);
    expect(runtime.dispatch({ type: 'WATER', key: '4,7' })).toBe(true);

    const id = cropId('4,7');
    const entity = runtime.worldRuntime.entities.get(id as never);
    const component = runtime.worldRuntime.components.get('crop', id as never);

    expect(entity?.kind).toBe('crop');
    expect(component).toMatchObject({ key: '4,7', stage: 1, watered: true, tilled: true });
    expect(runtime.store.getState().world.crops['4,7']).toEqual({ stage: 1, watered: true, tilled: true });
    expect(runtime.store.getState().world.entities.components?.[id]).toMatchObject({
      crop: { key: '4,7', stage: 1, watered: true, tilled: true },
      position: { x: 4, y: 7 },
    });
  });

  it('grows and harvests through ECS without duplicating entities', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'TILL', key: '2,3' });
    runtime.dispatch({ type: 'PLANT', key: '2,3' });

    for (let i = 0; i < 2; i += 1) {
      expect(runtime.dispatch({ type: 'WATER', key: '2,3' })).toBe(true);
      runtime.farming.grow();
    }

    expect(runtime.farming.getCrop('2,3')?.stage).toBe(3);
    expect(runtime.farming.getCrop('2,3')?.watered).toBe(false);
    expect(runtime.dispatch({ type: 'HARVEST', key: '2,3' })).toBe(true);
    expect(runtime.worldRuntime.query.with('crop')).toHaveLength(0);
    expect(runtime.store.getState().world.crops['2,3']).toBeUndefined();
  });

  it('rehydrates legacy crops into ECS on first access', () => {
    const runtime = new GameRuntime();
    runtime.store.update((state) => {
      state.world.crops['9,10'] = { stage: 2, watered: true, tilled: true };
    });

    expect(runtime.farming.getCrop('9,10')).toEqual({ stage: 2, watered: true, tilled: true });
    expect(runtime.worldRuntime.query.with('crop')).toHaveLength(1);
    expect(runtime.worldRuntime.components.get('position', cropId('9,10') as never)).toEqual({ x: 9, y: 10 });
  });
});
