import React, { useEffect, useState } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { fetchMultiplePokemon } from '../services/pokeApi';
import { PokemonDetail } from '../types';
import Loader from '../components/Loader';
import StatChart from '../components/StatChart';
import TypeBadge from '../components/TypeBadge';
import { ArrowLeft, Scale, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdSense from '../components/AdSense';

const Compare: React.FC = () => {
  const { comparisonList, t, toggleComparison } = useGlobal();
  const navigate = useNavigate();

  const [pokemons, setPokemons] = useState<PokemonDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        if (comparisonList.length > 0) {
            // Re-fetch details to ensure we have fresh data or if we navigated directly
            const urls = comparisonList.map(id => `https://pokeapi.co/api/v2/pokemon/${id}`);
            const data = await fetchMultiplePokemon(urls);
            setPokemons(data);
        } else {
            setPokemons([]);
        }
        setLoading(false);
    };
    load();
  }, [comparisonList]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  if (pokemons.length === 0) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-gray-300 p-4 text-center">
            <Scale className="w-16 h-16 mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">{t.emptyComparison}</h2>
            <button onClick={() => navigate('/')} className="text-blue-500 hover:underline">{t.goBackHome}</button>
        </div>
    );
  }

  const p1 = pokemons[0];
  const p2 = pokemons[1]; // Might be undefined if only 1 selected

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white pb-20 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
           <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-500">
              <ArrowLeft size={20} />
              <span className="font-medium">{t.back}</span>
           </button>
           <h1 className="text-lg font-bold">{t.comparisonTitle}</h1>
           <div className="w-8"></div> {/* Spacer */}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {!p2 ? (
            <div className="text-center py-10 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
                {t.selectTwo}
            </div>
        ) : (
            <div className="space-y-8">
                
                {/* Visual Header */}
                <div className="grid grid-cols-2 gap-4 md:gap-12 relative">
                    {/* VS Badge */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white font-black text-xl w-12 h-12 rounded-full flex items-center justify-center border-4 border-white dark:border-dark-bg z-10 shadow-lg">
                        VS
                    </div>

                    {[p1, p2].map((p, idx) => (
                        <div key={p.id} className="flex flex-col items-center bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative">
                             <button 
                                onClick={() => toggleComparison(p.id)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                            >
                                <XCircle size={20} />
                            </button>
                            
                            <img 
                                src={p.sprites.other['official-artwork'].front_default} 
                                alt={p.name}
                                className="w-32 h-32 md:w-48 md:h-48 object-contain mb-4 filter drop-shadow-lg"
                            />
                            <h2 className="text-xl md:text-2xl font-bold capitalize mb-2">{p.name}</h2>
                            <div className="flex gap-1">
                                {p.types.map(t => <TypeBadge key={t.slot} type={t.type.name} />)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats Chart Comparison */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-bold mb-6 text-center">{t.baseStats}</h3>
                    {/* Explicitly defined height container for chart */}
                    <div className="w-full max-w-2xl mx-auto h-[350px]">
                        <StatChart 
                            stats={p1.stats} 
                            compareStats={p2.stats} 
                            name1={p1.name} 
                            name2={p2.name} 
                        />
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-800/50 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="text-center">{p1.name}</div>
                        <div className="text-center">Attribute</div>
                        <div className="text-center">{p2.name}</div>
                    </div>
                    
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                         {/* Height */}
                         <div className="grid grid-cols-3 py-4">
                            <div className="text-center font-medium">{p1.height / 10} m</div>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">{t.height}</div>
                            <div className="text-center font-medium">{p2.height / 10} m</div>
                        </div>
                        {/* Weight */}
                        <div className="grid grid-cols-3 py-4">
                            <div className="text-center font-medium">{p1.weight / 10} kg</div>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">{t.weight}</div>
                            <div className="text-center font-medium">{p2.weight / 10} kg</div>
                        </div>
                        {/* Abilities */}
                        <div className="grid grid-cols-3 py-4">
                            <div className="text-center text-sm capitalize flex flex-col items-center">
                                {p1.abilities.map(a => <span key={a.slot}>{a.ability.name.replace('-', ' ')}</span>)}
                            </div>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">{t.abilities}</div>
                            <div className="text-center text-sm capitalize flex flex-col items-center">
                                {p2.abilities.map(a => <span key={a.slot}>{a.ability.name.replace('-', ' ')}</span>)}
                            </div>
                        </div>
                         {/* Total Stats */}
                         <div className="grid grid-cols-3 py-4 bg-gray-50 dark:bg-gray-800/30 font-bold">
                            <div className="text-center text-blue-600 dark:text-blue-400">
                                {p1.stats.reduce((acc, curr) => acc + curr.base_stat, 0)}
                            </div>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">Total Stats</div>
                            <div className="text-center text-red-600 dark:text-red-400">
                                {p2.stats.reduce((acc, curr) => acc + curr.base_stat, 0)}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 2. ADVERTISEMENT BLOCK (Comparison Page) */}
                <div className="w-full mt-8">
                     <div className="bg-gray-50 dark:bg-dark-card/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 block text-center">Advertisement</span>
                        <AdSense format="horizontal" className="min-h-[100px]" slot="7629704157" />
                    </div>
                </div>

            </div>
        )}
      </div>
    </div>
  );
};

export default Compare;