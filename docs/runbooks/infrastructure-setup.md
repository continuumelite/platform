# Infrastructure setup

How to create the accounts and connect them to this repo. Do the steps in order: each one needs the one before it.

The repo side is already in place:

| File                                   | What it does                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `apps/web/vercel.json`                 | Vercel skips builds when nothing affecting the web app changed                    |
| `render.yaml`                          | Render Blueprint: worker staging (from `main`) and production (from `production`) |
| `apps/mobile/eas.json`                 | EAS build profiles and update channels: `development`, `preview`, `production`    |
| `.github/workflows/deploy-staging.yml` | On merge to `main`: migrate the staging database, publish a mobile preview update |
| `.github/workflows/release.yml`        | On a `v*` tag: migrate production, move `production` branch, start store builds   |

Each workflow job stays **skipped** until its repository variable is set, so CI stays green while accounts are still being created.

## Quick start: a staging site Continuum can look at

The shortest path to a link the coaches can open. Everything else in this runbook can follow.

1. Merge the open feature PR into `main`.
2. **Supabase** (Step 2): create the staging project only, set the auth settings, add the GitHub
   secrets and variable. The next merge to `main` migrates it (or run `supabase link` and
   `supabase db push` yourself).
3. **Vercel** (Step 3): import the repo with the Preview environment variables. Until a domain
   exists, the `*.vercel.app` URL for `main` is the staging link.
4. **First accounts**: run the setup script for the owner and coaches
   ([first-accounts.md](first-accounts.md)). Coaches then invite athletes from the dashboard.
5. **Phones** (optional for the first look): an EAS preview build (Step 5). Android installs
   from a link; iPhones need the Apple Developer account (Step 6), so iPhone users start on the
   website, which has the full athlete experience.

Skip for now: Render (Step 4: the worker has no jobs yet), the app stores, Strava, and a custom
domain.

## How deployments flow

| Event                  | Web (Vercel)       | Worker (Render) | Database (Supabase)  | Mobile (EAS)                    |
| ---------------------- | ------------------ | --------------- | -------------------- | ------------------------------- |
| Pull request           | Preview URL per PR | —               | — (CI tests locally) | —                               |
| Merge to `main`        | Staging            | Staging         | Staging migrated     | OTA update to `preview` channel |
| Tag `v1.2.3` on `main` | Production         | Production      | Production migrated  | Store builds started            |

The `production` branch is only ever moved by the release workflow (fast-forward to the tagged commit). Never push to it by hand.

To release:

```bash
git switch main && git pull
git tag v0.1.0
git push origin v0.1.0
```

---

## Step 0: Business foundations (start today)

Every account below is created **with the business email, never a personal one**, and has 2FA turned on.

1. **D-U-N-S number** for the business ([Dun & Bradstreet, free lookup/request](https://developer.apple.com/support/D-U-N-S/)). Apple requires it for an organization developer account, and it can take a few weeks. Start this first.
2. **Domain** on Cloudflare (e.g. `continuumelite.com`).
3. **Business email** on that domain (Google Workspace). Create `admin@<domain>` for account ownership.
4. **1Password** Teams/Business vault named "Continuum Elite – Infrastructure". Every password, key and token below goes here.

## Step 1: GitHub

1. Upgrade the `continuumelite` organization to the **Team** plan.
2. Settings → Branches → protect `main`: require a pull request, 1 approval, and the CI checks to pass. Protect `production`: restrict pushes to GitHub Actions.
3. Require 2FA for all members (Organization settings → Authentication security).

## Step 2: Supabase (database, auth, storage)

1. Create a Supabase organization with `admin@<domain>`.
2. Create two projects in the same region (close to the athletes, e.g. US East):
   - `continuum-staging` (free tier is fine)
   - `continuum-production` (Pro plan)
3. Save each project's **database password** in 1Password.
4. Create a personal access token (Account → Access Tokens) for CI.
5. In each project, Authentication → URL Configuration: set the Site URL and redirect URLs to the matching web URL (staging or production) plus `continuumelite://` for the mobile app.
6. Authentication → Sign In / Providers → Email: turn **off** "Confirm email". Athletes create their account from an invitation link and are signed straight in; with confirmation on, they'd be stuck waiting for an email. Keep "Allow new users to sign up" on (invitations use it).
7. Database → Replication (Realtime): nothing to do. The migrations add `messages` to the Realtime publication, which the app's live chat uses.
8. In GitHub (Settings → Secrets and variables → Actions):

   | Type     | Name                              | Value                              |
   | -------- | --------------------------------- | ---------------------------------- |
   | Secret   | `SUPABASE_ACCESS_TOKEN`           | Access token from step 4           |
   | Secret   | `SUPABASE_STAGING_DB_PASSWORD`    | Staging database password          |
   | Secret   | `SUPABASE_PRODUCTION_DB_PASSWORD` | Production database password       |
   | Variable | `SUPABASE_STAGING_PROJECT_REF`    | Staging project ref (from its URL) |
   | Variable | `SUPABASE_PRODUCTION_PROJECT_REF` | Production project ref             |

   Setting the staging variable turns on the staging migration job. The seed file is **never** pushed to staging or production.

## Step 3: Vercel (web)

1. Create a Vercel team with `admin@<domain>` (Pro plan) and install the GitHub app on the `continuumelite` organization.
2. Import `continuumelite/platform`. Set **Root Directory** to `apps/web`. Vercel detects Next.js and pnpm.
3. Settings → Git → **Production Branch: `production`**.
4. Settings → Environment Variables (Preview = PRs and `main`, from the staging project; Production = the production project):

   | Name                                                                      | Value                                                  | Notes                                         |
   | ------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`                                                | Project URL                                            |                                               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                           | `anon` key                                             |                                               |
   | `SUPABASE_SERVICE_ROLE_KEY`                                               | `service_role` key                                     | Mark **Sensitive**. Server only (Strava sync) |
   | `APP_URL`                                                                 | The site's public URL, e.g. `https://staging.<domain>` | Used for the Strava sign-in callback          |
   | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN` | From the Strava app                                    | Optional: leave unset until Strava is set up  |

   Vercel's free Hobby plan is for non-commercial use only, so use Pro for Continuum.

5. Settings → Domains: add `app.<domain>` (production) and `staging.<domain>` assigned to the `main` branch.

## Step 4: Render (worker)

> **Optional for now.** The worker has no jobs yet (Strava sync runs in the web app). Set it up when the first background job lands.

1. Create a Render workspace with `admin@<domain>` and connect GitHub.
2. New → Blueprint → choose this repo. Render reads `render.yaml` and creates `continuum-worker-staging` and `continuum-worker-production`.
3. When prompted, fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for each, from the matching Supabase project (Project Settings → API). The service role key is server-only.
4. Check `https://<staging service>.onrender.com/health` returns `{"status":"ok"}`.

The production service won't build until the first release creates the `production` branch.

## Step 5: Expo / EAS (mobile builds and updates)

1. Create an Expo account and an **organization** named `continuumelite`.
2. On your machine, from `apps/mobile`:

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init
   npx eas-cli@latest update:configure
   ```

   This adds the project ID, `owner` and updates URL to `app.json`. Commit that change in a PR.

3. In the Expo dashboard → Environment variables, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the **preview** environment (staging project) and **production** environment (production project), and `EXPO_PUBLIC_WEB_URL` to the matching website (the app links there to connect Strava).
4. Create a robot user access token (Organization → Access tokens) and add it to GitHub:

   | Type     | Name          | Value            |
   | -------- | ------------- | ---------------- |
   | Secret   | `EXPO_TOKEN`  | Robot user token |
   | Variable | `EAS_ENABLED` | `true`           |

5. Make a first internal build to install on your phone:

   ```bash
   npx eas-cli@latest build --profile preview --platform all
   ```

## Step 6: App stores (needs the D-U-N-S number)

**Apple**

1. Enroll in the Apple Developer Program as an **Organization** ($99/yr) with the D-U-N-S number.
2. In App Store Connect, create the app with bundle ID `com.continuumelite.app`.
3. Run `npx eas-cli@latest credentials` in `apps/mobile` and let EAS manage certificates and profiles.
4. Create an App Store Connect API key for EAS Submit, then submit builds to TestFlight with `eas submit -p ios`.

**Google**

1. Create a Google Play Console **organization** account ($25 one-time).
2. Create the app with package `com.continuumelite.app` and set up the **Internal testing** track.
3. Upload the first Android build **by hand** (Google requires this once), then create a service account key for EAS Submit.

Once both are connected, add `--auto-submit` to the build step in `.github/workflows/release.yml`.

## Step 7: Strava (when ready)

Follow [docs/integrations/strava.md](../integrations/strava.md): create the Strava API app with the business account, add its keys to Vercel, and subscribe the webhook once per environment. New Strava apps are limited to one athlete until Strava approves a capacity increase, so apply early.

## Later

Sentry (errors), PostHog (analytics) and Resend/Postmark (email) are added when the features that need them are built. Each gets an account under `admin@<domain>`, its keys in 1Password, and an entry in this runbook.
