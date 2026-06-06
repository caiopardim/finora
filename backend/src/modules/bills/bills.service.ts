import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import * as dayjs from 'dayjs';

@Injectable()
export class BillsService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(userId: string, options: { paid?: boolean; upcoming?: boolean } = {}) {
    let query = this.supabase
      .from('bills')
      .select('*, categories(name, icon)')
      .eq('user_id', userId)
      .order('due_date');

    if (options.paid !== undefined) query = query.eq('paid', options.paid);
    if (options.upcoming) {
      query = query
        .gte('due_date', dayjs().format('YYYY-MM-DD'))
        .lte('due_date', dayjs().add(30, 'day').format('YYYY-MM-DD'));
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async create(userId: string, dto: {
    description: string; amount: number; due_date: string;
    is_recurring?: boolean; recurrence_interval?: string; category_id?: string;
  }) {
    const { data, error } = await this.supabase
      .from('bills')
      .insert({ user_id: userId, ...dto })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async markPaid(userId: string, id: string) {
    const { data: bill } = await this.supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single();

    const { error } = await this.supabase
      .from('bills')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', id);

    if (error) throw new Error(error.message);

    // If recurring, create next occurrence
    if (bill?.is_recurring && bill?.recurrence_interval) {
      const intervalMap: Record<string, dayjs.ManipulateType> = {
        weekly: 'week', monthly: 'month', yearly: 'year',
      };
      const unit = intervalMap[bill.recurrence_interval] || 'month';
      const nextDate = dayjs(bill.due_date).add(1, unit).format('YYYY-MM-DD');

      await this.supabase.from('bills').insert({
        user_id: userId,
        category_id: bill.category_id,
        description: bill.description,
        amount: bill.amount,
        due_date: nextDate,
        is_recurring: true,
        recurrence_interval: bill.recurrence_interval,
      });
    }

    return { paid: true };
  }

  async remove(userId: string, id: string) {
    const { error } = await this.supabase.from('bills').delete().eq('user_id', userId).eq('id', id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  }
}
