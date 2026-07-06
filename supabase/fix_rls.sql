-- ============================================================
-- Correção de RLS — Finora
-- Descomente APENAS as tabelas que a audit_rls.sql apontou como
-- desprotegidas (query #2). Rode no SQL Editor do Supabase.
--
-- Padrão: cada usuário só enxerga/manipula suas próprias linhas
-- (a coluna user_id = auth.uid()). O service role (backend) ignora
-- RLS, então o agente/WhatsApp continua funcionando normalmente.
-- ============================================================

-- Função helper: aplica RLS padrão "dono" numa tabela com user_id.
-- (Rode este bloco uma vez; depois chame por tabela.)
create or replace function public._apply_owner_rls(tbl text)
returns void language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security;', tbl);
  execute format('drop policy if exists "own_rows" on public.%I;', tbl);
  execute format(
    'create policy "own_rows" on public.%I
       for all
       using (user_id = auth.uid())
       with check (user_id = auth.uid());', tbl);
end;
$$;

-- Descomente conforme necessário:
-- select public._apply_owner_rls('wallets');
-- select public._apply_owner_rls('shopping_lists');
-- select public._apply_owner_rls('recurring_templates');
-- select public._apply_owner_rls('recurring_skips');
-- select public._apply_owner_rls('user_google_tokens');
-- select public._apply_owner_rls('security_events');
-- select public._apply_owner_rls('settings');
-- select public._apply_owner_rls('budget_alert_logs');

-- ATENÇÃO — casos especiais (NÃO use o padrão acima cegamente):
--
-- shopping_list_items: normalmente NÃO tem user_id (herda de shopping_lists
--   via shopping_list_id). Use policy por JOIN:
-- alter table public.shopping_list_items enable row level security;
-- drop policy if exists "own_via_list" on public.shopping_list_items;
-- create policy "own_via_list" on public.shopping_list_items
--   for all
--   using (exists (select 1 from public.shopping_lists l
--                  where l.id = shopping_list_id and l.user_id = auth.uid()))
--   with check (exists (select 1 from public.shopping_lists l
--                  where l.id = shopping_list_id and l.user_id = auth.uid()));
--
-- admin_settings: tabela global de admin — NÃO deve ter policy de usuário.
--   Mantenha RLS ligado SEM policy pública (só service role acessa).
-- alter table public.admin_settings enable row level security;
--
-- monthly_summary / category_spending: se forem VIEWS, RLS não se aplica
--   (elas herdam das tabelas-base). Confirme com a audit se são 'r' (tabela).
