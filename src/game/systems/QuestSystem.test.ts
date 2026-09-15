import { describe, expect, it } from 'vitest';
import { QuestSystem } from './QuestSystem';
import { createInitialState } from '../store';

describe('QuestSystem', () => {
  it('progresses a quest without exceeding its requirement', () => {
    const quests = new QuestSystem();
    const state = createInitialState();

    expect(quests.progress(state, 'copper', 4)).toBe(true);
    expect(quests.get(state, 'copper')).toMatchObject({ progress: 4, done: false });
    expect(quests.progress(state, 'copper', 20)).toBe(true);
    expect(quests.get(state, 'copper')).toMatchObject({ progress: 10, done: true });
  });

  it('awards a quest reward exactly once when completed', () => {
    const quests = new QuestSystem();
    const state = createInitialState();
    const startingMoney = state.player.money;

    expect(quests.progress(state, 'harvest', 3)).toBe(true);
    expect(state.player.money).toBe(startingMoney + 100);
    expect(quests.progress(state, 'harvest')).toBe(false);
    expect(state.player.money).toBe(startingMoney + 100);
  });

  it('rejects invalid progress and unknown quests', () => {
    const quests = new QuestSystem();
    const state = createInitialState();

    expect(quests.progress(state, 'missing')).toBe(false);
    expect(quests.progress(state, 'fish', 0)).toBe(false);
    expect(quests.progress(state, 'fish', Number.NaN)).toBe(false);
    expect(quests.get(state, 'missing')).toBeUndefined();
  });
});
