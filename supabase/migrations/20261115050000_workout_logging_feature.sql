-- Logging workouts needs the 'training.logging' feature (see plans). Reading past workouts and
-- deleting them stays allowed, so nobody loses access to their history.

drop policy "Athletes log their own workouts" on public.workout_logs;
create policy "Athletes log their own workouts"
  on public.workout_logs for insert to authenticated
  with check (
    private.is_own_athlete_profile(athlete_profile_id)
    and private.has_feature(athlete_profile_id, 'training.logging')
  );

drop policy "Athletes edit their own workouts" on public.workout_logs;
create policy "Athletes edit their own workouts"
  on public.workout_logs for update to authenticated
  using (private.is_own_athlete_profile(athlete_profile_id))
  with check (
    private.is_own_athlete_profile(athlete_profile_id)
    and private.has_feature(athlete_profile_id, 'training.logging')
  );

drop policy "Athletes log their own sets" on public.set_logs;
create policy "Athletes log their own sets"
  on public.set_logs for insert to authenticated
  with check (
    private.is_own_athlete_profile(private.workout_athlete(workout_log_id))
    and private.has_feature(private.workout_athlete(workout_log_id), 'training.logging')
  );

drop policy "Athletes edit their own sets" on public.set_logs;
create policy "Athletes edit their own sets"
  on public.set_logs for update to authenticated
  using (private.is_own_athlete_profile(private.workout_athlete(workout_log_id)))
  with check (
    private.is_own_athlete_profile(private.workout_athlete(workout_log_id))
    and private.has_feature(private.workout_athlete(workout_log_id), 'training.logging')
  );
