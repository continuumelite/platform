import { z } from 'zod';

/**
 * Every feature that can be tied to a subscription level.
 *
 * Which plan includes which feature is data (the plans and plan_features tables), edited by
 * the owner on the web. Keys are stored in the database, so never rename one: add a new key
 * and retire the old one instead.
 */
export const FEATURES = [
  // Community
  { key: 'community.view', group: 'Community', label: 'See the community feed' },
  { key: 'community.post', group: 'Community', label: 'Post and comment' },
  // Training
  { key: 'training.program', group: 'Training', label: 'Personalized program' },
  { key: 'training.logging', group: 'Training', label: 'Log workouts' },
  { key: 'analytics.advanced', group: 'Training', label: 'Advanced analytics' },
  { key: 'race_predictions', group: 'Training', label: 'Race predictions' },
  // Nutrition
  { key: 'nutrition.targets', group: 'Nutrition', label: 'Calorie and macro targets' },
  { key: 'nutrition.logging', group: 'Nutrition', label: 'Food logging' },
  { key: 'nutrition.meal_plans', group: 'Nutrition', label: 'Meal plans from your coach' },
  // Coaching
  {
    key: 'messaging',
    group: 'Coaching',
    label: 'Message your coach',
    limitLabel: 'messages per week',
  },
  {
    key: 'checkins',
    group: 'Coaching',
    label: 'Weekly check-ins',
    limitLabel: 'check-ins per month',
  },
  {
    key: 'form_checks',
    group: 'Coaching',
    label: 'Video form checks',
    limitLabel: 'videos per month',
  },
  { key: 'ai.summaries', group: 'Coaching', label: 'AI weekly summaries' },
  // Devices
  { key: 'devices.health', group: 'Devices', label: 'Apple Health / Health Connect' },
  { key: 'devices.strava', group: 'Devices', label: 'Strava' },
  { key: 'devices.garmin', group: 'Devices', label: 'Garmin' },
  // Extras
  { key: 'events', group: 'Extras', label: 'Events and group sessions' },
  { key: 'merch.discount', group: 'Extras', label: 'Merch discount' },
] as const satisfies readonly {
  key: string;
  group: string;
  label: string;
  /** What a number limit means for this feature, e.g. "messages per week". */
  limitLabel?: string | null;
}[];

export type FeatureKey = (typeof FEATURES)[number]['key'];
export const FEATURE_KEYS = FEATURES.map((f) => f.key) as FeatureKey[];
export const PLAN_LEVELS = [1, 2, 3] as const;

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as string[]).includes(value);
}

/** What the signed-in athlete can use (from the my_plan() database function). */
export const entitlementsSchema = z.object({
  /** Off until the owner turns tiers on: then every feature is included for everyone. */
  tiersEnabled: z.boolean(),
  /** Coaches and owners get every feature. */
  staff: z.boolean(),
  plan: z.object({ id: z.guid(), name: z.string(), level: z.number().int() }).nullable(),
  /** Feature key → usage limit (null = unlimited). Only keys the plan includes. */
  features: z.record(z.string(), z.number().int().nullable()),
});
export type Entitlements = z.infer<typeof entitlementsSchema>;

/** Can this person use the feature? Mirrors private.has_feature() in the database. */
export function hasFeature(
  entitlements: Entitlements | null | undefined,
  key: FeatureKey,
): boolean {
  if (!entitlements) return false;
  if (entitlements.staff || !entitlements.tiersEnabled) return true;
  return key in entitlements.features;
}

/** The usage limit for a feature: null when unlimited or not included. */
export function featureLimit(entitlements: Entitlements | null | undefined, key: FeatureKey) {
  if (!entitlements || entitlements.staff || !entitlements.tiersEnabled) return null;
  return entitlements.features[key] ?? null;
}

/** The owner's tier settings, as edited on the web and saved by save_plan_settings(). */
export const planSettingsSchema = z.object({
  tiersEnabled: z.boolean(),
  plans: z
    .array(
      z.object({
        id: z.guid(),
        name: z.string().trim().min(1, 'Give every level a name').max(60),
        description: z.string().trim().max(500).nullable(),
        priceCents: z.number().int().min(0).max(10_000_000).nullable(),
        features: z.array(
          z.object({
            key: z.string().refine(isFeatureKey, 'Unknown feature'),
            limit: z.number().int().min(0).max(100_000).nullable(),
          }),
        ),
      }),
    )
    .length(3),
});
export type PlanSettings = z.infer<typeof planSettingsSchema>;
