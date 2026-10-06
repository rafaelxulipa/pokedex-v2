export const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export const ARTWORK_BASE = `${SPRITE_BASE}/other/official-artwork`;

export const MAX_POKEMON_ID = 1025;

// Extracts the numeric id from a PokeAPI resource url (".../pokemon/25/")
export const idFromUrl = (url: string): number => {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
};

export const formatName = (name: string): string =>
  name.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export const artworkUrl = (id: number, shiny = false): string =>
  shiny ? `${ARTWORK_BASE}/shiny/${id}.png` : `${ARTWORK_BASE}/${id}.png`;

export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Fisher-Yates
export const shuffleArray = <T,>(array: T[]): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const loadImage = (url: string, timeoutMs = 8000): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
