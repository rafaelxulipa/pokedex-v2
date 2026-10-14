import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Hammer, Search, Plus, Minus, X } from 'lucide-react';
import {
  CATEGORY_PT,
  CraftingData,
  iconUrl,
  isExpansion,
  materialSlug,
  sourcePt,
  sumMaterials,
} from '../utils/pokopiaCrafting';
import Loader from '../components/Loader';

const PAGE = 60;

const Icon: React.FC<{ slug: string; size: number }> = ({ slug, size }) => {
  const [ok, setOk] = useState(true);
  if (!ok) return <span style={{ width: size, height: size }} className="inline-block shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800" />;
  return (
    <img
      src={iconUrl(slug)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setOk(false)}
      className="shrink-0 object-contain [image-rendering:pixelated]"
      style={{ width: size, height: size }}
    />
  );
};

const PokopiaCrafting: React.FC = () => {
  const [data, setData] = useState<CraftingData | null>(null);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [material, setMaterial] = useState<number | null>(null);
  const [hideExpansion, setHideExpansion] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [cart, setCart] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/pokopia/crafting.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: CraftingData) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setVisible(PAGE), [category, search, material, hideExpansion]);

  const counts = useMemo(() => {
    const c = new Array(7).fill(0);
    data?.items.forEach((i) => c[i.c]++);
    return c as number[];
  }, [data]);

  const matUse = useMemo(() => {
    const m = new Map<number, number>();
    data?.items.forEach((i) => i.m.forEach(([, mat]) => m.set(mat, (m.get(mat) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => category === null || item.c === category)
      .filter(({ item }) => !term || item.n.toLowerCase().includes(term))
      .filter(({ item }) => material === null || item.m.some(([, m]) => m === material))
      .filter(({ item }) => !hideExpansion || !isExpansion(data.sources[item.s]));
  }, [data, category, search, material, hideExpansion]);

  const picks = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0).map(([index, qty]) => ({ index: Number(index), qty })), [cart]);
  const totals = useMemo(() => (data && picks.length ? [...sumMaterials(data, picks).entries()].sort((a, b) => b[1] - a[1]) : []), [data, picks]);

  const setQty = (index: number, delta: number) =>
    setCart((c) => ({ ...c, [index]: Math.max(0, (c[index] ?? 0) + delta) }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-green-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="mb-6">
        <div className="inline-flex items-center justify-center h-14 w-14 mb-3 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-lg">
          <Hammer size={28} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white">Receitas de craft do Pokopia</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
          {data ? `${data.items.length} itens` : 'Carregando'} que a bancada faz, com os materiais e onde conseguir cada receita. Some os materiais de vários itens com a lista de compras.
        </p>
      </div>

      {failed && <p className="text-red-500">Não foi possível carregar as receitas.</p>}
      {!data && !failed && <Loader />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] items-start">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold border ${category === null ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                Todos <span className="opacity-70">{data.items.length}</span>
              </button>
              {CATEGORY_PT.map((c, i) => (
                <button
                  key={c}
                  onClick={() => setCategory(category === i ? null : i)}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold border ${category === i ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-500'}`}
                >
                  {c} <span className="opacity-70">{counts[i]}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar item..."
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <select
                value={material ?? ''}
                onChange={(e) => setMaterial(e.target.value === '' ? null : Number(e.target.value))}
                className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100"
              >
                <option value="">Qualquer material</option>
                {matUse.map(([m, n]) => (
                  <option key={m} value={m}>{data.materials[m]} ({n})</option>
                ))}
              </select>
            </div>
            <label className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={hideExpansion} onChange={(e) => setHideExpansion(e.target.checked)} />
              Ocultar receitas que exigem o Expansion Pass
            </label>

            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{list.length} itens</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.slice(0, visible).map(({ item, index }) => {
                const qty = cart[index] ?? 0;
                return (
                  <article key={index} className="flex gap-3 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 p-3">
                    <Icon slug={item.i} size={56} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-extrabold text-gray-800 dark:text-gray-100 leading-tight">{item.n}</h2>
                        <span className="shrink-0 text-[10px] font-bold uppercase text-gray-400">{CATEGORY_PT[item.c]}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.m.map(([q, m]) => (
                          <button
                            key={m}
                            onClick={() => setMaterial(m)}
                            className="flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            title="Filtrar por este material"
                          >
                            <Icon slug={materialSlug(data.materials[m])} size={18} />
                            {q}x {data.materials[m]}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">{sourcePt(data.sources[item.s])}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button onClick={() => setQty(index, -1)} disabled={qty === 0} className="h-6 w-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center disabled:opacity-30" aria-label="Menos"><Minus size={12} /></button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
                        <button onClick={() => setQty(index, 1)} className="h-6 w-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center" aria-label="Mais"><Plus size={12} /></button>
                        <span className="text-[11px] text-gray-400 ml-1">lista</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {visible < list.length && (
              <div className="mt-6 text-center">
                <button onClick={() => setVisible((v) => v + PAGE)} className="px-6 py-3 font-bold text-white bg-amber-600 rounded-2xl hover:bg-amber-700">
                  Mostrar mais ({list.length - visible})
                </button>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-gray-800 dark:text-white">Lista de compras</h2>
              {picks.length > 0 && (
                <button onClick={() => setCart({})} className="text-xs font-bold text-red-500 flex items-center gap-1"><X size={12} /> Limpar</button>
              )}
            </div>
            {picks.length === 0 ? (
              <p className="text-sm text-gray-400">Use o + nos itens para somar os materiais necessários.</p>
            ) : (
              <>
                <ul className="mb-4 space-y-1 text-sm">
                  {picks.map((p) => (
                    <li key={p.index} className="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
                      <span className="truncate">{data.items[p.index].n}</span>
                      <b className="tabular-nums">x{p.qty}</b>
                    </li>
                  ))}
                </ul>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Materiais</h3>
                <ul className="space-y-1.5">
                  {totals.map(([m, q]) => (
                    <li key={m} className="flex items-center gap-2 text-sm">
                      <Icon slug={materialSlug(data.materials[m])} size={22} />
                      <span className="flex-1 text-gray-700 dark:text-gray-200">{data.materials[m]}</span>
                      <b className="tabular-nums text-amber-600 dark:text-amber-400">{q}</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      )}

      <p className="mt-10 text-xs text-center text-gray-400">
        Receitas e ícones:{' '}
        <a className="underline" href="https://www.poketools.com/pokopia-crafting" target="_blank" rel="noopener noreferrer">poketools.com</a>. Nomes em inglês, como no jogo.
      </p>
    </div>
  );
};

export default PokopiaCrafting;
