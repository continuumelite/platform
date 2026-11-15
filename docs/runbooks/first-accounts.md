# First accounts

A new Supabase project starts empty. Before anyone can sign in, create the organization, its
owner and its coaches with `scripts/create-first-accounts.mjs`. After that everyone else joins
through the app: coaches invite athletes from the dashboard.

## Run it

You need the project's URL and `service_role` key (Supabase → Project Settings → API). Run from
the repository root, on a trusted machine. Don't paste the key anywhere else.

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role key> \
node scripts/create-first-accounts.mjs \
  --org "Continuum Elite" \
  --owner "First Last <owner@example.com>" \
  --head-coach "First Last <coach@example.com>"
```

- One `--owner`. Add `--head-coach` or `--coach` once per person. Head coaches see every athlete
  and can assign coaches; coaches see their own athletes.
- To add people later, use `--org-id <uuid>` (printed the first time) instead of `--org`.
- Running it again is safe: existing accounts keep their passwords and just get the role.
- The organization's three subscription levels are created automatically, switched off.

## After running it

1. The script prints a **temporary password** for each new account, once. Put them in the
   password manager and share each one privately (never in email or chat).
2. Each person signs in at the website and changes their password: click their name at the top
   right → **Account** → Change password.
3. The coaches invite athletes from the Athletes page; each invitation is a link to send.

## Notes

- Use real email addresses: they're how people sign in.
- On a local database (`pnpm db:start`), the seed data already has test accounts, so this isn't
  needed there. Get the local values from `pnpm exec supabase status`.
