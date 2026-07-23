# Tips

A small installable web app (iOS PWA-friendly) for quickly logging tips.
Multi-user - each signed-in person only sees and edits their own entries.

## Stack

- **Frontend**: Vite + React + TypeScript, `vite-plugin-pwa` for install/offline support.
- **Backend**: [Supabase](https://supabase.com) (Postgres + Auth), accessed
  directly from the browser via `@supabase/supabase-js`. Row Level Security
  policies keep each user's data private - see `supabase/schema.sql`.
- **Hosting**: GitHub Pages, auto-deployed on push to `main` via
  `.github/workflows/deploy.yml`.

## Setup

1. Create a Supabase project, then apply `supabase/schema.sql` via its SQL
   editor (Dashboard -> SQL Editor).
2. In the Supabase Dashboard, go to Authentication -> Email Templates ->
   Magic Link and add `{{ .Token }}` to the template body (sign-in uses a
   typed 6-digit code, not the clickable link).
3. `npm install`
4. `cp .env.example .env.local` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings.
5. `npm run dev`

## Installing on iOS

Open the deployed site in Safari -> Share -> **Add to Home Screen**. The app
runs standalone (no browser chrome) once installed.

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - typecheck (`tsc -b`) and production build
- `npm run preview` - serve the production build locally
- `npm run lint` - run Oxlint
- `npm test` - run the test suite (Vitest + React Testing Library)
- `npm run migrate` - one-off import of legacy Google Sheet data into
  Supabase (see `CLAUDE.md`)

## Deploying

Automatic on push to `main` via GitHub Actions
(`.github/workflows/deploy.yml`), which builds with
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from repo secrets and publishes
to GitHub Pages. Live at `https://mattjcline.github.io/tip-input/`. The repo
needs to stay public for Pages to work on the free plan.
