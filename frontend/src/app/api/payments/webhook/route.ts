import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;
const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'finora';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function sendWelcomeMessage(phone: string, name: string, planType: string) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) return;
  const planLabel = planType === 'annual' ? 'Anual' : 'Mensal';
  const message =
    `🎉 *Bem-vindo ao Finora, ${name || 'pessoal'}!*\n\n` +
    `Seu plano *${planLabel}* está ativo. A partir de agora você pode controlar suas finanças direto aqui pelo WhatsApp!\n\n` +
    `Experimente agora mesmo:\n` +
    `💸 _"Gastei R$ 50 no mercado"_\n` +
    `💰 _"Recebi R$ 3.000 de salário"_\n` +
    `📊 _"Quanto gastei este mês?"_\n` +
    `📅 _"Agende dentista quinta às 9h"_\n\n` +
    `Qualquer dúvida é só perguntar aqui! 🐷`;

  try {
    await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: `${phone}@s.whatsapp.net`, text: message }),
    });
  } catch { /* silently fail */ }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // MP sends different event types
  const type = body.type || body.action;
  const id   = body.data?.id || body.id;

  if (!id) return NextResponse.json({ ok: true });

  // PIX / one-time payment
  if (type === 'payment' || type === 'payment.updated') {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    if (!mpRes.ok) return NextResponse.json({ ok: true });

    const payment = await mpRes.json();
    if (payment.status !== 'approved') return NextResponse.json({ ok: true });

    const externalRef = payment.external_reference; // "userId|plan_type"
    if (!externalRef) return NextResponse.json({ ok: true });

    const [userRef, planType] = externalRef.split('|');
    if (!userRef) return NextResponse.json({ ok: true });

    const admin = getAdmin();

    // Find user by id or email
    let userId = userRef;
    if (userRef.includes('@')) {
      const { data: profile } = await admin.from('profiles').select('id').eq('email', userRef).single();
      if (!profile) return NextResponse.json({ ok: true });
      userId = profile.id;
    }

    const now = new Date();
    const expires = new Date(now);
    if (planType === 'annual') expires.setFullYear(expires.getFullYear() + 1);
    else expires.setMonth(expires.getMonth() + 1);

    // Estado anterior para enviar boas-vindas só na 1ª ativação (MP reenvia webhooks)
    const { data: before } = await admin.from('profiles').select('phone, name, plan_status').eq('id', userId).single();

    await admin.from('profiles').update({
      paid: true,
      plan_status: 'active',
      plan_type: planType,
      plan_expires_at: expires.toISOString(),
    }).eq('id', userId);

    // Send welcome WhatsApp message apenas quando ativando pela primeira vez
    if (before?.phone && before.plan_status !== 'active') {
      await sendWelcomeMessage(before.phone, before.name, planType);
    }

    return NextResponse.json({ ok: true });
  }

  // Fetch subscription details from MP
  if (type === 'subscription_preapproval' || type?.includes('preapproval')) {
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    if (!mpRes.ok) return NextResponse.json({ ok: true });

    const sub = await mpRes.json();
    const externalRef = sub.external_reference; // "userId|plan_type"
    if (!externalRef) return NextResponse.json({ ok: true });

    const [userId, planType] = externalRef.split('|');
    if (!userId) return NextResponse.json({ ok: true });

    const admin = getAdmin();
    const status = sub.status; // authorized | paused | cancelled | pending

    let plan_status = 'inactive';
    let plan_expires_at: string | null = null;
    let paid = false;

    if (status === 'authorized') {
      plan_status = 'active';
      paid = true;
      const now = new Date();
      if (planType === 'annual') {
        now.setFullYear(now.getFullYear() + 1);
      } else {
        now.setMonth(now.getMonth() + 1);
      }
      plan_expires_at = now.toISOString();
    } else if (status === 'paused') {
      plan_status = 'paused';
    } else if (status === 'cancelled') {
      plan_status = 'cancelled';
    }

    // Estado anterior para não repetir boas-vindas em reenvios do MP
    const { data: before } = await admin.from('profiles').select('phone, name, plan_status').eq('id', userId).single();

    await admin.from('profiles').update({
      paid,
      plan_status,
      plan_expires_at,
      mp_subscription_id: id,
      plan_type: planType,
    }).eq('id', userId);

    // Send welcome message apenas na primeira ativação
    if (status === 'authorized' && before?.phone && before.plan_status !== 'active') {
      await sendWelcomeMessage(before.phone, before.name, planType);
    }
  }

  return NextResponse.json({ ok: true });
}

// MP sometimes sends GET for validation
export async function GET() {
  return NextResponse.json({ ok: true });
}
