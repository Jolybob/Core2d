import type { DomainEvent, DomainEventBus } from '../events';
import type { GameState, QuestState } from '../types';
import type { GameStatePort } from '../store-ports';

export class QuestSystem {
  private unsubscribe: (() => void) | undefined;

  constructor(store?: GameStatePort, events?: DomainEventBus) {
    if (store && events) {
      this.unsubscribe = events.subscribe((event) => this.handleEvent(event, store));
    }
  }

  progress(state: GameState, questId: string, amount = 1): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const quest = state.quests.find((entry) => entry.id === questId);
    if (!quest || quest.done) return false;

    const previous = quest.progress;
    quest.progress = Math.min(quest.need, quest.progress + amount);
    if (quest.progress >= quest.need) {
      quest.done = true;
      state.player.money += quest.reward;
    }
    return quest.progress > previous;
  }

  get(state: GameState, questId: string): QuestState | undefined {
    return state.quests.find((entry) => entry.id === questId);
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private handleEvent(event: DomainEvent, store: GameStatePort): void {
    switch (event.type) {
      case 'CROP_HARVESTED':
        store.update((state) => {
          this.progress(state, 'harvest');
        });
        break;
      case 'ORE_MINED':
        store.update((state) => {
          this.progress(state, 'copper');
        });
        break;
      case 'FISH_CAUGHT':
        store.update((state) => {
          this.progress(state, 'fish');
        });
        break;
    }
  }
}
