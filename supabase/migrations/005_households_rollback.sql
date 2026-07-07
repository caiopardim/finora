-- Rollback da Fase 1 (contas compartilhadas). Reverte a 005_households.sql.
-- Remove policies aditivas, colunas e tabelas. NÃO afeta dados privados
-- (shared=false), que continuam acessíveis pela policy original de cada tabela.

do $$
declare
  t text;
  fin_tables text[] := array['transactions','bills','goals','wallets','appointments','shopping_lists'];
begin
  foreach t in array fin_tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists "household_shared_access" on public.%I;', t);
      execute format('alter table public.%I drop column if exists shared;', t);
      execute format('alter table public.%I drop column if exists household_id;', t);
    end if;
  end loop;
end $$;

drop policy if exists "household_shared_items" on public.shopping_list_items;

drop policy if exists "member_accepts_invite" on public.household_members;
drop policy if exists "owner_manages_members" on public.household_members;
drop policy if exists "member_reads_own_membership" on public.household_members;
drop policy if exists "owner_manages_household" on public.households;
drop policy if exists "household_member_can_read" on public.households;

drop function if exists public.my_household_ids();
drop table if exists public.household_members;
drop table if exists public.households;
