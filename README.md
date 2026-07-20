# Tips

A small installable web app (iOS PWA-friendly) for quickly logging tips,
backed by a Google Sheet. Replaces manual sheet editing with a fast,
mobile-first entry form.

## Stack

- **Frontend**: Vite + React + TypeScript, `vite-plugin-pwa` for install/offline support.
- **Backend**: a Google Apps Script Web App (`apps-script/Code.gs`) bound to
  the Google Sheet, exposed as a small JSON API. No separate server or
  database - the sheet is the database.

## Setup

1. Deploy the backend first - follow `apps-script/README.md`.
2. `npm install`
3. `cp .env.example .env.local` and fill in `VITE_APPS_SCRIPT_URL` and
   `VITE_APPS_SCRIPT_TOKEN` from step 1.
4. `npm run dev`

## Installing on iOS

Open the deployed site in Safari → Share → **Add to Home Screen**. The app
runs standalone (no browser chrome) once installed.

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - typecheck (`tsc -b`) and production build
- `npm run preview` - serve the production build locally
- `npm run lint` - run Oxlint
- `npm run deploy` - build and push to the live instance (see "Deploying" below)

## Deploying

The live instance runs on a home NAS (`shenron-docker`, a separate private
repo), serving this app's committed production build as a static site - see
that repo's `CLAUDE.md` ("Tip Input" section) for the hosting setup. To ship
a change: `npm run deploy` builds, copies `dist/` into the `shenron-docker`
checkout (expected at `~/dev/shenron-docker`, override with
`SHENRON_DOCKER_DIR`), and pushes after confirming - the NAS auto-deploys on
push.
