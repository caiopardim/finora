import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsScheduler } from './appointments.scheduler';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { SupabaseModule } from '../../config/supabase.module';

@Module({
  imports: [SupabaseModule, forwardRef(() => WhatsappModule)],
  providers: [AppointmentsService, AppointmentsScheduler],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
