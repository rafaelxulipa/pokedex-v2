import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, Plus, X, Search, Trash2, ShieldAlert, Link2, Check } from 'lucide-react';
import { useGlobal, MAX_TEAM } from '../context/GlobalContext';
import { fetchAllPokemonNames, fetchMultiplePokemon, fetchTypeByName, pokemonUrl } from '../services/pokeApi';
import { PokemonDetail, PokemonListEntry, TypeDetail } from '../types';
import { ALL_TYPES, defensiveMultipliers } from '../utils/typeChart';
import { idFromUrl, SPRITE_BASE, formatName } from '../utils/pokemon';
import TypeBadge from '../components/TypeBadge';
import Loader from '../components/Loader';
import { parseTeam, serializeTeam } from '../utils/team';

const MAX_RESULTS = 12;

const Team: React.FC = () => {
  const { t, localName, team, toggleTeamMember, clearTeam, setTeamMembers } = useGlobal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingImport, setPendingImport] = useState<number[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<PokemonDetail[]>([]);
  const [typeDetails, setTypeDetails] = useState<Record<string, TypeDetail>>({});
  const [allNames, setAllNames] = useState<PokemonListEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // A shared link (#/team?ids=6,25,94) imports a team. If the user already has one, ask first.
  useEffect(() => {
    const shared = searchParams.get('ids');
    if (shared === null) return;
    const ids = parseTeam(shared);
    setSearchParams({}, { replace: true });
    if (ids.length === 0) return;
    if (team.length === 0) setTeamMembers(ids);
    else setPendingImport(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/team?ids=${serializeTeam(team)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (insecure context): fall back to a temporary textarea
      const area = document.createElement('textarea');
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Search list and type chart are loaded once
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllPokemonNames(), Promise.all(ALL_TYPES.map((type) => fetchTypeByName(type)))]).then(([names, types]) => {
      if (cancelled) return;
      setAllNames(names);
      const map: Record<string, TypeDetail> = {};
      types.forEach((detail) => {
        if (detail) map[detail.name] = detail;
      });
      setTypeDetails(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Member details follow the team list
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMultiplePokemon(team.map((id) => pokemonUrl(id))).then((data) => {
      if (cancelled) return;
      // keep the order of the team list
      setMembers(team.map((id) => data.find((p) => p.id === id)).filter((p): p is PokemonDetail => !!p));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [team]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, '');
    if (!term) return [];
    const isNumeric = /^\d+$/.test(term);
    return allNames
      .filter((p) => (isNumeric ? idFromUrl(p.url) === parseInt(term, 10) : p.name.includes(term)))
      .slice(0, MAX_RESULTS);
  }, [search, allNames]);

  // For each attacking type: how many members are weak / resist / immune
  const coverage = useMemo(() => {
    const rows = ALL_TYPES.map((type) => ({ type, weak: 0, resists: 0, immune: 0 }));
    members.forEach((member) => {
      const multipliers = defensiveMultipliers(member.types.map((ty) => typeDetails[ty.type.name] ?? null));
      rows.forEach((row) => {
        const m = multipliers[row.type];
        if (m === 0) row.immune++;
        else if (m > 1) row.weak++;
        else if (m < 1) row.resists++;
      });
    });
    return rows;
  }, [members, typeDetails]);

  const risky = coverage.filter((row) => row.weak >= 3);
  const averageStats = members.length
    ? Math.round(members.reduce((sum, p) => sum + p.stats.reduce((a, s) => a + s.base_stat, 0), 0) / members.length)
    : 0;
  const slots = Array.from({ length: MAX_TEAM }, (_, i) => members[i] ?? null);
  const teamFull = team.length >= MAX_TEAM;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-8">
        <Users className="mx-auto h-16 w-16 mb-4 text-green-500" />
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">{t.team.title}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t.team.subtitle}</p>
      </div>

      {pendingImport && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
          <p className="mb-3 font-medium">{t.team.importPrompt.replace('{n}', String(pendingImport.length))}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setTeamMembers(pendingImport); setPendingImport(null); }}
              className="px-4 py-2 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              {t.team.importReplace}
            </button>
            <button
              onClick={() => setPendingImport(null)}
              className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t.team.importKeep}
            </button>
          </div>
        </div>
      )}

      {/* Slots */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {slots.map((member, i) =>
          member ? (
            <div key={member.id} className="relative flex flex-col items-center p-3 bg-white dark:bg-dark-card rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800">
              <button
                onClick={() => toggleTeamMember(member.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                title={t.team.remove}
                aria-label={t.team.remove}
              >
                <X size={16} />
              </button>
              <Link to={`/pokemon/${member.id}`} className="flex flex-col items-center">
                <img src={member.sprites.other['official-artwork'].front_default || member.sprites.front_default} alt={member.name} className="w-20 h-20 object-contain" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-full">{localName(member)}</span>
              </Link>
              <div className="flex flex-wrap justify-center mt-1">
                {member.types.map((ty) => <TypeBadge key={ty.slot} type={ty.type.name} size="sm" />)}
              </div>
            </div>
          ) : (
            <div key={`empty-${i}`} className="flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 text-sm">
              {loading && i < team.length ? <Loader /> : <><Plus size={20} className="mb-1" />{t.team.empty}</>}
            </div>
          )
        )}
      </div>

      {/* Search */}
      <div className="mb-8 bg-white dark:bg-dark-card p-4 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.team.search}
              className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
          {team.length > 0 && (
            <button onClick={copyLink} className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
              {copied ? <Check size={16} /> : <Link2 size={16} />}
              <span className="hidden sm:inline">{copied ? t.team.linkCopied : t.team.share}</span>
            </button>
          )}
          {team.length > 0 && (
            <button onClick={clearTeam} className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              <Trash2 size={16} /> <span className="hidden sm:inline">{t.team.clear}</span>
            </button>
          )}
        </div>
        {teamFull && search && <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">{t.team.full}</p>}
        {results.length > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {results.map((p) => {
              const id = idFromUrl(p.url);
              const inTeam = team.includes(id);
              return (
                <button
                  key={p.name}
                  onClick={() => toggleTeamMember(id)}
                  disabled={!inTeam && teamFull}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${inTeam ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-green-500'}`}
                >
                  <img src={`${SPRITE_BASE}/${id}.png`} alt="" loading="lazy" className="w-14 h-14 object-contain" />
                  <span className="text-xs font-semibold capitalize text-gray-600 dark:text-gray-300 truncate max-w-full">{formatName(p.name)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Analysis */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{t.team.coverage}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.team.hint}</p>

        {members.length === 0 ? (
          <p className="text-center text-gray-400 py-6">{t.team.noMembers}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{t.team.members}: <b>{members.length}/{MAX_TEAM}</b></span>
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{t.team.avg}: <b>{averageStats}</b></span>
            </div>

            <div className={`flex items-start gap-2 mb-6 p-3 rounded-xl text-sm ${risky.length ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'}`}>
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              {risky.length ? (
                <div>
                  <b>{t.team.risk}:</b>
                  <div className="mt-1 flex flex-wrap">{risky.map((row) => <TypeBadge key={row.type} type={row.type} size="sm" />)}</div>
                </div>
              ) : (
                <span>{t.team.noRisk}</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-400">
                    <th className="text-left py-2 pr-2"></th>
                    <th className="py-2 px-2 text-red-500">{t.team.weak}</th>
                    <th className="py-2 px-2 text-blue-500">{t.team.resists}</th>
                    <th className="py-2 px-2 text-gray-500">{t.team.immune}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {coverage.map((row) => (
                    <tr key={row.type}>
                      <td className="py-1.5 pr-2"><TypeBadge type={row.type} size="sm" /></td>
                      <td className={`text-center font-bold ${row.weak >= 3 ? 'text-red-500' : row.weak > 0 ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}`}>{row.weak || '-'}</td>
                      <td className={`text-center font-bold ${row.resists > 0 ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>{row.resists || '-'}</td>
                      <td className={`text-center font-bold ${row.immune > 0 ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>{row.immune || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Team;
