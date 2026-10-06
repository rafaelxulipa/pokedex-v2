import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, Flame, Trophy, ArrowRight, RefreshCw } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';
import { fetchAllPokemonNames } from '../services/pokeApi';
import { artworkUrl, formatName, idFromUrl } from '../utils/pokemon';
import { buildQuestions, QuizQuestion } from '../utils/quiz';
import { createRandom, hashString, todayKey } from '../utils/daily';
import { readStorage, writeStorage } from '../utils/storage';
import Loader from '../components/Loader';

const TOTAL_ROUNDS = 10;
const BEST_STREAK_KEY = 'quizBestStreak';
const DAILY_KEY = 'quizDaily';

interface DailyResult {
  date: string;
  score: number;
}

type Phase = 'menu' | 'playing' | 'finished';

const Quiz: React.FC = () => {
  const { t, generations, generationLabel, maxPokemonId } = useGlobal();
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState('all');
  const [phase, setPhase] = useState<Phase>('menu');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(() =>
    readStorage<DailyResult | null>(DAILY_KEY, null, (v) => !!v && typeof (v as DailyResult).date === 'string')
  );
  const today = todayKey();
  const dailyDone = dailyResult?.date === today;
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState<number>(() =>
    readStorage<number>(BEST_STREAK_KEY, 0, (v) => typeof v === 'number')
  );
  const [imageReady, setImageReady] = useState(false);
  const bestRef = useRef(bestStreak);

  useEffect(() => {
    let cancelled = false;
    fetchAllPokemonNames().then((list) => {
      if (cancelled) return;
      const map: Record<number, string> = {};
      list.forEach((p) => {
        const id = idFromUrl(p.url);
        if (id < 10000) map[id] = p.name; // ids from 10000 are alternate forms
      });
      setNames(map);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const begin = (qs: QuizQuestion[], daily: boolean) => {
    setQuestions(qs);
    setIsDaily(daily);
    setRound(0);
    setScore(0);
    setStreak(0);
    setAnswer(null);
    setImageReady(false);
    setPhase('playing');
  };

  const start = () => {
    const range = generations.find((g) => g.key === generation);
    begin(buildQuestions(range ? range.start : 1, range ? range.end : maxPokemonId, TOTAL_ROUNDS), false);
  };

  // Same questions for everyone on a given day (seeded by the date)
  const startDaily = () => {
    const random = createRandom(hashString(`daily-${today}`));
    begin(buildQuestions(1, maxPokemonId, TOTAL_ROUNDS, random), true);
  };

  const choose = (optionId: number) => {
    if (answer !== null) return;
    const question = questions[round];
    setAnswer(optionId);
    if (optionId === question.id) {
      setScore((s) => s + 1);
      const next = streak + 1;
      setStreak(next);
      if (next > bestRef.current) {
        bestRef.current = next;
        setBestStreak(next);
        writeStorage(BEST_STREAK_KEY, next);
      }
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    if (round + 1 >= TOTAL_ROUNDS) {
      if (isDaily) {
        const result = { date: today, score };
        setDailyResult(result);
        writeStorage(DAILY_KEY, result);
      }
      setPhase('finished');
      return;
    }
    setRound((r) => r + 1);
    setAnswer(null);
    setImageReady(false);
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader /></div>;

  if (phase === 'menu') {
    return (
      <div className="container mx-auto px-4 py-12 text-center animate-fade-in">
        <HelpCircle className="mx-auto h-20 w-20 mb-6 text-purple-500" />
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-4">{t.quiz.title}</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">{t.quiz.subtitle}</p>
        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
          <select
            value={generation}
            onChange={(e) => setGeneration(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="all">{t.allRegions}</option>
            {generations.map((gen) => (
              <option key={gen.key} value={gen.key}>{generationLabel(gen)}</option>
            ))}
          </select>
          <button
            onClick={start}
            className="w-full px-8 py-4 text-xl font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            {t.quiz.start} <span className="block text-xs font-medium text-purple-100">{t.quiz.rounds}</span>
          </button>
          <button
            onClick={startDaily}
            disabled={dailyDone}
            className="w-full px-8 py-4 text-xl font-bold text-white bg-linear-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {t.quiz.daily}
            <span className="block text-xs font-medium text-amber-100">
              {dailyDone
                ? t.quiz.dailyDone.replace('{n}', String(dailyResult?.score ?? 0)).replace('{total}', String(TOTAL_ROUNDS))
                : t.quiz.dailyHint}
            </span>
          </button>
          <p className="text-sm text-gray-400">{t.quiz.best}: {bestStreak}</p>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className="container mx-auto px-4 py-12 text-center animate-fade-in">
        <Trophy className="mx-auto h-24 w-24 text-yellow-400 mb-4 animate-bounce" />
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-3">{t.quiz.finalTitle}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
          {t.quiz.finalMessage.replace('{n}', String(score)).replace('{total}', String(TOTAL_ROUNDS))}
        </p>
        <p className="text-sm text-gray-400 mb-8">{t.quiz.best}: {bestStreak}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={start} className="flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg hover:scale-105 transition-all">
            <RefreshCw size={18} /> {t.quiz.playAgain}
          </button>
          <button onClick={() => setPhase('menu')} className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            {t.quiz.back}
          </button>
        </div>
      </div>
    );
  }

  const question = questions[round];
  const revealed = answer !== null;
  const isCorrect = answer === question.id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6 bg-white dark:bg-dark-card p-3 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800">
        <div className="text-center flex-1">
          <div className="text-xs font-bold text-gray-400 uppercase">{t.quiz.round}</div>
          <div className="text-xl font-black text-gray-700 dark:text-gray-300">{round + 1}/{TOTAL_ROUNDS}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-xs font-bold text-gray-400 uppercase">{t.quiz.score}</div>
          <div className="text-xl font-black text-green-500">{score}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-xs font-bold text-gray-400 uppercase flex items-center justify-center gap-1"><Flame size={12} /> {t.quiz.streak}</div>
          <div className="text-xl font-black text-orange-500">{streak}</div>
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-center text-gray-800 dark:text-white mb-4">{t.quiz.title}</h2>

      <div className="relative flex items-center justify-center h-64 md:h-72 mb-6 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs">
        {!imageReady && <div className="absolute"><Loader /></div>}
        <img
          key={question.id}
          src={artworkUrl(question.id)}
          alt={revealed ? formatName(names[question.id] || '') : ''}
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(true)}
          className={`h-56 md:h-64 object-contain transition-all duration-500 ${imageReady ? 'opacity-100' : 'opacity-0'} ${revealed ? '' : 'brightness-0 dark:invert'}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {question.optionIds.map((optionId) => {
          const option = { id: optionId, name: names[optionId] || String(optionId) };
          let style = 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-purple-500';
          if (revealed) {
            if (option.id === question.id) style = 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300';
            else if (option.id === answer) style = 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300';
            else style = 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-400 opacity-60';
          }
          return (
            <button
              key={option.id}
              onClick={() => choose(option.id)}
              disabled={revealed || !imageReady}
              className={`px-4 py-3 rounded-xl border-2 font-bold capitalize transition-all ${style}`}
            >
              {formatName(option.name)}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="text-center animate-fade-in">
          <p className={`text-xl font-extrabold mb-1 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
            {isCorrect ? t.quiz.correct : t.quiz.wrong}
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-4 capitalize">{t.quiz.itWas} {formatName(names[question.id] || '')}</p>
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg hover:scale-105 transition-all">
            {round + 1 >= TOTAL_ROUNDS ? t.quiz.finish : t.quiz.next} <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Quiz;
