import { describe, expect, it } from 'vitest';
import { CATCH_COMBO_TABLES, CATCH_COMBO_TEXT } from '../utils/catchCombo';

describe('catch combo data', () => {
  it('has the same number of values per row as the table needs', () => {
    CATCH_COMBO_TABLES.shiny.forEach((row) => expect(row.values).toHaveLength(4));
    ['sameSpecies', 'maxIvs', 'rareSpawn'].forEach((key) =>
      CATCH_COMBO_TABLES[key as 'sameSpecies'].forEach((row) => expect(row.values).toHaveLength(1))
    );
  });

  it('keeps the shiny rate improving as the combo grows', () => {
    const odds = CATCH_COMBO_TABLES.shiny.map((row) => parseFloat(row.values[0].split('/')[1]));
    expect([...odds].sort((a, b) => b - a)).toEqual(odds);
  });

  it('has the same sections in English and Portuguese', () => {
    expect(Object.keys(CATCH_COMBO_TEXT.pt.sections)).toEqual(Object.keys(CATCH_COMBO_TEXT.en.sections));
    expect(CATCH_COMBO_TEXT.pt.how).toHaveLength(CATCH_COMBO_TEXT.en.how.length);
  });
});
