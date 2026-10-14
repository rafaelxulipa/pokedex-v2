import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RoommateData } from '../utils/roommates';
import { groupScore, planHouses } from '../utils/housing';

const data: RoommateData = JSON.parse(readFileSync('public/pokopia/roommates.json', 'utf-8'));
const bright = data.pokemon.filter((m) => m.h === 0).slice(0, 20);

describe('planHouses', () => {
  it('never exceeds the house size and uses each Pokémon once', () => {
    const { houses, alone } = planHouses(bright, 4);
    const names = [...houses.flatMap((h) => h.members.map((m) => m.n)), ...alone.map((m) => m.n)];
    expect(new Set(names).size).toBe(bright.length);
    houses.forEach((h) => expect(h.members.length).toBeLessThanOrEqual(4));
  });

  it('keeps houses within one habitat', () => {
    const mixed = data.pokemon.slice(0, 40);
    const { houses } = planHouses(mixed, 3);
    houses.forEach((h) => expect(new Set(h.members.map((m) => m.h)).size).toBe(1));
  });

  it('beats an arbitrary split on total score', () => {
    const { houses } = planHouses(bright, 4);
    const planned = houses.reduce((s, h) => s + h.score, 0);
    let naive = 0;
    for (let i = 0; i + 4 <= bright.length; i += 4) naive += groupScore(bright.slice(i, i + 4));
    expect(planned).toBeGreaterThanOrEqual(naive);
  });
});
