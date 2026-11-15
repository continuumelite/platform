'use client';

import {
  cloneWithNewIds,
  DAYS_OF_WEEK,
  describePrescription,
  LOAD_TYPES,
  newBlock,
  newPrescription,
  newSession,
  newWeek,
  programStats,
  type LoadType,
  type Prescription,
  type ProgramDocument,
  type ProgramSession,
} from '@continuum/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { buttonClass, Card, inputClass, secondaryButtonClass } from '@/components/ui';
import { saveProgram } from '../actions';

export type ExerciseOption = {
  id: string;
  name: string;
  tracking: string;
  group: 'Library' | 'Mine' | 'Other coaches';
};

type Props = {
  programId: string;
  version: number;
  initialDocument: ProgramDocument;
  exercises: ExerciseOption[];
  readOnly: boolean;
  startDate: string | null;
};

type WeekRef = { blockIndex: number; weekIndex: number };

const cellInput = `${inputClass} px-2 py-1.5`;
/** A cell input with a fixed width instead of filling its container. */
const sized = (width: string) => `${cellInput.replace('w-full ', '')} ${width}`;
const iconButton =
  'rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item!);
}

const toNumber = (value: string) => (value.trim() === '' ? null : Number(value));

export function ProgramEditor({
  programId,
  version: initialVersion,
  initialDocument,
  exercises,
  readOnly,
  startDate,
}: Props) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDocument);
  const [version, setVersion] = useState(initialVersion);
  const [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<{
    error?: string;
    conflict?: boolean;
    saved?: boolean;
  } | null>(null);
  const [saving, startSaving] = useTransition();
  const [selected, setSelected] = useState<WeekRef>({ blockIndex: 0, weekIndex: 0 });

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const stats = programStats(doc);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function update(change: (draft: ProgramDocument) => void) {
    if (readOnly) return;
    setDoc((prev) => {
      const next = structuredClone(prev);
      change(next);
      return next;
    });
    setDirty(true);
    setStatus(null);
  }

  function save() {
    startSaving(async () => {
      const result = await saveProgram(programId, version, doc, reason);
      if (result.ok) {
        setVersion(result.version);
        setDirty(false);
        setReason('');
        setStatus({ saved: true });
        router.refresh();
      } else {
        setStatus({ error: result.error, conflict: result.conflict });
      }
    });
  }

  // Cmd/Ctrl+S saves.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && !saving && !readOnly) save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Keep the selection valid after blocks/weeks are removed.
  const block = doc.blocks[selected.blockIndex] ?? doc.blocks[0];
  const blockIndex = block ? doc.blocks.indexOf(block) : -1;
  const week = block?.weeks[selected.weekIndex] ?? block?.weeks[0];
  const weekIndex = block && week ? block.weeks.indexOf(week) : -1;

  // Week numbers run across blocks (Week 1…N), with dates when the program has a start date.
  let counter = 0;
  const weekNumbers = doc.blocks.map((b) => b.weeks.map(() => ++counter));
  const weekNumber = blockIndex >= 0 && weekIndex >= 0 ? weekNumbers[blockIndex]![weekIndex]! : 0;
  const weekStart = (n: number) => {
    if (!startDate) return null;
    const d = new Date(`${startDate}T00:00`);
    d.setDate(d.getDate() + (n - 1) * 7);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const groups = (['Library', 'Mine', 'Other coaches'] as const)
    .map((g) => ({ label: g, options: exercises.filter((e) => e.group === g) }))
    .filter((g) => g.options.length);

  return (
    <div className="flex flex-col gap-6 pb-28">
      <Card>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Program name
            <input
              className={inputClass}
              value={doc.name}
              disabled={readOnly}
              onChange={(e) => update((d) => void (d.name = e.target.value))}
            />
          </label>
          <p className="self-end text-sm text-zinc-500">
            {stats.blocks} block{stats.blocks === 1 ? '' : 's'} · {stats.weeks} week
            {stats.weeks === 1 ? '' : 's'} · {stats.sessions} session
            {stats.sessions === 1 ? '' : 's'}
          </p>
        </div>
        <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notes for the athlete
          <textarea
            rows={2}
            className={inputClass}
            value={doc.description ?? ''}
            disabled={readOnly}
            placeholder="Goals of this program, how to approach it…"
            onChange={(e) => update((d) => void (d.description = e.target.value))}
          />
        </label>
      </Card>

      {/* Blocks and their weeks */}
      <Card>
        <div className="flex flex-col gap-4">
          {doc.blocks.map((b, bi) => (
            <div key={b.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Block name"
                  className={`${cellInput} max-w-xs font-medium`}
                  value={b.name}
                  placeholder={`Block ${bi + 1}`}
                  disabled={readOnly}
                  onChange={(e) => update((d) => void (d.blocks[bi]!.name = e.target.value))}
                />
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      className={iconButton}
                      disabled={bi === 0}
                      onClick={() => update((d) => move(d.blocks, bi, bi - 1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      disabled={bi === doc.blocks.length - 1}
                      onClick={() => update((d) => move(d.blocks, bi, bi + 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      disabled={doc.blocks.length === 1}
                      onClick={() => {
                        if (confirm(`Delete “${b.name || `Block ${bi + 1}`}” and all its weeks?`)) {
                          update((d) => void d.blocks.splice(bi, 1));
                          setSelected({ blockIndex: 0, weekIndex: 0 });
                        }
                      }}
                    >
                      Delete block
                    </button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {b.weeks.map((w, wi) => {
                  const active = bi === blockIndex && wi === weekIndex;
                  const n = weekNumbers[bi]![wi]!;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected({ blockIndex: bi, weekIndex: wi })}
                      className={`rounded-lg border px-3 py-1.5 text-left text-sm ${
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Week {n}
                      {w.isDeload && <span className="ml-1 text-xs opacity-70">deload</span>}
                      {weekStart(n) && (
                        <span className="block text-xs opacity-60">{weekStart(n)}</span>
                      )}
                    </button>
                  );
                })}
                {!readOnly && (
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      update((d) => void d.blocks[bi]!.weeks.push(newWeek()));
                      setSelected({ blockIndex: bi, weekIndex: b.weeks.length });
                    }}
                  >
                    + Week
                  </button>
                )}
              </div>
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              className={`${secondaryButtonClass} self-start`}
              onClick={() => {
                update((d) => void d.blocks.push(newBlock(`Block ${d.blocks.length + 1}`)));
                setSelected({ blockIndex: doc.blocks.length, weekIndex: 0 });
              }}
            >
              + Block
            </button>
          )}
        </div>
      </Card>

      {/* The selected week */}
      {block && week ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Week {weekNumber}
              <span className="ml-2 text-sm font-normal text-zinc-500">
                {block.name || `Block ${blockIndex + 1}`}
              </span>
            </h2>
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={week.isDeload}
                    onChange={(e) =>
                      update(
                        (d) =>
                          void (d.blocks[blockIndex]!.weeks[weekIndex]!.isDeload =
                            e.target.checked),
                      )
                    }
                  />
                  Deload week
                </label>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    update((d) => {
                      const weeks = d.blocks[blockIndex]!.weeks;
                      weeks.splice(weekIndex + 1, 0, cloneWithNewIds(weeks[weekIndex]!));
                    });
                    setSelected({ blockIndex, weekIndex: weekIndex + 1 });
                  }}
                >
                  Duplicate week
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={block.weeks.length === 1}
                  onClick={() => {
                    if (confirm(`Delete week ${weekNumber} and its sessions?`)) {
                      update((d) => void d.blocks[blockIndex]!.weeks.splice(weekIndex, 1));
                      setSelected({ blockIndex, weekIndex: Math.max(0, weekIndex - 1) });
                    }
                  }}
                >
                  Delete week
                </button>
              </div>
            )}
          </div>

          <textarea
            aria-label="Week notes"
            rows={1}
            className={inputClass}
            value={week.notes ?? ''}
            disabled={readOnly}
            placeholder="Notes for this week (optional)"
            onChange={(e) =>
              update((d) => void (d.blocks[blockIndex]!.weeks[weekIndex]!.notes = e.target.value))
            }
          />

          {week.sessions.map((session, si) => (
            <SessionCard
              key={session.id}
              session={session}
              index={si}
              count={week.sessions.length}
              readOnly={readOnly}
              groups={groups}
              exerciseById={exerciseById}
              defaultExerciseId={exercises[0]?.id}
              onChange={(change) =>
                update((d) => change(d.blocks[blockIndex]!.weeks[weekIndex]!.sessions[si]!))
              }
              onMove={(to) =>
                update((d) => move(d.blocks[blockIndex]!.weeks[weekIndex]!.sessions, si, to))
              }
              onDuplicate={() =>
                update((d) => {
                  const sessions = d.blocks[blockIndex]!.weeks[weekIndex]!.sessions;
                  sessions.splice(si + 1, 0, {
                    ...cloneWithNewIds(sessions[si]!),
                    name: `${sessions[si]!.name} (copy)`,
                  });
                })
              }
              onDelete={() => {
                if (confirm(`Delete “${session.name || `Session ${si + 1}`}”?`)) {
                  update(
                    (d) => void d.blocks[blockIndex]!.weeks[weekIndex]!.sessions.splice(si, 1),
                  );
                }
              }}
            />
          ))}

          {week.sessions.length === 0 && (
            <p className="text-sm text-zinc-500">No sessions in this week yet.</p>
          )}

          {!readOnly && (
            <button
              type="button"
              className={`${secondaryButtonClass} self-start`}
              onClick={() =>
                update(
                  (d) =>
                    void d.blocks[blockIndex]!.weeks[weekIndex]!.sessions.push(
                      newSession(`Session ${week.sessions.length + 1}`),
                    ),
                )
              }
            >
              + Session
            </button>
          )}
        </section>
      ) : (
        <p className="text-sm text-zinc-500">Add a block to start building.</p>
      )}

      {/* Save bar */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
            <p className="text-sm text-zinc-500 sm:w-40" role="status">
              {saving
                ? 'Saving…'
                : status?.error
                  ? ''
                  : dirty
                    ? 'Unsaved changes'
                    : status?.saved
                      ? `Saved · v${version}`
                      : `v${version}`}
            </p>
            <input
              aria-label="Reason for this change"
              className={`${inputClass} flex-1`}
              value={reason}
              maxLength={1000}
              placeholder="Why this change? e.g. “cut volume 20%: poor sleep” (optional)"
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              type="button"
              className={buttonClass}
              disabled={!dirty || saving}
              onClick={save}
            >
              Save
            </button>
            {status?.error && (
              <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
                {status.error}{' '}
                {status.conflict && (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => window.location.reload()}
                  >
                    Reload (your unsaved changes will be lost)
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type Groups = { label: string; options: ExerciseOption[] }[];

function ExerciseSelect({
  value,
  groups,
  disabled,
  onChange,
  label,
}: {
  value: string;
  groups: Groups;
  disabled?: boolean;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      className={cellInput}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function SessionCard({
  session,
  index,
  count,
  readOnly,
  groups,
  exerciseById,
  defaultExerciseId,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  session: ProgramSession;
  index: number;
  count: number;
  readOnly: boolean;
  groups: Groups;
  exerciseById: Map<string, ExerciseOption>;
  defaultExerciseId?: string;
  onChange: (change: (s: ProgramSession) => void) => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [adding, setAdding] = useState(defaultExerciseId ?? '');

  const setField = <K extends keyof Prescription>(ei: number, key: K, value: Prescription[K]) =>
    onChange((s) => void (s.exercises[ei]![key] = value));

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Session name"
          className={`${sized('w-64')} font-medium`}
          value={session.name}
          placeholder={`Session ${index + 1}`}
          disabled={readOnly}
          onChange={(e) => onChange((s) => void (s.name = e.target.value))}
        />
        <select
          aria-label="Day of the week"
          className={sized('w-28')}
          value={session.dayOfWeek ?? ''}
          disabled={readOnly}
          onChange={(e) => onChange((s) => void (s.dayOfWeek = toNumber(e.target.value)))}
        >
          <option value="">Any day</option>
          {DAYS_OF_WEEK.map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
        {!readOnly && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              className={iconButton}
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={iconButton}
              disabled={index === count - 1}
              onClick={() => onMove(index + 1)}
            >
              ↓
            </button>
            <button type="button" className={iconButton} onClick={onDuplicate}>
              Duplicate
            </button>
            <button type="button" className={iconButton} onClick={onDelete}>
              Delete
            </button>
          </div>
        )}
      </div>

      {session.exercises.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500">
                <th className="w-10 pb-2 font-medium">SS</th>
                <th className="pb-2 font-medium">Exercise</th>
                <th className="w-16 pb-2 font-medium">Sets</th>
                <th className="w-20 pb-2 font-medium">Reps</th>
                <th className="w-56 pb-2 font-medium">Load</th>
                <th className="w-16 pb-2 font-medium">RPE</th>
                <th className="w-20 pb-2 font-medium">Tempo</th>
                <th className="w-20 pb-2 font-medium">Rest (s)</th>
                {!readOnly && <th className="w-24 pb-2" />}
              </tr>
            </thead>
            <tbody>
              {session.exercises.map((p, ei) => (
                <PrescriptionRow
                  key={p.id}
                  p={p}
                  readOnly={readOnly}
                  groups={groups}
                  exerciseName={exerciseById.get(p.exerciseId)?.name ?? 'Unknown exercise'}
                  isFirst={ei === 0}
                  isLast={ei === session.exercises.length - 1}
                  setField={(key, value) => setField(ei, key, value)}
                  onMove={(to) => onChange((s) => move(s.exercises, ei, ei + to))}
                  onRemove={() => onChange((s) => void s.exercises.splice(ei, 1))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && groups.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1 sm:max-w-sm">
            <ExerciseSelect
              label="Exercise to add"
              value={adding}
              groups={groups}
              onChange={setAdding}
            />
          </div>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!adding}
            onClick={() => onChange((s) => void s.exercises.push(newPrescription(adding)))}
          >
            + Add exercise
          </button>
        </div>
      )}

      <textarea
        aria-label="Session notes"
        rows={1}
        className={`${inputClass} mt-3`}
        value={session.notes ?? ''}
        disabled={readOnly}
        placeholder="Session notes (warm-up, focus…)"
        onChange={(e) => onChange((s) => void (s.notes = e.target.value))}
      />
    </Card>
  );
}

function PrescriptionRow({
  p,
  readOnly,
  groups,
  exerciseName,
  isFirst,
  isLast,
  setField,
  onMove,
  onRemove,
}: {
  p: Prescription;
  readOnly: boolean;
  groups: Groups;
  exerciseName: string;
  isFirst: boolean;
  isLast: boolean;
  setField: <K extends keyof Prescription>(key: K, value: Prescription[K]) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  if (readOnly) {
    return (
      <tr className="border-t border-zinc-100 dark:border-zinc-800">
        <td className="py-2 text-zinc-500">{p.superset}</td>
        <td className="py-2" colSpan={7}>
          <span className="font-medium">{exerciseName}</span>
          <span className="ml-2 text-zinc-500">{describePrescription(p)}</span>
          {p.notes && <span className="block text-xs text-zinc-500">{p.notes}</span>}
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-t border-zinc-100 align-top dark:border-zinc-800">
        <td className="py-2 pr-2">
          <input
            aria-label="Superset label"
            className={cellInput}
            value={p.superset ?? ''}
            maxLength={4}
            placeholder="–"
            onChange={(e) => setField('superset', e.target.value.toUpperCase())}
          />
        </td>
        <td className="py-2 pr-2">
          <ExerciseSelect
            label="Exercise"
            value={p.exerciseId}
            groups={groups}
            onChange={(id) => setField('exerciseId', id)}
          />
        </td>
        <td className="py-2 pr-2">
          <input
            aria-label="Sets"
            type="number"
            min={1}
            max={50}
            className={cellInput}
            value={p.sets ?? ''}
            onChange={(e) => setField('sets', toNumber(e.target.value))}
          />
        </td>
        <td className="py-2 pr-2">
          <input
            aria-label="Reps"
            className={cellInput}
            value={p.reps ?? ''}
            maxLength={40}
            placeholder="8-10"
            onChange={(e) => setField('reps', e.target.value)}
          />
        </td>
        <td className="py-2 pr-2">
          <div className="flex gap-1">
            <select
              aria-label="Load type"
              className={sized('w-28')}
              value={p.loadType}
              onChange={(e) => {
                setField('loadType', e.target.value as LoadType);
                if (e.target.value === 'none') setField('loadValue', null);
              }}
            >
              {Object.entries(LOAD_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {p.loadType !== 'none' && (
              <input
                aria-label="Load"
                type="number"
                min={0}
                step="0.5"
                className={sized('w-20')}
                value={p.loadValue ?? ''}
                onChange={(e) => setField('loadValue', toNumber(e.target.value))}
              />
            )}
          </div>
        </td>
        <td className="py-2 pr-2">
          <input
            aria-label="RPE"
            type="number"
            min={1}
            max={10}
            step="0.5"
            className={cellInput}
            value={p.rpe ?? ''}
            onChange={(e) => setField('rpe', toNumber(e.target.value))}
          />
        </td>
        <td className="py-2 pr-2">
          <input
            aria-label="Tempo"
            className={cellInput}
            value={p.tempo ?? ''}
            maxLength={20}
            placeholder="3-1-1-0"
            onChange={(e) => setField('tempo', e.target.value)}
          />
        </td>
        <td className="py-2 pr-2">
          <input
            aria-label="Rest in seconds"
            type="number"
            min={0}
            max={3600}
            step={15}
            className={cellInput}
            value={p.restSeconds ?? ''}
            onChange={(e) => setField('restSeconds', toNumber(e.target.value))}
          />
        </td>
        <td className="py-2 whitespace-nowrap">
          <button
            type="button"
            className={iconButton}
            aria-label="Move up"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label="Move down"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={`Remove ${exerciseName}`}
            onClick={onRemove}
          >
            ✕
          </button>
        </td>
      </tr>
      <tr>
        <td />
        <td colSpan={8} className="pb-2">
          <input
            aria-label="Exercise notes"
            className={`${cellInput} text-xs`}
            value={p.notes ?? ''}
            maxLength={1000}
            placeholder="Cue or note for this exercise (optional)"
            onChange={(e) => setField('notes', e.target.value)}
          />
        </td>
      </tr>
    </>
  );
}
