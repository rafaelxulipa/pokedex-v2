import React, { useEffect, useState } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { fetchMultiplePokemon } from '../services/pokeApi';
import { PokemonDetail } from '../types';
import Loader from '../components/Loader';
import { MultiStatChart, SERIES_COLORS } from '../components/StatChart';
import TypeBadge from '../components/TypeBadge';
import { ArrowLeft, Scale, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdSense from '../components/AdSense';

const Compare: React.FC = () => {
  const { comparisonList, t, toggleComparison, localName } = useGlobal();
  const navigate = useNavigate();

  const [pokemons, setPokemons] = useState<PokemonDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const columns = { gridTemplateColumns: `repeat(${pokemons.length + 1}, minmax(0, 1fr))` };
  const total = (p: PokemonDetail) => p.stats.reduce((acc, curr) => acc + curr.base_stat, 0);
  const bestTotal = Math.max(...pokemons.map(total));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white pb-20 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card shadow-xs border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
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
        {pokemons.length < 2 ? (
            <div className="text-center py-10 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
                {t.selectTwo}
            </div>
        ) : (
            <div className="space-y-8">
                {/* Visual Header */}
                <div className={`grid gap-3 md:gap-6 ${pokemons.length === 4 ? 'grid-cols-2 md:grid-cols-4' : pokemons.length === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                    {pokemons.map((p, idx) => (
                        <div key={p.id} className="flex flex-col items-center bg-white dark:bg-dark-card p-4 md:p-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800 relative">
                            <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${SERIES_COLORS[idx % SERIES_COLORS.length].bar}`}></div>
                            <button
                                onClick={() => toggleComparison(p.id)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                                aria-label={t.removeFromCompare}
                            >
                                <XCircle size={20} />
                            </button>
                            <img
                                src={p.sprites.other['official-artwork'].front_default}
                                alt={p.name}
                                className="w-28 h-28 md:w-40 md:h-40 object-contain mb-4 filter drop-shadow-lg"
                            />
                            <h2 className="text-lg md:text-xl font-bold mb-2 text-center">{localName(p)}</h2>
                            <div className="flex flex-wrap justify-center gap-1">
                                {p.types.map(ty => <TypeBadge key={ty.slot} type={ty.type.name} size="sm" />)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats Chart Comparison */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-bold mb-6 text-center">{t.baseStats}</h3>
                    <div className="w-full max-w-2xl mx-auto">
                        <MultiStatChart series={pokemons.map(p => ({ name: p.name, stats: p.stats }))} />
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-x-auto">
                  <div className="min-w-[420px]">
                    <div className="grid bg-gray-50 dark:bg-gray-800/50 text-xs md:text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 py-4 border-b border-gray-100 dark:border-gray-800" style={columns}>
                        <div className="text-center">{t.attribute}</div>
                        {pokemons.map(p => <div key={p.id} className="text-center truncate px-1">{localName(p)}</div>)}
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        <div className="grid py-4" style={columns}>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">{t.height}</div>
                            {pokemons.map(p => <div key={p.id} className="text-center font-medium">{p.height / 10} m</div>)}
                        </div>
                        <div className="grid py-4" style={columns}>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">{t.weight}</div>
                            {pokemons.map(p => <div key={p.id} className="text-center font-medium">{p.weight / 10} kg</div>)}
                        </div>
                        <div className="grid py-4" style={columns}>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">{t.abilities}</div>
                            {pokemons.map(p => (
                                <div key={p.id} className="text-center text-sm capitalize flex flex-col items-center">
                                    {p.abilities.map(a => <span key={a.slot}>{a.ability.name.replace('-', ' ')}</span>)}
                                </div>
                            ))}
                        </div>
                        <div className="grid py-4 bg-gray-50 dark:bg-gray-800/30 font-bold" style={columns}>
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center">{t.totalStats}</div>
                            {pokemons.map((p, idx) => (
                                <div key={p.id} className={`text-center ${SERIES_COLORS[idx % SERIES_COLORS.length].text}`}>
                                    {total(p)}{total(p) === bestTotal && ' \u2605'}
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
                </div>

                <div className="w-full mt-8">
                     <div className="bg-gray-50 dark:bg-dark-card/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 block text-center">{t.advertisement}</span>
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
