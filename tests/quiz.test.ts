import { describe, expect, it } from 'vitest';
import { buildQuestions } from '../utils/quiz';
import { createRandom, hashString } from '../utils/daily';

describe('buildQuestions', () => {
  it('builds distinct answers with 4 distinct options including the answer', () => {
    const questions = buildQuestions(1, 151, 10);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((q) => q.id)).size).toBe(10);
    questions.forEach((q) => {
      expect(q.optionIds).toHaveLength(4);
      expect(new Set(q.optionIds).size).toBe(4);
      expect(q.optionIds).toContain(q.id);
      q.optionIds.forEach((id) => {
        expect(id).toBeGreaterThanOrEqual(1);
        expect(id).toBeLessThanOrEqual(151);
      });
    });
  });

  it('is reproducible with the same daily seed and differs on another day', () => {
    const day = (key: string) => buildQuestions(1, 1025, 10, createRandom(hashString(key)));
    expect(day('2026-03-01')).toEqual(day('2026-03-01'));
    expect(day('2026-03-01')).not.toEqual(day('2026-03-02'));
  });
});
