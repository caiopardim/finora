-- ============================================================
-- Auditoria de RLS — Finora
-- Rode no SQL Editor do Supabase (schema public).
-- ============================================================

-- 1) Status de RLS por tabela + nº de policies.
--    Olhe a coluna "rls_enabled": FALSE = tabela DESPROTEGIDA (risco).
select
  t.tablename,
  c.relrowsecurity  as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  coalesce(p.n, 0)  as policy_count
from pg_tables t
join pg_class c   on c.relname = t.tablename
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join (
  select tablename, count(*) as n
  from pg_policies
  where schemaname = 'public'
  group by tablename
) p on p.tablename = t.tablename
where t.schemaname = 'public'
order by rls_enabled asc, policy_count asc, t.tablename;

-- 2) Alerta direto: tabelas com user_id SEM RLS habilitado.
--    Qualquer linha aqui é um vazamento potencial entre usuários.
select c.relname as tabela_sem_rls_com_user_id
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
join pg_attribute a on a.attrelid = c.oid and a.attname = 'user_id' and a.attnum > 0
where c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;

-- 3) Tabelas com RLS ligado porém SEM nenhuma policy
--    (RLS sem policy = ninguém acessa, ou o service role mascara o problema).
select t.tablename as rls_ligado_sem_policy
from pg_tables t
join pg_class c on c.relname = t.tablename
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where t.schemaname = 'public'
  and c.relrowsecurity = true
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename
  )
order by t.tablename;
