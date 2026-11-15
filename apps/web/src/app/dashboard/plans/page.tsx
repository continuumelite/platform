import { FEATURE_KEYS, isFeatureKey, type PlanSettings } from '@continuum/shared';
import { Suspense } from 'react';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import { PlanGrid } from './plan-grid';

export default function PlansPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading plans…</p>}>
      <Plans />
    </Suspense>
  );
}

async function Plans() {
  const { membership } = await getCoachContext();
  const supabase = await createClient();

  const [{ data: org }, { data: plans }] = await Promise.all([
    supabase
      .from('organizations')
      .select('feature_tiers_enabled')
      .eq('id', membership.organizationId)
      .single(),
    supabase
      .from('plans')
      .select(
        'id, level, name, description, price_cents, features:plan_features(feature_key, usage_limit)',
      )
      .eq('organization_id', membership.organizationId)
      .order('level'),
  ]);

  if (!org || plans?.length !== 3) {
    return <p className="text-sm text-red-400">Couldn’t load the plans. Please refresh.</p>;
  }

  // Before the mapping has ever been set, start with every feature in every level.
  const neverMapped = plans.every((p) => p.features.length === 0);
  const settings: PlanSettings = {
    tiersEnabled: org.feature_tiers_enabled,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceCents: p.price_cents,
      features: neverMapped
        ? FEATURE_KEYS.map((key) => ({ key, limit: null }))
        : p.features.flatMap((f) =>
            // Skip keys no longer in the feature list.
            isFeatureKey(f.feature_key) ? [{ key: f.feature_key, limit: f.usage_limit }] : [],
          ),
    })),
  };

  const isOwner = membership.role === 'owner';

  return (
    <>
      <div>
        <h1 className="text-4xl text-zinc-50">Plans</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Athletes subscribe at one of three levels. Choose what each level includes. Changes apply
          straight away in the app and on the web.
          {!isOwner && ' Only the owner can change these.'}
        </p>
      </div>
      <PlanGrid initial={settings} editable={isOwner} />
    </>
  );
}
