'use client';

import { useActionState, useRef } from 'react';
import { buttonClass, FormMessage, inputClass } from '@/components/ui';
import { sendMessage } from './actions';

export function SendForm({
  threadId,
  athleteId,
  placeholder,
}: {
  threadId: string;
  athleteId: string;
  placeholder: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: Parameters<typeof sendMessage>[2], data: FormData) => {
      const result = await sendMessage(threadId, athleteId, prev, data);
      if (!result?.error) formRef.current?.reset();
      return result;
    },
    null,
  );
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <textarea
          name="body"
          rows={2}
          required
          maxLength={4000}
          aria-label="Message"
          placeholder={placeholder}
          className={`${inputClass} flex-1 resize-y`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
              e.currentTarget.form?.requestSubmit();
          }}
        />
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
