import { describe, expect, it } from 'vitest';
import { normalize, searchEntries, SearchEntry } from '../utils/guideSearch';

const entries: SearchEntry[] = [
  { c: 3, ct: 'Viridian Forest e Pewter City', s: 'pewter-city', st: 'Pewter City', x: 'Pewter City Finalmente uma cidade grande. O ginásio do Brock usa Pokémon de pedra.' },
  { c: 4, ct: 'Mt. Moon e Cerulean City', s: 'mt-moon', st: 'Mt. Moon', x: 'Mt. Moon Cuidado com os Zubat. Leve Repels para a caverna.' },
  { c: 9, ct: 'Saffron City', s: '', st: '', x: 'Brock aparece de novo no pós-jogo para uma revanche.' },
];

describe('guide search', () => {
  it('normalizes accents and case', () => {
    expect(normalize('Pokémon GINÁSIO')).toBe('pokemon ginasio');
  });

  it('finds text without accents and requires every word', () => {
    expect(searchEntries(entries, 'pokemon pedra').map((h) => h.entry.c)).toEqual([3]);
    expect(searchEntries(entries, 'zubat caverna').map((h) => h.entry.c)).toEqual([4]);
    expect(searchEntries(entries, 'zubat pedra')).toEqual([]);
  });

  it('ranks title matches above body matches', () => {
    const hits = searchEntries(entries, 'brock');
    expect(hits.map((h) => h.entry.c)).toEqual([3, 9]);
  });

  it('ignores very short queries and returns a highlighted snippet', () => {
    expect(searchEntries(entries, 'a')).toEqual([]);
    const [hit] = searchEntries(entries, 'zubat');
    expect(hit.snippet.some((part) => part.hit && part.text.toLowerCase() === 'zubat')).toBe(true);
  });
});
