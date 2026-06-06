import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

@Injectable()
export class GoalsService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async create(userId: string, dto: { name: string; target_amount: number; deadline?: string; icon?: string }) {
    const { data, error } = await this.supabase
      .from('goals')
      .insert({ user_id: userId, ...dto })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async addProgress(userId: string, id: string, amount: number) {
    const { data: goal } = await this.supabase
      .from('goals')
      .select('current_amount')
      .eq('user_id', userId)
      .eq('id', id)
      .single();

    const { data, error } = await this.supabase
      .from('goals')
      .update({ current_amount: (goal?.current_amount || 0) + amount })
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(userId: string, id: string) {
    const { error } = await this.supabase.from('goals').delete().eq('user_id', userId).eq('id', id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  }
}
