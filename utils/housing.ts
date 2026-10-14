import { RoommateMon, sharedPrefs } from './roommates';

export interface House {
  members: RoommateMon[];
  common: string[]; // preferences every member has
  score: number; // sum of pairwise shared preferences
  max: number; // best possible for this size (6 per pair)
}

const pairScore = (a: RoommateMon, b: RoommateMon) => sharedPrefs(a, b).length;

export const groupScore = (members: RoommateMon[]): number => {
  let s = 0;
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) s += pairScore(members[i], members[j]);
  return s;
};

const toHouse = (members: RoommateMon[]): House => ({
  members,
  common: members.length ? members[0].p.filter((x) => members.every((m) => m.p.includes(x))) : [],
  score: groupScore(members),
  max: (members.length * (members.length - 1) * 6) / 2,
});

// Greedy grouping: grow the best house from the best remaining pair, then try swaps with the rest.
// Pokémon only share a house with others of the same ideal habitat.
export const planHouses = (pool: RoommateMon[], size: number): { houses: House[]; alone: RoommateMon[] } => {
  const houses: House[] = [];
  const alone: RoommateMon[] = [];
  const byHabitat = new Map<number, RoommateMon[]>();
  pool.forEach((m) => byHabitat.set(m.h, [...(byHabitat.get(m.h) ?? []), m]));

  for (const mons of byHabitat.values()) {
    let rest = [...mons];
    while (rest.length > 1) {
      // best pair
      let best: [number, number] = [0, 1];
      let bestScore = -1;
      for (let i = 0; i < rest.length; i++)
        for (let j = i + 1; j < rest.length; j++) {
          const s = pairScore(rest[i], rest[j]);
          if (s > bestScore) {
            bestScore = s;
            best = [i, j];
          }
        }
      let group = [rest[best[0]], rest[best[1]]];
      // grow
      while (group.length < size) {
        let pick: RoommateMon | null = null;
        let pickScore = -1;
        for (const m of rest) {
          if (group.includes(m)) continue;
          const s = groupScore([...group, m]);
          if (s > pickScore) {
            pickScore = s;
            pick = m;
          }
        }
        if (!pick) break;
        group = [...group, pick];
      }
      // one pass of swaps
      let improved = true;
      while (improved) {
        improved = false;
        for (let g = 0; g < group.length; g++) {
          for (const m of rest) {
            if (group.includes(m)) continue;
            const candidate = group.map((x, i) => (i === g ? m : x));
            if (groupScore(candidate) > groupScore(group)) {
              group = candidate;
              improved = true;
            }
          }
        }
      }
      houses.push(toHouse(group));
      rest = rest.filter((m) => !group.includes(m));
    }
    alone.push(...rest);
  }
  houses.sort((a, b) => b.score / (b.max || 1) - a.score / (a.max || 1));
  return { houses, alone };
};
