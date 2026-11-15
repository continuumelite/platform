import {
  DAY_TYPES,
  describeSet,
  localDateString,
  sumMacros,
  workoutVolumeKg,
  type NutritionTarget,
  type SetLog,
  type Tracking,
} from '@continuum/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { getCoachContext } from '@/lib/coach';
import { createClient } from '@/lib/supabase/server';
import { Card, secondaryButtonClass } from '@/components/ui';
import { StatusBadge } from '../../programs/status-badge';
import { PlanPicker } from './plan-picker';
import { NutritionTargetForm } from './nutrition-form';

export default function AthletePage({ params }: PageProps<'/dashboard/athletes/[id]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading athlete…</p>}>
      <Athlete params={params} />
    </Suspense>
  );
}

/** The first day of the last-7-days window, as YYYY-MM-DD. */
function sixDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return localDateString(d);
}

type SetRow = {
  id: string;
  exercise_id: string;
  position: number;
  set_number: number;
  reps: number | null;
  load: number | null;
  load_unit: 'kg' | 'lb';
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  completed: boolean;
  exercise: { name: string; tracking: Tracking } | null;
};

function toSetLog(r: SetRow): SetLog {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    position: r.position,
    setNumber: r.set_number,
    reps: r.reps,
    load: r.load,
    loadUnit: r.load_unit,
    durationSeconds: r.duration_seconds,
    distanceMeters: r.distance_meters,
    rpe: r.rpe,
    completed: r.completed,
  };
}

async function Athlete({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  await getCoachContext();
  const supabase = await createClient();

  const [
    { data: athlete },
    { data: programs },
    { data: workouts },
    { data: plans },
    { data: targetRows },
    { data: foodRows },
  ] = await Promise.all([
    supabase
      .from('athlete_profiles')
      .select(
        'id, organization_id, goals, injuries, profile:profiles(full_name), subscription:subscriptions(plan_id, source, status)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('programs')
      .select('id, name, status, start_date')
      .eq('athlete_profile_id', id)
      .neq('status', 'archived')
      .order('start_date', { ascending: false }),
    supabase
      .from('workout_logs')
      .select(
        'id, session_name, performed_on, completed_at, rpe, notes, sets:set_logs(id, exercise_id, position, set_number, reps, load, load_unit, duration_seconds, distance_meters, rpe, completed, exercise:exercises(name, tracking))',
      )
      .eq('athlete_profile_id', id)
      .order('performed_on', { ascending: false })
      .limit(20),
    supabase.from('plans').select('id, name, level, is_default').order('level'),
    supabase
      .from('nutrition_targets')
      .select('day_type, calories, protein_g, carbs_g, fat_g, notes')
      .eq('athlete_profile_id', id),
    supabase
      .from('food_logs')
      .select('logged_on, calories, protein_g, carbs_g, fat_g')
      .eq('athlete_profile_id', id)
      .gte('logged_on', sixDaysAgo())
      .order('logged_on', { ascending: false }),
  ]);

  // Row-level security hides athletes this coach doesn't work with.
  if (!athlete) notFound();
  const name = athlete.profile?.full_name ?? 'Athlete';
  const planOptions = (plans ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    level: p.level,
    isDefault: p.is_default,
  }));
  const subscription = athlete.subscription;
  const paidPlan =
    subscription && subscription.source !== 'manual'
      ? {
          planName: planOptions.find((p) => p.id === subscription.plan_id)?.name ?? 'Plan',
          source: subscription.source.replace('_', ' '),
        }
      : null;

  return (
    <>
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Athletes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl text-zinc-900 dark:text-zinc-50">{name}</h1>
          {athlete.goals && <p className="mt-1 text-sm text-zinc-500">Goal: {athlete.goals}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/messages/${athlete.id}`} className={secondaryButtonClass}>
            Message
          </Link>
          <Link
            href={`/dashboard/programs/new?athlete=${athlete.id}`}
            className={secondaryButtonClass}
          >
            New program
          </Link>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Subscription level</h2>
          <p className="text-sm text-zinc-400">
            Sets what {name.split(' ')[0]} can use in the app.
          </p>
        </div>
        <PlanPicker
          athleteProfileId={athlete.id}
          plans={planOptions}
          currentPlanId={subscription?.source === 'manual' ? subscription.plan_id : null}
          paid={paidPlan}
        />
      </Card>

      <NutritionCard
        athleteProfileId={athlete.id}
        firstName={name.split(' ')[0] ?? name}
        targets={(targetRows ?? []).map((t) => ({
          dayType: t.day_type,
          calories: t.calories,
          proteinG: t.protein_g,
          carbsG: t.carbs_g,
          fatG: t.fat_g,
          notes: t.notes,
        }))}
        days={foodRows ?? []}
      />

      <Card className="p-0">
        <h2 className="px-6 pt-5 pb-2 text-base font-semibold">Programs</h2>
        {programs?.length ? (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {programs.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/programs/${p.id}`}
                  className="flex items-center justify-between gap-2 px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 pb-5 text-sm text-zinc-500">No programs yet.</p>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Logged workouts</h2>
        {!workouts?.length && (
          <p className="text-sm text-zinc-500">
            Nothing logged yet. Workouts appear here as soon as {name.split(' ')[0]} finishes one in
            the app.
          </p>
        )}
        {workouts?.map((w) => {
          const sets = ((w.sets ?? []) as SetRow[]).sort((a, b) => a.position - b.position);
          const done = sets.filter((s) => s.completed);
          const volume = workoutVolumeKg(sets.map(toSetLog));
          // Group by exercise, keeping the logged order.
          const byExercise = new Map<string, SetRow[]>();
          for (const s of sets)
            byExercise.set(s.exercise_id, [...(byExercise.get(s.exercise_id) ?? []), s]);

          return (
            <Card key={w.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs tracking-[0.15em] text-zinc-500 uppercase">
                    {new Date(`${w.performed_on}T00:00`).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {!w.completed_at && ' · in progress'}
                  </p>
                  <h3 className="font-display text-xl tracking-wide">
                    {w.session_name || 'Workout'}
                  </h3>
                </div>
                <p className="text-sm text-zinc-500">
                  {done.length} of {sets.length} sets
                  {volume > 0 && ` · ${volume.toLocaleString()} kg volume`}
                  {w.rpe != null && ` · session RPE ${w.rpe}`}
                </p>
              </div>

              <dl className="mt-4 grid gap-2 text-sm">
                {[...byExercise.values()].map((rows) => {
                  const tracking = rows[0]!.exercise?.tracking ?? 'weight_reps';
                  const completed = rows.filter((r) => r.completed);
                  return (
                    <div key={rows[0]!.exercise_id} className="grid gap-1 sm:grid-cols-[200px_1fr]">
                      <dt className="font-medium">{rows[0]!.exercise?.name ?? 'Exercise'}</dt>
                      <dd className="text-zinc-600 dark:text-zinc-400">
                        {completed.length
                          ? completed.map((r) => describeSet(toSetLog(r), tracking)).join(' · ')
                          : 'Skipped'}
                        {completed.length > 0 && completed.length < rows.length && (
                          <span className="text-zinc-400">
                            {' '}
                            ({rows.length - completed.length} skipped)
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              {w.notes && (
                <p className="mt-4 border-l-2 border-slate-deep pl-3 text-sm italic dark:border-slate">
                  “{w.notes}”
                </p>
              )}
            </Card>
          );
        })}
      </section>
    </>
  );
}

type FoodDayRow = {
  logged_on: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function NutritionCard({
  athleteProfileId,
  firstName,
  targets,
  days,
}: {
  athleteProfileId: string;
  firstName: string;
  targets: NutritionTarget[];
  days: FoodDayRow[];
}) {
  const byDay = new Map<string, FoodDayRow[]>();
  for (const d of days) byDay.set(d.logged_on, [...(byDay.get(d.logged_on) ?? []), d]);
  const anyTarget = targets.find((t) => t.dayType === 'any');

  return (
    <Card>
      <h2 className="text-base font-semibold">Nutrition</h2>
      <p className="text-sm text-zinc-400">
        Targets {firstName} sees in the app. Training and rest days override “every day” when set.
      </p>
      <div className="mt-2 divide-y divide-zinc-800">
        {DAY_TYPES.map((dayType) => (
          <NutritionTargetForm
            key={dayType}
            athleteProfileId={athleteProfileId}
            dayType={dayType}
            target={targets.find((t) => t.dayType === dayType) ?? null}
          />
        ))}
      </div>
      <h3 className="mt-4 text-sm font-semibold">Last 7 days</h3>
      {byDay.size === 0 ? (
        <p className="mt-1 text-sm text-zinc-500">Nothing logged this week.</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="py-1 font-normal">Day</th>
              <th className="py-1 font-normal">kcal</th>
              <th className="py-1 font-normal">Protein</th>
              <th className="py-1 font-normal">Carbs</th>
              <th className="py-1 font-normal">Fat</th>
            </tr>
          </thead>
          <tbody>
            {[...byDay.entries()].map(([day, rows]) => {
              const t = sumMacros(
                rows.map((r) => ({
                  calories: r.calories,
                  proteinG: Number(r.protein_g),
                  carbsG: Number(r.carbs_g),
                  fatG: Number(r.fat_g),
                })),
              );
              const over = anyTarget?.calories != null && t.calories > anyTarget.calories * 1.1;
              return (
                <tr key={day} className="border-t border-zinc-800">
                  <td className="py-1.5">
                    {new Date(`${day}T00:00`).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className={`py-1.5 ${over ? 'text-signal' : ''}`}>{t.calories}</td>
                  <td className="py-1.5">{t.proteinG} g</td>
                  <td className="py-1.5">{t.carbsG} g</td>
                  <td className="py-1.5">{t.fatG} g</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
