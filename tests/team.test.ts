import { describe, expect, it } from 'vitest';
import { parseTeam, serializeTeam } from '../utils/team';

describe('team share link', () => {
  it('round trips ids', () => {
    expect(parseTeam(serializeTeam([6, 25, 94]))).toEqual([6, 25, 94]);
  });

  it('drops invalid, duplicated and out of range values', () => {
    expect(parseTeam('6,abc,6,-3,0,25,999999')).toEqual([6, 25]);
  });

  it('caps the team size', () => {
    expect(parseTeam('1,2,3,4,5,6,7,8')).toHaveLength(6);
  });

  it('handles empty input', () => {
    expect(parseTeam(null)).toEqual([]);
    expect(parseTeam('')).toEqual([]);
  });
});
