-- Schema for the tip-input app. Not managed by Supabase CLI migrations -
-- apply by pasting into the Supabase project's SQL editor (Dashboard ->
-- SQL Editor -> New query -> run). See CLAUDE.md for the full setup flow.

create table public.tips (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  source text not null default '',
  amount numeric(10,2) not null,
  category text not null default 'Tips' check (category in ('Tips', 'Wages')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index tips_user_date_idx on public.tips (user_id, date desc, id desc);

alter table public.tips enable row level security;

create policy "select own tips" on public.tips
  for select using (auth.uid() = user_id);

create policy "insert own tips" on public.tips
  for insert with check (auth.uid() = user_id);

create policy "update own tips" on public.tips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own tips" on public.tips
  for delete using (auth.uid() = user_id);
