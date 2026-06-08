-- Add subscription/payment status to profiles
alter table public.profiles
  add column if not exists paid boolean default false,
  add column if not exists paid_at timestamptz;
