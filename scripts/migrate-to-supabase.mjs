#!/usr/bin/env node
// One-off migration of existing Google Sheet tips (via the still-live Apps
// Script backend) into Supabase. Not part of the app bundle - run directly
// with Node. See .env.migration.example for the required env vars.
//
// Usage:
//   node scripts/migrate-to-supabase.mjs --dry-run
//   node scripts/migrate-to-supabase.mjs
//   node scripts/migrate-to-supabase.mjs --replace   (wipes existing rows for
//     TARGET_USER_ID first - use to safely re-run after a partial/bad import)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  let contents;
  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, '..', '.env.migration'));

const {
  APPS_SCRIPT_URL,
  APPS_SCRIPT_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TARGET_USER_ID,
} = process.env;

const required = { APPS_SCRIPT_URL, APPS_SCRIPT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TARGET_USER_ID };
for (const [key, value] of Object.entries(required)) {
  if (!value) {
    console.error(`Missing ${key} - copy .env.migration.example to .env.migration and fill it in.`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const replace = args.includes('--replace');

async function fetchSheetTips() {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('token', APPS_SCRIPT_TOKEN);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.tips;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

async function main() {
  const tips = await fetchSheetTips();
  console.log(`Fetched ${tips.length} rows from the Apps Script backend.`);

  const rows = tips.map(({ date, source, amount, category, note }) => ({
    date,
    source,
    amount,
    category,
    note,
    user_id: TARGET_USER_ID,
  }));

  if (dryRun) {
    console.log(`--dry-run: would insert ${rows.length} rows for user ${TARGET_USER_ID}.`);
    console.log('First 3:', rows.slice(0, 3));
    console.log('Last 3:', rows.slice(-3));
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (replace) {
    console.log(`--replace: deleting existing rows for user ${TARGET_USER_ID}...`);
    const { error } = await supabase.from('tips').delete().eq('user_id', TARGET_USER_ID);
    if (error) throw new Error(error.message);
  }

  let inserted = 0;
  for (const batch of chunk(rows, 500)) {
    const { error } = await supabase.from('tips').insert(batch);
    if (error) throw new Error(error.message);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${rows.length}...`);
  }

  console.log(`Done. Inserted ${inserted} rows for user ${TARGET_USER_ID}.`);
  console.log('Spot-check row count and dollar totals against the source Sheet and the app\'s summary bar.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
