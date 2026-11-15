'use client';

import { useActionState } from 'react';
import { inviteAthlete } from '../actions';
import { buttonClass, FormMessage, inputClass } from '@/components/ui';

export function InviteForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(inviteAthlete, null);

  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder="athlete@email.com"
          aria-label="Athlete email"
          className={inputClass}
        />
        <button type="submit" className={`${buttonClass} shrink-0`} disabled={pending}>
          {pending ? 'Creating…' : 'Create invite'}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
