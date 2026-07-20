# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working conventions

- Never use an em dash. Use a hyphen or regular dash instead.
- Never auto-add an agent name (e.g. "Co-Authored-By: Claude") to commit messages.

## What this is

A mobile-first, installable web app (iOS PWA) for quickly logging tips. It
replaces manually editing a Google Sheet with a fast entry form. There is no
traditional backend/database - the Google Sheet itself is the datastore,
accessed through a Google Apps Script Web App that acts as a thin JSON API.

## Commands

- `npm run dev` - start the Vite dev server
- `npm run build` - typecheck (`tsc -b`) then production build to `dist/`
- `npm run preview` - serve the production build locally
- `npm run lint` - Oxlint (config in `.oxlintrc.json`)
- `npm run deploy` - build and ship to the live instance, see "Deploying" below

There is no test suite configured yet.

### Local setup

The frontend needs a deployed Apps Script backend to talk to. Copy
`.env.example` to `.env.local` and fill in `VITE_APPS_SCRIPT_URL` and
`VITE_APPS_SCRIPT_TOKEN` (see `apps-script/README.md` for how to deploy the
backend and obtain these). Without them, API calls throw immediately with a
clear error rather than silently failing.

## Architecture

Two independently deployed pieces:

1. **Frontend** (this repo root) - Vite + React + TypeScript SPA.
2. **Backend** (`apps-script/`) - a single Google Apps Script file
   (`Code.gs`) deployed as a Web App bound to the tips spreadsheet. It is
   *not* built or bundled by Vite/npm - it's deployed manually by pasting
   into the Apps Script editor (see `apps-script/README.md`). Changes to
   `apps-script/Code.gs` in this repo do not take effect until manually
   redeployed as a new version in the Apps Script UI.

### Frontend structure

- `src/lib/api.ts` - the only module that talks to the Apps Script backend.
  GETs pass an auth token as a query param; POSTs send `{ token, action,
  payload }` as `text/plain` (not `application/json`) specifically to avoid
  triggering a CORS preflight - Apps Script Web Apps don't handle OPTIONS
  requests. If you add new backend actions, follow this same convention.
- `src/hooks/useTips.ts` - owns all tip state and does optimistic
  create/update/delete against the in-memory list, rolling back on API
  failure. Components should go through this hook rather than calling
  `lib/api.ts` directly.
- `src/types.ts` - the `Tip` shape shared between frontend and (implicitly)
  the backend's JSON responses. Keep in sync with `rowToTip_` in
  `apps-script/Code.gs` if the data model changes.
- `src/components/` - `TipForm` (entry), `TipList` (grouped-by-date display
  with delete), `SummaryBar` (week/month/all-time totals computed
  client-side from the loaded tips).

### Backend data model (`apps-script/Code.gs`)

Binds to an existing tab named `Income` (not created by the script) -
column A is unused, rows 1-6 are a title/example block, the real header is
row 7, and data starts at row 8, in columns B-F: `Date (MM-DD-YYYY) |
Source | $ Amount | Income Category | Notes (Optional)`. `Income Category`
is `Tips` or `Wages` - this sheet tracks both, not just tips. Row numbers
double as record IDs (`Tip.id`) - there's no separate ID column.
`addTip_`/`updateTip_`/`deleteTip_` operate directly on sheet rows via that
row-number ID, offset by the `DATA_START_ROW`/`START_COL` constants. A
shared-secret token (`PropertiesService` script property `SHARED_SECRET`)
gates every request since the deployment is anonymous-access. See
`apps-script/README.md` for the full deployment procedure, including a
one-time `doGet`-run authorization step that's easy to miss.

## Deploying

The live instance is static hosting on a home NAS, managed in the separate
private `shenron-docker` repo (expected at `~/dev/shenron-docker`) - see
its `CLAUDE.md` "Tip Input" section for the hosting setup (nginx bind-
mounting a committed `dist/`, no build step on the NAS side, exposed via
`tailscale serve` for the HTTPS a PWA needs). `npm run deploy`
(`scripts/deploy.sh`) builds this repo, copies `dist/` into that checkout,
and commits + pushes there after confirming - the NAS's git hook
auto-deploys on push. The backend Apps Script URL/token get baked into the
built JS bundle at build time (`VITE_APPS_SCRIPT_*`), so a token rotation
requires a redeploy, not just a config change.

### PWA / iOS specifics

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
