import { GuideBlock, GuideIndex, GuideSummary } from '../types';

const BASE = '/detonados';

const cache = new Map<string, Promise<unknown>>();

const load = <T,>(url: string): Promise<T | null> => {
  const existing = cache.get(url);
  if (existing) return existing as Promise<T | null>;
  const request = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      cache.delete(url);
      console.error('Error loading guide data:', url, error);
      return null;
    }
  })();
  cache.set(url, request);
  return request;
};

export const guideAsset = (slug: string, path: string) => `${BASE}/${slug}/${path}`;

export const fetchGuideCatalog = () => load<GuideSummary[]>(`${BASE}/guides.json`);

export const fetchGuideIndex = (slug: string) => load<GuideIndex>(`${BASE}/${slug}/index.json`);

export const fetchGuideChapter = (slug: string, n: number) =>
  load<{ title: string; blocks: GuideBlock[] }>(`${BASE}/${slug}/chapters/${n}.json`);

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} KB`;
