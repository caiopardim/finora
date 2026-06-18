import { Module, forwardRef } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AiService } from './ai.service';
import { BudgetAlertsService } from './budget-alerts.service';
import { ScheduledReportsService } from './scheduled-reports.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { ReportsModule } from '../reports/reports.module';
import { CategoriesModule } from '../categories/categories.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { GoalsModule } from '../goals/goals.module';
import { BillsModule } from '../bills/bills.module';
import { ShoppingListsModule } from '../shopping-lists/shopping-lists.module';

@Module({
  imports: [TransactionsModule, UsersModule, ReportsModule, CategoriesModule, forwardRef(() => AppointmentsModule), GoalsModule, BillsModule, ShoppingListsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, AiService, BudgetAlertsService, ScheduledReportsService],
  exports: [WhatsappService, AiService, BudgetAlertsService],
})
export class WhatsappModule {}
