import { describe, expect, it } from 'vitest';
import { defensiveMultipliers, ALL_TYPES } from '../utils/typeChart';
import { TypeDetail } from '../types';

const detail = (name: string, double: string[], half: string[], none: string[]): TypeDetail => ({
  name,
  damage_relations: {
    double_damage_from: double.map((n) => ({ name: n, url: '' })),
    half_damage_from: half.map((n) => ({ name: n, url: '' })),
    no_damage_from: none.map((n) => ({ name: n, url: '' })),
  },
});

describe('defensiveMultipliers', () => {
  it('starts every type at x1', () => {
    const result = defensiveMultipliers([]);
    expect(Object.keys(result)).toHaveLength(ALL_TYPES.length);
    expect(Object.values(result).every((m) => m === 1)).toBe(true);
  });

  it('applies weaknesses, resistances and immunities of a single type', () => {
    const ghost = detail('ghost', ['ghost', 'dark'], ['poison', 'bug'], ['normal', 'fighting']);
    const result = defensiveMultipliers([ghost]);
    expect(result.ghost).toBe(2);
    expect(result.poison).toBe(0.5);
    expect(result.normal).toBe(0);
    expect(result.fire).toBe(1);
  });

  it('multiplies dual types and cancels weak + resist to x1', () => {
    const grass = detail('grass', ['fire', 'ice'], ['water', 'grass'], []);
    const poison = detail('poison', ['ground', 'psychic'], ['grass', 'fighting'], []);
    const result = defensiveMultipliers([grass, poison]);
    expect(result.fire).toBe(2);
    expect(result.grass).toBe(0.25);
    expect(result.ground).toBe(2);
    expect(result.water).toBe(0.5);
  });

  it('ignores types that failed to load', () => {
    expect(defensiveMultipliers([null]).fire).toBe(1);
  });
});
