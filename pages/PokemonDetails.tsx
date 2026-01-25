import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Ruler, Weight, Sparkles, Heart, Scale, ChevronLeft, ChevronRight, ArrowRight, Sun, Moon, CloudRain } from 'lucide-react';
import { fetchPokemonDetails, fetchPokemonSpecies, fetchEvolutionChain, fetchTypeDetails } from '../services/pokeApi';
import { PokemonDetail, PokemonSpecies, EvolutionNode, TypeDetail, EvolutionDetail } from '../types';
import { TYPE_COLORS } from '../constants';
import TypeBadge from '../components/TypeBadge';
import StatChart from '../components/StatChart';
import Loader from '../components/Loader';
import AdSense from '../components/AdSense';
import { useGlobal } from '../context/GlobalContext';

// Recursive type for branching evolutions
interface ChainNode {
  name: string;
  id: number;
  evolutionDetails: string | null;
  children: ChainNode[];
}

// Custom Gender Icons
const MaleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7" />
    <path d="M20 4v6m0-6h-6m6 0L15 9" />
  </svg>
);

const FemaleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="7" />
    <path d="M12 17v7m-3-3h6" />
  </svg>
);

const PokemonDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const numericId = parseInt(id || '1');
  const navigate = useNavigate();
  const { t, language, favorites, toggleFavorite, comparisonList, toggleComparison, isShinyMode: globalShinyMode } = useGlobal();

  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [evolutionTree, setEvolutionTree] = useState<ChainNode | null>(null);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShiny, setIsShiny] = useState(globalShinyMode);

  // Sync local shiny state with global preference on load/change
  useEffect(() => {
    setIsShiny(globalShinyMode);
  }, [globalShinyMode]);

  // Helper to format string
  const formatName = (name: string) => {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Helper to extract readable evolution details
  const getEvolutionDetailsString = (details: EvolutionDetail[]): string | null => {
    if (!details || details.length === 0) return null;
    const detail = details[0]; 
    const conditions: string[] = [];

    if (detail.trigger.name === 'level-up') {
        if (!detail.min_level && conditions.length === 0 && !detail.min_happiness && !detail.min_beauty && !detail.min_affection && !detail.location && !detail.known_move && !detail.known_move_type && !detail.party_species && !detail.party_type && !detail.held_item) {
             conditions.push('Level Up'); 
        }
        if (detail.min_level) conditions.push(`Lvl ${detail.min_level}`);
    } else if (detail.trigger.name === 'trade') {
        conditions.push('Trade');
    } else if (detail.trigger.name === 'use-item' && detail.item) {
        conditions.push(formatName(detail.item.name));
        return conditions.join(' + ');
    } else if (detail.trigger.name === 'shed') {
        return 'Shed';
    }

    if (detail.min_happiness) conditions.push('Happiness');
    if (detail.min_beauty) conditions.push('Beauty');
    if (detail.min_affection) conditions.push('Affection');
    if (detail.location) conditions.push(`at ${formatName(detail.location.name)}`);
    if (detail.time_of_day) conditions.push(detail.time_of_day === 'day' ? 'Day' : 'Night');
    if (detail.held_item) conditions.push(`hold ${formatName(detail.held_item.name)}`);
    if (detail.trade_species) conditions.push(`w/ ${formatName(detail.trade_species.name)}`);
    if (detail.known_move) conditions.push(`knows ${formatName(detail.known_move.name)}`);
    if (detail.known_move_type) conditions.push(`knows ${formatName(detail.known_move_type.name)} type`);
    if (detail.needs_overworld_rain) conditions.push('Rain');
    if (detail.gender !== null) conditions.push(detail.gender === 1 ? 'Female' : 'Male');

    if (conditions.length === 0) return formatName(detail.trigger.name);
    return conditions.join(' + ');
  };

  const parseEvolutions = (node: EvolutionNode): ChainNode => {
    const urlParts = node.species.url.split('/');
    const speciesId = parseInt(urlParts[urlParts.length - 2]);
    
    return {
      name: node.species.name,
      id: speciesId,
      evolutionDetails: getEvolutionDetailsString(node.evolution_details),
      children: node.evolves_to.map(child => parseEvolutions(child))
    };
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const data = await fetchPokemonDetails(`https://pokeapi.co/api/v2/pokemon/${id}`);
      if (data) {
        setPokemon(data);
        const spec = await fetchPokemonSpecies(data.id);
        setSpecies(spec);
        if (spec?.evolution_chain?.url) {
          const evoData = await fetchEvolutionChain(spec.evolution_chain.url);
          if (evoData) {
            setEvolutionTree(parseEvolutions(evoData.chain));
          }
        }
        const typePromises = data.types.map(t => fetchTypeDetails(t.type.url));
        const typeDetails = await Promise.all(typePromises);
        const damageMap: Record<string, number> = {};
        typeDetails.forEach(detail => {
            if (!detail) return;
            detail.damage_relations.double_damage_from.forEach(d => {
                damageMap[d.name] = (damageMap[d.name] || 1) * 2;
            });
            detail.damage_relations.half_damage_from.forEach(d => {
                damageMap[d.name] = (damageMap[d.name] || 1) * 0.5;
            });
            detail.damage_relations.no_damage_from.forEach(d => {
                damageMap[d.name] = (damageMap[d.name] || 1) * 0;
            });
        });
        const weakTypes = Object.entries(damageMap).filter(([_, multiplier]) => multiplier > 1).map(([name]) => name);
        setWeaknesses(weakTypes);
      }
      setLoading(false);
    };
    load();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  if (!pokemon) return <div className="text-center mt-20">{t.noPokemonFound}</div>;

  const isFavorite = favorites.includes(pokemon.id);
  const isComparing = comparisonList.includes(pokemon.id);
  const mainType = pokemon.types[0].type.name;
  const bgColorClass = TYPE_COLORS[mainType] || 'bg-gray-500';

  const getFlavorText = () => {
    if (!species) return '';
    const apiLangMap: Record<string, string> = { 'pt': 'pt-br', 'zh': 'zh-Hans', 'ja': 'ja' };
    const targetLang = apiLangMap[language] || language;
    let entry = species.flavor_text_entries.find(e => e.language.name === targetLang);
    if (!entry) {
        entry = species.flavor_text_entries.find(e => e.language.name === 'en');
    }
    return entry ? entry.flavor_text.replace(/[\n\f]/g, ' ') : 'No description available.';
  };
  const description = getFlavorText();
  const genus = species?.genera.find((g) => g.language.name === 'en')?.genus;

  const getGenderRatio = () => {
    if (!species) return null;
    if (species.gender_rate === -1) return { label: t.genderless, male: 0, female: 0 };
    const femalePct = (species.gender_rate / 8) * 100;
    return { male: 100 - femalePct, female: femalePct };
  };
  const genderData = getGenderRatio();
  const prevId = numericId > 1 ? numericId - 1 : null;
  const nextId = numericId < 1025 ? numericId + 1 : null;

  // --- Improved Evolution Tree Renderer ---
  const EvolutionNodeRenderer: React.FC<{ node: ChainNode }> = ({ node }) => {
    const isCurrent = node.id === pokemon.id;
    const hasMultipleChildren = node.children.length > 1;
    
    return (
      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 relative">
        {/* Pokemon Card */}
        <Link to={`/pokemon/${node.id}`} className="group flex flex-col items-center z-10 relative py-4 px-2">
          <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mb-3 relative transition-transform duration-300 group-hover:scale-110 ${isCurrent ? 'bg-blue-100 dark:bg-blue-900 ring-4 ring-blue-500/30' : 'bg-white dark:bg-gray-800 shadow-inner'}`}>
             <img 
                 src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${node.id}.png`} 
                 alt={node.name}
                 className="w-16 h-16 md:w-24 md:h-24 object-contain filter drop-shadow-md"
             />
          </div>
          <span className={`text-sm md:text-base font-bold capitalize ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {node.name}
          </span>
          <span className="text-xs text-gray-400 font-mono">#{node.id.toString().padStart(3, '0')}</span>
        </Link>

        {/* Children (Recursion) */}
        {node.children.length > 0 && (
          <div className="flex flex-col md:flex-row items-stretch">
             {/* If multiple children, we can use a visual bracket or just spacing */}
             <div className={`flex flex-col justify-center ${hasMultipleChildren ? 'md:border-l-2 md:border-gray-200 dark:md:border-gray-700 md:pl-4' : ''}`}>
               {node.children.map((child, index) => (
                 <div key={child.id} className="flex flex-col md:flex-row items-center relative">
                    
                    {/* Visual Connector Line for multiple children on desktop */}
                    {hasMultipleChildren && (
                        <div className="hidden md:block absolute -left-4 w-4 h-[2px] bg-gray-200 dark:bg-gray-700 top-1/2 transform -translate-y-1/2"></div>
                    )}

                    <div className="flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px] px-2 py-4 md:py-0 text-gray-300 dark:text-gray-600">
                        {child.evolutionDetails && (
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mb-1 text-center bg-white dark:bg-dark-card px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm whitespace-nowrap z-20 max-w-[120px] overflow-hidden text-ellipsis">
                                {child.evolutionDetails}
                            </span>
                        )}
                        <ArrowRight size={20} className="rotate-90 md:rotate-0 text-gray-400 dark:text-gray-600" />
                    </div>

                    <EvolutionNodeRenderer node={child} />
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    );
  };

  const currentSprite = isShiny 
    ? (pokemon.sprites.other['official-artwork'].front_shiny || pokemon.sprites.front_shiny) 
    : (pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-300 pb-20">
      
      {/* Top Section */}
      <div className={`relative h-64 md:h-80 w-full ${bgColorClass} rounded-b-[3rem] shadow-lg overflow-visible transition-colors duration-500`}>
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-b-[3rem] opacity-20 pointer-events-none">
            <svg className="absolute -right-20 -top-20 w-96 h-96 text-white" viewBox="0 0 100 100" fill="currentColor">
                 <circle cx="50" cy="50" r="50" />
            </svg>
        </div>

        <div className="container mx-auto px-4 pt-6 flex justify-between items-start relative z-10">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-3">
             <button 
                onClick={() => toggleComparison(pokemon.id)}
                className={`p-2 rounded-full backdrop-blur-sm transition ${isComparing ? 'bg-white text-blue-500' : 'bg-white/20 text-white hover:bg-white/40'}`}
                title={t.compare}
              >
                <Scale size={20} fill={isComparing ? "currentColor" : "none"} />
            </button>
            <button 
                onClick={() => toggleFavorite(pokemon.id)}
                className={`p-2 rounded-full backdrop-blur-sm transition ${isFavorite ? 'bg-white text-red-500' : 'bg-white/20 text-white hover:bg-white/40'}`}
                title="Favorite"
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* Main Image Area */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 z-20 w-56 h-56 md:w-72 md:h-72 group">
           {/* Shiny Toggle Button near image */}
           <button 
                onClick={() => setIsShiny(!isShiny)}
                className={`absolute top-0 right-0 p-2 rounded-full shadow-md z-30 transition-all transform hover:scale-110 ${isShiny ? 'bg-yellow-400 text-white' : 'bg-white dark:bg-dark-card text-gray-400 hover:text-yellow-400'}`}
                title="Toggle Shiny"
           >
               <Sparkles size={20} fill={isShiny ? "currentColor" : "none"} />
           </button>

           <img
              src={currentSprite}
              alt={pokemon.name}
              className="w-full h-full object-contain filter drop-shadow-2xl animate-float transition-all duration-500"
            />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="container mx-auto px-4 max-w-6xl mt-4 md:mt-8">
        <div className="flex justify-between items-center w-full">
            {prevId ? (
                <button 
                    onClick={() => navigate(`/pokemon/${prevId}`)}
                    className="flex items-center gap-2 md:gap-4 px-4 py-3 md:px-6 md:py-4 bg-gray-200 dark:bg-dark-card rounded-xl md:rounded-l-full hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all group w-1/3 md:w-auto shadow-md"
                >
                    <ChevronLeft className="w-6 h-6" />
                    <div className="text-left hidden md:block">
                        <span className="block text-xs font-bold opacity-60">#{prevId.toString().padStart(3, '0')}</span>
                        <span className="block font-bold text-sm md:text-base">{t.prevPokemon}</span>
                    </div>
                </button>
            ) : <div className="w-1/3 md:w-32"></div>}

            {nextId ? (
                <button 
                    onClick={() => navigate(`/pokemon/${nextId}`)}
                    className="flex items-center justify-end gap-2 md:gap-4 px-4 py-3 md:px-6 md:py-4 bg-gray-200 dark:bg-dark-card rounded-xl md:rounded-r-full hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all group w-1/3 md:w-auto shadow-md"
                >
                    <div className="text-right hidden md:block">
                        <span className="block text-xs font-bold opacity-60">#{nextId.toString().padStart(3, '0')}</span>
                        <span className="block font-bold text-sm md:text-base">{t.nextPokemon}</span>
                    </div>
                    <ChevronRight className="w-6 h-6" />
                </button>
            ) : <div className="w-1/3 md:w-32"></div>}
        </div>
      </div>


      {/* Info Content */}
      <div className="container mx-auto px-4 mt-20 md:mt-16 max-w-4xl">
        
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold capitalize text-gray-800 dark:text-white mb-2 flex items-center justify-center gap-2">
                {pokemon.name.replace('-', ' ')} 
                {isShiny && <Sparkles className="text-yellow-400" size={32} fill="currentColor" />}
                <span className="text-gray-400 dark:text-gray-600 text-3xl">#{pokemon.id.toString().padStart(3, '0')}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{genus}</p>
            <div className="flex justify-center gap-2 mt-4">
                {pokemon.types.map((t) => (
                    <TypeBadge key={t.slot} type={t.type.name} />
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Left Column: About, Gender, Weaknesses */}
            <div className="flex flex-col gap-6">
                {/* About Box */}
                <div className="bg-gray-50 dark:bg-dark-card p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className={`text-xl font-bold mb-4 ${pokemon.types[0].type.name === 'dark' ? 'text-gray-700 dark:text-gray-300' : 'text-' + mainType.replace('bg-', '') + '-600'}`}>
                        {t.about}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 italic">
                        "{description}"
                    </p>

                    {/* Dimensions & Ability */}
                    <div className="grid grid-cols-3 gap-3 mb-2">
                        <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                                <Weight size={14} /> {t.weight}
                            </div>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold text-sm">{pokemon.weight / 10} kg</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                                <Ruler size={14} /> {t.height}
                            </div>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold text-sm">{pokemon.height / 10} m</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                                <Sparkles size={14} /> {t.ability}
                            </div>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold capitalize text-xs text-center truncate w-full">
                                {pokemon.abilities[0]?.ability.name.replace('-', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Gender & Weaknesses Row */}
                <div className="grid grid-cols-1 gap-6">
                     {/* Gender */}
                    {genderData && (
                        <div className="bg-white dark:bg-dark-card p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t.gender}</h4>
                            <div className="flex items-center gap-6">
                                {genderData.label ? (
                                    <span className="text-gray-500 font-medium">{genderData.label}</span>
                                ) : (
                                    <div className="flex items-center gap-8 w-full">
                                        <div className="flex items-center gap-3 text-blue-500">
                                            <MaleIcon />
                                            <span className="font-bold text-lg">{genderData.male}%</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-pink-500">
                                            <FemaleIcon />
                                            <span className="font-bold text-lg">{genderData.female}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Visual Bar for Gender */}
                            {!genderData.label && (
                                <div className="mt-3 w-full h-2 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-blue-500" style={{ width: `${genderData.male}%` }}></div>
                                    <div className="h-full bg-pink-500" style={{ width: `${genderData.female}%` }}></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Weaknesses */}
                    <div className="bg-white dark:bg-dark-card p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                         <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t.weaknesses}</h4>
                         <div className="flex flex-wrap gap-2">
                            {weaknesses.length > 0 ? (
                                weaknesses.map(type => (
                                    <TypeBadge key={type} type={type} size="sm" />
                                ))
                            ) : (
                                <span className="text-gray-400 text-sm">None</span>
                            )}
                         </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Base Stats Chart */}
            <div className="bg-gray-50 dark:bg-dark-card p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col">
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{t.baseStats}</h3>
                <div className="w-full flex items-center justify-center mb-6">
                    <StatChart stats={pokemon.stats} primaryType={mainType} />
                </div>
                
                {/* 1. ADVERTISEMENT BLOCK (Inside Stats Card) */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 block text-center">Advertisement</span>
                    <AdSense format="auto" className="min-h-[250px]" slot="8207137273" />
                </div>
            </div>
        </div>

        {/* Evolution Chain */}
        {evolutionTree && (
            <div className="mb-12">
                <h3 className="text-2xl font-bold mb-8 text-gray-800 dark:text-white text-center">{t.evolutions}</h3>
                <div className="bg-gray-50 dark:bg-dark-card p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex justify-center overflow-x-auto">
                    <EvolutionNodeRenderer node={evolutionTree} />
                </div>
            </div>
        )}

        {/* 2. ADVERTISEMENT BLOCK (Below Evolutions, Horizontal) */}
        <div className="w-full max-w-4xl mx-auto mb-16">
            <div className="bg-gray-50 dark:bg-dark-card/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                 <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 block text-center">Advertisement</span>
                 <AdSense format="horizontal" className="min-h-[100px]" slot="7629704157" />
            </div>
        </div>

      </div>
    </div>
  );
};

export default PokemonDetails;