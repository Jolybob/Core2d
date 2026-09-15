import type { GameStore } from '../store';

export class EconomySystem {
  constructor(private readonly store: GameStore) {}

  addMoney(amount: number): void {
    this.store.update((state) => { state.player.money += amount; });
  }

  buySeeds(cost = 20, amount = 5): boolean {
    if (this.store.select((state) => state.player.money) < cost) return false;
    this.store.update((state) => {
      state.player.money -= cost;
      state.inventory.seeds = (state.inventory.seeds ?? 0) + amount;
    });
    return true;
  }

  sellFish(value = 25): boolean {
    if (this.store.select((state) => (state.inventory.fish ?? 0) < 1)) return false;
    this.store.update((state) => {
      state.inventory.fish -= 1;
      state.player.money += value;
      state.economy.shipped += 1;
    });
    return true;
  }

  shipParsnips(value = 35): number {
    const amount = this.store.select((state) => state.inventory.parsnip ?? 0);
    if (!amount) return 0;
    this.store.update((state) => {
      state.inventory.parsnip = 0;
      state.player.money += amount * value;
      state.economy.shipped += amount;
    });
    return amount;
  }

  ship(): boolean {
    const parsnips = this.store.select((state) => state.inventory.parsnip ?? 0);
    const fish = this.store.select((state) => state.inventory.fish ?? 0);
    if (!parsnips && !fish) return false;
    this.store.update((next) => {
      next.inventory.parsnip = 0;
      next.inventory.fish = 0;
      next.player.money += parsnips * 35 + fish * 25;
      next.economy.shipped += parsnips + fish;
    });
    return true;
  }
}
