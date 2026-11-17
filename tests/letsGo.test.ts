import { describe, expect, it } from 'vitest';
import {
  buildLetsGoTypes,
  isLetsGoPokemon,
  letsGoDexNumber,
  letsGoDisplayName,
  LETS_GO_IDS,
  locationRows,
  translateLocation,
} from '../utils/letsGo';

describe('Let\'s Go pokédex ids', () => {
  it('has 153 entries: Kanto plus Meltan and Melmetal', () => {
    expect(LETS_GO_IDS).toHaveLength(153);
    expect(isLetsGoPokemon(151)).toBe(true);
    expect(isLetsGoPokemon(152)).toBe(false);
    expect(isLetsGoPokemon(808)).toBe(true);
    expect(isLetsGoPokemon(809)).toBe(true);
  });

  it('numbers Meltan and Melmetal as #152 and #153', () => {
    expect(letsGoDexNumber(25)).toBe(25);
    expect(letsGoDexNumber(808)).toBe(152);
    expect(letsGoDexNumber(809)).toBe(153);
  });

  it('fixes the names that a plain slug conversion would break', () => {
    expect(letsGoDisplayName(29, 'nidoran-f')).toBe('Nidoran♀');
    expect(letsGoDisplayName(122, 'mr-mime')).toBe('Mr. Mime');
    expect(letsGoDisplayName(1, 'bulbasaur')).toBe('Bulbasaur');
  });
});

describe('buildLetsGoTypes', () => {
  const entry = (id: number, slot: number) => ({ slot, pokemon: { url: `https://pokeapi.co/api/v2/pokemon/${id}/` } });

  it('orders types by slot and skips Pokémon outside the game', () => {
    const result = buildLetsGoTypes([
      { type: 'poison', pokemon: [entry(1, 2), entry(152, 1)] },
      { type: 'grass', pokemon: [entry(1, 1), entry(10033, 1)] },
    ]);
    expect(result).toEqual({ 1: ['grass', 'poison'] });
  });
});

describe('translateLocation', () => {
  it('keeps the English name in English', () => {
    expect(translateLocation('Route 4')).toBe('Route 4');
  });

  it('translates only the generic words in Portuguese', () => {
    expect(translateLocation('Route 4', 'pt')).toBe('Rota 4');
    expect(translateLocation('Viridian Forest', 'pt')).toBe('Floresta de Viridian');
    expect(translateLocation('Cerulean Cave', 'pt')).toBe('Caverna Cerulean');
    expect(translateLocation('Mt. Moon', 'pt')).toBe('Monte Moon');
    expect(translateLocation("Diglett's Cave", 'pt')).toBe('Caverna do Diglett');
    expect(translateLocation('Seafoam Islands', 'pt')).toBe('Ilhas Seafoam');
    expect(translateLocation('Cerulean City', 'pt')).toBe('Cerulean City');
    expect(translateLocation('Silph Co.', 'pt')).toBe('Silph Co.');
  });
});

describe('locationRows', () => {
  it('uses a single row when both games match', () => {
    expect(locationRows({ p: { l: ['Route 1'] }, e: { l: ['Route 1'] }, o: [] })).toEqual([{ games: 'both', entry: { l: ['Route 1'] } }]);
  });

  it('splits by game when they differ', () => {
    const rows = locationRows({ p: { ev: 'Weedle/Kakuna' }, e: { l: ['Viridian Forest'] }, o: [] });
    expect(rows.map((r) => r.games)).toEqual(['pikachu', 'eevee']);
  });
});

describe('locations.json', () => {
  it('covers every Let\'s Go Pokémon with data for both games', async () => {
    const { readFileSync } = await import('node:fs');
    const data = JSON.parse(readFileSync('public/lets-go/locations.json', 'utf-8'));
    LETS_GO_IDS.forEach((id) => {
      expect(data[id], `id ${id}`).toBeDefined();
      expect(data[id].p).toBeDefined();
      expect(data[id].e).toBeDefined();
      expect(Array.isArray(data[id].o)).toBe(true);
    });
    expect(Object.keys(data)).toHaveLength(153);
  });
});
