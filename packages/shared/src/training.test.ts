import { describe, expect, it } from 'vitest';

import { estimateOneRepMax } from './training';

describe('estimateOneRepMax', () => {
  it('returns the load for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('applies the Epley formula', () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });

  it('rejects inputs outside the reliable range', () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(100, 15)).toBeNull();
    expect(estimateOneRepMax(100, 2.5)).toBeNull();
  });
});
