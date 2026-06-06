import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findOrCreateByPhone(phone: string) {
    const { data: existing } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existing) return existing;

    // Create anonymous auth user for WhatsApp users
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
    });

    if (authError) throw new Error(`Failed to create user: ${authError.message}`);

    const { data: profile, error } = await this.supabase
      .from('profiles')
      .insert({ id: authData.user.id, phone })
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
