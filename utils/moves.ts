import { PokemonMove } from '../types';

export interface MoveGame {
  key: string; // PokeAPI version group name
  gen: number;
  label: string; // tab name, as on Pokémon Database
}

// Games in release order. Colosseum/XD and the Japanese-only groups are left out, like Pokémon Database does.
export const MOVE_GAMES: MoveGame[] = [
  { key: 'red-blue', gen: 1, label: 'Red/Blue' },
  { key: 'yellow', gen: 1, label: 'Yellow' },
  { key: 'gold-silver', gen: 2, label: 'Gold/Silver' },
  { key: 'crystal', gen: 2, label: 'Crystal' },
  { key: 'ruby-sapphire', gen: 3, label: 'Ruby/Sapphire' },
  { key: 'emerald', gen: 3, label: 'Emerald' },
  { key: 'firered-leafgreen', gen: 3, label: 'FireRed/LeafGreen' },
  { key: 'diamond-pearl', gen: 4, label: 'Diamond/Pearl' },
  { key: 'platinum', gen: 4, label: 'Platinum' },
  { key: 'heartgold-soulsilver', gen: 4, label: 'HeartGold/SoulSilver' },
  { key: 'black-white', gen: 5, label: 'Black/White' },
  { key: 'black-2-white-2', gen: 5, label: 'Black 2/White 2' },
  { key: 'x-y', gen: 6, label: 'X/Y' },
  { key: 'omega-ruby-alpha-sapphire', gen: 6, label: 'Omega Ruby/Alpha Sapphire' },
  { key: 'sun-moon', gen: 7, label: 'Sun/Moon' },
  { key: 'ultra-sun-ultra-moon', gen: 7, label: 'Ultra Sun/Ultra Moon' },
  { key: 'lets-go-pikachu-lets-go-eevee', gen: 7, label: "Let's Go Pikachu/Eevee" },
  { key: 'sword-shield', gen: 8, label: 'Sword/Shield' },
  { key: 'brilliant-diamond-shining-pearl', gen: 8, label: 'Brilliant Diamond/Shining Pearl' },
  { key: 'legends-arceus', gen: 8, label: 'Legends: Arceus' },
  { key: 'scarlet-violet', gen: 9, label: 'Scarlet/Violet' },
  { key: 'legends-za', gen: 9, label: 'Legends: Z-A' },
];

export interface MoveRef {
  name: string;
  url: string;
}

export interface LevelUpRef extends MoveRef {
  level: number;
}

export interface GameMoves {
  levelUp: LevelUpRef[];
  machine: MoveRef[];
  egg: MoveRef[];
  tutor: MoveRef[];
}

// Games (in release order) in which the Pokémon has at least one move
export const gamesWithMoves = (moves: PokemonMove[]): MoveGame[] => {
  const present = new Set<string>();
  moves.forEach((m) => m.version_group_details.forEach((d) => present.add(d.version_group.name)));
  return MOVE_GAMES.filter((g) => present.has(g.key));
};

export const generationsOf = (games: MoveGame[]): number[] => [...new Set(games.map((g) => g.gen))];

const byName = (a: MoveRef, b: MoveRef) => a.name.localeCompare(b.name);

// Moves of one game grouped by how they are learned
export const movesOfGame = (moves: PokemonMove[], gameKey: string): GameMoves => {
  const result: GameMoves = { levelUp: [], machine: [], egg: [], tutor: [] };
  moves.forEach((m) => {
    const ref = { name: m.move.name, url: m.move.url };
    const seen = new Set<string>();
    m.version_group_details
      .filter((d) => d.version_group.name === gameKey)
      .forEach((d) => {
        const method = d.move_learn_method.name;
        if (method === 'level-up') result.levelUp.push({ ...ref, level: d.level_learned_at });
        else if (!seen.has(method)) {
          if (method === 'machine') result.machine.push(ref);
          else if (method === 'egg') result.egg.push(ref);
          else if (method === 'tutor') result.tutor.push(ref);
        }
        seen.add(method);
      });
  });
  result.levelUp.sort((a, b) => a.level - b.level || byName(a, b));
  result.machine.sort(byName);
  result.egg.sort(byName);
  result.tutor.sort(byName);
  return result;
};

// "tm07" -> "TM07"
export const machineLabel = (itemName: string): string => itemName.toUpperCase();

export const MOVE_TEXT = {
  en: {
    title: 'Moves learned',
    generation: 'Generation',
    levelUp: 'Moves learnt by level up',
    machine: 'Moves learnt by TM',
    egg: 'Egg moves',
    tutor: 'Move tutor moves',
    level: 'Lv.',
    tm: 'TM',
    move: 'Move',
    type: 'Type',
    category: 'Cat.',
    power: 'Power',
    accuracy: 'Acc.',
    empty: 'No moves in this game.',
    loading: 'Loading moves...',
  },
  pt: {
    title: 'Golpes aprendidos',
    generation: 'Geração',
    levelUp: 'Golpes aprendidos por nível',
    machine: 'Golpes aprendidos por TM',
    egg: 'Golpes de ovo',
    tutor: 'Golpes de tutor',
    level: 'Nv.',
    tm: 'TM',
    move: 'Golpe',
    type: 'Tipo',
    category: 'Cat.',
    power: 'Poder',
    accuracy: 'Prec.',
    empty: 'Nenhum golpe neste jogo.',
    loading: 'Carregando golpes...',
  },
} as const;
