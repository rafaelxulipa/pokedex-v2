import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchMove } from '../services/pokeApi';
import { MoveDetail, PokemonMove } from '../types';
import { useGlobal } from '../context/GlobalContext';
import { cleanEffect, idFromUrl, localizedName } from '../utils/pokemon';
import TypeBadge from './TypeBadge';

const INITIAL_VISIBLE = 10;

interface LevelUpMove {
  name: string;
  url: string;
  level: number;
}

// Level-up moves of the most recent game that has any (highest version group id)
export const getLevelUpMoves = (moves: PokemonMove[]): LevelUpMove[] => {
  let latest = 0;
  moves.forEach((m) =>
    m.version_group_details.forEach((d) => {
      if (d.move_learn_method.name === 'level-up') latest = Math.max(latest, idFromUrl(d.version_group.url));
    })
  );

  const result: LevelUpMove[] = [];
  moves.forEach((m) => {
    const entry = m.version_group_details.find(
      (d) => d.move_learn_method.name === 'level-up' && idFromUrl(d.version_group.url) === latest
    );
    if (entry) result.push({ name: m.move.name, url: m.move.url, level: entry.level_learned_at });
  });
  return result.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
};

const MovesSection: React.FC<{ moves: PokemonMove[] }> = ({ moves }) => {
  const { t, language } = useGlobal();
  const list = useMemo(() => getLevelUpMoves(moves), [moves]);
  const [showAll, setShowAll] = useState(false);
  const [openMove, setOpenMove] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, MoveDetail | null>>({});

  if (list.length === 0) return null;
  const visible = showAll ? list : list.slice(0, INITIAL_VISIBLE);

  const toggle = async (move: LevelUpMove) => {
    if (openMove === move.name) {
      setOpenMove(null);
      return;
    }
    setOpenMove(move.name);
    if (!(move.name in details)) {
      const detail = await fetchMove(move.url);
      setDetails((prev) => ({ ...prev, [move.name]: detail }));
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card p-5 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
      <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t.movesTitle}</h4>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {visible.map((move) => {
          const detail = details[move.name];
          const isOpen = openMove === move.name;
          const effect = detail?.effect_entries.find((e) => e.language.name === 'en');
          return (
            <li key={move.name}>
              <button
                onClick={() => toggle(move)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 py-2.5 text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span className="w-10 shrink-0 text-xs font-mono text-gray-400">{move.level > 0 ? `${t.lvl} ${move.level}` : '-'}</span>
                <span className="flex-1 font-semibold text-gray-800 dark:text-gray-100">
                  {localizedName(detail?.names, language, move.name)}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="pb-3 pl-13 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
                  {detail === undefined ? (
                    '...'
                  ) : detail === null ? (
                    t.noEffect
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1.5">
                        <TypeBadge type={detail.type.name} size="sm" />
                        {detail.damage_class && (
                          <span className="font-semibold">{t.damageClass[detail.damage_class.name as keyof typeof t.damageClass] ?? detail.damage_class.name}</span>
                        )}
                        <span>{t.power}: <b>{detail.power ?? '-'}</b></span>
                        <span>{t.accuracy}: <b>{detail.accuracy ?? '-'}</b></span>
                        <span>{t.pp}: <b>{detail.pp ?? '-'}</b></span>
                      </div>
                      <p>{effect ? cleanEffect(effect.short_effect, detail.effect_chance) : t.noEffect}</p>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {list.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showAll ? t.showLess : `${t.showAll} (${list.length})`}
        </button>
      )}
    </div>
  );
};

export default MovesSection;
