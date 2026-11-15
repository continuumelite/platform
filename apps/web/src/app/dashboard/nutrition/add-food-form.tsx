'use client';

import { MEAL_LABELS, type MealSlot } from '@continuum/shared';
import { useActionState, useRef } from 'react';
import { FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';
import { addFood } from './actions';

export function AddFoodForm({ meal, date }: { meal: MealSlot; date: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: Parameters<typeof addFood>[0], data: FormData) => {
      const result = await addFood(prev, data);
      if (!result?.error) formRef.current?.reset();
      return result;
    },
    null,
  );
  const small = `${inputClass} w-20 py-1.5`;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs tracking-[0.15em] text-cream uppercase">
        + Add to {MEAL_LABELS[meal]}
      </summary>
      <form ref={formRef} action={action} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="meal" value={meal} />
        <input type="hidden" name="date" value={date} />
        <input
          name="name"
          required
          maxLength={200}
          placeholder="Food"
          aria-label="Food"
          className={`${inputClass} w-56 py-1.5`}
        />
        <input
          name="quantity"
          maxLength={100}
          placeholder="Amount"
          aria-label="Amount"
          className={`${inputClass} w-28 py-1.5`}
        />
        <input
          name="calories"
          inputMode="numeric"
          placeholder="kcal"
          aria-label="Calories"
          className={small}
        />
        <input
          name="proteinG"
          inputMode="decimal"
          placeholder="P g"
          aria-label="Protein grams"
          className={small}
        />
        <input
          name="carbsG"
          inputMode="decimal"
          placeholder="C g"
          aria-label="Carbs grams"
          className={small}
        />
        <input
          name="fatG"
          inputMode="decimal"
          placeholder="F g"
          aria-label="Fat grams"
          className={small}
        />
        <button type="submit" className={secondaryButtonClass} disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </button>
        <FormMessage state={state} />
      </form>
    </details>
  );
}
