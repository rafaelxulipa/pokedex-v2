import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChefHat } from 'lucide-react';
import { SPECIALTY_PT } from '../utils/roommates';
import { iconUrl, materialSlug } from '../utils/pokopiaCrafting';
import Loader from '../components/Loader';

interface Recipe {
  meal: string;
  n: string;
  d: string;
  ing: string[];
  h: string;
  pp: string;
  f: string;
  l: number;
}
interface RecipeData {
  meals: Record<string, string>;
  recipes: Recipe[];
}

const MEAL_PT: Record<string, string> = { Salad: 'Saladas', Bread: 'Pães', Steak: 'Bifes', Soup: 'Sopas', Smoothie: 'Vitaminas' };
const MOVE_PT: Record<string, string> = { Leafage: 'Leafage', Cut: 'Cut', 'Rock Smash': 'Rock Smash', 'Water Gun': 'Water Gun', Surf: 'Surf' };
const FLAVOR_PT: Record<string, string> = { None: 'Sem sabor', Sweet: 'Doce', Bitter: 'Amargo', Sour: 'Azedo', Dry: 'Seco', Spicy: 'Picante' };
const FLAVOR_COLOR: Record<string, string> = {
  None: 'bg-gray-200 text-gray-700',
  Sweet: 'bg-pink-200 text-pink-800',
  Bitter: 'bg-emerald-200 text-emerald-800',
  Sour: 'bg-yellow-200 text-yellow-800',
  Dry: 'bg-sky-200 text-sky-800',
  Spicy: 'bg-red-200 text-red-800',
};

const Thumb: React.FC<{ name: string }> = ({ name }) => {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={iconUrl(materialSlug(name))} alt="" width={20} height={20} onError={() => setOk(false)} className="h-5 w-5 object-contain" />;
};

const PokopiaRecipes: React.FC = () => {
  const [data, setData] = useState<RecipeData | null>(null);
  const [failed, setFailed] = useState(false);
  const [meal, setMeal] = useState('Salad');
  const [flavor, setFlavor] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/pokopia/recipes.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: RecipeData) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const list = (data?.recipes ?? []).filter((r) => r.meal === meal && (!flavor || r.f === flavor));
  const flavors = [...new Set((data?.recipes ?? []).filter((r) => r.meal === meal).map((r) => r.f))];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-green-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="mb-6">
        <div className="inline-flex items-center justify-center h-14 w-14 mb-3 rounded-2xl bg-linear-to-br from-rose-500 to-orange-500 text-white shadow-lg">
          <ChefHat size={28} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-white">Receitas de culinária do Pokopia</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
          34 receitas em 5 refeições. Cada refeição fortalece um movimento do Ditto quando você come: saladas o Leafage, pães o Cut, bifes o Rock Smash, sopas o
          Water Gun e vitaminas o Surf. A culinária abre em Rocky Ridges, depois de resgatar o Chef Dente.
        </p>
      </div>

      {failed && <p className="text-red-500">Não foi possível carregar as receitas.</p>}
      {!data && !failed && <Loader />}

      {data && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(data.meals).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMeal(m);
                  setFlavor('');
                }}
                className={`px-4 py-2 rounded-full text-sm font-bold border ${m === meal ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-rose-400'}`}
              >
                {MEAL_PT[m]} <span className="opacity-70">fortalece {MOVE_PT[data.meals[m]]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {flavors.map((f) => (
              <button
                key={f}
                onClick={() => setFlavor(flavor === f ? '' : f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${FLAVOR_COLOR[f]} ${flavor === '' || flavor === f ? '' : 'opacity-40'}`}
              >
                {FLAVOR_PT[f] ?? f}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((r) => (
              <article key={r.n} className="rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-extrabold text-gray-800 dark:text-white leading-tight">{r.n}</h2>
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-extrabold ${FLAVOR_COLOR[r.f]}`}>{FLAVOR_PT[r.f] ?? r.f}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{r.d}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.ing.map((i) => (
                    <span key={i} className="flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      <Thumb name={i} />
                      {i}
                    </span>
                  ))}
                  {r.h && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      Ajudante: {SPECIALTY_PT[r.h] ?? r.h}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{r.meal === 'Smoothie' ? `Efeito: ${r.pp.replace('min', 'min').replace('seconds', 's')}` : `Recupera ${r.pp} PP`}</span>
                  {r.l > 0 && <span>{r.l} Pokémon gostam</span>}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <p className="mt-10 text-xs text-center text-gray-400">
        Receitas:{' '}
        <a className="underline" href="https://www.poketools.com/pokopia-recipes" target="_blank" rel="noopener noreferrer">poketools.com</a>. Nomes e descrições em inglês, como no jogo.
      </p>
    </div>
  );
};

export default PokopiaRecipes;
