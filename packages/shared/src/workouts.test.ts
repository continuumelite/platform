import { describe, expect, it } from 'vitest';
import { newPrescription } from './programs';
import {
  describeSet,
  fillFromTargets,
  plannedSets,
  targetMeters,
  targetReps,
  targetSeconds,
  workoutDocumentSchema,
  workoutVolumeKg,
} from './workouts';

const exerciseId = '11111111-1111-4111-8111-111111111111';

describe('targets', () => {
  it('reads reps targets', () => {
    expect(targetReps('8-10')).toBe(8);
    expect(targetReps('5')).toBe(5);
    expect(targetReps('AMRAP')).toBeNull();
  });

  it('reads time targets', () => {
    expect(targetSeconds('45s')).toBe(45);
    expect(targetSeconds('1:30')).toBe(90);
    expect(targetSeconds('2 min')).toBe(120);
    expect(targetSeconds('90')).toBe(90);
    expect(targetSeconds('easy')).toBeNull();
  });

  it('reads distance targets', () => {
    expect(targetMeters('200m')).toBe(200);
    expect(targetMeters('1.5km')).toBe(1500);
    expect(targetMeters('far')).toBeNull();
  });
});

describe('planned sets', () => {
  const squat = {
    ...newPrescription(exerciseId),
    sets: 3,
    reps: '5',
    loadType: 'kg' as const,
    loadValue: 100,
    rpe: 7,
  };

  it('creates one empty set per prescribed set, in the prescribed unit', () => {
    const sets = plannedSets(squat, 'lb', 4);
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => s.position)).toEqual([4, 5, 6]);
    expect(sets.every((s) => !s.completed && s.loadUnit === 'kg' && s.reps == null)).toBe(true);
  });

  it('fills blanks from the targets when a set is ticked off', () => {
    const [set] = plannedSets(squat, 'kg', 0);
    const done = fillFromTargets(set!, squat, 'weight_reps');
    expect(done).toMatchObject({ completed: true, reps: 5, load: 100, loadUnit: 'kg', rpe: 7 });
    expect(describeSet(done, 'weight_reps')).toBe('100 kg × 5 @ RPE 7');
  });

  it('keeps what the athlete typed', () => {
    const [set] = plannedSets(squat, 'kg', 0);
    const done = fillFromTargets({ ...set!, reps: 4, load: 105 }, squat, 'weight_reps');
    expect(done).toMatchObject({ reps: 4, load: 105 });
  });

  it('fills time and distance targets', () => {
    const plank = { ...newPrescription(exerciseId), reps: '45s' };
    const [set] = plannedSets(plank, 'kg', 0);
    expect(fillFromTargets(set!, plank, 'time').durationSeconds).toBe(45);
  });
});

describe('workouts', () => {
  it('adds up volume in kg', () => {
    const base = { id: exerciseId, exerciseId, position: 0, setNumber: 1, completed: true };
    expect(
      workoutVolumeKg([
        { ...base, load: 100, reps: 5, loadUnit: 'kg' },
        { ...base, load: 100, reps: 5, loadUnit: 'lb' },
        { ...base, load: 100, reps: 5, loadUnit: 'kg', completed: false },
      ]),
    ).toBe(727);
  });

  it('validates the document', () => {
    expect(
      workoutDocumentSchema.safeParse({
        id: exerciseId,
        athleteProfileId: exerciseId,
        performedOn: '2026-11-16',
        sets: [],
      }).success,
    ).toBe(true);
    expect(
      workoutDocumentSchema.safeParse({
        id: exerciseId,
        athleteProfileId: exerciseId,
        performedOn: 'Monday',
        sets: [],
      }).success,
    ).toBe(false);
  });
});
