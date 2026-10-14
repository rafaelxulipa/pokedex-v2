// Habitat data for Pokémon Pokopia (public/pokopia/habitats.json)
export interface PokopiaItem {
  n: string;
  q: number;
}

export interface PokopiaMon {
  n: string;
  slug: string;
  form?: string;
}

export type PokopiaGroup = 'main' | 'basin' | 'event';

export const GROUP_LABELS: Record<PokopiaGroup, string> = {
  main: 'Jogo base',
  basin: 'Bubbly Basin',
  event: 'Eventos',
};

export interface PokopiaHabitat {
  id: number; // unique position across all groups (1-based)
  group: PokopiaGroup;
  no: number; // number inside its group
  name: string;
  items: PokopiaItem[];
  pokemon: PokopiaMon[];
}

export interface PokopiaDexEntry {
  n: string;
  slug: string;
  habitats: number[];
}

export interface PokopiaData {
  habitats: PokopiaHabitat[];
  pokemon: PokopiaDexEntry[];
}

let cache: Promise<PokopiaData | null> | null = null;

export const loadPokopiaData = (): Promise<PokopiaData | null> => {
  if (!cache) {
    cache = fetch('/pokopia/habitats.json')
      .then((r) => (r.ok ? (r.json() as Promise<PokopiaData>) : null))
      .catch(() => null);
    cache.then((d) => {
      if (!d) cache = null;
    });
  }
  return cache;
};

export const formatHabitatId = (id: number) => `#${String(id).padStart(3, '0')}`;

// "#012" for the main game, "Basin #05" / "Evento #3" for the others
export const habitatLabel = (h: PokopiaHabitat): string =>
  h.group === 'main' ? formatHabitatId(h.no) : `${h.group === 'basin' ? 'Basin' : 'Evento'} #${h.no}`;

export const normalizeSearch = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export const habitatMatches = (h: PokopiaHabitat, term: string): boolean => {
  if (!term) return true;
  const t = normalizeSearch(term).replace(/^#/, '');
  if (/^\d+$/.test(t)) return h.no === parseInt(t, 10);
  return (
    normalizeSearch(h.name).includes(t) ||
    h.items.some((i) => normalizeSearch(i.n).includes(t)) ||
    h.pokemon.some((m) => normalizeSearch(m.n).includes(t) || m.slug.includes(t))
  );
};

export const HABITAT_ART_SOURCE = 'https://www.poketools.com/pokopia-habitats';

// Habitat illustration: /pokopia/habitats/<name-as-slug>.webp
export const habitatImage = (name: string): string => {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `/pokopia/habitats/${slug}.webp`;
};
