import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async findOrCreateByPhone(phone: string) {
    // Normalize Brazilian phone numbers
    // WhatsApp may send: 556283422983 (country+area+8digits, no 9th digit)
    // Profile may store: 62983422983  (area+9+8digits)
    const phoneVariants = new Set<string>([phone]);
    let base = phone;
    // Strip country code 55
    if (base.startsWith('55')) base = base.slice(2);
    phoneVariants.add(base);
    phoneVariants.add('55' + base);
    // Handle Brazilian 9th digit: area code (2 digits) + optional 9 + number (8 digits)
    if (base.length === 10) {
      // Missing 9th digit — insert 9 after area code
      const with9 = base.slice(0, 2) + '9' + base.slice(2);
      phoneVariants.add(with9);
      phoneVariants.add('55' + with9);
    } else if (base.length === 11 && base[2] === '9') {
      // Has 9th digit — also try without
      const without9 = base.slice(0, 2) + base.slice(3);
      phoneVariants.add(without9);
      phoneVariants.add('55' + without9);
    }

    // 1. Try to find existing profile by phone (any variant)
    const { data: existingList } = await this.supabase
      .from('profiles')
      .select('*')
      .in('phone', Array.from(phoneVariants))
      .limit(1);
    const existing = existingList?.[0] ?? null;

    if (existing) return existing;

    // 2. Try to create auth user; if already exists, fetch by phone
    let userId: string;
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        // User exists in auth — find by phone
        const { data: listData } = await this.supabase.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find((u) => (u as any).phone === phone);
        if (!existingAuthUser) throw new Error(`Could not find auth user for phone: ${phone}`);
        userId = existingAuthUser.id;
      } else {
        throw new Error(`Failed to create user: ${authError.message}`);
      }
    } else {
      userId = authData.user.id;
    }

    // 3. Upsert profile — handles race condition / duplicate key
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .upsert({ id: userId, phone }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);
    return profile;
  }

  async findByPhone(phone: string) {
    const phoneVariants = new Set<string>([phone]);
    let base = phone;
    if (base.startsWith('55')) base = base.slice(2);
    phoneVariants.add(base);
    phoneVariants.add('55' + base);
    if (base.length === 10) {
      const with9 = base.slice(0, 2) + '9' + base.slice(2);
      phoneVariants.add(with9);
      phoneVariants.add('55' + with9);
    } else if (base.length === 11 && base[2] === '9') {
      const without9 = base.slice(0, 2) + base.slice(3);
      phoneVariants.add(without9);
      phoneVariants.add('55' + without9);
    }

    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .in('phone', Array.from(phoneVariants))
      .limit(1);
    return data?.[0] ?? null;
  }

  async findById(id: string) {
    const { data } = await this.supabase.from('profiles').select('*').eq('id', id).single();
    return data;
  }

  async update(id: string, data: { name?: string; currency?: string; timezone?: string; monthly_income?: number; budget_plan?: any }) {
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
