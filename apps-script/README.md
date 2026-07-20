# Apps Script backend

This is the JSON API the frontend talks to. It runs as a Google Apps Script
bound to your `Income` spreadsheet tab, deployed as a Web App.

## One-time setup

### Option A: manual (Apps Script editor)

1. Open your Google Sheet → **Extensions → Apps Script**.
2. Delete the default `Code.gs` contents and paste in this repo's
   `apps-script/Code.gs`.
3. Click **Deploy → New deployment**, type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the deployment URL (ends in `/exec`).
5. Set the shared secret by visiting, once, in a browser:
   `<your deployment URL>/exec?action=bootstrap&token=<a-long-random-value-you-pick>`
   This only works the first time - once `SHARED_SECRET` is set, the
   bootstrap action becomes a no-op.
6. In the frontend, set `VITE_APPS_SCRIPT_URL` to the deployment URL and
   `VITE_APPS_SCRIPT_TOKEN` to the same value you bootstrapped with (see the
   root README / `.env.example`).

### Option B: clasp (CLI)

```
npx @google/clasp login
cd apps-script
npx @google/clasp create --parentId <SHEET_ID> --title "Income backend"
npx @google/clasp push
npx @google/clasp deploy --description "web app"
```

Don't pass `--type` alongside `--parentId` - that creates a brand-new
spreadsheet instead of binding to the one you already have.

`<SHEET_ID>` is the long ID in your sheet's URL
(`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`). `clasp deploy`
prints a deployment ID; the exec URL is
`https://script.google.com/macros/s/<deploymentId>/exec`.

The manifest (`appsscript.json`) sets `webapp.access` to
`ANYONE_ANONYMOUS` - the API's enum for the UI's plain "Anyone" option.
`ANYONE` (no `_ANONYMOUS`) means "anyone with a Google account" and will
redirect unauthenticated requests to a Google sign-in page instead of
running the script.

The very first time the script runs under your account, Google requires an
interactive authorization grant that `clasp deploy` cannot complete on its
own - requests will 403/redirect to sign-in until you do this once: open the
script (`clasp open`), pick any function in the Run dropdown (e.g. `doGet`),
click **Run**, and approve the permissions prompt. It's fine if the function
itself then errors out - the point is just granting the scopes.

Then bootstrap the secret as in step 5 above.

## Redeploying after changes

- Manual: **Deploy → Manage deployments → edit (pencil) → New version → Deploy**.
- clasp: `npx @google/clasp push` then `npx @google/clasp deploy` (pass
  `--deploymentId <id>` to update the existing deployment in place instead of
  creating a new one/URL).

## Data model

Binds to the existing `Income` tab - it does not create the tab, headers, or
any rows. Column A is unused; rows 1-6 are a title/example block; the real
header row is row 7; data starts at row 8, in columns B-F:

| B: Date (MM-DD-YYYY) | C: Source | D: $ Amount | E: Income Category | F: Notes (Optional) |
|---|---|---|---|---|

`Income Category` is either `Tips` or `Wages`. Row numbers double as record
IDs - the frontend receives each entry's sheet row as `id` and sends it back
for update/delete. These row/column offsets are hardcoded as
`DATA_START_ROW` / `START_COL` in `Code.gs` - if the sheet's layout changes,
update those constants.
