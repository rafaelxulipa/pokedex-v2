
import React, { useEffect, useState } from 'react';
import { Search, Filter, AlertCircle, Heart, ArrowRight, Sparkles, Map } from 'lucide-react';
import { fetchAllPokemonNames, fetchMultiplePokemon } from '../services/pokeApi';
import { PokemonListEntry, PokemonDetail } from '../types';
import PokemonCard from '../components/PokemonCard';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { TYPE_COLORS, GENERATIONS } from '../constants';
import { useGlobal } from '../context/GlobalContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 24;

const Home: React.FC = () => {
  const { t, favorites, comparisonList, clearComparison, isShinyMode, toggleShinyMode } = useGlobal();
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
  const [selectedType, setSelectedType] = useState<string>('all');
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
    setPage(1);
  };

  const handleTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setSelectedType(type);
    setPage(1);
  };

  const handleRegionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const region = e.target.value;
    setSelectedRegion(region);
    setPage(1);
  };

  const toggleFavoritesFilter = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
    setPage(1);
  };

  // Filter Logic: Runs when inputs change
  useEffect(() => {
    const applyFilters = async () => {
        if(allPokemonList.length === 0) return;

        let results = allPokemonList;

        // 1. Type Filter (Do this locally if we have the list, or fetch if needed)
        // Note: For simplicity and performance with existing "allPokemonList" (which is names only),
        // doing a proper type filter usually requires fetching type data first.
        
        if (selectedType !== 'all') {
             try {
                 const res = await fetch(`https://pokeapi.co/api/v2/type/${selectedType}`);
                 const data = await res.json();
                 results = data.pokemon.map((p: any) => p.pokemon);
             } catch (e) {
                 results = [];
             }
        }

        // 2. Region/Generation Filter
        if (selectedRegion !== 'all') {
            const genData = GENERATIONS.find(g => g.key === selectedRegion);
            if (genData) {
                results = results.filter(p => {
                    const parts = p.url.split('/');
                    const id = parseInt(parts[parts.length - 2]);
                    return id >= genData.start && id <= genData.end;
                });
            }
        }

        // 3. Name Search
        if (searchTerm) {
            results = results.filter(p => p.name.includes(searchTerm));
        }

        // 4. Favorites
        if (showFavoritesOnly) {
            results = results.filter(p => {
                const parts = p.url.split('/');
                const id = parseInt(parts[parts.length - 2]);
                return favorites.includes(id);
            });
        }

        setFilteredList(results);
    };

    // Debounce slightly to prevent rapid firing
    const timer = setTimeout(() => applyFilters(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedType, selectedRegion, showFavoritesOnly, allPokemonList, favorites]);

  // Pagination Logic: Runs when Page or FilteredList changes
  useEffect(() => {
     const paginate = async () => {
        if (filteredList.length === 0 && !loading) {
            setDisplayPokemon([]);
            return;
        }

        const startIndex = (page - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const pageSliceUrls = filteredList.slice(startIndex, endIndex).map(p => p.url);

        if (pageSliceUrls.length > 0) {
            const details = await fetchMultiplePokemon(pageSliceUrls);
            setDisplayPokemon(details);
        } else {
            setDisplayPokemon([]);
        }
     };

     if (!loading) {
         paginate();
     }
  }, [page, filteredList, loading]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);

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

            {/* Type Filter */}
            <div className="relative w-full md:w-48 group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <select
                value={selectedType}
                onChange={handleTypeChange}
                className="block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none cursor-pointer capitalize transition-all shadow-inner"
              >
                <option value="all">{t.allTypes}</option>
                {Object.keys(TYPE_COLORS).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
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
      {loading && filteredList.length > 0 && displayPokemon.length === 0 ? (
        <Loader />
      ) : displayPokemon.length === 0 ? (
        <div className="text-center py-24 text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-dark-card/50 rounded-3xl mx-auto max-w-lg border border-dashed border-gray-300 dark:border-gray-700">
            <AlertCircle className="mx-auto h-16 w-16 mb-4 opacity-30 text-blue-500" />
            <p className="text-xl font-medium">{showFavoritesOnly && favorites.length === 0 ? t.noFavorites : t.noPokemonFound}</p>
            <button 
                onClick={() => {
                  setSearchTerm(''); 
                  setSelectedType('all'); 
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
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
               <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md mr-2">{comparisonList.length}/2</span>
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
