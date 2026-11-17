import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { fetchLetsGoLocations } from '../services/pokeApi';
import { LETS_GO_TEXT, LetsGoLocationData, LocationEntry, locationRows, readLetsGoLang, translateLocation } from '../utils/letsGo';

interface LetsGoLocationsProps {
  id: number;
  name: string;
}

const GAME_BADGE = {
  pikachu: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  eevee: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  both: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

// "Where to find X": Let's Go Pikachu/Eevee first, then every other game. Follows the language chosen on /lets-go.
const LetsGoLocations: React.FC<LetsGoLocationsProps> = ({ id, name }) => {
  const [data, setData] = useState<LetsGoLocationData | null | undefined>(undefined);
  const lang = useMemo(readLetsGoLang, []);
  const text = LETS_GO_TEXT[lang];

  useEffect(() => {
    let cancelled = false;
    setData(undefined);
    fetchLetsGoLocations().then((map) => {
      if (!cancelled) setData(map?.[id] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (data === null) return null;

  const gameLabel = { both: text.both, pikachu: text.pikachu, eevee: text.eevee };

  const content = (entry: LocationEntry) => {
    if ('ev' in entry) return <span className="text-gray-700 dark:text-gray-200">{text.evolve(entry.ev)}</span>;
    if ('tr' in entry) return <span className="text-gray-700 dark:text-gray-200">{text.trade}</span>;
    if ('na' in entry) return <span className="text-gray-400">{text.notAvailable}</span>;
    if ('nd' in entry) return <span className="text-gray-400">{text.noDataYet}</span>;
    return (
      <ul className="flex flex-wrap gap-1.5">
        {entry.l.map((place) => (
          <li key={place} className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
            {translateLocation(place, lang)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className="mb-12" aria-labelledby="lets-go-where">
      <h3 id="lets-go-where" className="text-2xl font-bold mb-1 text-gray-800 dark:text-white text-center flex items-center justify-center gap-2">
        <MapPin size={22} className="text-red-500" /> {text.where(name)}
      </h3>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
        {text.whereHint}{' '}
        <Link to="/lets-go" className="text-blue-500 hover:underline">{text.openDex}</Link>
      </p>

      {data === undefined ? (
        <div className="h-24 rounded-3xl bg-gray-50 dark:bg-dark-card/50 animate-pulse" />
      ) : (
        <div className="bg-gray-50 dark:bg-dark-card/50 rounded-3xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {locationRows(data).map((row) => (
            <div key={row.games} className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-5">
              <div className="sm:w-52 shrink-0">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${GAME_BADGE[row.games]}`}>{gameLabel[row.games]}</span>
              </div>
              <div className="grow">{content(row.entry)}</div>
            </div>
          ))}

          {data.o.length > 0 && (
            <>
              <h4 className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">{text.otherGames}</h4>
              {data.o.map(([games, entry]) => (
                <div key={games} className="flex flex-col sm:flex-row gap-1 sm:gap-6 px-5 py-3">
                  <div className="sm:w-52 shrink-0 text-sm font-semibold text-gray-600 dark:text-gray-300">{games}</div>
                  <div className="grow text-sm">{content(entry)}</div>
                </div>
              ))}
            </>
          )}
          <p className="px-5 py-3 text-xs text-gray-400">{text.source}</p>
        </div>
      )}
    </section>
  );
};

export default LetsGoLocations;
