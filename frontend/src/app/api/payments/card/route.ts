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
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    const { plan_type, card_token, issuer_id, payment_method_id, installments } = await req.json();
    if (!card_token) return NextResponse.json({ error: 'Token do cartão ausente' }, { status: 400 });

    const PLANS = await getPlans(admin);
    const plan = PLANS[plan_type as keyof typeof PLANS];
    if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });

    // ── PASSO 1: Cobrar imediatamente o primeiro pagamento ───────────────────
    console.log('[card] charging first payment for user', user.id, 'plan', plan_type);

    const paymentBody = {
      transaction_amount: plan.transaction_amount,
      token: card_token,
      description: plan.reason,
      installments: installments || 1,
      payment_method_id,
      issuer_id,
      payer: { email: user.email },
      external_reference: `${user.id}|${plan_type}|first`,
    };

    const idempotencyKey = `${user.id}-${plan_type}-${Date.now()}`;

    const payRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentBody),
    });

    const payData = await payRes.json();
    console.log('[card] payment status:', payData.status, 'detail:', payData.status_detail, 'http:', payRes.status);

    const paymentApproved = ['approved', 'in_process', 'pending'].includes(payData.status);

    if (!paymentApproved) {
      const detail = payData.status_detail || '';
      const msg = detail === 'cc_rejected_insufficient_amount'
        ? 'Saldo insuficiente no cartão.'
        : detail === 'cc_rejected_bad_filled_security_code'
        ? 'Código de segurança inválido.'
        : detail === 'cc_rejected_card_disabled'
        ? 'Cartão bloqueado. Entre em contato com o banco.'
        : detail === 'cc_rejected_bad_filled_date'
        ? 'Data de vencimento inválida.'
        : detail === 'cc_rejected_bad_filled_card_number'
        ? 'Número do cartão inválido.'
        : payData.message || 'Pagamento recusado. Verifique os dados do cartão.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ── PASSO 2: Criar assinatura para cobranças futuras ─────────────────────
    console.log('[card] creating subscription for user', user.id);

    const subBody = {
      reason: plan.reason,
      auto_recurring: {
        frequency: plan.frequency,
        frequency_type: plan.frequency_type,
        transaction_amount: plan.transaction_amount,
        currency_id: 'BRL',
      },
      back_url: `${APP_URL}/dashboard`,
      payer_email: user.email,
      card_token_id: card_token,
      external_reference: `${user.id}|${plan_type}`,
      status: 'authorized',
    };

    const subRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_TOKEN}` },
      body: JSON.stringify(subBody),
    });

    const subData = await subRes.json();
    console.log('[card] subscription id:', subData.id, 'error:', subData.message);

    if (!subRes.ok) {
      // First payment went through — still activate user even if subscription setup fails
      console.error('[card] subscription creation failed:', subData.message);
    }

    // ── PASSO 3: Ativar usuário ───────────────────────────────────────────────
    await admin.from('profiles').update({
      mp_subscription_id: subData.id || null,
      plan_type,
      plan_status: 'active',
      paid: true,
    }).eq('id', user.id);

    return NextResponse.json({ ok: true, payment_id: payData.id, subscription_id: subData.id });
  } catch (err: any) {
    console.error('[card] unexpected error:', err.message);
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}
