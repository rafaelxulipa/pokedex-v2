import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { matchPercent, rankRoommates, RoommateData, scoreHouse, sharedPrefs } from '../utils/roommates';

const data: RoommateData = JSON.parse(readFileSync('public/pokopia/roommates.json', 'utf-8'));
const find = (n: string) => data.pokemon.find((m) => m.n === n)!;

describe('roommate data', () => {
  it('has 364 unique Pokémon with up to 6 preferences', () => {
    expect(data.pokemon).toHaveLength(364);
    expect(new Set(data.pokemon.map((m) => m.n)).size).toBe(364);
    data.pokemon.forEach((m) => expect(m.p.length).toBeLessThanOrEqual(6));
  });
});

describe('compatibility', () => {
  it('matches the numbers shown by the reference calculator', () => {
    // Bulbasaur + Plusle share 4 of 6 preferences (67%)
    expect(sharedPrefs(find('Bulbasaur'), find('Plusle'))).toHaveLength(4);
    expect(matchPercent(find('Bulbasaur'), find('Plusle'))).toBe(67);
    expect(matchPercent(find('Bulbasaur'), find('Ivysaur'))).toBe(50);
  });

  it('ranks the same-habitat candidates by shared preferences', () => {
    const target = find('Bulbasaur');
    const ranked = rankRoommates(target, data.pokemon, { region: '', habitats: [], sameHabitat: true });
    expect(ranked[0].mon.n).toBe('Plusle');
    expect(ranked.every((r) => r.mon.h === target.h)).toBe(true);
    expect(ranked.length).toBe(113);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].shared.length).toBeGreaterThanOrEqual(ranked[i].shared.length);
  });

  it('lists everyone when the habitat filter is off', () => {
    const ranked = rankRoommates(find('Bulbasaur'), data.pokemon, { region: '', habitats: [], sameHabitat: false });
    expect(ranked).toHaveLength(363);
  });

  it('scores a house', () => {
    const score = scoreHouse([find('Bulbasaur'), find('Plusle')]);
    expect(score.common.length).toBe(4);
    expect(score.sameHabitat).toBe(true);
  });
});
