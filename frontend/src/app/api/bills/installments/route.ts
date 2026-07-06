import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MAX_INSTALLMENTS = 420;

// Adiciona `months` meses a uma data YYYY-MM-DD sem depender de libs.
function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const base = new Date(Date.UTC(y, (m - 1) + months, d));
  return base.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  // 1) Autentica o usuário pelo token do Supabase.
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2) Valida o payload.
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }); }

  const description = String(body.description || '').trim();
  const amount = Number(body.amount);
  const dueDate = String(body.due_date || '');
  const installments = parseInt(String(body.installments), 10);
  const categoryId = body.category_id || null;

  if (!description) return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Valor por parcela inválido' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return NextResponse.json({ error: 'Data de vencimento inválida' }, { status: 400 });
  if (!Number.isInteger(installments) || installments < 2) return NextResponse.json({ error: 'Número de parcelas deve ser ao menos 2' }, { status: 400 });
  if (installments > MAX_INSTALLMENTS) return NextResponse.json({ error: `Número de parcelas deve ser no máximo ${MAX_INSTALLMENTS}` }, { status: 400 });

  // 3) Gera as linhas no servidor e insere em lote (INSERT único = atômico).
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const group = crypto.randomUUID();
  const rows = Array.from({ length: installments }, (_, i) => ({
    user_id: user.id,
    description: `${description} (${i + 1}/${installments})`,
    amount,
    due_date: addMonths(dueDate, i),
    category_id: categoryId,
    paid: false,
    recurrent: false,
    installments,
    installment_number: i + 1,
    installment_group: group,
  }));

  const { error } = await svc.from('bills').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: installments, group });
}
