import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateInstallments, buildInstallmentRows } from '@/lib/installments';

export const runtime = 'nodejs';

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

  const input = {
    description: String(body.description || '').trim(),
    amount: Number(body.amount),
    due_date: String(body.due_date || ''),
    installments: parseInt(String(body.installments), 10),
    category_id: body.category_id || null,
  };

  const check = validateInstallments(input);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  // 3) Gera as linhas no servidor e insere em lote (INSERT único = atômico).
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const group = crypto.randomUUID();
  const rows = buildInstallmentRows(input).map((r) => ({ ...r, user_id: user.id, installment_group: group }));

  const { error } = await svc.from('bills').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: input.installments, group });
}
