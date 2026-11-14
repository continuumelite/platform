import { startTransition, type FormEvent } from 'react';

/**
 * React resets a form after its `action` runs, even when the server returns a
 * validation error, so the user loses what they typed. Submitting through
 * onSubmit instead keeps the values; a successful action redirects anyway.
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
