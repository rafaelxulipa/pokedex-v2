import { beforeEach, describe, expect, it } from 'vitest';
import { isNumberArray, readStorage, writeStorage } from '../utils/storage';

const memory: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in memory ? memory[k] : null),
  setItem: (k: string, v: string) => { memory[k] = v; },
  removeItem: (k: string) => { delete memory[k]; },
};

describe('storage helpers', () => {
  beforeEach(() => {
    Object.keys(memory).forEach((k) => delete memory[k]);
  });

  it('returns the fallback when the key is missing', () => {
    expect(readStorage('x', [1])).toEqual([1]);
  });

  it('reads what was written', () => {
    writeStorage('ids', [1, 2]);
    expect(readStorage('ids', [], isNumberArray)).toEqual([1, 2]);
  });

  it('does not throw on corrupted JSON', () => {
    memory.ids = '{not json';
    expect(readStorage('ids', [9], isNumberArray)).toEqual([9]);
  });

  it('falls back when validation fails', () => {
    memory.ids = JSON.stringify(['a', 'b']);
    expect(readStorage('ids', [], isNumberArray)).toEqual([]);
  });
});
