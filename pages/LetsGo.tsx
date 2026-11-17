import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Zap } from 'lucide-react';
import { fetchAllPokemonNames, fetchLetsGoTypes } from '../services/pokeApi';
import { artworkUrl, idFromUrl } from '../utils/pokemon';
import { LETS_GO_IDS, LETS_GO_TEXT, letsGoDexNumber, letsGoDisplayName, LetsGoLang, readLetsGoLang, saveLetsGoLang } from '../utils/letsGo';
import { TYPE_COLORS } from '../constants';
import Seo from '../components/Seo';
import Loader from '../components/Loader';
import MultiSelect from '../components/MultiSelect';
import TypeBadge from '../components/TypeBadge';
import LetsGoLangToggle from '../components/LetsGoLangToggle';

const LetsGo: React.FC = () => {
  const [lang, setLang] = useState<LetsGoLang>(readLetsGoLang);
  const [names, setNames] = useState<Record<number, string> | null>(null);
  const [types, setTypes] = useState<Record<number, string[]>>({});
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const text = LETS_GO_TEXT[lang];

  useEffect(() => {
    let cancelled = false;
    fetchAllPokemonNames().then((list) => {
      if (cancelled) return;
      if (list.length === 0) return setFailed(true);
      const map: Record<number, string> = {};
      list.forEach((p) => (map[idFromUrl(p.url)] = p.name));
      setNames(map);
    });
    fetchLetsGoTypes().then((result) => {
      if (!cancelled && result) setTypes(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeLang = (next: LetsGoLang) => {
    setLang(next);
    saveLetsGoLang(next);
  };

  const visible = useMemo(() => {
    if (!names) return [];
    const term = search.trim().toLowerCase().replace(/^#/, '');
    return LETS_GO_IDS.filter((id) => {
      if (!names[id]) return false;
      if (selectedTypes.length > 0 && !selectedTypes.every((t) => types[id]?.includes(t))) return false;
      if (!term) return true;
      return /^\d+$/.test(term) ? letsGoDexNumber(id) === parseInt(term, 10) : letsGoDisplayName(id, names[id]).toLowerCase().includes(term);
    });
  }, [names, types, search, selectedTypes]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <Seo
        title="Pokédex de Let's Go Pikachu e Eevee"
        description="Pokédex de Kanto de Pokémon Let's Go Pikachu e Let's Go Eevee, com os 151 Pokémon, Meltan e Melmetal e onde encontrar cada um no jogo."
        path="/lets-go"
      />

      <div className="flex justify-end mb-4">
        <LetsGoLangToggle value={lang} onChange={changeLang} />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-white mb-3">{text.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">{text.intro}</p>
        <Link
          to="/detonados/lets-go-pikachu-lets-go-eevee"
          className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
        >
          <BookOpen size={16} /> {text.guide}
        </Link>
        <Link
          to="/lets-go/catch-combo"
          className="inline-flex items-center gap-2 mt-4 ml-5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Zap size={16} /> {text.catchCombo}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-3">
        <div className="relative grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={text.search}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-red-400"
          />
        </div>
        <MultiSelect
          options={Object.keys(TYPE_COLORS).map((type) => ({ value: type, label: type }))}
          selected={selectedTypes}
          onChange={setSelectedTypes}
          allLabel={text.allTypes}
          capitalize
        />
      </div>

      {failed ? (
        <p className="text-center text-gray-400 py-20">{text.failed}</p>
      ) : names === null ? (
        <div className="flex justify-center py-20"><Loader /></div>
      ) : (
        <>
          <p className="text-center text-sm text-gray-400 mb-6">{text.results(visible.length)}</p>
          {visible.length === 0 ? (
            <p className="text-center text-gray-400 py-16">{text.empty}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {visible.map((id) => (
                <Link
                  key={id}
                  to={`/pokemon/${id}`}
                  className="group flex flex-col items-center bg-white dark:bg-dark-card rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <img src={artworkUrl(id)} alt="" loading="lazy" width={96} height={96} className="w-24 h-24 object-contain group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-mono text-gray-400 mt-1">#{String(letsGoDexNumber(id)).padStart(3, '0')}</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100 text-center text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {letsGoDisplayName(id, names[id])}
                  </span>
                  <div className="flex flex-wrap justify-center min-h-[28px]">
                    {(types[id] ?? []).map((type) => (
                      <TypeBadge key={type} type={type} size="sm" />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LetsGo;
