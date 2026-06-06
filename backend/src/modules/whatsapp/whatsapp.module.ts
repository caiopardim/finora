import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AiService } from './ai.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [TransactionsModule, UsersModule, ReportsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, AiService],
})
export class WhatsappModule {}
