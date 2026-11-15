#!/usr/bin/env node
/**
 * Create the organization, its owner and its coaches on a new Supabase project (staging or
 * production). Everyone after this joins through invitations in the app.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   node scripts/create-first-accounts.mjs \
 *     --org "Continuum Elite" \
 *     --owner "Joey Example <joey@example.com>" \
 *     --head-coach "Jack Example <jack@example.com>"
 *
 * Options (repeatable): --owner, --head-coach, --coach. Exactly one --owner.
 * Add --org-id <uuid> to add people to an organization that already exists.
 *
 * New accounts get a random temporary password, printed once at the end. Put it in the
 * password manager and share it privately; people change it under Account in the web app.
 * Existing accounts (same email) keep their password and are only added to the organization.
 * Uses Supabase's REST APIs directly, so it needs nothing but Node 22.
 */

import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    org: { type: 'string' },
    'org-id': { type: 'string' },
    owner: { type: 'string', multiple: true, default: [] },
    'head-coach': { type: 'string', multiple: true, default: [] },
    coach: { type: 'string', multiple: true, default: [] },
    help: { type: 'boolean', short: 'h' },
  },
});

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (values.help) {
  console.log('See the comment at the top of scripts/create-first-accounts.mjs for usage.');
  process.exit(0);
}

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Project Settings → API).');
if (!values['org-id'] && !values.org)
  fail('Pass --org "<name>" (or --org-id for an existing one).');
if (!values['org-id'] && values.owner.length !== 1)
  fail('Pass exactly one --owner for a new organization.');

/** "Full Name <email@x.com>" → { name, email } */
function person(spec, role) {
  const match = spec.match(/^\s*(.+?)\s*<\s*([^>\s]+@[^>\s]+)\s*>\s*$/);
  if (!match) fail(`Couldn't read "${spec}". Use "Full Name <email@example.com>".`);
  return { name: match[1], email: match[2].toLowerCase(), role };
}

const people = [
  ...values.owner.map((s) => person(s, 'owner')),
  ...values['head-coach'].map((s) => person(s, 'head_coach')),
  ...values.coach.map((s) => person(s, 'coach')),
];
if (!people.length) fail('Nobody to add. Pass --owner, --head-coach or --coach.');

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, body };
}

async function findUser(email) {
  // The admin API pages users; a new project has few, so a few pages is plenty.
  for (let page = 1; page <= 20; page++) {
    const { ok, body } = await call(`/auth/v1/admin/users?page=${page}&per_page=200`);
    if (!ok) fail(`Couldn't list users: ${JSON.stringify(body)}`);
    const users = body.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (users.length < 200) return null;
  }
  return null;
}

async function ensureUser(p) {
  const existing = await findUser(p.email);
  if (existing) return { id: existing.id, password: null };
  const password = randomBytes(18).toString('base64url');
  const { ok, body } = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: p.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: p.name },
    }),
  });
  if (!ok)
    fail(`Couldn't create ${p.email}: ${body?.msg ?? body?.message ?? JSON.stringify(body)}`);
  return { id: body.id, password };
}

async function rest(path, method, payload, prefer = 'return=representation') {
  const { ok, body } = await call(`/rest/v1/${path}`, {
    method,
    body: JSON.stringify(payload),
    headers: { Prefer: prefer },
  });
  if (!ok) fail(`${method} ${path} failed: ${body?.message ?? JSON.stringify(body)}`);
  return body;
}

let orgId = values['org-id'];
if (orgId) {
  const { ok, body } = await call(
    `/rest/v1/organizations?id=eq.${encodeURIComponent(orgId)}&select=id,name`,
  );
  if (!ok || !body?.length) fail(`No organization with id ${orgId}.`);
  console.log(`Adding people to "${body[0].name}"`);
} else {
  const [org] = await rest('organizations', 'POST', { name: values.org });
  orgId = org.id;
  console.log(`Created organization "${org.name}" (${orgId})`);
}

const results = [];
for (const p of people) {
  const user = await ensureUser(p);
  await rest(
    'memberships?on_conflict=organization_id,user_id',
    'POST',
    { organization_id: orgId, user_id: user.id, role: p.role },
    'resolution=merge-duplicates,return=minimal',
  );
  results.push({ ...p, password: user.password });
  console.log(`  ✓ ${p.name} <${p.email}> as ${p.role.replace('_', ' ')}`);
}

console.log(
  '\nSign in at the web app with these. Shown once: store them in the password manager now.\n',
);
for (const r of results) {
  console.log(
    `  ${r.email.padEnd(36)} ${r.password ? `temporary password: ${r.password}` : '(existing account, password unchanged)'}`,
  );
}
console.log('\nEach person should change their password under Account after signing in.\n');
