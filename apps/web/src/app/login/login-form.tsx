'use client';

import { submitKeepingValues } from '@/lib/submit-keeping-values';
import { useActionState } from 'react';
import { signIn } from '../actions';
import { buttonClass, Field, FormMessage } from '@/components/ui';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <form onSubmit={submitKeepingValues(action)} className="mt-6 flex flex-col gap-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage state={state} />
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
