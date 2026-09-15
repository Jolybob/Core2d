import { describe, expect, it } from 'vitest';
import { createSeededRandom } from './random';

describe('deterministic random source', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createSeededRandom(9001);
    const second = createSeededRandom(9001);

    expect([first.next(), first.next(), first.next()]).toEqual([second.next(), second.next(), second.next()]);
  });

  it('supports deterministic bounded integers and choices', () => {
    const random = createSeededRandom(42);
    const values = ['tree', 'rock', 'ore'] as const;

    expect(random.nextInt(1, 3)).toBeGreaterThanOrEqual(1);
    expect(random.nextInt(1, 3)).toBeLessThanOrEqual(3);
    expect(values).toContain(random.pick(values));
  });

  it('rejects invalid ranges and probabilities', () => {
    const random = createSeededRandom(1);

    expect(() => random.nextInt(3, 1)).toThrow();
    expect(() => random.chance(-0.1)).toThrow();
    expect(() => random.chance(1.1)).toThrow();
    expect(() => random.pick([])).toThrow();
  });
});
