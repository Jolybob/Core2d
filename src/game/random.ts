export interface RandomState {
  seed: number;
}

export interface RandomSource {
  next(): number;
  nextInt(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(values: readonly T[]): T;
  getState(): RandomState;
}

const normalizeSeed = (seed: number): number => (Math.trunc(seed) >>> 0);

export function createSeededRandom(initialSeed: number): RandomSource {
  let state = normalizeSeed(initialSeed);

  const next = (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new Error('Invalid random integer range');
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(probability) {
      if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
        throw new Error('Invalid random probability');
      }
      return next() < probability;
    },
    pick<T>(values) {
      if (values.length === 0) throw new Error('Cannot pick from an empty collection');
      return values[Math.floor(next() * values.length)];
    },
    getState: () => ({ seed: state }),
  };
}
