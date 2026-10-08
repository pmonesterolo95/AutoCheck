import { ExpenseCategory } from './enums';

export interface Expense {
  id: string;
  vehicle_id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  date: string;
  created_at: string;
}

export interface ExpensePayload {
  vehicle_id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  date: string;
}
