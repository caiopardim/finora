import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findOrCreateByPhone(phone: string) {
    // 1. Try to find existing profile by phone
    const { data: existing } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existing) return existing;

    // 2. Create (or get existing) auth user for this phone
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
    });

    if (authError) throw new Error(`Failed to create user: ${authError.message}`);

    const userId = authData.user.id;

    // 3. Upsert profile — handles race condition / duplicate key
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .upsert({ id: userId, phone }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);
    return profile;
  }

  async findById(id: string) {
    const { data } = await this.supabase.from('profiles').select('*').eq('id', id).single();
    return data;
  }

  async update(id: string, data: { name?: string; currency?: string; timezone?: string }) {
    const { data: updated, error } = await this.supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  }
}
