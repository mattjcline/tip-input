export interface Tip {
  id: number;
  date: string; // YYYY-MM-DD
  amount: number;
  source: string;
  note: string;
}

export type TipDraft = Omit<Tip, 'id'>;
