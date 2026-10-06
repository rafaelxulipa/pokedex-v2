import { TYPE_COLORS } from '../constants';
import { TypeDetail } from '../types';

export const ALL_TYPES = Object.keys(TYPE_COLORS);

// Damage multiplier received from each attacking type, given the defender's type details
export const defensiveMultipliers = (typeDetails: (TypeDetail | null)[]): Record<string, number> => {
  const map: Record<string, number> = {};
  ALL_TYPES.forEach((type) => {
    map[type] = 1;
  });

  typeDetails.forEach((detail) => {
    if (!detail) return;
    const { double_damage_from, half_damage_from, no_damage_from } = detail.damage_relations;
    double_damage_from.forEach((d) => { map[d.name] = (map[d.name] ?? 1) * 2; });
    half_damage_from.forEach((d) => { map[d.name] = (map[d.name] ?? 1) * 0.5; });
    no_damage_from.forEach((d) => { map[d.name] = (map[d.name] ?? 1) * 0; });
  });

  return map;
};
