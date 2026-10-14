import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Search, Sun, Cloud, CloudRain, Clock } from 'lucide-react';
import { fetchAllPokemonNames } from '../services/pokeApi';
import { artworkUrl, idFromUrl } from '../utils/pokemon';
import { habitatImage, habitatLabel, PokopiaData } from '../utils/pokopia';
import { RoommateData } from '../utils/roommates';
import { describeConditions, RARITY_PT, Spawn, SpawnFilter, spawnMatches, TIMES, timeIndexNow, WEATHERS } from '../utils/spawns';
import Loader from '../components/Loader';

const PAGE = 24;
const RARITY_COLOR: Record<Spawn['r'], string> = {
  C: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  R: 'bg-sky-200 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  V: 'bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
};
const WEATHER_ICON = [Sun, Cloud, CloudRain];

const PokopiaSpawns: React.FC = () => {
  const [spawns, setSpawns] = useState<Spawn[] | null>(null);
  const [habitats, setHabitats] = useState<PokopiaData['habitats'] | null>(null);
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [ids, setIds] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SpawnFilter>({ time: null, weather: null, rarity: null, region: '' });
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/pokopia/spawns.json').then((r) => r.json()),
      fetch('/pokopia/habitats.json').then((r) => r.json()),
      fetch('/pokopia/roommates.json').then((r) => r.json()),
    ])
      .then(([s, h, r]: [{ spawns: Spawn[] }, PokopiaData, RoommateData]) => {
        if (cancelled) return;
        setSpawns(s.spawns);
        setHabitats(h.habitats);
        setSlugs(Object.fromEntries(r.pokemon.map((p) => [p.n, p.s])));
      })
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

  useEffect(() => setVisible(PAGE), [search, filter]);

  const regions = useMemo(() => [...new Set((spawns ?? []).flatMap((s) => s.g ?? []))].sort(), [spawns]);

  const groups = useMemo(() => {
    if (!spawns) return [];
    const term = search.trim().toLowerCase();
    const map = new Map<string, Spawn[]>();
    spawns.forEach((s) => {
      if (term && !s.n.toLowerCase().includes(term)) return;
      if (!spawnMatches(s, filter)) return;
      map.set(s.n, [...(map.get(s.n) ?? []), s]);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [spawns, search, filter]);

  const stats = useMemo(() => {
    const all = groups.flatMap(([, s]) => s);
    return {
      pokemon: groups.length,
      spots: all.length,
      common: all.filter((s) => s.r === 'C').length,
      rare: all.filter((s) => s.r === 'R').length,
      very: all.filter((s) => s.r === 'V').length,
    };
  }, [groups]);

  const chip = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
      on ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500'
    }`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-green-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white">
          Onde <span className="text-teal-600 dark:text-teal-400">encontrar</span> cada Pokémon
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
          Veja em quais habitats cada Pokémon aparece, com a raridade, o horário e o clima. Filtre por região, horário, clima e raridade.
        </p>
      </div>

      {failed && <p className="text-red-500">Não foi possível carregar os dados.</p>}
      {!spawns && !failed && <Loader />}

      {spawns && habitats && (
        <>
          <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar Pokémon..."
                className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Horário</span>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setFilter((f) => ({ ...f, time: f.time === timeIndexNow() ? null : timeIndexNow() }))} className={chip(filter.time === timeIndexNow())}>
                    <Clock size={14} className="inline mr-1 -mt-0.5" /> Agora
                  </button>
                  {TIMES.map((t, i) => (
                    <button key={t} onClick={() => setFilter((f) => ({ ...f, time: f.time === i ? null : i }))} className={chip(filter.time === i)}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Clima</span>
                <div className="flex flex-wrap gap-1.5">
                  {WEATHERS.map((w, i) => {
                    const Icon = WEATHER_ICON[i];
                    return (
                      <button key={w} onClick={() => setFilter((f) => ({ ...f, weather: f.weather === i ? null : i }))} className={chip(filter.weather === i)}>
                        <Icon size={14} className="inline mr-1 -mt-0.5" /> {w}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Raridade</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['C', 'R', 'V'] as const).map((r) => (
                    <button key={r} onClick={() => setFilter((f) => ({ ...f, rarity: f.rarity === r ? null : r }))} className={chip(filter.rarity === r)}>
                      {RARITY_PT[r]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Região</span>
                <select
                  value={filter.region}
                  onChange={(e) => setFilter((f) => ({ ...f, region: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todas as regiões</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
              <span><b className="text-gray-800 dark:text-white">{stats.pokemon}</b> Pokémon</span>
              <span><b className="text-gray-800 dark:text-white">{stats.spots}</b> pontos de spawn</span>
              <span>{stats.common} comuns · {stats.rare} raros · {stats.very} muito raros</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 grid-cols-[minmax(0,1fr)] md:grid-cols-2">
            {groups.slice(0, visible).map(([name, list]) => {
              const id = ids[slugs[name] ?? ''];
              return (
                <article key={name} className="min-w-0 rounded-3xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {id ? <img src={artworkUrl(id)} alt={name} loading="lazy" className="h-16 w-16 object-contain" /> : <span className="h-16 w-16" />}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-extrabold text-gray-800 dark:text-white truncate">{name}</h2>
                      <p className="text-xs text-gray-500">{list.length} {list.length > 1 ? 'habitats' : 'habitat'}</p>
                    </div>
                    {id && <Link to={`/pokemon/${id}`} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">Pokédex</Link>}
                  </div>
                  <ul className="space-y-2">
                    {list.map((s, i) => {
                      const h = habitats[s.h - 1];
                      const c = describeConditions(s.m);
                      return (
                        <li key={i} className="flex gap-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-2">
                          <img src={habitatImage(h.name)} alt="" loading="lazy" width={240} height={167} className="h-14 w-20 rounded-lg object-cover shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{h.name}</span>
                              <span className={`shrink-0 px-1.5 rounded text-[10px] font-extrabold uppercase ${RARITY_COLOR[s.r]}`}>{RARITY_PT[s.r]}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {habitatLabel(h)} · {c.time} · {c.weather}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">{s.g ? s.g.join(', ') : 'Todas as regiões'}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
          {visible < groups.length && (
            <div className="mt-6 text-center">
              <button onClick={() => setVisible((v) => v + PAGE)} className="px-6 py-3 font-bold text-white bg-teal-600 rounded-2xl hover:bg-teal-700">
                Mostrar mais ({groups.length - visible})
              </button>
            </div>
          )}
          {groups.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum Pokémon com esses filtros.</p>}
        </>
      )}

      <p className="mt-10 text-xs text-center text-gray-400">
        Pontos de spawn:{' '}
        <a className="underline" href="https://www.poketools.com/pokopia-spawn-finder" target="_blank" rel="noopener noreferrer">poketools.com</a>. Nomes em inglês, como no jogo.
      </p>
    </div>
  );
};

export default PokopiaSpawns;
