export interface PokemonListEntry {
  name: string;
  url: string;
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonAbility {
  is_hidden: boolean;
  slot: number;
  ability: {
    name: string;
    url: string;
  };
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: PokemonType[];
  stats: PokemonStat[];
  abilities: PokemonAbility[];
  sprites: {
    front_default: string;
    front_shiny: string;
    other: {
      'official-artwork': {
        front_default: string;
        front_shiny: string;
      };
      dream_world: {
        front_default: string;
      };
    };
  };
}

export interface PokemonSpecies {
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  genera: {
    genus: string;
    language: {
      name: string;
    };
  }[];
  evolution_chain: {
    url: string;
  };
  gender_rate: number;
}

export interface EvolutionDetail {
  min_level: number | null;
  gender: number | null;
  held_item: { name: string } | null;
  item: { name: string } | null;
  known_move: { name: string } | null;
  known_move_type: { name: string } | null;
  location: { name: string } | null;
  min_affection: number | null;
  min_beauty: number | null;
  min_happiness: number | null;
  needs_overworld_rain: boolean;
  party_species: { name: string } | null;
  party_type: { name: string } | null;
  relative_physical_stats: number | null;
  time_of_day: string;
  trade_species: { name: string } | null;
  trigger: { name: string };
  turn_upside_down: boolean;
}

export interface EvolutionNode {
  evolution_details: EvolutionDetail[];
  species: {
    name: string;
    url: string;
  };
  evolves_to: EvolutionNode[];
}

export interface EvolutionChainResponse {
  chain: EvolutionNode;
}

export interface DamageRelations {
  double_damage_from: { name: string; url: string }[];
  half_damage_from: { name: string; url: string }[];
  no_damage_from: { name: string; url: string }[];
}

export interface TypeDetail {
  damage_relations: DamageRelations;
  name: string;
}