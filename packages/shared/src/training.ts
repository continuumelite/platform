/**
 * Estimated one-rep max using the Epley formula.
 * Returns the load itself for a single rep, and null for inputs it can't estimate reliably.
 */
export function estimateOneRepMax(load: number, reps: number): number | null {
  if (load <= 0 || reps < 1 || reps > 12 || !Number.isInteger(reps)) return null;
  if (reps === 1) return load;
  return Math.round(load * (1 + reps / 30) * 10) / 10;
}
