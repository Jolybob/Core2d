import type { GameState, QuestState } from '../types';

export class QuestSystem {
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
}
