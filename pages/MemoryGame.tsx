
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { BrainCircuit, CheckCircle, RefreshCw, Trophy, Clock, Play, AlertTriangle, Star } from 'lucide-react';
import Loader from '../components/Loader';

type GameState = 'setup' | 'playing' | 'won' | 'lost';
type Level = 'easy' | 'medium' | 'hard';

interface Card {
  id: number; // Pokémon ID
  sprite: string;
  isFlipped: boolean;
  isMatched: boolean;
  uniqueId: string; // To differentiate between two cards of the same Pokémon
}

const LEVELS: Record<Level, { pairs: number; cols: string }> = {
  easy: { pairs: 6, cols: 'grid-cols-4' },
  medium: { pairs: 10, cols: 'grid-cols-5' },
  hard: { pairs: 15, cols: 'grid-cols-6' },
};

const LEVEL_TIMES: Record<Level, number> = {
  easy: 90,   // 1:30
  medium: 120, // 2:00
  hard: 150,  // 2:30
};

const MAX_POKEMON_ID = 898; // Limit to avoid missing sprites or complex forms

// Fisher-Yates Shuffle Algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const MemoryGame: React.FC = () => {
  const { t } = useGlobal();
  const [gameState, setGameState] = useState<GameState>('setup');
  const [level, setLevel] = useState<Level | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [stage, setStage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setupGame = useCallback(async (selectedLevel: Level, isNextStage = false) => {
    setLoading(true);
    
    if (!isNextStage) {
        setStage(1);
    } else {
        setStage(prev => prev + 1);
    }

    setLevel(selectedLevel);
    setTime(LEVEL_TIMES[selectedLevel]);
    setCards([]);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);

    const { pairs } = LEVELS[selectedLevel];
    const uniqueIds = new Set<number>();
    while (uniqueIds.size < pairs) {
      uniqueIds.add(Math.floor(Math.random() * MAX_POKEMON_ID) + 1);
    }
    const pokemonIds = Array.from(uniqueIds);

    const gameCards: Card[] = pokemonIds.flatMap(id => {
        const cardData = {
            id,
            sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
            isFlipped: false,
            isMatched: false
        };
        return [
            { ...cardData, uniqueId: `${id}-a` },
            { ...cardData, uniqueId: `${id}-b` }
        ];
    });
    
    setCards(shuffleArray(gameCards));
    setGameState('playing');
    setLoading(false);
  }, []);

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing') {
        timerRef.current = setInterval(() => {
            setTime(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timerRef.current!);
                    setGameState('lost');
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    } else if (timerRef.current) {
        clearInterval(timerRef.current);
    }

    return () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };
  }, [gameState]);

  useEffect(() => {
    if (flippedCards.length !== 2) return;

    setIsChecking(true);
    setMoves(prev => prev + 1);

    const [firstIndex, secondIndex] = flippedCards;
    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (firstCard.id === secondCard.id) {
      setTimeout(() => {
        setCards(prevCards =>
          prevCards.map((card, index) =>
            index === firstIndex || index === secondIndex ? { ...card, isMatched: true } : card
          )
        );
        setMatchedPairs(prev => prev + 1);
        setFlippedCards([]);
        setIsChecking(false);
      }, 800);
    } else {
      setTimeout(() => {
        setCards(prevCards =>
          prevCards.map((card, index) =>
            index === firstIndex || index === secondIndex ? { ...card, isFlipped: false } : card
          )
        );
        setFlippedCards([]);
        setIsChecking(false);
      }, 1200);
    }
  }, [flippedCards, cards]);
  
  // Check for win condition
  useEffect(() => {
    if (level && matchedPairs === LEVELS[level].pairs && cards.length > 0) {
      setTimeout(() => setGameState('won'), 500);
    }
  }, [matchedPairs, level, cards]);

  const handleCardClick = (index: number) => {
    if (gameState === 'lost' || isChecking || cards[index].isFlipped || cards[index].isMatched || flippedCards.length >= 2) return;

    const newFlippedCards = [...flippedCards, index];
    setCards(prev => prev.map((card, i) => i === index ? { ...card, isFlipped: true } : card));
    setFlippedCards(newFlippedCards);
  };
  
  const resetToMenu = () => {
    setGameState('setup');
    setLevel(null);
  };
  
  if (gameState === 'setup') {
    return (
        <div className="container mx-auto px-4 py-12 text-center animate-fade-in">
            <BrainCircuit className="mx-auto h-20 w-20 mb-6 text-blue-500" />
            <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-4">{t.memoryGame.title}</h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-10">{t.memoryGame.selectLevel}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-lg mx-auto">
                {(Object.keys(LEVELS) as Level[]).map(lvl => (
                    <button 
                        key={lvl}
                        onClick={() => setupGame(lvl)}
                        className="w-full px-8 py-5 text-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-300"
                    >
                        {t.memoryGame[lvl]}
                    </button>
                ))}
            </div>
        </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  
  const totalPairs = level ? LEVELS[level].pairs : 0;
  
  return (
    <div className="container mx-auto px-4 py-8">
        {/* Win Modal */}
        {gameState === 'won' && (
             <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white dark:bg-dark-card p-10 rounded-3xl shadow-2xl text-center max-w-md mx-4 transform scale-100 transition-transform">
                    <Trophy className="mx-auto h-24 w-24 text-yellow-400 mb-4 animate-bounce" />
                    <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-3">{t.memoryGame.winTitle}</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">{t.memoryGame.winMessage}</p>
                    <div className="flex justify-center gap-6 text-lg font-semibold mb-8">
                        <span className="text-blue-500">{t.memoryGame.moves}: {moves}</span>
                        <span className="text-purple-500">{t.memoryGame.timer}: {formatTime(time)}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setupGame(level!, true)}
                            className="w-full px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg hover:scale-105 transform transition-all flex items-center justify-center gap-2"
                        >
                           <Play size={20} /> {t.memoryGame.nextStage}
                        </button>
                        <button
                            onClick={resetToMenu}
                            className="w-full px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t.memoryGame.playAgain}
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Lost Modal */}
        {gameState === 'lost' && (
             <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white dark:bg-dark-card p-10 rounded-3xl shadow-2xl text-center max-w-md mx-4 transform scale-100 transition-transform">
                    <AlertTriangle className="mx-auto h-24 w-24 text-red-500 mb-4" />
                    <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-3">{t.memoryGame.gameOverTitle}</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">{t.memoryGame.gameOverMessage}</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setupGame(level!, false)}
                            className="w-full px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg hover:scale-105 transform transition-all flex items-center justify-center gap-2"
                        >
                           <RefreshCw size={20} /> {t.memoryGame.tryAgain}
                        </button>
                        <button
                            onClick={resetToMenu}
                            className="w-full px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t.memoryGame.playAgain}
                        </button>
                    </div>
                </div>
            </div>
        )}


      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t.memoryGame.title}</h1>
        <div className="flex items-center gap-4 md:gap-6 bg-white dark:bg-dark-card p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
             <div className="text-center">
                <div className="text-xs font-bold text-gray-400 uppercase flex items-center justify-center gap-1"><Star size={12} /> {t.memoryGame.stage}</div>
                <div className="text-2xl font-black text-gray-700 dark:text-gray-300">{stage}</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
             <div className="text-center">
                <div className="text-xs font-bold text-gray-400 uppercase flex items-center justify-center gap-1"><Clock size={12} /> {t.memoryGame.timer}</div>
                <div className="text-2xl font-black text-gray-700 dark:text-gray-300 font-mono">{formatTime(time)}</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-center">
                <div className="text-xs font-bold text-gray-400 uppercase">{t.memoryGame.moves}</div>
                <div className="text-2xl font-black text-blue-500">{moves}</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-center">
                <div className="text-xs font-bold text-gray-400 uppercase">{t.memoryGame.matched}</div>
                <div className="text-2xl font-black text-green-500">{matchedPairs} / {totalPairs}</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
             <button onClick={resetToMenu} className="p-3 bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                <RefreshCw size={24}/>
            </button>
        </div>
      </div>
      
      <div className={`grid gap-3 md:gap-4 mx-auto ${level ? LEVELS[level].cols : ''} max-w-5xl transition-opacity duration-500 ${gameState === 'lost' ? 'opacity-40 pointer-events-none' : ''}`}>
        {cards.map((card, index) => (
            <div key={card.uniqueId} className="w-full aspect-square perspective-1000 group" onClick={() => handleCardClick(index)}>
                <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${card.isFlipped || card.isMatched ? 'rotate-y-180' : ''}`}>
                    {/* Card Back */}
                    <div className="absolute w-full h-full backface-hidden flex items-center justify-center bg-white dark:bg-dark-card rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                        <div className="relative w-1/2 h-1/2">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-full"></div>
                            <div className="absolute top-1/2 left-0 right-0 h-1/6 bg-gray-900 z-10"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-white border-[8%] border-gray-900 rounded-full z-20"></div>
                        </div>
                    </div>
                    {/* Card Front */}
                    <div className={`absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center rounded-2xl shadow-lg border-2 p-2 ${card.isMatched ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'}`}>
                         {card.isMatched && (
                             <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1 z-20">
                                 <CheckCircle size={16} />
                             </div>
                         )}
                        <img src={card.sprite} alt="Pokémon" className="max-w-full max-h-full object-contain filter drop-shadow-lg" />
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryGame;
