import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_name?: string;
  category_id?: string;
  date?: string;
  source?: 'whatsapp' | 'web' | 'import';
  raw_message?: string;
}

export interface TransactionFilter {
  type?: 'income' | 'expense';
  category_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class TransactionsService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async create(userId: string, dto: CreateTransactionDto) {
    let categoryId = dto.category_id;

    if (!categoryId && dto.category_name) {
      const { data: cat } = await this.supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', dto.category_name)
        .single();
      categoryId = cat?.id;
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        category_id: categoryId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        date: dto.date || new Date().toISOString().split('T')[0],
        source: dto.source || 'web',
        raw_message: dto.raw_message,
      })
      .select('*, categories(name, icon, color)')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(userId: string, filter: TransactionFilter = {}) {
    let query = this.supabase
      .from('transactions')
      .select('*, categories(name, icon, color)', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter.type) query = query.eq('type', filter.type);
    if (filter.category_id) query = query.eq('category_id', filter.category_id);
    if (filter.start_date) query = query.gte('date', filter.start_date);
    if (filter.end_date) query = query.lte('date', filter.end_date);
    if (filter.limit) query = query.limit(filter.limit);
    if (filter.offset) query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data, count };
  }

  async findOne(userId: string, id: string) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*, categories(name, icon, color)')
      .eq('user_id', userId)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Transaction not found');
    return data;
  }

  async update(userId: string, id: string, dto: Partial<CreateTransactionDto>) {
    await this.findOne(userId, id);

    const { data, error } = await this.supabase
      .from('transactions')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', id)
      .select('*, categories(name, icon, color)')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  }

  async getSummary(userId: string, month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = `${targetMonth}-01`;
    const endDate = new Date(
      parseInt(targetMonth.split('-')[0]),
      parseInt(targetMonth.split('-')[1]),
      0,
    )
      .toISOString()
      .split('T')[0];

    const { data } = await this.supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    const income = data?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) || 0;
    const expense =
      data?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) || 0;

    return { income, expense, balance: income - expense, month: targetMonth };
  }
}
