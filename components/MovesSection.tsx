import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { fetchMachine, fetchMove } from '../services/pokeApi';
import { MoveDetail, PokemonMove } from '../types';
import { useGlobal } from '../context/GlobalContext';
import { cleanEffect, localizedName } from '../utils/pokemon';
import { gamesWithMoves, generationsOf, machineLabel, MOVE_TEXT, movesOfGame, MoveRef } from '../utils/moves';
import TypeBadge from './TypeBadge';

const BATCH = 10;

interface Row {
  ref: MoveRef;
  first?: string; // level or TM number
}

interface TableProps {
  title: string;
  firstHeader?: string;
  rows: Row[];
  details: Record<string, MoveDetail | null>;
}

const MoveTable: React.FC<TableProps> = ({ title, firstHeader, rows, details }) => {
  const { t, language } = useGlobal();
  const text = language === 'pt' ? MOVE_TEXT.pt : MOVE_TEXT.en;
  const [open, setOpen] = useState<string | null>(null);
  const cols = firstHeader ? 6 : 5;
  const categoryLabel = (name: string) => t.damageClass[name as keyof typeof t.damageClass] ?? name;

  return (
    <div className="bg-white dark:bg-dark-card p-3 sm:p-5 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
      <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-gray-400">
              {firstHeader && <th className="py-2 pr-1.5 sm:pr-3 font-bold">{firstHeader}</th>}
              <th className="py-2 pr-1.5 sm:pr-3 font-bold">{text.move}</th>
              <th className="py-2 pr-1.5 sm:pr-3 font-bold">{text.type}</th>
              <th className="py-2 pr-1.5 sm:pr-3 font-bold">{text.category}</th>
              <th className="py-2 pr-1.5 sm:pr-3 font-bold text-right">{text.power}</th>
              <th className="py-2 font-bold text-right">{text.accuracy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const detail = details[row.ref.name];
              const isOpen = open === `${index}-${row.ref.name}`;
              const effect = detail?.effect_entries.find((e) => e.language.name === 'en');
              return (
                <Fragment key={`${index}-${row.ref.name}`}>
                  <tr
                    onClick={() => setOpen(isOpen ? null : `${index}-${row.ref.name}`)}
                    className="border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    aria-expanded={isOpen}
                  >
                    {firstHeader && <td className="py-2 pr-1.5 sm:pr-3 font-mono text-gray-400">{row.first ?? '-'}</td>}
                    <td className="py-2 pr-1.5 sm:pr-3 font-semibold text-gray-800 dark:text-gray-100">{localizedName(detail?.names, language, row.ref.name)}</td>
                    <td className="py-2 pr-1.5 sm:pr-3">
                      {detail ? (
                        <div className="max-sm:[&>span]:px-1.5 max-sm:[&>span]:mr-0 max-sm:[&>span]:gap-1">
                          <TypeBadge type={detail.type.name} size="sm" />
                        </div>
                      ) : (
                        <span className="text-gray-300">...</span>
                      )}
                    </td>
                    <td className="py-2 pr-1.5 sm:pr-3 text-gray-600 dark:text-gray-300">
                      {detail?.damage_class ? (
                        <>
                          <span className="sm:hidden">{categoryLabel(detail.damage_class.name).slice(0, 3)}.</span>
                          <span className="hidden sm:inline">{categoryLabel(detail.damage_class.name)}</span>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 pr-1.5 sm:pr-3 text-right font-mono text-gray-600 dark:text-gray-300">{detail?.power ?? '-'}</td>
                    <td className="py-2 text-right font-mono text-gray-600 dark:text-gray-300">{detail?.accuracy ?? '-'}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50 dark:bg-gray-800/40">
                      <td colSpan={cols} className="px-3 py-2 text-gray-500 dark:text-gray-400">
                        {effect ? cleanEffect(effect.short_effect, detail?.effect_chance ?? null) : t.noEffect}
                        {detail?.pp ? ` (${t.pp}: ${detail.pp})` : ''}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Moves by generation and game (level up, TM, egg, tutor), like Pokémon Database.
const MovesSection: React.FC<{ moves: PokemonMove[] }> = ({ moves }) => {
  const { language } = useGlobal();
  const text = language === 'pt' ? MOVE_TEXT.pt : MOVE_TEXT.en;
  const games = useMemo(() => gamesWithMoves(moves), [moves]);
  const gens = useMemo(() => generationsOf(games), [games]);

  const [gameKey, setGameKey] = useState<string>(games[games.length - 1]?.key ?? '');
  const [details, setDetails] = useState<Record<string, MoveDetail | null>>({});
  const [machines, setMachines] = useState<Record<string, string>>({});

  // A different Pokémon: start again from its newest game
  useEffect(() => {
    setGameKey(games[games.length - 1]?.key ?? '');
    setDetails({});
    setMachines({});
  }, [games]);

  const gameMoves = useMemo(() => movesOfGame(moves, gameKey), [moves, gameKey]);
  const gen = games.find((g) => g.key === gameKey)?.gen ?? gens[gens.length - 1];

  // Loads the move details of the selected game, a few at a time, then the TM numbers
  useEffect(() => {
    if (!gameKey) return;
    let cancelled = false;
    const all = [...gameMoves.levelUp, ...gameMoves.machine, ...gameMoves.egg, ...gameMoves.tutor];
    const unique = [...new Map(all.map((m) => [m.name, m])).values()];

    (async () => {
      const loaded: Record<string, MoveDetail | null> = {};
      for (let i = 0; i < unique.length; i += BATCH) {
        const chunk = unique.slice(i, i + BATCH);
        const results = await Promise.all(chunk.map((m) => fetchMove(m.url)));
        if (cancelled) return;
        chunk.forEach((m, k) => (loaded[m.name] = results[k]));
        setDetails((prev) => ({ ...prev, ...Object.fromEntries(chunk.map((m, k) => [m.name, results[k]])) }));
      }
      for (let i = 0; i < gameMoves.machine.length; i += BATCH) {
        const chunk = gameMoves.machine.slice(i, i + BATCH);
        const items = await Promise.all(
          chunk.map(async (m) => {
            const machine = loaded[m.name]?.machines?.find((x) => x.version_group.name === gameKey);
            const data = machine ? await fetchMachine(machine.machine.url) : null;
            return [`${gameKey}:${m.name}`, data ? machineLabel(data.item.name) : ''] as const;
          })
        );
        if (cancelled) return;
        setMachines((prev) => ({ ...prev, ...Object.fromEntries(items) }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameKey, gameMoves]);

  if (games.length === 0) return null;

  const gamesOfGen = games.filter((g) => g.gen === gen);
  const pickGen = (next: number) => {
    const inGen = games.filter((g) => g.gen === next);
    setGameKey(inGen[inGen.length - 1].key);
  };

  const tables = [
    { id: 'level', title: text.levelUp, header: text.level, rows: gameMoves.levelUp.map((m) => ({ ref: m, first: m.level > 0 ? String(m.level) : '-' })) },
    { id: 'machine', title: text.machine, header: text.tm, rows: gameMoves.machine
        .map((m) => ({ ref: m, first: machines[`${gameKey}:${m.name}`] || '-' }))
        .sort((a, b) => (a.first === '-' ? 1 : 0) - (b.first === '-' ? 1 : 0) || a.first.localeCompare(b.first, 'en', { numeric: true })) },
    { id: 'egg', title: text.egg, header: undefined, rows: gameMoves.egg.map((m) => ({ ref: m })) },
    { id: 'tutor', title: text.tutor, header: undefined, rows: gameMoves.tutor.map((m) => ({ ref: m })) },
  ].filter((table) => table.rows.length > 0);

  return (
    <section aria-labelledby="moves-title">
      <h3 id="moves-title" className="text-2xl font-bold mb-4 text-gray-800 dark:text-white text-center">{text.title}</h3>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mr-1">{text.generation}</span>
        {gens.map((g) => (
          <button
            key={g}
            onClick={() => pickGen(g)}
            aria-pressed={g === gen}
            className={`w-9 h-9 rounded-full text-sm font-bold transition-colors ${g === gen ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {g}
          </button>
        ))}
      </div>

      <div role="tablist" className="flex flex-wrap justify-center gap-2 mb-6">
        {gamesOfGen.map((g) => (
          <button
            key={g.key}
            role="tab"
            aria-selected={g.key === gameKey}
            onClick={() => setGameKey(g.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${g.key === gameKey ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-400'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {tables.length === 0 ? (
        <p className="text-center text-gray-400">{text.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 items-start">
          {tables.map((table) => (
            <MoveTable key={`${gameKey}-${table.id}`} title={table.title} firstHeader={table.header} rows={table.rows} details={details} />
          ))}
        </div>
      )}
    </section>
  );
};

export default MovesSection;
