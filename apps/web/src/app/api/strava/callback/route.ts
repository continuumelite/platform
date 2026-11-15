import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { exchangeCode, syncStravaConnection } from '@/lib/strava';
import { createClient } from '@/lib/supabase/server';

/** Strava sends the athlete back here. Save the connection as them, then pull recent activities. */
export async function GET(request: NextRequest) {
  const back = (result: string) =>
    NextResponse.redirect(new URL(`/dashboard/devices?${result}`, request.url));
  const params = request.nextUrl.searchParams;
  const jar = await cookies();
  const expected = jar.get('strava_state')?.value;
  jar.delete({ name: 'strava_state', path: '/api/strava' });

  if (params.get('error')) return back('error=denied');
  const code = params.get('code');
  if (!code || !expected || params.get('state') !== expected) return back('error=state');
  const scope = params.get('scope') ?? '';
  if (!scope.includes('activity:read')) return back('error=scope');

  try {
    const tokens = await exchangeCode(code);
    const supabase = await createClient();
    const { data: connectionId, error } = await supabase.rpc('save_device_connection', {
      device: 'strava',
      external_athlete: tokens.athlete ? String(tokens.athlete.id) : '',
      granted_scopes: scope,
      access: tokens.access_token,
      refresh: tokens.refresh_token,
      expires: new Date(tokens.expires_at * 1000).toISOString(),
    });
    if (error || !connectionId) return back(error?.code === '42501' ? 'error=plan' : 'error=save');
    await syncStravaConnection(connectionId);
    return back('connected=strava');
  } catch {
    return back('error=exchange');
  }
}
