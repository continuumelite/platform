import { describe, expect, it } from 'vitest';
import { exerciseInputSchema } from './exercises';

const base = {
  name: '  Back Squat ',
  instructions: '',
  videoUrl: '',
  tracking: 'weight_reps',
  muscleGroups: ['quads', 'glutes'],
  equipment: ['barbell'],
  isShared: false,
};

describe('exerciseInputSchema', () => {
  it('trims the name and turns empty optional fields into null', () => {
    const parsed = exerciseInputSchema.parse(base);
    expect(parsed.name).toBe('Back Squat');
    expect(parsed.instructions).toBeNull();
    expect(parsed.videoUrl).toBeNull();
  });

  it('requires a name', () => {
    expect(exerciseInputSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
  });

  it('only accepts https video links', () => {
    expect(exerciseInputSchema.safeParse({ ...base, videoUrl: 'http://x.com/v' }).success).toBe(
      false,
    );
    expect(
      exerciseInputSchema.safeParse({ ...base, videoUrl: 'https://youtu.be/abc' }).success,
    ).toBe(true);
  });

  it('rejects unknown muscle groups', () => {
    expect(exerciseInputSchema.safeParse({ ...base, muscleGroups: ['wings'] }).success).toBe(false);
  });
});
