import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchAllPokemonNames } from '../services/pokeApi';
import { artworkUrl, idFromUrl } from '../utils/pokemon';
import { HABITAT_COLORS, HABITAT_PT, PREF_PT, RoommateData, SPECIALTY_PT } from '../utils/roommates';
import Loader from '../components/Loader';

const PokopiaSpecialties: React.FC = () => {
  const [data, setData] = useState<RoommateData | null>(null);
  const [failed, setFailed] = useState(false);
  const [ids, setIds] = useState<Record<string, number>>({});
  const [specialty, setSpecialty] = useState('Grow');
  const [region, setRegion] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/pokopia/roommates.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: RoommateData) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    fetchAllPokemonNames().then((list) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      list.forEach((p) => (map[p.name] = idFromUrl(p.url)));
      setIds(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    data?.pokemon.forEach((p) => p.sp.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => (SPECIALTY_PT[a[0]] ?? a[0]).localeCompare(SPECIALTY_PT[b[0]] ?? b[0], 'pt'));
  }, [data]);

  const regions = useMemo(() => [...new Set((data?.pokemon ?? []).filter((p) => p.sp.includes(specialty)).map((p) => p.r))].sort(), [data, specialty]);
  const list = useMemo(
    () => (data?.pokemon ?? []).filter((p) => p.sp.includes(specialty) && (!region || p.r === region)),
    [data, specialty, region]
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-green-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white">
          Guia de <span className="text-green-600 dark:text-green-400">especialidades</span>
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">Encontre os Pokémon ajudantes por especialidade e por região.</p>
      </div>

      {failed && <p className="text-red-500">Não foi possível carregar os dados.</p>}
      {!data && !failed && <Loader />}

      {data && (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {counts.map(([s, n]) => (
              <button
                key={s}
                onClick={() => {
                  setSpecialty(s);
                  setRegion('');
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                  s === specialty
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-500'
                }`}
              >
                {SPECIALTY_PT[s] ?? s} <span className="opacity-70">{n}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-xl font-extrabold text-gray-800 dark:text-white">
              {SPECIALTY_PT[specialty] ?? specialty} <span className="text-gray-400 text-base">({list.length})</span>
            </h2>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200">
              <option value="">Todas as regiões</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r === 'Event Pokémon' ? 'Eventos' : r}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <div key={p.n} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 p-3">
                {ids[p.s] ? <img src={artworkUrl(ids[p.s])} alt={p.n} loading="lazy" className="h-16 w-16 object-contain" /> : <span className="h-16 w-16" />}
                <div className="min-w-0">
                  <div className="font-extrabold text-gray-800 dark:text-gray-100 truncate">{p.n}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-1.5 rounded text-[10px] font-extrabold uppercase text-gray-900" style={{ backgroundColor: HABITAT_COLORS[p.h] }}>{HABITAT_PT[p.h]}</span>
                    <span className="truncate">{p.r === 'Event Pokémon' ? 'Eventos' : p.r}</span>
                  </div>
                  {p.sp.length > 1 && (
                    <div className="text-[11px] text-gray-400 truncate">Também: {p.sp.filter((s) => s !== specialty).map((s) => SPECIALTY_PT[s] ?? s).join(', ')}</div>
                  )}
                  <div className="text-[11px] text-gray-400 truncate">{p.p.slice(0, 3).map((x) => PREF_PT[x] ?? x).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PokopiaSpecialties;
