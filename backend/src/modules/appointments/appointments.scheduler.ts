import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentsService } from './appointments.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import * as dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

@Injectable()
export class AppointmentsScheduler {
  private readonly logger = new Logger(AppointmentsScheduler.name);

  constructor(
    private appointments: AppointmentsService,
    private whatsapp: WhatsappService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkReminders() {
    this.logger.log('Checking appointment reminders...');
    try {
      const { dayBefore, hourBefore } = await this.appointments.getPendingReminders();

      for (const appt of dayBefore) {
        const phone = (appt as any).profiles?.phone;
        if (!phone) continue;

        const date = dayjs(appt.scheduled_at);
        const dateStr = date.format('DD/MM/YYYY');
        const timeStr = date.format('HH:mm');

        await this.whatsapp.sendMessage(
          phone,
          `📅 *Lembrete de amanhã!*\n\n` +
          `Você tem um compromisso agendado:\n\n` +
          `📌 *${appt.title}*\n` +
          `🕐 *${dateStr} às ${timeStr}*\n` +
          (appt.description ? `📝 ${appt.description}\n` : '') +
          `\nNão esqueça! 😊`,
        );

        await this.appointments.markReminderSent(appt.id, '1d');
        this.logger.log(`Sent 1d reminder for appointment ${appt.id}`);
      }

      for (const appt of hourBefore) {
        const phone = (appt as any).profiles?.phone;
        if (!phone) continue;

        const date = dayjs(appt.scheduled_at);
        const timeStr = date.format('HH:mm');

        await this.whatsapp.sendMessage(
          phone,
          `⏰ *Daqui 1 hora!*\n\n` +
          `Seu compromisso está chegando:\n\n` +
          `📌 *${appt.title}*\n` +
          `🕐 *Hoje às ${timeStr}*\n` +
          (appt.description ? `📝 ${appt.description}\n` : '') +
          `\nBoa sorte! 🍀`,
        );

        await this.appointments.markReminderSent(appt.id, '1h');
        this.logger.log(`Sent 1h reminder for appointment ${appt.id}`);
      }
    } catch (err) {
      this.logger.error('Error checking reminders', err);
    }
  }
}
