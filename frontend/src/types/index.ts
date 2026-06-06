export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  source: 'whatsapp' | 'web' | 'import';
  created_at: string;
  categories?: { name: string; icon: string; color: string } | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  budget_limit: number | null;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
}

export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
  month: string;
}
