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
});
