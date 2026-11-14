import { createServerClient } from '@supabase/ssr';
import type { Database } from '@continuum/shared';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

export function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url)
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Copy apps/web/.env.example to .env.local.',
    );
  return url;
}

export function supabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key)
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Copy apps/web/.env.example to .env.local.',
    );
  return key;
}

/** Supabase client for Server Components and Server Functions, acting as the signed-in user. */
export async function createClient() {
  // The auth client reads the clock as soon as it's created, so make sure we're
  // rendering at request time (never during prerendering) before building it.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
