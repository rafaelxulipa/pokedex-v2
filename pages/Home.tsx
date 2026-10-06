
import React, { useEffect, useRef, useState } from 'react';
import { Search, Filter, AlertCircle, Heart, ArrowRight, Sparkles, Map, X } from 'lucide-react';
import { fetchAllPokemonNames, fetchMultiplePokemon, fetchPokemonOfType, fetchSpeciesNames } from '../services/pokeApi';
import { PokemonListEntry, PokemonDetail } from '../types';
import PokemonCard from '../components/PokemonCard';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { TYPE_COLORS, GENERATIONS } from '../constants';
import { useGlobal, MAX_COMPARISON } from '../context/GlobalContext';
import { useNavigate } from 'react-router-dom';
import { idFromUrl } from '../utils/pokemon';
import TypeIcon from '../components/TypeIcon';

const PAGE_SIZE = 24;

const Home: React.FC = () => {
  const { t, language, favorites, comparisonList, clearComparison, isShinyMode, toggleShinyMode } = useGlobal();
  const navigate = useNavigate();

  // Master list
  const [allPokemonList, setAllPokemonList] = useState<PokemonListEntry[]>([]);
  
  // Filtered list (All results matching search/type/favorites/region)
  const [filteredList, setFilteredList] = useState<PokemonListEntry[]>([]);
  
  // Display list (Current Page)
  const [displayPokemon, setDisplayPokemon] = useState<PokemonDetail[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [translatedNames, setTranslatedNames] = useState<Record<number, string>>({});
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Initial Fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const list = await fetchAllPokemonNames();
      setAllPokemonList(list);
      setFilteredList(list);
      setLoading(false);
    };
    init();
  }, []);

  // Names in the selected language, so Pokémon can also be found by their translated name
  useEffect(() => {
    let cancelled = false;
    fetchSpeciesNames(language).then((names) => {
      if (!cancelled) setTranslatedNames(names);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
    setPage(1);
  };

  // Up to 2 types; picking a third one replaces the oldest selection
  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) return prev.filter((x) => x !== type);
      return prev.length >= 2 ? [prev[1], type] : [...prev, type];
    });
    setPage(1);
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
    setPage(1);
  };

  const toggleFavoritesFilter = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
    setPage(1);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(event.target as Node)) {
        setTypeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Logic: runs when inputs change. `cancelled` guarantees that a slow, outdated request
  // can never overwrite the result of a newer one.
  useEffect(() => {
    if (allPokemonList.length === 0) return;
    let cancelled = false;

    const applyFilters = async () => {
      let results = allPokemonList;

      // 1. Type filter: Pokemon must have ALL selected types (type lists are cached)
      if (selectedTypes.length > 0) {
        const lists = await Promise.all(selectedTypes.map((type) => fetchPokemonOfType(type)));
        if (cancelled) return;
        const names = lists.map((list) => new Set(list.map((p) => p.name)));
        results = lists[0].filter((p) => names.every((set) => set.has(p.name)));
      }

      // 2. Region/Generation filter
      if (selectedRegion !== 'all') {
        const genData = GENERATIONS.find((g) => g.key === selectedRegion);
        if (genData) {
          results = results.filter((p) => {
            const id = idFromUrl(p.url);
            return id >= genData.start && id <= genData.end;
          });
        }
      }

      // 3. Search by name or number
      if (searchTerm) {
        const term = searchTerm.trim().replace(/^#/, '');
        const isNumeric = /^\d+$/.test(term);
        results = results.filter((p) => {
          const id = idFromUrl(p.url);
          if (isNumeric && id === parseInt(term, 10)) return true;
          if (p.name.includes(term)) return true;
          return (translatedNames[id] ?? '').toLowerCase().includes(term);
        });
      }

      // 4. Favorites
      if (showFavoritesOnly) {
        results = results.filter((p) => favorites.includes(idFromUrl(p.url)));
      }

      if (!cancelled) setFilteredList(results);
    };

    // Debounce slightly to prevent rapid firing
    const timer = setTimeout(applyFilters, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, selectedTypes, selectedRegion, showFavoritesOnly, allPokemonList, favorites, translatedNames]);

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);

  // Keep the current page valid when the list shrinks (e.g. un-favoriting on the last page)
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Pagination Logic: runs when Page or FilteredList changes
  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const startIndex = (page - 1) * PAGE_SIZE;
    const pageSliceUrls = filteredList.slice(startIndex, startIndex + PAGE_SIZE).map((p) => p.url);

    if (pageSliceUrls.length === 0) {
      setDisplayPokemon([]);
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    fetchMultiplePokemon(pageSliceUrls).then((details) => {
      if (cancelled) return;
      setDisplayPokemon(details);
      setPageLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [page, filteredList, loading]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen pb-24">
      
      {/* Header & Controls - Floating Glassmorphism */}
      <div className="sticky top-20 z-30 mb-10 mx-auto max-w-6xl">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl p-4 rounded-3xl shadow-lg border border-white/20 dark:border-gray-700 ring-1 ring-black/5">
          
          {/* Search */}
          <div className="relative w-full xl:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <div className="flex flex-wrap xl:flex-nowrap gap-3 w-full xl:w-auto justify-end">
            
            {/* Region Filter */}
            <div className="relative w-full md:w-56 group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Map className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <select
                value={selectedRegion}
                onChange={handleRegionChange}
                className="block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none cursor-pointer transition-all shadow-inner"
              >
                <option value="all">{t.allRegions}</option>
                {GENERATIONS.map(gen => (
                  <option key={gen.key} value={gen.key}>{t.generations[gen.key as keyof typeof t.generations]}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* Type Filter (up to 2 types) */}
            <div className="relative w-full md:w-48" ref={typeMenuRef}>
              <button
                type="button"
                onClick={() => setTypeMenuOpen((open) => !open)}
                className="flex items-center w-full pl-3 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer capitalize transition-all shadow-inner text-left"
                aria-expanded={typeMenuOpen}
              >
                <Filter className="h-5 w-5 mr-2 text-gray-400 shrink-0" />
                <span className="flex-1 truncate">{selectedTypes.length > 0 ? selectedTypes.join(' + ') : t.allTypes}</span>
                {selectedTypes.length > 0 ? (
                  <X
                    className="h-4 w-4 text-gray-400 hover:text-red-500 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setSelectedTypes([]); setPage(1); }}
                  />
                ) : (
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                )}
              </button>
              {typeMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">{t.maxTypes}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(TYPE_COLORS).map((type) => {
                      const active = selectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleType(type)}
                          className={`${TYPE_COLORS[type]} flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-white text-xs font-bold capitalize transition-all ${active ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900 scale-105' : 'opacity-70 hover:opacity-100'}`}
                        >
                          <TypeIcon type={type} className="w-3 h-3" />
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Favorites Toggle */}
            <button
              onClick={toggleFavoritesFilter}
              className={`flex items-center justify-center px-5 py-3 rounded-2xl border transition-all duration-300 shadow-sm ${showFavoritesOnly ? 'bg-gradient-to-r from-red-500 to-pink-500 border-transparent text-white shadow-red-500/30' : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title={t.favoritesOnly}
            >
              <Heart className={`h-5 w-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              <span className="ml-2 hidden sm:inline font-medium">{t.favoritesOnly}</span>
            </button>

             {/* Shiny Toggle */}
             <button
              onClick={toggleShinyMode}
              className={`flex items-center justify-center px-4 py-3 rounded-2xl border transition-all duration-300 shadow-sm group ${isShinyMode ? 'bg-gradient-to-r from-yellow-400 to-orange-400 border-transparent text-white shadow-yellow-500/30' : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="Shiny Mode"
            >
              <Sparkles className={`h-5 w-5 ${isShinyMode ? 'fill-current animate-pulse' : 'group-hover:text-yellow-500'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading || (pageLoading && displayPokemon.length === 0) ? (
        <Loader />
      ) : displayPokemon.length === 0 ? (
        <div className="text-center py-24 text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-dark-card/50 rounded-3xl mx-auto max-w-lg border border-dashed border-gray-300 dark:border-gray-700">
            <AlertCircle className="mx-auto h-16 w-16 mb-4 opacity-30 text-blue-500" />
            <p className="text-xl font-medium">{showFavoritesOnly && favorites.length === 0 ? t.noFavorites : t.noPokemonFound}</p>
            <button 
                onClick={() => {
                  setSearchTerm(''); 
                  setSelectedTypes([]); 
                  setSelectedRegion('all');
                  setShowFavoritesOnly(false);
                }} 
                className="mt-6 px-6 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-semibold"
            >
                {t.clearFilters}
            </button>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 transition-opacity ${pageLoading ? 'opacity-50' : ''}`}>
            {displayPokemon.map((pokemon) => (
              <PokemonCard key={pokemon.id} pokemon={pokemon} />
            ))}
          </div>
          
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            onPageChange={handlePageChange} 
          />
        </>
      )}

      {/* Floating Compare Bar */}
      {comparisonList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl p-4 flex items-center gap-6 z-50 w-11/12 max-w-lg animate-fade-in-up ring-1 ring-black/5">
           <div className="flex-1">
             <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
               <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md mr-2">{comparisonList.length}/{MAX_COMPARISON}</span>
               {t.comparePlaceholder}
             </p>
           </div>
           <div className="flex gap-3">
             <button 
                onClick={clearComparison}
                className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
             >
               {t.clear}
             </button>
             <button 
               onClick={() => navigate('/compare')}
               className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
               disabled={comparisonList.length < 2}
             >
               {t.viewComparison}
               <ArrowRight size={16} />
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Home;
