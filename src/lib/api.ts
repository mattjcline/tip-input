import type { Tip, TipDraft } from '../types';

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined;
const TOKEN = import.meta.env.VITE_APPS_SCRIPT_TOKEN as string | undefined;

function assertConfigured() {
  if (!BASE_URL || !TOKEN) {
    throw new Error(
      'Missing VITE_APPS_SCRIPT_URL / VITE_APPS_SCRIPT_TOKEN - copy .env.example to .env.local and fill them in.'
    );
  }
}

// Apps Script web apps don't handle CORS preflight requests, so POST bodies
// are sent as text/plain to keep the browser from issuing an OPTIONS request.
async function post(action: string, payload: unknown) {
  assertConfigured();
  const res = await fetch(BASE_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, action, payload }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function fetchTips(): Promise<Tip[]> {
  assertConfigured();
  const url = new URL(BASE_URL!);
  url.searchParams.set('token', TOKEN!);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.tips as Tip[];
}

export async function addTip(draft: TipDraft): Promise<Tip> {
  const data = await post('add', draft);
  return data.tip as Tip;
}

export async function updateTip(tip: Tip): Promise<Tip> {
  const data = await post('update', tip);
  return data.tip as Tip;
}

export async function deleteTip(id: number): Promise<void> {
  await post('delete', { id });
}
