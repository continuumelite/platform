'use client';

import { submitKeepingValues } from '@/lib/submit-keeping-values';
import { useActionState } from 'react';
import { acceptInvitation } from '../../actions';
import { buttonClass, Field, FormMessage, inputClass } from '@/components/ui';

export function AcceptForm({
  token,
  email,
  signedIn,
}: {
  token: string;
  email: string;
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState(acceptInvitation, null);

  return (
    <form onSubmit={submitKeepingValues(action)} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Email
        <input className={`${inputClass} bg-zinc-100 dark:bg-zinc-800`} value={email} readOnly />
      </label>
      {!signedIn && (
        <>
          <Field label="Your name" name="fullName" autoComplete="name" required />
          <Field
            label="Create a password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </>
      )}
      <FormMessage state={state} />
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? 'Joining…' : signedIn ? 'Accept invitation' : 'Create account and join'}
      </button>
    </form>
  );
}
