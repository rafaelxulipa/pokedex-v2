import { describe, expect, it } from 'vitest';
import { artworkUrl, formatName, idFromUrl, randomInt, shuffleArray } from '../utils/pokemon';
import { createRandom } from '../utils/daily';

describe('pokemon utils', () => {
  it('extracts ids from PokeAPI urls with or without trailing slash', () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25);
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon-species/133')).toBe(133);
  });

  it('formats hyphenated names', () => {
    expect(formatName('mr-mime')).toBe('Mr Mime');
    expect(formatName('charizard-mega-y')).toBe('Charizard Mega Y');
  });

  it('builds artwork urls', () => {
    expect(artworkUrl(6)).toMatch(/official-artwork\/6\.png$/);
    expect(artworkUrl(6, true)).toMatch(/official-artwork\/shiny\/6\.png$/);
  });

  it('shuffle keeps the same items and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const result = shuffleArray(input);
    expect(input).toEqual(copy);
    expect([...result].sort((a, b) => a - b)).toEqual(copy);
  });

  it('randomInt stays inside the range', () => {
    for (let i = 0; i < 200; i++) {
      const n = randomInt(5, 9);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(9);
    }
    expect(randomInt(3, 3)).toBe(3);
  });

  it('seeded random makes shuffle reproducible', () => {
    const a = shuffleArray([1, 2, 3, 4, 5, 6], createRandom(42));
    const b = shuffleArray([1, 2, 3, 4, 5, 6], createRandom(42));
    expect(a).toEqual(b);
  });
});
