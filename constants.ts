
export const POKEAPI_URL = 'https://pokeapi.co/api/v2';

export const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-gray-400',
  fire: 'bg-red-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400',
  grass: 'bg-green-500',
  ice: 'bg-cyan-300',
  fighting: 'bg-red-700',
  poison: 'bg-purple-500',
  ground: 'bg-yellow-600',
  flying: 'bg-indigo-400',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-800',
  ghost: 'bg-purple-700',
  dragon: 'bg-indigo-700',
  steel: 'bg-gray-500',
  fairy: 'bg-pink-300',
  dark: 'bg-gray-800',
};

export const STAT_LABELS: Record<string, string> = {
  'hp': 'HP',
  'attack': 'Attack',
  'defense': 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  'speed': 'Speed',
};

export const GENERATIONS = [
  { key: 'gen1', start: 1, end: 151 },
  { key: 'gen2', start: 152, end: 251 },
  { key: 'gen3', start: 252, end: 386 },
  { key: 'gen4', start: 387, end: 493 },
  { key: 'gen5', start: 494, end: 649 },
  { key: 'gen6', start: 650, end: 721 },
  { key: 'gen7', start: 722, end: 809 },
  { key: 'gen8', start: 810, end: 905 },
  { key: 'gen9', start: 906, end: 1025 },
];

export const MAX_COMPARISON = 4;
export const MAX_TEAM = 6;
