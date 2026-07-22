import { supabase } from './supabase';
import type { Tip, TipDraft } from '../types';

const COLUMNS = 'id,date,source,amount,category,note';

export async function fetchTips(): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select(COLUMNS)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Tip[];
}

export async function addTip(draft: TipDraft): Promise<Tip> {
  const { data, error } = await supabase.from('tips').insert(draft).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return data as unknown as Tip;
}

export async function updateTip(tip: Tip): Promise<Tip> {
  const { id, ...fields } = tip;
  const { data, error } = await supabase
    .from('tips')
    .update(fields)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Tip;
}

export async function deleteTip(id: number): Promise<void> {
  const { error } = await supabase.from('tips').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
