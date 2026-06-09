-- Tabela de agendamentos/compromissos
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  reminder_sent_1d boolean default false,
  reminder_sent_1h boolean default false,
  reminder_sent_now boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index para busca por user + data
create index if not exists appointments_user_date on public.appointments(user_id, scheduled_at);

-- RLS
alter table public.appointments enable row level security;

create policy "Users can manage own appointments"
  on public.appointments for all
  using (auth.uid() = user_id);

-- Função para updated_at automático
create or replace function update_appointments_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function update_appointments_updated_at();
