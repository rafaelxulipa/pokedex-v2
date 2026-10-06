import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '../translations';
import { fetchSpeciesNames } from '../services/pokeApi';
import { idFromUrl, formatName } from '../utils/pokemon';
import { readStorage, writeStorage, removeStorage, isNumberArray } from '../utils/storage';

import { MAX_COMPARISON, MAX_TEAM } from '../constants';
export { MAX_COMPARISON, MAX_TEAM };

const LANGUAGE_CODES = ['en', 'pt', 'es', 'de', 'zh', 'ja'];

interface GlobalContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  comparisonList: number[];
  toggleComparison: (id: number) => void;
  clearComparison: () => void;
  setComparison: (ids: number[]) => void;
  team: number[];
  toggleTeamMember: (id: number) => void;
  clearTeam: () => void;
  setTeamMembers: (ids: number[]) => void;
  isShinyMode: boolean;
  toggleShinyMode: () => void;
  shinyPokemon: number[];
  toggleShinyPokemon: (id: number) => void;
  t: typeof translations['en'];
  // Name of a Pokemon in the selected language (alternate forms keep their English name)
  localName: (pokemon: { id: number; name: string; species: { url: string } }) => string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language State - DEFAULT TO 'pt'
  const [language, setLanguageState] = useState<Language>(() => {
    // Stored as a plain string (not JSON) by previous versions, so it is read raw
    try {
      const saved = localStorage.getItem('language');
      if (saved && LANGUAGE_CODES.includes(saved)) return saved as Language;
    } catch {
      // storage blocked
    }
    return 'pt';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('language', lang);
    } catch {
      // storage blocked
    }
  };

  // Favorites State
  const [favorites, setFavorites] = useState<number[]>(() => readStorage<number[]>('favorites', [], isNumberArray));

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const newFavs = prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id];
      writeStorage('favorites', newFavs);
      return newFavs;
    });
  };

  // Comparison State
  const [comparisonList, setComparisonList] = useState<number[]>(() =>
    readStorage<number[]>('comparisonList', [], isNumberArray).slice(-MAX_COMPARISON)
  );

  const toggleComparison = (id: number) => {
    setComparisonList((prev) => {
      let newList;
      if (prev.includes(id)) {
        newList = prev.filter((cid) => cid !== id);
      } else {
        if (prev.length >= MAX_COMPARISON) {
          newList = [...prev.slice(1), id];
        } else {
          newList = [...prev, id];
        }
      }
      writeStorage('comparisonList', newList);
      return newList;
    });
  };

  const setComparison = (ids: number[]) => {
    const list = ids.slice(0, MAX_COMPARISON);
    setComparisonList(list);
    writeStorage('comparisonList', list);
  };

  const clearComparison = () => {
    setComparisonList([]);
    removeStorage('comparisonList');
  };

  // Team State (max 6 members)
  const [team, setTeam] = useState<number[]>(() => readStorage<number[]>('team', [], isNumberArray).slice(0, MAX_TEAM));

  const toggleTeamMember = (id: number) => {
    setTeam((prev) => {
      let newTeam: number[];
      if (prev.includes(id)) {
        newTeam = prev.filter((tid) => tid !== id);
      } else if (prev.length >= MAX_TEAM) {
        return prev;
      } else {
        newTeam = [...prev, id];
      }
      writeStorage('team', newTeam);
      return newTeam;
    });
  };

  const setTeamMembers = (ids: number[]) => {
    const list = ids.slice(0, MAX_TEAM);
    setTeam(list);
    writeStorage('team', list);
  };

  const clearTeam = () => {
    setTeam([]);
    removeStorage('team');
  };

  // Shiny Mode State (Global)
  const [isShinyMode, setIsShinyMode] = useState<boolean>(() => readStorage<boolean>('isShinyMode', false, (v) => typeof v === 'boolean'));

  const toggleShinyMode = () => {
    setIsShinyMode(prev => {
        const newValue = !prev;
        writeStorage('isShinyMode', newValue);
        return newValue;
    });
  };

  // Individual Shiny Pokemon State
  const [shinyPokemon, setShinyPokemon] = useState<number[]>(() => readStorage<number[]>('shinyPokemon', [], isNumberArray));

  const toggleShinyPokemon = (id: number) => {
    setShinyPokemon((prev) => {
        const newList = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
        writeStorage('shinyPokemon', newList);
        return newList;
    });
  };

  const t = translations[language];

  // Translated species names for the selected language (pt has none, so it stays in English)
  const [speciesNames, setSpeciesNames] = useState<Record<number, string>>({});
  useEffect(() => {
    let cancelled = false;
    setSpeciesNames({});
    fetchSpeciesNames(language).then((names) => {
      if (!cancelled) setSpeciesNames(names);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const localName = (pokemon: { id: number; name: string; species: { url: string } }) => {
    const speciesId = idFromUrl(pokemon.species.url);
    const translated = pokemon.id === speciesId ? speciesNames[speciesId] : undefined;
    return translated || formatName(pokemon.name);
  };

  return (
    <GlobalContext.Provider
      value={{
        language,
        setLanguage,
        favorites,
        toggleFavorite,
        comparisonList,
        toggleComparison,
        clearComparison,
        setComparison,
        team,
        toggleTeamMember,
        clearTeam,
        setTeamMembers,
        isShinyMode,
        toggleShinyMode,
        shinyPokemon,
        toggleShinyPokemon,
        t,
        localName,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};