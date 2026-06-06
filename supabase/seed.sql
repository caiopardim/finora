-- Seed de dados de exemplo (rode após criar um usuário)
-- Substitua 'USER_ID_AQUI' pelo UUID do usuário criado no Supabase Auth

do $$
declare
  uid uuid := 'USER_ID_AQUI';
  cat_alimentacao uuid;
  cat_transporte uuid;
  cat_moradia uuid;
  cat_saude uuid;
  cat_salario uuid;
  cat_freelance uuid;
begin
  -- Busca IDs das categorias
  select id into cat_alimentacao from categories where user_id = uid and name = 'Alimentação' limit 1;
  select id into cat_transporte  from categories where user_id = uid and name = 'Transporte'  limit 1;
  select id into cat_moradia     from categories where user_id = uid and name = 'Moradia'     limit 1;
  select id into cat_saude       from categories where user_id = uid and name = 'Saúde'       limit 1;
  select id into cat_salario     from categories where user_id = uid and name = 'Salário'     limit 1;
  select id into cat_freelance   from categories where user_id = uid and name = 'Freelance'   limit 1;

  -- Transações do mês atual
  insert into transactions (user_id, category_id, type, amount, description, date, source) values
    (uid, cat_salario,     'income',  4500.00, 'Salário mensal',          current_date - 25, 'web'),
    (uid, cat_freelance,   'income',   800.00, 'Projeto site cliente',    current_date - 20, 'whatsapp'),
    (uid, cat_moradia,     'expense',  1200.00, 'Aluguel',                current_date - 5,  'web'),
    (uid, cat_alimentacao, 'expense',    85.50, 'Supermercado',           current_date - 3,  'whatsapp'),
    (uid, cat_transporte,  'expense',    45.00, 'Combustível',            current_date - 2,  'whatsapp'),
    (uid, cat_alimentacao, 'expense',    32.00, 'Almoço restaurante',     current_date - 1,  'whatsapp'),
    (uid, cat_saude,       'expense',   250.00, 'Plano de saúde',         current_date - 1,  'web'),
    (uid, cat_alimentacao, 'expense',    18.50, 'Café da manhã',          current_date,      'whatsapp');

  -- Contas a vencer
  insert into bills (user_id, description, amount, due_date, is_recurring, recurrence_interval) values
    (uid, 'Internet Fibra',    99.90,  current_date + 3,  true,  'monthly'),
    (uid, 'Streaming',         39.90,  current_date + 5,  true,  'monthly'),
    (uid, 'Energia Elétrica', 180.00,  current_date + 7,  true,  'monthly');

  -- Meta de exemplo
  insert into goals (user_id, name, target_amount, current_amount, deadline, icon) values
    (uid, 'Reserva de emergência', 10000.00, 2500.00, current_date + 180, '🏦'),
    (uid, 'Viagem nas férias',      5000.00,  800.00, current_date + 90,  '✈️');
end;
$$;
