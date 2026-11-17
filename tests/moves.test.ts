import { describe, expect, it } from 'vitest';
import { gamesWithMoves, generationsOf, machineLabel, movesOfGame } from '../utils/moves';
import { PokemonMove } from '../types';

const move = (name: string, ...details: [string, string, number?][]): PokemonMove => ({
  move: { name, url: `https://pokeapi.co/api/v2/move/${name}/` },
  version_group_details: details.map(([game, method, level = 0]) => ({
    level_learned_at: level,
    move_learn_method: { name: method },
    version_group: { name: game, url: '' },
  })),
});

const moves: PokemonMove[] = [
  move('tackle', ['red-blue', 'level-up', 1], ['lets-go-pikachu-lets-go-eevee', 'level-up', 1]),
  move('growl', ['red-blue', 'level-up', 1], ['lets-go-pikachu-lets-go-eevee', 'level-up', 1]),
  move('vine-whip', ['red-blue', 'level-up', 7]),
  move('swords-dance', ['red-blue', 'machine'], ['lets-go-pikachu-lets-go-eevee', 'machine']),
  move('amnesia', ['gold-silver', 'egg'], ['gold-silver', 'tutor']),
  move('colosseum-only', ['colosseum', 'level-up', 5]),
];

describe('gamesWithMoves', () => {
  it('lists the games with moves in release order and skips unsupported groups', () => {
    expect(gamesWithMoves(moves).map((g) => g.key)).toEqual(['red-blue', 'gold-silver', 'lets-go-pikachu-lets-go-eevee']);
  });

  it('derives the generations', () => {
    expect(generationsOf(gamesWithMoves(moves))).toEqual([1, 2, 7]);
  });
});

describe('movesOfGame', () => {
  it('groups by learn method and sorts level-up moves by level, then name', () => {
    const red = movesOfGame(moves, 'red-blue');
    expect(red.levelUp.map((m) => [m.name, m.level])).toEqual([['growl', 1], ['tackle', 1], ['vine-whip', 7]]);
    expect(red.machine.map((m) => m.name)).toEqual(['swords-dance']);
    expect(red.egg).toEqual([]);
  });

  it('keeps egg and tutor lists separate for the same move', () => {
    const gold = movesOfGame(moves, 'gold-silver');
    expect(gold.egg.map((m) => m.name)).toEqual(['amnesia']);
    expect(gold.tutor.map((m) => m.name)).toEqual(['amnesia']);
  });

  it('returns empty lists for a game without moves', () => {
    expect(movesOfGame(moves, 'x-y')).toEqual({ levelUp: [], machine: [], egg: [], tutor: [] });
  });
});

describe('machineLabel', () => {
  it('upper-cases the item name', () => {
    expect(machineLabel('tm07')).toBe('TM07');
    expect(machineLabel('hm01')).toBe('HM01');
  });
});
