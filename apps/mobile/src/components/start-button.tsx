import { router } from 'expo-router';

import { Button } from '@/components/ui';
import { hasDraft } from '@/lib/workouts';

/** Start, continue or view the workout for a planned session. */
export function StartButton({
  sessionId,
  completedOn,
  today,
  locked = false,
}: {
  sessionId: string;
  completedOn: string | undefined;
  today: string;
  /** The athlete's subscription level doesn't include workout logging. */
  locked?: boolean;
}) {
  if (locked) {
    return (
      <Button
        title="Logging not in your plan · See plans"
        variant="secondary"
        onPress={() => router.push({ pathname: '/more/[tool]', params: { tool: 'upgrade' } })}
      />
    );
  }
  // A finished workout opens on the day it was done; otherwise it's logged today.
  const date = completedOn ?? today;
  const title = completedOn
    ? 'View workout ✓'
    : hasDraft(sessionId, today)
      ? 'Continue workout'
      : 'Start workout';
  return (
    <Button
      title={title}
      variant={completedOn ? 'secondary' : 'primary'}
      onPress={() => router.push({ pathname: '/workout/[sessionId]', params: { sessionId, date } })}
    />
  );
}
