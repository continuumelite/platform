import { createClient } from '@supabase/supabase-js';
import type { Database } from '@continuum/shared';
import { supabaseUrl } from './server';

/**
 * Service-role client for server jobs that run without a signed-in user (Strava sync and
 * webhooks). It bypasses row-level security, so only use it in server code, never in anything
 * sent to the browser. Returns null when SUPABASE_SERVICE_ROLE_KEY isn't configured.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
