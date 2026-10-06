import { MAX_TEAM } from '../constants';

// Team <-> "6,25,94" (used by the shareable team link)
export const serializeTeam = (ids: number[]): string => ids.join(',');

export const parseTeam = (value: string | null | undefined, max = MAX_TEAM): number[] => {
  if (!value) return [];
  const seen = new Set<number>();
  value
    .split(',')
    .map((part) => parseInt(part, 10))
    .filter((id) => Number.isInteger(id) && id > 0 && id < 100000)
    .forEach((id) => seen.add(id));
  return Array.from(seen).slice(0, max);
};
