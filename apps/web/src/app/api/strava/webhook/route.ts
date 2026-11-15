import { NextResponse, type NextRequest } from 'next/server';
import { handleStravaEvent } from '@/lib/strava';

/**
 * Strava webhook. Subscribe once per environment (see docs/integrations/strava.md); Strava then
 * POSTs here whenever a connected athlete adds, edits or deletes an activity.
 */
export function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const verify = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  if (p.get('hub.mode') === 'subscribe' && verify && p.get('hub.verify_token') === verify) {
    return NextResponse.json({ 'hub.challenge': p.get('hub.challenge') });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const event = await request.json().catch(() => null);
  if (event && typeof event.object_id === 'number' && typeof event.owner_id === 'number') {
    // Strava expects a quick 200; failures are retried by Strava, so don't throw.
    await handleStravaEvent(event).catch((e) => console.error('Strava webhook failed', e));
  }
  return NextResponse.json({ ok: true });
}
