import { supabase } from './supabase';
import dayjs from 'dayjs';

/**
 * Auto-generates recurring transactions that haven't been created yet for the current month.
 * Called once on dashboard load.
 */
export async function checkRecurring(userId: string) {
  const today = dayjs();
  const monthStart = today.startOf('month').format('YYYY-MM-DD');
  const monthEnd   = today.endOf('month').format('YYYY-MM-DD');

  // Get recurring transaction templates
  const { data: templates } = await supabase
    .from('recurring_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (!templates || templates.length === 0) return;

  // Get already generated this month
  const { data: existing } = await supabase
    .from('transactions')
    .select('recurring_template_id')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .not('recurring_template_id', 'is', null);

  const generatedIds = new Set((existing || []).map(t => t.recurring_template_id));

  const toInsert = [];
  for (const t of templates) {
    if (generatedIds.has(t.id)) continue;

    // Determine due date for this month
    let dueDay = t.day_of_month || today.date();
    const dueDate = today.date(dueDay).format('YYYY-MM-DD');

    // Only generate if we're on or past the due day
    if (today.date() < dueDay) continue;

    toInsert.push({
      user_id: userId,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category_id: t.category_id || null,
      wallet_id: t.wallet_id || null,
      date: dueDate,
      source: 'auto',
      recurring_template_id: t.id,
    });
  }

  if (toInsert.length > 0) {
    await supabase.from('transactions').insert(toInsert);
  }

  return toInsert.length;
}
