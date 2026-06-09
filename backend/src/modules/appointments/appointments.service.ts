import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import * as dayjs from 'dayjs';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async create(userId: string, data: { title: string; description?: string; scheduledAt: string }) {
    const { data: appt, error } = await this.supabase
      .from('appointments')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        scheduled_at: data.scheduledAt,
      })
      .select()
      .single();

    if (error) throw error;
    return appt;
  }

  async listUpcoming(userId: string) {
    const now = dayjs().toISOString();
    const { data } = await this.supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(10);

    return data || [];
  }

  async delete(userId: string, appointmentId: string) {
    const { error } = await this.supabase
      .from('appointments')
      .delete()
      .eq('user_id', userId)
      .eq('id', appointmentId);

    if (error) throw error;
  }

  // Called by scheduler: returns appointments that need a reminder
  async getPendingReminders() {
    const now = dayjs();

    // 1 day before (between 23h and 25h from now)
    const in24hStart = now.add(23, 'hour').toISOString();
    const in24hEnd = now.add(25, 'hour').toISOString();

    // 1 hour before (between 50min and 70min from now)
    const in1hStart = now.add(50, 'minute').toISOString();
    const in1hEnd = now.add(70, 'minute').toISOString();

    const [dayReminders, hourReminders] = await Promise.all([
      this.supabase
        .from('appointments')
        .select('*, profiles(phone)')
        .gte('scheduled_at', in24hStart)
        .lte('scheduled_at', in24hEnd)
        .eq('reminder_sent_1d', false),

      this.supabase
        .from('appointments')
        .select('*, profiles(phone)')
        .gte('scheduled_at', in1hStart)
        .lte('scheduled_at', in1hEnd)
        .eq('reminder_sent_1h', false),
    ]);

    return {
      dayBefore: dayReminders.data || [],
      hourBefore: hourReminders.data || [],
    };
  }

  async markReminderSent(id: string, type: '1d' | '1h') {
    const field = type === '1d' ? 'reminder_sent_1d' : 'reminder_sent_1h';
    await this.supabase
      .from('appointments')
      .update({ [field]: true })
      .eq('id', id);
  }
}
