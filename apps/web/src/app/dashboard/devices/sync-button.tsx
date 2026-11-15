'use client';

import { useActionState } from 'react';
import { FormMessage, secondaryButtonClass } from '@/components/ui';
import { syncNow } from './actions';

export function SyncButton({ connectionId }: { connectionId: string }) {
  const [state, action, pending] = useActionState(() => syncNow(connectionId), null);
  return (
    <form action={action} className="flex items-center gap-3">
      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        {pending ? 'Syncing…' : 'Sync now'}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
