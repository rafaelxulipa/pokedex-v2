
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ruler, Weight, Sparkles, Heart, Scale, ChevronLeft, ChevronRight, Layers, CloudLightning, Users } from 'lucide-react';
import { fetchPokemonDetails, fetchPokemonSpecies, fetchEvolutionChain, fetchTypeDetails, pokemonUrl } from '../services/pokeApi';
import { PokemonDetail, PokemonSpecies, EvolutionNode } from '../types';
import { TYPE_COLORS } from '../constants';
import TypeBadge from '../components/TypeBadge';
import StatChart from '../components/StatChart';
import Loader from '../components/Loader';
import AdSense from '../components/AdSense';
import AbilitiesSection from '../components/AbilitiesSection';
import MovesSection from '../components/MovesSection';
import { LinearEvolutionChain, ChainNode } from '../components/EvolutionChain';
import { useGlobal, MAX_TEAM } from '../context/GlobalContext';
import { defensiveMultipliers } from '../utils/typeChart';
import { idFromUrl, SPRITE_BASE, MAX_POKEMON_ID } from '../utils/pokemon';

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
  const { t, localName, language, favorites, toggleFavorite, comparisonList, toggleComparison, setComparison, team, toggleTeamMember, isShinyMode: globalShinyMode, shinyPokemon, toggleShinyPokemon } = useGlobal();

  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [evolutionTree, setEvolutionTree] = useState<ChainNode | null>(null);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [resistances, setResistances] = useState<string[]>([]);
  const [immunities, setImmunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track which branch is selected for parents with multiple children
  // Key: Parent ID, Value: Selected Child ID
  const [selectedBranches, setSelectedBranches] = useState<Record<number, number>>({});
  const formsScrollRef = useRef<HTMLDivElement>(null);

  const isLocalShiny = pokemon ? shinyPokemon.includes(pokemon.id) : false;
  const isShiny = globalShinyMode || isLocalShiny;

  const handleFormsScroll = (direction: 'left' | 'right') => {
    if (formsScrollRef.current) {
        const scrollAmount = 300;
        formsScrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    }
  };

  // Formatter for Variety Names (Mega, Gmax, etc)
  const formatVarietyName = (name: string, speciesName: string) => {
    let clean = name.replace(speciesName, '').replace(/-/g, ' ').trim();
    
    // Handle specific prefixes/suffixes
    if (clean.includes('mega')) return `Mega ${speciesName} ${clean.replace('mega', '').trim()}`;
    if (clean.includes('gmax')) return `Gigantamax ${speciesName}`;
    if (clean.includes('eternamax')) return `Eternamax ${speciesName}`;
    if (clean.includes('alola')) return `Alolan ${speciesName}`;
    if (clean.includes('galar')) return `Galarian ${speciesName}`;
    if (clean.includes('hisui')) return `Hisuian ${speciesName}`;
    if (clean.includes('paldea')) return `Paldean ${speciesName}`;
    if (clean === '') return t.defaultForm;
    
    return `${speciesName} (${clean})`;
  };

  const parseEvolutions = (node: EvolutionNode): ChainNode => {
    const speciesId = idFromUrl(node.species.url);

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
    let cancelled = false;

    const load = async () => {
      if (!id) return;
      setLoading(true);
      setPokemon(null);
      setSpecies(null);
      setEvolutionTree(null);

      try {
        const data = await fetchPokemonDetails(pokemonUrl(id));
        if (cancelled) return;
        if (!data) {
          setLoading(false);
          return;
        }
        setPokemon(data);

        // Species of the page Pokemon (also correct for alternate forms)
        const correctSpecies = await fetchPokemonSpecies(data.species.url);
        if (cancelled) return;
        setSpecies(correctSpecies);

        // Type matchups
        const typeDetails = await Promise.all(data.types.map((ty) => fetchTypeDetails(ty.type.url)));
        if (cancelled) return;
        const damageMap = defensiveMultipliers(typeDetails);
        const entries = Object.entries(damageMap);
        setWeaknesses(entries.filter(([, m]) => m > 1).map(([name]) => name));
        setResistances(entries.filter(([, m]) => m > 0 && m < 1).map(([name]) => name));
        setImmunities(entries.filter(([, m]) => m === 0).map(([name]) => name));

        if (correctSpecies?.evolution_chain?.url) {
          const evoData = await fetchEvolutionChain(correctSpecies.evolution_chain.url);
          if (cancelled) return;
          if (evoData) {
            const tree = parseEvolutions(evoData.chain);
            setEvolutionTree(tree);

            // Auto-select the path that leads to the current Pokemon
            const path = findPathToId(tree, idFromUrl(data.species.url));
            if (path && path.length > 0) {
              const newSelections: Record<number, number> = {};
              let currentNode = tree;
              for (let i = 0; i < path.length - 1; i++) {
                const childNode = currentNode.children.find((c) => c.id === path[i + 1]);
                if (!childNode) break;
                newSelections[path[i]] = path[i + 1];
                currentNode = childNode;
              }
              setSelectedBranches((prev) => ({ ...prev, ...newSelections }));
            }
          }
        }
      } catch (error) {
        console.error('Error loading Pokemon page:', error);
      } finally {
        // Never leave the page stuck on the loader
        if (!cancelled) setLoading(false);
      }
    };

    load();
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  if (!pokemon) return <div className="text-center mt-20">{t.noPokemonFound}</div>;

  const isFavorite = favorites.includes(pokemon.id);
  const isComparing = comparisonList.includes(pokemon.id);
  const mainType = pokemon.types[0].type.name;
  const bgColorClass = TYPE_COLORS[mainType] || 'bg-gray-500';

  // PokeAPI has no pt-br texts for most species, so Portuguese falls back to English
  const apiLangMap: Record<string, string> = { pt: 'pt-br', zh: 'zh-Hans', ja: 'ja' };
  const targetLang = apiLangMap[language] || language;

  const getFlavorText = () => {
    if (!species) return '';
    const entry =
      species.flavor_text_entries.find((e) => e.language.name === targetLang) ||
      species.flavor_text_entries.find((e) => e.language.name === 'en');
    return entry ? entry.flavor_text.replace(/[\n\f]/g, ' ') : t.noDescription;
  };
  const description = getFlavorText();
  const genus = (
    species?.genera.find((g) => g.language.name === targetLang) || species?.genera.find((g) => g.language.name === 'en')
  )?.genus;

  const getGenderRatio = () => {
    if (!species) return null;
    if (species.gender_rate === -1) return { label: t.genderless, male: 0, female: 0 };
    const femalePct = (species.gender_rate / 8) * 100;
    return { male: 100 - femalePct, female: femalePct };
  };
  const genderData = getGenderRatio();
  // Alternate forms have ids above 10000, so prev/next walk through the species number instead
  const baseId = idFromUrl(pokemon.species.url) || numericId;
  const currentSpeciesId = baseId;
  const prevId = baseId > 1 ? baseId - 1 : null;
  const nextId = baseId < MAX_POKEMON_ID ? baseId + 1 : null;
  const isInTeam = team.includes(pokemon.id);

  // Species ids along the selected evolution path (root -> ... ), used by "compare evolution line"
  const evolutionLineIds: number[] = [];
  if (evolutionTree) {
    let node: ChainNode | undefined = evolutionTree;
    while (node) {
      evolutionLineIds.push(node.id);
      const nextId: number | undefined = node.children.length === 1 ? node.children[0].id : selectedBranches[node.id];
      node = node.children.find((c) => c.id === nextId);
    }
  }

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
            className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-3">
             <button 
                onClick={() => toggleComparison(pokemon.id)}
                className={`p-2 rounded-full backdrop-blur-xs transition ${isComparing ? 'bg-white text-blue-500' : 'bg-white/20 text-white hover:bg-white/40'}`}
                title={t.compare}
              >
                <Scale size={20} fill={isComparing ? "currentColor" : "none"} />
            </button>
            <button 
                onClick={() => toggleFavorite(pokemon.id)}
                className={`p-2 rounded-full backdrop-blur-xs transition ${isFavorite ? 'bg-white text-red-500' : 'bg-white/20 text-white hover:bg-white/40'}`}
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
                {localName(pokemon)} 
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
                <div className="bg-gray-50 dark:bg-dark-card p-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
                    <h3 className={`text-xl font-bold mb-4 ${pokemon.types[0].type.name === 'dark' ? 'text-gray-700 dark:text-gray-300' : 'text-' + mainType.replace('bg-', '') + '-600'}`}>
                        {t.about}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 italic">
                        "{description}"
                    </p>

                    {/* Dimensions & Ability */}
                    <div className="grid grid-cols-3 gap-3 mb-2">
                        <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs">
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                                <Weight size={14} /> {t.weight}
                            </div>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold text-sm">{pokemon.weight / 10} kg</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs">
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                                <Ruler size={14} /> {t.height}
                            </div>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold text-sm">{pokemon.height / 10} m</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs">
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
                        <div className="bg-white dark:bg-dark-card p-5 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
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

                    {/* Weaknesses / Resistances / Immunities */}
                {[
                    { label: t.weaknesses, list: weaknesses },
                    { label: t.resistances, list: resistances },
                    { label: t.immunities, list: immunities },
                ].map(({ label, list }) => (
                    <div key={label} className="bg-white dark:bg-dark-card p-5 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
                         <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{label}</h4>
                         <div className="flex flex-wrap gap-2">
                            {list.length > 0 ? (
                                list.map(type => (
                                    <TypeBadge key={type} type={type} size="sm" />
                                ))
                            ) : (
                                <span className="text-gray-400 text-sm">{t.none}</span>
                            )}
                         </div>
                    </div>
                ))}
                </div>
            </div>

            {/* Right Column: Base Stats Chart */}
            <div className="bg-gray-50 dark:bg-dark-card p-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800 h-full flex flex-col">
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{t.baseStats}</h3>
                <div className="w-full flex items-center justify-center mb-6">
                    <StatChart stats={pokemon.stats} primaryType={mainType} />
                </div>
                
                {/* 1. ADVERTISEMENT BLOCK (Inside Stats Card) */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 block text-center">{t.advertisement}</span>
                    <AdSense format="auto" className="min-h-[250px]" slot="8207137273" />
                </div>
            </div>
        </div>

        {/* Abilities and moves */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 items-start">
            <AbilitiesSection abilities={pokemon.abilities} />
            <MovesSection moves={pokemon.moves} />
        </div>

        {/* Linear Evolution Flow */}
        {evolutionTree && (
            <div className="mb-12">
                <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white text-center">{t.evolutions}</h3>
                {evolutionLineIds.length > 1 && (
                    <div className="flex justify-center mb-8">
                        <button
                            onClick={() => { setComparison(evolutionLineIds); navigate('/compare'); }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                            <Scale size={16} /> {t.compareEvolutions}
                        </button>
                    </div>
                )}
                <div className="bg-gray-50 dark:bg-dark-card/50 p-8 rounded-3xl shadow-inner border border-gray-100 dark:border-gray-800 overflow-hidden">
                     <div className="flex flex-col items-center justify-center w-full">
                        <LinearEvolutionChain
                            node={evolutionTree}
                            selectedBranches={selectedBranches}
                            onSelectBranch={(parentId, childId) => setSelectedBranches((prev) => ({ ...prev, [parentId]: childId }))}
                            isShiny={isShiny}
                            currentSpeciesId={currentSpeciesId}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Alternate Forms Section */}
        {species && species.varieties && species.varieties.length > 1 && (
             <div className="mb-12 animate-fade-in-up">
                <div className="flex items-center justify-center gap-2 mb-8">
                     <Layers className="text-blue-500" size={28} />
                     <h3 className="text-2xl font-bold text-gray-800 dark:text-white text-center">{t.alternateForms}</h3>
                </div>
                
                <div className="bg-white dark:bg-dark-card py-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden relative group">
                    <button 
                        onClick={() => handleFormsScroll('left')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/50 dark:bg-black/50 backdrop-blur-xs rounded-full m-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center text-gray-700 dark:text-gray-300 hover:scale-110"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    
                    <div ref={formsScrollRef} className="flex overflow-x-auto px-6 pb-4 pt-2 gap-4 no-scrollbar">
                        {species.varieties.map((variety) => {
                             const vId = idFromUrl(variety.pokemon.url);
                             const isCurrent = vId === pokemon.id;
                             
                             // Detect specific G-MAX or ETERNAMAX forms for styling
                             const isGmax = variety.pokemon.name.includes('-gmax');
                             const isEternamax = variety.pokemon.name.includes('-eternamax');
                             const isDynamaxForm = isGmax || isEternamax;

                             return (
                                <button
                                    key={vId}
                                    onClick={() => navigate(`/pokemon/${vId}`)}
                                    className={`
                                        shrink-0 flex flex-col items-center w-36 p-3 rounded-2xl transition-all duration-300 border relative overflow-hidden
                                        ${isCurrent 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 scale-105 shadow-md' 
                                            : isDynamaxForm 
                                                ? 'bg-pink-50 dark:bg-pink-900/10 border-pink-300 dark:border-pink-800 hover:bg-pink-100 dark:hover:bg-pink-900/30' 
                                                : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    {/* Gigantamax/Eternamax Badge */}
                                    {isDynamaxForm && (
                                        <div className="absolute top-0 right-0 p-1.5 z-10">
                                             <div className="bg-pink-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                                                <CloudLightning size={10} fill="currentColor" />
                                                {isGmax ? 'G-MAX' : 'DYNA'}
                                             </div>
                                        </div>
                                    )}

                                    <div className="w-20 h-20 mb-2">
                                        <img 
                                            src={isShiny 
                                                ? `${SPRITE_BASE}/shiny/${vId}.png`
                                                : `${SPRITE_BASE}/${vId}.png`
                                            }
                                            alt={variety.pokemon.name}
                                            className={`w-full h-full object-contain ${isDynamaxForm ? 'drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]' : ''}`}
                                            loading="lazy"
                                        />
                                    </div>
                                    <span className={`text-xs text-center font-bold capitalize leading-tight ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isDynamaxForm ? 'text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {formatVarietyName(variety.pokemon.name, species.name)}
                                    </span>
                                    {variety.is_default && (
                                        <span className="mt-1 text-[9px] uppercase tracking-wider bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-sm text-gray-500">{t.default}</span>
                                    )}
                                </button>
                             );
                        })}
                    </div>

                     <button 
                        onClick={() => handleFormsScroll('right')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/50 dark:bg-black/50 backdrop-blur-xs rounded-full m-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center text-gray-700 dark:text-gray-300 hover:scale-110"
                        aria-label="Scroll right"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
             </div>
        )}

        {/* 2. ADVERTISEMENT BLOCK (Below Evolutions/Forms, Horizontal) */}
        <div className="w-full max-w-4xl mx-auto mb-16">
            <div className="bg-gray-50 dark:bg-dark-card/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                 <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 block text-center">{t.advertisement}</span>
                 <AdSense format="horizontal" className="min-h-[100px]" slot="7629704157" />
            </div>
        </div>

      </div>
    </div>
  );
};

export default PokemonDetails;