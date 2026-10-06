export interface SearchEntry {
  c: number; // chapter number
  ct: string; // chapter title
  s: string; // section id ('' = chapter intro)
  st: string; // section title
  x: string; // plain text of the section
}

export interface SearchHit {
  entry: SearchEntry;
  score: number;
  snippet: { text: string; hit: boolean }[];
}

// Lowercase and strip accents, so "pokemon" finds "Pokémon"
export const normalize = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const tokens = (query: string): string[] => normalize(query).split(/[^a-z0-9]+/).filter((t) => t.length > 0);

const SNIPPET_RADIUS = 70;

const buildSnippet = (text: string, norm: string, terms: string[]): { text: string; hit: boolean }[] => {
  const positions = terms.map((t) => norm.indexOf(t)).filter((p) => p >= 0);
  const first = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, first - SNIPPET_RADIUS);
  const end = Math.min(text.length, first + SNIPPET_RADIUS * 2);
  // normalize() keeps the length of ASCII/accent-composed text, so indexes line up with the original
  const piece = text.slice(start, end);
  const pieceNorm = norm.slice(start, end);
  const marks: [number, number][] = [];
  terms.forEach((t) => {
    let from = 0;
    for (;;) {
      const idx = pieceNorm.indexOf(t, from);
      if (idx < 0) break;
      marks.push([idx, idx + t.length]);
      from = idx + t.length;
    }
  });
  marks.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  marks.forEach((m) => {
    const last = merged[merged.length - 1];
    if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
    else merged.push([...m] as [number, number]);
  });
  const parts: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  merged.forEach(([a, b]) => {
    if (a > cursor) parts.push({ text: piece.slice(cursor, a), hit: false });
    parts.push({ text: piece.slice(a, b), hit: true });
    cursor = b;
  });
  if (cursor < piece.length) parts.push({ text: piece.slice(cursor), hit: false });
  if (start > 0 && parts.length) parts[0] = { ...parts[0], text: `...${parts[0].text}` };
  if (end < text.length && parts.length) parts[parts.length - 1] = { ...parts[parts.length - 1], text: `${parts[parts.length - 1].text}...` };
  return parts;
};

// All words must appear in the section. Titles weigh more than body text.
export const searchEntries = (entries: SearchEntry[], query: string, limit = 8): SearchHit[] => {
  const terms = tokens(query);
  if (terms.length === 0 || terms.join('').length < 2) return [];

  const hits: SearchHit[] = [];
  for (const entry of entries) {
    const norm = normalize(entry.x);
    if (!terms.every((t) => norm.includes(t))) continue;
    const title = normalize(`${entry.st} ${entry.ct}`);
    let score = 0;
    terms.forEach((t) => {
      if (title.includes(t)) score += 10;
      score += Math.min(10, norm.split(t).length - 1);
    });
    hits.push({ entry, score, snippet: buildSnippet(entry.x, norm, terms) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
};
