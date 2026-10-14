import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, ChevronLeft } from 'lucide-react';
import { fetchAllPokemonNames } from '../services/pokeApi';
import { artworkUrl, idFromUrl } from '../utils/pokemon';
import { habitatLabel, habitatImage, HABITAT_ART_SOURCE, loadPokopiaData, normalizeSearch, PokopiaData } from '../utils/pokopia';
import Loader from '../components/Loader';

const PAGE = 48;

const PokopiaPokemon: React.FC = () => {
  const [data, setData] = useState<PokopiaData | null>(null);
  const [failed, setFailed] = useState(false);
  const [ids, setIds] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    loadPokopiaData().then((d) => {
      if (cancelled) return;
      if (d) setData(d);
      else setFailed(true);
    });
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

  useEffect(() => setVisible(PAGE), [search]);

  // Sorted by national dex number once the ids are known
  const list = useMemo(() => {
    if (!data) return [];
    const term = normalizeSearch(search);
    return data.pokemon
      .filter((p) => !term || normalizeSearch(p.n).includes(term) || p.slug.includes(term))
      .sort((a, b) => (ids[a.slug] ?? 99999) - (ids[b.slug] ?? 99999) || a.n.localeCompare(b.n));
  }, [data, ids, search]);

  const selected = open && data ? data.pokemon.find((p) => p.slug === open) : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-blue-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 mb-3 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <Users size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">Pokémon do Pokopia</h1>
        <p className="text-gray-500 dark:text-gray-400">Toque em um Pokémon para ver em quais habitats ele aparece.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar Pokémon..."
          className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {failed && <p className="text-center text-red-500">Não foi possível carregar os dados.</p>}
      {!data && !failed && <Loader />}
      {data && (
        <>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{list.length} Pokémon</p>

          {selected && (
            <div className="mb-6 rounded-3xl bg-white dark:bg-dark-card border-2 border-blue-500 shadow-lg p-5">
              <div className="flex items-center gap-4 mb-4">
                {ids[selected.slug] && <img src={artworkUrl(ids[selected.slug])} alt={selected.n} className="h-32 w-32 object-contain" />}
                <div className="flex-1 min-w-0">
                  {ids[selected.slug] && <div className="text-xs font-bold text-gray-400">#{ids[selected.slug]}</div>}
                  <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">{selected.n}</h2>
                  {ids[selected.slug] && (
                    <Link to={`/pokemon/${ids[selected.slug]}`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      Ver na Pokédex
                    </Link>
                  )}
                </div>
                <button onClick={() => setOpen(null)} className="px-3 py-2 text-sm font-semibold text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">Fechar</button>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-2">Habitats</h3>
              <ul className="space-y-2">
                {selected.habitats.map((hid) => {
                  const h = data.habitats[hid - 1];
                  return (
                    <li key={hid} className="flex items-start gap-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-3">
                      <img src={habitatImage(h.name)} alt="" loading="lazy" width={240} height={167} onError={(e) => (e.currentTarget.style.display = 'none')} className="w-24 h-auto rounded-xl shadow-sm shrink-0" />
                      <div className="min-w-0">
                      <div className="font-bold text-gray-800 dark:text-gray-100">
                        <span className="mr-2 text-green-600 dark:text-green-400 tabular-nums">{habitatLabel(h)}</span>
                        {h.name}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {h.items.map((item) => (
                          <span key={item.n} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                            {item.n}{item.q > 0 && <b className="ml-1 text-green-600 dark:text-green-400">x{item.q}</b>}
                          </span>
                        ))}
                      </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {list.slice(0, visible).map((p) => {
              const id = ids[p.slug];
              const active = open === p.slug;
              return (
                <button
                  key={p.slug}
                  onClick={() => {
                    setOpen(active ? null : p.slug);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex flex-col items-center p-2 rounded-2xl border transition-all hover:-translate-y-0.5 ${
                    active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card hover:border-blue-400'
                  }`}
                >
                  {id ? <img src={artworkUrl(id)} alt="" loading="lazy" className="h-24 w-24 object-contain drop-shadow-sm" /> : <span className="h-24 w-24" />}
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-full">{p.n}</span>
                  <span className="text-[10px] text-gray-400">{p.habitats.length} habitat{p.habitats.length > 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
          {visible < list.length && (
            <div className="mt-8 text-center">
              <button onClick={() => setVisible((v) => v + PAGE)} className="px-6 py-3 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-colors">
                Mostrar mais
              </button>
            </div>
          )}
          {list.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum Pokémon encontrado.</p>}
          <p className="mt-10 text-xs text-center text-gray-400">
            Ilustrações dos habitats:{' '}
            <a className="underline" href={HABITAT_ART_SOURCE} target="_blank" rel="noopener noreferrer">poketools.com</a>.
          </p>
        </>
      )}
    </div>
  );
};

export default PokopiaPokemon;
