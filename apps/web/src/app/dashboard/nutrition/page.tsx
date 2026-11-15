import {
  localDateString,
  locateInProgram,
  MEAL_LABELS,
  MEAL_SLOTS,
  sumMacros,
  targetFor,
} from '@continuum/shared';
import Link from 'next/link';
import { Suspense } from 'react';
import { z } from 'zod';
import { canUse, getAthleteContext } from '@/lib/athlete';
import { createClient } from '@/lib/supabase/server';
import { Card, secondaryButtonClass } from '@/components/ui';
import { removeFood } from './actions';
import { AddFoodForm } from './add-food-form';

export default function NutritionPage({ searchParams }: PageProps<'/dashboard/nutrition'>) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Nutrition searchParams={searchParams} />
    </Suspense>
  );
}

function shift(date: string, days: number) {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

async function Nutrition({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { date: dateParam } = await searchParams;
  const today = localDateString();
  const date = z.iso.date().safeParse(dateParam).data ?? today;
  const ctx = await getAthleteContext();
  const supabase = await createClient();

  const [{ data: targetRows }, { data: rows }] = await Promise.all([
    supabase
      .from('nutrition_targets')
      .select('day_type, calories, protein_g, carbs_g, fat_g, notes')
      .eq('athlete_profile_id', ctx.athleteProfileId),
    supabase
      .from('food_logs')
      .select('id, meal, name, quantity, calories, protein_g, carbs_g, fat_g')
      .eq('athlete_profile_id', ctx.athleteProfileId)
      .eq('logged_on', date)
      .order('created_at'),
  ]);

  const position = ctx.program
    ? locateInProgram(ctx.program.document, ctx.program.startDate, date)
    : null;
  const trainingDay = position?.status === 'in_progress' && position.todaysSessions.length > 0;
  const target = targetFor(
    (targetRows ?? []).map((t) => ({
      dayType: t.day_type,
      calories: t.calories,
      proteinG: t.protein_g,
      carbsG: t.carbs_g,
      fatG: t.fat_g,
      notes: t.notes,
    })),
    trainingDay,
  );
  const entries = (rows ?? []).map((r) => ({
    ...r,
    proteinG: Number(r.protein_g),
    carbsG: Number(r.carbs_g),
    fatG: Number(r.fat_g),
  }));
  const eaten = sumMacros(entries);
  const canLog = canUse(ctx.entitlements, 'nutrition.logging');
  const macros = [
    { label: 'Protein', value: eaten.proteinG, goal: target?.proteinG },
    { label: 'Carbs', value: eaten.carbsG, goal: target?.carbsG },
    { label: 'Fat', value: eaten.fatG, goal: target?.fatG },
  ];

  return (
    <>
      <h1 className="text-4xl text-zinc-50">Nutrition</h1>
      <nav
        className="flex items-center justify-between border-y border-zinc-800 py-3"
        aria-label="Days"
      >
        <Link
          href={`?date=${shift(date, -1)}`}
          className={secondaryButtonClass}
          aria-label="Previous day"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="font-semibold">
            {date === today
              ? 'Today'
              : new Date(`${date}T00:00`).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
          </p>
          <p className="text-xs text-zinc-400">{trainingDay ? 'Training day' : 'Rest day'}</p>
        </div>
        {date < today ? (
          <Link
            href={`?date=${shift(date, 1)}`}
            className={secondaryButtonClass}
            aria-label="Next day"
          >
            →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <Card>
        <p className="text-xs tracking-[0.2em] text-zinc-400 uppercase">
          {target?.calories != null ? 'Calories remaining' : 'Calories eaten'}
        </p>
        <p
          className={`font-display text-5xl ${target?.calories != null && eaten.calories > target.calories ? 'text-signal' : ''}`}
        >
          {(target?.calories != null
            ? target.calories - eaten.calories
            : eaten.calories
          ).toLocaleString()}
        </p>
        <p className="text-sm text-zinc-400">
          {target?.calories != null
            ? `${eaten.calories.toLocaleString()} of ${target.calories.toLocaleString()} kcal eaten`
            : 'Your coach hasn’t set targets yet.'}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {macros.map((m) => (
            <div key={m.label}>
              <p className="text-xs text-zinc-400">{m.label}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800">
                <div
                  className={`h-1.5 rounded ${m.goal != null && m.value > m.goal ? 'bg-signal' : 'bg-cream'}`}
                  style={{
                    width: `${m.goal ? Math.min(100, Math.round((m.value / m.goal) * 100)) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-sm font-semibold">
                {m.value}
                {m.goal != null ? ` / ${m.goal}` : ''} g
              </p>
            </div>
          ))}
        </div>
        {target?.notes && <p className="mt-3 text-sm text-zinc-400">Coach: {target.notes}</p>}
      </Card>

      <Card className="flex flex-col divide-y divide-zinc-800 py-2">
        {MEAL_SLOTS.map((meal) => {
          const items = entries.filter((e) => e.meal === meal);
          return (
            <section key={meal} className="py-3">
              <h2 className="flex items-baseline gap-2 font-semibold">
                {MEAL_LABELS[meal]}
                {items.length > 0 && (
                  <span className="text-xs font-normal text-zinc-500">
                    {sumMacros(items).calories} kcal
                  </span>
                )}
              </h2>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <span className="flex-1">
                      {item.name}
                      <span className="ml-2 text-xs text-zinc-500">
                        {[item.quantity, `P ${item.proteinG} · C ${item.carbsG} · F ${item.fatG}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="text-zinc-400">{item.calories}</span>
                    {canLog && (
                      <form action={removeFood.bind(null, item.id)}>
                        <button
                          type="submit"
                          className="text-xs text-zinc-500 hover:text-zinc-50"
                          aria-label={`Remove ${item.name}`}
                        >
                          ✕
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              {canLog && <AddFoodForm meal={meal} date={date} />}
            </section>
          );
        })}
      </Card>
      {!canLog && (
        <p className="text-sm text-zinc-500">Food logging isn’t included in your plan.</p>
      )}
    </>
  );
}
