import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, RefreshCw, Gem, Heart, Sparkles, MousePointerClick, Sun, Moon, CloudRain, MapPin } from 'lucide-react';
import { EvolutionDetail } from '../types';
import { useGlobal } from '../context/GlobalContext';
import { artworkUrl, formatName, SPRITE_BASE } from '../utils/pokemon';

// Recursive type for branching evolutions
export interface ChainNode {
  name: string;
  id: number;
  evolutionDetails: EvolutionDetail[];
  children: ChainNode[];
}

interface LinearChainProps {
  node: ChainNode;
  selectedBranches: Record<number, number>;
  onSelectBranch: (parentId: number, childId: number) => void;
  isShiny: boolean;
  currentSpeciesId: number;
}

const EvolutionTriggerBadge: React.FC<{ details: EvolutionDetail[] }> = ({ details }) => {
  const { t } = useGlobal();
  if (!details || details.length === 0) return null;
  const d = details[0]; // Primary trigger

  return (
      <div className="relative group flex flex-col items-center justify-center gap-1 z-20">
          {/* Main Trigger Icon - Floating Bubble with Animation */}
          <div className={`
              p-2 rounded-full border shadow-lg relative transition-all duration-300
              bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-200 
              ring-2 ring-blue-300/50 dark:ring-blue-600/50 shadow-blue-500/30
              group-hover:scale-110 group-hover:ring-4
          `}>
              {d.trigger.name === 'trade' && <RefreshCw size={16} className="animate-spin-slow" />}
              {d.trigger.name === 'level-up' && !d.min_happiness && !d.min_beauty && <Zap size={16} className="fill-current animate-pulse" />}
              {(d.min_happiness || d.min_beauty || d.min_affection) && <Heart size={16} className="text-pink-500 fill-current animate-bounce" />}
              {d.item && <Gem size={16} className="text-blue-500 animate-pulse" />}
              {d.trigger.name === 'shed' && <Sparkles size={16} className="animate-spin" />}
              
              {/* Fallback for others */}
              {['trade', 'level-up', 'use-item', 'shed'].indexOf(d.trigger.name) === -1 && !d.min_happiness && <ArrowRight size={16} />}
          </div>

          {/* Tooltip with Backdrop */}
          <div className={`
              absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-300 pointer-events-none transform translate-y-2 group-hover:translate-y-0
              flex flex-col items-center text-[10px] font-bold px-3 py-2 rounded-lg backdrop-blur-md border shadow-xl min-w-[80px] z-50
              bg-blue-50/95 dark:bg-gray-800/95 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700
          `}>
              {d.min_level && <span>{t.lvl} {d.min_level}</span>}
              {d.item && <span className="text-indigo-600 dark:text-indigo-300">{formatName(d.item.name)}</span>}
              {d.trigger.name === 'trade' && <span>{t.trade}</span>}
              {d.held_item && <span className="whitespace-nowrap">{t.hold} {formatName(d.held_item.name)}</span>}
              {d.min_happiness && <span>{t.happy}</span>}
              {d.time_of_day && <span className="capitalize flex items-center gap-1">{d.time_of_day === 'day' ? <Sun size={10}/> : <Moon size={10}/>} {d.time_of_day}</span>}
              {d.location && <span className="truncate max-w-[100px] flex items-center gap-1"><MapPin size={10}/> {formatName(d.location.name)}</span>}
              {d.known_move && <span>{t.move}: {formatName(d.known_move.name)}</span>}
              {d.needs_overworld_rain && <span className="flex items-center gap-1"><CloudRain size={10}/> {t.rain}</span>}

              {/* Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-50/95 dark:bg-gray-800/95 border-r border-b border-blue-200 dark:border-blue-700 rotate-45"></div>
          </div>
      </div>
  );
};

const EvolutionNodeCard: React.FC<{ node: ChainNode; isShiny: boolean; currentSpeciesId: number; isSelected?: boolean; onClick?: () => void }> = ({ node, isShiny, currentSpeciesId, isSelected = false, onClick }) => {
  const nodeSpriteUrl = artworkUrl(node.id, isShiny);
  
  // The tree nodes use Species IDs, so we compare against the species of the page Pokemon
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
                  absolute -bottom-1 text-[9px] px-2 py-0.5 rounded-full font-mono shadow-xs transition-colors
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
  const { t } = useGlobal();
  return (
      <div className="flex flex-col items-center my-6 w-full animate-fade-in">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700 shadow-xs">
              <MousePointerClick size={12} className="text-blue-500 animate-bounce" /> {t.selectEvolutionPath}
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
                              src={`${SPRITE_BASE}/${opt.id}.png`}
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
export const LinearEvolutionChain: React.FC<LinearChainProps> = ({ node, selectedBranches, onSelectBranch, isShiny, currentSpeciesId }) => {
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
  const handleBranchSelect = (childId: number) => onSelectBranch(node.id, childId);

  // Animated Line Classes
  const activeLineClassH = "bg-linear-to-r from-blue-300 via-blue-500 to-blue-300 bg-[length:200%_100%] animate-flow-h h-1 shadow-[0_0_10px_rgba(59,130,246,0.6)]";
  const activeLineClassV = "bg-linear-to-b from-blue-300 via-blue-500 to-blue-300 bg-[length:100%_200%] animate-flow-v w-1 shadow-[0_0_10px_rgba(59,130,246,0.6)]";

  return (
      <div className="flex flex-col md:flex-row items-center">
          {/* 1. Current Node */}
          <Link to={`/pokemon/${node.id}`}>
               <EvolutionNodeCard node={node} isShiny={isShiny} currentSpeciesId={currentSpeciesId} />
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
                       <div className="relative z-10 bg-white/50 dark:bg-black/50 backdrop-blur-xs p-1 rounded-xl">
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
                   <LinearEvolutionChain
                      node={selectedChild}
                      selectedBranches={selectedBranches}
                      onSelectBranch={onSelectBranch}
                      isShiny={isShiny}
                      currentSpeciesId={currentSpeciesId}
                   />
              </div>
          )}
      </div>
  );
};
