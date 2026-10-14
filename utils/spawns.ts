export interface Spawn {
  n: string; // Pokémon name
  h: number; // habitat id (public/pokopia/habitats.json)
  r: 'C' | 'R' | 'V'; // common, rare, very rare
  m: string; // 7 bits: morning, day, evening, night, sun, cloud, rain
  g: string[] | null; // regions, null = every region
}

export const TIMES = ['Manhã', 'Dia', 'Tarde', 'Noite'] as const;
export const WEATHERS = ['Sol', 'Nublado', 'Chuva'] as const;
export const RARITY_PT: Record<Spawn['r'], string> = { C: 'Comum', R: 'Raro', V: 'Muito raro' };
export const REGION_PT: Record<string, string> = { 'Cloud Island': 'Cloud Island', 'Bubbly Basin': 'Bubbly Basin' };

export const timeIndexNow = (date = new Date()): number => {
  const h = date.getHours();
  if (h >= 5 && h < 10) return 0;
  if (h >= 10 && h < 17) return 1;
  if (h >= 17 && h < 20) return 2;
  return 3;
};

export interface SpawnFilter {
  time: number | null;
  weather: number | null;
  rarity: Spawn['r'] | null;
  region: string; // '' = any
}

export const spawnMatches = (s: Spawn, f: SpawnFilter): boolean => {
  if (f.time !== null && s.m[f.time] !== '1') return false;
  if (f.weather !== null && s.m[4 + f.weather] !== '1') return false;
  if (f.rarity && s.r !== f.rarity) return false;
  if (f.region && s.g && !s.g.includes(f.region)) return false;
  return true;
};

// Human readable summary of the conditions
export const describeConditions = (m: string): { time: string; weather: string } => {
  const t = m.slice(0, 4);
  const w = m.slice(4);
  const time = t === '1111' ? 'Qualquer horário' : TIMES.filter((_, i) => t[i] === '1').join(', ');
  const weather = w === '111' ? 'Qualquer clima' : WEATHERS.filter((_, i) => w[i] === '1').join(', ');
  return { time, weather };
};
