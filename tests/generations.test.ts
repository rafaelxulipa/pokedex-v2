import { describe, expect, it } from 'vitest';
import { rangesFromGenerations } from '../utils/generations';

const species = (...ids: number[]) => ids.map((id) => ({ url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` }));

describe('rangesFromGenerations', () => {
  it('derives start/end from species ids regardless of order', () => {
    const result = rangesFromGenerations([
      { id: 2, main_region: { name: 'johto' }, pokemon_species: species(152, 251, 200) },
      { id: 1, main_region: { name: 'kanto' }, pokemon_species: species(25, 1, 151) },
    ]);
    expect(result).toEqual([
      { key: 'gen1', start: 1, end: 151, region: 'Kanto' },
      { key: 'gen2', start: 152, end: 251, region: 'Johto' },
    ]);
  });

  it('supports a new generation and skips empty ones', () => {
    const result = rangesFromGenerations([
      { id: 9, main_region: { name: 'paldea' }, pokemon_species: species(906, 1025) },
      { id: 10, main_region: { name: 'new-region' }, pokemon_species: species(1026, 1100) },
      { id: 11, main_region: null, pokemon_species: [] },
    ]);
    expect(result.map((g) => g.key)).toEqual(['gen9', 'gen10']);
    expect(result[1]).toMatchObject({ start: 1026, end: 1100, region: 'New Region' });
  });
});
