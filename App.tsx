import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { GlobalProvider, useGlobal } from './context/GlobalContext';
import Home from './pages/Home';
import PokemonDetails from './pages/PokemonDetails';
import Compare from './pages/Compare';
import MemoryGame from './pages/MemoryGame';
import Quiz from './pages/Quiz';
import Team from './pages/Team';
import Guides from './pages/Guides';
import Guide from './pages/Guide';
import Seo from './components/Seo';
import RotomCursor from './components/RotomCursor';
import { Moon, Sun, ChevronDown, Check, BrainCircuit, HelpCircle, Users, BookOpen } from 'lucide-react';
import { Language } from './translations';

// Language Options with Flags
const LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useGlobal();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
           <div className="relative w-9 h-9 transition-transform group-hover:rotate-12 duration-300">
             <div className="absolute inset-0 bg-linear-to-br from-red-500 to-red-600 rounded-full shadow-lg"></div>
             <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-900 z-10"></div>
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-[3px] border-gray-900 rounded-full z-20"></div>
           </div>
           <span className="hidden min-[420px]:inline text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            <span className="text-red-500">Rotom</span> Pokedex
           </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Feature links */}
          {[
            { to: '/detonados', title: t.guides.title, icon: <BookOpen size={20} /> },
            { to: '/team', title: t.team.title, icon: <Users size={20} /> },
            { to: '/quiz', title: t.quiz.title, icon: <HelpCircle size={20} /> },
            { to: '/memory-game', title: t.memoryGame.title, icon: <BrainCircuit size={20} /> },
          ].map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `p-2 sm:p-2.5 rounded-xl transition-all hover:scale-110 shadow-xs border ${
                  isActive
                    ? 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`
              }
              title={link.title}
              aria-label={link.title}
            >
              {link.icon}
            </NavLink>
          ))}

          {/* Custom Language Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700"
            >
                <span className="text-lg leading-none">{currentLang.flag}</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:inline">{currentLang.name}</span>
                <ChevronDown size={14} className={`text-gray-500 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1 animate-fade-in z-50">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code);
                                setIsLangMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${language === lang.code ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl leading-none">{lang.flag}</span>
                                <span>{lang.name}</span>
                            </div>
                            {language === lang.code && <Check size={16} />}
                        </button>
                    ))}
                </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-110 shadow-xs border border-gray-200 dark:border-gray-700"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'light' ? <Moon size={20} fill="currentColor" className="text-gray-400" /> : <Sun size={20} fill="currentColor" />}
          </button>
        </div>
      </div>
    </header>
  );
};

// Old links used the hash router (/#/team). Send them to the clean URL.
const LegacyHashRedirect: React.FC = () => {
  const location = useLocation();
  if (location.pathname === '/' && location.hash.startsWith('#/')) {
    return <Navigate to={location.hash.slice(1)} replace />;
  }
  return null;
};

const Footer: React.FC = () => {
    const { t } = useGlobal();
    return (
        <footer className="py-12 mt-auto text-center border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card transition-colors">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                © {new Date().getFullYear()} Rotom Pokedex. <span className="text-red-500">♥</span> {t.footer}
            </p>
        </footer>
    );
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <GlobalProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0f0f0f] transition-colors duration-300 font-sans selection:bg-red-500 selection:text-white cursor-none-if-needed">
            <LegacyHashRedirect />
            <RotomCursor />
            <Header />
            <main className="grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/pokemon/:id" element={<PokemonDetails />} />
                <Route path="/compare" element={<><Seo title="Comparar Pokémon" description="Compare o status, os tipos e as habilidades de 2 a 4 Pokémon lado a lado." path="/compare" /><Compare /></>} />
                <Route path="/memory-game" element={<><Seo title="Jogo da Memória Pokémon" description="Jogo da memória com Pokémon: três níveis, escolha de geração, modo shiny e recordes." path="/memory-game" /><MemoryGame /></>} />
                <Route path="/quiz" element={<><Seo title="Quiz: Quem é esse Pokémon?" description="Adivinhe o Pokémon pela silhueta. Modo livre por geração e desafio do dia com as mesmas perguntas para todos." path="/quiz" /><Quiz /></>} />
                <Route path="/team" element={<><Seo title="Montador de Time Pokémon" description="Monte um time de até 6 Pokémon e veja as fraquezas e a cobertura de tipos. Compartilhe o time por link." path="/team" /><Team /></>} />
                <Route path="/detonados" element={<Guides />} />
                <Route path="/detonados/:slug" element={<Guide />} />
                <Route path="/detonados/:slug/:n" element={<Guide />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </GlobalProvider>
    </ThemeProvider>
  );
};

export default App;
