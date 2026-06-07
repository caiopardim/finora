import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data: profile } = await admin.from('profiles').select('plan_status,plan_type,plan_expires_at,mp_subscription_id,trial_ends_at').eq('id', user.id).single();

  // Check trial
  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const inTrial = trialEnds ? now < trialEnds : false;
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const isActive = profile?.plan_status === 'active' || inTrial;

  return NextResponse.json({
    plan_status: profile?.plan_status || 'none',
    plan_type: profile?.plan_type || null,
    plan_expires_at: profile?.plan_expires_at || null,
    mp_subscription_id: profile?.mp_subscription_id || null,
    in_trial: inTrial,
    trial_ends_at: profile?.trial_ends_at || null,
    trial_days_left: trialDaysLeft,
    is_active: isActive,
  });
}

// DELETE — cancel subscription
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data: profile } = await admin.from('profiles').select('mp_subscription_id').eq('id', user.id).single();

  if (profile?.mp_subscription_id) {
    await fetch(`https://api.mercadopago.com/preapproval/${profile.mp_subscription_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_TOKEN}` },
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }

  await admin.from('profiles').update({ plan_status: 'cancelled' }).eq('id', user.id);
  return NextResponse.json({ ok: true });
}
