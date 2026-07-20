# Apps Script backend

This is the JSON API the frontend talks to. It runs as a Google Apps Script
bound to your tips spreadsheet, deployed as a Web App.

## One-time setup

1. Open your Google Sheet → **Extensions → Apps Script**.
2. Delete the default `Code.gs` contents and paste in this repo's
   `apps-script/Code.gs`.
3. In the Apps Script editor, go to **Project Settings → Script Properties**
   and add a property `SHARED_SECRET` with a long random value. This is the
   token the frontend must send with every request — treat it like a
   password.
4. Click **Deploy → New deployment**, type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL (ends in `/exec`).
6. In the frontend, set `VITE_APPS_SCRIPT_URL` to that URL and
   `VITE_APPS_SCRIPT_TOKEN` to the same `SHARED_SECRET` value (see the root
   README / `.env.example`).

## Redeploying after changes

Apps Script Web App URLs stay stable across edits, but you must create a
**new version** for changes to take effect: **Deploy → Manage deployments →
edit (pencil) → New version → Deploy**.

## Data model

The sheet gets a `Tips` tab (created automatically if missing) with columns:

| Date | Amount | Source | Note |
|------|--------|--------|------|

Row numbers double as record IDs — the frontend receives each tip's sheet
row as `id` and sends it back for update/delete.
