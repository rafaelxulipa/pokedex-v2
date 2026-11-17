import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home as HomeIcon, BookOpen, Search } from 'lucide-react';
import Seo from '../components/Seo';

// Shown for unknown URLs. The host answers every path with index.html (status 200), so
// "noindex" keeps these URLs out of search engines.
const NotFound: React.FC<{ message?: string }> = ({ message }) => {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <Seo title="Página não encontrada" description="A página que você procura não existe ou foi movida." path="/404" />
      <div className="relative w-28 h-28 mb-6 animate-bounce" aria-hidden="true">
        <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-gray-900 dark:border-gray-200 bg-white shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500" />
          <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-gray-900 dark:bg-gray-200" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-4 border-gray-900 dark:border-gray-200 flex items-center justify-center text-gray-900 font-black text-sm">?</div>
      </div>
      <p className="text-7xl md:text-8xl font-extrabold text-red-500 mb-2">404</p>
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white mb-3">Esse Pokémon fugiu!</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        {message ?? 'A página que você procura não existe, foi movida ou o endereço está errado.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors">
          <HomeIcon size={18} /> Voltar para a Pokédex
        </Link>
        <Link to="/detonados" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <BookOpen size={18} /> Detonados
        </Link>
        <Link to="/lets-go" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <Search size={18} /> Let's Go
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
