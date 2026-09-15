import type { DomainEventBus } from '../events';
import type { GameStatePort } from '../store-ports';

export class FishingSystem {
  constructor(private readonly store: GameStatePort, private readonly events: DomainEventBus) {}

  catchFish(): boolean {
    if (this.store.select((state) => (state.inventory.rod ?? 0) < 1)) return false;
    this.store.update((state) => {
      state.inventory.fish = (state.inventory.fish ?? 0) + 1;
      state.economy.fishCaught += 1;
    });
    this.events.publish({ type: 'FISH_CAUGHT' });
    return true;
  }
}
