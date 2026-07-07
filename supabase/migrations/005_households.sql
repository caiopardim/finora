-- ============================================================
-- Fase 1 — Contas compartilhadas (casal): households + RLS híbrida
-- Modelo híbrido: cada linha financeira é privada (shared=false, padrão)
-- ou compartilhada com o household (shared=true). Máx. 2 membros (titular + 1).
--
-- ESTRATÉGIA SEGURA: não altera as policies existentes. Apenas ADICIONA
-- uma policy permissiva nova por tabela. Como o Postgres faz OR entre
-- policies permissivas, o acesso efetivo passa a ser:
--   "minhas linhas (policy antiga)  OR  linhas compartilhadas do meu household".
-- Nada do comportamento atual é removido.
-- ============================================================

-- 1) Tabelas do household ------------------------------------------------------

create table if not exists public.households (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text default 'Nossa família',
  created_at timestamptz default now()
);

create table if not exists public.household_members (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('owner','member')) not null default 'member',
  status text check (status in ('invited','active')) not null default 'invited',
  invite_email text,
  invite_phone text,
  invited_at timestamptz default now(),
  joined_at timestamptz,
  unique (household_id, member_id)
);

-- Cada pessoa participa de no máximo 1 household (como membro ativo).
create unique index if not exists uniq_active_membership
  on public.household_members (member_id)
  where member_id is not null;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- 2) Helper SECURITY DEFINER: evita recursão de RLS ao consultar membership -----
--    (Uma policy que consulta household_members não pode depender da RLS
--     de household_members — a função roda com privilégios do dono.)
create or replace function public.my_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id
  from public.household_members
  where member_id = auth.uid() and status = 'active'
$$;

-- Policies das próprias tabelas de household.
drop policy if exists "household_member_can_read" on public.households;
create policy "household_member_can_read" on public.households
  for select using (id in (select public.my_household_ids()) or owner_id = auth.uid());

drop policy if exists "owner_manages_household" on public.households;
create policy "owner_manages_household" on public.households
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "member_reads_own_membership" on public.household_members;
create policy "member_reads_own_membership" on public.household_members
  for select using (
    member_id = auth.uid()
    or household_id in (select id from public.households where owner_id = auth.uid())
  );

drop policy if exists "owner_manages_members" on public.household_members;
create policy "owner_manages_members" on public.household_members
  for all using (
    household_id in (select id from public.households where owner_id = auth.uid())
  ) with check (
    household_id in (select id from public.households where owner_id = auth.uid())
  );

-- Membro pode aceitar o próprio convite (atualizar status para active).
drop policy if exists "member_accepts_invite" on public.household_members;
create policy "member_accepts_invite" on public.household_members
  for update using (member_id = auth.uid()) with check (member_id = auth.uid());

-- 3) Colunas shared/household_id + policy híbrida nas tabelas financeiras --------
--    Aplique nas tabelas que existem no seu projeto. Todas idempotentes.

do $$
declare
  t text;
  fin_tables text[] := array[
    'transactions','bills','goals','wallets','appointments','shopping_lists'
  ];
begin
  foreach t in array fin_tables loop
    -- pula tabelas que não existem neste projeto
    if not exists (select 1 from information_schema.tables
                   where table_schema='public' and table_name=t) then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists household_id uuid references public.households(id) on delete set null;', t);
    execute format('alter table public.%I add column if not exists shared boolean not null default false;', t);

    -- Policy permissiva ADITIVA: leitura/escrita de linhas compartilhadas do household.
    execute format('drop policy if exists "household_shared_access" on public.%I;', t);
    execute format($f$
      create policy "household_shared_access" on public.%I
        for all
        using (shared = true and household_id in (select public.my_household_ids()))
        with check (shared = true and household_id in (select public.my_household_ids()));
    $f$, t);
  end loop;
end $$;

-- shopping_list_items herda o compartilhamento da lista-pai.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='shopping_list_items') then
    drop policy if exists "household_shared_items" on public.shopping_list_items;
    create policy "household_shared_items" on public.shopping_list_items
      for all
      using (exists (
        select 1 from public.shopping_lists l
        where l.id = shopping_list_id
          and l.shared = true
          and l.household_id in (select public.my_household_ids())
      ))
      with check (exists (
        select 1 from public.shopping_lists l
        where l.id = shopping_list_id
          and l.shared = true
          and l.household_id in (select public.my_household_ids())
      ));
  end if;
end $$;
