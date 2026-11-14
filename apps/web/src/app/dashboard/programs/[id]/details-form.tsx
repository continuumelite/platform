'use client';

import { useActionState } from 'react';
import { FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';
import { submitKeepingValues } from '@/lib/submit-keeping-values';
import { updateProgramDetails } from '../actions';

export function ProgramDetailsForm({
  programId,
  status,
  startDate,
}: {
  programId: string;
  status: string;
  startDate: string | null;
}) {
  const [state, action, pending] = useActionState(updateProgramDetails.bind(null, programId), null);

  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        Status
        <select name="status" defaultValue={status} className={`${inputClass} py-1.5`}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        Start date
        <input
          type="date"
          name="startDate"
          defaultValue={startDate ?? ''}
          className={`${inputClass} py-1.5`}
        />
      </label>
      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        {pending ? 'Saving…' : 'Update'}
      </button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
