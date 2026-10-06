import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '../translations';
import { readStorage, writeStorage, removeStorage, isNumberArray } from '../utils/storage';

export const MAX_COMPARISON = 4;
export const MAX_TEAM = 6;

const LANGUAGE_CODES = ['en', 'pt', 'es', 'de', 'zh', 'ja'];

interface GlobalContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  comparisonList: number[];
  toggleComparison: (id: number) => void;
  clearComparison: () => void;
  team: number[];
  toggleTeamMember: (id: number) => void;
  clearTeam: () => void;
  isShinyMode: boolean;
  toggleShinyMode: () => void;
  shinyPokemon: number[];
  toggleShinyPokemon: (id: number) => void;
  t: typeof translations['en'];
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
        team,
        toggleTeamMember,
        clearTeam,
        isShinyMode,
        toggleShinyMode,
        shinyPokemon,
        toggleShinyPokemon,
        t,
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