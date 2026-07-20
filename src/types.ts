export type IncomeCategory = 'Tips' | 'Wages';

export interface Tip {
  id: number;
  date: string; // YYYY-MM-DD
  source: string;
  amount: number;
  category: IncomeCategory;
  note: string;
}

export type TipDraft = Omit<Tip, 'id'>;
