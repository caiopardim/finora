import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

export async function POST(req: NextRequest) {
  const { email, name, plan_type, user_id } = await req.json();

  if (!email || !plan_type) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }

  const amount = plan_type === 'annual' ? 199.00 : 29.00;
  const description = plan_type === 'annual'
    ? 'Finora Pro — Plano Anual'
    : 'Finora Pro — Plano Mensal';

  // Create PIX payment in Mercado Pago
  const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_TOKEN}`,
      'X-Idempotency-Key': `${user_id || email}-${plan_type}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description,
      payment_method_id: 'pix',
      payer: { email, first_name: name?.split(' ')[0] || 'Cliente', last_name: name?.split(' ').slice(1).join(' ') || '' },
      external_reference: `${user_id || email}|${plan_type}`,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
    }),
  });

  const mpData = await mpRes.json();
  if (!mpRes.ok) {
    return NextResponse.json({ error: mpData.message || 'Erro no Mercado Pago' }, { status: 500 });
  }

  return NextResponse.json({
    payment_id: mpData.id,
    qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
    qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
    amount,
    status: mpData.status,
  });
}
