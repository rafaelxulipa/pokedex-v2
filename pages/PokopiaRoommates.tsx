import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Home, Link2, Check, Plus, X, Search } from 'lucide-react';
import { fetchAllPokemonNames } from '../services/pokeApi';
import { artworkUrl, idFromUrl } from '../utils/pokemon';
import {
  HABITAT_COLORS,
  HABITAT_PT,
  MAX_HOUSE,
  PREF_PT,
  RoommateData,
  RoommateMon,
  SPECIALTY_PT,
  rankRoommates,
  scoreHouse,
} from '../utils/roommates';
import Loader from '../components/Loader';

const PAGE = 30;
const pref = (p: string) => PREF_PT[p] ?? p;
const spec = (s: string) => SPECIALTY_PT[s] ?? s;
const regionLabel = (r: string) => (r === 'Event Pokémon' ? 'Eventos' : r === 'Dream Island' ? 'Dream Islands' : r);

const PokopiaRoommates: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<RoommateData | null>(null);
  const [failed, setFailed] = useState(false);
  const [ids, setIds] = useState<Record<string, number>>({});
  const [targetName, setTargetName] = useState(searchParams.get('pokemon') ?? 'Bulbasaur');
  const [region, setRegion] = useState('');
  const [habitats, setHabitats] = useState<number[]>([]);
  const [sameHabitat, setSameHabitat] = useState(searchParams.get('habitat') !== 'any');
  const [house, setHouse] = useState<string[]>([]);
  const [pick, setPick] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const [copied, setCopied] = useState(false);

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

  const byName = useMemo(() => new Map((data?.pokemon ?? []).map((m) => [m.n, m])), [data]);
  const target: RoommateMon | null = byName.get(targetName) ?? data?.pokemon[0] ?? null;

  // The house always starts with the target
  useEffect(() => {
    setHouse([]);
    setVisible(PAGE);
  }, [target?.n]);
  useEffect(() => setVisible(PAGE), [region, habitats, sameHabitat]);

  const ranked = useMemo(
    () => (data && target ? rankRoommates(target, data.pokemon, { region, habitats, sameHabitat }) : []),
    [data, target, region, habitats, sameHabitat]
  );

  const regions = useMemo(() => [...new Set((data?.pokemon ?? []).map((m) => m.r))].sort(), [data]);
  const matches = useMemo(() => {
    const term = pick.trim().toLowerCase();
    if (!term || !data) return [];
    return data.pokemon.filter((m) => m.n.toLowerCase().includes(term)).slice(0, 12);
  }, [pick, data]);

  const houseMons = useMemo(() => (target ? [target, ...house.map((n) => byName.get(n)).filter((m): m is RoommateMon => !!m)] : []), [target, house, byName]);
  const score = useMemo(() => scoreHouse(houseMons), [houseMons]);

  const perfect = ranked.filter((r) => r.shared.length === 6).length;
  const strong = ranked.filter((r) => r.percent >= 60).length;
  const average = ranked.length ? Math.round(ranked.reduce((s, r) => s + r.percent, 0) / ranked.length) : 0;
  const best = ranked[0];

  const art = (m: RoommateMon, cls: string) =>
    ids[m.s] ? <img src={artworkUrl(ids[m.s])} alt={m.n} loading="lazy" className={cls} /> : <span className={cls} />;

  const choose = (name: string) => {
    setTargetName(name);
    setPick('');
    setSearchParams({ pokemon: name, ...(sameHabitat ? {} : { habitat: 'any' }) }, { replace: true });
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/pokopia/colegas?pokemon=${encodeURIComponent(targetName)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleHouse = (name: string) =>
    setHouse((h) => (h.includes(name) ? h.filter((x) => x !== name) : h.length + 1 < MAX_HOUSE ? [...h, name] : h));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-green-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white">
          Calculadora de <span className="text-green-600 dark:text-green-400">colegas de casa</span>
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
          Escolha um Pokémon e veja com quem ele combina mais. Quanto mais preferências em comum, menos decorações diferentes você precisa para deixar
          todos felizes.
        </p>
      </div>

      {failed && <p className="text-red-500">Não foi possível carregar os dados.</p>}
      {!data && !failed && <Loader />}

      {data && target && (
        <>
          {/* Target + summary */}
          <div className="rounded-3xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
            <div className="grid gap-6 p-6 md:grid-cols-[14rem_minmax(0,1fr)_14rem] items-center">
              <div className="flex flex-col items-center text-center">
                {art(target, 'h-44 w-44 object-contain drop-shadow-lg')}
                <div className="mt-2 flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-gray-800 dark:text-white">{target.n}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase text-gray-900" style={{ backgroundColor: HABITAT_COLORS[target.h] }}>
                    {HABITAT_PT[target.h]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {regionLabel(target.r)}
                  {target.sp.length > 0 && ` · ${target.sp.map(spec).join(', ')}`}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {target.p.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">{pref(p)}</span>
                  ))}
                </div>
              </div>

              <div className="text-center md:text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Melhor colega · preferências em comum</p>
                <p className="mt-1 text-6xl font-extrabold text-orange-500 tabular-nums">{best ? `${best.percent}%` : '-'}</p>
                {best && (
                  <p className="mt-1 text-gray-600 dark:text-gray-300">
                    {target.n} + {best.mon.n} · {best.shared.length} de 6 · {HABITAT_PT[best.mon.h]}
                  </p>
                )}
                <div className="mt-3 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden max-w-sm">
                  <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${best?.percent ?? 0}%` }} />
                </div>
              </div>

              <dl className="text-sm divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  ['Candidatos', ranked.length],
                  ['Perfeitos (6 de 6)', perfect],
                  ['Fortes (60% ou mais)', strong],
                  ['Média de afinidade', `${average}%`],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between py-1.5">
                    <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                    <dd className="font-extrabold text-gray-800 dark:text-white tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Filters */}
            <div className="grid gap-4 p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]">
              <div className="relative">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Pokémon alvo</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={pick}
                    onChange={(e) => setPick(e.target.value)}
                    placeholder={target.n}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card shadow-lg">
                    {matches.map((m) => (
                      <li key={m.n}>
                        <button onClick={() => choose(m.n)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800">
                          {art(m, 'h-8 w-8 object-contain')}
                          <span className="text-gray-700 dark:text-gray-200">{m.n}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Região</span>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                  <option value="">Todas as regiões</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{regionLabel(r)}</option>
                  ))}
                </select>
              </label>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Habitat</span>
                <div className="flex flex-wrap gap-1.5">
                  {HABITAT_PT.map((h, i) => {
                    const on = habitats.includes(i);
                    return (
                      <button
                        key={h}
                        onClick={() => setHabitats((cur) => (on ? cur.filter((x) => x !== i) : [...cur, i]))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold text-gray-900 transition-opacity ${on || habitats.length === 0 ? 'opacity-100' : 'opacity-40'}`}
                        style={{ backgroundColor: HABITAT_COLORS[i] }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Mesmo habitat</span>
                <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 text-xs font-bold">
                  {[
                    [true, 'Obrigatório'],
                    [false, 'Qualquer'],
                  ].map(([v, label]) => (
                    <button
                      key={String(v)}
                      onClick={() => setSameHabitat(v as boolean)}
                      className={`px-3 py-2 ${sameHabitat === v ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}
                    >
                      {label as string}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{ranked.length} Pokémon compatíveis</span>
            <button onClick={copyLink} className="flex items-center gap-1.5 text-sm font-bold text-green-600 dark:text-green-400">
              {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? 'Link copiado!' : 'Copiar link'}
            </button>
          </div>

          {/* House */}
          <section className="mt-6 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="flex items-center gap-2 font-extrabold text-gray-800 dark:text-white"><Home size={18} /> Monte uma casa</h2>
              <span className="text-xs text-gray-400">até {MAX_HOUSE} moradores</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: MAX_HOUSE }, (_, i) => {
                const m = houseMons[i];
                const rs = m ? score.perResident.find((r) => r.mon === m) : null;
                return m ? (
                  <div key={m.n} className="relative flex flex-col items-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                    {i > 0 && (
                      <button onClick={() => toggleHouse(m.n)} className="absolute top-1.5 right-1.5 text-gray-400 hover:text-red-500" aria-label="Remover"><X size={15} /></button>
                    )}
                    {art(m, 'h-16 w-16 object-contain')}
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 text-center">{m.n}</span>
                    <span className="text-[11px] text-gray-400">{i === 0 ? 'alvo' : `${rs?.withGroup ?? 0} de ${m.p.length} em grupo`}</span>
                  </div>
                ) : (
                  <div key={`e${i}`} className="flex flex-col items-center justify-center h-[7.5rem] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-400">
                    <Plus size={16} className="mb-1" /> vago
                  </div>
                );
              })}
            </div>
            {houseMons.length > 1 ? (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  Preferências que <b>todos</b> têm:{' '}
                  {score.common.length ? (
                    <span className="inline-flex flex-wrap gap-1 align-middle">
                      {score.common.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">{pref(p)}</span>
                      ))}
                    </span>
                  ) : (
                    <b>nenhuma</b>
                  )}
                </p>
                {!score.sameHabitat && (
                  <p className="mt-2 text-amber-600 dark:text-amber-400">Atenção: os moradores têm habitats ideais diferentes.</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">Clique em "Adicionar" em uma linha abaixo para colocar um colega na casa.</p>
            )}
          </section>

          {/* Ranking */}
          <div className="mt-6 space-y-2">
            {ranked.slice(0, visible).map((r, i) => {
              const inHouse = house.includes(r.mon.n);
              return (
                <div key={r.mon.n} className="grid grid-cols-[2rem_3.5rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_3.5rem_11rem_minmax(0,1fr)_5rem_6rem] items-center gap-3 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 p-2.5">
                  <span className="text-xs font-bold text-gray-400 text-center tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {art(r.mon, 'h-14 w-14 object-contain')}
                  <div className="min-w-0">
                    <div className="font-extrabold text-gray-800 dark:text-gray-100 truncate">{r.mon.n}</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="px-1.5 rounded text-[10px] font-extrabold uppercase text-gray-900" style={{ backgroundColor: HABITAT_COLORS[r.mon.h] }}>{HABITAT_PT[r.mon.h]}</span>
                      <span className="truncate">{[...r.mon.sp.map(spec), regionLabel(r.mon.r)].join(' · ')}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1">
                    {r.mon.p.map((p) => (
                      <span
                        key={p}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          r.shared.includes(p) ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        {pref(p)}
                      </span>
                    ))}
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="font-extrabold text-gray-800 dark:text-white tabular-nums">{r.percent}%</div>
                    <div className="text-[11px] text-gray-400">{r.shared.length} de 6</div>
                  </div>
                  <button
                    onClick={() => toggleHouse(r.mon.n)}
                    disabled={!inHouse && house.length + 1 >= MAX_HOUSE}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors disabled:opacity-40 ${
                      inHouse ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {inHouse ? 'Na casa' : '+ Adicionar'}
                  </button>
                </div>
              );
            })}
          </div>
          {visible < ranked.length && (
            <div className="mt-6 text-center">
              <button onClick={() => setVisible((v) => v + PAGE)} className="px-6 py-3 font-bold text-white bg-green-600 rounded-2xl hover:bg-green-700 transition-colors">
                Mostrar mais ({ranked.length - visible})
              </button>
            </div>
          )}
          {ranked.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum Pokémon com esses filtros.</p>}

          <p className="mt-10 text-xs text-center text-gray-400">
            Preferências, habitats e especialidades:{' '}
            <a className="underline" href="https://www.poketools.com/pokopia-roommate-calculator" target="_blank" rel="noopener noreferrer">poketools.com</a>. Nomes dos Pokémon em inglês.
          </p>
        </>
      )}
    </div>
  );
};

export default PokopiaRoommates;
