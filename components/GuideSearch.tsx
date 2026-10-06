import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { fetchGuideCatalog, fetchGuideSearch } from '../services/guides';
import { GuideSummary } from '../types';
import { SearchEntry, searchEntries } from '../utils/guideSearch';
import { useGlobal } from '../context/GlobalContext';

interface GuideSearchProps {
  slug?: string; // limit the search to one guide; without it every guide is searched
  className?: string;
}

interface IndexedEntry extends SearchEntry {
  guide: GuideSummary;
}

const GuideSearch: React.FC<GuideSearchProps> = ({ slug, className = '' }) => {
  const { t } = useGlobal();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<IndexedEntry[] | null>(null);
  const [debounced, setDebounced] = useState('');
  const loading = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  // The search index is only downloaded when the reader first uses the search box
  const ensureLoaded = async () => {
    if (entries || loading.current) return;
    loading.current = true;
    const catalog = (await fetchGuideCatalog()) ?? [];
    const guides = slug ? catalog.filter((g) => g.slug === slug) : catalog;
    const loaded = await Promise.all(
      guides.map(async (guide) => ((await fetchGuideSearch(guide.slug)) ?? []).map((e) => ({ ...e, guide })))
    );
    setEntries(loaded.flat());
    loading.current = false;
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const hits = useMemo(() => {
    if (!entries) return [];
    return searchEntries(entries, debounced, 8).map((hit) => ({ ...hit, guide: (hit.entry as IndexedEntry).guide }));
  }, [entries, debounced]);

  const go = (guideSlug: string, hit: { entry: SearchEntry }) => {
    setOpen(false);
    navigate(`/detonados/${guideSlug}/${hit.entry.c}${hit.entry.s ? `#${hit.entry.s}` : ''}`);
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={box} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            ensureLoaded();
          }}
          onFocus={() => {
            setOpen(true);
            ensureLoaded();
          }}
          placeholder={t.guides.searchPlaceholder}
          aria-label={t.guides.searchPlaceholder}
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} aria-label={t.clear} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute z-50 left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-dark-card shadow-2xl">
          {!entries ? (
            <p className="p-4 text-sm text-gray-400">...</p>
          ) : hits.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t.guides.noResults}</p>
          ) : (
            <ul>
              {hits.map((hit) => (
                <li key={`${hit.guide.slug}-${hit.entry.c}-${hit.entry.s}`}>
                  <button
                    onClick={() => go(hit.guide.slug, hit)}
                    className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: hit.guide.accent }}>
                      {!slug && <span>{hit.guide.title.replace('Detonado Pokémon ', '')}</span>}
                      <span className="text-gray-400">{t.guides.chapter} {hit.entry.c}</span>
                    </span>
                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">
                      {hit.entry.st || hit.entry.ct}
                      {hit.entry.st && <span className="font-normal text-gray-400"> · {hit.entry.ct}</span>}
                    </span>
                    <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {hit.snippet.map((part, i) =>
                        part.hit ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded-xs px-0.5">{part.text}</mark> : <React.Fragment key={i}>{part.text}</React.Fragment>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GuideSearch;
