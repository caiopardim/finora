import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return null;
  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return user;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdmin();
  const uid = params.id;

  const [profileRes, txRes, billRes, goalsRes, walletsRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', uid).single(),
    admin.from('transactions').select('type,amount,date,description,categories(name,icon)').eq('user_id', uid).order('date', { ascending: false }).limit(10),
    admin.from('bills').select('description,amount,due_date,paid').eq('user_id', uid).order('due_date', { ascending: false }).limit(10),
    admin.from('goals').select('name,target_amount,current_amount').eq('user_id', uid),
    admin.from('wallets').select('name,icon,color').eq('user_id', uid),
  ]);

  // Monthly income/expense
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const { data: monthTx } = await admin.from('transactions').select('type,amount').eq('user_id', uid).gte('date', monthStart);
  const monthIncome  = (monthTx || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = (monthTx || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return NextResponse.json({
    profile: profileRes.data,
    recentTransactions: txRes.data || [],
    recentBills: billRes.data || [],
    goals: goalsRes.data || [],
    wallets: walletsRes.data || [],
    monthIncome,
    monthExpense,
  });
}
