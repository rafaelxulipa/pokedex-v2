import { formatName, idFromUrl } from './pokemon';

export interface GenerationInfo {
  key: string; // 'gen1', 'gen2', ...
  start: number;
  end: number;
  region?: string; // used for generations that have no translation yet
}

// Shape of the part of GET /generation/{id} we use
export interface GenerationResource {
  id: number;
  main_region: { name: string } | null;
  pokemon_species: { url: string }[];
}

// Species ids of a generation are contiguous, so a range (min..max) is enough to filter by it
export const rangesFromGenerations = (resources: GenerationResource[]): GenerationInfo[] =>
  resources
    .filter((g) => g.pokemon_species.length > 0)
    .map((g) => {
      const ids = g.pokemon_species.map((s) => idFromUrl(s.url));
      return {
        key: `gen${g.id}`,
        start: Math.min(...ids),
        end: Math.max(...ids),
        region: g.main_region ? formatName(g.main_region.name) : undefined,
      };
    })
    .sort((a, b) => a.start - b.start);
