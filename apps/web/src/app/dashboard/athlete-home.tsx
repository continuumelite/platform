import {
  DAYS_OF_WEEK,
  localDateString,
  locateInProgram,
  sumMacros,
  targetFor,
  timeAgo,
} from '@continuum/shared';
import Link from 'next/link';
import { canUse, completedSessions, getAthleteContext } from '@/lib/athlete';
import { fetchFeed } from '@/lib/community';
import { createClient } from '@/lib/supabase/server';
import { buttonClass, Card, secondaryButtonClass } from '@/components/ui';

const label = 'text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase';

/** The athlete's web home: the same personal-status-first layout as the app. */
export async function AthleteHome() {
  const ctx = await getAthleteContext();
  const { program, athleteProfileId, entitlements, user } = ctx;
  const supabase = await createClient();
  const today = localDateString();
  const position = program ? locateInProgram(program.document, program.startDate, today) : null;
  const isTrainingDay = position?.status === 'in_progress' && position.todaysSessions.length > 0;

  const [completed, { data: unread }, { data: targets }, { data: food }, feed] = await Promise.all([
    completedSessions(athleteProfileId, program),
    supabase.rpc('my_unread_messages'),
    supabase
      .from('nutrition_targets')
      .select('day_type, calories, protein_g, carbs_g, fat_g, notes')
      .eq('athlete_profile_id', athleteProfileId),
    supabase
      .from('food_logs')
      .select('calories, protein_g, carbs_g, fat_g')
      .eq('athlete_profile_id', athleteProfileId)
      .eq('logged_on', today),
    canUse(entitlements, 'community.view') ? fetchFeed(user.id, 3) : null,
  ]);

  const unreadCount = (unread ?? []).reduce((n, t) => n + t.unread, 0);
  const target = targetFor(
    (targets ?? []).map((t) => ({
      dayType: t.day_type,
      calories: t.calories,
      proteinG: t.protein_g,
      carbsG: t.carbs_g,
      fatG: t.fat_g,
      notes: t.notes,
    })),
    isTrainingDay,
  );
  const eaten = sumMacros(
    (food ?? []).map((f) => ({
      calories: f.calories,
      proteinG: Number(f.protein_g),
      carbsG: Number(f.carbs_g),
      fatG: Number(f.fat_g),
    })),
  );

  return (
    <>
      <div>
        <p className="text-sm text-zinc-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="text-5xl text-zinc-50">Hi {user.fullName?.split(' ')[0] ?? 'there'}</h1>
      </div>

      {unreadCount > 0 && (
        <Link href="/dashboard/messages" className="block">
          <Card className="hover:border-cream/40">
            <p className={label}>Coach hub · {unreadCount} new</p>
            <p className="mt-2">{ctx.coachName ?? 'Your coach'} sent you a message.</p>
          </Card>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className={label}>Today</p>
          {!program ? (
            <p className="mt-2 text-sm text-zinc-400">
              {ctx.coachName
                ? `${ctx.coachName} hasn’t assigned a program yet.`
                : 'No program yet.'}
            </p>
          ) : position?.status !== 'in_progress' ? (
            <p className="mt-2 text-sm text-zinc-400">
              {position?.status === 'not_started'
                ? `${program.name} starts in ${position.startsInDays} day${position.startsInDays === 1 ? '' : 's'}.`
                : position?.status === 'finished'
                  ? 'You’ve finished your program.'
                  : 'Your coach hasn’t set a start date yet.'}
            </p>
          ) : position.todaysSessions.length ? (
            position.todaysSessions.map((s) => (
              <div key={s.id} className="mt-2 flex flex-col gap-3">
                <h2 className="font-display text-3xl tracking-wide">{s.name || 'Session'}</h2>
                <p className="text-sm text-zinc-400">
                  {s.exercises.length} exercise{s.exercises.length === 1 ? '' : 's'}
                </p>
                <Link
                  href={`/dashboard/training/${s.id}?date=${completed.get(s.id) ?? today}`}
                  className={completed.has(s.id) ? secondaryButtonClass : buttonClass}
                >
                  {completed.has(s.id) ? 'View workout ✓' : 'Log workout'}
                </Link>
              </div>
            ))
          ) : (
            <>
              <h2 className="mt-2 font-display text-3xl tracking-wide">Rest day</h2>
              <p className="text-sm text-zinc-400">
                {position.next
                  ? `Next up: ${position.next.session.name || 'session'} on ${DAYS_OF_WEEK[position.next.dayOfWeek - 1]}.`
                  : 'Nothing else scheduled in this program.'}
              </p>
            </>
          )}
        </Card>

        {position?.status === 'in_progress' && program && (
          <Link href="/dashboard/training" className="block">
            <Card className="h-full hover:border-cream/40">
              <p className={label}>Training status</p>
              <h2 className="mt-2 font-display text-3xl tracking-wide">
                Week {position.weekNumber} of {position.totalWeeks}
              </h2>
              <p className="text-sm text-zinc-400">
                {program.name}
                {position.blockName ? ` · ${position.blockName}` : ''}
              </p>
              <Progress
                done={position.week.sessions.filter((s) => completed.has(s.id)).length}
                total={position.week.sessions.length}
              />
            </Card>
          </Link>
        )}

        <Link href="/dashboard/nutrition" className="block">
          <Card className="h-full hover:border-cream/40">
            <p className={label}>Nutrition today</p>
            <h2 className="mt-2 font-display text-3xl tracking-wide">
              {target?.calories != null
                ? `${Math.max(0, target.calories - eaten.calories).toLocaleString()} kcal left`
                : `${eaten.calories.toLocaleString()} kcal`}
            </h2>
            <p className="text-sm text-zinc-400">
              Protein {eaten.proteinG}
              {target?.proteinG != null ? ` / ${target.proteinG}` : ''} g · Carbs {eaten.carbsG} g ·
              Fat {eaten.fatG} g
            </p>
          </Card>
        </Link>

        {ctx.goals && (
          <Card>
            <p className={label}>Your goal</p>
            <p className="mt-2">{ctx.goals}</p>
          </Card>
        )}
      </div>

      {feed && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className={label}>Community</p>
            <Link
              href="/dashboard/community"
              className="text-xs tracking-[0.2em] text-signal uppercase"
            >
              See all
            </Link>
          </div>
          {feed.posts.length === 0 && <p className="text-sm text-zinc-500">Nothing yet.</p>}
          {feed.posts.map((p) => (
            <Link key={p.id} href="/dashboard/community" className="block">
              <div
                className={`rounded-lg border bg-zinc-900 p-4 ${
                  p.fromCoach
                    ? 'border-cream/40 shadow-[inset_3px_0_0_var(--color-cream)]'
                    : 'border-zinc-800'
                }`}
              >
                <p className="text-sm">
                  <span className="font-semibold">{p.authorName}</span>
                  {p.fromCoach && <span className="ml-2 text-xs text-cream">Coach</span>}
                  <span className="ml-2 text-xs text-zinc-500">{timeAgo(p.createdAt)}</span>
                </p>
                <p className="mt-1 line-clamp-3 text-sm text-zinc-300">{p.body}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded bg-zinc-800">
        <div className="h-1.5 rounded bg-cream" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {done} of {total} sessions done this week
      </p>
    </div>
  );
}
