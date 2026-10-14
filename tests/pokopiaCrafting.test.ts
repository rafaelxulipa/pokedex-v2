import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CraftingData, isExpansion, sourcePt, sumMaterials } from '../utils/pokopiaCrafting';

const data: CraftingData = JSON.parse(readFileSync('public/pokopia/crafting.json', 'utf-8'));
const recipes = JSON.parse(readFileSync('public/pokopia/recipes.json', 'utf-8'));

describe('crafting data', () => {
  it('has 883 items in 7 categories with valid references', () => {
    expect(data.items.length).toBe(883);
    expect(data.categories).toHaveLength(7);
    data.items.forEach((it) => {
      expect(it.s).toBeLessThan(data.sources.length);
      it.m.forEach(([q, m]) => {
        expect(q).toBeGreaterThan(0);
        expect(m).toBeLessThan(data.materials.length);
      });
    });
  });

  it('translates sources', () => {
    expect(sourcePt('Register 30 Pokémon')).toBe('Registrar 30 Pokémon');
    expect(sourcePt('Shop - Palette Town Lv. 5')).toBe('Loja - Palette Town nv. 5');
    expect(isExpansion('Shop - Bubbly Basin Lv. 5 · Expansion Pass only')).toBe(true);
  });

  it('sums materials', () => {
    const idx = data.items.findIndex((i) => i.n === 'Plain chest');
    const total = sumMaterials(data, [{ index: idx, qty: 3 }]);
    expect([...total.values()].reduce((a, b) => a + b, 0)).toBe(6);
  });
});

describe('cooking recipes', () => {
  it('has 34 recipes across 5 meals', () => {
    expect(recipes.recipes).toHaveLength(34);
    expect(Object.keys(recipes.meals)).toHaveLength(5);
  });
});
