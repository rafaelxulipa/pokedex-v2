import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '../translations';

interface GlobalContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  comparisonList: number[];
  toggleComparison: (id: number) => void;
  clearComparison: () => void;
  isShinyMode: boolean;
  toggleShinyMode: () => void;
  t: typeof translations['en'];
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language State - DEFAULT TO 'pt'
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    // Check if saved is a valid language key
    if (saved && ['en', 'pt', 'es', 'de', 'zh', 'ja'].includes(saved)) {
      return saved as Language;
    }
    return 'pt'; // Default to Portuguese
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Favorites State
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const newFavs = prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id];
      localStorage.setItem('favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  // Comparison State
  const [comparisonList, setComparisonList] = useState<number[]>(() => {
    const saved = localStorage.getItem('comparisonList');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleComparison = (id: number) => {
    setComparisonList((prev) => {
      let newList;
      if (prev.includes(id)) {
        newList = prev.filter((cid) => cid !== id);
      } else {
        if (prev.length >= 2) {
          newList = [prev[1], id]; 
        } else {
          newList = [...prev, id];
        }
      }
      localStorage.setItem('comparisonList', JSON.stringify(newList));
      return newList;
    });
  };

  const clearComparison = () => {
    setComparisonList([]);
    localStorage.removeItem('comparisonList');
  };

  // Shiny Mode State
  const [isShinyMode, setIsShinyMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isShinyMode');
    return saved === 'true';
  });

  const toggleShinyMode = () => {
    setIsShinyMode(prev => {
        const newValue = !prev;
        localStorage.setItem('isShinyMode', String(newValue));
        return newValue;
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
        isShinyMode,
        toggleShinyMode,
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