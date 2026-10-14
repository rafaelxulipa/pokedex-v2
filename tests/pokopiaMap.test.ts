import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

interface MapData {
  categories: { key: string }[];
  areas: { key: string; img: string; pins: { c: string; x: number; y: number; n: string }[] }[];
}

const data: MapData = JSON.parse(readFileSync('public/pokopia/map.json', 'utf-8'));

describe('pokopia map data', () => {
  it('has the 7 areas and 438 pins', () => {
    expect(data.areas).toHaveLength(7);
    expect(data.areas.reduce((n, a) => n + a.pins.length, 0)).toBe(438);
  });

  it('has an image for every area', () => {
    data.areas.forEach((a) => expect(existsSync(`public${a.img}`)).toBe(true));
  });

  it('uses known categories and normalized coordinates', () => {
    const keys = new Set(data.categories.map((c) => c.key));
    data.areas.forEach((a) =>
      a.pins.forEach((p) => {
        expect(keys.has(p.c)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
        expect(p.n.length).toBeGreaterThan(0);
      })
    );
  });
});
