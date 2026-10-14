import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Search, Building2 } from 'lucide-react';
import { fetchAllPokemonNames } from '../services/pokeApi';
import { artworkUrl, idFromUrl } from '../utils/pokemon';
import { HABITAT_COLORS, HABITAT_PT, PREF_PT, RoommateData, RoommateMon } from '../utils/roommates';
import { planHouses } from '../utils/housing';
import Loader from '../components/Loader';

const pref = (p: string) => PREF_PT[p] ?? p;

const PokopiaHousing: React.FC = () => {
  const [data, setData] = useState<RoommateData | null>(null);
  const [failed, setFailed] = useState(false);
  const [ids, setIds] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [size, setSize] = useState(4);
  const [search, setSearch] = useState('');
  const [habitat, setHabitat] = useState<number | null>(null);
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

  const regions = useMemo(() => [...new Set((data?.pokemon ?? []).map((m) => m.r))].sort(), [data]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.pokemon ?? []).filter(
      (m) => (!term || m.n.toLowerCase().includes(term)) && (habitat === null || m.h === habitat) && (!region || m.r === region)
    );
  }, [data, search, habitat, region]);

  const pool = useMemo(() => (data?.pokemon ?? []).filter((m) => selected.has(m.n)), [data, selected]);
  const plan = useMemo(() => (pool.length > 1 ? planHouses(pool, size) : null), [pool, size]);

  const toggle = (n: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  const addVisible = () => setSelected((cur) => new Set([...cur, ...visible.map((m) => m.n)]));

  const thumb = (m: RoommateMon, cls: string) =>
    ids[m.s] ? <img src={artworkUrl(ids[m.s])} alt={m.n} loading="lazy" className={cls} /> : <span className={cls} />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-green-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white">
          Calculadora de <span className="text-green-600 dark:text-green-400">moradia</span>
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
          Marque os Pokémon que você tem e veja como agrupá-los em casas para maximizar as preferências em comum. Só moram juntos Pokémon com o mesmo habitat ideal.
        </p>
      </div>

      {failed && <p className="text-red-500">Não foi possível carregar os dados.</p>}
      {!data && !failed && <Loader />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
          {/* Pool */}
          <section className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-extrabold text-gray-800 dark:text-white">Seus Pokémon</h2>
              <span className="text-sm text-gray-500">{selected.size} marcados</span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar Pokémon..."
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {HABITAT_PT.map((h, i) => (
                <button
                  key={h}
                  onClick={() => setHabitat(habitat === i ? null : i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold text-gray-900 transition-opacity ${habitat === null || habitat === i ? 'opacity-100' : 'opacity-40'}`}
                  style={{ backgroundColor: HABITAT_COLORS[i] }}
                >
                  {h}
                </button>
              ))}
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="ml-auto px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200">
                <option value="">Todas as regiões</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r === 'Event Pokémon' ? 'Eventos' : r}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mb-3 text-xs font-bold">
              <button onClick={addVisible} className="px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">Marcar os {visible.length} listados</button>
              <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Limpar</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[34rem] overflow-y-auto pr-1">
              {visible.map((m) => {
                const on = selected.has(m.n);
                return (
                  <button
                    key={m.n}
                    onClick={() => toggle(m.n)}
                    className={`flex flex-col items-center p-2 rounded-2xl border text-center transition-colors ${
                      on ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-800 hover:border-green-400'
                    }`}
                  >
                    {thumb(m, 'h-14 w-14 object-contain')}
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-tight">{m.n}</span>
                    <span className="mt-1 h-1.5 w-8 rounded-full" style={{ backgroundColor: HABITAT_COLORS[m.h] }} />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Result */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-extrabold text-gray-800 dark:text-white"><Building2 size={18} /> Casas sugeridas</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Moradores por casa</span>
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSize(n)}
                      className={`h-8 w-8 rounded-lg font-extrabold ${size === n ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {!plan && <p className="mt-4 text-sm text-gray-400">Marque ao menos 2 Pokémon para ver as casas.</p>}
            </div>

            {plan?.houses.map((h, i) => (
              <article key={i} className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-extrabold text-gray-800 dark:text-white">Casa {i + 1}</h3>
                  <span className="text-xs font-bold text-gray-400">
                    <span style={{ color: HABITAT_COLORS[h.members[0].h] }}>{HABITAT_PT[h.members[0].h]}</span> · afinidade{' '}
                    <b className="text-orange-500">{Math.round((h.score / h.max) * 100)}%</b>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {h.members.map((m) => (
                    <div key={m.n} className="flex flex-col items-center w-20">
                      {thumb(m, 'h-14 w-14 object-contain')}
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 text-center leading-tight">{m.n}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Em comum:{' '}
                  {h.common.length ? h.common.map(pref).join(', ') : 'nenhuma preferência compartilhada por todos'}
                </p>
              </article>
            ))}

            {plan && plan.alone.length > 0 && (
              <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-4">
                <h3 className="font-bold text-gray-600 dark:text-gray-300 mb-1">Sem par de habitat</h3>
                <p className="text-xs text-gray-400 mb-2">Nenhum outro Pokémon marcado com o mesmo habitat ideal.</p>
                <div className="flex flex-wrap gap-2">
                  {plan.alone.map((m) => (
                    <span key={m.n} className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {m.n} · {HABITAT_PT[m.h]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default PokopiaHousing;
