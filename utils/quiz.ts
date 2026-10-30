import { randomInt, shuffleArray } from './pokemon';

export interface QuizQuestion {
  id: number;
  optionIds: number[];
}

// Builds `count` questions with 4 options each (1 correct + 3 distinct wrong ones).
// Pass a seeded random function to get reproducible questions (daily challenge).
export const buildQuestions = (min: number, max: number, count = 10, random: () => number = Math.random): QuizQuestion[] => {
  const answers = new Set<number>();
  while (answers.size < count) answers.add(randomInt(min, max, random));

  return Array.from(answers).map((id) => {
    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const other = randomInt(min, max, random);
      if (other !== id) wrong.add(other);
    }
    return { id, optionIds: shuffleArray([id, ...wrong], random) };
  });
};

// Same as buildQuestions, but answers and wrong options come from a fixed pool of ids (needs at least 4).
export const buildQuestionsFromPool = (pool: number[], count = 10, random: () => number = Math.random): QuizQuestion[] =>
  shuffleArray(pool, random).slice(0, count).map((id) => ({
    id,
    optionIds: shuffleArray([id, ...shuffleArray(pool.filter((other) => other !== id), random).slice(0, 3)], random),
  }));
