import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

@Injectable()
export class CategoriesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*, transactions(amount, type)')
      .eq('user_id', userId)
      .order('name');
    if (error) throw new Error(error.message);
    return data;
  }

  async create(userId: string, dto: { name: string; icon?: string; color?: string; type?: string; budget_limit?: number }) {
    const { data, error } = await this.supabase
      .from('categories')
      .insert({ user_id: userId, ...dto })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(userId: string, id: string, dto: Partial<{ name: string; icon: string; color: string; budget_limit: number }>) {
    const { data, error } = await this.supabase
      .from('categories')
      .update(dto)
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(userId: string, id: string) {
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  }
}
