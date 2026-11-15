# Strava

Athletes connect Strava on the web (Devices page). Their activities then arrive automatically
through Strava's webhook, and can be pulled on demand with "Sync now". The app shows the
connection and imported activities; connecting happens on the web because Strava's sign-in
returns to the web server.

## What's built

- `supabase/migrations/20261115060000_devices_and_activities.sql`: `device_connections`,
  `activities`, and `private.device_tokens` (OAuth tokens the API can never read).
  `save_device_connection()` stores a connection as the signed-in athlete and checks the
  `devices.strava` subscription feature.
- `apps/web/src/lib/strava.ts`: token exchange and refresh, sync (last 30 days), webhook handling.
- Routes: `/api/strava/connect` → Strava → `/api/strava/callback`; `/api/strava/webhook`.
- Mapping Strava's activity to our row: `stravaToActivityRow()` in `@continuum/shared`.

## Turning it on

1. **Create the Strava API application** at https://www.strava.com/settings/api (signed in as a
   Continuum account). Set "Authorization Callback Domain" to the site's domain
   (`localhost` for local, then the staging and production domains).
2. **Set environment variables** on the web app (Vercel, per environment; `.env.local` locally):
   `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN` (any long random
   string), `APP_URL` (the site's public URL), and `SUPABASE_SERVICE_ROLE_KEY` (server only).
3. **Subscribe the webhook** once per environment (Strava allows one subscription per app):

   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=$STRAVA_CLIENT_ID -F client_secret=$STRAVA_CLIENT_SECRET \
     -F callback_url=$APP_URL/api/strava/webhook -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
   ```

   The callback URL must be public, so do this for staging/production (or a tunnel locally).

4. **Strava's limits:** new apps start with a single-athlete limit; request a capacity increase
   from Strava (developer program review) before inviting athletes. Rate limits are 200 requests
   per 15 minutes and 2,000 per day per app; the webhook keeps us well under that.
5. **Brand rules:** Strava requires its "Connect with Strava" button and "Powered by Strava"
   attribution where Strava data is shown. Swap in the official assets before launch.

## Not yet

- Showing a Strava activity's map, splits or laps.
- Matching an imported run to the planned session it fulfils.
