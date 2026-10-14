import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Home, ChevronLeft } from 'lucide-react';
import { fetchAllPokemonNames } from '../services/pokeApi';
import { artworkUrl, idFromUrl } from '../utils/pokemon';
import { GROUP_LABELS, HABITAT_ART_SOURCE, habitatImage, habitatLabel, habitatMatches, loadPokopiaData, PokopiaData, PokopiaGroup } from '../utils/pokopia';
import Loader from '../components/Loader';

const PAGE = 30;

const PokopiaHabitats: React.FC = () => {
  const [data, setData] = useState<PokopiaData | null>(null);
  const [failed, setFailed] = useState(false);
  const [ids, setIds] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<PokopiaGroup>('main');
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

  useEffect(() => setVisible(PAGE), [search, group]);

  const results = useMemo(() => (data ? data.habitats.filter((h) => h.group === group && habitatMatches(h, search)) : []), [data, search, group]);
  const counts = useMemo(() => {
    const c: Record<PokopiaGroup, number> = { main: 0, basin: 0, event: 0 };
    data?.habitats.forEach((h) => c[h.group]++);
    return c;
  }, [data]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-green-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 mb-3 rounded-2xl bg-linear-to-br from-green-500 to-emerald-600 text-white shadow-lg">
          <Home size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">Habitats do Pokopia</h1>
        <p className="text-gray-500 dark:text-gray-400">Procure por habitat, item ou Pokémon para ver o que montar.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ex.: Tall Grass, Bulbasaur, Streetlight, #12..."
          className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(GROUP_LABELS) as PokopiaGroup[]).map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
              group === g
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-500'
            }`}
          >
            {GROUP_LABELS[g]} {data && <span className="opacity-70">({counts[g]})</span>}
          </button>
        ))}
      </div>

      {failed && <p className="text-center text-red-500">Não foi possível carregar os habitats.</p>}
      {!data && !failed && <Loader />}
      {data && (
        <>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{results.length} de {counts[group]} habitats</p>
          <div className="grid gap-5 lg:grid-cols-2">
            {results.slice(0, visible).map((h) => (
              <article key={h.id} className="relative rounded-3xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow overflow-hidden">
                <div className="flex items-start gap-4 p-5 pb-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block mb-1.5 px-2.5 py-0.5 text-xs font-extrabold tabular-nums rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">{habitatLabel(h)}</span>
                    <h2 className="text-lg font-extrabold leading-tight text-gray-800 dark:text-white">{h.name}</h2>
                    {h.items.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {h.items.map((item) => (
                          <span key={item.n} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {item.n}{item.q > 0 && <b className="ml-1 text-green-600 dark:text-green-400">x{item.q}</b>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-400">Itens ainda não catalogados.</p>
                    )}
                  </div>
                  <figure className="shrink-0 w-28 sm:w-36 m-0">
                    <img
                      src={habitatImage(h.name)}
                      alt={h.name}
                      loading="lazy"
                      width={240}
                      height={167}
                      onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')}
                      className="w-full h-auto rounded-2xl shadow-md ring-2 ring-white dark:ring-gray-700 rotate-2 hover:rotate-0 transition-transform"
                    />
                  </figure>
                </div>
                <div className="px-5 pb-5">
                  {h.pokemon.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {h.pokemon.map((m) => {
                        const id = ids[m.slug];
                        const label = m.form ? `${m.n} (${m.form})` : m.n;
                        const inner = (
                          <>
                            {id ? (
                              <img src={artworkUrl(id)} alt={label} loading="lazy" className="h-20 w-20 object-contain drop-shadow-sm transition-transform group-hover:scale-110" />
                            ) : (
                              <span className="h-20 w-20" />
                            )}
                            <span className="mt-1 text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight text-center">{label}</span>
                          </>
                        );
                        return id ? (
                          <Link key={`${m.slug}-${m.form ?? ''}`} to={`/pokemon/${id}`} className="group flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            {inner}
                          </Link>
                        ) : (
                          <div key={`${m.slug}-${m.form ?? ''}`} className="flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-gray-800/50">{inner}</div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Pokémon ainda não catalogados.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
          {visible < results.length && (
            <div className="mt-8 text-center">
              <button onClick={() => setVisible((v) => v + PAGE)} className="px-6 py-3 font-bold text-white bg-green-600 rounded-2xl hover:bg-green-700 transition-colors">
                Mostrar mais
              </button>
            </div>
          )}
          {results.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum habitat encontrado.</p>}
          <p className="mt-10 text-xs text-center text-gray-400">
            Ilustrações dos habitats:{' '}
            <a className="underline" href={HABITAT_ART_SOURCE} target="_blank" rel="noopener noreferrer">poketools.com</a>. Imagens e nomes pertencem a seus respectivos donos.
          </p>
        </>
      )}
    </div>
  );
};

export default PokopiaHabitats;
