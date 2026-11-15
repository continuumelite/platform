import { foodEntrySchema, type FoodEntry, type NutritionTarget } from '@continuum/shared';

import { supabase } from './supabase';

/*
 * Food entries save straight away. If the phone is offline they wait in an outbox on the
 * device and upload the next time the app loads data; ids are fixed, so retries never
 * duplicate. The day view shows waiting entries too.
 */

const OUTBOX_KEY = 'food-outbox';

function outbox(): FoodEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as FoodEntry[]) : [];
  } catch {
    return [];
  }
}

function setOutbox(entries: FoodEntry[]) {
  if (entries.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  else localStorage.removeItem(OUTBOX_KEY);
}

const toRow = (e: FoodEntry) => ({
  id: e.id,
  athlete_profile_id: e.athleteProfileId,
  logged_on: e.loggedOn,
  meal: e.meal,
  name: e.name,
  quantity: e.quantity,
  calories: e.calories,
  protein_g: e.proteinG,
  carbs_g: e.carbsG,
  fat_g: e.fatG,
});

type FoodRow = ReturnType<typeof toRow>;

const fromRow = (r: FoodRow): FoodEntry => ({
  id: r.id,
  athleteProfileId: r.athlete_profile_id,
  loggedOn: r.logged_on,
  meal: r.meal,
  name: r.name,
  quantity: r.quantity,
  calories: r.calories,
  proteinG: Number(r.protein_g),
  carbsG: Number(r.carbs_g),
  fatG: Number(r.fat_g),
});

function isNetworkError(error: { message?: string; code?: string } | null) {
  return Boolean(
    error && !error.code && /network|fetch|timed out|offline/i.test(error.message ?? ''),
  );
}

export async function fetchTargets(athleteProfileId: string): Promise<NutritionTarget[]> {
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('day_type, calories, protein_g, carbs_g, fat_g, notes')
    .eq('athlete_profile_id', athleteProfileId);
  if (error) throw error;
  return data.map((t) => ({
    dayType: t.day_type,
    calories: t.calories,
    proteinG: t.protein_g,
    carbsG: t.carbs_g,
    fatG: t.fat_g,
    notes: t.notes,
  }));
}

/** Everything logged on a day, including entries still waiting to upload. */
export async function fetchDay(athleteProfileId: string, date: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select(
      'id, athlete_profile_id, logged_on, meal, name, quantity, calories, protein_g, carbs_g, fat_g',
    )
    .eq('athlete_profile_id', athleteProfileId)
    .eq('logged_on', date)
    .order('created_at');
  if (error) throw error;
  const saved = data.map(fromRow);
  const waiting = outbox().filter(
    (e) =>
      e.loggedOn === date &&
      e.athleteProfileId === athleteProfileId &&
      !saved.some((s) => s.id === e.id),
  );
  return [...saved, ...waiting];
}

/** Foods logged recently, newest first and without repeats, for one-tap re-logging. */
export async function fetchRecentFoods(athleteProfileId: string): Promise<FoodEntry[]> {
  const { data } = await supabase
    .from('food_logs')
    .select(
      'id, athlete_profile_id, logged_on, meal, name, quantity, calories, protein_g, carbs_g, fat_g',
    )
    .eq('athlete_profile_id', athleteProfileId)
    .order('created_at', { ascending: false })
    .limit(60);
  const seen = new Set<string>();
  return (data ?? [])
    .map(fromRow)
    .filter((e) => {
      const key = e.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export type SaveFoodOutcome = 'saved' | 'queued' | 'error';

export async function saveFood(entry: FoodEntry): Promise<SaveFoodOutcome> {
  const parsed = foodEntrySchema.safeParse(entry);
  if (!parsed.success) return 'error';
  try {
    const { error } = await supabase.from('food_logs').upsert(toRow(parsed.data));
    if (!error) return 'saved';
    if (!isNetworkError(error)) return 'error';
  } catch {
    // Offline.
  }
  setOutbox([...outbox().filter((e) => e.id !== entry.id), parsed.data]);
  return 'queued';
}

export async function deleteFood(id: string) {
  setOutbox(outbox().filter((e) => e.id !== id));
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}

/** Upload entries saved while offline. */
export async function flushFoodOutbox() {
  const remaining: FoodEntry[] = [];
  for (const entry of outbox()) {
    try {
      const { error } = await supabase.from('food_logs').upsert(toRow(entry));
      if (error && isNetworkError(error)) remaining.push(entry);
    } catch {
      remaining.push(entry);
    }
  }
  setOutbox(remaining);
}
