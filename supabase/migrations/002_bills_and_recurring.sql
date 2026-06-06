-- Recurring transactions template
create table if not exists public.recurring_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric(12,2) not null,
  description text not null,
  interval text check (interval in ('weekly', 'biweekly', 'monthly', 'yearly')) not null,
  next_date date not null,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.recurring_transactions enable row level security;
create policy "Users can manage own recurring" on public.recurring_transactions
  for all using (auth.uid() = user_id);

-- Index for performance
create index if not exists transactions_user_date on public.transactions (user_id, date desc);
create index if not exists transactions_user_type on public.transactions (user_id, type);
create index if not exists bills_user_due on public.bills (user_id, due_date, paid);
