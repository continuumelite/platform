import { stravaToActivityRow, type StravaActivity } from '@continuum/shared';
import { createAdminClient } from './supabase/admin';

/*
 * Strava integration. Needs a Strava API application (https://www.strava.com/settings/api):
 *   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET    – from the Strava app
 *   STRAVA_WEBHOOK_VERIFY_TOKEN                – any random string, used when subscribing
 *   APP_URL                                    – this site's public URL (for the OAuth callback)
 *   SUPABASE_SERVICE_ROLE_KEY                  – lets the server sync without a user session
 * Until these are set, the Devices page explains that Strava isn't set up yet.
 */

const API = 'https://www.strava.com/api/v3';
export const STRAVA_SCOPES = 'read,activity:read_all';

export function stravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: `${appUrl}/api/strava/callback` };
}

export function authorizeUrl(state: string) {
  const config = stravaConfig();
  if (!config) return null;
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope', STRAVA_SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const config = stravaConfig();
  if (!config) throw new Error('Strava is not configured');
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Strava token request failed (${res.status})`);
  return res.json() as Promise<TokenResponse>;
}

export const exchangeCode = (code: string) =>
  tokenRequest({ code, grant_type: 'authorization_code' });

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** A valid access token for the connection, refreshing it when it's about to expire. */
async function accessTokenFor(admin: Admin, connectionId: string): Promise<string> {
  const { data } = await admin.rpc('device_tokens_for', { target_connection_id: connectionId });
  const tokens = data?.[0];
  if (!tokens) throw new Error('No tokens for this connection');
  const expiresSoon =
    !tokens.expires_at || new Date(tokens.expires_at).getTime() < Date.now() + 60_000;
  if (!expiresSoon || !tokens.refresh_token) return tokens.access_token;

  const fresh = await tokenRequest({
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  await admin.rpc('store_device_tokens', {
    target_connection_id: connectionId,
    access: fresh.access_token,
    refresh: fresh.refresh_token,
    expires: new Date(fresh.expires_at * 1000).toISOString(),
  });
  return fresh.access_token;
}

async function stravaGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Strava request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export type SyncResult = { ok: true; imported: number } | { ok: false; reason: string };

/** Pull recent activities for one connection (default: the last 30 days). */
export async function syncStravaConnection(connectionId: string, days = 30): Promise<SyncResult> {
  const admin = createAdminClient();
  if (!admin || !stravaConfig())
    return { ok: false, reason: 'Strava isn’t set up on the server yet.' };

  const { data: connection } = await admin
    .from('device_connections')
    .select('id, athlete_profile_id, status')
    .eq('id', connectionId)
    .maybeSingle();
  if (!connection || connection.status === 'revoked')
    return { ok: false, reason: 'Not connected.' };

  try {
    const token = await accessTokenFor(admin, connection.id);
    const after = Math.floor(Date.now() / 1000) - days * 86_400;
    let imported = 0;
    for (let page = 1; page <= 5; page++) {
      const list = await stravaGet<StravaActivity[]>(
        token,
        `/athlete/activities?after=${after}&per_page=50&page=${page}`,
      );
      if (!list.length) break;
      const rows = list.map((a) => stravaToActivityRow(a, connection.athlete_profile_id));
      const { error } = await admin
        .from('activities')
        .upsert(rows, { onConflict: 'provider,external_id' });
      if (error) throw error;
      imported += rows.length;
      if (list.length < 50) break;
    }
    await admin
      .from('device_connections')
      .update({ last_synced_at: new Date().toISOString(), status: 'active', last_error: null })
      .eq('id', connection.id);
    return { ok: true, imported };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Sync failed';
    await admin
      .from('device_connections')
      .update({ status: 'error', last_error: reason })
      .eq('id', connection.id);
    return { ok: false, reason };
  }
}

/** Handle one Strava webhook event (new, changed or deleted activity; or the athlete revoking access). */
export async function handleStravaEvent(event: {
  object_type: string;
  object_id: number;
  aspect_type: string;
  owner_id: number;
  updates?: Record<string, string>;
}) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: connection } = await admin
    .from('device_connections')
    .select('id, athlete_profile_id')
    .eq('provider', 'strava')
    .eq('external_athlete_id', String(event.owner_id))
    .maybeSingle();
  if (!connection) return;

  if (event.object_type === 'athlete' && event.updates?.authorized === 'false') {
    await admin.from('device_connections').update({ status: 'revoked' }).eq('id', connection.id);
    return;
  }
  if (event.object_type !== 'activity') return;

  if (event.aspect_type === 'delete') {
    await admin
      .from('activities')
      .delete()
      .eq('provider', 'strava')
      .eq('external_id', String(event.object_id));
    return;
  }
  const token = await accessTokenFor(admin, connection.id);
  const activity = await stravaGet<StravaActivity>(token, `/activities/${event.object_id}`);
  await admin
    .from('activities')
    .upsert(stravaToActivityRow(activity, connection.athlete_profile_id), {
      onConflict: 'provider,external_id',
    });
}
