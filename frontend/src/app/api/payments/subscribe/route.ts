import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MP_TOKEN   = process.env.MERCADO_PAGO_ACCESS_TOKEN!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://meufinora.com.br';

const PLANS = {
  monthly: {
    reason: 'Finora Pro — Mensal',
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: 29.00,
  },
  annual: {
    reason: 'Finora Pro — Anual',
    frequency: 12,
    frequency_type: 'months',
    transaction_amount: 199.00,
  },
};

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan_type } = await req.json(); // 'monthly' | 'annual'
  const plan = PLANS[plan_type as keyof typeof PLANS];
  if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });

  // Create subscription in Mercado Pago
  const body = {
    reason: plan.reason,
    auto_recurring: {
      frequency: plan.frequency,
      frequency_type: plan.frequency_type,
      transaction_amount: plan.transaction_amount,
      currency_id: 'BRL',
    },
    back_url: `${APP_URL}/dashboard/plano?status=success`,
    payer_email: user.email,
    external_reference: `${user.id}|${plan_type}`,
    status: 'pending',
  };

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const mpData = await mpRes.json();
  if (!mpRes.ok) return NextResponse.json({ error: mpData.message || 'Erro no Mercado Pago' }, { status: 500 });

  // Save pending subscription ID
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  await admin.from('profiles').update({
    mp_subscription_id: mpData.id,
    plan_type,
  }).eq('id', user.id);

  return NextResponse.json({ init_point: mpData.init_point, id: mpData.id });
}
