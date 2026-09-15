import type { DomainEventBus } from '../events';
import type { GameStore } from '../store';

export class FishingSystem {
  constructor(private readonly store: GameStore, private readonly events: DomainEventBus) {}

  catchFish(): boolean {
    if ((this.store.getState().inventory.rod ?? 0) < 1) return false;
    this.store.update((state) => {
      state.inventory.fish = (state.inventory.fish ?? 0) + 1;
      state.economy.fishCaught += 1;
    });
    this.events.publish({ type: 'FISH_CAUGHT' });
    return true;
  }
}
