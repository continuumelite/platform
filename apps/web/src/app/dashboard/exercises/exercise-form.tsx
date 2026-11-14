'use client';

import { submitKeepingValues } from '@/lib/submit-keeping-values';
import { EQUIPMENT, MUSCLE_GROUPS, TRACKING, type ExerciseInput } from '@continuum/shared';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { FormState } from '../../actions';
import { buttonClass, Field, FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ExerciseInput & { library: 'organization' | 'mine' };
  /** Owners and head coaches can add to the organization library. */
  canUseLibrary: boolean;
  /** The library can only be picked when creating. */
  isNew: boolean;
};

const labelClass = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';

export function ExerciseForm({ action, initial, canUseLibrary, isNew }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [library, setLibrary] = useState(initial?.library ?? 'mine');

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-5">
      <Field label="Name" name="name" defaultValue={initial?.name} required maxLength={120} />

      {canUseLibrary && isNew ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>Add to</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="library"
                value="organization"
                checked={library === 'organization'}
                onChange={() => setLibrary('organization')}
              />
              Organization library (every coach)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="library"
                value="mine"
                checked={library === 'mine'}
                onChange={() => setLibrary('mine')}
              />
              My exercises
            </label>
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="library" value={library} />
      )}

      {library === 'mine' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isShared" defaultChecked={initial?.isShared} />
          Let other coaches see and use this exercise
        </label>
      )}

      <label className={`flex flex-col gap-1.5 ${labelClass}`}>
        How it’s logged
        <select
          name="tracking"
          defaultValue={initial?.tracking ?? 'weight_reps'}
          className={inputClass}
        >
          {Object.entries(TRACKING).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <CheckboxGroup
        legend="Muscle groups"
        name="muscleGroups"
        options={MUSCLE_GROUPS}
        selected={initial?.muscleGroups}
      />
      <CheckboxGroup
        legend="Equipment"
        name="equipment"
        options={EQUIPMENT}
        selected={initial?.equipment}
      />

      <label className={`flex flex-col gap-1.5 ${labelClass}`}>
        Coaching cues
        <textarea
          name="instructions"
          rows={4}
          maxLength={5000}
          defaultValue={initial?.instructions ?? ''}
          placeholder="What should the athlete focus on?"
          className={inputClass}
        />
      </label>

      <Field
        label="Demo video link (optional)"
        name="videoUrl"
        type="url"
        placeholder="https://youtube.com/…"
        defaultValue={initial?.videoUrl ?? ''}
      />

      <FormMessage state={state} />

      <div className="flex gap-3">
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? 'Saving…' : isNew ? 'Add exercise' : 'Save changes'}
        </button>
        <Link href="/dashboard/exercises" className={secondaryButtonClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function CheckboxGroup({
  legend,
  name,
  options,
  selected = [],
}: {
  legend: string;
  name: string;
  options: Record<string, string>;
  selected?: readonly string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={labelClass}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white dark:border-zinc-700 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-100 dark:has-[:checked]:text-zinc-900"
          >
            <input
              type="checkbox"
              name={name}
              value={value}
              defaultChecked={selected.includes(value)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
