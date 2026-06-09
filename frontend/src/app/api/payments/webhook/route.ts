import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
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

    await admin.from('profiles').update({
      paid: true,
      plan_status: 'active',
      plan_type: planType,
      plan_expires_at: expires.toISOString(),
    }).eq('id', userId);

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
      // Calculate expiry based on plan
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

    await admin.from('profiles').update({
      paid,
      plan_status,
      plan_expires_at,
      mp_subscription_id: id,
      plan_type: planType,
    }).eq('id', userId);
  }

  return NextResponse.json({ ok: true });
}

// MP sometimes sends GET for validation
export async function GET() {
  return NextResponse.json({ ok: true });
}
