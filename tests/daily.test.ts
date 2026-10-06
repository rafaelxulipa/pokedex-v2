import { describe, expect, it } from 'vitest';
import { createRandom, hashString, todayKey } from '../utils/daily';

describe('daily helpers', () => {
  it('formats the date key with zero padding', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayKey(new Date(2026, 10, 23))).toBe('2026-11-23');
  });

  it('hash is stable and differs between days', () => {
    expect(hashString('2026-01-05')).toBe(hashString('2026-01-05'));
    expect(hashString('2026-01-05')).not.toBe(hashString('2026-01-06'));
  });

  it('same seed gives the same sequence, values in [0, 1)', () => {
    const a = createRandom(123);
    const b = createRandom(123);
    for (let i = 0; i < 50; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('different seeds give different sequences', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });
});
