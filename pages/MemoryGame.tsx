import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { BrainCircuit, CheckCircle, RefreshCw, Trophy, Clock, Play, AlertTriangle, Star, Sparkles } from 'lucide-react';
import Loader from '../components/Loader';
import { GENERATIONS } from '../constants';
import { artworkUrl, loadImage, MAX_POKEMON_ID, randomInt, shuffleArray } from '../utils/pokemon';
import { readStorage, writeStorage } from '../utils/storage';

type GameState = 'setup' | 'playing' | 'won' | 'lost';
type Level = 'easy' | 'medium' | 'hard';

interface Card {
  id: number; // Pokémon ID
  sprite: string;
  isFlipped: boolean;
  isMatched: boolean;
  uniqueId: string; // To differentiate between two cards of the same Pokémon
}

interface LevelRecord {
  moves: number;
  time: number; // seconds spent
}

type Records = Partial<Record<Level, LevelRecord>>;

const LEVELS: Record<Level, { pairs: number; cols: string }> = {
  easy: { pairs: 6, cols: 'grid-cols-4' },
  medium: { pairs: 10, cols: 'grid-cols-5' },
  hard: { pairs: 15, cols: 'grid-cols-5 md:grid-cols-6' },
};

const LEVEL_TIMES: Record<Level, number> = {
  easy: 90,   // 1:30
  medium: 120, // 2:00
  hard: 150,  // 2:30
};

const MATCH_DELAY = 800;
const MISMATCH_DELAY = 1200;
const RECORDS_KEY = 'memoryRecords';

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
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [stage, setStage] = useState(1);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [records, setRecords] = useState<Records>(() => readStorage<Records>(RECORDS_KEY, {}));

  // Setup options
  const [generation, setGeneration] = useState<string>('all');
  const [shinyOnly, setShinyOnly] = useState(false);

  // Refs hold the "live" game data so timeouts/intervals never act on stale state
  const gameStateRef = useRef<GameState>('setup');
  const lockRef = useRef(false);            // true while a pair is being resolved
  const flippedRef = useRef<number[]>([]);  // indexes of the currently flipped (unresolved) cards
  const matchedRef = useRef(0);
  const movesRef = useRef(0);
  const timeRef = useRef(0);
  const gameIdRef = useRef(0);              // invalidates async work of previous games
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordsRef = useRef<Records>(records);

  const changeState = (state: GameState) => {
    gameStateRef.current = state;
    setGameState(state);
  };

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Stop everything on unmount
  useEffect(() => () => {
    gameIdRef.current++;
    clearTimers();
  }, [clearTimers]);

  const finishGame = useCallback((result: 'won' | 'lost', currentLevel: Level) => {
    // Only the first result counts: a win and a timeout can never overlap
    if (gameStateRef.current !== 'playing') return;
    clearTimers();
    lockRef.current = true;

    if (result === 'won') {
      const spent = LEVEL_TIMES[currentLevel] - timeRef.current;
      const finalMoves = movesRef.current;
      const current = recordsRef.current[currentLevel];
      const better = !current || finalMoves < current.moves || (finalMoves === current.moves && spent < current.time);
      setIsNewRecord(better);
      if (better) {
        const next = { ...recordsRef.current, [currentLevel]: { moves: finalMoves, time: spent } };
        recordsRef.current = next;
        setRecords(next);
        writeStorage(RECORDS_KEY, next);
      }
    }
    changeState(result);
  }, [clearTimers]);

  const startTimer = useCallback((currentLevel: Level, gameId: number) => {
    timerRef.current = setInterval(() => {
      if (gameIdRef.current !== gameId) return;
      timeRef.current -= 1;
      setTime(timeRef.current);
      if (timeRef.current <= 0) {
        timeRef.current = 0;
        setTime(0);
        finishGame('lost', currentLevel);
      }
    }, 1000);
  }, [finishGame]);

  const setupGame = useCallback(async (selectedLevel: Level, isNextStage = false) => {
    const gameId = ++gameIdRef.current;
    clearTimers();
    lockRef.current = true;
    flippedRef.current = [];
    matchedRef.current = 0;
    movesRef.current = 0;

    setLoading(true);
    setIsNewRecord(false);
    setStage((prev) => (isNextStage ? prev + 1 : 1));
    setLevel(selectedLevel);
    setCards([]);
    setMoves(0);
    setMatchedPairs(0);
    timeRef.current = LEVEL_TIMES[selectedLevel];
    setTime(LEVEL_TIMES[selectedLevel]);

    const range = GENERATIONS.find((g) => g.key === generation);
    const min = range ? range.start : 1;
    const max = range ? range.end : MAX_POKEMON_ID;

    const { pairs } = LEVELS[selectedLevel];
    const uniqueIds = new Set<number>();
    while (uniqueIds.size < pairs) {
      uniqueIds.add(randomInt(min, max));
    }
    const pokemonIds = Array.from(uniqueIds);

    // Preload the artwork so cards never flip to an empty image. If a shiny artwork is missing,
    // fall back to the regular one.
    const sprites = await Promise.all(
      pokemonIds.map(async (id) => {
        const preferred = artworkUrl(id, shinyOnly);
        if (await loadImage(preferred)) return preferred;
        return artworkUrl(id, false);
      })
    );

    // A newer game (or unmount) took over while images were loading
    if (gameIdRef.current !== gameId) return;

    const gameCards: Card[] = pokemonIds.flatMap((id, i) => {
      const cardData = { id, sprite: sprites[i], isFlipped: false, isMatched: false };
      return [
        { ...cardData, uniqueId: `${id}-a` },
        { ...cardData, uniqueId: `${id}-b` },
      ];
    });

    setCards(shuffleArray(gameCards));
    lockRef.current = false;
    changeState('playing');
    setLoading(false);
    startTimer(selectedLevel, gameId);
  }, [clearTimers, generation, shinyOnly, startTimer]);

  const handleCardClick = (index: number) => {
    if (gameStateRef.current !== 'playing' || !level) return;
    // Ref based lock: closed synchronously, so a third click can never sneak in
    if (lockRef.current) return;

    const card = cards[index];
    if (!card || card.isFlipped || card.isMatched) return;

    const gameId = gameIdRef.current;
    const flipped = [...flippedRef.current, index];
    flippedRef.current = flipped;
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, isFlipped: true } : c)));

    if (flipped.length < 2) return;

    lockRef.current = true;
    movesRef.current += 1;
    setMoves(movesRef.current);

    const [firstIndex, secondIndex] = flipped;
    const isMatch = cards[firstIndex].id === cards[secondIndex].id;

    const timeout = setTimeout(() => {
      if (gameIdRef.current !== gameId || gameStateRef.current !== 'playing') return;

      setCards((prev) =>
        prev.map((c, i) => {
          if (i !== firstIndex && i !== secondIndex) return c;
          return isMatch ? { ...c, isMatched: true } : { ...c, isFlipped: false };
        })
      );
      flippedRef.current = [];

      if (isMatch) {
        matchedRef.current += 1;
        setMatchedPairs(matchedRef.current);
        if (matchedRef.current === LEVELS[level].pairs) {
          finishGame('won', level);
          return;
        }
      }
      lockRef.current = false;
    }, isMatch ? MATCH_DELAY : MISMATCH_DELAY);
    timeoutsRef.current.push(timeout);
  };

  const resetToMenu = () => {
    gameIdRef.current++;
    clearTimers();
    lockRef.current = false;
    flippedRef.current = [];
    setLoading(false);
    changeState('setup');
    setLevel(null);
    setCards([]);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader />
        <p className="text-gray-500 dark:text-gray-400 font-medium">{t.memoryGame.loading}</p>
      </div>
    );
  }

  if (gameState === 'setup') {
    return (
      <div className="container mx-auto px-4 py-12 text-center animate-fade-in">
        <BrainCircuit className="mx-auto h-20 w-20 mb-6 text-blue-500" />
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-4">{t.memoryGame.title}</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">{t.memoryGame.selectLevel}</p>

        {/* Mode options */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-lg mx-auto mb-8">
          <label className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t.memoryGame.gen}</span>
            <select
              value={generation}
              onChange={(e) => setGeneration(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">{t.allRegions}</option>
              {GENERATIONS.map((gen) => (
                <option key={gen.key} value={gen.key}>{t.generations[gen.key as keyof typeof t.generations]}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setShinyOnly((v) => !v)}
            aria-pressed={shinyOnly}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold transition-all ${shinyOnly ? 'bg-linear-to-r from-yellow-400 to-orange-400 border-transparent text-white shadow-lg shadow-yellow-500/30' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Sparkles size={18} fill={shinyOnly ? 'currentColor' : 'none'} /> {t.memoryGame.shiny}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-lg mx-auto">
          {(Object.keys(LEVELS) as Level[]).map((lvl) => {
            const record = records[lvl];
            return (
              <button
                key={lvl}
                onClick={() => setupGame(lvl)}
                className="w-full px-8 py-5 text-xl font-bold text-white bg-linear-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-300"
              >
                {t.memoryGame[lvl]}
                <span className="block mt-1 text-xs font-medium text-blue-100">
                  {record ? `${t.memoryGame.best}: ${record.moves} / ${formatTime(record.time)}` : t.memoryGame.noRecord}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const totalPairs = level ? LEVELS[level].pairs : 0;
  const spentTime = level ? LEVEL_TIMES[level] - time : 0;
  const levelRecord = level ? records[level] : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Win Modal */}
      {gameState === 'won' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-dark-card p-10 rounded-3xl shadow-2xl text-center max-w-md mx-4 transform scale-100 transition-transform">
            <Trophy className="mx-auto h-24 w-24 text-yellow-400 mb-4 animate-bounce" />
            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-3">{t.memoryGame.winTitle}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{t.memoryGame.winMessage}</p>
            {isNewRecord && (
              <p className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-bold text-sm">
                <Star size={14} fill="currentColor" /> {t.memoryGame.newRecord}
              </p>
            )}
            <div className="flex justify-center gap-6 text-lg font-semibold mb-2">
              <span className="text-blue-500">{t.memoryGame.moves}: {moves}</span>
              <span className="text-purple-500">{t.memoryGame.spent}: {formatTime(spentTime)}</span>
            </div>
            {levelRecord && (
              <p className="text-sm text-gray-400 mb-6">{t.memoryGame.best}: {levelRecord.moves} / {formatTime(levelRecord.time)}</p>
            )}
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => setupGame(level!, true)}
                className="w-full px-6 py-4 text-lg font-bold text-white bg-linear-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg hover:scale-105 transform transition-all flex items-center justify-center gap-2"
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
                className="w-full px-6 py-4 text-lg font-bold text-white bg-linear-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg hover:scale-105 transform transition-all flex items-center justify-center gap-2"
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
        <div className="flex items-center gap-3 md:gap-6 bg-white dark:bg-dark-card p-3 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400 uppercase flex items-center justify-center gap-1"><Star size={12} /> {t.memoryGame.stage}</div>
            <div className="text-2xl font-black text-gray-700 dark:text-gray-300">{stage}</div>
          </div>
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400 uppercase flex items-center justify-center gap-1"><Clock size={12} /> {t.memoryGame.timer}</div>
            <div className={`text-2xl font-black font-mono ${time <= 10 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{formatTime(time)}</div>
          </div>
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400 uppercase">{t.memoryGame.moves}</div>
            <div className="text-2xl font-black text-blue-500">{moves}</div>
          </div>
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xs font-bold text-gray-400 uppercase">{t.memoryGame.matched}</div>
            <div className="text-2xl font-black text-green-500 whitespace-nowrap">{matchedPairs} / {totalPairs}</div>
          </div>
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
          <button
            onClick={resetToMenu}
            title={t.memoryGame.playAgain}
            aria-label={t.memoryGame.playAgain}
            className="p-3 bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <RefreshCw size={24} />
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
                  <div className="absolute inset-0 bg-linear-to-br from-red-500 to-red-600 rounded-full"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-1/6 bg-gray-900 z-10"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-white border-4 border-gray-900 rounded-full z-20"></div>
                </div>
              </div>
              {/* Card Front */}
              <div className={`absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center rounded-2xl shadow-lg border-2 p-2 ${card.isMatched ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'}`}>
                {card.isMatched && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1 z-20">
                    <CheckCircle size={16} />
                  </div>
                )}
                <img src={card.sprite} alt="" className="max-w-full max-h-full object-contain filter drop-shadow-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryGame;
