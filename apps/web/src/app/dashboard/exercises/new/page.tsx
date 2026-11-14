import { Suspense } from 'react';
import { getCoachContext } from '@/lib/coach';
import { Card } from '@/components/ui';
import { createExercise } from '../actions';
import { ExerciseForm } from '../exercise-form';

export default function NewExercisePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New exercise</h1>
      <Card>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <NewExerciseForm />
        </Suspense>
      </Card>
    </>
  );
}

async function NewExerciseForm() {
  const { isLead } = await getCoachContext();
  return <ExerciseForm action={createExercise} canUseLibrary={isLead} isNew />;
}
