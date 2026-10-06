import React from 'react';
import { PokemonDetail } from '../types';
import { TYPE_COLORS } from '../constants';
import TypeBadge from './TypeBadge';
import { Link } from 'react-router-dom';
import { Heart, Scale, Sparkles } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';

interface PokemonCardProps {
  pokemon: PokemonDetail;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon }) => {
  const { t, localName, favorites, toggleFavorite, comparisonList, toggleComparison, isShinyMode, shinyPokemon, toggleShinyPokemon } = useGlobal();
  
  const isFavorite = favorites.includes(pokemon.id);
  const isComparing = comparisonList.includes(pokemon.id);
  const isLocalShiny = shinyPokemon.includes(pokemon.id);
  
  // Display shiny if Global Mode is ON OR Local Toggle is ON
  const displayShiny = isShinyMode || isLocalShiny;

  const mainType = pokemon.types[0].type.name;
  const bgColor = TYPE_COLORS[mainType] || 'bg-gray-400';

  // Formatting ID to #001
  const formattedId = `#${pokemon.id.toString().padStart(3, '0')}`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(pokemon.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleComparison(pokemon.id);
  };

  const handleShinyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleShinyPokemon(pokemon.id);
  };

  const spriteUrl = displayShiny 
    ? (pokemon.sprites.other['official-artwork'].front_shiny || pokemon.sprites.front_shiny || pokemon.sprites.other['official-artwork'].front_default)
    : (pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default);

  return (
    <Link to={`/pokemon/${pokemon.id}`} className="block group h-full">
      <div className={`relative bg-white dark:bg-dark-card rounded-3xl shadow-xs hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden h-full border ${isComparing ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-100 dark:border-gray-800'}`}>
        
        {/* Modern Glassy Background Effect */}
        <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.08] dark:opacity-[0.15] ${bgColor} blur-3xl group-hover:opacity-20 transition-opacity duration-500`}></div>
        <div className={`absolute top-20 -left-10 w-32 h-32 rounded-full opacity-[0.05] dark:opacity-[0.1] ${bgColor} blur-2xl`}></div>

        {/* Shiny Indicator on Card (Visual Cue when active via toggle) */}
        {displayShiny && (
           <div className="absolute top-3 right-3 text-yellow-500 opacity-50 z-20 pointer-events-none">
             <Sparkles size={16} fill="currentColor" />
           </div>
        )}

        <div className="p-5 flex flex-col h-full relative z-10">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 dark:text-gray-500 font-bold text-xs tracking-widest font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
              {formattedId}
            </span>
            <div className="flex gap-1.5">
               <button 
                onClick={handleShinyClick}
                className={`p-2 rounded-full transition-all duration-200 ${displayShiny ? 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-yellow-500 dark:hover:text-yellow-400'}`}
                title={t.toggleShiny}
              >
                <Sparkles size={16} fill={displayShiny ? "currentColor" : "none"} />
              </button>
               <button 
                onClick={handleCompareClick}
                className={`p-2 rounded-full transition-all duration-200 ${isComparing ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400'}`}
                title={t.compare}
              >
                <Scale size={16} fill={isComparing ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={handleFavoriteClick}
                className={`p-2 rounded-full transition-all duration-200 ${isFavorite ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400 shadow-xs' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400'}`}
                title={t.favorite}
              >
                <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="grow flex justify-center items-center py-6 relative">
             <img
              src={spriteUrl}
              alt={pokemon.name}
              loading="lazy"
              className="w-36 h-36 object-contain group-hover:scale-115 transition-transform duration-500 ease-out z-10 filter drop-shadow-lg group-hover:drop-shadow-2xl"
            />
             {/* Faint type watermark */}
            <div className={`absolute opacity-[0.03] dark:opacity-[0.08] scale-[2.8] z-0 text-black dark:text-white transition-transform duration-500 group-hover:rotate-12`}>
              <svg width="60" height="60" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div className="mt-2 text-center">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {localName(pokemon)}
            </h2>
            <div className="flex justify-center flex-wrap gap-1.5">
              {pokemon.types.map((t) => (
                <TypeBadge key={t.slot} type={t.type.name} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PokemonCard;