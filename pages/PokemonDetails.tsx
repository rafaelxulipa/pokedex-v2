import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Ruler, Weight, Sparkles, Heart, Scale, ChevronLeft, ChevronRight, ArrowRight, Zap, RefreshCw, Gem, ArrowDown, MousePointerClick, Sun, Moon, CloudRain, Clock, MapPin, Layers } from 'lucide-react';
import { fetchPokemonDetails, fetchPokemonSpecies, fetchEvolutionChain, fetchTypeDetails } from '../services/pokeApi';
import { PokemonDetail, PokemonSpecies, EvolutionNode, EvolutionDetail } from '../types';
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
  evolutionDetails: EvolutionDetail[];
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

const formatName = (name: string) => {
  return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const PokemonDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const numericId = parseInt(id || '1');
  const navigate = useNavigate();
  const { t, language, favorites, toggleFavorite, comparisonList, toggleComparison, isShinyMode: globalShinyMode, shinyPokemon, toggleShinyPokemon } = useGlobal();

  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [evolutionTree, setEvolutionTree] = useState<ChainNode | null>(null);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track which branch is selected for parents with multiple children
  // Key: Parent ID, Value: Selected Child ID
  const [selectedBranches, setSelectedBranches] = useState<Record<number, number>>({});

  const isLocalShiny = pokemon ? shinyPokemon.includes(pokemon.id) : false;
  const isShiny = globalShinyMode || isLocalShiny;

  // Formatter for Variety Names (Mega, Gmax, etc)
  const formatVarietyName = (name: string, speciesName: string) => {
    let clean = name.replace(speciesName, '').replace(/-/g, ' ').trim();
    
    // Handle specific prefixes/suffixes
    if (clean.includes('mega')) return `Mega ${speciesName} ${clean.replace('mega', '').trim()}`;
    if (clean.includes('gmax')) return `Gigantamax ${speciesName}`;
    if (clean.includes('alola')) return `Alolan ${speciesName}`;
    if (clean.includes('galar')) return `Galarian ${speciesName}`;
    if (clean.includes('hisui')) return `Hisuian ${speciesName}`;
    if (clean.includes('paldea')) return `Paldean ${speciesName}`;
    if (clean === '') return 'Default Form';
    
    return `${speciesName} (${clean})`;
  };

  const parseEvolutions = (node: EvolutionNode): ChainNode => {
    const urlParts = node.species.url.split('/');
    const speciesId = parseInt(urlParts[urlParts.length - 2]);
    
    return {
      name: node.species.name,
      id: speciesId,
      evolutionDetails: node.evolution_details,
      children: node.evolves_to.map(child => parseEvolutions(child))
    };
  };

  // Helper: Check if a node exists in a tree (to auto-select current pokemon path)
  const findPathToId = (node: ChainNode, targetId: number): number[] | null => {
    if (node.id === targetId) return [node.id];
    for (const child of node.children) {
        const path = findPathToId(child, targetId);
        if (path) return [node.id, ...path];
    }
    return null;
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const data = await fetchPokemonDetails(`https://pokeapi.co/api/v2/pokemon/${id}`);
      if (data) {
        setPokemon(data);
        const spec = await fetchPokemonSpecies(data.id);
        // Sometimes species ID differs from Pokemon ID (for variants), so we fetch species using the URL from the pokemon object is safer, 
        // but fetching via data.species.url logic is safer:
        // However, the previous logic assumed ID matches. Let's stick to fetch by ID unless we want to be 100% robust against edge cases where ID mismatches.
        // For forms, `data.species.url` is the source of truth.
        let correctSpecies = spec;
        
        // If the ID passed was a variant ID (e.g., 10034 for Mega Venusaur), `fetchPokemonSpecies` above might fail or return wrong one if using ID directly.
        // Actually, fetchPokemonDetails returns `species: { name, url }`. Let's use that URL.
        const speciesUrl = data.species?.url;
        if (speciesUrl) {
            const speciesRes = await fetch(speciesUrl);
            correctSpecies = await speciesRes.json();
        }
        
        setSpecies(correctSpecies);
        
        if (correctSpecies?.evolution_chain?.url) {
          const evoData = await fetchEvolutionChain(correctSpecies.evolution_chain.url);
          if (evoData) {
            const tree = parseEvolutions(evoData.chain);
            setEvolutionTree(tree);

            // Auto-select path logic needs to look for the SPECIES ID in the tree, not necessarily the VARIANT ID
            // The evolution tree uses Species IDs.
            const urlParts = data.species.url.split('/');
            const currentSpeciesId = parseInt(urlParts[urlParts.length - 2]);

            const path = findPathToId(tree, currentSpeciesId);
            if (path && path.length > 0) {
                const newSelections: Record<number, number> = {};
                let currentNode = tree;
                for (let i = 0; i < path.length - 1; i++) {
                    const currentId = path[i];
                    const nextId = path[i+1];
                    const childNode = currentNode.children.find(c => c.id === nextId);
                    if (childNode) {
                        newSelections[currentId] = nextId;
                        currentNode = childNode;
                    }
                }
                setSelectedBranches(prev => ({...prev, ...newSelections}));
            }
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

  // --- RESTORED VISUAL BADGES ---

  const EvolutionTriggerBadge: React.FC<{ details: EvolutionDetail[] }> = ({ details }) => {
    if (!details || details.length === 0) return null;
    const d = details[0]; // Primary trigger

    // Use "Active" styling by default since we are in linear mode (shown path is active)
    const isActive = true;

    return (
        <div className={`flex flex-col items-center justify-center gap-1 z-20 transition-all duration-500`}>
            {/* Main Trigger Icon - Floating Bubble with Animation */}
            <div className={`
                p-2 rounded-full border shadow-lg relative group transition-all duration-300
                bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-200 
                ring-2 ring-blue-300/50 dark:ring-blue-600/50 shadow-blue-500/30
            `}>
                {d.trigger.name === 'trade' && <RefreshCw size={16} className="animate-spin-slow" />}
                {d.trigger.name === 'level-up' && !d.min_happiness && !d.min_beauty && <Zap size={16} className="fill-current animate-pulse" />}
                {(d.min_happiness || d.min_beauty || d.min_affection) && <Heart size={16} className="text-pink-500 fill-current animate-bounce" />}
                {(d.item || d.use_item) && <Gem size={16} className="text-blue-500 animate-pulse" />}
                {d.trigger.name === 'shed' && <Sparkles size={16} className="animate-spin" />}
                
                {/* Fallback for others */}
                {['trade', 'level-up', 'use-item', 'shed'].indexOf(d.trigger.name) === -1 && !d.min_happiness && <ArrowRight size={16} />}
            </div>

            {/* Detailed Labels with Backdrop */}
            <div className={`
                flex flex-col items-center text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md border transition-colors duration-500 text-center shadow-sm
                bg-blue-50/90 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700
            `}>
                {d.min_level && <span>Lvl {d.min_level}</span>}
                {d.item && <span className="text-indigo-600 dark:text-indigo-300">{formatName(d.item.name)}</span>}
                {d.use_item && <span className="text-indigo-600 dark:text-indigo-300">{formatName(d.use_item.name)}</span>}
                {d.trigger.name === 'trade' && <span>Trade</span>}
                {d.held_item && <span className="whitespace-nowrap">Hold {formatName(d.held_item.name)}</span>}
                {d.min_happiness && <span>Happy</span>}
                {d.time_of_day && <span className="capitalize flex items-center gap-1">{d.time_of_day === 'day' ? <Sun size={10}/> : <Moon size={10}/>} {d.time_of_day}</span>}
                {d.location && <span className="truncate w-full flex items-center gap-1"><MapPin size={10}/> {formatName(d.location.name)}</span>}
                {d.known_move && <span>Move: {formatName(d.known_move.name)}</span>}
                {d.needs_overworld_rain && <span className="flex items-center gap-1"><CloudRain size={10}/> Rain</span>}
            </div>
        </div>
    );
  };

  const EvolutionNodeCard: React.FC<{ node: ChainNode; isSelected?: boolean; onClick?: () => void }> = ({ node, isSelected = false, onClick }) => {
    const spriteBase = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
    const nodeSpriteUrl = isShiny 
        ? `${spriteBase}/shiny/${node.id}.png`
        : `${spriteBase}/${node.id}.png`;
    
    // Check if this is the Pokemon currently displayed on the page
    // Note: For variants, the page ID might be different from the Species ID used in tree.
    // The Tree nodes use Species IDs.
    const urlParts = pokemon?.species.url.split('/') || [];
    const currentSpeciesId = parseInt(urlParts[urlParts.length - 2]);
    const isCurrentPagePokemon = node.id === currentSpeciesId;

    return (
        <div 
            onClick={onClick}
            className={`
                relative flex flex-col items-center p-3 rounded-2xl transition-all duration-300 cursor-pointer group
                ${isCurrentPagePokemon 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105' 
                    : 'bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-1'
                }
                ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}
            `}
        >
            <div className={`
                w-24 h-24 md:w-28 md:h-28 relative mb-2 flex items-center justify-center rounded-full transition-all duration-500
                ${isCurrentPagePokemon ? 'bg-blue-100/50 dark:bg-blue-800/30' : 'group-hover:bg-gray-50 dark:group-hover:bg-gray-800'}
            `}>
                {/* BLINKING EFFECT RESTORED - The "Piscando" part */}
                {isCurrentPagePokemon && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-400 dark:border-blue-500 opacity-60 animate-ping pointer-events-none"></div>
                )}
                
                <img 
                    src={nodeSpriteUrl} 
                    alt={node.name}
                    className={`w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 ${isCurrentPagePokemon ? 'scale-110 drop-shadow-xl' : 'group-hover:scale-110'}`}
                />
                 {/* ID Pill */}
                 <span className={`
                    absolute -bottom-1 text-[9px] px-2 py-0.5 rounded-full font-mono shadow-sm transition-colors
                    ${isCurrentPagePokemon ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}
                `}>
                    #{node.id.toString().padStart(3, '0')}
                </span>
            </div>
            
            <span className={`text-sm font-bold capitalize mt-1 ${isCurrentPagePokemon ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                {node.name}
            </span>
        </div>
    );
  };

  const BranchSelector: React.FC<{ 
    options: ChainNode[]; 
    selectedId: number | undefined; 
    onSelect: (id: number) => void 
  }> = ({ options, selectedId, onSelect }) => {
    return (
        <div className="flex flex-col items-center my-6 w-full animate-fade-in">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                <MousePointerClick size={12} className="text-blue-500 animate-bounce" /> Select Evolution Path
            </span>
            <div className="flex flex-wrap justify-center gap-3 bg-white dark:bg-gray-800/40 p-3 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                {options.map((opt) => {
                     const isOptSelected = selectedId === opt.id;
                     return (
                        <button
                            key={opt.id}
                            onClick={() => onSelect(opt.id)}
                            className={`
                                relative p-2 rounded-xl transition-all duration-300 flex flex-col items-center group
                                ${isOptSelected 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 shadow-md scale-110 border border-blue-200 dark:border-blue-700' 
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 opacity-70 hover:opacity-100 grayscale hover:grayscale-0 border border-transparent'
                                }
                            `}
                            title={formatName(opt.name)}
                        >
                             <img 
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${opt.id}.png`}
                                alt={opt.name}
                                className="w-12 h-12 object-contain"
                            />
                            {/* Tiny indicator dot */}
                            {isOptSelected && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse"></div>}
                        </button>
                     )
                })}
            </div>
        </div>
    )
  };

  // Linear Flow Renderer
  const LinearEvolutionChain: React.FC<{ node: ChainNode }> = ({ node }) => {
    const children = node.children;
    const hasChildren = children.length > 0;
    
    // Determine which child to show
    let selectedChildId = selectedBranches[node.id];
    
    // Default: If only 1 child, auto-select it. 
    // If multiple, check state. If state empty, user sees selector but no next card yet.
    if (children.length === 1) {
        selectedChildId = children[0].id;
    }

    const selectedChild = children.find(c => c.id === selectedChildId);

    // Handler for selecting a branch
    const handleBranchSelect = (childId: number) => {
        setSelectedBranches(prev => ({
            ...prev,
            [node.id]: childId
        }));
    };

    // Animated Line Classes
    const activeLineClassH = "bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 bg-[length:200%_100%] animate-flow-h h-1 shadow-[0_0_10px_rgba(59,130,246,0.6)]";
    const activeLineClassV = "bg-gradient-to-b from-blue-300 via-blue-500 to-blue-300 bg-[length:100%_200%] animate-flow-v w-1 shadow-[0_0_10px_rgba(59,130,246,0.6)]";

    return (
        <div className="flex flex-col md:flex-row items-center">
            {/* 1. Current Node */}
            <Link to={`/pokemon/${node.id}`}>
                 <EvolutionNodeCard node={node} />
            </Link>

            {/* 2. Connection (Animated Lines + Rich Trigger Icons) */}
            {hasChildren && (
                <div className="flex flex-col md:flex-row items-center relative my-4 md:my-0 md:mx-6">
                     
                     {/* Desktop Connector (Horizontal) */}
                     <div className="hidden md:flex flex-col items-center justify-center w-32 relative group/line cursor-pointer" onClick={() => {}}>
                        {/* The Animated Line */}
                        <div className={`w-full ${activeLineClassH} absolute top-1/2 left-0 transform -translate-y-1/2 z-0 rounded-full group-hover/line:brightness-125 transition-all`}></div>
                        
                        {/* The Trigger Badge sitting on top */}
                        <div className="relative z-10 hover:scale-110 transition-transform duration-300">
                             {/* Pulse Glow Background for the badge */}
                             <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg animate-pulse"></div>
                             
                             {selectedChild ? (
                                <EvolutionTriggerBadge details={selectedChild.evolutionDetails} />
                             ) : (
                                // Placeholder dot if nothing selected yet (for multi-branch)
                                <div className="w-3 h-3 bg-gray-300 rounded-full animate-ping"></div>
                             )}
                        </div>
                     </div>

                     {/* Mobile Connector (Vertical) */}
                     <div className="md:hidden flex flex-col items-center h-28 relative justify-center">
                        {/* The Animated Line */}
                        <div className={`h-full ${activeLineClassV} absolute top-0 left-1/2 transform -translate-x-1/2 z-0 rounded-full`}></div>

                         {/* The Trigger Badge sitting on top */}
                         <div className="relative z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm p-1 rounded-xl">
                             <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-md animate-pulse"></div>
                             {selectedChild ? (
                                <EvolutionTriggerBadge details={selectedChild.evolutionDetails} />
                             ) : (
                                <div className="w-3 h-3 bg-gray-300 rounded-full animate-ping"></div>
                             )}
                        </div>
                     </div>
                </div>
            )}

            {/* 3. Branch Selector (If multiple children) */}
            {children.length > 1 && (
                <div className="mx-2 md:mx-4">
                    <BranchSelector 
                        options={children} 
                        selectedId={selectedChildId} 
                        onSelect={handleBranchSelect} 
                    />
                </div>
            )}

            {/* 4. Next Node (Only if selected or single) */}
            {selectedChild && (
                <div className="animate-fade-in-right">
                     <LinearEvolutionChain node={selectedChild} />
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
                onClick={() => toggleShinyPokemon(pokemon.id)}
                className={`absolute top-0 right-0 p-2 rounded-full shadow-md z-30 transition-all transform hover:scale-110 ${isLocalShiny ? 'bg-yellow-400 text-white' : 'bg-white dark:bg-dark-card text-gray-400 hover:text-yellow-400'}`}
                title="Toggle Shiny"
           >
               <Sparkles size={20} fill={isLocalShiny ? "currentColor" : "none"} />
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
                {isShiny && <Sparkles className="text-yellow-400 animate-pulse" size={32} fill="currentColor" />}
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

        {/* Linear Evolution Flow */}
        {evolutionTree && (
            <div className="mb-12">
                <h3 className="text-2xl font-bold mb-8 text-gray-800 dark:text-white text-center">{t.evolutions}</h3>
                <div className="bg-gray-50 dark:bg-dark-card/50 p-8 rounded-3xl shadow-inner border border-gray-100 dark:border-gray-800 overflow-hidden">
                     <div className="flex flex-col items-center justify-center w-full">
                        <LinearEvolutionChain node={evolutionTree} />
                    </div>
                </div>
            </div>
        )}

        {/* Alternate Forms Section */}
        {species && species.varieties && species.varieties.length > 1 && (
             <div className="mb-12 animate-fade-in-up">
                <div className="flex items-center justify-center gap-2 mb-8">
                     <Layers className="text-blue-500" size={28} />
                     <h3 className="text-2xl font-bold text-gray-800 dark:text-white text-center">Alternate Forms</h3>
                </div>
                
                <div className="bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
                        {species.varieties.map((variety) => {
                             const urlParts = variety.pokemon.url.split('/');
                             const vId = parseInt(urlParts[urlParts.length - 2]);
                             const isCurrent = vId === pokemon.id;
                             
                             return (
                                <button
                                    key={vId}
                                    onClick={() => navigate(`/pokemon/${vId}`)}
                                    className={`
                                        flex-shrink-0 flex flex-col items-center w-36 p-3 rounded-2xl transition-all duration-300 border
                                        ${isCurrent 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 scale-105 shadow-md' 
                                            : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    <div className="w-20 h-20 mb-2">
                                        <img 
                                            src={isShiny 
                                                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${vId}.png`
                                                : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${vId}.png`
                                            }
                                            alt={variety.pokemon.name}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                    <span className={`text-xs text-center font-bold capitalize leading-tight ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {formatVarietyName(variety.pokemon.name, species.name)}
                                    </span>
                                    {variety.is_default && (
                                        <span className="mt-1 text-[9px] uppercase tracking-wider bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">Default</span>
                                    )}
                                </button>
                             );
                        })}
                    </div>
                </div>
             </div>
        )}

        {/* 2. ADVERTISEMENT BLOCK (Below Evolutions/Forms, Horizontal) */}
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