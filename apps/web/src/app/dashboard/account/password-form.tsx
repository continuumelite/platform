'use client';

import { useActionState } from 'react';
import { buttonClass, Field, FormMessage } from '@/components/ui';
import { changePassword } from './actions';

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
      />
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? 'Saving…' : 'Change password'}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
