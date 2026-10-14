// Roommate compatibility for Pokémon Pokopia (public/pokopia/roommates.json).
// Two Pokémon are more compatible the more of their six preferences they share.
export interface RoommateMon {
  n: string; // display name (English)
  s: string; // PokeAPI slug used for the artwork
  sp: string[]; // specialties
  h: number; // index into habitats (Bright, Dark, ...)
  r: string; // region
  p: string[]; // preferences (up to 6)
}

export interface RoommateData {
  habitats: string[];
  pokemon: RoommateMon[];
}

export const MAX_HOUSE = 4;

export const sharedPrefs = (a: RoommateMon, b: RoommateMon): string[] => a.p.filter((x) => b.p.includes(x));

export const matchPercent = (a: RoommateMon, b: RoommateMon): number => Math.round((sharedPrefs(a, b).length / 6) * 100);

export interface RankFilters {
  region: string; // '' = all
  habitats: number[]; // [] = all
  sameHabitat: boolean;
}

export interface Ranked {
  mon: RoommateMon;
  shared: string[];
  percent: number;
}

export const rankRoommates = (target: RoommateMon, all: RoommateMon[], f: RankFilters): Ranked[] =>
  all
    .filter((m) => m.n !== target.n)
    .filter((m) => !f.region || m.r === f.region)
    .filter((m) => (f.sameHabitat ? m.h === target.h : true))
    .filter((m) => f.habitats.length === 0 || f.habitats.includes(m.h))
    .map((mon) => {
      const shared = sharedPrefs(target, mon);
      return { mon, shared, percent: Math.round((shared.length / 6) * 100) };
    })
    .sort((a, b) => b.shared.length - a.shared.length || a.mon.n.localeCompare(b.mon.n));

export interface HouseScore {
  common: string[]; // preferences every resident has
  perResident: { mon: RoommateMon; withGroup: number }[]; // how many of its preferences someone else also has
  sameHabitat: boolean;
}

export const scoreHouse = (house: RoommateMon[]): HouseScore => {
  const common = house.length ? house[0].p.filter((x) => house.every((m) => m.p.includes(x))) : [];
  const perResident = house.map((mon) => ({
    mon,
    withGroup: mon.p.filter((x) => house.some((o) => o !== mon && o.p.includes(x))).length,
  }));
  return { common, perResident, sameHabitat: new Set(house.map((m) => m.h)).size <= 1 };
};

export const PREF_PT: Record<string, string> = {
  Bitter: 'Amargo', 'Blocky Stuff': 'Coisas quadradas', Cleanliness: 'Limpeza', 'Colorful Stuff': 'Coisas coloridas',
  'Complicated Stuff': 'Coisas complicadas', Construction: 'Construção', Containers: 'Recipientes', 'Cute Stuff': 'Coisas fofas',
  Dry: 'Seco', Electronics: 'Eletrônicos', Exercise: 'Exercício', Fabric: 'Tecidos', Garbage: 'Lixo', Gatherings: 'Reuniões',
  'Glass Stuff': 'Coisas de vidro', 'Group Activities': 'Atividades em grupo', 'Hard Stuff': 'Coisas duras', Healing: 'Cura',
  'Letters And Words': 'Letras e palavras', 'Looks Like Food': 'Parece comida', 'Lots Of Dirt': 'Muita terra',
  'Lots Of Fire': 'Muito fogo', 'Lots Of Nature': 'Muita natureza', 'Lots Of Water': 'Muita água', Luxury: 'Luxo',
  'Metal Stuff': 'Coisas de metal', 'Nice Breezes': 'Brisas agradáveis', 'Noisy Stuff': 'Coisas barulhentas',
  'Ocean Vibes': 'Clima de oceano', 'Play Spaces': 'Espaços de brincar', 'Pretty Flowers': 'Flores bonitas',
  Rides: 'Brinquedos de parque', 'Round Stuff': 'Coisas redondas', 'Sharp Stuff': 'Coisas pontiagudas',
  'Shiny Stuff': 'Coisas brilhantes', 'Slender Objects': 'Objetos finos', 'Soft Stuff': 'Coisas macias', Sour: 'Azedo',
  Spicy: 'Picante', 'Spinning Stuff': 'Coisas giratórias', 'Spooky Stuff': 'Coisas assustadoras', 'Stone Stuff': 'Coisas de pedra',
  'Strange Stuff': 'Coisas estranhas', Sweet: 'Doce', Symbols: 'Símbolos', 'Watching Stuff': 'Coisas para assistir',
  'Wobbly Stuff': 'Coisas bambas', 'Wooden Stuff': 'Coisas de madeira',
};

export const HABITAT_PT = ['Claro', 'Escuro', 'Seco', 'Úmido', 'Quente', 'Frio'];

export const SPECIALTY_PT: Record<string, string> = {
  Appraise: 'Avaliar', Build: 'Construir', Bulldoze: 'Demolir', Burn: 'Queimar', Chop: 'Cortar', Collect: 'Coletar',
  Crush: 'Esmagar', Dj: 'DJ', 'Dream Island': 'Ilha dos Sonhos', Eat: 'Comer', Engineer: 'Engenharia', Explode: 'Explodir',
  Fly: 'Voar', Gather: 'Reunir', 'Gather Honey': 'Coletar mel', Generate: 'Gerar energia', Grow: 'Cultivar', Hype: 'Animar',
  Illuminate: 'Iluminar', Litter: 'Espalhar', Paint: 'Pintar', Party: 'Festa', Rarify: 'Raridade', Recycle: 'Reciclar',
  Scrub: 'Esfregar', Search: 'Procurar', Storage: 'Armazenar', Teleport: 'Teleporte', Trade: 'Trocar', Transform: 'Transformar',
  Water: 'Regar', Yawn: 'Bocejar',
};

export const HABITAT_COLORS = ['#facc15', '#a78bfa', '#fb923c', '#60a5fa', '#f87171', '#22d3ee'];
