import { describe, expect, it } from 'vitest';
import { GameStore, createInitialState } from './store';

describe('GameStore', () => {
  it('returns isolated snapshots', () => {
    const store = new GameStore(createInitialState());
    const snapshot = store.getState();
    snapshot.inventory.wood = 999;
    expect(store.getState().inventory.wood).toBe(12);
  });

  it('publishes the committed state after an update', () => {
    const store = new GameStore(createInitialState());
    let money = 0;
    const unsubscribe = store.subscribe((state) => { money = state.player.money; });
    store.update((state) => { state.player.money += 25; });
    unsubscribe();
    expect(money).toBe(145);
  });

  it('only notifies selector subscribers when the selected value changes', () => {
    const store = new GameStore(createInitialState());
    let calls = 0;
    const unsubscribe = store.subscribe(
      (state) => state.player.money,
      () => { calls += 1; },
    );

    expect(calls).toBe(1);
    store.update((state) => { state.player.health -= 5; });
    expect(calls).toBe(1);
    store.update((state) => { state.player.money += 10; });
    expect(calls).toBe(2);
    unsubscribe();
  });

  it('supports custom equality for structured selections', () => {
    const store = new GameStore(createInitialState());
    let calls = 0;
    const unsubscribe = store.subscribe(
      (state) => [state.player.health, state.player.hunger],
      () => { calls += 1; },
      (previous, next) => previous[0] === next[0] && previous[1] === next[1],
    );

    expect(calls).toBe(1);
    store.update((state) => { state.player.money += 10; });
    expect(calls).toBe(1);
    store.update((state) => { state.player.hunger -= 1; });
    expect(calls).toBe(2);
    unsubscribe();
  });
});
