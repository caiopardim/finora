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
  shared?: boolean;
  household_id?: string | null;
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
        shared: dto.shared ?? false,
        household_id: dto.shared ? dto.household_id ?? null : null,
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

    const payload: any = { ...dto };
    // Resolve categoria por nome (category_name) para category_id, como no create
    if (payload.category_name) {
      const { data: cat } = await this.supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', payload.category_name)
        .single();
      if (cat?.id) payload.category_id = cat.id;
      delete payload.category_name;
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', id)
      .select('*, categories(name, icon, color)')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findByShortId(userId: string, shortId: string) {
    const { data } = await this.supabase
      .from('transactions')
      .select('id, description')
      .eq('user_id', userId)
      .ilike('id', `%${shortId}`)
      .limit(1);
    return data?.[0] ?? null;
  }

  async findRecentByDescription(userId: string, description: string, amount?: number) {
    let query = this.supabase
      .from('transactions')
      .select('id, description, amount, date, type')
      .eq('user_id', userId)
      .ilike('description', `%${description}%`)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    const { data } = await query;
    if (!data || data.length === 0) return null;

    // If amount given, try to find exact match first
    if (amount) {
      const exact = data.find(t => Math.abs(Number(t.amount) - amount) < 0.01);
      if (exact) return exact;
    }

    return data[0];
  }

  // Find a duplicate transaction within the last N hours
  async findRecentDuplicate(userId: string, type: string, amount: number, withinHours = 3): Promise<{ id: string; description: string; amount: number; created_at: string } | null> {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
    const { data } = await this.supabase
      .from('transactions')
      .select('id, description, amount, created_at')
      .eq('user_id', userId)
      .eq('type', type)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (!data) return null;
    // Match same amount (within 1 cent)
    return data.find(t => Math.abs(Number(t.amount) - amount) < 0.01) ?? null;
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
