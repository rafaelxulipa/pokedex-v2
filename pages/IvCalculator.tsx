import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Search, Plus, X } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';
import { fetchAllPokemonNames, fetchPokemonDetails, pokemonUrl } from '../services/pokeApi';
import { PokemonDetail, PokemonListEntry } from '../types';
import { artworkUrl, formatName, idFromUrl, SPRITE_BASE } from '../utils/pokemon';
import { findNature, MAX_EV, MAX_IV, narrowIvs, NATURES, Observation, STAT_KEYS, StatKey } from '../utils/ivCalc';
import Loader from '../components/Loader';
import TypeBadge from '../components/TypeBadge';

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
  'w-full px-3 py-2 text-center font-semibold border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50';

// Color by how good an IV is
const ivColor = (iv: number) =>
  iv >= 31 ? 'bg-emerald-500' : iv >= 26 ? 'bg-lime-500' : iv >= 16 ? 'bg-yellow-400' : iv >= 1 ? 'bg-orange-500' : 'bg-red-500';

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

  const known = rows.filter((r) => r.ivs && r.ivs.length > 0);
  const totalMin = known.reduce((sum, r) => sum + r.ivs![0], 0);
  const totalMax = known.reduce((sum, r) => sum + r.ivs![r.ivs!.length - 1], 0);
  const baseTotal = pokemon ? STAT_KEYS.reduce((sum, k) => sum + baseOf(k), 0) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 mb-3 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
          <Calculator size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">{t.ivCalc.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">{t.ivCalc.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
        {/* Inputs */}
        <div className="space-y-6">
          {/* Pokemon card */}
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 bg-linear-to-r from-purple-500/10 to-indigo-500/10 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1 min-w-0 text-center sm:text-left">
                <div className="h-40 w-40 sm:h-56 sm:w-56 shrink-0 rounded-3xl bg-white/70 dark:bg-gray-800/60 flex items-center justify-center">
                  {pokemon ? (
                    <img src={artworkUrl(pokemon.id)} alt={pokemon.name} className="h-36 w-36 sm:h-52 sm:w-52 object-contain drop-shadow-lg" />
                  ) : (
                    <Loader />
                  )}
                </div>
                {pokemon && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-400">#{pokemon.id}</div>
                    <div className="text-3xl font-extrabold text-gray-800 dark:text-white truncate">{localName(pokemon)}</div>
                    <div className="flex flex-wrap justify-center sm:justify-start mt-1">{pokemon.types.map((ty) => <TypeBadge key={ty.slot} type={ty.type.name} size="sm" />)}</div>
                  </div>
                )}
              </div>
              <div className="sm:w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.ivCalc.search}
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>
            </div>

            {search.trim() && allNames.length === 0 && <Loader size="md" />}
            {results.length > 0 && (
              <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 border-t border-gray-100 dark:border-gray-800">
                {results.map((p) => {
                  const id = idFromUrl(p.url);
                  return (
                    <button
                      key={p.name}
                      onClick={() => {
                        setSelected(String(id));
                        setSearch('');
                      }}
                      className="flex flex-col items-center p-2 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                      <img src={`${SPRITE_BASE}/${id}.png`} alt="" loading="lazy" className="w-14 h-14 object-contain" />
                      <span className="text-xs font-semibold capitalize text-gray-600 dark:text-gray-300 truncate max-w-full">{formatName(p.name)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-5 border-t border-gray-100 dark:border-gray-800">
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">{t.ivCalc.nature}</span>
                <select value={nature} onChange={(e) => setNature(e.target.value as typeof nature)} className={`${inputClass} text-left`}>
                  {NATURES.map((n) => (
                    <option key={n.key} value={n.key}>
                      {t.ivCalc.natures[n.key]}
                      {n.up === n.down ? ` (${t.ivCalc.neutral})` : ` (+${t.stats[n.up]} / -${t.stats[n.down]})`}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {natureData.up === natureData.down ? (
                  <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{t.ivCalc.neutral}</span>
                ) : (
                  <>
                    <span className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">+ {t.stats[natureData.up]}</span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">- {t.stats[natureData.down]}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">{t.ivCalc.hint}</p>
          {shedinja && <p className="text-sm text-yellow-600 dark:text-yellow-400">{t.ivCalc.shedinja}</p>}

          {/* Level entries */}
          {entries.map((entry, index) => (
            <div key={index} className="bg-white dark:bg-dark-card rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <span className="font-bold text-gray-700 dark:text-gray-200">{t.ivCalc.entry.replace('{n}', String(index + 1))}</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-400" htmlFor={`level-${index}`}>{t.ivCalc.level}</label>
                  <input
                    id={`level-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={entry.level}
                    onChange={(e) => setEntry(index, (en) => ({ ...en, level: e.target.value }))}
                    className={`${inputClass} w-20 py-1.5`}
                  />
                  {entries.length > 1 && (
                    <button
                      onClick={() => setEntries((prev) => prev.filter((_, i) => i !== index))}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title={t.ivCalc.remove}
                      aria-label={t.ivCalc.remove}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:grid-cols-[7rem_minmax(0,1fr)_6rem_6rem] gap-x-3 gap-y-3 items-center">
                  <span className="hidden sm:block" />
                  <span className="hidden sm:block text-xs font-bold uppercase tracking-wide text-gray-400">{t.ivCalc.base}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400 text-center col-start-2 sm:col-start-auto">{t.ivCalc.observed}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400 text-center">{t.ivCalc.ev}</span>
                  {STAT_KEYS.map((stat, i) => {
                    const mod = modLabel(stat);
                    return (
                      <React.Fragment key={stat}>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                          {t.stats[stat]}
                          {mod && <span className={`ml-1 font-extrabold ${mod === '+' ? 'text-red-500' : 'text-blue-500'}`}>{mod}</span>}
                        </span>
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className="h-full rounded-full bg-purple-400" style={{ width: `${Math.min(100, (baseOf(stat) / 255) * 100)}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs font-semibold text-gray-500">{pokemon ? baseOf(stat) : '-'}</span>
                        </div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={entry.stats[i]}
                          placeholder="-"
                          disabled={stat === 'hp' && shedinja}
                          aria-label={`${t.stats[stat]} ${t.ivCalc.observed}`}
                          onChange={(e) => setEntry(index, (en) => ({ ...en, stats: en.stats.map((v, j) => (j === i ? e.target.value : v)) }))}
                          className={`${inputClass} disabled:opacity-40`}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={MAX_EV}
                          value={entry.evs[i]}
                          aria-label={`${t.stats[stat]} ${t.ivCalc.ev}`}
                          onChange={(e) => setEntry(index, (en) => ({ ...en, evs: en.evs.map((v, j) => (j === i ? e.target.value : v)) }))}
                          className={inputClass}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {entries.length < MAX_ENTRIES && (
            <button
              onClick={() => setEntries((prev) => [...prev, emptyEntry(String(Math.min(100, (parseInt(prev[prev.length - 1].level, 10) || 49) + 1)))])}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-purple-600 dark:text-purple-400 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <Plus size={16} /> {t.ivCalc.addLevel}
            </button>
          )}
        </div>

        {/* Result */}
        <aside className="lg:sticky lg:top-24 bg-white dark:bg-dark-card p-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-5">{t.ivCalc.result}</h2>
          <div className="space-y-4">
            {rows.map(({ stat, ivs, skip }) => {
              const min = ivs && ivs.length ? ivs[0] : 0;
              const max = ivs && ivs.length ? ivs[ivs.length - 1] : 0;
              const valid = !skip && ivs !== null && ivs.length > 0;
              return (
                <div key={stat}>
                  <div className="flex items-baseline justify-between text-sm mb-1.5">
                    <span className="font-semibold text-gray-600 dark:text-gray-300">{t.stats[stat]}</span>
                    <span className="font-extrabold text-gray-800 dark:text-white tabular-nums">
                      {skip || ivs === null ? (
                        <span className="font-normal text-gray-300 dark:text-gray-600">-</span>
                      ) : ivs.length === 0 ? (
                        <span className="text-xs font-semibold text-red-500">{t.ivCalc.impossible}</span>
                      ) : min === max ? (
                        <>
                          {min}
                          {min === MAX_IV && <span className="ml-2 text-xs font-bold text-emerald-500">{t.ivCalc.perfect}</span>}
                        </>
                      ) : (
                        `${min} - ${max}`
                      )}
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    {valid && (
                      <div
                        className={`absolute top-0 bottom-0 rounded-full transition-all duration-300 ${ivColor(max)}`}
                        style={{ left: `${(min / MAX_IV) * 100}%`, width: `${Math.max(((max - min) / MAX_IV) * 100, 3)}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {known.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-gray-500">{t.ivCalc.total}</span>
              <span className="text-lg font-extrabold text-gray-800 dark:text-white tabular-nums">
                {totalMin === totalMax ? totalMin : `${totalMin} - ${totalMax}`}
                <span className="ml-1 text-xs font-medium text-gray-400">/ {known.length * MAX_IV}</span>
              </span>
            </div>
          )}
          {pokemon && baseTotal > 0 && (
            <p className="mt-2 text-xs text-gray-400">{t.totalStats}: {baseTotal}</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default IvCalculator;
