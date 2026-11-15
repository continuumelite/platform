import { hasFeature, type Entitlements, type FeatureKey } from '@continuum/shared';

/**
 * Can the person use this feature in the app? When the plan couldn't be loaded (offline), the
 * app stays usable; the database still enforces locked features when data is saved or read.
 */
export function canUse(entitlements: Entitlements | null | undefined, key: FeatureKey) {
  return entitlements == null || hasFeature(entitlements, key);
}
