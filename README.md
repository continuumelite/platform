# Continuum Elite

Personalized coaching platform for trainers and their athletes: iOS, Android and web.
See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for the product plan and architecture.

## Repository layout

```
apps/
  mobile/    Expo (React Native) app for iOS + Android
  web/       Next.js coach dashboard + athlete web
  worker/    Node service: wearable webhooks, sync jobs, AI drafting (later)
packages/
  shared/    Types, Zod schemas, training logic shared by every app
  config/    Shared TypeScript config
supabase/
  migrations/  Database schema, one file per change
  tests/       Row-level security tests (pgTAP)
  seed.sql     Local test data
```

## Getting started

You need:

- **Node 22+** and **pnpm** (`npm install -g pnpm`)
- **Docker Desktop**, running (for the local database)
- **Xcode** from the Mac App Store (iOS simulator) and/or **Android Studio** (Android emulator)

```bash
pnpm install
pnpm db:start        # starts local Supabase; prints the API URL and anon key
```

Copy each `.env.example` to `.env.local` (web, mobile) or `.env` (worker) and fill in the keys printed by `pnpm db:start`.

```bash
pnpm dev             # runs web (localhost:3000), mobile (Expo) and worker (localhost:8787)
```

Run one app only:

```bash
pnpm --filter @continuum/web dev
```

### Local test accounts

`supabase/seed.sql` creates an organization with an owner, two coaches and two athletes. All use the password `password123`:

| Email                       | Role                           |
| --------------------------- | ------------------------------ |
| owner@example.test          | owner                          |
| coach.sam@example.test      | coach (Jordan's primary coach) |
| coach.riley@example.test    | coach (Casey's primary coach)  |
| athlete.jordan@example.test | athlete                        |
| athlete.casey@example.test  | athlete                        |

### Try the sign-up flow

1. Sign in on the web app (http://localhost:3000) as `coach.sam@example.test`.
2. Under **Invite an athlete**, enter any email and choose **Create invite**, then **Copy invite link**.
3. Sign out, open the link, and create the account. You land on the athlete page with Sam as your coach.
4. Sign in with the same account in the mobile app to see the **Today** screen.

Email sending isn't wired up yet, so coaches copy the invite link and send it themselves.
Local Supabase doesn't require email confirmation. Staging and production will.

## Everyday commands

| Command                                      | What it does                                        |
| -------------------------------------------- | --------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Checks that CI runs on every pull request           |
| `pnpm format`                                | Format all files with Prettier                      |
| `pnpm db:reset`                              | Rebuild the local database from migrations + seed   |
| `pnpm db:test`                               | Run the database access-rule tests                  |
| `pnpm db:types`                              | Regenerate TypeScript types from the local database |
| `pnpm exec supabase migration new <name>`    | Create a new migration file                         |

## Deployments

- **Merge to `main`** → staging (web, database migrations, mobile preview update).
- **Tag `vX.Y.Z` on `main`** → production, plus App Store / Play Store builds.

Account setup, secrets and the full flow are in [docs/runbooks/infrastructure-setup.md](docs/runbooks/infrastructure-setup.md). To create the first organization and owner on a new database, see [docs/runbooks/first-accounts.md](docs/runbooks/first-accounts.md).

## How we work

- `main` is always deployable. Work on a short-lived branch (`feat/…`, `fix/…`) and open a pull request.
- Every PR needs CI to pass and at least one approving review.
- **Database changes go through migrations only.** Never edit an existing migration or change the staging/production schema by hand.
- Every new table gets row-level security and a test in `supabase/tests/`.
- Secrets never go in the repo. Shared credentials live in the team's password manager.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`…).
