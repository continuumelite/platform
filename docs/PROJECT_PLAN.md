# Continuum Elite — Project Plan

A coaching platform for one trainer and their athletes: personalized programming, workout logging, nutrition tracking, and wearable data (Garmin, Apple Watch, etc.) across **iOS, Android, and web**.

Last updated: 2026-10-25

---

## 1. Product principles

These come straight from how the trainer works and should drive every design decision:

1. **The coach is the product.** The app helps the trainer deliver _his_ personalized coaching at scale. It is not a library of generic plans. Templates exist only as starting points the coach edits per athlete.
2. **Every athlete is different.** Programs, nutrition targets, metrics shown, check-in questions, and even dashboard layout should be configurable per athlete.
3. **Data in, insight out.** Athletes should spend seconds logging. Wearables and smart defaults do the heavy lifting. The coach sees a clear picture of each athlete without digging.
4. **Coach stays in the loop.** Any automation (including future AI suggestions) proposes; the coach approves.

---

## 2. Who uses it

| Role                       | Main surface                             | Core jobs                                                                                                                                              |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Head coach / org owner** | Web dashboard                            | Everything a coach can do, plus manage coaches, assign athletes, own the organization's shared methodology and AI knowledge                            |
| **Coach** (trainer)        | Web dashboard, mobile secondary          | Build and adjust programs per athlete, set nutrition targets, review logs and wearable trends, message athletes, leave notes, teach and correct the AI |
| **Athlete**                | Mobile app (iOS/Android) or web, equally | See today's plan, log workouts/sets, log food, connect watch, complete check-ins, message coach                                                        |
| **Admin** (you / dev team) | Web + database tools                     | Manage accounts, support, billing                                                                                                                      |

### Multiple trainers (confirmed requirement)

The platform supports **multiple trainers from day one**. The data model and permissions are built for it even while only one trainer is using it.

- **Organization → coaches → athletes.** A coaching business is an _organization_. It has one or more coaches, and each athlete belongs to an organization.
- **Athletes can have more than one coach** (e.g. a primary coach plus a nutrition or assistant coach). Each assignment has a role and permissions.
- **Two levels of content:**
  - _Organization-level_: shared exercise library, templates, methodology, and AI knowledge that every coach in the business uses.
  - _Coach-level_: a coach's own templates, notes, and AI knowledge. These can be private or shared to the organization.
- **Permissions are enforced in the database** (row-level security), not just hidden in the app. A coach sees only the athletes they're assigned to, unless they're a head coach.
- **Audit history:** who changed which program and when. This matters once several people edit the same athlete's plan.
- **Later, if needed:** separate businesses on the same platform (other trainers licensing it), each with its own branding. The organization model already supports this.

---

## 3. Feature scope by phase

### Phase 0: Discovery & setup (2–3 weeks)

- Walk through the business plan with the trainer and turn it into user stories.
- Shadow 2–3 real athlete check-ins: what does he look at, ask, and adjust?
- Collect his current materials (spreadsheets, programs, intake forms). These become the data model.
- **Review his written methodology** together. It tells us how programs must be structured (e.g. RPE vs. %1RM, block lengths, how he decides on deloads), so the program builder matches how he actually coaches. Later it becomes his AI's first knowledge.
- Create all accounts (section 7) **under the business**, not personal accounts.
- Wireframes for the 5–6 core screens. Get trainer sign-off.
- Apply for the Garmin Connect Developer Program early (approval takes time).

### Phase 1: MVP / private pilot (8–12 weeks)

Goal: the trainer's existing athletes use it daily instead of spreadsheets/texts.

- Auth (email + Sign in with Apple/Google), roles, coach invites athletes.
- Organization setup: head coach invites coaches and assigns athletes to them.
- Athlete intake/profile (goals, history, injuries, equipment, schedule).
- **Exercise library**: coach's own exercises with video/cues.
- **Program builder (web)**: blocks → weeks → sessions → exercises with sets/reps/load/RPE/tempo/rest. Copy from template, then personalize.
- **Workout logging (mobile)**: today's session, log actual sets, notes, works offline.
- **Basic nutrition**: daily macro/calorie targets per athlete, quick-add logging, photo logging.
- **Apple Health (HealthKit) + Android Health Connect**: steps, sleep, resting HR, HRV, workouts.
- **Strava**: OAuth connection on web or mobile; imports runs, rides and other activities (server-side, so it works for web-only athletes too).
- **Athlete web**: everything an athlete does on mobile (today, training, logging, nutrition, dashboard) also works in the browser.
- Coach ↔ athlete messaging and push notifications.
- Coach dashboard: per-athlete compliance, recent sessions, flags.
- Distribution: TestFlight (iOS) and Play internal testing (Android). No public listing yet.

### Phase 2: Depth (8–10 weeks)

- **Garmin** (and Whoop, Oura, Polar, Coros). See section 6.
- Food database search + barcode scanning, saved meals, meal plans from coach.
- Custom weekly check-ins (coach-defined questions, photos, body measurements).
- Progress analytics: strength trends, estimated 1RM, volume, readiness vs. performance.
- Coach-side automations: "flag if sleep < 6h three nights running", etc.
- Public App Store / Play Store release.
- **AI prototype (behind the scenes):** give an AI his written methodology and a few real athletes' data, and compare its drafts with the programs he actually wrote. Nothing goes to athletes. This shows early how close the AI gets and what knowledge is missing, before building Phase 3.

### Phase 3: AI coaching assistant (see section 5)

- Each coach's own AI profile: trainers write and upload their methodology, rules, and preferences. The head coach's existing written methodology is imported as the first profile.
- AI-drafted programs and adjustments, always reviewed and approved by a coach.
- Weekly athlete summaries for coaches.
- Feedback loop: coach edits and rejections teach the AI over time.

### Phase 4: Business features (as the business plan needs)

- Subscriptions & payments: three athlete tiers, each unlocking more features (see "Subscription tiers" below and section 8; App Store rules matter here).
- Head-coach tools: coach performance, athlete load per coach, organization reporting.
- Video form-check uploads with coach annotations.
- Other businesses licensing the platform, if the business plan goes there.

### Subscription tiers & feature access

Athletes will subscribe at one of **three levels**, each unlocking more features. Which feature goes in which tier isn't decided yet, so the app is built so the mapping is **data, not code**: the owner changes it on the web without a new release.

- **Feature keys.** Every gateable feature gets a stable key in `packages/shared` (e.g. `community.post`, `nutrition.logging`, `nutrition.meal_plans`, `devices.strava`, `devices.garmin`, `checkins`, `messaging`, `analytics.advanced`, `ai.summaries`). New features add a key when they're built.
- **Plans and mapping.** The organization has three plans (names and prices TBD) and a plan ↔ feature table. An owner-only screen on the web shows a grid of features × tiers with a checkbox in each cell.
- **Subscriptions.** Each athlete has one current plan. Before payments exist, a coach sets it by hand (useful for comps, pilots and existing clients). Later, Stripe (web) and RevenueCat (App Store / Play) update the same record.
- **One check, enforced on the server.** A database function (`has_feature(athlete, key)`) answers "can this athlete use this?", and row-level security uses it. Hiding a button is never the only gate. The apps use the same answer to show a locked state with an "Upgrade" link (the brief's More › Upgrade).
- **Coaches and owners** always have every feature.
- **Until the mapping is decided,** every plan includes every feature, so nothing changes for the pilot. Turning on tiers is then a settings change, not a rebuild.
- **Limits, not just on/off.** A mapping can carry a number where it helps (e.g. "messages per week", "coach check-ins per month"), so a tier can offer more of something rather than only unlock it.

### Community

One community across the **whole organization**: every Continuum athlete and coach, not one group per coach. It sits under the personal cards on Home (as in the brief) and in More › Community.

- Athletes and coaches can post. **Coach posts are highlighted** (coach badge and accent styling) and can be pinned to the top.
- Posting, commenting and even seeing the feed are feature keys, so they can be tied to tiers like anything else.
- Needs basic moderation from day one: coaches can hide posts and remove members, and athletes can report a post.

> **Phases 1–2 prepare for AI.** The AI is only as good as the data it learns from. From the first release, we store programs in a structured way (not free text), keep a full version history of every program change, and let coaches add a short _reason_ when they adjust a plan (e.g. "cut volume 20%: poor sleep, knee irritation"). By Phase 3 this is a rich record of how each trainer actually coaches.

---

## 4. Recommended tech stack

Goal: **one language (TypeScript) and one repository** for iOS, Android, web, and backend. A small team can then work across everything, and code is shared.

| Layer                               | Choice                                                                       | Why                                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile (iOS + Android)              | **React Native + Expo** (with dev builds)                                    | One codebase for both platforms; native modules for HealthKit/Health Connect; cloud builds + over-the-air updates                                     |
| Web (coach dashboard + athlete web) | **Next.js** (React)                                                          | Same language/skills as mobile; great for dashboards; easy hosting                                                                                    |
| Backend / database                  | **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions)             | Managed Postgres with row-level security, auth, file storage, and realtime chat out of the box. It's plain Postgres underneath, so there's no lock-in |
| Background jobs / integrations      | Supabase Edge Functions + a small **Node worker** (e.g. on Render or Fly.io) | Wearable webhooks, data syncing, scheduled jobs, notifications                                                                                        |
| Shared code                         | TypeScript packages in the monorepo                                          | Shared types, validation (Zod), API client, business logic (e.g. 1RM calcs)                                                                           |
| Styling                             | Tamagui or NativeWind + shared design tokens                                 | Consistent look across mobile and web                                                                                                                 |

**Alternatives considered:**

- _Native Swift + Kotlin_: best performance, but three codebases and three skill sets. Not worth it for this app.
- _Flutter_: good, but web dashboards are weaker and you lose the shared TS stack.
- _Firebase_: fine, but training/nutrition data is very relational (programs → sessions → sets), which fits Postgres better.
- _AWS from scratch_: maximum control, much more ops work. Revisit only if scale or compliance demands it.

---

## 5. AI that trainers can teach

The AI drafts programs and adjustments **the way each trainer coaches**, not generic advice. Trainers must be able to teach it, correct it, and update it themselves without a developer.

### How the AI is "taught"

We don't retrain or fine-tune a model to start. Instead, each request to the AI includes the trainer's own knowledge, pulled from the database. This is cheaper, takes effect immediately, is easy to undo, and every trainer can have their own. There are four kinds of knowledge, all edited in the coach dashboard:

| Knowledge type  | What it is                                            | Example                                                                                                      |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Methodology** | Written philosophy, documents, uploaded PDFs          | "I periodize in 4-week blocks: 3 build, 1 deload…"                                                           |
| **Rules**       | Hard requirements the AI must follow                  | "Never prescribe Olympic lifts to athletes with < 6 months of training." "Cap weekly sets per muscle at 20." |
| **Preferences** | Soft defaults                                         | "Prefer trap-bar deadlifts over conventional for field athletes."                                            |
| **Examples**    | Real programs the trainer approved, used as reference | Past programs for similar athletes                                                                           |

- **Each trainer has their own AI.** Every coach has a personal _AI profile_ made of their own methodology, rules, preferences, and examples. Their AI drafts in their style, not the head coach's.
- **Starting point for new coaches:** a new coach can start with an empty profile, or copy the head coach's methodology as a starting template and then change it freely. Copies are independent, so later changes to one don't affect the other.
- **Business-wide guardrails only:** the organization level holds a small set of **safety rules** that apply to every coach's AI (e.g. injury contraindications, minimum recovery between max-effort sessions, no medical or supplement claims). The head coach manages these; coaching style is never set here.
- **Athletes with more than one coach:** the AI uses the profile of the athlete's _primary_ coach. A nutrition coach's AI handles nutrition suggestions only.
- **Sharing is optional:** a coach can choose to share specific examples or documents with other coaches in the business (e.g. a great return-from-injury program). Others can copy them into their own profile.
- **Versioned:** every change to the knowledge is saved with who changed it and when. You can see which version produced a given draft and roll back.
- **Search:** documents and examples are stored with _embeddings_ (pgvector in Supabase), so the AI pulls only the relevant parts for each athlete.

### How it learns from trainers over time

1. AI produces a **draft** program or adjustment, with its reasoning ("lowered squat volume because HRV is down 15% this week").
2. The coach **approves, edits, or rejects** it. Nothing reaches an athlete without approval.
3. Every edit is saved as **feedback** (what the AI proposed vs. what the coach changed, and an optional reason).
4. Approved programs become new **examples**. Edits the coach repeats often show up as **suggested new rules**, and the coach confirms or ignores them.

The AI gets more like each trainer the more they use it, and the trainer stays in control of what it learned.

### What the AI uses as input

Athlete profile and goals, injuries, training history and logged sets, wearable trends (sleep, HRV, resting HR), nutrition logs, check-in answers, and the coach's notes. Only data the coach is allowed to see goes in.

### Quality & safety

- **Hard rules are checked in code too**, not just in the prompt. If a draft breaks one (e.g. too much volume, a contraindicated exercise), it's flagged before the coach sees it.
- **Evaluation set:** a set of sample athletes with programs the trainers say are "right". Every change to prompts, models, or knowledge is tested against it before release.
- **Logging:** every AI request and response is stored, so we can explain any draft.
- **Privacy:** use an AI provider whose business terms say customer data isn't used for training, and send only what each request needs. Athletes are told in the privacy policy that AI assists their coach.

### Technology

- **Model:** a hosted large language model through an API, e.g. Anthropic's Claude. Use the most capable model for program drafting and a faster, cheaper one for summaries. The code goes through one internal AI service, so the model can be switched later.
- **Where it runs:** the Node worker (section 4), since drafting a program can take longer than a normal web request.
- **Fine-tuning later:** once there are thousands of approved programs and coach edits, a fine-tuned model may be worth testing. The feedback data collected from Phase 1 makes that possible. It isn't needed to launch.

---

## 6. Wearables & health data

This is the hardest technical area. Plan for it explicitly.

| Source                          | How                                                                                 | Notes                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Apple Watch / Apple Health**  | HealthKit, **on device** (no server API)                                            | Needs native module (`react-native-health` or similar) in an Expo dev build. App reads data and uploads to our backend. |
| **Android / Wear OS / Samsung** | **Health Connect**, on device                                                       | Same pattern as HealthKit.                                                                                              |
| **Garmin**                      | Garmin Connect Developer Program (Health API + Activity API), server-to-server push | Requires application & approval as a business. Data pushed to our webhook. **Apply in Phase 0.**                        |
| **Strava** (Phase 1)            | Strava API, OAuth + webhook for new activities                                      | Server-side, so it works from web or mobile. Activities only (no sleep/HRV).                                            |
| Whoop, Oura, Polar, Coros       | Each has its own OAuth API                                                          | Each one is a separate integration to build and maintain.                                                               |

**Build vs. buy:** a wearable aggregator (e.g. **Terra**, **Junction (formerly Vital)**, **ROOK**) gives one API for Garmin, Whoop, Oura, Polar, Coros, Fitbit, etc. **Recommendation:** do HealthKit + Health Connect directly in Phase 1 (they're free and on-device), then in Phase 2 compare aggregator pricing against building Garmin directly. If athletes use 3+ device brands, the aggregator usually wins on time-to-market. Check current pricing; it's typically a monthly fee plus per-user.

**Normalize everything** into our own tables (`daily_metrics`, `activities`) so the app never cares which device data came from.

**Nutrition data sources:** USDA FoodData Central (free), Open Food Facts (free, barcodes), or paid APIs (Nutritionix, FatSecret, Edamam) for better branded/restaurant coverage.

---

## 7. Hosting, accounts & where everything lives

**Rule #1: every account is owned by the business** (an LLC or company email like `admin@<domain>`), with team members added as members. Never build on someone's personal account.

| What                        | Service                                                | Est. cost (check current pricing)                                |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Code repository             | **GitHub** Organization (Team plan)                    | ~$4/user/mo                                                      |
| Web hosting                 | **Vercel** (Next.js), auto preview per pull request    | Pro ~$20/member/mo                                               |
| Database, auth, storage     | **Supabase**: 3 projects (dev, staging, prod)          | Pro ~$25/mo per prod project; dev can be free tier               |
| Worker / webhooks           | **Render** or **Fly.io**                               | ~$7–25/mo to start                                               |
| Mobile builds & OTA updates | **Expo EAS** (Build, Submit, Update)                   | Free tier → ~$19–99/mo                                           |
| iOS distribution            | **Apple Developer Program** (enroll as _Organization_) | $99/yr. **Needs a D-U-N-S number; start now, it can take weeks** |
| Android distribution        | **Google Play Console** (organization account)         | $25 one-time                                                     |
| Domain & DNS                | **Cloudflare**                                         | ~$10–15/yr                                                       |
| Transactional email         | **Resend** or **Postmark**                             | Free → ~$20/mo                                                   |
| Push notifications          | Expo Notifications (APNs + FCM)                        | Free                                                             |
| Error monitoring            | **Sentry**                                             | Free → ~$26/mo                                                   |
| Product analytics           | **PostHog**                                            | Free tier generous                                               |
| Secrets / shared passwords  | **1Password** Teams or Business                        | ~$4–8/user/mo                                                    |
| Project management          | **Linear** or GitHub Projects                          | Free → ~$8/user/mo                                               |
| Design                      | **Figma**                                              | Free → ~$15/editor/mo                                            |

Rough starting run-rate: **~$150–300/month** plus per-seat tools, before wearable aggregator or paid nutrition API costs.

### Environments

| Env         | Purpose                                  | Web                                  | Database                 | Mobile                                            |
| ----------- | ---------------------------------------- | ------------------------------------ | ------------------------ | ------------------------------------------------- |
| **dev**     | Local development                        | `localhost`                          | Local Supabase (Docker)  | Expo dev build on simulator/phone                 |
| **staging** | Testing before release, trainer previews | `staging.<domain>` + per-PR previews | Supabase staging project | EAS "preview" channel / TestFlight                |
| **prod**    | Real athletes                            | `app.<domain>`                       | Supabase prod project    | App Store / Play Store + EAS "production" channel |

---

## 8. Privacy, legal & compliance

Health and body data are sensitive. Handle them carefully from day one.

- **Privacy policy & terms** are required by Apple/Google, and by Garmin and the other wearable APIs. Have a lawyer review.
- **HIPAA:** a personal trainer usually isn't a HIPAA-covered entity, but confirm with a lawyer, especially if he works with physicians, PTs, or insurers. If needed, Supabase and AWS offer HIPAA-eligible plans with a BAA.
- **GDPR / state privacy laws** (e.g. CCPA, Washington's My Health My Data Act) if athletes are in those regions: consent, data export, account deletion.
- **Apple HealthKit rules:** health data can't be used for advertising, and you must explain usage clearly.
- **Account deletion** must be available in-app (Apple requirement).
- **Payments:** Apple/Google normally require in-app purchase for digital subscriptions, but there are exceptions for **person-to-person services** like 1:1 coaching. Confirm how his offering fits the current App Store guidelines before building payments. If IAP is needed, use **RevenueCat** to manage it; use **Stripe** for web.
- **Security basics:** row-level security on every table (athletes see only their data; coaches see only their athletes), encryption at rest (default on Supabase), 2FA required on all team accounts, least-privilege access to prod.

---

## 9. Code repository & team workflow

### Repository structure (monorepo)

One GitHub repo, managed with **pnpm workspaces + Turborepo**:

```
continuumelite/
├── apps/
│   ├── mobile/          # Expo app (iOS + Android)
│   ├── web/             # Next.js (coach dashboard + athlete web)
│   └── worker/          # Node service: wearable webhooks, sync, scheduled jobs
├── packages/
│   ├── shared/          # Types, Zod schemas, business logic (1RM, volume, macros)
│   ├── api/             # Typed data-access client used by mobile + web
│   ├── ui/              # Shared design tokens / cross-platform components
│   └── config/          # Shared ESLint, TypeScript, Prettier config
├── supabase/
│   ├── migrations/      # Database schema changes, version-controlled
│   ├── seed.sql         # Test data for local dev
│   └── functions/       # Edge Functions
├── docs/                # This plan, architecture decisions, runbooks
└── .github/
    ├── workflows/       # CI/CD
    ├── CODEOWNERS
    └── pull_request_template.md
```

### How multiple people work together

- **Branching:** trunk-based. `main` is always deployable. Short-lived feature branches (`feat/program-builder`, `fix/set-logging-offline`).
- **Pull requests required:** no direct pushes to `main`. At least 1 approving review. CI must pass. Branch protection enforces this.
- **CI (GitHub Actions)** on every PR: lint, type-check, unit tests, database migration check, build web and mobile.
- **Preview everything:** each PR gets a Vercel preview URL (web) and an EAS Update preview (mobile), so reviewers and the trainer can try changes before merge.
- **CD:** merge to `main` → auto-deploy to **staging**. Tag a release (`v1.4.0`) → deploy to **prod** and build store binaries.
- **Database changes only through migrations** in `supabase/migrations/`, reviewed in PRs like code. Never edit prod schema by hand.
- **Secrets** never in the repo: GitHub Actions secrets, Vercel env vars, EAS secrets; shared via 1Password. Commit a `.env.example`.
- **Conventions:** Conventional Commits, Prettier + ESLint enforced, `CODEOWNERS` for sensitive areas (auth, migrations, payments).
- **Docs:** short Architecture Decision Records (`docs/adr/0001-use-supabase.md`) so new people understand _why_.
- **Work tracking:** Linear (or GitHub Projects) with a 1–2 week cycle; a demo to the trainer at the end of each cycle.
- **Onboarding target:** a new developer goes from `git clone` to running app in under 30 minutes using `README.md` + `pnpm install && pnpm dev`.

---

## 10. Core data model (first draft)

```
organizations         – the coaching business
users                 – auth identity
memberships           – user ↔ org with role (owner, head_coach, coach, athlete)
athlete_profiles      – goals, history, injuries, equipment, availability, preferences
coach_athletes        – which coaches work with which athlete, and in what role (primary, nutrition, assistant)
exercises             – library, owned by the org or a coach (name, cues, video, muscle groups, equipment)
program_templates     – reusable starting points, owned by the org or a coach
programs              – an athlete's personalized program (copied from template, then edited)
program_versions      – full history of every program change: who, when, and the coach's reason
program_blocks/weeks  – periodization structure
sessions              – a planned workout on a date
session_exercises     – prescription: sets, reps, load/%1RM, RPE, tempo, rest, notes
workout_logs          – what the athlete actually did
set_logs              – actual reps, load, RPE per set
nutrition_targets     – per athlete, can vary by day type (training/rest)
foods / meals         – food items, saved meals
food_logs             – what the athlete ate
wearable_connections  – provider, tokens (encrypted), status
activities            – normalized workouts from any device
daily_metrics         – normalized sleep, HRV, resting HR, steps, readiness
check_in_forms        – coach-defined questions
check_ins             – athlete responses, photos, measurements
messages / threads    – coach ↔ athlete chat
coach_notes           – private notes on an athlete
audit_log             – who changed what, across the platform

-- Tiers and community
plans                 – the org's subscription levels (3), name, price, order
plan_features         – which feature keys each plan includes, with an optional limit
subscriptions         – an athlete's current plan, status, period, source (manual, Stripe, App Store, Play)
community_posts       – org-wide posts; author, body, media, pinned, hidden
community_comments    – replies to posts
community_reactions   – likes / reactions
community_reports     – athlete reports for moderation

-- AI (tables created in Phase 3; program_versions above collects the data from Phase 1)
ai_profiles           – one per coach (their AI); optionally copied from another coach's profile
ai_guardrails         – org-wide safety rules that apply to every coach's AI
ai_knowledge_items    – methodology, rules, preferences, examples; belong to one coach's AI profile
ai_knowledge_versions – history of every knowledge change, for rollback
ai_knowledge_chunks   – searchable pieces of documents, with embeddings (pgvector)
ai_drafts             – what the AI proposed, its reasoning, model + knowledge version used
ai_feedback           – coach approve/edit/reject, the diff, and the reason
ai_eval_cases         – sample athletes + "correct" programs used to test AI changes
```

---

## 11. Team & roles (suggested)

| Role                          | Responsibility                                                   |
| ----------------------------- | ---------------------------------------------------------------- |
| Product owner (trainer)       | Priorities, acceptance, coaching expertise                       |
| Tech lead (you?)              | Architecture, code review, infrastructure, releases              |
| 1–2 full-stack TS developers  | Features across mobile/web/backend                               |
| Designer (part-time/contract) | Wireframes, design system, Figma                                 |
| Trainers (all)                | From Phase 3: teach the AI, review drafts, build the AI test set |
| QA / pilot athletes           | 3–5 existing athletes testing each build                         |

---

## 12. Immediate next steps (this week)

1. ☐ Confirm business entity; get a **D-U-N-S number** (needed for Apple org account).
2. ☐ Register the domain; set up a business Google Workspace / email.
3. ☐ Create GitHub Organization; invite the team; enable 2FA requirement.
4. ☐ Create Apple Developer (org), Google Play Console (org), Expo, Vercel, Supabase, Sentry accounts under the business.
5. ☐ Apply to the **Garmin Connect Developer Program**.
6. ☐ Set up 1Password vault for shared credentials.
7. ☐ Discovery sessions with the trainer: walk the business plan, collect current spreadsheets/programs.
8. ☐ Scaffold the monorepo (structure above) with CI, lint, and a "hello world" deployed to staging on web + TestFlight.
9. ☐ Draft wireframes for: athlete Today screen, set logger, food log, coach athlete list, coach program builder, athlete detail.

---

## 13. Questions to answer with the trainer

1. How many trainers at launch and in 12 months? Do they share athletes? Are they employees of one business, or could separate businesses license the platform?
2. How many athletes now, and in 12 months?
3. Which devices do his athletes actually wear today? (Drives the wearable priority.)
4. How does he charge today, and should the app handle billing?
5. What does a perfect weekly check-in look like for him?
6. Which metrics does he personally care about most (HRV, sleep, RPE, body weight, …)?
7. What's the budget and target launch date for the pilot?
8. Are any athletes minors? (Affects consent and privacy requirements.)
9. Which safety rules should apply to every trainer's AI, whatever their style? _(Owner: you, working with the trainers. Needed before Phase 3; a first draft by the Phase 2 AI prototype helps.)_
10. What should the AI do first: draft full programs, adjust existing ones week to week, or write athlete summaries?
11. What are the three subscription levels called, what do they cost, and which features does each include? (The app is built so this can be decided late; see "Subscription tiers" in section 3.)
12. Community extras: should finished workouts post to the feed automatically, and do we want challenges or leaderboards?

### Decided (Nov 2026, from the app design brief review)

- **Integrations:** keep Apple Health, Health Connect and Garmin as planned, and add **Strava** in Phase 1.
- **Platforms:** athletes can use the mobile app or the web, with the same features on both.
- **Community:** one feed across the whole organization; athletes and coaches post, coach posts are highlighted.
- **Subscriptions:** three athlete tiers that unlock more features; the feature-to-tier mapping is configurable and still to be decided. Built: the owner edits the mapping at Dashboard › Plans on the web; coaches set an athlete's level on the athlete page; the apps show locked features and a Plans page. Levels stay off until the owner turns them on.
- **Built overnight (Nov 15):** community feed, nutrition targets and food logging, coach–athlete messaging (with the per-week message limit), the athlete side of the web app, and the Strava connection (switched off until the Strava app keys are set; see `docs/integrations/strava.md`).
- **Look and feel:** the design brief (dark navy, cream, Anton + DM Sans, five mobile tabs) is the reference; see `docs/brand/README.md`.
