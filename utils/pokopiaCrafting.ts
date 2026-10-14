export interface CraftingData {
  categories: string[];
  materials: string[];
  sources: string[];
  items: { n: string; i: string; c: number; s: number; m: [number, number][] }[];
}

export const CATEGORY_PT = ['Móveis', 'Diversos', 'Exterior', 'Utilidades', 'Construções', 'Blocos', 'Outros'];

// Translates the "Recipe from" text (kept in English in the data) to Portuguese
export const sourcePt = (s: string): string =>
  s
    .replace(/ · Expansion Pass only/g, ' · só com o Expansion Pass')
    .replace(/^Daily Shop Special/i, 'Oferta diária da loja')
    .replace(/Daily shop specials?/i, 'Ofertas diárias da loja')
    .replace(/Sparkling ripples in water/i, 'Ondulações brilhantes na água')
    .replace(/Register (\d+) Pokémon in the Pokédex/i, 'Registrar $1 Pokémon na Pokédex')
    .replace(/Register (\d+) Pokémon/i, 'Registrar $1 Pokémon')
    .replace(/Shop \(as bundle\)/i, 'Loja (em pacote)')
    .replace(/^Shop - (.*) Lv\. ?(\d+)/i, 'Loja - $1 nv. $2')
    .replace(/^Shop$/i, 'Loja')
    .replace(/Basin Pokédex - (\d+) Registered/i, 'Pokédex do Basin - $1 registrados')
    .replace(/^Beginning$/i, 'Desde o início')
    .replace(/Purchase Expansion Pass/i, 'Comprar o Expansion Pass');

export const isExpansion = (s: string) => /Expansion Pass/i.test(s);

export const iconUrl = (slug: string) => `/pokopia/items/${encodeURIComponent(slug)}.webp`;
export const materialSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

// Total raw materials for a list of [item index, quantity]
export const sumMaterials = (data: CraftingData, picks: { index: number; qty: number }[]): Map<number, number> => {
  const total = new Map<number, number>();
  picks.forEach(({ index, qty }) => {
    data.items[index].m.forEach(([q, mat]) => total.set(mat, (total.get(mat) ?? 0) + q * qty));
  });
  return total;
};
