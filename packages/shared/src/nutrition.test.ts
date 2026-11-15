import { describe, expect, it } from 'vitest';

import {
  caloriesFromMacros,
  sumMacros,
  targetFor,
  targetFormSchema,
  type NutritionTarget,
} from './nutrition';

const t = (dayType: NutritionTarget['dayType'], calories: number): NutritionTarget => ({
  dayType,
  calories,
  proteinG: null,
  carbsG: null,
  fatG: null,
  notes: null,
});

describe('nutrition', () => {
  it('picks the training or rest target, falling back to every day', () => {
    const targets = [t('any', 2400), t('training', 2700)];
    expect(targetFor(targets, true)?.calories).toBe(2700);
    expect(targetFor(targets, false)?.calories).toBe(2400);
    expect(targetFor([], true)).toBeNull();
  });

  it('adds up a day', () => {
    expect(
      sumMacros([
        { calories: 420, proteinG: 32, carbsG: 52, fatG: 9 },
        { calories: 610, proteinG: 45.5, carbsG: 60, fatG: 18 },
      ]),
    ).toEqual({ calories: 1030, proteinG: 78, carbsG: 112, fatG: 27 });
  });

  it('works out calories from macros', () => {
    expect(caloriesFromMacros({ proteinG: 30, carbsG: 50, fatG: 10 })).toBe(410);
  });

  it('reads the coach form, with blanks as no target', () => {
    expect(
      targetFormSchema.parse({
        dayType: 'any',
        calories: '2400',
        proteinG: '',
        carbsG: '250',
        fatG: '70',
        notes: '',
      }),
    ).toEqual({
      dayType: 'any',
      calories: 2400,
      proteinG: null,
      carbsG: 250,
      fatG: 70,
      notes: null,
    });
  });
});
