'use client';

import { useActionState } from 'react';
import { FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';
import { submitKeepingValues } from '@/lib/submit-keeping-values';
import { setAthletePlan } from '../../plans/actions';

export type PlanOption = { id: string; name: string; level: number; isDefault: boolean };

/** Put the athlete on a level by hand (until payments exist, and for comps). */
export function PlanPicker({
  athleteProfileId,
  plans,
  currentPlanId,
  paid,
}: {
  athleteProfileId: string;
  plans: PlanOption[];
  /** The athlete's manual plan, or null when they're on the default. */
  currentPlanId: string | null;
  /** A paid subscription (Stripe / app store) can't be changed here. */
  paid: { planName: string; source: string } | null;
}) {
  const [state, action, pending] = useActionState(
    setAthletePlan.bind(null, athleteProfileId),
    null,
  );
  const fallback = plans.find((p) => p.isDefault);

  if (paid) {
    return (
      <p className="text-sm text-zinc-400">
        <span className="text-zinc-50">{paid.planName}</span> · paid through {paid.source}
      </p>
    );
  }

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-center gap-2">
      <select
        name="planId"
        aria-label="Subscription level"
        defaultValue={currentPlanId ?? ''}
        className={`${inputClass} w-auto py-1.5`}
      >
        <option value="">Default{fallback ? ` (${fallback.name})` : ''}</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            Level {p.level}: {p.name}
          </option>
        ))}
      </select>
      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        {pending ? 'Saving…' : 'Set level'}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
