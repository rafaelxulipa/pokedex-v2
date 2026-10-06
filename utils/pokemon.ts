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

export const randomInt = (min: number, max: number, random: () => number = Math.random): number =>
  Math.floor(random() * (max - min + 1)) + min;

// Fisher-Yates
export const shuffleArray = <T,>(array: T[], random: () => number = Math.random): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
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

// PokeAPI language code for each app language (Portuguese is not available, falls back to English)
export const API_LANGUAGES: Record<string, string> = { en: 'en', es: 'es', de: 'de', zh: 'zh-Hans', ja: 'ja' };

export const localizedName = (
  names: { name: string; language: { name: string } }[] | undefined,
  language: string,
  fallbackSlug: string
): string => {
  const target = API_LANGUAGES[language];
  const found = (target && names?.find((n) => n.language.name === target)) || names?.find((n) => n.language.name === 'en');
  return found ? found.name : formatName(fallbackSlug);
};

// Effect texts contain "$effect_chance%" placeholders
export const cleanEffect = (text: string, chance: number | null): string =>
  text.replace(/\$effect_chance/g, chance === null ? '' : String(chance)).replace(/\s+/g, ' ').trim();
