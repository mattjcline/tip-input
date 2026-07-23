-- Adds VERBOSE_MODE support: optional CC/cash breakdown + shift type on
-- tip_input_tips, plus a new tip_input_transfers table for Tips In / Tips
-- Out / Money Owed line items. Paste into the Supabase SQL Editor and run
-- once against the existing project. All new tip_input_tips columns are
-- nullable so existing rows and non-verbose users' future rows are
-- unaffected.

alter table public.tip_input_tips
  add column credit_card_tips numeric(10,2),
  add column cash_tips numeric(10,2),
  add column shift_type text check (shift_type in ('bar', 'floor'));

-- One table with a `kind` discriminator rather than three near-identical
-- tables: Tips In/Out/Money Owed are structurally identical (name +
-- amount + parent shift), and the eventual "total owed to X" report is a
-- single group-by-kind-and-name query instead of a three-way UNION.
create table public.tip_input_transfers (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tip_id bigint not null references public.tip_input_tips(id) on delete cascade,
  kind text not null check (kind in ('tip_in', 'tip_out', 'money_owed')),
  name text not null,
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index tip_input_transfers_tip_id_idx on public.tip_input_transfers (tip_id);
create index tip_input_transfers_user_kind_name_idx on public.tip_input_transfers (user_id, kind, name);

alter table public.tip_input_transfers enable row level security;

create policy "select own transfers" on public.tip_input_transfers
  for select using (auth.uid() = user_id);

create policy "insert own transfers" on public.tip_input_transfers
  for insert with check (auth.uid() = user_id);

create policy "update own transfers" on public.tip_input_transfers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own transfers" on public.tip_input_transfers
  for delete using (auth.uid() = user_id);

-- Atomically writes a verbose shift entry plus its transfer rows in one
-- transaction. Runs security invoker so RLS applies exactly as if the
-- caller had issued the inserts directly (user_id still defaults to
-- auth.uid() on both tables). amount is computed here from the two
-- breakdown numbers rather than trusted from the client, and is an
-- ordinary insert value (not a generated column), so it has no effect on
-- rows written by the plain (non-verbose) insert path.
create or replace function public.create_verbose_tip(
  p_date date,
  p_source text,
  p_category text,
  p_note text,
  p_credit_card_tips numeric,
  p_cash_tips numeric,
  p_shift_type text,
  p_tips_in jsonb,
  p_tips_out jsonb,
  p_money_owed jsonb
) returns public.tip_input_tips
language plpgsql
security invoker
as $$
declare
  v_tip public.tip_input_tips;
  v_item jsonb;
begin
  insert into public.tip_input_tips
    (date, source, amount, category, note, credit_card_tips, cash_tips, shift_type)
  values
    (p_date, p_source, coalesce(p_credit_card_tips, 0) + coalesce(p_cash_tips, 0),
     p_category, p_note, p_credit_card_tips, p_cash_tips, p_shift_type)
  returning * into v_tip;

  for v_item in select * from jsonb_array_elements(coalesce(p_tips_in, '[]'::jsonb)) loop
    insert into public.tip_input_transfers (tip_id, kind, name, amount)
    values (v_tip.id, 'tip_in', v_item->>'name', (v_item->>'amount')::numeric);
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_tips_out, '[]'::jsonb)) loop
    insert into public.tip_input_transfers (tip_id, kind, name, amount)
    values (v_tip.id, 'tip_out', v_item->>'name', (v_item->>'amount')::numeric);
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_money_owed, '[]'::jsonb)) loop
    insert into public.tip_input_transfers (tip_id, kind, name, amount)
    values (v_tip.id, 'money_owed', v_item->>'name', (v_item->>'amount')::numeric);
  end loop;

  return v_tip;
end;
$$;

revoke all on function public.create_verbose_tip(date, text, text, text, numeric, numeric, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_verbose_tip(date, text, text, text, numeric, numeric, text, jsonb, jsonb, jsonb) to authenticated;
