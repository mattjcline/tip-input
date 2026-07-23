export type IncomeCategory = 'Tips' | 'Wages';
export type ShiftType = 'bar' | 'floor';
export type TransferKind = 'tip_in' | 'tip_out' | 'money_owed';

export interface NameAmount {
  name: string;
  amount: number;
}

export interface TipTransfer extends NameAmount {
  id: number;
  kind: TransferKind;
}

export interface Tip {
  id: number;
  date: string; // YYYY-MM-DD
  source: string;
  amount: number;
  category: IncomeCategory;
  note: string;
  creditCardTips: number | null;
  cashTips: number | null;
  shiftType: ShiftType | null;
  transfers: TipTransfer[]; // always present; [] for non-verbose entries
}

// creditCardTips/cashTips/shiftType are optional here (not required) so
// the plain (non-verbose) create path's draft object doesn't need to
// change - api.ts defaults missing fields to null before insert.
export type TipDraft = Omit<Tip, 'id' | 'transfers' | 'creditCardTips' | 'cashTips' | 'shiftType'> &
  Partial<Pick<Tip, 'creditCardTips' | 'cashTips' | 'shiftType'>>;

export interface VerboseTipDraft {
  date: string;
  source: string;
  category: IncomeCategory;
  note: string;
  creditCardTips: number | null;
  cashTips: number | null;
  shiftType: ShiftType;
  tipsIn: NameAmount[];
  tipsOut: NameAmount[];
  moneyOwed: NameAmount[];
}
