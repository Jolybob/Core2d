import type { GameStore } from '../store';

export class QuestSystem {
  constructor(private readonly store: GameStore) {}

  progress(id: string, amount = 1): void {
    this.store.update((state) => {
      const quest = state.quests.find((entry) => entry.id === id);
      if (!quest || quest.done) return;
      quest.progress = Math.min(quest.need, quest.progress + amount);
      if (quest.progress >= quest.need) {
        quest.done = true;
        state.player.money += quest.reward;
      }
    });
  }

  getActive() {
    return this.store.getState().quests.filter((quest) => !quest.done);
  }
}
