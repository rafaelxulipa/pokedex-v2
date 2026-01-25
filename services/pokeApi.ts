import { POKEAPI_URL } from '../constants';
import { PokemonDetail, PokemonListEntry, PokemonSpecies, EvolutionChainResponse, TypeDetail } from '../types';

export const fetchAllPokemonNames = async (): Promise<PokemonListEntry[]> => {
  // Fetching a large list of names to enable efficient client-side search without spamming the API
  try {
    const response = await fetch(`${POKEAPI_URL}/pokemon?limit=1302&offset=0`);
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching name list:', error);
    return [];
  }
};

export const fetchPokemonDetails = async (url: string): Promise<PokemonDetail | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching details:', error);
    return null;
  }
};

export const fetchPokemonSpecies = async (id: number): Promise<PokemonSpecies | null> => {
  try {
    const response = await fetch(`${POKEAPI_URL}/pokemon-species/${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching species:', error);
    return null;
  }
};

export const fetchEvolutionChain = async (url: string): Promise<EvolutionChainResponse | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching evolution chain:', error);
    return null;
  }
};

export const fetchTypeDetails = async (url: string): Promise<TypeDetail | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching type details:', error);
    return null;
  }
};

export const fetchMultiplePokemon = async (urls: string[]): Promise<PokemonDetail[]> => {
  const promises = urls.map((url) => fetchPokemonDetails(url));
  const results = await Promise.all(promises);
  return results.filter((p): p is PokemonDetail => p !== null);
};