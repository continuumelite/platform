'use client';

import { FEATURES, type FeatureKey, type PlanSettings } from '@continuum/shared';
import { Fragment, startTransition, useActionState, useState } from 'react';
import { buttonClass, Card, FormMessage, inputClass } from '@/components/ui';
import { savePlanSettings } from './actions';

type Plan = PlanSettings['plans'][number];

const groups = [...new Set(FEATURES.map((f) => f.group))];

/** The owner's grid: features down the side, the three levels across the top. */
export function PlanGrid({ initial, editable }: { initial: PlanSettings; editable: boolean }) {
  const [state, action, pending] = useActionState(savePlanSettings, null);
  const [tiersEnabled, setTiersEnabled] = useState(initial.tiersEnabled);
  const [plans, setPlans] = useState(initial.plans);

  const updatePlan = (index: number, patch: Partial<Plan>) =>
    setPlans((all) => all.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const included = (plan: Plan, key: FeatureKey) => plan.features.find((f) => f.key === key);

  const toggle = (index: number, key: FeatureKey, on: boolean) =>
    updatePlan(index, {
      features: on
        ? [...plans[index]!.features, { key, limit: null }]
        : plans[index]!.features.filter((f) => f.key !== key),
    });

  const setLimit = (index: number, key: FeatureKey, value: string) =>
    updatePlan(index, {
      features: plans[index]!.features.map((f) =>
        f.key === key ? { ...f, limit: value === '' ? null : Math.max(0, Number(value)) } : f,
      ),
    });

  const settings: PlanSettings = { tiersEnabled, plans };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData();
        data.set('settings', JSON.stringify(settings));
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-6"
    >
      <Card>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={tiersEnabled}
            disabled={!editable}
            onChange={(e) => setTiersEnabled(e.target.checked)}
            className="mt-1 size-4 accent-[var(--color-cream)]"
          />
          <span>
            <span className="block text-sm font-semibold">Use subscription levels</span>
            <span className="block text-sm text-zinc-400">
              {tiersEnabled
                ? 'On: each athlete can use only what their level includes.'
                : 'Off: every athlete can use every feature. Set up the levels below, then turn this on.'}
            </span>
          </span>
        </label>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 align-top">
              <th className="w-[34%] px-5 py-4 text-left text-xs font-semibold tracking-[0.15em] text-zinc-400 uppercase">
                Feature
              </th>
              {plans.map((plan, i) => (
                <th key={plan.id} className="px-3 py-4 text-left font-normal">
                  <span className="mb-1 block text-xs tracking-[0.15em] text-zinc-500 uppercase">
                    Level {i + 1}
                  </span>
                  <input
                    aria-label={`Level ${i + 1} name`}
                    value={plan.name}
                    disabled={!editable}
                    onChange={(e) => updatePlan(i, { name: e.target.value })}
                    className={`${inputClass} font-semibold`}
                  />
                  <label className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
                    $
                    <input
                      aria-label={`Level ${i + 1} monthly price`}
                      inputMode="decimal"
                      placeholder="Price"
                      disabled={!editable}
                      value={plan.priceCents == null ? '' : String(plan.priceCents / 100)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, '');
                        updatePlan(i, {
                          priceCents: v === '' ? null : Math.round(Number(v) * 100),
                        });
                      }}
                      className={`${inputClass} py-1 text-xs`}
                    />
                    /mo
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group}>
                <tr>
                  <th
                    colSpan={4}
                    className="bg-zinc-950/40 px-5 pt-4 pb-2 text-left text-xs font-semibold tracking-[0.15em] text-zinc-500 uppercase"
                  >
                    {group}
                  </th>
                </tr>
                {FEATURES.filter((f) => f.group === group).map((feature) => (
                  <tr key={feature.key} className="border-t border-zinc-800/60">
                    <td className="px-5 py-2.5">
                      {feature.label}
                      {'limitLabel' in feature && (
                        <span className="block text-xs text-zinc-500">
                          Optional limit: {feature.limitLabel}
                        </span>
                      )}
                    </td>
                    {plans.map((plan, i) => {
                      const entry = included(plan, feature.key);
                      return (
                        <td key={plan.id} className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              aria-label={`${feature.label} in ${plan.name}`}
                              checked={!!entry}
                              disabled={!editable}
                              onChange={(e) => toggle(i, feature.key, e.target.checked)}
                              className="size-4 accent-[var(--color-cream)]"
                            />
                            {entry && 'limitLabel' in feature && (
                              <input
                                aria-label={`${feature.label} limit in ${plan.name}`}
                                inputMode="numeric"
                                placeholder="No limit"
                                disabled={!editable}
                                value={entry.limit ?? ''}
                                onChange={(e) =>
                                  setLimit(i, feature.key, e.target.value.replace(/\D/g, ''))
                                }
                                className={`${inputClass} w-24 py-1 text-xs`}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>

      {editable && (
        <div className="flex items-center gap-4">
          <button type="submit" className={buttonClass} disabled={pending}>
            {pending ? 'Saving…' : 'Save plans'}
          </button>
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}
