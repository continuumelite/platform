'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { buttonClass, Field, FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';
import { submitKeepingValues } from '@/lib/submit-keeping-values';
import { createProgram } from '../actions';

type Option = { id: string; name: string };

const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300';

/** Monday of next week, as YYYY-MM-DD. */
function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

export function NewProgramForm({
  isLead,
  athletes,
  templates,
  athletePrograms,
  defaultAthlete,
  defaultSource,
}: {
  isLead: boolean;
  athletes: Option[];
  templates: Option[];
  athletePrograms: Option[];
  defaultAthlete?: string;
  defaultSource?: string;
}) {
  const [state, action, pending] = useActionState(createProgram, null);
  const initialTarget =
    defaultAthlete && athletes.some((a) => a.id === defaultAthlete)
      ? `athlete:${defaultAthlete}`
      : athletes[0]
        ? `athlete:${athletes[0].id}`
        : 'template:mine';
  const [target, setTarget] = useState(initialTarget);
  const forAthlete = target.startsWith('athlete:');

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-5">
      <label className={labelClass}>
        Who is it for?
        <select
          name="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className={inputClass}
        >
          {athletes.length > 0 && (
            <optgroup label="An athlete">
              {athletes.map((a) => (
                <option key={a.id} value={`athlete:${a.id}`}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="A template">
            <option value="template:mine">My template</option>
            {isLead && (
              <option value="template:organization">Organization template (every coach)</option>
            )}
          </optgroup>
        </select>
      </label>

      <label className={labelClass}>
        Start from
        <select
          name="sourceProgramId"
          defaultValue={defaultSource ?? templates[0]?.id ?? ''}
          className={inputClass}
        >
          <option value="">A blank program</option>
          {templates.length > 0 && (
            <optgroup label="Templates">
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
          {athletePrograms.length > 0 && (
            <optgroup label="Another athlete's program">
              {athletePrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <Field
        label="Program name"
        name="name"
        required
        maxLength={200}
        placeholder="e.g. Off-season strength"
      />

      {forAthlete ? (
        <Field label="Start date" name="startDate" type="date" defaultValue={nextMonday()} />
      ) : (
        <input type="hidden" name="startDate" value="" />
      )}

      {forAthlete && (
        <p className="text-sm text-zinc-500">
          New programs start as a draft. The athlete sees it once you set it to Active.
        </p>
      )}

      <FormMessage state={state} />

      <div className="flex gap-3">
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? 'Creating…' : 'Create and edit'}
        </button>
        <Link href="/dashboard/programs" className={secondaryButtonClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
