import { describe, expect, it } from 'vitest';

import { FEATURES, featureLimit, hasFeature, type Entitlements } from './features';

const base: Entitlements = {
  tiersEnabled: true,
  staff: false,
  plan: { id: '00000000-0000-0000-0000-000000000001', name: 'Level 1', level: 1 },
  features: { 'training.logging': null, messaging: 5 },
};

describe('features', () => {
  it('has unique, well-formed keys', () => {
    const keys = FEATURES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/);
  });

  it('allows only features in the plan when tiers are on', () => {
    expect(hasFeature(base, 'training.logging')).toBe(true);
    expect(hasFeature(base, 'community.post')).toBe(false);
    expect(featureLimit(base, 'messaging')).toBe(5);
  });

  it('allows everything when tiers are off, and for staff', () => {
    expect(hasFeature({ ...base, tiersEnabled: false }, 'community.post')).toBe(true);
    expect(hasFeature({ ...base, staff: true }, 'community.post')).toBe(true);
    expect(featureLimit({ ...base, staff: true }, 'messaging')).toBeNull();
  });

  it('allows nothing before entitlements load', () => {
    expect(hasFeature(null, 'training.logging')).toBe(false);
  });
});
