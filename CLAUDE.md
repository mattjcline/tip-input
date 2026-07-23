# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working conventions

- Never use an em dash. Use a hyphen or regular dash instead.
- Never auto-add an agent name (e.g. "Co-Authored-By: Claude") to commit messages.
- Keep chat responses short - no paragraphs-per-step narration. Terse status updates and results only.

## What this is

A mobile-first, installable web app (iOS PWA) for quickly logging tips. It's
a multi-user app - each signed-in user only sees and edits their own tips.
The backend is Supabase (managed Postgres + Auth), accessed directly from
the frontend via `@supabase/supabase-js`; there is no separately deployed
custom backend.

## Commands

- `npm run dev` - start the Vite dev server
- `npm run build` - typecheck (`tsc -b`) then production build to `dist/`
- `npm run preview` - serve the production build locally
- `npm run lint` - Oxlint (config in `.oxlintrc.json`)
- `npm run migrate` - one-off script to import legacy Google Sheet data into
  Supabase, see "Migrating from the old Google Sheet backend" below
- `npm test` - run the test suite once (Vitest); `npm run test:watch` for
  watch mode. Runs as part of `.github/workflows/deploy.yml` before the
  build, so a failing test blocks the deploy.

### Testing

Vitest + React Testing Library, configured in `vitest.config.ts` (kept
separate from `vite.config.ts` so tests don't pull in `vite-plugin-pwa` -
service worker generation has no place in a test run). `src/setupTests.ts`
wires up `@testing-library/jest-dom` matchers and RTL's `cleanup()` after
each test (needed because the config doesn't set `globals: true`, so RTL's
usual auto-cleanup-on-`afterEach` detection doesn't fire on its own).

Tests live next to the file they cover (`Foo.tsx` -> `Foo.test.tsx`).
`src/lib/api.test.ts` mocks `./supabase` directly (a hand-rolled chainable
query-builder stand-in - see `makeQuery` in that file) rather than hitting
a real Supabase project; `src/hooks/useTips.test.ts` mocks `../lib/api`
instead, one layer up. Component tests render through the actual DOM
(`@testing-library/react` + `jsdom`) rather than shallow-rendering, and
`TipForm.test.tsx` in particular exists to guard the app's core invariant
that non-verbose (the app owner's) rendering and behavior never changes
regardless of what's added to `VERBOSE_MODE`.

One environment quirk worth knowing: Node 22+ ships its own experimental
global `localStorage`, which can shadow jsdom's working one and leave
`localStorage` undefined mid-test. `vitest.config.ts` works around this
with `--no-experimental-webstorage` via `NODE_OPTIONS`, gated on the Node
major version since that flag doesn't exist before Node 22 and would
otherwise make Node refuse to start under an older version (e.g. CI's
pinned Node 20).

### Local setup

The frontend needs a Supabase project to talk to. Copy `.env.example` to
`.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
from your Supabase project's API settings, and apply `supabase/schema.sql`
via the Supabase SQL editor. Without the env vars set, API calls throw
immediately with a clear error rather than silently failing.

## Architecture

- **Frontend** (this repo root) - Vite + React + TypeScript SPA, hosted as a
  static site on GitHub Pages.
- **Backend** - Supabase (Postgres + Auth), accessed directly from the
  browser. Row Level Security (RLS) policies, not application code, enforce
  that each user only ever sees their own rows - see "Supabase schema"
  below. The Supabase URL and anon key are safe to bake into the public
  client bundle; RLS is the actual security boundary, not key secrecy.
  This app shares a Supabase project with an unrelated app (`bar-math`) -
  free-tier accounts are capped at 2 projects, so rather than spin up a
  third, tip-input's table lives alongside bar-math's in the same project
  (hence `tip_input_tips` rather than a generic `tips` name, to stay
  unambiguous in the shared table browser). One consequence worth knowing:
  Supabase Auth's user pool is per-project, not per-app, so anyone with an
  account in bar-math could technically sign into tip-input (and vice
  versa) - fine for personal/trusted use, but not a real tenant boundary if
  that ever changes.

### Frontend structure

- `src/lib/supabase.ts` - creates the shared `supabase-js` client from
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `src/lib/api.ts` - the only module that talks to the `tip_input_tips` table
  (`fetchTips`/`addTip`/`updateTip`/`deleteTip`). Queries don't need
  explicit `user_id` filters - RLS enforces that server-side regardless of
  what's asked for.
- `src/hooks/useSession.ts` - tracks the current Supabase auth session
  (`getSession` + `onAuthStateChange`). `src/App.tsx` gates the whole app on
  this: no session renders `<Login />` instead.
- `src/components/Login.tsx` - passwordless sign-in: email -> 6-digit OTP
  code -> `supabase.auth.verifyOtp`. Deliberately uses the typed code rather
  than a clickable magic link, since a link tapped from the iOS Mail app
  opens in Safari instead of the installed home-screen PWA. Requires
  `{{ .Token }}` to be added to the Magic Link email template in the
  Supabase Dashboard (Authentication -> Email Templates) - the default
  template only includes the link, not the code.
- `src/hooks/useTips.ts` - owns all tip state and does optimistic
  create/update/delete against the in-memory list, rolling back on API
  failure. Components should go through this hook rather than calling
  `lib/api.ts` directly.
- `src/types.ts` - the `Tip` shape shared between frontend and the
  `tip_input_tips` table. Keep in sync with `supabase/schema.sql` if the
  data model changes.
- `src/components/` - `TipForm` (entry), `TipList` (grouped-by-date display
  with delete), `SummaryBar` (week/month/YTD totals computed client-side
  from the loaded tips), `NameAmountList` (shared repeatable name+amount row
  editor used by Tips In/Out/Money Owed - see VERBOSE_MODE below).

## Supabase schema

`supabase/schema.sql` defines the full current schema (for a fresh
project) and its RLS policies. The live project was bootstrapped by pasting
that file into the SQL editor once; later changes are incremental files
under `supabase/migrations/`, applied in order against the live database -
`schema.sql` itself is only correct to run top-to-bottom against a brand
new project (not managed via Supabase CLI migrations, this project is small
enough that isn't worth the overhead). `id` is a `bigint identity` column
(not `uuid`) so it stays a plain JS `number` throughout the frontend.
`user_id` defaults to `auth.uid()` so client inserts don't need to set it,
and a `with check` policy enforces server-side that it can't be spoofed to
another user's id. After changing the schema, re-verify RLS with a real
signed-in session - enabling RLS with a missing policy silently locks out
the owning user too, not just other users.

### VERBOSE_MODE

A per-user flag, not a build-time toggle - read from
`session.user.user_metadata.verbose_mode` via `isVerboseMode()`/`useSession()`
in `src/hooks/useSession.ts`. There's no in-app UI to turn it on; it's
flipped once per account via the Supabase Dashboard (Authentication ->
Users -> edit `raw_user_meta_data`) after that person signs up. When off
(the default, including for every existing user), the app is byte-for-byte
identical to the non-verbose experience - all verbose fields are additive
and gated on the flag in `TipForm`/`TipList`.

Verbose entries add Credit Card Tips, Cash Tips (their sum becomes `amount`,
computed server-side - see below), a required Shift Type (`bar`/`floor`,
independent of the existing Tips/Wages `category`), and three repeatable
name+amount lists (Tips In, Tips Out, Money Owed) stored in
`tip_input_transfers`, one table with a `kind` discriminator rather than
three near-identical tables. Creating a verbose entry writes to two tables
(the shift row plus N transfer rows) atomically via the
`create_verbose_tip` Postgres RPC (`supabase/schema.sql`) rather than
chained client inserts - a partial write here would silently lose
money-owed data, which a single-transaction RPC call can't do. `amount` is
computed inside the RPC from the two breakdown numbers rather than trusted
from the client, but it's an ordinary insert value (not a `generated
always as` column), so it has no effect on non-verbose inserts or the
legacy rows migrated from the old Sheet.

## Migrating from the old Google Sheet backend

This app used to be backed by a Google Sheet via a Google Apps Script Web
App (`apps-script/`, now retired/removed once migration is confirmed - see
git history or `apps-script/README.md` if it's still present). Historical
data was carried over with `scripts/migrate-to-supabase.mjs`, a one-off
script (not part of the app bundle) that read from the old Apps Script
`doGet` endpoint and wrote into Supabase via the service-role key, tagged
with a target user's `auth.users` id. Not idempotent by default - rerunning
it duplicates rows unless passed `--replace`. See
`.env.migration.example` for the env vars it needs.

## Deploying

Deploys automatically via `.github/workflows/deploy.yml` on every push to
`main`: builds with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from GitHub
Actions repo secrets, publishes to GitHub Pages. Live at
`https://mattjcline.github.io/tip-input/`. The repo must stay public - GitHub
Pages on the free plan doesn't support private repos. One-time manual setup
if this ever needs to be redone: repo Settings -> Pages -> Source = "GitHub
Actions"; Supabase Dashboard -> Authentication -> URL Configuration must
list the Pages URL (and `http://localhost:5173/` for local dev) as an
allowed Site URL / Redirect URL.

### PWA / iOS specifics

- Served from a GitHub Pages project page, not the domain root - `vite.config.ts`
  sets `base: '/tip-input/'` and the PWA manifest's `start_url`/`scope`/`id`
  match. Get this wrong and "Add to Home Screen" installs will silently
  break (wrong scope/start URL) rather than erroring visibly.
- PWA behavior (manifest, service worker, icon set) is configured via
  `vite-plugin-pwa` in `vite.config.ts`; icons live in `public/` and were
  generated from `design/icon-source.svg` (regenerate with `rsvg-convert` if
  the icon changes - see that file for the source).
- `index.html` carries the iOS-specific meta tags
  (`apple-mobile-web-app-capable`, `apple-touch-icon`, etc.) needed for
  "Add to Home Screen" to behave as a standalone app rather than opening
  Safari chrome.
- `src/index.css` accounts for iOS safe areas (`env(safe-area-inset-*)`) and
  defines the light/dark theme via CSS custom properties +
  `prefers-color-scheme` - respect these variables rather than hardcoding
  colors in component styles.
