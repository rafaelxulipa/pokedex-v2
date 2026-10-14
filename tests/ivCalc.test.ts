import { describe, expect, it } from 'vitest';
import { calcStat, findNature, narrowIvs, NATURES, possibleIvs } from '../utils/ivCalc';

const adamant = findNature('adamant');
const hardy = findNature('hardy');

describe('calcStat', () => {
  it('matches the known level 50 Garchomp values', () => {
    // Garchomp base 108/130/95/80/85/102, Adamant, 31 IV, 0 EV, level 50
    expect(calcStat('hp', 108, 31, 0, 50, adamant)).toBe(183);
    expect(calcStat('attack', 130, 31, 0, 50, adamant)).toBe(165);
    expect(calcStat('special-attack', 80, 31, 0, 50, adamant)).toBe(90);
    expect(calcStat('speed', 102, 31, 0, 50, adamant)).toBe(122);
  });

  it('applies EVs in groups of 4', () => {
    expect(calcStat('speed', 100, 31, 252, 100, hardy)).toBe(
      calcStat('speed', 100, 31, 255, 100, hardy)
    );
    expect(calcStat('speed', 100, 31, 252, 100, hardy)).toBeGreaterThan(calcStat('speed', 100, 31, 248, 100, hardy));
  });

  it('keeps Shedinja at 1 HP', () => {
    expect(calcStat('hp', 1, 31, 0, 100, hardy, true)).toBe(1);
  });
});

describe('possibleIvs', () => {
  it('finds the real IV in a round trip', () => {
    for (const iv of [0, 7, 15, 31]) {
      const stat = calcStat('defense', 95, iv, 40, 63, adamant);
      expect(possibleIvs('defense', 95, stat, 63, 40, adamant)).toContain(iv);
    }
  });

  it('returns nothing for an impossible value', () => {
    expect(possibleIvs('hp', 100, 9999, 50, 0, hardy)).toEqual([]);
  });
});

describe('narrowIvs', () => {
  it('narrows the range with a second level', () => {
    const iv = 22;
    const at = (level: number) => ({ level, stat: calcStat('speed', 80, iv, 0, level, hardy), ev: 0 });
    const one = narrowIvs('speed', 80, [at(20)], hardy)!;
    const two = narrowIvs('speed', 80, [at(20), at(100)], hardy)!;
    expect(two.length).toBeLessThanOrEqual(one.length);
    expect(two).toContain(iv);
  });

  it('returns null with no observations', () => {
    expect(narrowIvs('hp', 50, [], hardy)).toBeNull();
  });
});

describe('natures', () => {
  it('has 25 natures with five neutral ones', () => {
    expect(NATURES).toHaveLength(25);
    expect(NATURES.filter((n) => n.up === n.down)).toHaveLength(5);
    expect(adamant.up).toBe('attack');
    expect(adamant.down).toBe('special-attack');
  });
});
