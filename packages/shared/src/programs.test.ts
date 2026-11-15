import { describe, expect, it } from 'vitest';
import {
  cloneWithNewIds,
  describePrescription,
  emptyProgram,
  newId,
  newPrescription,
  programDocumentSchema,
  programStats,
} from './programs';

const exerciseId = '11111111-1111-4111-8111-111111111111';

describe('cloneWithNewIds', () => {
  it('gives every item a new id but keeps exercise references', () => {
    const doc = emptyProgram('Test');
    doc.blocks[0]!.weeks[0]!.sessions.push({
      id: newId(),
      name: 'Lower',
      exercises: [newPrescription(exerciseId)],
    });

    const copy = cloneWithNewIds(doc);
    const original = doc.blocks[0]!.weeks[0]!.sessions[0]!;
    const copied = copy.blocks[0]!.weeks[0]!.sessions[0]!;

    expect(copy.blocks[0]!.id).not.toBe(doc.blocks[0]!.id);
    expect(copied.id).not.toBe(original.id);
    expect(copied.exercises[0]!.id).not.toBe(original.exercises[0]!.id);
    expect(copied.exercises[0]!.exerciseId).toBe(exerciseId);
    expect(copied.name).toBe('Lower');
  });
});

describe('describePrescription', () => {
  it('summarizes sets, reps, load, RPE and rest', () => {
    expect(
      describePrescription({
        id: exerciseId,
        exerciseId,
        sets: 4,
        reps: '5',
        loadType: 'percent_1rm',
        loadValue: 75,
        rpe: 7,
        restSeconds: 180,
      }),
    ).toBe('4 × 5 @ 75% 1RM · RPE 7 · rest 3 min');
  });

  it('handles bodyweight work and short rests', () => {
    expect(
      describePrescription({
        id: exerciseId,
        exerciseId,
        sets: 3,
        reps: '45s',
        loadType: 'none',
        restSeconds: 45,
      }),
    ).toBe('3 × 45s · rest 45s');
  });
});

describe('programDocumentSchema', () => {
  it('requires a name', () => {
    expect(programDocumentSchema.safeParse({ ...emptyProgram('x'), name: ' ' }).success).toBe(
      false,
    );
  });

  it('rejects an RPE above 10', () => {
    const doc = emptyProgram('x');
    doc.blocks[0]!.weeks[0]!.sessions.push({
      id: newId(),
      name: '',
      exercises: [{ ...newPrescription(exerciseId), rpe: 11 }],
    });
    expect(programDocumentSchema.safeParse(doc).success).toBe(false);
  });
});

describe('programStats', () => {
  it('counts blocks, weeks, sessions and exercises', () => {
    const doc = emptyProgram('x');
    doc.blocks[0]!.weeks[0]!.sessions.push({
      id: newId(),
      name: '',
      exercises: [newPrescription(exerciseId)],
    });
    expect(programStats(doc)).toEqual({ blocks: 1, weeks: 1, sessions: 1, exercises: 1 });
  });
});
