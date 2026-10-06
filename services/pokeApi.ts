import { POKEAPI_URL } from '../constants';
import { PokemonDetail, PokemonListEntry, PokemonSpecies, EvolutionChainResponse, TypeDetail } from '../types';

// In-memory cache of in-flight/finished requests, keyed by url. Failed requests are evicted
// so they can be retried later.
const cache = new Map<string, Promise<unknown>>();

const cachedFetch = <T,>(url: string): Promise<T | null> => {
  const existing = cache.get(url);
  if (existing) return existing as Promise<T | null>;

  const request = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        cache.delete(url);
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      cache.delete(url);
      console.error('Error fetching', url, error);
      return null;
    }
  })();

  cache.set(url, request);
  return request;
};

export const fetchAllPokemonNames = async (): Promise<PokemonListEntry[]> => {
  // Large list of names to enable efficient client-side search without spamming the API
  const data = await cachedFetch<{ results: PokemonListEntry[] }>(`${POKEAPI_URL}/pokemon?limit=1302&offset=0`);
  return data?.results ?? [];
};

export const fetchPokemonDetails = (url: string) => cachedFetch<PokemonDetail>(url);

export const fetchPokemonSpecies = (idOrUrl: number | string) =>
  cachedFetch<PokemonSpecies>(typeof idOrUrl === 'number' ? `${POKEAPI_URL}/pokemon-species/${idOrUrl}` : idOrUrl);

export const fetchEvolutionChain = (url: string) => cachedFetch<EvolutionChainResponse>(url);

export const fetchTypeDetails = (url: string) => cachedFetch<TypeDetail>(url);

export const fetchTypeByName = (name: string) => fetchTypeDetails(`${POKEAPI_URL}/type/${name}`);

// Pokemon list that belongs to a type (cached per type)
export const fetchPokemonOfType = async (type: string): Promise<PokemonListEntry[]> => {
  const data = await cachedFetch<{ pokemon: { pokemon: PokemonListEntry }[] }>(`${POKEAPI_URL}/type/${type}`);
  return data ? data.pokemon.map((p) => p.pokemon) : [];
};

export const fetchMultiplePokemon = async (urls: string[]): Promise<PokemonDetail[]> => {
  const results = await Promise.all(urls.map((url) => fetchPokemonDetails(url)));
  return results.filter((p): p is PokemonDetail => p !== null);
};

export const pokemonUrl = (idOrName: number | string) => `${POKEAPI_URL}/pokemon/${idOrName}`;

// Translated species names via the PokeAPI GraphQL endpoint (one request per language).
// PokeAPI has no Portuguese names, so 'pt' is not mapped and falls back to the English names.
const SPECIES_NAME_LANGUAGES: Record<string, string> = { es: 'es', de: 'de', zh: 'zh-Hans', ja: 'ja' };
const speciesNamesCache = new Map<string, Promise<Record<number, string>>>();

export const fetchSpeciesNames = (language: string): Promise<Record<number, string>> => {
  const apiLanguage = SPECIES_NAME_LANGUAGES[language];
  if (!apiLanguage) return Promise.resolve({});

  const existing = speciesNamesCache.get(apiLanguage);
  if (existing) return existing;

  const request = (async () => {
    try {
      const response = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ pokemon_v2_pokemonspeciesname(where: {pokemon_v2_language: {name: {_eq: "${apiLanguage}"}}}) { name pokemon_species_id } }`,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const map: Record<number, string> = {};
      (json.data?.pokemon_v2_pokemonspeciesname ?? []).forEach((row: { name: string; pokemon_species_id: number }) => {
        map[row.pokemon_species_id] = row.name;
      });
      return map;
    } catch (error) {
      speciesNamesCache.delete(apiLanguage);
      console.error('Error fetching translated names:', error);
      return {};
    }
  })();

  speciesNamesCache.set(apiLanguage, request);
  return request;
};
