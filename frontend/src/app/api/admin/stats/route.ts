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

export async function GET(req: NextRequest) {
  const caller = await checkAdmin(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdmin();

  // All users
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = authData?.users || [];

  // All transactions (type + amount + date)
  const { data: allTx } = await admin.from('transactions').select('type,amount,date,user_id');

  const totalIncome  = (allTx || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = (allTx || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  // New users per day (last 30 days)
  const now = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = users.filter(u => u.created_at?.startsWith(dateStr)).length;
    days.push({ date: dateStr, count });
  }

  // Tx per user (for ranking)
  const txPerUser: Record<string, number> = {};
  for (const t of (allTx || [])) {
    txPerUser[t.user_id] = (txPerUser[t.user_id] || 0) + 1;
  }

  // Top 5 most active
  const ranking = Object.entries(txPerUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([uid, count]) => {
      const u = users.find(u => u.id === uid);
      return { id: uid, email: u?.email || uid, count };
    });

  // Users signed in last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activeWeek = users.filter(u => u.last_sign_in_at && u.last_sign_in_at > sevenDaysAgo).length;

  return NextResponse.json({
    totalUsers: users.length,
    totalIncome,
    totalExpense,
    totalTx: (allTx || []).length,
    activeWeek,
    newUsersPerDay: days,
    ranking,
  });
}
