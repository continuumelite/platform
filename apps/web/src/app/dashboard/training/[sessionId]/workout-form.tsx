'use client';

import {
  fillFromTargets,
  newId,
  plannedSets,
  targetLoad,
  type LoadUnit,
  type Prescription,
  type SetLog,
  type Tracking,
  type WorkoutDocument,
} from '@continuum/shared';
import { startTransition, useActionState, useState } from 'react';
import { buttonClass, Card, FormMessage, inputClass, secondaryButtonClass } from '@/components/ui';
import { saveWebWorkout } from '../actions';

export type ExerciseLine = { prescription: Prescription; name: string; tracking: Tracking };

const cell = `${inputClass} w-20 py-1.5 text-center`;

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

/** A table per exercise: one row per set, ticked off as you go. Blank fields use the coach's targets. */
export function WorkoutForm({
  athleteProfileId,
  sessionId,
  sessionName,
  date,
  lines,
  existing,
}: {
  athleteProfileId: string;
  sessionId: string;
  sessionName: string;
  date: string;
  lines: ExerciseLine[];
  existing: WorkoutDocument | null;
}) {
  const [state, action, pending] = useActionState(saveWebWorkout, null);
  const [unit, setUnit] = useState<LoadUnit>(
    existing?.sets.find((s) => s.load != null)?.loadUnit ?? 'kg',
  );
  const [sets, setSets] = useState<SetLog[]>(() => {
    if (existing) return existing.sets;
    let position = 0;
    return lines.flatMap((l) => {
      const planned = plannedSets(l.prescription, 'kg', position);
      position += planned.length;
      return planned;
    });
  });
  const [rpe, setRpe] = useState(existing?.rpe != null ? String(existing.rpe) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const update = (id: string, patch: Partial<SetLog>) =>
    setSets((all) => all.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSet = (line: ExerciseLine) =>
    setSets((all) => {
      const mine = all.filter((s) => s.sessionExerciseId === line.prescription.id);
      return [
        ...all,
        {
          id: newId(),
          sessionExerciseId: line.prescription.id,
          exerciseId: line.prescription.exerciseId,
          position: all.length,
          setNumber: mine.length + 1,
          loadUnit: unit,
          completed: false,
        },
      ];
    });

  const removeSet = (id: string) => setSets((all) => all.filter((s) => s.id !== id));

  const save = () => {
    const byLine = new Map(lines.map((l) => [l.prescription.id, l]));
    const doc: WorkoutDocument = {
      id: existing?.id ?? newId(),
      athleteProfileId,
      sessionId,
      sessionName,
      performedOn: date,
      startedAt: existing?.startedAt ?? null,
      completedAt: existing?.completedAt ?? new Date().toISOString(),
      rpe: num(rpe),
      notes: notes.trim() || null,
      sets: sets.map((s, i) => {
        const line = s.sessionExerciseId ? byLine.get(s.sessionExerciseId) : undefined;
        const withUnit = { ...s, position: i, loadUnit: s.load != null ? s.loadUnit : unit };
        return s.completed && line
          ? fillFromTargets(withUnit, line.prescription, line.tracking)
          : withUnit;
      }),
    };
    const data = new FormData();
    data.set('workout', JSON.stringify(doc));
    startTransition(() => action(data));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        Weights in
        {(['kg', 'lb'] as const).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => {
              setUnit(u);
              setSets((all) => all.map((s) => (s.load == null ? { ...s, loadUnit: u } : s)));
            }}
            className={`rounded border px-2 py-0.5 ${unit === u ? 'border-cream bg-cream text-zinc-950' : 'border-zinc-700'}`}
          >
            {u}
          </button>
        ))}
      </div>

      {lines.map((line) => {
        const p = line.prescription;
        const mine = sets.filter((s) => s.sessionExerciseId === p.id);
        const load = targetLoad(p);
        const showLoad = line.tracking === 'weight_reps';
        const showReps = line.tracking === 'weight_reps' || line.tracking === 'reps';
        return (
          <Card key={p.id}>
            <h2 className="font-semibold">{line.name}</h2>
            <p className="text-sm text-zinc-400">
              Target:{' '}
              {[
                p.sets ? `${p.sets} sets` : null,
                p.reps,
                load ? `${load.load} ${load.unit}` : null,
                p.rpe ? `RPE ${p.rpe}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'as prescribed'}
            </p>
            <table className="mt-3 text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pr-3 text-left font-normal">Set</th>
                  {showLoad && <th className="px-1 font-normal">{unit}</th>}
                  {showReps && <th className="px-1 font-normal">Reps</th>}
                  {line.tracking === 'time' && <th className="px-1 font-normal">Seconds</th>}
                  {line.tracking === 'distance' && <th className="px-1 font-normal">Meters</th>}
                  <th className="px-1 font-normal">RPE</th>
                  <th className="px-1 font-normal">Done</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mine.map((s, i) => (
                  <tr key={s.id}>
                    <td className="pr-3 text-zinc-400">{i + 1}</td>
                    {showLoad && (
                      <td className="p-1">
                        <input
                          aria-label={`Set ${i + 1} weight`}
                          inputMode="decimal"
                          className={cell}
                          placeholder={load ? String(load.load) : ''}
                          value={s.load ?? ''}
                          onChange={(e) =>
                            update(s.id, { load: num(e.target.value), loadUnit: unit })
                          }
                        />
                      </td>
                    )}
                    {showReps && (
                      <td className="p-1">
                        <input
                          aria-label={`Set ${i + 1} reps`}
                          inputMode="numeric"
                          className={cell}
                          placeholder={p.reps ?? ''}
                          value={s.reps ?? ''}
                          onChange={(e) => update(s.id, { reps: num(e.target.value) })}
                        />
                      </td>
                    )}
                    {line.tracking === 'time' && (
                      <td className="p-1">
                        <input
                          aria-label={`Set ${i + 1} seconds`}
                          inputMode="numeric"
                          className={cell}
                          placeholder={p.reps ?? ''}
                          value={s.durationSeconds ?? ''}
                          onChange={(e) => update(s.id, { durationSeconds: num(e.target.value) })}
                        />
                      </td>
                    )}
                    {line.tracking === 'distance' && (
                      <td className="p-1">
                        <input
                          aria-label={`Set ${i + 1} meters`}
                          inputMode="decimal"
                          className={cell}
                          placeholder={p.reps ?? ''}
                          value={s.distanceMeters ?? ''}
                          onChange={(e) => update(s.id, { distanceMeters: num(e.target.value) })}
                        />
                      </td>
                    )}
                    <td className="p-1">
                      <input
                        aria-label={`Set ${i + 1} RPE`}
                        inputMode="decimal"
                        className={`${cell} w-16`}
                        placeholder={p.rpe ? String(p.rpe) : ''}
                        value={s.rpe ?? ''}
                        onChange={(e) => update(s.id, { rpe: num(e.target.value) })}
                      />
                    </td>
                    <td className="p-1 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Set ${i + 1} done`}
                        checked={s.completed}
                        onChange={(e) => update(s.id, { completed: e.target.checked })}
                        className="size-4 accent-[var(--color-cream)]"
                      />
                    </td>
                    <td className="p-1">
                      <button
                        type="button"
                        onClick={() => removeSet(s.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-50"
                        aria-label={`Remove set ${i + 1}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => addSet(line)}
              className={`${secondaryButtonClass} mt-2 self-start`}
            >
              + Add set
            </button>
          </Card>
        );
      })}

      <Card className="flex flex-col gap-3">
        <label className="flex items-center gap-3 text-sm">
          How hard was the session overall (RPE 1–10)?
          <input
            inputMode="decimal"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            className={`${cell} w-16`}
            aria-label="Session RPE"
          />
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Notes for your coach (optional)"
          className={inputClass}
          aria-label="Notes"
        />
      </Card>

      <div className="flex items-center gap-4">
        <button type="button" onClick={save} className={buttonClass} disabled={pending}>
          {pending ? 'Saving…' : existing ? 'Save changes' : 'Finish workout'}
        </button>
        <span className="text-xs text-zinc-500">
          Ticked sets with blank fields use your coach’s targets.
        </span>
        <FormMessage state={state} />
      </div>
    </div>
  );
}
