import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { describeConditions, Spawn, spawnMatches, timeIndexNow } from '../utils/spawns';

const { spawns }: { spawns: Spawn[] } = JSON.parse(readFileSync('public/pokopia/spawns.json', 'utf-8'));
const habitats = JSON.parse(readFileSync('public/pokopia/habitats.json', 'utf-8')).habitats;

describe('spawn data', () => {
  it('has 456 spawn points pointing to real habitats', () => {
    expect(spawns).toHaveLength(456);
    spawns.forEach((s) => {
      expect(s.m).toMatch(/^[01]{7}$/);
      expect(habitats[s.h - 1]).toBeTruthy();
    });
  });
});

describe('spawn filters', () => {
  const night: Spawn = { n: 'Zubat', h: 1, r: 'C', m: '0001111', g: null };
  it('filters by time of day', () => {
    expect(spawnMatches(night, { time: 3, weather: null, rarity: null, region: '' })).toBe(true);
    expect(spawnMatches(night, { time: 1, weather: null, rarity: null, region: '' })).toBe(false);
  });

  it('filters by weather, rarity and region', () => {
    const s: Spawn = { n: 'Goomy', h: 1, r: 'C', m: '1111001', g: ['Palette Town'] };
    expect(spawnMatches(s, { time: null, weather: 1, rarity: null, region: '' })).toBe(false);
    expect(spawnMatches(s, { time: null, weather: 2, rarity: 'C', region: 'Palette Town' })).toBe(true);
    expect(spawnMatches(s, { time: null, weather: null, rarity: 'R', region: '' })).toBe(false);
    expect(spawnMatches(s, { time: null, weather: null, rarity: null, region: 'Bleak Beach' })).toBe(false);
  });

  it('describes conditions and picks the current time slot', () => {
    expect(describeConditions('1111111')).toEqual({ time: 'Qualquer horário', weather: 'Qualquer clima' });
    expect(describeConditions('0001111').time).toBe('Noite');
    expect(timeIndexNow(new Date(2026, 0, 1, 7))).toBe(0);
    expect(timeIndexNow(new Date(2026, 0, 1, 23))).toBe(3);
  });
});
