-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  phone text unique,
  currency text default 'BRL',
  timezone text default 'America/Sao_Paulo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Categories
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  icon text default '💰',
  color text default '#6366f1',
  type text check (type in ('income', 'expense', 'both')) default 'both',
  budget_limit numeric(12,2),
  created_at timestamptz default now()
);

-- Transactions
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  source text check (source in ('whatsapp', 'web', 'import')) default 'web',
  raw_message text,
  is_recurring boolean default false,
  recurrence_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bills (contas a pagar)
create table public.bills (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  paid boolean default false,
  paid_at timestamptz,
  is_recurring boolean default false,
  recurrence_interval text check (recurrence_interval in ('weekly', 'monthly', 'yearly')),
  created_at timestamptz default now()
);

-- Goals (metas de economia)
create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) default 0,
  deadline date,
  icon text default '🎯',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Default categories per user (trigger)
create or replace function public.create_default_categories()
returns trigger as $$
begin
  insert into public.categories (user_id, name, icon, color, type) values
    (new.id, 'Alimentação',    '🍔', '#ef4444', 'expense'),
    (new.id, 'Transporte',     '🚗', '#f97316', 'expense'),
    (new.id, 'Moradia',        '🏠', '#eab308', 'expense'),
    (new.id, 'Saúde',          '💊', '#22c55e', 'expense'),
    (new.id, 'Lazer',          '🎮', '#3b82f6', 'expense'),
    (new.id, 'Educação',       '📚', '#8b5cf6', 'expense'),
    (new.id, 'Vestuário',      '👕', '#ec4899', 'expense'),
    (new.id, 'Internet/Telefone', '📱', '#06b6d4', 'expense'),
    (new.id, 'Serviços',       '🔧', '#84cc16', 'expense'),
    (new.id, 'Outros',         '📦', '#6b7280', 'expense'),
    (new.id, 'Salário',        '💼', '#10b981', 'income'),
    (new.id, 'Freelance',      '💻', '#6366f1', 'income'),
    (new.id, 'Investimentos',  '📈', '#f59e0b', 'income'),
    (new.id, 'Outros ganhos',  '💰', '#14b8a6', 'income');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.create_default_categories();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.categories enable row level security;
alter table public.bills enable row level security;
alter table public.goals enable row level security;

create policy "Users can manage own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users can manage own transactions" on public.transactions
  for all using (auth.uid() = user_id);

create policy "Users can manage own categories" on public.categories
  for all using (auth.uid() = user_id);

create policy "Users can manage own bills" on public.bills
  for all using (auth.uid() = user_id);

create policy "Users can manage own goals" on public.goals
  for all using (auth.uid() = user_id);

-- Useful views
create or replace view public.monthly_summary as
select
  user_id,
  date_trunc('month', date) as month,
  type,
  sum(amount) as total,
  count(*) as count
from public.transactions
group by user_id, date_trunc('month', date), type;

create or replace view public.category_spending as
select
  t.user_id,
  c.id as category_id,
  c.name as category_name,
  c.icon,
  c.color,
  c.budget_limit,
  date_trunc('month', t.date) as month,
  sum(t.amount) as total
from public.transactions t
left join public.categories c on c.id = t.category_id
where t.type = 'expense'
group by t.user_id, c.id, c.name, c.icon, c.color, c.budget_limit, date_trunc('month', t.date);
