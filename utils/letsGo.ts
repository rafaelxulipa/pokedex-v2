import { formatName, idFromUrl } from './pokemon';
import { readStorage, writeStorage } from './storage';

export type LetsGoLang = 'en' | 'pt';

// Kanto Pokédex (1-151) plus Meltan (#152) and Melmetal (#153), which use the national ids 808 and 809.
export const MELTAN_ID = 808;
export const MELMETAL_ID = 809;
export const LETS_GO_IDS: number[] = [...Array.from({ length: 151 }, (_, i) => i + 1), MELTAN_ID, MELMETAL_ID];
const LETS_GO_SET = new Set(LETS_GO_IDS);

export const isLetsGoPokemon = (id: number): boolean => LETS_GO_SET.has(id);

export const letsGoDexNumber = (id: number): number => (id === MELTAN_ID ? 152 : id === MELMETAL_ID ? 153 : id);

const NAME_OVERRIDES: Record<number, string> = {
  29: 'Nidoran♀',
  32: 'Nidoran♂',
  83: "Farfetch'd",
  122: 'Mr. Mime',
};

export const letsGoDisplayName = (id: number, slug: string): string => NAME_OVERRIDES[id] ?? formatName(slug);

// Types come from the PokeAPI type endpoints: [{ slot, pokemon: { url } }]. Keeps the slot order (primary first).
export interface TypeMembers {
  type: string;
  pokemon: { slot: number; pokemon: { url: string } }[];
}

export const buildLetsGoTypes = (lists: TypeMembers[]): Record<number, string[]> => {
  const slots: Record<number, { slot: number; type: string }[]> = {};
  lists.forEach(({ type, pokemon }) => {
    pokemon.forEach(({ slot, pokemon: p }) => {
      const id = idFromUrl(p.url);
      if (!isLetsGoPokemon(id)) return;
      (slots[id] ||= []).push({ slot, type });
    });
  });
  return Object.fromEntries(
    Object.entries(slots).map(([id, list]) => [id, list.sort((a, b) => a.slot - b.slot).map((x) => x.type)])
  );
};

// ---- Locations (public/lets-go/locations.json, copied from Pokémon Database) ----

// One game: wild locations, evolution ("ev": the Pokémon it evolves from), trade/migrate ("tr"),
// not available in the game ("na") or no data yet ("nd")
export type LocationEntry = { l: string[] } | { ev: string } | { tr: 1 } | { na: 1 } | { nd: 1 };
export interface LetsGoLocationData {
  p: LocationEntry; // Let's Go Pikachu
  e: LocationEntry; // Let's Go Eevee
  o: [string, LocationEntry][]; // every other game: ["Red / Blue", entry]
}
export type LetsGoLocationMap = Record<string, LetsGoLocationData>;

export interface LocationRow {
  games: 'both' | 'pikachu' | 'eevee';
  entry: LocationEntry;
}

// One row when both games are the same, otherwise one row per game.
export const locationRows = (data: LetsGoLocationData): LocationRow[] =>
  JSON.stringify(data.p) === JSON.stringify(data.e)
    ? [{ games: 'both', entry: data.p }]
    : [
        { games: 'pikachu', entry: data.p },
        { games: 'eevee', entry: data.e },
      ];

// ---- Names ----

// Towns and cities keep their English name (like the Portuguese walkthroughs); only generic words are translated.
const PT_RULES: [RegExp, string][] = [
  [/^Route (\d+)$/, 'Rota $1'],
  [/^(.+)'s Cave$/, 'Caverna do $1'],
  [/^(.+) Forest$/, 'Floresta de $1'],
  [/^(.+) Cave$/, 'Caverna $1'],
  [/^Mt\. (.+)$/, 'Monte $1'],
  [/^Pokémon Tower$/, 'Torre Pokémon'],
  [/^Pokémon Mansion$/, 'Mansão Pokémon'],
  [/^Power Plant$/, 'Usina de Energia'],
  [/^Victory Road$/, 'Estrada da Vitória'],
  [/^Seafoam Islands$/, 'Ilhas Seafoam'],
  [/^Rock Tunnel$/, 'Túnel Rock'],
  [/^Indigo Plateau$/, 'Planalto Índigo'],
];

export const translateLocation = (name: string, lang: LetsGoLang = 'en'): string => {
  if (lang === 'en') return name;
  for (const [pattern, replacement] of PT_RULES) {
    if (pattern.test(name)) return name.replace(pattern, replacement);
  }
  return name;
};

// ---- Page text ----

export const LETS_GO_TEXT = {
  en: {
    title: "Let's Go Pikachu & Let's Go Eevee Pokédex",
    intro:
      "Pokémon Let's Go Pikachu and Let's Go Eevee return to Kanto with the original 151 Pokémon plus the mythical Meltan and Melmetal. Click a Pokémon to see its details and where to find it in the game.",
    search: 'Search by name or number...',
    allTypes: 'All Types',
    results: (n: number) => `${n} Pokémon`,
    empty: 'No Pokémon found.',
    failed: 'Could not load the Pokédex. Try again later.',
    guide: 'Read the walkthrough',
    catchCombo: 'How the Catch Combo works',
    where: (name: string) => `Where to find ${name}`,
    whereHint: "Locations in Let's Go Pikachu and Let's Go Eevee.",
    evolve: (from: string) => `Evolve ${from}`,
    trade: 'Trade/migrate from another game',
    noData: (name: string) => `There is no location data for ${name}.`,
    otherGames: 'Other games',
    notAvailable: 'Not available in this game',
    noDataYet: 'Location data not yet available',
    source: 'Source: Pokémon Database.',
    pikachu: "Let's Go Pikachu",
    eevee: "Let's Go Eevee",
    both: "Pikachu & Eevee",
    onlyIn: (game: string) => `${game} only`,
    openDex: "See the Let's Go Pokédex",
  },
  pt: {
    title: "Pokédex de Let's Go Pikachu e Let's Go Eevee",
    intro:
      "Pokémon Let's Go Pikachu e Let's Go Eevee voltam a Kanto com os 151 Pokémon originais e os míticos Meltan e Melmetal. Clique em um Pokémon para ver os detalhes e onde encontrá-lo no jogo.",
    search: 'Buscar por nome ou número...',
    allTypes: 'Todos os tipos',
    results: (n: number) => `${n} Pokémon`,
    empty: 'Nenhum Pokémon encontrado.',
    failed: 'Não foi possível carregar a Pokédex. Tente de novo mais tarde.',
    guide: 'Ler o detonado',
    catchCombo: 'Como funciona o Catch Combo',
    where: (name: string) => `Onde encontrar ${name}`,
    whereHint: "Locais em Let's Go Pikachu e Let's Go Eevee.",
    evolve: (from: string) => `Evolua ${from}`,
    trade: 'Troque ou migre de outro jogo',
    noData: (name: string) => `Não há dados de localização para ${name}.`,
    otherGames: 'Outros jogos',
    notAvailable: 'Não disponível neste jogo',
    noDataYet: 'Dados de localização ainda não disponíveis',
    source: 'Fonte: Pokémon Database.',
    pikachu: "Let's Go Pikachu",
    eevee: "Let's Go Eevee",
    both: 'Pikachu e Eevee',
    onlyIn: (game: string) => `Só no ${game}`,
    openDex: "Ver a Pokédex de Let's Go",
  },
} as const;

export const LETS_GO_LANG_KEY = 'letsGoLang';

export const readLetsGoLang = (): LetsGoLang =>
  readStorage<LetsGoLang>(LETS_GO_LANG_KEY, 'en', (v) => v === 'en' || v === 'pt');

export const saveLetsGoLang = (lang: LetsGoLang) => writeStorage(LETS_GO_LANG_KEY, lang);
