import React, { useEffect, useState } from 'react';
import { EyeOff } from 'lucide-react';
import { fetchAbility } from '../services/pokeApi';
import { AbilityDetail, PokemonAbility } from '../types';
import { useGlobal } from '../context/GlobalContext';
import { cleanEffect, localizedName } from '../utils/pokemon';
import Loader from './Loader';

const AbilitiesSection: React.FC<{ abilities: PokemonAbility[] }> = ({ abilities }) => {
  const { t, language } = useGlobal();
  const [details, setDetails] = useState<Record<string, AbilityDetail>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(abilities.map((a) => fetchAbility(a.ability.url))).then((results) => {
      if (cancelled) return;
      const map: Record<string, AbilityDetail> = {};
      results.forEach((detail) => {
        if (detail) map[detail.name] = detail;
      });
      setDetails(map);
    });
    return () => {
      cancelled = true;
    };
  }, [abilities]);

  return (
    <div className="bg-white dark:bg-dark-card p-5 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
      <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t.abilities}</h4>
      <ul className="space-y-3">
        {abilities.map((a) => {
          const detail = details[a.ability.name];
          const effect = detail?.effect_entries.find((e) => e.language.name === 'en');
          return (
            <li key={a.ability.name} className="text-sm">
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100">
                {localizedName(detail?.names, language, a.ability.name)}
                {a.is_hidden && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                    <EyeOff size={10} /> {t.hiddenAbility}
                  </span>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                {effect ? cleanEffect(effect.short_effect, null) : detail ? t.noEffect : <Loader size="sm" />}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AbilitiesSection;
