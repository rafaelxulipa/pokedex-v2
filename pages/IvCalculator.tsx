import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Search, Plus, X } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';
import { fetchAllPokemonNames, fetchPokemonDetails, pokemonUrl } from '../services/pokeApi';
import { PokemonDetail, PokemonListEntry } from '../types';
import { formatName, idFromUrl, SPRITE_BASE } from '../utils/pokemon';
import { findNature, MAX_EV, MAX_IV, narrowIvs, NATURES, Observation, STAT_KEYS, StatKey } from '../utils/ivCalc';
import Loader from '../components/Loader';

const MAX_RESULTS = 12;
const MAX_ENTRIES = 4;

interface Entry {
  level: string;
  stats: string[]; // one per stat, as typed
  evs: string[];
}

const emptyEntry = (level = '50'): Entry => ({
  level,
  stats: STAT_KEYS.map(() => ''),
  evs: STAT_KEYS.map(() => '0'),
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const inputClass =
  'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50';

const IvCalculator: React.FC = () => {
  const { t, localName } = useGlobal();
  const [searchParams] = useSearchParams();
  const [allNames, setAllNames] = useState<PokemonListEntry[]>([]);
  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nature, setNature] = useState(() => findNature(searchParams.get('nature')).key);
  const [entries, setEntries] = useState<Entry[]>(() => {
    const level = parseInt(searchParams.get('level') ?? '', 10);
    return [emptyEntry(Number.isInteger(level) ? String(clamp(level, 1, 100)) : '50')];
  });

  useEffect(() => {
    let cancelled = false;
    fetchAllPokemonNames().then((list) => !cancelled && setAllNames(list));
    return () => {
      cancelled = true;
    };
  }, []);

  const [selected, setSelected] = useState<string>(() => searchParams.get('pokemon') || '1');
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPokemonDetails(pokemonUrl(selected)).then((data) => {
      if (cancelled) return;
      if (data) setPokemon(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, '');
    if (!term) return [];
    const isNumeric = /^\d+$/.test(term);
    return allNames
      .filter((p) => (isNumeric ? idFromUrl(p.url) === parseInt(term, 10) : p.name.includes(term)))
      .slice(0, MAX_RESULTS);
  }, [search, allNames]);

  const natureData = findNature(nature);
  const shedinja = pokemon?.name === 'shedinja';
  const baseOf = (stat: StatKey) => pokemon?.stats.find((s) => s.stat.name === stat)?.base_stat ?? 0;

  const setEntry = (index: number, patch: (e: Entry) => Entry) =>
    setEntries((prev) => prev.map((e, i) => (i === index ? patch(e) : e)));

  const rows = STAT_KEYS.map((stat, i) => {
    const observations: Observation[] = entries
      .map((e) => ({ level: parseInt(e.level, 10), stat: parseInt(e.stats[i], 10), ev: parseInt(e.evs[i], 10) || 0 }))
      .filter((o) => Number.isInteger(o.level) && o.level >= 1 && o.level <= 100 && Number.isInteger(o.stat) && o.stat > 0)
      .map((o) => ({ ...o, ev: clamp(o.ev, 0, MAX_EV) }));
    const skip = stat === 'hp' && shedinja;
    const ivs = pokemon && !skip ? narrowIvs(stat, baseOf(stat), observations, natureData, shedinja) : null;
    return { stat, ivs, skip };
  });

  const modLabel = (stat: StatKey) =>
    natureData.up === natureData.down ? '' : stat === natureData.up ? '+' : stat === natureData.down ? '-' : '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <Calculator className="mx-auto h-16 w-16 mb-4 text-purple-500" />
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">{t.ivCalc.title}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t.ivCalc.subtitle}</p>
      </div>

      {/* Pokemon and nature */}
      <div className="mb-6 bg-white dark:bg-dark-card p-4 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.ivCalc.search}
                className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>
          <label className="block">
            <span className="block text-xs font-bold uppercase text-gray-400 mb-1">{t.ivCalc.nature}</span>
            <select value={nature} onChange={(e) => setNature(e.target.value as typeof nature)} className={inputClass}>
              {NATURES.map((n) => (
                <option key={n.key} value={n.key}>
                  {t.ivCalc.natures[n.key]}
                  {n.up === n.down ? ` (${t.ivCalc.neutral})` : ` (+${t.stats[n.up]} / -${t.stats[n.down]})`}
                </option>
              ))}
            </select>
          </label>
        </div>

        {search.trim() && allNames.length === 0 && <Loader size="md" />}
        {results.length > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {results.map((p) => {
              const id = idFromUrl(p.url);
              return (
                <button
                  key={p.name}
                  onClick={() => {
                    setSelected(String(id));
                    setSearch('');
                  }}
                  className="flex flex-col items-center p-2 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-purple-500 transition-all"
                >
                  <img src={`${SPRITE_BASE}/${id}.png`} alt="" loading="lazy" className="w-14 h-14 object-contain" />
                  <span className="text-xs font-semibold capitalize text-gray-600 dark:text-gray-300 truncate max-w-full">{formatName(p.name)}</span>
                </button>
              );
            })}
          </div>
        )}

        {pokemon && (
          <div className="mt-4 flex items-center gap-3">
            <img src={`${SPRITE_BASE}/${pokemon.id}.png`} alt="" className="w-16 h-16 object-contain" />
            <div>
              <div className="font-bold text-lg text-gray-800 dark:text-white">{localName(pokemon)}</div>
              <div className="text-xs text-gray-400">#{pokemon.id}</div>
            </div>
            {loading && <Loader />}
          </div>
        )}
      </div>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t.ivCalc.hint}</p>
      {shedinja && <p className="mb-4 text-sm text-yellow-600 dark:text-yellow-400">{t.ivCalc.shedinja}</p>}

      {/* Level entries */}
      <div className="space-y-4 mb-6">
        {entries.map((entry, index) => (
          <div key={index} className="bg-white dark:bg-dark-card p-4 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="font-bold text-gray-700 dark:text-gray-200">{t.ivCalc.entry.replace('{n}', String(index + 1))}</span>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase text-gray-400" htmlFor={`level-${index}`}>{t.ivCalc.level}</label>
                <input
                  id={`level-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={entry.level}
                  onChange={(e) => setEntry(index, (en) => ({ ...en, level: e.target.value }))}
                  className={`${inputClass} w-24`}
                />
                {entries.length > 1 && (
                  <button
                    onClick={() => setEntries((prev) => prev.filter((_, i) => i !== index))}
                    className="p-2 text-gray-400 hover:text-red-500"
                    title={t.ivCalc.remove}
                    aria-label={t.ivCalc.remove}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_5rem_7rem_7rem] gap-x-3 gap-y-2 items-center text-sm">
              <span />
              <span className="hidden sm:block text-xs font-bold uppercase text-gray-400 text-center">{t.ivCalc.base}</span>
              <span className="text-xs font-bold uppercase text-gray-400">{t.ivCalc.observed}</span>
              <span className="text-xs font-bold uppercase text-gray-400">{t.ivCalc.ev}</span>
              {STAT_KEYS.map((stat, i) => (
                <React.Fragment key={stat}>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {t.stats[stat]}
                    {modLabel(stat) && (
                      <span className={`ml-1 font-bold ${modLabel(stat) === '+' ? 'text-red-500' : 'text-blue-500'}`}>{modLabel(stat)}</span>
                    )}
                  </span>
                  <span className="hidden sm:block text-center text-gray-500">{pokemon ? baseOf(stat) : '-'}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={entry.stats[i]}
                    disabled={stat === 'hp' && shedinja}
                    aria-label={`${t.stats[stat]} ${t.ivCalc.observed}`}
                    onChange={(e) => setEntry(index, (en) => ({ ...en, stats: en.stats.map((v, j) => (j === i ? e.target.value : v)) }))}
                    className={`${inputClass} w-full disabled:opacity-40`}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_EV}
                    value={entry.evs[i]}
                    aria-label={`${t.stats[stat]} ${t.ivCalc.ev}`}
                    onChange={(e) => setEntry(index, (en) => ({ ...en, evs: en.evs.map((v, j) => (j === i ? e.target.value : v)) }))}
                    className={`${inputClass} w-full`}
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
        {entries.length < MAX_ENTRIES && (
          <button
            onClick={() => setEntries((prev) => [...prev, emptyEntry(String(Math.min(100, (parseInt(prev[prev.length - 1].level, 10) || 49) + 1)))])}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          >
            <Plus size={16} /> {t.ivCalc.addLevel}
          </button>
        )}
      </div>

      {/* Result */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t.ivCalc.result}</h2>
        <div className="space-y-3">
          {rows.map(({ stat, ivs, skip }) => {
            const min = ivs && ivs.length ? ivs[0] : 0;
            const max = ivs && ivs.length ? ivs[ivs.length - 1] : 0;
            return (
              <div key={stat}>
                <div className="flex items-baseline justify-between text-sm mb-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t.stats[stat]}</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {skip || ivs === null ? (
                      <span className="font-normal text-gray-400">-</span>
                    ) : ivs.length === 0 ? (
                      <span className="font-normal text-red-500">{t.ivCalc.impossible}</span>
                    ) : min === max ? (
                      <>
                        {min}
                        {min === MAX_IV && <span className="ml-2 text-green-500">{t.ivCalc.perfect}</span>}
                      </>
                    ) : (
                      `${min} - ${max}`
                    )}
                  </span>
                </div>
                <div className="relative h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {ivs && ivs.length > 0 && (
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-purple-500"
                      style={{ left: `${(min / MAX_IV) * 100}%`, width: `${((max - min) / MAX_IV) * 100 || 2}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IvCalculator;
