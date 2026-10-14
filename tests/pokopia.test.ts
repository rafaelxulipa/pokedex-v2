import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatHabitatId, habitatMatches, PokopiaData } from '../utils/pokopia';

const data: PokopiaData = JSON.parse(readFileSync('public/pokopia/habitats.json', 'utf-8'));

describe('pokopia data', () => {
  it('has the 252 habitats in order', () => {
    expect(data.habitats).toHaveLength(252);
    expect(data.habitats.filter((h) => h.group === 'main')).toHaveLength(209);
    expect(data.habitats.filter((h) => h.group === 'basin')).toHaveLength(36);
    expect(data.habitats.filter((h) => h.group === 'event')).toHaveLength(7);
    data.habitats.forEach((h, i) => expect(h.id).toBe(i + 1));
  });

  it('indexes every habitat Pokémon', () => {
    const slugs = new Set(data.habitats.flatMap((h) => h.pokemon.map((m) => m.slug)));
    expect(data.pokemon).toHaveLength(slugs.size);
    data.pokemon.forEach((p) => p.habitats.forEach((id) => expect(data.habitats[id - 1].pokemon.some((m) => m.slug === p.slug)).toBe(true)));
  });

  it('has no em dash in names', () => {
    expect(JSON.stringify(data)).not.toContain('—');
  });
});

describe('habitatMatches', () => {
  const tall = data.habitats[0];
  it('matches by name, item, pokemon and number', () => {
    expect(habitatMatches(tall, 'tall grass')).toBe(true);
    expect(habitatMatches(tall, 'BULBASAUR')).toBe(true);
    expect(habitatMatches(tall, '#1')).toBe(true);
    expect(habitatMatches(data.habitats[209], '#1')).toBe(true);
    expect(habitatMatches(tall, 'pikachu')).toBe(false);
  });

  it('formats the id', () => {
    expect(formatHabitatId(7)).toBe('#007');
  });
});

import { existsSync } from 'node:fs';
import { habitatImage } from '../utils/pokopia';

describe('habitatImage', () => {
  it('builds slugs that match the files', () => {
    expect(habitatImage("Lumberjack's workplace")).toBe('/pokopia/habitats/lumberjacks-workplace.webp');
    expect(habitatImage('Café space')).toBe('/pokopia/habitats/cafe-space.webp');
  });

  it('has an image for every habitat except the unlisted ones', () => {
    const missing = data.habitats.filter((h) => !existsSync(`public${habitatImage(h.name)}`));
    expect(missing).toEqual([]);
  });
});
