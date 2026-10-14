// Stat and IV math for generation 3 onwards.
export const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const MAX_IV = 31;
export const MAX_EV = 252;

// Same order as the games: five natures per increased stat, the neutral one is where up === down
const NATURE_ORDER = ['hardy', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty', 'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky'] as const;
export type NatureKey = (typeof NATURE_ORDER)[number];

const NATURE_STATS: StatKey[] = ['attack', 'defense', 'speed', 'special-attack', 'special-defense'];

export interface Nature {
  key: NatureKey;
  up: StatKey;
  down: StatKey;
}

export const NATURES: Nature[] = NATURE_ORDER.map((key, index) => ({
  key,
  up: NATURE_STATS[Math.floor(index / 5)],
  down: NATURE_STATS[index % 5],
}));

export const findNature = (key: string | null | undefined): Nature =>
  NATURES.find((n) => n.key === key) ?? NATURES[0];

// 10 = neutral, 11 = +10%, 9 = -10%
const natureModifier = (nature: Nature, stat: StatKey): number => {
  if (nature.up === nature.down) return 10;
  if (stat === nature.up) return 11;
  if (stat === nature.down) return 9;
  return 10;
};

export const calcStat = (
  stat: StatKey,
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: Nature,
  shedinja = false
): number => {
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (stat === 'hp') return shedinja ? 1 : core + level + 10;
  return Math.floor(((core + 5) * natureModifier(nature, stat)) / 10);
};

// Every IV (0-31) that produces the observed stat value
export const possibleIvs = (
  stat: StatKey,
  base: number,
  observed: number,
  level: number,
  ev: number,
  nature: Nature,
  shedinja = false
): number[] => {
  const result: number[] = [];
  for (let iv = 0; iv <= MAX_IV; iv++) {
    if (calcStat(stat, base, iv, ev, level, nature, shedinja) === observed) result.push(iv);
  }
  return result;
};

export interface Observation {
  level: number;
  stat: number;
  ev: number;
}

// Intersects the IVs allowed by each observation (the same stat measured at different levels)
export const narrowIvs = (
  stat: StatKey,
  base: number,
  observations: Observation[],
  nature: Nature,
  shedinja = false
): number[] | null => {
  if (observations.length === 0) return null;
  let current: number[] | null = null;
  for (const o of observations) {
    const ivs = possibleIvs(stat, base, o.stat, o.level, o.ev, nature, shedinja);
    current = current === null ? ivs : current.filter((iv) => ivs.includes(iv));
  }
  return current;
};
