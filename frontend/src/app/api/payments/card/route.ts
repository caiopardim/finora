import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://meufinora.com.br';

async function getPlans(admin: any) {
  const { data } = await admin.from('settings').select('key, value');
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value; });
  return {
    monthly: { reason: 'Finora Pro — Mensal', frequency: 1,  frequency_type: 'months', transaction_amount: Number(map.price_monthly || 29) },
    annual:  { reason: 'Finora Pro — Anual',  frequency: 12, frequency_type: 'months', transaction_amount: Number(map.price_annual  || 199) },
  };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  const { plan_type, card_token } = await req.json();
  if (!card_token) return NextResponse.json({ error: 'Token do cartão ausente' }, { status: 400 });

  const PLANS = await getPlans(admin);
  const plan = PLANS[plan_type as keyof typeof PLANS];
  if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });

  const autoRecurring: Record<string, any> = {
    frequency: plan.frequency,
    frequency_type: plan.frequency_type,
    transaction_amount: plan.transaction_amount,
    currency_id: 'BRL',
  };

  const body = {
    reason: plan.reason,
    auto_recurring: autoRecurring,
    back_url: `${APP_URL}/dashboard`,
    payer_email: user.email,
    card_token_id: card_token,
    external_reference: `${user.id}|${plan_type}`,
    status: 'authorized',
  };

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_TOKEN}` },
    body: JSON.stringify(body),
  });

  const mpData = await mpRes.json();
  if (!mpRes.ok) {
    console.error('MP error:', mpData);
    return NextResponse.json({ error: mpData.message || 'Erro no Mercado Pago' }, { status: 500 });
  }

  // Activate user
  await admin.from('profiles').update({
    mp_subscription_id: mpData.id,
    plan_type,
    plan_status: 'active',
    paid: true,
  }).eq('id', user.id);

  return NextResponse.json({ ok: true, subscription_id: mpData.id });
}
