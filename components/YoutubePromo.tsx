import React, { useState } from 'react';
import { Youtube, X } from 'lucide-react';
import { readStorage, writeStorage } from '../utils/storage';

export const YOUTUBE_URL = 'https://www.youtube.com/@otaviodiariogamer';
const DISMISS_KEY = 'youtube-promo-dismissed';

interface Props {
  variant: 'home' | 'guide';
  className?: string;
}

const YoutubePromo: React.FC<Props> = ({ variant, className = '' }) => {
  const [dismissed, setDismissed] = useState(() => variant === 'home' && readStorage<boolean>(DISMISS_KEY, false));
  if (dismissed) return null;

  const title = variant === 'guide' ? 'Estou jogando este jogo ao vivo!' : 'Lives de Pokémon FireRed no YouTube';
  const text = variant === 'guide'
    ? 'Acompanhe a jornada em FireRed no canal Otávio Diário Gamer e tire dúvidas com a gente no chat.'
    : 'Venha jogar comigo no canal Otávio Diário Gamer. Lives de Pokémon FireRed e muito mais.';

  return (
    <div className={`relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 pr-10 rounded-2xl bg-white dark:bg-dark-card border border-red-200 dark:border-red-900/50 shadow-xs ${className}`}>
      <div className="shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-600 text-white">
        <Youtube size={26} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      </div>
      <a
        href={YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-center px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
      >
        Ver canal
      </a>
      {variant === 'home' && (
        <button
          type="button"
          onClick={() => { writeStorage(DISMISS_KEY, true); setDismissed(true); }}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default YoutubePromo;
