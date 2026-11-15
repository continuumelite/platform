'use client';

import { DAY_TYPE_LABELS, type NutritionDayType, type NutritionTarget } from '@continuum/shared';
import { useActionState } from 'react';
import { FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';
import { submitKeepingValues } from '@/lib/submit-keeping-values';
import { saveNutritionTarget } from './nutrition-actions';

/** One row of targets (every day, training days or rest days). Blank fields = no target. */
export function NutritionTargetForm({
  athleteProfileId,
  dayType,
  target,
}: {
  athleteProfileId: string;
  dayType: NutritionDayType;
  target: NutritionTarget | null;
}) {
  const [state, action, pending] = useActionState(
    saveNutritionTarget.bind(null, athleteProfileId),
    null,
  );
  const fields = [
    { name: 'calories', label: 'kcal', value: target?.calories },
    { name: 'proteinG', label: 'Protein g', value: target?.proteinG },
    { name: 'carbsG', label: 'Carbs g', value: target?.carbsG },
    { name: 'fatG', label: 'Fat g', value: target?.fatG },
  ];

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-2 py-3">
      <input type="hidden" name="dayType" value={dayType} />
      <div className="flex flex-wrap items-end gap-2">
        <span className="w-28 pb-2 text-sm font-semibold">{DAY_TYPE_LABELS[dayType]}</span>
        {fields.map((f) => (
          <label key={f.name} className="flex flex-col gap-1 text-xs text-zinc-500">
            {f.label}
            <input
              name={f.name}
              inputMode="numeric"
              defaultValue={f.value ?? ''}
              className={`${inputClass} w-24 py-1.5`}
            />
          </label>
        ))}
        <button type="submit" className={secondaryButtonClass} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <FormMessage state={state} />
      </div>
      {dayType === 'any' && (
        <input
          name="notes"
          aria-label="Note for the athlete"
          placeholder="Note for the athlete (optional)"
          defaultValue={target?.notes ?? ''}
          maxLength={1000}
          className={`${inputClass} py-1.5`}
        />
      )}
      {dayType !== 'any' && <input type="hidden" name="notes" value="" />}
    </form>
  );
}
