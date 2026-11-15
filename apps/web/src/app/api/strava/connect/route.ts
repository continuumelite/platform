import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { authorizeUrl } from '@/lib/strava';
import { createClient } from '@/lib/supabase/server';

/** Starts "Connect Strava": a random state in a short-lived cookie, then off to Strava. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.redirect(new URL('/login', request.url));

  const state = randomBytes(16).toString('hex');
  const url = authorizeUrl(state);
  if (!url)
    return NextResponse.redirect(new URL('/dashboard/devices?error=not-configured', request.url));

  (await cookies()).set('strava_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: 600,
    path: '/api/strava',
  });
  return NextResponse.redirect(url);
}
